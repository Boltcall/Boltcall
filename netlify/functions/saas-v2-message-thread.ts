import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-message-thread — GET a single thread's full history + lead context.
 *
 * Auth: Bearer JWT only. Workspace resolved server-side from JWT → user_id.
 * Param: thread_id (uuid) via querystring.
 *
 * Verifies that the thread belongs to the calling user's workspace (defense in
 * depth — RLS is the database-side guard; this is the application-side guard).
 *
 * Returns: {
 *   thread: ThreadRow,
 *   messages: Array<{ id, direction, body, sent_at }>,
 *   context: { lead?, customer_history? },
 * }
 *
 * Emits: saas_v2_message_thread_opened with { workspace_id, thread_id,
 *   channel, message_count } via emitSaasV2Event.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitSaasV2Event } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
type Channel = 'sms' | 'chat' | 'email';

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
  customer_email: string | null;
  status: string | null;
  source: string | null;
  chat_history: ChatHistoryEntry[] | null;
  last_message_at: string | null;
  last_activity_at: string | null;
  message_count: number | null;
  agent_id: string | null;
  lead_id: string | null;
  created_at: string;
}


function inferChannel(chat: ChatRecord): Channel {
  if (chat.source === 'email') return 'email';
  if (chat.source === 'website' || chat.source === 'app' || chat.source === 'social') {
    return 'chat';
  }
  return 'sms';
}

const handler: Handler = async (event) => {
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

  function notFound(message: string) {

    return { statusCode: 404, headers: cors, body: JSON.stringify({ error: message }) };

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

  // ─── Workspace ───────────────────────────────────────────────────────────
  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (wsErr) {
    return serverError('Failed to resolve workspace');
  }
  if (!workspace) {
    return badRequest('No workspace owned by this user');
  }
  const workspace_id = workspace.id as string;

  // ─── Param ───────────────────────────────────────────────────────────────
  const thread_id = (event.queryStringParameters?.thread_id ?? '').trim();
  if (!thread_id) {
    return badRequest('Missing thread_id query param');
  }

  // ─── Fetch + ownership verification ──────────────────────────────────────
  const { data: chat, error: chatErr } = await supa
    .from('chats')
    .select(
      'id, user_id, workspace_id, customer_name, primary_phone, customer_email, status, source, chat_history, last_message_at, last_activity_at, message_count, agent_id, lead_id, created_at',
    )
    .eq('id', thread_id)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (chatErr) {
    console.warn(`[saas-v2-message-thread] fetch failed err=${chatErr.message}`);
    return serverError('Failed to fetch thread');
  }
  if (!chat) {
    return notFound('Thread not found');
  }
  if ((chat as ChatRecord).user_id !== userId) {
    // Don't leak existence to a non-owner — return 404, not 403.
    return notFound('Thread not found');
  }

  const c = chat as ChatRecord;
  const channel = inferChannel(c);

  // ─── Project messages ────────────────────────────────────────────────────
  const history = c.chat_history ?? [];
  const messages = history.map((h, idx) => ({
    id: h.id || `${c.id}-${idx}`,
    direction:
      h.sender === 'customer'
        ? ('inbound' as const)
        : ('outbound' as const),
    body: h.content || '',
    sent_at: h.timestamp || c.last_activity_at || c.created_at,
  }));

  // ─── Lead + customer_history context ─────────────────────────────────────
  let lead: { id: string; name?: string; phone?: string; email?: string } | undefined;
  if (c.lead_id) {
    const { data: leadRow } = await supa
      .from('leads')
      .select('id, name, phone, email')
      .eq('id', c.lead_id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();
    if (leadRow) {
      lead = {
        id: leadRow.id as string,
        name: (leadRow.name as string | undefined) ?? undefined,
        phone: (leadRow.phone as string | undefined) ?? undefined,
        email: (leadRow.email as string | undefined) ?? undefined,
      };
    }
  }

  // Customer history: how many prior threads from this same phone/email.
  let customer_history: { thread_count?: number; last_seen?: string } | undefined;
  if (c.primary_phone || c.customer_email) {
    const filterCol = c.primary_phone ? 'primary_phone' : 'customer_email';
    const filterVal = (c.primary_phone || c.customer_email) as string;
    const { count: priorCount, data: priorRows } = await supa
      .from('chats')
      .select('id, last_activity_at', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .eq(filterCol, filterVal)
      .neq('id', c.id)
      .order('last_activity_at', { ascending: false })
      .limit(1);
    customer_history = {
      thread_count: priorCount ?? 0,
      last_seen: (priorRows?.[0]?.last_activity_at as string | undefined) ?? undefined,
    };
  }

  // ─── ThreadRow projection (matches saas-v2-messages shape) ───────────────
  const threadRow = {
    id: c.id,
    contact_name: c.customer_name || c.primary_phone || 'Unknown',
    channel,
    last_msg_at: c.last_message_at || c.last_activity_at || c.created_at,
    ai_summary: '',
    needs_reply: false,
    unread_count: 0,
    assignee: c.agent_id,
  };

  // ─── Telemetry ───────────────────────────────────────────────────────────
  await emitSaasV2Event({
    workspace_id,
    type: 'saas_v2_message_thread_opened',
    payload: {
      workspace_id,
      thread_id: c.id,
      channel,
      message_count: messages.length,
    },
  });

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      thread: threadRow,
      messages,
      context: { lead, customer_history },
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
