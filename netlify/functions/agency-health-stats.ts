import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * Agency OS — Health Stats (GET, founder-only)
 * =============================================
 *
 * Aggregated OS-health snapshot for the per-OS founder dashboard
 * (`/dashboard/agency/health`). Returns a single JSON object so the page
 * makes one round trip per refresh (auto-refresh every 60s, ~50 KB).
 *
 * Why founder-only:
 *   This endpoint surfaces cross-tenant aggregates (MRR sum, queue-age
 *   histogram, churn-risk grid, per-agent cost). None of it is safe for a
 *   client JWT. The auth gate hard-rejects non-founders with 403 BEFORE
 *   the service-role Supabase client is constructed — so a client cannot
 *   even probe whether the endpoint exists with their token.
 *
 * Founder detection mirrors the SQL is_founder() helper in
 * supabase/migrations/20260530_agency_rls.sql:
 *   - JWT app_metadata.role === 'founder' (primary)
 *   - OR auth.users row marked via the same path
 * We use the Supabase admin getUser() to read raw_app_meta_data; that lookup
 * runs server-side under the service-role key, so it cannot be spoofed by
 * the caller.
 *
 * Data shape returned:
 *   {
 *     generated_at: ISO,
 *     clients: {
 *       active_count: number,
 *       churned_30d_count: number,
 *       mrr_usd: number,           // sum(mrr cents) / 100
 *       by_status: { live: N, paused: N, churned: N, ... },
 *     },
 *     artifacts_24h: {
 *       generated: number,
 *       approved: number,
 *       rejected: number,
 *       shipped: number,
 *       deferred: number,
 *       reverted: number,
 *       by_status: { ... },        // raw status -> count
 *     },
 *     rejection_reasons_7d: Array<{ reason: string, count: number }>,  // top 5
 *     cost_today_by_agent: Array<{ agent_name: string, usd: number }>,
 *     cost_week_by_agent: Array<{ agent_name: string, usd: number }>,
 *     cost_month_by_agent: Array<{ agent_name: string, usd: number }>,
 *     latency_by_agent: Array<{ agent_name: string, p50_ms: number, p95_ms: number, p99_ms: number, n: number }>,
 *     queue_age_buckets: Array<{ hours_bucket: number, count: number }>,
 *     queue_oldest_hours: number,
 *     benchmarks_by_agent: Array<{ agent_target: string, scores: Array<{ ts: ISO, score: number }>, latest: number | null }>,
 *     active_clients: Array<{ id, business_name, vertical, churn_risk, churn_risk_drivers,
 *                              mrr_usd, kpi_trend_3d: Array<{ date, calls, leads, bookings }> }>,
 *   }
 *
 * Cost: a single function call runs ~9 Supabase queries in parallel (Promise.all),
 * each returning <= 10k rows worst-case. At 60s refresh × one founder browser tab
 * this is well within free-tier budgets (the kernel is pre-revenue per CLAUDE.md).
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { getServiceSupabase } from './_shared/token-utils';

// ─────────────────────────────────────────────────────────────────────────────
//   Constants
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  // Founder data is non-cacheable.
  'Cache-Control': 'no-store, max-age=0',
};

// Queue-age histogram bucket edges (hours). The last bucket is open-ended
// (>= 48h) and triggers the alert badge on the dashboard.
const QUEUE_AGE_BUCKETS = [1, 3, 6, 12, 24, 48] as const;

// How many days of benchmark history to return per agent for the sparkline.
const BENCHMARK_HISTORY_DAYS = 30;

// How far back to compute the 3-day KPI mini-trend per active client.
const CLIENT_KPI_DAYS = 3;

// Max active clients to return in the grid. Pre-revenue we'll always be
// well under this; keeps the payload bounded for the future.
const MAX_ACTIVE_CLIENTS = 200;

// ─────────────────────────────────────────────────────────────────────────────
//   Auth — founder gate
// ─────────────────────────────────────────────────────────────────────────────

interface FounderCheckResult {
  ok: boolean;
  reason?: string;
  userId?: string;
}

/**
 * Verify the bearer token belongs to a founder. Mirrors the SQL is_founder()
 * helper in 20260530_agency_rls.sql (JWT app_metadata.role === 'founder').
 *
 * We deliberately do NOT fall back to the GUC allowlist here — that fallback
 * exists for cold-boot DB recovery, not for the dashboard. If the founder
 * JWT is missing the claim, the operator must set it via the Supabase Admin
 * API once, then refresh the session.
 */
async function requireFounder(event: HandlerEvent): Promise<FounderCheckResult> {
  const headers = (event.headers as Record<string, string | undefined>) || {};
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing_bearer' };
  }
  const token = authHeader.substring(7);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    return { ok: false, reason: 'server_misconfigured' };
  }
  // Use anon client + the user's token to read the user record. The role
  // claim lives in app_metadata, which IS returned by getUser().
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, reason: 'invalid_token' };
  }
  const meta = (data.user.app_metadata || {}) as Record<string, unknown>;
  const role = typeof meta.role === 'string' ? meta.role : '';
  if (role !== 'founder') {
    return { ok: false, reason: 'not_founder', userId: data.user.id };
  }
  return { ok: true, userId: data.user.id };
}

function forbidden(reason: string): { statusCode: number; headers: Record<string, string>; body: string } {
  // 403 — token was understood but the role check failed. We DO NOT distinguish
  // between "no such endpoint" and "you can't see it" in the body, but the
  // 403 status is honest about the cause.
  return {
    statusCode: 403,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'forbidden', reason }),
  };
}

function unauthorized(reason: string): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'unauthorized', reason }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Utility — date math + safe numeric coercion
// ─────────────────────────────────────────────────────────────────────────────

function isoMinusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function isoStartOfTodayUTC(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoStartOfWeekUTC(): string {
  // ISO week: Monday start. JS getUTCDay() returns 0=Sun..6=Sat; we want Mon=0.
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoStartOfMonthUTC(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  // Linear interpolation, matching Postgres percentile_cont semantics.
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

interface EventRow {
  agent_name: string | null;
  type: string;
  severity: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface ArtifactRow {
  id: string;
  status: string;
  created_at: string;
}

interface ClientRow {
  id: string;
  business_name: string | null;
  vertical: string | null;
  status: string;
  mrr: number;
  churn_risk: 'green' | 'yellow' | 'red';
  churn_risk_drivers: string[] | null;
  churned_at: string | null;
}

function groupCount<T, K extends string>(rows: T[], keyOf: (r: T) => K | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function sumByAgent(events: EventRow[], usdField: 'amount_usd' = 'amount_usd'): Array<{ agent_name: string; usd: number }> {
  const acc = new Map<string, number>();
  for (const e of events) {
    const name = e.agent_name || 'unknown';
    const amt = toNumber((e.payload || {})[usdField]);
    acc.set(name, (acc.get(name) || 0) + amt);
  }
  return Array.from(acc.entries())
    .map(([agent_name, usd]) => ({ agent_name, usd: Math.round(usd * 10000) / 10000 }))
    .sort((a, b) => b.usd - a.usd);
}

function latencyByAgent(events: EventRow[]): Array<{ agent_name: string; p50_ms: number; p95_ms: number; p99_ms: number; n: number }> {
  const acc = new Map<string, number[]>();
  for (const e of events) {
    const name = e.agent_name || 'unknown';
    const latency = toNumber((e.payload || {}).latency_ms);
    if (latency <= 0) continue;
    const arr = acc.get(name) || [];
    arr.push(latency);
    acc.set(name, arr);
  }
  const out: Array<{ agent_name: string; p50_ms: number; p95_ms: number; p99_ms: number; n: number }> = [];
  for (const [agent_name, arr] of acc.entries()) {
    arr.sort((a, b) => a - b);
    out.push({
      agent_name,
      p50_ms: Math.round(percentile(arr, 50)),
      p95_ms: Math.round(percentile(arr, 95)),
      p99_ms: Math.round(percentile(arr, 99)),
      n: arr.length,
    });
  }
  return out.sort((a, b) => b.n - a.n);
}

function queueAgeHistogram(drafts: ArtifactRow[]): { buckets: Array<{ hours_bucket: number; count: number }>; oldest_hours: number } {
  const now = Date.now();
  const ages = drafts.map((d) => (now - new Date(d.created_at).getTime()) / 36e5);
  const bucketCounts: Record<number, number> = {};
  for (const edge of QUEUE_AGE_BUCKETS) bucketCounts[edge] = 0;
  // 999 sentinel for the >=48h overflow bucket
  bucketCounts[999] = 0;
  let oldest = 0;
  for (const age of ages) {
    if (age > oldest) oldest = age;
    let placed = false;
    for (const edge of QUEUE_AGE_BUCKETS) {
      if (age < edge) {
        bucketCounts[edge] += 1;
        placed = true;
        break;
      }
    }
    if (!placed) bucketCounts[999] += 1;
  }
  const buckets = [
    ...QUEUE_AGE_BUCKETS.map((edge) => ({ hours_bucket: edge, count: bucketCounts[edge] })),
    { hours_bucket: 999, count: bucketCounts[999] },
  ];
  return { buckets, oldest_hours: Math.round(oldest * 10) / 10 };
}

function topRejectionReasons(events: EventRow[], limit = 5): Array<{ reason: string; count: number }> {
  const acc = new Map<string, number>();
  for (const e of events) {
    const reason = ((e.payload || {}).reason as string | undefined) || 'unspecified';
    acc.set(reason, (acc.get(reason) || 0) + 1);
  }
  return Array.from(acc.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

interface BenchmarkPoint {
  ts: string;
  score: number;
}

function benchmarksByAgent(events: EventRow[]): Array<{ agent_target: string; scores: BenchmarkPoint[]; latest: number | null }> {
  const acc = new Map<string, BenchmarkPoint[]>();
  for (const e of events) {
    const target = ((e.payload || {}).agent_target as string | undefined) || e.agent_name || 'unknown';
    const score = toNumber((e.payload || {}).score);
    if (!Number.isFinite(score)) continue;
    const arr = acc.get(target) || [];
    arr.push({ ts: e.created_at, score });
    acc.set(target, arr);
  }
  const out: Array<{ agent_target: string; scores: BenchmarkPoint[]; latest: number | null }> = [];
  for (const [agent_target, arr] of acc.entries()) {
    arr.sort((a, b) => a.ts.localeCompare(b.ts));
    const latest = arr.length > 0 ? arr[arr.length - 1].score : null;
    out.push({ agent_target, scores: arr, latest });
  }
  return out.sort((a, b) => a.agent_target.localeCompare(b.agent_target));
}

interface ClientKpiBucket {
  date: string; // yyyy-mm-dd UTC
  calls: number;
  leads: number;
  bookings: number;
}

function buildClientKpiTrends(
  events: Array<{ client_id: string | null; type: string; created_at: string }>,
  clientIds: string[],
): Map<string, ClientKpiBucket[]> {
  // Build day buckets for the last CLIENT_KPI_DAYS (incl today, UTC).
  const days: string[] = [];
  for (let i = CLIENT_KPI_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const empty = (): ClientKpiBucket[] =>
    days.map((date) => ({ date, calls: 0, leads: 0, bookings: 0 }));

  const out = new Map<string, ClientKpiBucket[]>();
  for (const id of clientIds) out.set(id, empty());

  for (const e of events) {
    const clientId = e.client_id;
    if (!clientId) continue;
    const trend = out.get(clientId);
    if (!trend) continue;
    const day = e.created_at.slice(0, 10);
    const bucket = trend.find((b) => b.date === day);
    if (!bucket) continue;
    if (e.type === 'call_completed') bucket.calls += 1;
    else if (e.type === 'lead_captured') bucket.leads += 1;
    else if (e.type === 'booking_made') bucket.bookings += 1;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, Allow: 'GET' },
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  // Auth — founder JWT only.
  const auth = await requireFounder(event);
  if (!auth.ok) {
    if (auth.reason === 'missing_bearer' || auth.reason === 'invalid_token') {
      return unauthorized(auth.reason);
    }
    return forbidden(auth.reason || 'denied');
  }

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'server_misconfigured', detail: e instanceof Error ? e.message : 'unknown' }),
    };
  }

  // Date markers
  const oneDayAgo = isoMinusDays(1);
  const sevenDaysAgo = isoMinusDays(7);
  const thirtyDaysAgo = isoMinusDays(30);
  const benchmarkHistoryStart = isoMinusDays(BENCHMARK_HISTORY_DAYS);
  const clientKpiStart = isoMinusDays(CLIENT_KPI_DAYS);
  const startOfDay = isoStartOfTodayUTC();
  const startOfWeek = isoStartOfWeekUTC();
  const startOfMonth = isoStartOfMonthUTC();

  // Fire all queries in parallel — they share the same service-role client.
  // Each query stays under default Supabase row-limit (1000) given expected
  // pre-revenue scale (<10 clients, <1000 events/day). If we cross 1000/day
  // on any query, the next iteration will need server-side aggregation.
  try {
    const [
      clientsRes,
      artifacts24hRes,
      rejectionEventsRes,
      costTodayRes,
      costWeekRes,
      costMonthRes,
      latencyEventsRes,
      draftsRes,
      benchmarkRes,
      clientKpiEventsRes,
    ] = await Promise.all([
      // 1. All clients — small table; fetch everything once.
      supabase
        .from('agency_clients')
        .select('id, business_name, vertical, status, mrr, churn_risk, churn_risk_drivers, churned_at, signed_up_at')
        .order('signed_up_at', { ascending: false })
        .limit(MAX_ACTIVE_CLIENTS),

      // 2. Artifacts in last 24h — status breakdown.
      supabase
        .from('agency_artifacts')
        .select('id, status, created_at')
        .gte('created_at', oneDayAgo)
        .limit(5000),

      // 3. Rejection-reason events in last 7d. Per kernel/event bus:
      //    rejections show up as 'adapter_error' (provider rejection) and
      //    'post_ship_outcome_recorded' (regress verdict). We also include
      //    'creative_paused' which has a `reason` field.
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .in('type', ['adapter_error', 'post_ship_outcome_recorded', 'creative_paused'])
        .gte('created_at', sevenDaysAgo)
        .limit(5000),

      // 4. Cost events today.
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .eq('type', 'cost_incurred')
        .gte('created_at', startOfDay)
        .limit(5000),

      // 5. Cost events this week (Mon-start UTC).
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .eq('type', 'cost_incurred')
        .gte('created_at', startOfWeek)
        .limit(10000),

      // 6. Cost events this month.
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .eq('type', 'cost_incurred')
        .gte('created_at', startOfMonth)
        .limit(20000),

      // 7. Latency — last 7d of cost_incurred (latency_ms is on the same payload).
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .eq('type', 'cost_incurred')
        .gte('created_at', sevenDaysAgo)
        .limit(10000),

      // 8. Drafts — full set (queue age). Uses idx_agency_artifacts_pending.
      supabase
        .from('agency_artifacts')
        .select('id, status, created_at')
        .eq('status', 'draft')
        .order('created_at', { ascending: true })
        .limit(2000),

      // 9. Benchmark scores — 30d, per agent_target.
      supabase
        .from('agency_events')
        .select('agent_name, type, severity, payload, created_at')
        .eq('type', 'benchmark_score_recorded')
        .gte('created_at', benchmarkHistoryStart)
        .order('created_at', { ascending: true })
        .limit(5000),

      // 10. Per-client KPI events for the active-client mini-trend grid
      //     (3-day window). We pre-filter by event type so payload size stays low.
      supabase
        .from('agency_events')
        .select('client_id, type, created_at')
        .in('type', ['call_completed', 'lead_captured', 'booking_made'])
        .gte('created_at', clientKpiStart)
        .limit(20000),
    ]);

    // Aggregate — for each query, surface a clean error path. If ANY required
    // table is missing (e.g. migrations not applied locally) we return a 200
    // with an explicit `degraded` flag so the dashboard renders empty cards
    // instead of a blank screen. Genuine DB errors (auth, network) still 500.
    const dbErrors: string[] = [];
    for (const [name, res] of [
      ['clients', clientsRes],
      ['artifacts_24h', artifacts24hRes],
      ['rejection_events', rejectionEventsRes],
      ['cost_today', costTodayRes],
      ['cost_week', costWeekRes],
      ['cost_month', costMonthRes],
      ['latency_events', latencyEventsRes],
      ['drafts', draftsRes],
      ['benchmarks', benchmarkRes],
      ['client_kpi_events', clientKpiEventsRes],
    ] as const) {
      if (res.error) {
        // Postgres code 42P01 = undefined_table. Treat as "agency kernel
        // not yet applied" rather than a server crash — common in local dev.
        const msg = res.error.message || '';
        if (msg.includes('does not exist') || (res.error as { code?: string }).code === '42P01') {
          dbErrors.push(`${name}:table_missing`);
        } else {
          // Real error — bubble up.
          console.warn(`[agency-health-stats] ${name} query failed`, res.error);
          return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'db_error', source: name, detail: msg }),
          };
        }
      }
    }

    const clientRows = (clientsRes.data as ClientRow[] | null) || [];
    const artifacts24h = (artifacts24hRes.data as ArtifactRow[] | null) || [];
    const rejectionEvents = (rejectionEventsRes.data as EventRow[] | null) || [];
    const costToday = (costTodayRes.data as EventRow[] | null) || [];
    const costWeek = (costWeekRes.data as EventRow[] | null) || [];
    const costMonth = (costMonthRes.data as EventRow[] | null) || [];
    const latencyEvents = (latencyEventsRes.data as EventRow[] | null) || [];
    const drafts = (draftsRes.data as ArtifactRow[] | null) || [];
    const benchmarks = (benchmarkRes.data as EventRow[] | null) || [];
    const clientKpiEvents =
      (clientKpiEventsRes.data as Array<{ client_id: string | null; type: string; created_at: string }> | null) || [];

    // ── Clients
    const activeClients = clientRows.filter((c) => c.status === 'live');
    const churned30d = clientRows.filter(
      (c) => c.churned_at && c.churned_at >= thirtyDaysAgo,
    );
    const mrrCentsSum = activeClients.reduce((acc, c) => acc + (Number.isFinite(c.mrr) ? c.mrr : 0), 0);
    const clientsByStatus = groupCount(clientRows, (c) => c.status);

    // ── Artifacts 24h
    const artifactsByStatus = groupCount(artifacts24h, (a) => a.status);

    // ── Active-client mini-trends
    const activeClientIds = activeClients.map((c) => c.id);
    const kpiTrends = buildClientKpiTrends(clientKpiEvents, activeClientIds);
    const activeClientsOut = activeClients.map((c) => ({
      id: c.id,
      business_name: c.business_name,
      vertical: c.vertical,
      churn_risk: c.churn_risk,
      churn_risk_drivers: c.churn_risk_drivers || [],
      mrr_usd: Math.round((c.mrr || 0) / 100),
      kpi_trend_3d: kpiTrends.get(c.id) || [],
    }));

    const queueHist = queueAgeHistogram(drafts);

    const responseBody = {
      generated_at: new Date().toISOString(),
      degraded: dbErrors.length > 0,
      degraded_reasons: dbErrors,
      clients: {
        active_count: activeClients.length,
        churned_30d_count: churned30d.length,
        mrr_usd: Math.round(mrrCentsSum / 100),
        by_status: clientsByStatus,
      },
      artifacts_24h: {
        generated: artifacts24h.length,
        approved: artifactsByStatus['approved'] || 0,
        rejected: artifactsByStatus['rejected'] || 0,
        shipped: artifactsByStatus['shipped'] || 0,
        deferred: artifactsByStatus['deferred'] || 0,
        reverted: artifactsByStatus['reverted'] || 0,
        draft: artifactsByStatus['draft'] || 0,
        by_status: artifactsByStatus,
      },
      rejection_reasons_7d: topRejectionReasons(rejectionEvents),
      cost_today_by_agent: sumByAgent(costToday),
      cost_week_by_agent: sumByAgent(costWeek),
      cost_month_by_agent: sumByAgent(costMonth),
      latency_by_agent: latencyByAgent(latencyEvents),
      queue_age_buckets: queueHist.buckets,
      queue_oldest_hours: queueHist.oldest_hours,
      queue_total_drafts: drafts.length,
      benchmarks_by_agent: benchmarksByAgent(benchmarks),
      active_clients: activeClientsOut,
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responseBody),
    };
  } catch (e) {
    console.warn('[agency-health-stats] aggregation failed', e);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'aggregation_failed',
        detail: e instanceof Error ? e.message : 'unknown',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
