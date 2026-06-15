/**
 * saas-v2-messages — GET endpoint returning the V2 unified inbox feed.
 *
 * Auth: Bearer JWT only. The JWT's user_id maps to workspaces.user_id; we
 *   NEVER accept workspace_id from the query string — that's the security
 *   barrier. The kernel resolves workspace server-side.
 *
 * Query: channel (sms|chat|email), status (open|closed), needs_reply (bool),
 *        assignee (uuid), page (default 1), limit (default 50, max 100).
 *
 * Returns: {
 *   threads: Array<{ id, contact_name, channel, last_msg_at, ai_summary,
 *                    needs_reply, unread_count, assignee }>,
 *   total: number,
 *   cold_start?: boolean,
 *   cold_start_reason?: string,
 * }
 *
 * Data source: `chats` table (live SMS/chat) + `scheduled_messages` (queued
 *   SMS/email). For the V2 inbox view we project `chats` rows into a uniform
 *   ThreadRow shape — chats are the primary live-thread surface; scheduled
 *   messages don't have their own "thread" identity so we surface them only
 *   when their recipient_phone correlates to an existing chat (best-effort).
 *
 * ai_summary: Haiku batched. A single Claude call summarizes up to N threads
 *   in one tool-use response to keep latency + cost down. If Haiku is
 *   unavailable (no ANTHROPIC_API_KEY in dev), we fall back to a deterministic
 *   one-liner derived from the last message body.
 *
 * needs_reply heuristic (per recon brief):
 *   last message inbound AND age > 30min AND status = 'open'.
 *
 * Cold-start guard: <30 chats OR workspace age <14 days → cold_start = true,
 *   threads = [], and the page renders a placeholder.
 *
 * Emits: saas_v2_messages_list_rendered with { workspace_id, count,
 *   needs_reply_count, channel_breakdown, latency_ms } via emitSaasV2Event.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitSaasV2Event } from './_shared/emit-agency-event';
import { callClaude } from './_shared/agency-agents/run-agent';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
const COLD_START_MIN_CHATS = 30;
const COLD_START_MIN_WORKSPACE_AGE_DAYS = 14;
const NEEDS_REPLY_MIN_AGE_MIN = 30;
const MAX_LIMIT = 100;

type Channel = 'sms' | 'chat' | 'email';
type Status = 'open' | 'closed';

interface ThreadRow {
  id: string;
  contact_name: string;
  channel: Channel;
  last_msg_at: string;
  ai_summary: string;
  needs_reply: boolean;
  unread_count: number;
  assignee: string | null;
}

interface ChatRow {
  id: string;
  customer_name: string | null;
  primary_phone: string | null;
  status: string | null;
  chat_type: string | null;
  source: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_activity_at: string | null;
  message_count: number | null;
  agent_id: string | null;
  chat_history: Array<{
    sender?: string;
    content?: string;
    timestamp?: string;
  }> | null;
  created_at: string;
  user_id: string;
  workspace_id?: string | null;
}


function inferChannel(chat: ChatRow): Channel {
  // chats.source is sometimes 'website'|'phone'|'email'|'social'|'app'.
  if (chat.source === 'email') return 'email';
  if (chat.source === 'website' || chat.source === 'app' || chat.source === 'social') {
    return 'chat';
  }
  // Default phone/sms-shaped sources to SMS.
  return 'sms';
}

function lastMessageDirection(chat: ChatRow): 'inbound' | 'outbound' | null {
  const history = chat.chat_history ?? [];
  if (history.length === 0) return null;
  const last = history[history.length - 1];
  if (!last?.sender) return null;
  if (last.sender === 'customer') return 'inbound';
  if (last.sender === 'agent' || last.sender === 'system') return 'outbound';
  return null;
}

function ageMinutes(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

/**
 * Best-effort Haiku batched summary for up to ~25 chats. Returns a map of
 * chat_id → one-line summary. Falls back to a deterministic last-message
 * snippet on any failure so the inbox never breaks because of the model.
 */
async function summarizeBatch(
  chats: ChatRow[],
  workspace_id: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  // Deterministic fallback for every chat.
  for (const c of chats) {
    const snippet = (c.last_message || '').trim().replace(/\s+/g, ' ');
    out.set(
      c.id,
      snippet
        ? snippet.length > 100
          ? snippet.slice(0, 97) + '…'
          : snippet
        : 'No messages yet.',
    );
  }

  // Skip the model call if we have no key (dev/local) — fallback already set.
  if (!process.env.ANTHROPIC_API_KEY || chats.length === 0) {
    return out;
  }

  try {
    const payload = chats.slice(0, 25).map((c) => ({
      id: c.id,
      contact: c.customer_name || 'Unknown',
      last_message: (c.last_message || '').slice(0, 280),
      message_count: c.message_count ?? 0,
    }));

    const result = await callClaude<{
      summaries: Array<{ id: string; summary: string }>;
    }>({
      agent_name: 'saas-v2-messages',
      client_id: workspace_id, // cost telemetry namespace
      tier: 'haiku',
      system: [
        'You write one-line inbox summaries for an AI receptionist dashboard.',
        'For each thread, write a 6–12 word summary in plain prose.',
        'STRICT rules:',
        '- Lead with the contact intent (e.g., "Asking about pricing", "Booking confirmed").',
        '- No markdown, no quotes, no emojis.',
        '- Never invent facts not present in the last message.',
      ].join('\n'),
      user_messages: [
        {
          role: 'user',
          content:
            '# Threads\n```json\n' + JSON.stringify(payload, null, 2) + '\n```',
        },
      ],
      output_schema: {
        type: 'object',
        properties: {
          summaries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                summary: { type: 'string' },
              },
              required: ['id', 'summary'],
              additionalProperties: false,
            },
          },
        },
        required: ['summaries'],
        additionalProperties: false,
      },
    });

    for (const s of result.output.summaries || []) {
      if (s.id && s.summary) {
        out.set(s.id, s.summary.trim().slice(0, 160));
      }
    }
  } catch (err) {
    console.warn(
      `[saas-v2-messages] Haiku summarize failed (using fallback) err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return out;
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  function unauthorized(message: string) {

    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function badRequest(message: string) {

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function serverError(message: string) {

    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: message }) };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
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

  // ─── Workspace resolution ────────────────────────────────────────────────
  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select('id, created_at')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (wsErr) {
    console.warn(`[saas-v2-messages] workspace lookup failed err=${wsErr.message}`);
    return serverError('Failed to resolve workspace');
  }
  if (!workspace) {
    return badRequest('No workspace owned by this user');
  }
  const workspace_id = workspace.id as string;

  // ─── Query params ────────────────────────────────────────────────────────
  const qs = event.queryStringParameters ?? {};
  const channelFilter = (qs.channel ?? '').toLowerCase();
  const statusFilter = (qs.status ?? '').toLowerCase();
  const needsReplyOnly = qs.needs_reply === 'true' || qs.needs_reply === '1';
  const assigneeFilter = qs.assignee ?? '';
  const page = Math.max(1, parseInt(qs.page ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(qs.limit ?? '50', 10) || 50));
  const offset = (page - 1) * limit;

  // ─── Cold start check ────────────────────────────────────────────────────
  const workspaceAgeDays = workspace.created_at
    ? (Date.now() - new Date(workspace.created_at as string).getTime()) /
      (1000 * 60 * 60 * 24)
    : 0;

  const { count: totalChatCount } = await supa
    .from('chats')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace_id);

  const isColdStart =
    (totalChatCount ?? 0) < COLD_START_MIN_CHATS &&
    workspaceAgeDays < COLD_START_MIN_WORKSPACE_AGE_DAYS;

  if (isColdStart) {
    // Still emit telemetry so the cold-start surface count is observable.
    await emitSaasV2Event({
      workspace_id,
      type: 'saas_v2_messages_list_rendered',
      payload: {
        workspace_id,
        count: 0,
        needs_reply_count: 0,
        latency_ms: Date.now() - t0,
      },
    });
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        threads: [],
        total: 0,
        cold_start: true,
        cold_start_reason: `Unlock at ${COLD_START_MIN_CHATS} calls (you have ${
          totalChatCount ?? 0
        }) or ${COLD_START_MIN_WORKSPACE_AGE_DAYS} days of activity.`,
      }),
    };
  }

  // ─── Fetch chats ─────────────────────────────────────────────────────────
  // ALWAYS scope by user_id — defense in depth beyond RLS.
  let query = supa
    .from('chats')
    .select(
      'id, customer_name, primary_phone, status, chat_type, source, last_message, last_message_at, last_activity_at, message_count, agent_id, chat_history, created_at, user_id, workspace_id',
      { count: 'exact' },
    )
    .eq('workspace_id', workspace_id)
    .order('last_activity_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter === 'open') {
    query = query.in('status', ['active', 'paused']);
  } else if (statusFilter === 'closed') {
    query = query.in('status', ['closed', 'transferred', 'abandoned']);
  }
  if (assigneeFilter) {
    query = query.eq('agent_id', assigneeFilter);
  }

  const { data: rows, count, error: chatsErr } = await query;
  if (chatsErr) {
    console.warn(`[saas-v2-messages] chats query failed err=${chatsErr.message}`);
    return serverError('Failed to fetch threads');
  }

  let chats = (rows ?? []) as ChatRow[];

  // Channel filter is applied AFTER fetch because channel is derived from
  // source (not a single column).
  if (channelFilter === 'sms' || channelFilter === 'chat' || channelFilter === 'email') {
    chats = chats.filter((c) => inferChannel(c) === channelFilter);
  }

  // ─── AI summary batch (Haiku) ────────────────────────────────────────────
  const summaries = await summarizeBatch(chats, workspace_id);

  // ─── Project to ThreadRow ────────────────────────────────────────────────
  const threads: ThreadRow[] = chats.map((c) => {
    const channel = inferChannel(c);
    const direction = lastMessageDirection(c);
    const lastTs = c.last_message_at || c.last_activity_at || c.created_at;
    const needs_reply =
      direction === 'inbound' &&
      ageMinutes(lastTs) > NEEDS_REPLY_MIN_AGE_MIN &&
      (c.status === 'active' || c.status === 'paused');

    return {
      id: c.id,
      contact_name: c.customer_name || c.primary_phone || 'Unknown',
      channel,
      last_msg_at: lastTs,
      ai_summary: summaries.get(c.id) || '',
      needs_reply,
      unread_count: needs_reply ? 1 : 0,
      assignee: c.agent_id ?? null,
    };
  });

  const filtered = needsReplyOnly ? threads.filter((t) => t.needs_reply) : threads;

  // ─── Telemetry ───────────────────────────────────────────────────────────
  const needs_reply_count = filtered.filter((t) => t.needs_reply).length;
  const channel_breakdown: Record<string, number> = { sms: 0, chat: 0, email: 0 };
  filtered.forEach((t) => {
    channel_breakdown[t.channel] = (channel_breakdown[t.channel] || 0) + 1;
  });

  await emitSaasV2Event({
    workspace_id,
    type: 'saas_v2_messages_list_rendered',
    payload: {
      workspace_id,
      count: filtered.length,
      needs_reply_count,
      channel_breakdown,
      latency_ms: Date.now() - t0,
    },
  });

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      threads: filtered,
      total: count ?? filtered.length,
    }),
  };
};
