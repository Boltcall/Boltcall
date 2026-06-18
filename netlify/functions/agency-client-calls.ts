import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-calls.ts — Boltcall Agency OS · Layer 7 · Client portal
 * ──────────────────────────────────────────────────────────────────────
 *
 * GET endpoint backing `/client/calls`. Returns the calling client's
 * call history with per-call AI summary, QA score, outcome, duration.
 *
 * Auth model:
 *   - Bearer token (Supabase JWT) required.
 *   - NOT founder-gated. ANY user with an `agency_clients` row (status
 *     not in {churned, paused}) can call this for their OWN client.
 *   - Defense-in-depth: we resolve client_id from auth.uid() server-side
 *     (never trust a `?client_id=` query param). RLS would catch a
 *     spoofed id, but server-side ownership check fails earlier and
 *     emits a clean 403.
 *
 * Query params:
 *   ?limit=50       — page size (1..100, default 50)
 *   ?cursor=ISO     — pagination cursor (started_at < cursor, exclusive)
 *   ?outcome=...    — filter: booked | missed-opportunity | no-show-risk
 *                     | transferred (maps to canonical agency_events
 *                     call_completed.outcome enum)
 *   ?min_qa=N       — only return calls with QA score >= N
 *   ?max_qa=N       — only return calls with QA score <= N
 *   ?sideways=1     — convenience flag: QA<7 OR outcome=missed-opportunity
 *
 * Data sources (read-only):
 *   - agency_events           — type='call_completed' for outcome/duration
 *                               + `why_explanation` as the 1-line AI summary
 *                               (cached on event emission by retell-adapter
 *                               and qa-auditor's downstream pass).
 *   - agency_events           — type='benchmark_score_recorded' for the
 *                               per-call QA score (final, post-tiebreaker).
 *   - agency_artifacts        — type='escalation_action', generated_by=
 *                               'qa-auditor' for the rich QA payload
 *                               (sampling_reason, failure_pattern, etc).
 *     Only SHIPPED artifacts are returnable to the client.
 *
 * Whitelist policy:
 *   - Never expose: retell internal call_id is OK (it's already in the
 *     transcript URL the client can click), but we DON'T expose
 *     judge_a / judge_b raw reasoning_trace or model names. The QA
 *     score breakdown returned here is the FINAL per-dim score only.
 *     The detail endpoint (agency-client-call-detail.ts) returns the
 *     human-readable explanation; raw judge internals stay founder-side.
 *
 *   See client-portal design principle #8 — "the client can audit any
 *   claim" — every number we return is sourced from one of the above.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const SIDEWAYS_QA_THRESHOLD = 7;

interface CallEventRow {
  id: string;
  created_at: string;
  payload: {
    call_id?: string;
    direction?: string;
    duration_seconds?: number;
    outcome?: string;
    ended_reason?: string;
    qa_score?: number;
  } | null;
  why_explanation?: string | null;
}

interface BenchmarkEventRow {
  created_at: string;
  payload: {
    benchmark_id?: string;
    score?: number;
    passed?: boolean;
    artifact_id?: string;
  } | null;
}

interface ArtifactRow {
  id: string;
  created_at: string;
  content: unknown;
  eval_score: number | null;
}

interface ClientCallSummary {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome: 'booked' | 'missed-opportunity' | 'no-show-risk' | 'transferred' | 'other';
  qa_score: number | null;
  qa_artifact_id: string | null;
  ai_summary: string;
  // Hints for the UI to surface the "Calls that went sideways" badge inline
  is_sideways: boolean;
}

// Map the canonical call_completed.outcome enum to the four UX-facing
// categories the client portal speaks in. The kernel enum is intentionally
// finer-grained for analytics; the client view collapses to the four buckets
// the design principles call out.
function classifyOutcome(
  raw: string | undefined,
  endedReason: string | undefined,
  qaScore: number | null,
): ClientCallSummary['outcome'] {
  const o = (raw ?? '').toLowerCase();
  if (o === 'booked') return 'booked';
  if (o === 'transferred') return 'transferred';
  // not_qualified + hangup + voicemail + other — distinguish "missed
  // opportunity" (the caller wanted to buy but we lost them) from
  // "no-show-risk" (booked-but-fragile, very short or transferred).
  // Without a proper post-call followup signal we approximate:
  //   - QA score < 6 AND outcome != booked  => missed-opportunity
  //   - otherwise non-booked, non-transferred => other
  // (no-show-risk is reserved for the booking-detail endpoint that
  // knows the booking's status; here we conservatively don't claim it.)
  if (typeof qaScore === 'number' && qaScore < 6) return 'missed-opportunity';
  if (o === 'not_qualified' || o === 'hangup' || endedReason === 'user_hangup') {
    return 'missed-opportunity';
  }
  return 'other';
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized — missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
  const uid = userResult.user.id;

  // Resolve client_id from auth.uid() — defense in depth alongside RLS.
  const { data: clientRow, error: clientErr } = await supa
    .from('agency_clients')
    .select('id, business_name, vertical, status')
    .eq('user_id', uid)
    .not('status', 'in', '("churned","paused")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clientErr || !clientRow) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'No active agency client linked to this account',
      }),
    };
  }
  const client_id = clientRow.id as string;

  // ── Parse + bound query params ──────────────────────────────────────
  const qp = event.queryStringParameters || {};
  const limit = clamp(parseInt(qp.limit || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1, MAX_LIMIT);
  const cursor = qp.cursor && /^\d{4}-\d{2}-\d{2}T/.test(qp.cursor) ? qp.cursor : null;
  const outcomeFilter = qp.outcome || null;
  const minQa = qp.min_qa ? Number(qp.min_qa) : null;
  const maxQa = qp.max_qa ? Number(qp.max_qa) : null;
  const sideways = qp.sideways === '1' || qp.sideways === 'true';

  // ── Pull call_completed events ──────────────────────────────────────
  // Over-fetch slightly so we can post-filter on QA score / sideways
  // without losing the next-page cursor on the database side.
  const overscan = limit * 3;
  let q = supa
    .from('agency_events')
    .select('id, created_at, payload, why_explanation')
    .eq('client_id', client_id)
    .eq('type', 'call_completed')
    .order('created_at', { ascending: false })
    .limit(overscan);
  if (cursor) q = q.lt('created_at', cursor);

  const { data: callRows, error: callErr } = await q;
  if (callErr) {
    console.error('[agency-client-calls] call query failed:', callErr.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to load calls' }),
    };
  }

  const events = (callRows ?? []) as CallEventRow[];
  const callIds = events
    .map((e) => e.payload?.call_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  // ── Join in QA scores (benchmark_score_recorded with benchmark_id=qa-call-<callId>) ──
  const qaByCallId = new Map<string, { score: number; artifact_id: string | null }>();
  if (callIds.length > 0) {
    const benchmarkIds = callIds.map((c) => `qa-call-${c}`);
    const { data: qaRows, error: qaErr } = await supa
      .from('agency_events')
      .select('created_at, payload')
      .eq('client_id', client_id)
      .eq('type', 'benchmark_score_recorded')
      .in('payload->>benchmark_id', benchmarkIds)
      .order('created_at', { ascending: false })
      .limit(callIds.length * 3); // some calls may have repeat passes
    if (!qaErr && qaRows) {
      for (const row of qaRows as BenchmarkEventRow[]) {
        const bid = row.payload?.benchmark_id || '';
        if (!bid.startsWith('qa-call-')) continue;
        const cid = bid.slice('qa-call-'.length);
        // First write wins (most recent due to descending order)
        if (!qaByCallId.has(cid) && typeof row.payload?.score === 'number') {
          qaByCallId.set(cid, {
            score: row.payload.score,
            artifact_id: row.payload.artifact_id ?? null,
          });
        }
      }
    }
  }

  // ── Build summaries ─────────────────────────────────────────────────
  const summaries: ClientCallSummary[] = events.map((e) => {
    const p = e.payload || {};
    const cid = p.call_id || e.id;
    const qa = qaByCallId.get(cid) || null;
    const qaScore = qa?.score ?? (typeof p.qa_score === 'number' ? p.qa_score : null);
    const outcome = classifyOutcome(p.outcome, p.ended_reason, qaScore);

    const is_sideways =
      (typeof qaScore === 'number' && qaScore < SIDEWAYS_QA_THRESHOLD) ||
      outcome === 'missed-opportunity';

    return {
      call_id: cid,
      started_at: e.created_at,
      duration_sec: Number(p.duration_seconds ?? 0),
      outcome,
      qa_score: qaScore,
      qa_artifact_id: qa?.artifact_id ?? null,
      ai_summary:
        e.why_explanation?.trim() ||
        fallbackSummary({
          outcome,
          duration_sec: Number(p.duration_seconds ?? 0),
          qaScore,
        }),
      is_sideways,
    };
  });

  // ── Apply post-filters ──────────────────────────────────────────────
  let filtered = summaries;
  if (outcomeFilter) {
    filtered = filtered.filter((s) => s.outcome === outcomeFilter);
  }
  if (typeof minQa === 'number' && Number.isFinite(minQa)) {
    filtered = filtered.filter((s) => typeof s.qa_score === 'number' && s.qa_score >= minQa);
  }
  if (typeof maxQa === 'number' && Number.isFinite(maxQa)) {
    filtered = filtered.filter((s) => typeof s.qa_score === 'number' && s.qa_score <= maxQa);
  }
  if (sideways) {
    filtered = filtered.filter((s) => s.is_sideways);
  }

  const page = filtered.slice(0, limit);
  const nextCursor =
    page.length === limit ? page[page.length - 1].started_at : null;

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      client: {
        id: client_id,
        business_name: clientRow.business_name,
        vertical: clientRow.vertical,
      },
      calls: page,
      paging: {
        limit,
        next_cursor: nextCursor,
        returned: page.length,
        scanned: events.length,
      },
    }),
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * If no AI why_explanation was cached on the event (e.g. early calls before
 * the qa-auditor's downstream pass ran), produce a deterministic one-liner
 * so the UI never renders a blank summary column. The wording mirrors the
 * reporting-scribe's narrative tone — never "Call complete, duration 92s".
 */
function fallbackSummary(args: {
  outcome: ClientCallSummary['outcome'];
  duration_sec: number;
  qaScore: number | null;
}): string {
  const mins = Math.floor(args.duration_sec / 60);
  const secs = args.duration_sec % 60;
  const dur = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  switch (args.outcome) {
    case 'booked':
      return `Booked the appointment after a ${dur} conversation. Strategist's note pending.`;
    case 'transferred':
      return `Caller was transferred mid-call after ${dur}. Reviewing what triggered the handoff.`;
    case 'missed-opportunity':
      return `Caller hung up after ${dur} without booking. Pulling the transcript to learn why.`;
    case 'no-show-risk':
      return `Booked, but the conversation had risk signals. Watching for the appointment.`;
    default:
      return `${dur} call. Awaiting the strategist's read.${
        args.qaScore !== null ? ` Provisional QA score ${args.qaScore.toFixed(1)}.` : ''
      }`;
  }
}

export const testHandler = handler;
export default withLegacyHandler(handler);
