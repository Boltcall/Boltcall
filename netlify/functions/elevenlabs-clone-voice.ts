import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getServiceSupabase } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { requireMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * ElevenLabs Voice Cloning + Retell custom voice registration.
 *
 * Actions:
 *   POST   action=clone   → upload audio sample, clone via ElevenLabs IVC, register with Retell
 *   GET    ?userId=...    → list user's cloned voices
 *   DELETE ?id=...        → remove a cloned voice (ElevenLabs + Retell + DB)
 *
 * Required env: ELEVENLABS_API_KEY, RETELL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const ELEVEN_API = 'https://api.elevenlabs.io/v1';

function json(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const retellKey = process.env.RETELL_API_KEY;
  if (!elevenKey) return json(500, { error: 'ELEVENLABS_API_KEY not configured' });
  if (!retellKey) return json(500, { error: 'RETELL_API_KEY not configured' });

  const supabase = getServiceSupabase();
  const retell = new Retell({ apiKey: retellKey });
  const retellVoice = retell.voice as unknown as {
    create: (params: Record<string, unknown>) => Promise<{ voice_id?: string }>;
    delete: (voiceId: string) => Promise<unknown>;
  };

  try {
    // ── LIST: GET ?userId=... ─────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters?.userId;
      if (!userId) return json(400, { error: 'userId required' });
      const auth = await requireMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;

      const { data, error } = await supabase
        .from('cloned_voices')
        .select('id, name, description, gender, accent, eleven_voice_id, retell_voice_id, preview_audio_url, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      return json(200, { voices: data || [] });
    }

    // ── DELETE: ?id=... ───────────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      const userId = event.queryStringParameters?.userId;
      if (!id || !userId) return json(400, { error: 'id and userId required' });
      const auth = await requireMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;

      const { data: row, error: fetchErr } = await supabase
        .from('cloned_voices')
        .select('eleven_voice_id, retell_voice_id, user_id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !row) return json(404, { error: 'Voice not found' });

      // Best-effort cleanup with ElevenLabs + Retell, then DB row
      await fetch(`${ELEVEN_API}/voices/${row.eleven_voice_id}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': elevenKey },
      }).catch(() => {});

      await retellVoice.delete(row.retell_voice_id).catch(() => {});

      const { error: delErr } = await supabase.from('cloned_voices').delete().eq('id', id);
      if (delErr) return json(500, { error: delErr.message });

      return json(200, { success: true });
    }

    // ── CLONE: POST { action: 'clone', userId, name, audio_base64, mime_type, ... }
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const body = JSON.parse(event.body || '{}');
    const {
      userId,
      name,
      description,
      gender,
      accent,
      audio_base64,
      mime_type = 'audio/mpeg',
      file_name = 'sample.mp3',
      consent_confirmed,
    } = body;

    if (!userId) return json(400, { error: 'userId required' });
    const auth = await requireMatchingUser(event, userId, headers);
    if (!auth.ok) return auth.response;
    if (!name || typeof name !== 'string') return json(400, { error: 'name required' });
    if (!audio_base64) return json(400, { error: 'audio_base64 required' });
    if (!consent_confirmed) {
      return json(400, { error: 'You must confirm you own this voice or have explicit permission to clone it.' });
    }

    // Decode base64 → Blob and POST to ElevenLabs /v1/voices/add (multipart)
    const audioBytes = Buffer.from(audio_base64, 'base64');
    if (audioBytes.byteLength > 10 * 1024 * 1024) {
      return json(413, { error: 'Audio sample exceeds 10 MB limit' });
    }
    const audioBlob = new Blob([audioBytes], { type: mime_type });

    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', String(description));
    form.append('files', audioBlob, file_name);
    if (gender || accent) {
      const labels: Record<string, string> = {};
      if (gender) labels.gender = String(gender);
      if (accent) labels.accent = String(accent);
      form.append('labels', JSON.stringify(labels));
    }

    const elevenRes = await fetch(`${ELEVEN_API}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey },
      body: form as any,
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error('[elevenlabs-clone-voice] ElevenLabs error', elevenRes.status, errText);
      // Common cause: free/starter plan can't clone (needs Creator+)
      return json(elevenRes.status, {
        error: 'ElevenLabs cloning failed',
        details: errText.slice(0, 500),
      });
    }

    const elevenJson = await elevenRes.json();
    const elevenVoiceId: string = elevenJson.voice_id;
    if (!elevenVoiceId) return json(500, { error: 'ElevenLabs did not return a voice_id' });

    // Register the ElevenLabs voice as a Retell custom voice so agents can use it
    const retellVoiceId = `custom-${elevenVoiceId}`;
    let registeredRetellVoiceId = retellVoiceId;
    try {
      const created = await retellVoice.create({
        voice_id: retellVoiceId,
        voice_name: name,
        provider: 'elevenlabs',
        provider_voice_id: elevenVoiceId,
        provider_model: 'eleven_turbo_v2_5',
      });
      registeredRetellVoiceId = (created as any)?.voice_id || retellVoiceId;
    } catch (retellErr: any) {
      // Roll back ElevenLabs voice if Retell registration fails — otherwise we
      // leave a dangling clone burning the user's quota.
      await fetch(`${ELEVEN_API}/voices/${elevenVoiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': elevenKey },
      }).catch(() => {});
      console.error('[elevenlabs-clone-voice] Retell registration failed', retellErr);
      return json(500, {
        error: 'Failed to register voice with Retell',
        details: retellErr?.message || String(retellErr),
      });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('cloned_voices')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        gender: gender || null,
        accent: accent || null,
        eleven_voice_id: elevenVoiceId,
        retell_voice_id: registeredRetellVoiceId,
        status: 'ready',
      })
      .select()
      .single();

    if (insertErr) {
      // DB insert failed after external resources created — roll back.
      await fetch(`${ELEVEN_API}/voices/${elevenVoiceId}`, {
        method: 'DELETE', headers: { 'xi-api-key': elevenKey },
      }).catch(() => {});
      await retellVoice.delete(registeredRetellVoiceId).catch(() => {});
      return json(500, { error: insertErr.message });
    }

    return json(200, { success: true, voice: inserted });
  } catch (err: any) {
    console.error('[elevenlabs-clone-voice] Unhandled', err);
    notifyError('elevenlabs-clone-voice', err).catch(() => {});
    return json(500, { error: 'Internal error', details: err?.message });
  }
};

export default withLegacyHandler(handler);
