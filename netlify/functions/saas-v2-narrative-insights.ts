import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';

import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-narrative-insights — GET endpoint.
 *
 * Returns 4–6 plain-English narrative insight cards for the V2 Analytics page,
 * derived from the workspace's last 14 days of metrics. Each insight is anchored
 * to a 14-point sparkline + an inline anomaly score (z-score over a rolling
 * baseline). One Sonnet (heavy-tier) LLM call produces the final cards.
 *
 *  • Auth — `Authorization: Bearer <jwt>` (Supabase session). The function
 *    derives `user_id` via `auth.getUser(token)` and resolves the workspace by
 *    `user_id = userId`. workspace_id is NEVER taken from the request.
 *  • Cold-start — if the workspace has <30 calls or <14 days of data, returns
 *    `{ insights: [], cold_start: true, reason }` (200, not 500).
 *  • Event — emits `saas_v2_narrative_rendered` to `agency_events` /
 *    `aios_event_log` (best-effort, never throws).
 */

const COLD_START_MIN_CALLS = 30;
const COLD_START_MIN_DAYS = 14;
const LOOKBACK_DAYS = 14;

interface NarrativeInsight {
  id: string;
  headline: string;
  body: string;
  sparkline_data: Array<{ x: string; y: number }>;
  anomaly_score?: number;
  direction?: 'up' | 'down' | 'flat';
}

interface DailyMetricRow {
  date: string;
  calls?: number;
  leads?: number;
  bookings?: number;
  sms_sent?: number;
  success_rate?: number;
  avg_call_duration?: number;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                              */
/* ------------------------------------------------------------------ */

async function resolveWorkspace(
  authHeader: string | undefined,
): Promise<
  | { ok: true; userId: string; workspaceId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Missing Authorization header' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Missing bearer token' };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }
  const userId = userResult.user.id;

  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (wsErr || !workspace?.id) {
    return { ok: false, status: 404, error: 'No workspace found for user' };
  }

  return { ok: true, userId, workspaceId: workspace.id as string };
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                     */
/* ------------------------------------------------------------------ */

interface MetricsSnapshot {
  metrics: DailyMetricRow[];
  callsTotal: number;
  leadsTotal: number;
  bookingsTotal: number;
  daysOfData: number;
  callbacksTotal: number;
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function fetchMetricsSnapshot(userId: string): Promise<MetricsSnapshot> {
  const supa = getServiceSupabase();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - LOOKBACK_DAYS);

  const [{ data: metricsRows }, { data: callbacks }, { data: callLogs }] = await Promise.all([
    supa
      .from('daily_metrics')
      .select('date, calls, leads, bookings, sms_sent, success_rate, avg_call_duration')
      .eq('user_id', userId)
      .gte('date', dateKey(start))
      .lte('date', dateKey(end))
      .order('date', { ascending: true }),
    supa
      .from('callbacks')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', dateKey(start))
      .lte('created_at', `${dateKey(end)}T23:59:59`),
    supa
      .from('call_logs')
      .select('id, created_at, duration_seconds')
      .eq('user_id', userId)
      .gte('created_at', dateKey(start))
      .lte('created_at', `${dateKey(end)}T23:59:59`),
  ]);

  const metrics = (metricsRows || []) as DailyMetricRow[];
  const callbacksTotal = (callbacks || []).length;
  const callsTotalFromLogs = (callLogs || []).length;

  const callsTotal =
    metrics.reduce((s, r) => s + (Number(r.calls) || 0), 0) || callsTotalFromLogs;
  const leadsTotal =
    metrics.reduce((s, r) => s + (Number(r.leads) || 0), 0) || callbacksTotal;
  const bookingsTotal = metrics.reduce((s, r) => s + (Number(r.bookings) || 0), 0);
  const daysOfData = metrics.length || (callsTotalFromLogs > 0 ? 1 : 0);

  return {
    metrics,
    callsTotal,
    leadsTotal,
    bookingsTotal,
    daysOfData,
    callbacksTotal,
  };
}

/* ------------------------------------------------------------------ */
/*  Anomaly detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Compute z-score of the latest value vs. the rolling baseline (all prior days).
 * Returns absolute z-score; direction is signed.
 */
function zScoreLatest(values: number[]): { score: number; direction: 'up' | 'down' | 'flat' } {
  if (values.length < 3) return { score: 0, direction: 'flat' };
  const latest = values[values.length - 1];
  const baseline = values.slice(0, -1);
  const mean = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const variance =
    baseline.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, baseline.length - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0) {
    return { score: 0, direction: latest === mean ? 'flat' : latest > mean ? 'up' : 'down' };
  }
  const z = (latest - mean) / stdev;
  return {
    score: Math.round(Math.abs(z) * 100) / 100,
    direction: z > 0.5 ? 'up' : z < -0.5 ? 'down' : 'flat',
  };
}

interface SeriesSummary {
  field: 'calls' | 'leads' | 'bookings' | 'sms_sent' | 'success_rate';
  label: string;
  total: number;
  latest: number;
  anomaly_score: number;
  direction: 'up' | 'down' | 'flat';
  spark: Array<{ x: string; y: number }>;
}

function buildSeries(metrics: DailyMetricRow[]): SeriesSummary[] {
  const fields: Array<{ field: SeriesSummary['field']; label: string }> = [
    { field: 'calls', label: 'Calls' },
    { field: 'leads', label: 'Leads' },
    { field: 'bookings', label: 'Bookings' },
    { field: 'sms_sent', label: 'SMS sent' },
    { field: 'success_rate', label: 'Success rate' },
  ];

  return fields.map(({ field, label }) => {
    const spark = metrics.map((m) => ({
      x: m.date,
      y: Number(m[field] || 0),
    }));
    const values = spark.map((p) => p.y);
    const z = zScoreLatest(values);
    return {
      field,
      label,
      total: values.reduce((s, v) => s + v, 0),
      latest: values.length > 0 ? values[values.length - 1] : 0,
      anomaly_score: z.score,
      direction: z.direction,
      spark,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  LLM narrative generation                                          */
/* ------------------------------------------------------------------ */

const NARRATIVE_SYSTEM_PROMPT = `You write plain-English narrative analytics insights for small-business owners (plumbers, dentists, law firms, HVAC). Your one job: take the structured 14-day metrics and produce 4-6 short insight cards.

RULES:
- Each headline is 6-10 words. Lead with the concrete number or change.
- Each body is 1-2 sentences. No jargon (no "CTR", "conversion rate", "funnel"). No hedges ("appears to", "may indicate"). No passive voice ("was missed"). No agency vocabulary ("leveraging", "synergies").
- If a percentage is mentioned, also give the absolute number.
- If a series has anomaly_score >= 1.5, call it out explicitly ("biggest jump", "sharp drop", etc.).
- Otherwise describe the trend in everyday language ("steady", "creeping up", "flat").
- Tone: a smart friend explaining their numbers over coffee.

OUTPUT FORMAT — return ONLY a JSON object (no markdown fences):
{
  "insights": [
    {
      "id": "insights-1",
      "field": "calls",
      "headline": "Calls jumped 38% this week",
      "body": "You handled 47 calls vs 34 last week — biggest single-week jump in the last month. Most landed Tuesday afternoon."
    }
  ]
}

Use the "field" value from the input so the caller can attach the matching sparkline. Choose 4-6 most interesting fields; do NOT include all 5 if some are noise.`;

interface LlmInsight {
  id?: string;
  field?: string;
  headline?: string;
  body?: string;
}

function tryParseJson(raw: string): { insights: LlmInsight[] } | null {
  if (!raw) return null;
  // Strip code fences if present
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.insights)) return parsed as { insights: LlmInsight[] };
    return null;
  } catch {
    return null;
  }
}

async function generateNarrative(
  series: SeriesSummary[],
  snapshot: MetricsSnapshot,
): Promise<NarrativeInsight[]> {
  const userPrompt = JSON.stringify(
    {
      lookback_days: LOOKBACK_DAYS,
      totals: {
        calls: snapshot.callsTotal,
        leads: snapshot.leadsTotal,
        bookings: snapshot.bookingsTotal,
      },
      series: series.map((s) => ({
        field: s.field,
        label: s.label,
        total: s.total,
        latest: s.latest,
        anomaly_score: s.anomaly_score,
        direction: s.direction,
        last_14_values: s.spark.map((p) => p.y),
      })),
    },
    null,
    2,
  );

  let raw = '';
  try {
    raw = await chatCompletion(NARRATIVE_SYSTEM_PROMPT, userPrompt, {
      tier: 'heavy',
      maxTokens: 900,
    });
  } catch (err) {
    console.warn('[saas-v2-narrative-insights] LLM call failed:', err);
    return [];
  }

  const parsed = tryParseJson(raw);
  if (!parsed) {
    console.warn('[saas-v2-narrative-insights] Failed to parse LLM JSON:', raw.slice(0, 200));
    return [];
  }

  const seriesByField = new Map(series.map((s) => [s.field, s]));

  return parsed.insights
    .slice(0, 6)
    .map((ins, idx): NarrativeInsight | null => {
      const field = (ins.field || '').toLowerCase() as SeriesSummary['field'];
      const match = seriesByField.get(field);
      if (!ins.headline || !ins.body) return null;
      return {
        id: ins.id || `v2-insight-${idx + 1}`,
        headline: ins.headline.trim(),
        body: ins.body.trim(),
        sparkline_data: match ? match.spark : [],
        anomaly_score: match?.anomaly_score,
        direction: match?.direction,
      };
    })
    .filter((x): x is NarrativeInsight => x !== null);
}

/* ------------------------------------------------------------------ */
/*  Event emission (best-effort)                                      */
/* ------------------------------------------------------------------ */

async function emitNarrativeRendered(
  workspaceId: string,
  insightsCount: number,
  coldStart: boolean,
): Promise<void> {
  const supa = getServiceSupabase();
  const payload = {
    workspace_id: workspaceId,
    page: 'analytics',
    narrative_chars: 0,
    tier: 'sonnet' as const,
    cache_hit: false,
    insights_count: insightsCount,
    cold_start: coldStart,
  };

  // Try canonical aios_event_log first (per global CLAUDE.md guidance).
  try {
    await supa.from('aios_event_log').insert({
      event_type: 'saas_v2_narrative_rendered',
      workspace_id: workspaceId,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* table may not exist yet — silent */
  }

  // Best-effort agency_events emit (matches the future emit-agency-event API).
  try {
    await supa.from('agency_events').insert({
      client_id: workspaceId,
      agent_name: 'saas-v2-narrative-insights',
      type: 'saas_v2_narrative_rendered',
      severity: 'info',
      payload,
      why_explanation: 'V2 Analytics narrative cards rendered',
    });
  } catch {
    /* table may not exist yet — silent */
  }
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export const handler: Handler = async (event) => {
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

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authResult = await resolveWorkspace(authHeader);
  if (authResult.ok !== true) {
    return {
      statusCode: authResult.status,
      headers: cors,
      body: JSON.stringify({ error: authResult.error }),
    };
  }

  const userId = authResult.userId;
  const workspaceId = authResult.workspaceId;
  const generatedAt = new Date().toISOString();

  let snapshot: MetricsSnapshot;
  try {
    snapshot = await fetchMetricsSnapshot(userId);
  } catch (err) {
    console.error('[saas-v2-narrative-insights] metrics fetch failed:', err);
    // Fall back to cold-start rather than 500 — UI handles empty gracefully.
    await emitNarrativeRendered(workspaceId, 0, true).catch(() => {});
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        insights: [],
        generated_at: generatedAt,
        cold_start: true,
        reason: 'Could not load metrics yet — try again in a few minutes.',
      }),
    };
  }

  // Cold-start guard
  if (snapshot.callsTotal < COLD_START_MIN_CALLS || snapshot.daysOfData < COLD_START_MIN_DAYS) {
    await emitNarrativeRendered(workspaceId, 0, true).catch(() => {});
    const need = Math.max(0, COLD_START_MIN_CALLS - snapshot.callsTotal);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        insights: [],
        generated_at: generatedAt,
        cold_start: true,
        reason:
          need > 0
            ? `Insights unlock at 30 calls — ${need} more to go.`
            : 'Insights unlock after 14 days of data.',
      }),
    };
  }

  const series = buildSeries(snapshot.metrics);
  const insights = await generateNarrative(series, snapshot);

  await emitNarrativeRendered(workspaceId, insights.length, false).catch(() => {});

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      insights,
      generated_at: generatedAt,
    }),
  };
};
