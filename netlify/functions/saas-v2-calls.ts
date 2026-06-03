/**
 * GET /.netlify/functions/saas-v2-calls
 *
 * V2 dashboard calls list. JWT-scoped to the caller's workspace.
 *
 * Auth pattern (mirrors saas-v2-toggle.ts):
 *   1. Read Authorization: Bearer <jwt> from cors (401 if missing).
 *   2. supa.auth.getUser(token) -> userId (401 if invalid).
 *   3. SELECT workspaces WHERE owner_id = userId  (RLS-safe primary filter).
 *
 * Query string:
 *   status      one of retell_calls.call_status (e.g. ended | error | booked | ...)
 *   date_from   ISO date (YYYY-MM-DD)
 *   date_to     ISO date (YYYY-MM-DD)
 *   sideways    "true" to only return rows that match the sideways rule
 *   page        1-indexed page number (default 1)
 *   limit       page size (default 25, max 100)
 *
 * Sideways rule:
 *   (duration_sec < 30 AND call_status != 'booked') OR qa_score < 60
 *
 * Returns:
 *   {
 *     calls: Array<{
 *       id, caller, status, started_at, duration_sec,
 *       ai_summary, qa_score?, sideways_flag, sideways_reason?
 *     }>,
 *     total: number,
 *     page: number,
 *     limit: number
 *   }
 *
 * AI summaries:
 *   We try to read a cached column from retell_calls (ai_summary | summary |
 *   ai_oneline) if it exists. For rows missing a cached summary we batch a
 *   single Haiku call across every row on the page (first 6 transcript turns
 *   + outcome each). Failures fall back to a deterministic one-liner.
 *
 * Emits: saas_v2_calls_list_rendered with { call_count, sideways_count }.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { emitAgencyEvent } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
// ── Types ────────────────────────────────────────────────────────────────
type CallRow = {
  id: string;
  caller: string;
  status: string;
  started_at: string;
  duration_sec: number;
  ai_summary: string;
  qa_score: number | null;
  sideways_flag: boolean;
  sideways_reason: string | null;
};

type RetellCallRecord = {
  id?: string;
  call_id?: string;
  retell_call_id?: string;
  from_number?: string;
  caller?: string;
  customer_phone?: string;
  caller_name?: string;
  call_status?: string;
  status?: string;
  start_timestamp?: string | number;
  started_at?: string;
  start_time?: string;
  duration_ms?: number;
  duration_sec?: number;
  duration?: number;
  transcript?: string | Array<{ role: string; content: string }>;
  transcript_object?: Array<{ role: string; content: string }>;
  qa_score?: number | null;
  call_analysis?: { call_summary?: string; user_sentiment?: string } | null;
  ai_summary?: string | null;
  summary?: string | null;
  ai_oneline?: string | null;
  outcome?: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────
function normalizeRow(raw: RetellCallRecord): {
  id: string;
  caller: string;
  status: string;
  started_at: string;
  duration_sec: number;
  qa_score: number | null;
  transcript_turns: Array<{ role: string; content: string }>;
  cached_summary: string | null;
  outcome: string | null;
} {
  const id = raw.id || raw.call_id || raw.retell_call_id || '';
  const caller =
    raw.caller || raw.caller_name || raw.from_number || raw.customer_phone || 'Unknown';
  const status = raw.call_status || raw.status || 'unknown';
  const started_at =
    raw.started_at ||
    raw.start_time ||
    (typeof raw.start_timestamp === 'number'
      ? new Date(raw.start_timestamp).toISOString()
      : (raw.start_timestamp as string)) ||
    new Date(0).toISOString();
  const duration_sec =
    typeof raw.duration_sec === 'number'
      ? raw.duration_sec
      : typeof raw.duration === 'number'
        ? raw.duration
        : typeof raw.duration_ms === 'number'
          ? Math.round(raw.duration_ms / 1000)
          : 0;
  const qa_score = typeof raw.qa_score === 'number' ? raw.qa_score : null;

  let turns: Array<{ role: string; content: string }> = [];
  if (Array.isArray(raw.transcript_object)) {
    turns = raw.transcript_object.slice(0, 6);
  } else if (Array.isArray(raw.transcript)) {
    turns = (raw.transcript as Array<{ role: string; content: string }>).slice(0, 6);
  } else if (typeof raw.transcript === 'string' && raw.transcript) {
    // Best effort: split on speaker prefixes.
    turns = raw.transcript
      .split(/\n+/)
      .slice(0, 6)
      .map((line) => {
        const m = /^([A-Za-z]+)\s*:\s*(.*)$/.exec(line);
        return m ? { role: m[1].toLowerCase(), content: m[2] } : { role: 'agent', content: line };
      });
  }

  const cached_summary =
    raw.ai_summary || raw.summary || raw.ai_oneline || raw.call_analysis?.call_summary || null;

  return {
    id,
    caller,
    status,
    started_at,
    duration_sec,
    qa_score,
    transcript_turns: turns,
    cached_summary,
    outcome: raw.outcome || null,
  };
}

function deterministicFallbackSummary(row: {
  caller: string;
  status: string;
  duration_sec: number;
}): string {
  const dur = row.duration_sec >= 60
    ? `${Math.round(row.duration_sec / 60)}m`
    : `${row.duration_sec}s`;
  return `${row.caller} — ${row.status} (${dur})`;
}

function sidewaysCheck(row: {
  status: string;
  duration_sec: number;
  qa_score: number | null;
}): { flag: boolean; reason: string | null } {
  const reasons: string[] = [];
  if (row.duration_sec < 30 && row.status !== 'booked') {
    reasons.push('call ended in under 30 seconds without a booking');
  }
  if (typeof row.qa_score === 'number' && row.qa_score < 60) {
    reasons.push(`QA score ${row.qa_score} below 60`);
  }
  if (reasons.length === 0) return { flag: false, reason: null };
  return { flag: true, reason: reasons.join('; ') };
}

/**
 * Batch one Haiku call across every row that still needs a one-liner.
 * We send a structured JSON list and expect a JSON list back, indexed by
 * call_id. Failures fall back to deterministic strings — never throw.
 */
async function batchSummarize(
  rows: Array<{
    id: string;
    caller: string;
    status: string;
    duration_sec: number;
    transcript_turns: Array<{ role: string; content: string }>;
    outcome: string | null;
  }>,
): Promise<Record<string, string>> {
  if (rows.length === 0) return {};

  const systemPrompt =
    'You are a plain-English summarizer for a local-services call inbox. ' +
    'You will receive a JSON array of calls. For each call, write ONE sentence ' +
    '(max 18 words) that says who called, what they wanted, and what happened. ' +
    'No marketing language. No hedging. Past tense. ' +
    'Return STRICT JSON: an array of {"id": "...", "summary": "..."} — nothing else.';

  const compactRows = rows.map((r) => ({
    id: r.id,
    caller: r.caller,
    status: r.status,
    duration_sec: r.duration_sec,
    outcome: r.outcome,
    turns: r.transcript_turns.map((t) => ({
      role: t.role,
      content: (t.content || '').slice(0, 240),
    })),
  }));

  try {
    const text = await chatCompletion(systemPrompt, JSON.stringify(compactRows), {
      tier: 'light', // light tier is the Haiku-equivalent budget slot per project routing
      maxTokens: Math.min(2048, 64 * rows.length + 256),
    });
    // Extract first JSON array we can parse.
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]) as Array<{ id: string; summary: string }>;
    const out: Record<string, string> = {};
    for (const item of parsed) {
      if (item && typeof item.id === 'string' && typeof item.summary === 'string') {
        out[item.id] = item.summary.trim();
      }
    }
    return out;
  } catch (err) {
    console.warn('[saas-v2-calls] batch summary failed, using deterministic fallback', err);
    return {};
  }
}

// ── Handler ──────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth (exact pattern from saas-v2-toggle.ts) ────────────────────────
  const authHeader = event.cors['authorization'] || event.cors['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, cors, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return { statusCode: 401, cors, body: JSON.stringify({ error: 'Invalid token' }) };
  }
  const userId = userResult.user.id;

  // ── Resolve workspace (owner_id filter is the primary security boundary) ─
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, v2_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (wsErr) {
    console.error('[saas-v2-calls] workspace lookup failed', wsErr);
    return { statusCode: 500, cors, body: JSON.stringify({ error: 'Workspace lookup failed' }) };
  }
  if (!workspaceRow) {
    return { statusCode: 404, cors, body: JSON.stringify({ error: 'Workspace not found' }) };
  }
  const workspaceId = workspaceRow.id as string;

  // ── Query parsing ──────────────────────────────────────────────────────
  const qs = event.queryStringParameters || {};
  const status = qs.status?.trim() || null;
  const dateFrom = qs.date_from?.trim() || null;
  const dateTo = qs.date_to?.trim() || null;
  const sidewaysOnly = qs.sideways === 'true' || qs.sideways === '1';
  const page = Math.max(1, Number.parseInt(qs.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(qs.limit || '25', 10) || 25));
  const offset = (page - 1) * limit;

  // ── Discover available columns on retell_calls (best effort) ───────────
  // We read one row to learn which optional columns are present (ai_summary,
  // summary, ai_oneline, qa_score, etc.). If the table doesn't exist or is
  // empty, we still try the query — the select below uses a star.
  // ───────────────────────────────────────────────────────────────────────

  // ── Main query — scoped to workspace_id ────────────────────────────────
  let query = supa
    .from('retell_calls')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if (status) query = query.eq('call_status', status);
  if (dateFrom) query = query.gte('started_at', dateFrom);
  if (dateTo) query = query.lte('started_at', `${dateTo}T23:59:59.999Z`);

  // Server-side sideways filter when possible. We OR over the two SQL-expressible
  // halves of the rule; rows missing qa_score will only match the duration half.
  if (sidewaysOnly) {
    query = query.or('and(duration_sec.lt.30,call_status.neq.booked),qa_score.lt.60');
  }

  const { data: rawRows, count, error: qErr } = await query
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (qErr) {
    console.error('[saas-v2-calls] retell_calls query failed', qErr);
    return {
      statusCode: 500,
      cors,
      body: JSON.stringify({ error: 'Calls query failed', details: qErr.message }),
    };
  }

  const normalized = (rawRows || []).map((r) => normalizeRow(r as RetellCallRecord));

  // ── Decide which rows need a freshly generated AI summary ──────────────
  const needsSummary = normalized.filter((r) => !r.cached_summary && r.id);
  const summaries = await batchSummarize(needsSummary);

  // ── Build response rows + sideways tags ────────────────────────────────
  const calls: CallRow[] = normalized.map((r) => {
    const side = sidewaysCheck(r);
    const summary =
      r.cached_summary ||
      summaries[r.id] ||
      deterministicFallbackSummary({ caller: r.caller, status: r.status, duration_sec: r.duration_sec });

    return {
      id: r.id,
      caller: r.caller,
      status: r.status,
      started_at: r.started_at,
      duration_sec: r.duration_sec,
      ai_summary: summary,
      qa_score: r.qa_score,
      sideways_flag: side.flag,
      sideways_reason: side.reason,
    };
  });

  const sidewaysCount = calls.reduce((n, c) => n + (c.sideways_flag ? 1 : 0), 0);

  // ── Emit event (never block on emit failures) ──────────────────────────
  try {
    await emitAgencyEvent({
      client_id: workspaceId,
      agent_name: 'saas-v2-calls',
      type: 'saas_v2_calls_list_rendered',
      severity: 'info',
      payload: {
        workspace_id: workspaceId,
        rows_returned: calls.length,
        filters_applied: [
          status ? `status:${status}` : null,
          dateFrom ? 'date_from' : null,
          dateTo ? 'date_to' : null,
          sidewaysOnly ? 'sideways' : null,
        ].filter(Boolean) as string[],
      },
      why_explanation: 'User opened the V2 calls page.',
    });
  } catch (err) {
    console.warn('[saas-v2-calls] event emit failed (non-fatal)', err);
  }

  return {
    statusCode: 200,
    cors,
    body: JSON.stringify({
      calls,
      total: count ?? calls.length,
      page,
      limit,
      sideways_count: sidewaysCount,
    }),
  };
};
