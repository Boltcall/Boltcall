/**
 * Agency OS — ElevenLabs adapter
 *
 * Wraps the ElevenLabs API for the Agency OS. Used for:
 *   - Voice cloning (founder voice for personalized welcome video per /client/welcome)
 *   - Sample voice playback in VoicePicker (/client/settings)
 *   - One-off TTS for narrated monthly briefs and welcome scripts
 *
 * Adapter rules (per plan Layer 4):
 *   - Stateless (state lives in Supabase + Supabase Storage)
 *   - Idempotent on cloneVoice (returns existing voice if name matches)
 *   - Emits agency_events on every external call (cost_incurred / adapter_error)
 *   - Field-whitelisted writes (never JSON.stringify the raw API response)
 *   - Single backoff retry on 5xx/429
 *
 * Reuses the existing Boltcall ElevenLabs surface:
 *   - netlify/functions/elevenlabs-clone-voice.ts  (cloning pattern)
 *   - src/api/retell/voices.ts                     (voice catalog)
 *
 * Env vars:
 *   ELEVENLABS_API_KEY              — required
 *   SUPABASE_URL / SUPABASE_SERVICE_KEY — for Storage upload of generated audio
 */

import { emitAgencyEvent } from '../emit-agency-event';
import { getServiceSupabase } from '../token-utils';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';
const STORAGE_BUCKET_VOICES = 'agency-voices';

// ── helpers ────────────────────────────────────────────────────────────────

function apiKey(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY is not set');
  return k;
}

async function callElevenLabs(
  path: string,
  init: RequestInit,
  retryOnTransient = true
): Promise<Response> {
  const url = `${ELEVENLABS_BASE}${path}`;
  const headers = {
    'xi-api-key': apiKey(),
    'Accept': 'application/json',
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  if (res.ok) return res;
  // single retry for 5xx / 429
  if (retryOnTransient && (res.status === 429 || res.status >= 500)) {
    const backoffMs = res.status === 429 ? 1500 : 500;
    await new Promise(r => setTimeout(r, backoffMs));
    return callElevenLabs(path, init, false);
  }
  const text = await res.text().catch(() => '');
  throw new Error(`ElevenLabs ${path} failed ${res.status}: ${text.slice(0, 240)}`);
}

function estimateCostUsd(textLength: number, model = DEFAULT_MODEL_ID): number {
  // Approx pricing as of 2026 — ElevenLabs Creator tier costs ~$0.30 per 1k characters
  // for multilingual_v2. Adjust if billing model changes.
  const perKChar = model === 'eleven_multilingual_v2' ? 0.30 : 0.18;
  return Number(((textLength / 1000) * perKChar).toFixed(4));
}

async function uploadAudioToStorage(opts: {
  client_id: string;
  voice_id: string;
  audio_bytes: ArrayBuffer;
  ext: string;
}): Promise<{ url: string; bytes: number; path: string }> {
  const supabase = getServiceSupabase();
  const ts = Math.floor(Date.now() / 1000);
  const path = `${opts.client_id}/${opts.voice_id}-${ts}.${opts.ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET_VOICES)
    .upload(path, opts.audio_bytes, {
      contentType: opts.ext === 'mp3' ? 'audio/mpeg' : `audio/${opts.ext}`,
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET_VOICES)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7-day signed URL
  if (!signed?.signedUrl) throw new Error('Failed to sign storage URL');
  return { url: signed.signedUrl, bytes: opts.audio_bytes.byteLength, path };
}

// ── public surface ─────────────────────────────────────────────────────────

export type VoiceType = 'founder_clone' | 'agent_voice' | 'all';

export interface Voice {
  voice_id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral' | 'unknown';
  category?: string;
  description?: string;
}

/**
 * List available voices. Optionally filter by category metadata.
 * Returns only whitelisted fields — never the raw API payload.
 */
export async function listVoices(opts: { voice_type?: VoiceType } = {}): Promise<Voice[]> {
  const started = Date.now();
  try {
    const res = await callElevenLabs('/voices', { method: 'GET' });
    const json = (await res.json()) as { voices?: any[] };
    const all: Voice[] = (json.voices || []).map(v => ({
      voice_id: String(v.voice_id || ''),
      name: String(v.name || 'Unnamed'),
      language: String(v.labels?.language || v.fine_tuning?.language || 'en'),
      gender:
        v.labels?.gender === 'male' || v.labels?.gender === 'female'
          ? v.labels.gender
          : v.labels?.gender === 'non-binary'
          ? 'neutral'
          : 'unknown',
      category: v.category ? String(v.category) : undefined,
      description: v.description ? String(v.description).slice(0, 240) : undefined,
    }));
    const filtered =
      !opts.voice_type || opts.voice_type === 'all'
        ? all
        : all.filter(v =>
            opts.voice_type === 'founder_clone'
              ? v.category === 'cloned'
              : v.category !== 'cloned'
          );
    await emitAgencyEvent({
      client_id: null,
      agent_name: 'elevenlabs-adapter',
      type: 'cost_incurred',
      severity: 'debug',
      payload: { op: 'listVoices', count: filtered.length, latency_ms: Date.now() - started, cost_usd: 0 },
    });
    return filtered;
  } catch (err) {
    await emitAgencyEvent({
      client_id: null,
      agent_name: 'elevenlabs-adapter',
      type: 'adapter_error',
      severity: 'error',
      payload: { op: 'listVoices', message: (err as Error).message.slice(0, 240) },
    });
    throw err;
  }
}

/**
 * Clone a voice from audio samples. Idempotent: if a voice with the same name
 * already exists, returns that voice_id instead of creating a duplicate.
 */
export async function cloneVoice(opts: {
  name: string;
  audio_sample_urls: string[];
  description?: string;
  client_id?: string;
}): Promise<{ voice_id: string; status: 'created' | 'existing' }> {
  const started = Date.now();
  try {
    // Idempotency: check existing voices first
    const existing = await listVoices({ voice_type: 'founder_clone' });
    const match = existing.find(v => v.name === opts.name);
    if (match) {
      return { voice_id: match.voice_id, status: 'existing' };
    }

    // Fetch each sample and assemble multipart form
    const form = new FormData();
    form.append('name', opts.name);
    if (opts.description) form.append('description', opts.description.slice(0, 500));
    let idx = 0;
    for (const url of opts.audio_sample_urls) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Sample fetch failed ${r.status} for ${url}`);
      const blob = await r.blob();
      form.append('files', blob, `sample_${idx++}.mp3`);
    }

    const res = await callElevenLabs('/voices/add', {
      method: 'POST',
      body: form as any,
      // do NOT set Content-Type — fetch sets the boundary
    });
    const json = (await res.json()) as { voice_id?: string };
    const voice_id = String(json.voice_id || '');
    if (!voice_id) throw new Error('ElevenLabs returned no voice_id');

    await emitAgencyEvent({
      client_id: opts.client_id || null,
      agent_name: 'elevenlabs-adapter',
      type: 'cost_incurred',
      severity: 'info',
      payload: {
        op: 'cloneVoice',
        voice_id,
        n_samples: opts.audio_sample_urls.length,
        latency_ms: Date.now() - started,
        cost_usd: 0, // cloning itself is bundled in subscription
      },
    });
    return { voice_id, status: 'created' };
  } catch (err) {
    await emitAgencyEvent({
      client_id: opts.client_id || null,
      agent_name: 'elevenlabs-adapter',
      type: 'adapter_error',
      severity: 'error',
      payload: { op: 'cloneVoice', message: (err as Error).message.slice(0, 240) },
    });
    throw err;
  }
}

/**
 * Generate speech and upload to Supabase Storage. Returns a signed URL — never
 * inline bytes. Used by /client/welcome (personalized welcome video) and the
 * narrated monthly brief.
 */
export async function generateSpeech(opts: {
  voice_id: string;
  text: string;
  model_id?: string;
  output_format?: string;
  client_id: string;
}): Promise<{ audio_url: string; duration_sec: number; cost_usd: number }> {
  const started = Date.now();
  const model_id = opts.model_id || DEFAULT_MODEL_ID;
  const output_format = opts.output_format || DEFAULT_OUTPUT_FORMAT;
  try {
    const res = await callElevenLabs(
      `/text-to-speech/${encodeURIComponent(opts.voice_id)}?output_format=${output_format}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: opts.text,
          model_id,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    const audio_bytes = await res.arrayBuffer();
    const cost_usd = estimateCostUsd(opts.text.length, model_id);
    const uploaded = await uploadAudioToStorage({
      client_id: opts.client_id,
      voice_id: opts.voice_id,
      audio_bytes,
      ext: 'mp3',
    });
    // Approx duration: ~150 wpm × avg 5 chars/word → ~12 chars/sec spoken
    const duration_sec = Math.max(1, Math.round(opts.text.length / 12));
    await emitAgencyEvent({
      client_id: opts.client_id,
      agent_name: 'elevenlabs-adapter',
      type: 'cost_incurred',
      severity: 'info',
      payload: {
        op: 'generateSpeech',
        voice_id: opts.voice_id,
        chars: opts.text.length,
        bytes: uploaded.bytes,
        duration_sec,
        cost_usd,
        latency_ms: Date.now() - started,
        model_id,
      },
    });
    return { audio_url: uploaded.url, duration_sec, cost_usd };
  } catch (err) {
    await emitAgencyEvent({
      client_id: opts.client_id,
      agent_name: 'elevenlabs-adapter',
      type: 'adapter_error',
      severity: 'error',
      payload: { op: 'generateSpeech', voice_id: opts.voice_id, message: (err as Error).message.slice(0, 240) },
    });
    throw err;
  }
}

/**
 * Render a short sample of how a candidate voice would answer a typical call
 * for the client's vertical. Used by /client/settings VoicePicker so the
 * client hears the voice *answering one of their real call types* before
 * choosing it. The sample text catalog lives next to vertical templates.
 */
export type SampleTextId =
  | 'med_spa_greeting'
  | 'hvac_emergency'
  | 'dental_booking'
  | 'lawyer_intake'
  | 'salon_reschedule';

const SAMPLE_TEXTS: Record<SampleTextId, string> = {
  med_spa_greeting:
    "Thanks for calling. I'd love to help you book a consultation. Are you calling about a specific treatment or just learning what's available?",
  hvac_emergency:
    "Thanks for calling — what's going on with your system? If this is an emergency I can route you to the on-call tech right now.",
  dental_booking:
    "Thanks for calling. Are you a current patient, or is this your first visit? I can get you scheduled with the soonest available appointment.",
  lawyer_intake:
    "Thanks for calling. I'm going to ask a few questions so I can get you to the right attorney as quickly as possible. Is now a good time?",
  salon_reschedule:
    "Thanks for calling. Are you trying to book a new appointment, change an existing one, or something else?",
};

export async function previewVoiceForClient(opts: {
  voice_id: string;
  sample_text_id: SampleTextId;
  client_id: string;
}): Promise<{ audio_url: string; sample_text: string }> {
  const text = SAMPLE_TEXTS[opts.sample_text_id];
  if (!text) throw new Error(`Unknown sample_text_id: ${opts.sample_text_id}`);
  const result = await generateSpeech({
    voice_id: opts.voice_id,
    text,
    client_id: opts.client_id,
  });
  return { audio_url: result.audio_url, sample_text: text };
}

/**
 * Default founder-clone voice ID resolver. Used by the welcome video flow to
 * pick the correct voice without hard-coding it across multiple callers.
 */
export async function getFounderCloneVoiceId(): Promise<string | null> {
  const founderVoiceName = process.env.AGENCY_FOUNDER_CLONE_VOICE_NAME || 'Founder Clone';
  try {
    const voices = await listVoices({ voice_type: 'founder_clone' });
    const match = voices.find(v => v.name === founderVoiceName);
    return match?.voice_id ?? null;
  } catch {
    return null;
  }
}
