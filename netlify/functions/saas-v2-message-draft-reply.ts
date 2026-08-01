import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-message-draft-reply — POST endpoint that drafts an AI reply for a
 * specific thread.
 *
 * Auth: Bearer JWT only. Workspace resolved from JWT → user_id.
 * Body: { thread_id: string, hint?: string }
 *
 * Verifies thread ownership (defense in depth + RLS), reads the last ~20
 * messages of history + the workspace's tone preferences (from
 * workspaces.brand_voice if present, else defaults), and asks Sonnet to draft
 * a single reply.
 *
 * Returns: {
 *   draft: string,
 *   tone: 'friendly' | 'professional',
 *   reasoning_oneliner: string,
 * }
 *
 * Emits: saas_v2_message_reply_drafted with { workspace_id, thread_id,
 *   channel, tier, latency_ms } via emitSaasV2Event.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitSaasV2Event } from './_shared/emit-agency-event';
import { callClaude } from './_shared/agency-agents/run-agent';
import { findWorkspaceForUser } from './_shared/setup-workspace';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
type Channel = 'sms' | 'chat' | 'email';
type Tone = 'friendly' | 'professional';

interface DraftReplyBody {
  thread_id?: string;
  hint?: string;
}

interface ChatHistoryEntry {
  id?: string;
  timestamp?: string;
  sender?: string;
  content?: string;
}

interface ChatRecord {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  customer_name: string | null;
  primary_phone: string | null;
  source: string | null;
  chat_history: ChatHistoryEntry[] | null;
  last_activity_at: string | null;
  created_at: string;
}


function inferChannel(chat: ChatRecord): Channel {
  if (chat.source === 'email') return 'email';
  if (chat.source === 'website' || chat.source === 'app' || chat.source === 'social') {
    return 'chat';
  }
  return 'sms';
}

/**
 * Deterministic stub reply for local/dev with no ANTHROPIC_API_KEY. The page
 * should never see a 500 just because the model isn't reachable.
 */
function fallbackDraft(channel: Channel, contact: string): {
  draft: string;
  tone: Tone;
  reasoning_oneliner: string;
} {
  const greeting =
    channel === 'email' ? `Hi ${contact},` : `Hey ${contact},`;
  return {
    draft: `${greeting}\n\nThanks for reaching out — we'll get back to you within the hour with next steps. If it's urgent please call us directly.\n\nBoltcall`,
    tone: 'friendly',
    reasoning_oneliner:
      'Fallback acknowledgement (model unavailable). Edit before sending.',
  };
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  function unauthorized(message: string) {

    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function badRequest(message: string) {

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function notFound(message: string) {

    return { statusCode: 404, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function serverError(message: string) {

    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: message }) };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const t0 = Date.now();

  // ─── Auth ────────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return unauthorized('Invalid or expired token');
  }
  const userId = userResult.user.id;

  // ─── Body parse ──────────────────────────────────────────────────────────
  let body: DraftReplyBody;
  try {
    body = JSON.parse(event.body || '{}') as DraftReplyBody;
  } catch {
    return badRequest('Invalid JSON body');
  }
  const thread_id = (body.thread_id ?? '').trim();
  if (!thread_id) {
    return badRequest('Body must include thread_id');
  }
  const hint = (body.hint ?? '').trim().slice(0, 500);

  // ─── Workspace + tone preferences ────────────────────────────────────────
  const workspace = await findWorkspaceForUser<{
    id: string;
    brand_voice?: { tone?: string; style?: string } | null;
  }>(userId, 'id, brand_voice').catch(() => null);

  if (!workspace) return badRequest('No workspace owned by this user');
  const workspace_id = workspace.id as string;

  // brand_voice may not exist in this environment — default sensibly.
  const wsBrand = workspace.brand_voice;
  const preferredTone: Tone =
    wsBrand?.tone && /professional|formal/i.test(wsBrand.tone)
      ? 'professional'
      : 'friendly';
  const styleNotes = wsBrand?.style?.slice(0, 280) ?? '';

  // ─── Fetch thread + ownership check ──────────────────────────────────────
  const { data: chat, error: chatErr } = await supa
    .from('chats')
    .select(
      'id, user_id, workspace_id, customer_name, primary_phone, source, chat_history, last_activity_at, created_at',
    )
    .eq('id', thread_id)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (chatErr) return serverError('Failed to fetch thread');
  if (!chat) return notFound('Thread not found');
  if ((chat as ChatRecord).user_id !== userId) {
    return notFound('Thread not found');
  }

  const c = chat as ChatRecord;
  const channel = inferChannel(c);
  const contact = c.customer_name || c.primary_phone || 'there';
  const history = (c.chat_history ?? []).slice(-20).map((h) => ({
    sender: h.sender === 'customer' ? 'customer' : 'us',
    body: (h.content || '').slice(0, 600),
    at: h.timestamp,
  }));

  // ─── Model call (Sonnet) ─────────────────────────────────────────────────
  let draft: string;
  let tone: Tone;
  let reasoning_oneliner: string;

  if (!process.env.ANTHROPIC_API_KEY) {
    const fb = fallbackDraft(channel, contact);
    draft = fb.draft;
    tone = fb.tone;
    reasoning_oneliner = fb.reasoning_oneliner;
  } else {
    try {
      const result = await callClaude<{
        draft: string;
        tone: Tone;
        reasoning_oneliner: string;
      }>({
        agent_name: 'saas-v2-message-draft-reply',
        client_id: workspace_id,
        tier: 'sonnet',
        system: [
          "You are this workspace's customer-response writer for Boltcall — a calm, specific senior CSR.",
          'You draft ONE reply to the most recent customer message in a thread.',
          'STRICT rules:',
          `- Channel = ${channel.toUpperCase()}. ${
            channel === 'sms'
              ? 'Keep it ≤2 sentences, no signature, no greetings if the thread is ongoing.'
              : channel === 'email'
              ? 'Use a brief greeting + 2–4 sentence body + signature line "Boltcall".'
              : 'Match website chat tempo: 1–3 short lines, no signature.'
          }`,
          `- Preferred tone: ${preferredTone}. ${
            styleNotes ? `Brand style notes: ${styleNotes}` : ''
          }`,
          '- Address the customer\'s most recent ask first. Be specific. No filler.',
          '- Never invent appointment times, prices, or policies not in the thread.',
          '- Sound like a 20-person team. Use "we"/"our team", never "I".',
          '- reasoning_oneliner: a single sentence (≤140 chars) explaining why this draft fits.',
        ].join('\n'),
        user_messages: [
          {
            role: 'user',
            content: [
              `# Customer: ${contact}`,
              `# Channel: ${channel}`,
              hint ? `# Optional hint from operator: ${hint}` : '',
              '',
              '# Last 20 messages (oldest → newest)',
              '```json',
              JSON.stringify(history, null, 2),
              '```',
              '',
              'Draft the next reply.',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
        output_schema: {
          type: 'object',
          properties: {
            draft: { type: 'string' },
            tone: { type: 'string', enum: ['friendly', 'professional'] },
            reasoning_oneliner: { type: 'string' },
          },
          required: ['draft', 'tone', 'reasoning_oneliner'],
          additionalProperties: false,
        },
      });
      draft = (result.output.draft || '').trim();
      tone = result.output.tone === 'professional' ? 'professional' : 'friendly';
      reasoning_oneliner = (result.output.reasoning_oneliner || '').slice(0, 200);
      if (!draft) {
        const fb = fallbackDraft(channel, contact);
        draft = fb.draft;
        tone = fb.tone;
        reasoning_oneliner = fb.reasoning_oneliner;
      }
    } catch (err) {
      console.warn(
        `[saas-v2-message-draft-reply] Sonnet failed (using fallback) err=${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      const fb = fallbackDraft(channel, contact);
      draft = fb.draft;
      tone = fb.tone;
      reasoning_oneliner = fb.reasoning_oneliner;
    }
  }

  // ─── Telemetry ───────────────────────────────────────────────────────────
  await emitSaasV2Event({
    workspace_id,
    type: 'saas_v2_message_reply_drafted',
    payload: {
      workspace_id,
      thread_id: c.id,
      channel,
      tier: 'sonnet',
      latency_ms: Date.now() - t0,
    },
  });

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ draft, tone, reasoning_oneliner }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
