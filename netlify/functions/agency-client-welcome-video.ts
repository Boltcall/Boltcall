import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-welcome-video.ts — Boltcall Agency OS · Layer 8 · Client-portal
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Powers `/client/welcome`. Generates (or returns cached) the personalized
 * welcome video for a newly-onboarded client: founder-cloned voice greeting
 * scripted off the client's business profile.
 *
 * Endpoints:
 *   GET  ?client_id=<uuid>   — idempotent. Returns cached artifact if present;
 *                              otherwise generates inline (up to 30s) and
 *                              returns the freshly-cached URL.
 *   POST { client_id }       — same as GET but forces regeneration if
 *                              ?force=1 is passed in the query string.
 *
 * Auth:
 *   - Bearer JWT (client) required.
 *   - Founder JWT is accepted as a passthrough for the founder-side debug view.
 *   - Defense in depth: owns_client(client_id, jwt_sub) enforced before any
 *     external call. RLS protects the artifact row at the DB layer too.
 *
 * Output shape:
 *   {
 *     status: 'ready' | 'generating' | 'error',
 *     video_url: string | null,        // signed Supabase Storage URL (mp3 today, mp4 once stitching ships)
 *     duration_sec: number | null,
 *     script: string,                  // the spoken script — UI renders as subtitles
 *     business_name: string | null,
 *     vertical: string | null,
 *     cached: boolean,
 *     artifact_id: string | null,
 *   }
 *
 * Artifact:
 *   We use type='client_outreach' (an existing kernel-allowed type) with a
 *   subtype tag in content.kind = 'welcome_video' so we don't have to expand
 *   the agency_artifacts.type enum to ship Phase E. status='shipped' once the
 *   audio is uploaded; preview_url holds the signed Storage URL. The
 *   client-facing portal queries this artifact via /agency-client-welcome-video,
 *   never directly.
 *
 * TODO(welcome-video): swap from audio-only to a full ffmpeg-stitched mp4
 * once the founder ships the base avatar frame. Until then the UI plays the
 * audio over a static cover image — preview lands fast (<30s) and feels
 * intentional, which is what matters most for the "they already know me"
 * moment described in the customer-UX design.
 */

import type { Handler } from '@netlify/functions';

import {
  generateSpeech,
  getFounderCloneVoiceId,
} from './_shared/agency-adapters/elevenlabs-adapter';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ARTIFACT_KIND = 'welcome_video';
const ARTIFACT_TYPE = 'client_outreach' as const;
const AGENT_NAME = 'client-welcome-video';

const FALLBACK_SCRIPT_MAX_CHARS = 1200;

interface ClientRow {
  id: string;
  user_id: string | null;
  business_name: string | null;
  vertical: string | null;
  region: string | null;
  sku: string;
  status: string;
  business_phone: string | null;
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function isUuid(s: string | undefined | null): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Defense-in-depth ownership check. Even though RLS gates agency_clients reads,
 * service-role bypasses RLS so we MUST do this in TS before we trust client_id.
 * Founders may inspect any client.
 */
async function ownsClient(
  supa: ReturnType<typeof getServiceSupabase>,
  jwtUserId: string,
  clientId: string,
  isFounder: boolean,
): Promise<ClientRow | null> {
  const { data } = await supa
    .from('agency_clients')
    .select('id,user_id,business_name,vertical,region,sku,status,business_phone')
    .eq('id', clientId)
    .maybeSingle();
  if (!data) return null;
  if (isFounder) return data as ClientRow;
  if (data.user_id !== jwtUserId) return null;
  // Don't serve churned / paused — the welcome video has no audience there.
  if (data.status === 'churned') return null;
  return data as ClientRow;
}

/**
 * Build the script. Sonnet is preferred when ANTHROPIC_API_KEY is set; a
 * deterministic template is used as a safety net so the endpoint never blocks
 * on a missing key. Both paths cap at FALLBACK_SCRIPT_MAX_CHARS to stay under
 * ElevenLabs' 60-90s target.
 */
async function buildScript(client: ClientRow): Promise<{ script: string; via: 'sonnet' | 'template' }> {
  const businessName = client.business_name || 'your business';
  const vertical = client.vertical || 'service business';
  const region = client.region || 'your area';
  const sku = (client.sku || '').toLowerCase();
  const isBoltSystem = sku.includes('bolt') || sku.includes('system');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      // Lazy-import to keep cold-start cheap when the key isn't set.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Anthropic = require('@anthropic-ai/sdk').default;
      const claude = new Anthropic({ apiKey });
      const system = `You write 60-90 second spoken welcome scripts for new Boltcall clients. Tone: warm, founder-personal, casual ("hey", "we"), absolutely zero corporate jargon. Speak directly to the business owner. No bullet points, no preamble — only the spoken words, ready to send to TTS.

Mention by name: their business, their vertical, their region.
Forecast the next 7 days: (1) intake call this week, (2) AI agent built from the intake, (3) ${isBoltSystem ? 'first Meta campaign launched within 7 days, ' : ''}phone number live, (4) first calls flowing in.
End with a single concrete call to action: "Pick your intake slot below."
NEVER use the words: "synergy", "leverage", "AI-powered", "best-in-class", "ecosystem", "journey".
Length: 130-170 words, no more.`;

      const user = `Business: ${businessName}
Vertical: ${vertical}
Region: ${region}
SKU: ${client.sku}`;

      const resp = await claude.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const block = resp.content?.find((b: { type?: string }) => b.type === 'text');
      const text = (block as { text?: string } | undefined)?.text?.trim() || '';
      if (text && text.length > 50) {
        return {
          script: text.slice(0, FALLBACK_SCRIPT_MAX_CHARS),
          via: 'sonnet',
        };
      }
    } catch (err) {
      console.warn('[client-welcome-video] Sonnet script generation failed, using template fallback:', (err as Error).message);
    }
  }

  // Template fallback — still personalized via {business_name, vertical, region}.
  const template = isBoltSystem
    ? `Hey, this is the team at Boltcall. Welcome aboard — we already know who you are, and the system is already moving for ${businessName} in ${region}.

Here's what happens this week. First, you'll pick a 20-minute intake slot below — that's where we learn your services, your pricing, the questions your callers always ask. Within two days of that call, your AI receptionist is built and trained against your exact ${vertical} script. By Thursday it's answering your phone number — the one we've already reserved for you. By the end of next week, your first Meta campaign is live, and qualified leads start flowing in.

You don't have to do anything technical. We've built the whole thing. You just supervise.

Pick your intake slot below. We'll see you on the call.`
    : `Hey, welcome to Boltcall. This is the team — and we already know who you are.

Here's what happens this week for ${businessName}. First, pick a 20-minute intake slot below. On that call, we learn your services, your pricing, the questions your ${vertical} callers always ask. Within two days of the call, your AI receptionist is trained against your exact script, your phone number is live (we've reserved one already), and the agent is answering your calls 24/7.

You don't need to learn anything new. We built the whole thing. You just supervise — review what your agent is doing, approve fixes when we draft them, and watch the bookings show up on your calendar.

Pick your intake slot below. We'll talk on the call.`;

  return {
    script: template.slice(0, FALLBACK_SCRIPT_MAX_CHARS),
    via: 'template',
  };
}

async function loadCachedArtifact(
  supa: ReturnType<typeof getServiceSupabase>,
  clientId: string,
): Promise<{
  artifact_id: string;
  video_url: string | null;
  script: string;
  duration_sec: number | null;
} | null> {
  // The newest shipped welcome-video artifact wins. We tag with
  // content.kind === ARTIFACT_KIND so we don't collide with other client_outreach
  // artifacts (clarification emails, intake follow-ups, etc.).
  const { data, error } = await supa
    .from('agency_artifacts')
    .select('id,content,preview_url,status,shipped_at')
    .eq('client_id', clientId)
    .eq('type', ARTIFACT_TYPE)
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(10);
  if (error || !data) return null;
  for (const row of data) {
    const content = (row.content ?? {}) as Record<string, unknown>;
    if (content.kind !== ARTIFACT_KIND) continue;
    return {
      artifact_id: row.id as string,
      video_url: (row.preview_url as string | null) ?? null,
      script: typeof content.script === 'string' ? content.script : '',
      duration_sec: typeof content.duration_sec === 'number' ? content.duration_sec : null,
    };
  }
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Auth
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Unauthorized — missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) return jsonResponse(401, { error: 'Invalid token' });
  const jwtUserId = userRes.user.id;
  const isFounder = ((userRes.user.app_metadata as { role?: string } | undefined)?.role ?? null) === 'founder';

  // Resolve client_id (query for GET, body for POST)
  let clientId: string | undefined;
  let force = false;
  if (event.httpMethod === 'GET') {
    clientId = event.queryStringParameters?.client_id;
    force = (event.queryStringParameters?.force || '') === '1';
  } else {
    try {
      const body = JSON.parse(event.body || '{}') as { client_id?: string; force?: boolean };
      clientId = body.client_id;
      force = !!body.force;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }
  }
  if (!isUuid(clientId)) return jsonResponse(400, { error: 'client_id (uuid) is required' });

  // Ownership
  const client = await ownsClient(supa, jwtUserId, clientId, isFounder);
  if (!client) return jsonResponse(403, { error: 'Forbidden — client not visible to this user' });

  // Cache hit
  if (!force) {
    const cached = await loadCachedArtifact(supa, clientId);
    if (cached && cached.video_url) {
      return jsonResponse(200, {
        status: 'ready',
        video_url: cached.video_url,
        duration_sec: cached.duration_sec,
        script: cached.script,
        business_name: client.business_name,
        vertical: client.vertical,
        cached: true,
        artifact_id: cached.artifact_id,
      });
    }
  }

  // Build script
  const { script, via } = await buildScript(client);

  // Resolve founder-clone voice. If it's missing, we still return the script
  // so the UI can render the subtitle text + "voice clone unavailable" state
  // — better than a hard error in front of a brand-new client.
  const voiceId = await getFounderCloneVoiceId();
  if (!voiceId) {
    return jsonResponse(200, {
      status: 'error',
      video_url: null,
      duration_sec: null,
      script,
      business_name: client.business_name,
      vertical: client.vertical,
      cached: false,
      artifact_id: null,
      error: 'Founder clone voice not configured (AGENCY_FOUNDER_CLONE_VOICE_NAME)',
    });
  }

  // Generate speech
  let audio_url: string;
  let duration_sec: number;
  let cost_usd: number;
  try {
    const result = await generateSpeech({
      voice_id: voiceId,
      text: script,
      client_id: clientId,
    });
    audio_url = result.audio_url;
    duration_sec = result.duration_sec;
    cost_usd = result.cost_usd;
  } catch (err) {
    console.error('[client-welcome-video] ElevenLabs generateSpeech failed', err);
    return jsonResponse(502, {
      status: 'error',
      video_url: null,
      duration_sec: null,
      script,
      business_name: client.business_name,
      vertical: client.vertical,
      cached: false,
      artifact_id: null,
      error: 'Voice generation failed; retry in a moment',
    });
  }

  // Persist artifact. content.kind discriminates this from other client_outreach
  // artifacts; preview_url is the signed Storage URL the UI plays directly.
  const { data: artifactRow, error: insertErr } = await supa
    .from('agency_artifacts')
    .insert({
      client_id: clientId,
      type: ARTIFACT_TYPE,
      status: 'shipped',
      generated_by: AGENT_NAME,
      model: via === 'sonnet' ? 'claude-sonnet-4-5+elevenlabs' : 'template+elevenlabs',
      content: {
        kind: ARTIFACT_KIND,
        script,
        duration_sec,
        voice_id: voiceId,
        script_source: via,
        business_name: client.business_name,
        vertical: client.vertical,
        region: client.region,
      },
      preview_url: audio_url,
      ship_target: 'client_portal',
      cost_usd,
      client_facing_note: 'Your welcome from the Boltcall team.',
      shipped_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertErr || !artifactRow) {
    console.warn('[client-welcome-video] artifact persist failed (non-blocking):', insertErr?.message);
  }

  // Best-effort event log — never block on telemetry.
  try {
    await emitAgencyEvent({
      client_id: clientId,
      agent_name: AGENT_NAME,
      type: 'cost_incurred',
      severity: 'info',
      payload: {
        category: 'welcome_video_generated',
        provider: 'other',
        amount_usd: cost_usd,
        op: 'agency-client-welcome-video',
        source: `script_via=${via};voice=${voiceId};duration_sec=${duration_sec}`,
      },
    });
  } catch (err) {
    console.warn('[client-welcome-video] emitAgencyEvent failed (non-blocking):', (err as Error).message);
  }

  return jsonResponse(200, {
    status: 'ready',
    video_url: audio_url,
    duration_sec,
    script,
    business_name: client.business_name,
    vertical: client.vertical,
    cached: false,
    artifact_id: artifactRow?.id ?? null,
  });
};

export default withLegacyHandler(handler);
