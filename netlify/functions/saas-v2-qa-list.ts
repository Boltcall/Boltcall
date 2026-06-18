import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * GET /.netlify/functions/saas-v2-qa-list
 *
 * V2 QA page data feed. JWT-scoped to the caller's workspace.
 *
 * Auth pattern (mirrors saas-v2-toggle.ts + saas-v2-calls.ts):
 *   1. Read Authorization: Bearer <jwt> (401 if missing).
 *   2. supa.auth.getUser(token) -> userId (401 if invalid).
 *   3. SELECT workspaces WHERE user_id = userId (the security barrier).
 *
 * Query string:
 *   date_from    ISO date YYYY-MM-DD (defaults to 7 days ago)
 *   date_to      ISO date YYYY-MM-DD (defaults to today)
 *   max_score    numeric 0-10 (only return rows with overall <= max_score)
 *   dimensions   comma-separated subset of:
 *                  empathy, accuracy, intent_capture, transfer_handled
 *                When present, only rows where ANY listed dim is <= max_score
 *                (or <= 5 by default) are returned.
 *
 * Returns:
 *   {
 *     kpi: {
 *       avg_score: number | null,         // mean of this week's overall scores
 *       scored_count: number,             // calls scored in [date_from, date_to]
 *       failing_count: number,            // calls with overall < FAIL_THRESHOLD
 *       trend_pct: number | null          // pct delta vs prior equal window
 *     },
 *     calls: Array<{
 *       call_id: string,
 *       scored_at: string,                // ISO
 *       rubric: {
 *         empathy: number | null,
 *         accuracy: number | null,
 *         intent_capture: number | null,
 *         transfer_handled: number | null
 *       },
 *       overall: number,
 *       verdict_oneliner: string
 *     }>,
 *     total: number
 *   }
 *
 * Emits saas_v2_qa_rendered { workspace_id, scored_count, failing_count, avg_score }.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
const FAIL_THRESHOLD = 6.0;
const DEFAULT_MAX_SCORE = 5.0;

type DimKey = 'empathy' | 'accuracy' | 'intent_capture' | 'transfer_handled';
const ALL_DIMS: DimKey[] = ['empathy', 'accuracy', 'intent_capture', 'transfer_handled'];

type ScoreRow = {
  call_id: string;
  scored_at: string;
  rubric_empathy: number | null;
  rubric_accuracy: number | null;
  rubric_intent_capture: number | null;
  rubric_transfer_handled: number | null;
  overall: number;
  verdict_oneliner: string | null;
};

function isoDateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateOr(qs: string | undefined, fallback: Date): string {
  if (!qs) return isoDateOnly(fallback);
  // Accept YYYY-MM-DD only; ignore garbage.
  if (/^\d{4}-\d{2}-\d{2}$/.test(qs.trim())) return qs.trim();
  return isoDateOnly(fallback);
}

function clampScore(n: unknown, fallback: number): number {
  const v = Number.parseFloat(String(n));
  if (!Number.isFinite(v) || v < 0 || v > 10) return fallback;
  return v;
}

function parseDimensions(qs: string | undefined): DimKey[] {
  if (!qs) return [];
  return qs
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is DimKey => (ALL_DIMS as string[]).includes(s));
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;
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

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: cors,
      body: JSON.stringify({ error: 'Missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: cors,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }
  const userId = userResult.user.id;

  // ── Resolve workspace ───────────────────────────────────────────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (wsErr) {
    console.warn(`[saas-v2-qa-list] workspace lookup failed user=${userId}: ${wsErr.message}`);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Workspace lookup failed' }),
    };
  }
  if (!workspaceRow) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({ error: 'No workspace owned by this user' }),
    };
  }
  const workspaceId = workspaceRow.id as string;

  // ── Query parsing ───────────────────────────────────────────────────────
  const qs = event.queryStringParameters || {};
  const today = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateFrom = parseDateOr(qs.date_from || undefined, sevenDaysAgo);
  const dateTo = parseDateOr(qs.date_to || undefined, today);
  const maxScore = clampScore(qs.max_score, DEFAULT_MAX_SCORE);
  const dimensions = parseDimensions(qs.dimensions || undefined);

  // ── Main list query (workspace-scoped) ──────────────────────────────────
  // We don't push the per-dim multi-select filter into SQL — it's a small
  // page (typically < 100 rows) and keeping the filter client-side here keeps
  // the query plan simple and the .or() readable.
  const { data: rawRows, error: listErr } = await supa
    .from('saas_v2_qa_scores')
    .select(
      'call_id, scored_at, rubric_empathy, rubric_accuracy, rubric_intent_capture, rubric_transfer_handled, overall, verdict_oneliner',
    )
    .eq('workspace_id', workspaceId)
    .gte('scored_at', `${dateFrom}T00:00:00.000Z`)
    .lte('scored_at', `${dateTo}T23:59:59.999Z`)
    .lte('overall', maxScore)
    .order('scored_at', { ascending: false })
    .limit(200);

  if (listErr) {
    // If the table doesn't exist yet (migration not run), return an empty
    // shape with a soft warning so the UI still mounts.
    console.warn(`[saas-v2-qa-list] list query failed: ${listErr.message}`);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        kpi: { avg_score: null, scored_count: 0, failing_count: 0, trend_pct: null },
        calls: [],
        total: 0,
        warning:
          'QA storage table missing or unreachable — run migration 20260602_v2_qa_scores.sql.',
      }),
    };
  }

  const rows = (rawRows ?? []) as ScoreRow[];

  // ── Optional per-dim multi-select filter (applied in memory) ────────────
  const filtered = dimensions.length === 0
    ? rows
    : rows.filter((r) => {
        return dimensions.some((dim) => {
          const v = r[`rubric_${dim}` as keyof ScoreRow] as number | null;
          return typeof v === 'number' && v <= maxScore;
        });
      });

  // ── KPI: scoped to [date_from, date_to] for THIS workspace (full set,
  //    not just rows that survived max_score). We do a small second query
  //    for unbounded counts so the strip doesn't depend on the page filter.
  const { data: kpiRows, error: kpiErr } = await supa
    .from('saas_v2_qa_scores')
    .select('overall')
    .eq('workspace_id', workspaceId)
    .gte('scored_at', `${dateFrom}T00:00:00.000Z`)
    .lte('scored_at', `${dateTo}T23:59:59.999Z`);

  let kpi = { avg_score: null as number | null, scored_count: 0, failing_count: 0, trend_pct: null as number | null };
  if (!kpiErr && Array.isArray(kpiRows)) {
    const overalls = kpiRows.map((r: { overall: number }) => Number(r.overall)).filter(Number.isFinite);
    kpi.scored_count = overalls.length;
    kpi.failing_count = overalls.filter((s) => s < FAIL_THRESHOLD).length;
    kpi.avg_score = avg(overalls);

    // Trend: compare avg in current window vs prior equal-length window.
    try {
      const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
      const toDate = new Date(`${dateTo}T23:59:59.999Z`);
      const windowMs = toDate.getTime() - fromDate.getTime();
      const priorTo = new Date(fromDate.getTime() - 1);
      const priorFrom = new Date(priorTo.getTime() - windowMs);
      const { data: priorRows } = await supa
        .from('saas_v2_qa_scores')
        .select('overall')
        .eq('workspace_id', workspaceId)
        .gte('scored_at', priorFrom.toISOString())
        .lte('scored_at', priorTo.toISOString());
      const priorOveralls = ((priorRows ?? []) as Array<{ overall: number }>)
        .map((r) => Number(r.overall))
        .filter(Number.isFinite);
      const priorAvg = avg(priorOveralls);
      if (priorAvg !== null && kpi.avg_score !== null && priorAvg > 0) {
        kpi.trend_pct = Math.round(((kpi.avg_score - priorAvg) / priorAvg) * 1000) / 10;
      }
    } catch (err) {
      console.warn('[saas-v2-qa-list] trend calc skipped', err);
    }
  }

  // ── Shape rows for the UI ───────────────────────────────────────────────
  const calls = filtered.map((r) => ({
    call_id: r.call_id,
    scored_at: r.scored_at,
    rubric: {
      empathy: r.rubric_empathy,
      accuracy: r.rubric_accuracy,
      intent_capture: r.rubric_intent_capture,
      transfer_handled: r.rubric_transfer_handled,
    },
    overall: Number(r.overall),
    verdict_oneliner: r.verdict_oneliner ?? '',
  }));

  // ── Best-effort event emit ──────────────────────────────────────────────
  try {
    const { data: clientRow } = await supa
      .from('agency_clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (clientRow?.id) {
      await emitAgencyEvent({
        client_id: clientRow.id as string,
        agent_name: 'saas-v2-qa-list',
        type: 'saas_v2_qa_rendered',
        severity: 'debug',
        payload: {
          workspace_id: workspaceId,
          scored_count: kpi.scored_count,
          failing_count: kpi.failing_count,
          avg_score: kpi.avg_score,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });
    }
  } catch (err) {
    console.warn('[saas-v2-qa-list] event emit failed', err);
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ kpi, calls, total: calls.length }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
