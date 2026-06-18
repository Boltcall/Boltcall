import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-insights.ts — Boltcall Agency OS · Layer 7 · Client portal
 * ────────────────────────────────────────────────────────────────────────
 *
 * GET endpoint backing `/client/insights`. Returns narrative analytics:
 *   - pipeline_forecast        — next-7-days pipeline value extrapolation
 *                                from last 14 days of booking_made events,
 *                                with linear regression + 80% confidence band.
 *   - vertical_benchmark       — comparison vs same-vertical baseline,
 *                                sourced from agency_knowledge entry
 *                                kind='vertical_benchmark' if available;
 *                                computed server-side fallback otherwise.
 *   - anomaly_timeline         — last 30d agency_events with type='anomaly_detected'
 *                                joined to their resolution status (fixed |
 *                                monitoring | ignored) via the linked
 *                                prompt_revision / knowledge_base artifact.
 *   - trends                   — 30d sparkline for booking_rate, response_time,
 *                                lead_volume, ad_cpl (last = Bolt System only).
 *   - narrative_readings       — AI-generated one-sentence reading for every
 *                                chart, batched in a single Sonnet call so the
 *                                whole page renders with $0.02–0.04 of LLM cost.
 *
 * Auth model: same as agency-client-calls.ts — Bearer JWT, resolved to
 * client_id from auth.uid(). No founder gate.
 *
 * Caching: narrative_readings are stamped on a per-day key into
 * agency_artifacts(type='chart_reading') the FIRST time a client opens
 * the page that day, then served from the artifact on subsequent loads.
 * That matches the design-principles requirement that readings stay
 * stable across reloads (a stable chart with a shifting narrative
 * underneath would feel haunted).
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import {
  callClaude,
  type JsonSchemaObject,
} from './_shared/agency-agents/run-agent';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const TREND_DAYS = 30;
const FORECAST_HORIZON_DAYS = 7;
const FORECAST_LOOKBACK_DAYS = 14;
const ANOMALY_LOOKBACK_DAYS = 30;

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnyEvent {
  id: string;
  type: string;
  severity: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  why_explanation: string | null;
}

interface Sparkline {
  metric: string;
  unit: string;
  days: string[]; // ISO date strings
  values: number[];
  current: number;
  prior: number;
  delta_pct: number; // current vs prior period (same length window)
}

interface AnomalyTimelineEntry {
  event_id: string;
  detected_at: string;
  kind: string;
  severity: string;
  summary: string;
  resolution_status: 'fixed' | 'monitoring' | 'ignored' | 'pending';
  resolution_at: string | null;
  resolution_artifact_id: string | null;
}

interface PipelineForecast {
  history_days: number;
  horizon_days: number;
  history: Array<{ date: string; pipeline_value_usd: number; bookings: number }>;
  forecast: Array<{
    date: string;
    pipeline_value_usd: number;
    lower_80: number;
    upper_80: number;
  }>;
  slope_per_day: number;
}

interface VerticalBenchmark {
  vertical: string;
  source: 'agency_knowledge' | 'computed_default';
  metrics: Array<{
    metric: string;
    you: number;
    vertical_median: number;
    top_quartile: number;
    unit: string;
    percentile_rank: number; // 0..100, where 100 = best in vertical
  }>;
}

interface NarrativeReadings {
  pipeline_forecast: string;
  vertical_benchmark: string;
  anomaly_timeline: string;
  trends: Record<string, string>; // metric_key -> reading
}

// ─── Handler ────────────────────────────────────────────────────────────────

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
      body: JSON.stringify({ error: 'Unauthorized' }),
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

  const { data: clientRow } = await supa
    .from('agency_clients')
    .select('id, business_name, vertical, sku')
    .eq('user_id', uid)
    .not('status', 'in', '("churned","paused")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!clientRow) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'No active agency client' }),
    };
  }
  const client_id = clientRow.id as string;
  const vertical = (clientRow.vertical as string | null) || 'other';
  const sku = (clientRow as { sku?: string }).sku || 'bolt-receptionist';
  const has_ads = sku === 'bolt-system';

  // ── 1. Pull events for the metric windows ──────────────────────────
  const sinceTrend = isoDaysAgo(TREND_DAYS * 2); // need 2x for prior-period delta
  const sinceAnomaly = isoDaysAgo(ANOMALY_LOOKBACK_DAYS);

  const eventTypes = [
    'call_completed',
    'lead_captured',
    'booking_made',
    'anomaly_detected',
    'prompt_revised',
    'kb_updated',
  ];

  const { data: eventRows } = await supa
    .from('agency_events')
    .select('id, type, severity, created_at, payload, why_explanation')
    .eq('client_id', client_id)
    .in('type', eventTypes)
    .gte('created_at', sinceTrend)
    .order('created_at', { ascending: true })
    .limit(5000);

  const events = ((eventRows ?? []) as unknown as AnyEvent[]) || [];

  // ── 2. Compute trends ──────────────────────────────────────────────
  const trends: Sparkline[] = [
    buildResponseTimeTrend(events),
    buildBookingRateTrend(events),
    buildLeadVolumeTrend(events),
  ];
  if (has_ads) {
    trends.push(buildAdCplTrend(events));
  }

  // ── 3. Compute pipeline forecast ───────────────────────────────────
  const forecast = buildPipelineForecast({
    events,
    vertical,
  });

  // ── 4. Vertical benchmark — try cached, fall back to computed ──────
  let benchmark = await loadVerticalBenchmark({
    supa,
    client_id,
    vertical,
    trends,
  });
  if (!benchmark) {
    benchmark = computeDefaultBenchmark({ vertical, trends });
  }

  // ── 5. Anomaly timeline ────────────────────────────────────────────
  const anomalyEvents = events
    .filter((e) => e.type === 'anomaly_detected' && e.created_at >= sinceAnomaly)
    .reverse(); // newest first

  // Find the closest revision/kb_update that happened AFTER each anomaly —
  // that's our heuristic for "fix shipped" resolution status.
  const fixCandidates = events
    .filter((e) => e.type === 'prompt_revised' || e.type === 'kb_updated')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const anomaly_timeline: AnomalyTimelineEntry[] = anomalyEvents.map((a) =>
    buildAnomalyEntry(a, fixCandidates),
  );

  // ── 6. Narrative readings (cached per day) ─────────────────────────
  const today = isoToday();
  const narrativeKey = `client-insights-readings:${today}`;
  const cached = await loadCachedReadings({ supa, client_id, key: narrativeKey });

  let narrative: NarrativeReadings;
  if (cached) {
    narrative = cached;
  } else {
    narrative = await generateReadings({
      vertical,
      business_name: (clientRow.business_name as string) || 'your business',
      trends,
      forecast,
      benchmark,
      anomaly_timeline,
      has_ads,
      client_id,
    });
    // Best-effort cache write
    await persistReadings({ supa, client_id, key: narrativeKey, readings: narrative });
  }

  // ── 7. Whitelisted response ────────────────────────────────────────
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      client: {
        id: client_id,
        business_name: clientRow.business_name,
        vertical,
        has_ads,
      },
      pipeline_forecast: forecast,
      vertical_benchmark: benchmark,
      anomaly_timeline,
      trends,
      narrative_readings: narrative,
    }),
  };
};

// ─── Trends ─────────────────────────────────────────────────────────────────

function buildResponseTimeTrend(events: AnyEvent[]): Sparkline {
  // response time = duration_seconds on call_completed.payload, averaged per day.
  // Lower is better (faster response means agent picked up + processed fast).
  // We approximate with avg time_to_first_word from payload when present;
  // fall back to a heuristic from duration if not (longer calls = generally
  // slower flow).
  return bucketByDayAvg(
    events,
    'call_completed',
    (p) => {
      const v = numberFrom(p, 'time_to_first_word_ms');
      if (v != null) return v / 1000;
      const dur = numberFrom(p, 'duration_seconds');
      if (dur != null) return Math.min(dur / 60, 10); // capped proxy
      return null;
    },
    { metric: 'response_time', unit: 'seconds' },
  );
}

function buildBookingRateTrend(events: AnyEvent[]): Sparkline {
  // Per-day booking_made count / call_completed count.
  const byDay = new Map<string, { calls: number; bookings: number }>();
  for (const e of events) {
    if (e.type !== 'call_completed' && e.type !== 'booking_made') continue;
    const d = e.created_at.slice(0, 10);
    const cur = byDay.get(d) || { calls: 0, bookings: 0 };
    if (e.type === 'call_completed') cur.calls += 1;
    if (e.type === 'booking_made') cur.bookings += 1;
    byDay.set(d, cur);
  }
  const days = lastNDays(TREND_DAYS);
  const values = days.map((d) => {
    const cur = byDay.get(d);
    if (!cur || cur.calls === 0) return 0;
    return Math.round((cur.bookings / cur.calls) * 1000) / 10; // pct, one decimal
  });
  return finalizeSparkline({ metric: 'booking_rate', unit: 'percent', days, values });
}

function buildLeadVolumeTrend(events: AnyEvent[]): Sparkline {
  return bucketByDayCount(
    events,
    'lead_captured',
    { metric: 'lead_volume', unit: 'leads' },
  );
}

function buildAdCplTrend(events: AnyEvent[]): Sparkline {
  // Approximate from cost_incurred events tagged provider=meta_ads.
  // If no such events exist (Bolt Receptionist accounts), values are 0.
  const byDay = new Map<string, { spend: number; leads: number }>();
  for (const e of events) {
    const p = e.payload || {};
    const provider = p['provider'];
    if (typeof provider === 'string' && provider !== 'meta_ads') continue;
    const d = e.created_at.slice(0, 10);
    const cur = byDay.get(d) || { spend: 0, leads: 0 };
    const amount = numberFrom(p, 'amount_usd');
    if (amount != null) cur.spend += amount;
    if (e.type === 'lead_captured') {
      const source = (p['source'] as string) || '';
      if (/meta|facebook|instagram/i.test(source)) cur.leads += 1;
    }
    byDay.set(d, cur);
  }
  const days = lastNDays(TREND_DAYS);
  const values = days.map((d) => {
    const cur = byDay.get(d);
    if (!cur || cur.leads === 0) return 0;
    return Math.round((cur.spend / cur.leads) * 100) / 100;
  });
  return finalizeSparkline({ metric: 'ad_cpl', unit: 'usd', days, values });
}

function bucketByDayAvg(
  events: AnyEvent[],
  type: string,
  extract: (payload: Record<string, unknown>) => number | null,
  meta: { metric: string; unit: string },
): Sparkline {
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const e of events) {
    if (e.type !== type) continue;
    const v = extract(e.payload || {});
    if (v == null) continue;
    const d = e.created_at.slice(0, 10);
    const cur = byDay.get(d) || { sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    byDay.set(d, cur);
  }
  const days = lastNDays(TREND_DAYS);
  const values = days.map((d) => {
    const cur = byDay.get(d);
    if (!cur || cur.n === 0) return 0;
    return Math.round((cur.sum / cur.n) * 100) / 100;
  });
  return finalizeSparkline({ ...meta, days, values });
}

function bucketByDayCount(
  events: AnyEvent[],
  type: string,
  meta: { metric: string; unit: string },
): Sparkline {
  const byDay = new Map<string, number>();
  for (const e of events) {
    if (e.type !== type) continue;
    const d = e.created_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) || 0) + 1);
  }
  const days = lastNDays(TREND_DAYS);
  const values = days.map((d) => byDay.get(d) || 0);
  return finalizeSparkline({ ...meta, days, values });
}

function finalizeSparkline(args: {
  metric: string;
  unit: string;
  days: string[];
  values: number[];
}): Sparkline {
  const { metric, unit, days, values } = args;
  // current = avg of last 7d, prior = avg of preceding 7d
  const n = values.length;
  const lastWindow = values.slice(Math.max(0, n - 7));
  const priorWindow = values.slice(Math.max(0, n - 14), Math.max(0, n - 7));
  const current = avg(lastWindow);
  const prior = avg(priorWindow);
  const delta_pct =
    prior === 0 ? 0 : Math.round(((current - prior) / prior) * 1000) / 10;
  return { metric, unit, days, values, current, prior, delta_pct };
}

// ─── Pipeline forecast (linear regression w/ residual-based CI) ─────────────

const VERTICAL_TICKET_USD: Record<string, number> = {
  med_spa: 450,
  dental: 380,
  legal: 1200,
  hvac: 320,
  plumbing: 290,
  electrical: 280,
  roofing: 8500,
  solar: 14_000,
  real_estate: 6500,
  auto: 250,
  fitness: 180,
  other: 350,
};

function buildPipelineForecast(args: {
  events: AnyEvent[];
  vertical: string;
}): PipelineForecast {
  const ticket = VERTICAL_TICKET_USD[args.vertical] ?? VERTICAL_TICKET_USD.other;
  const days = lastNDays(FORECAST_LOOKBACK_DAYS);
  const bookingsByDay = new Map<string, number>();
  for (const e of args.events) {
    if (e.type !== 'booking_made') continue;
    const d = e.created_at.slice(0, 10);
    bookingsByDay.set(d, (bookingsByDay.get(d) || 0) + 1);
  }
  const history = days.map((d) => {
    const bookings = bookingsByDay.get(d) || 0;
    return {
      date: d,
      bookings,
      pipeline_value_usd: bookings * ticket,
    };
  });

  // Linear regression on pipeline_value_usd over day-index
  const x = history.map((_, i) => i);
  const y = history.map((h) => h.pipeline_value_usd);
  const { slope, intercept } = linregress(x, y);
  // Residuals → std deviation → 80% CI ≈ 1.282σ
  const predicted = x.map((xi) => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - predicted[i]);
  const sigma =
    residuals.length > 1
      ? Math.sqrt(
          residuals.reduce((acc, r) => acc + r * r, 0) / (residuals.length - 1),
        )
      : 0;
  const ci = sigma * 1.282;

  const forecastDays = nextNDays(FORECAST_HORIZON_DAYS);
  const forecast = forecastDays.map((d, k) => {
    const xi = history.length + k;
    const mean = Math.max(0, intercept + slope * xi);
    return {
      date: d,
      pipeline_value_usd: Math.round(mean),
      lower_80: Math.max(0, Math.round(mean - ci)),
      upper_80: Math.round(mean + ci),
    };
  });

  return {
    history_days: FORECAST_LOOKBACK_DAYS,
    horizon_days: FORECAST_HORIZON_DAYS,
    history,
    forecast,
    slope_per_day: Math.round(slope),
  };
}

function linregress(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length < 2) return { slope: 0, intercept: y[0] || 0 };
  const xMean = avg(x);
  const yMean = avg(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i += 1) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

// ─── Vertical benchmark ─────────────────────────────────────────────────────

async function loadVerticalBenchmark(args: {
  supa: ReturnType<typeof getServiceSupabase>;
  client_id: string;
  vertical: string;
  trends: Sparkline[];
}): Promise<VerticalBenchmark | null> {
  const { supa, client_id, vertical, trends } = args;
  const { data } = await supa
    .from('agency_knowledge')
    .select('content, created_at')
    .eq('client_id', client_id)
    .eq('kind', 'vertical_benchmark')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const content = (data.content ?? {}) as {
    vertical?: string;
    metrics?: Array<{
      metric: string;
      vertical_median: number;
      top_quartile: number;
      unit: string;
    }>;
  };
  if (!content.metrics || content.metrics.length === 0) return null;
  return {
    vertical: content.vertical || vertical,
    source: 'agency_knowledge',
    metrics: content.metrics.map((m) => {
      const trend = trends.find((t) => t.metric === m.metric);
      const you = trend ? trend.current : 0;
      return {
        ...m,
        you,
        percentile_rank: estimatePercentile({
          you,
          median: m.vertical_median,
          top: m.top_quartile,
          higherIsBetter: m.metric !== 'response_time' && m.metric !== 'ad_cpl',
        }),
      };
    }),
  };
}

function computeDefaultBenchmark(args: {
  vertical: string;
  trends: Sparkline[];
}): VerticalBenchmark {
  // Hand-curated baselines from the boltcall vertical research playbook.
  // These exist as a fallback so the page is never empty for a new
  // client before optimization-strategist populates agency_knowledge.
  const baselines: Record<
    string,
    { median: number; top: number; unit: string; higherIsBetter: boolean }
  > = {
    response_time: { median: 7.5, top: 3.2, unit: 'seconds', higherIsBetter: false },
    booking_rate: { median: 38, top: 56, unit: 'percent', higherIsBetter: true },
    lead_volume: { median: 14, top: 32, unit: 'leads', higherIsBetter: true },
    ad_cpl: { median: 42, top: 22, unit: 'usd', higherIsBetter: false },
  };
  return {
    vertical: args.vertical,
    source: 'computed_default',
    metrics: args.trends.map((t) => {
      const b = baselines[t.metric] || baselines.lead_volume;
      return {
        metric: t.metric,
        you: t.current,
        vertical_median: b.median,
        top_quartile: b.top,
        unit: b.unit,
        percentile_rank: estimatePercentile({
          you: t.current,
          median: b.median,
          top: b.top,
          higherIsBetter: b.higherIsBetter,
        }),
      };
    }),
  };
}

function estimatePercentile(args: {
  you: number;
  median: number;
  top: number;
  higherIsBetter: boolean;
}): number {
  const { you, median, top, higherIsBetter } = args;
  if (median === top) return 50;
  // Linear interpolation: median = 50, top quartile = 75.
  const num = you - median;
  const den = top - median;
  let pct = 50 + (num / den) * 25;
  if (!higherIsBetter) pct = 100 - pct;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

// ─── Anomaly resolution heuristic ───────────────────────────────────────────

function buildAnomalyEntry(
  anomaly: AnyEvent,
  fixCandidates: AnyEvent[],
): AnomalyTimelineEntry {
  const payload = anomaly.payload || {};
  const kind = (payload.kind as string) || (payload.anomaly_type as string) || 'unknown';
  const summary = anomaly.why_explanation || (payload.summary as string) || 'Detected an unusual pattern in the data.';

  // Resolution heuristic: a prompt_revised or kb_updated event after the
  // anomaly_detected event, within 7 days, counts as "fixed".
  const sevenDaysAfter = new Date(
    new Date(anomaly.created_at).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fix = fixCandidates.find(
    (f) => f.created_at > anomaly.created_at && f.created_at <= sevenDaysAfter,
  );
  let resolution_status: AnomalyTimelineEntry['resolution_status'] = 'pending';
  let resolution_at: string | null = null;
  let resolution_artifact_id: string | null = null;
  if (fix) {
    resolution_status = 'fixed';
    resolution_at = fix.created_at;
    const fid = (fix.payload?.['artifact_id'] as string) || null;
    resolution_artifact_id = fid;
  } else {
    // If the anomaly is older than 7d with no fix, it's been "ignored" by
    // the system (intentionally — low-confidence detection). Newer ones
    // are still in monitoring.
    const ageDays =
      (Date.now() - new Date(anomaly.created_at).getTime()) /
      (24 * 60 * 60 * 1000);
    resolution_status = ageDays > 7 ? 'ignored' : 'monitoring';
  }

  return {
    event_id: anomaly.id,
    detected_at: anomaly.created_at,
    kind,
    severity: anomaly.severity,
    summary,
    resolution_status,
    resolution_at,
    resolution_artifact_id,
  };
}

// ─── Narrative readings (single batched Sonnet call) ────────────────────────

const READING_SCHEMA: JsonSchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['pipeline_forecast', 'vertical_benchmark', 'anomaly_timeline', 'trends'],
  properties: {
    pipeline_forecast: { type: 'string', maxLength: 280 },
    vertical_benchmark: { type: 'string', maxLength: 280 },
    anomaly_timeline: { type: 'string', maxLength: 280 },
    trends: {
      type: 'object',
      additionalProperties: { type: 'string', maxLength: 220 },
    },
  },
};

async function generateReadings(args: {
  vertical: string;
  business_name: string;
  trends: Sparkline[];
  forecast: PipelineForecast;
  benchmark: VerticalBenchmark;
  anomaly_timeline: AnomalyTimelineEntry[];
  has_ads: boolean;
  client_id: string;
}): Promise<NarrativeReadings> {
  const system =
    `You are the Boltcall strategist writing one-sentence readings for charts on a client's analytics page.\n\n` +
    `Voice rules (load-bearing):\n` +
    `- Tone: a senior strategist who already looked at the data, NOT a chatbot. No "Looks like..." or "I see that...".\n` +
    `- Never mention "AI", "the model", "Claude", "Anthropic". Say "we" for any internal observation.\n` +
    `- One sentence per reading. ~25 words max. State what's happening AND why, in plain English.\n` +
    `- If the chart shows a dip, name a likely cause. If it shows growth, name what drove it.\n` +
    `- For pipeline forecast: lead with the tracking-vs-last-week framing (design principle #4).\n` +
    `- For vertical benchmark: state where the client ranks ("top 20% of ${args.vertical} on X") and close-the-gap action.\n` +
    `- For anomaly timeline: how many were caught, how many fixed, and the standing pattern.\n` +
    `- For each trend metric, the reading must reference the delta % vs prior week, not just the absolute number.\n` +
    `- Never write "your booking rate dropped" without immediately pairing it with the fix in motion (principle #2).`;

  const trendDigest = args.trends.map((t) => ({
    metric: t.metric,
    current: t.current,
    prior: t.prior,
    delta_pct: t.delta_pct,
    unit: t.unit,
  }));

  const forecastDigest = {
    last_7d_total: args.forecast.history
      .slice(-7)
      .reduce((acc, h) => acc + h.pipeline_value_usd, 0),
    prior_7d_total: args.forecast.history
      .slice(0, 7)
      .reduce((acc, h) => acc + h.pipeline_value_usd, 0),
    next_7d_total: args.forecast.forecast.reduce(
      (acc, f) => acc + f.pipeline_value_usd,
      0,
    ),
    slope_per_day: args.forecast.slope_per_day,
  };

  const benchmarkDigest = args.benchmark.metrics.map((m) => ({
    metric: m.metric,
    you: m.you,
    vertical_median: m.vertical_median,
    top_quartile: m.top_quartile,
    percentile_rank: m.percentile_rank,
    unit: m.unit,
  }));

  const anomalyDigest = {
    total: args.anomaly_timeline.length,
    fixed: args.anomaly_timeline.filter((a) => a.resolution_status === 'fixed').length,
    monitoring: args.anomaly_timeline.filter((a) => a.resolution_status === 'monitoring').length,
    ignored: args.anomaly_timeline.filter((a) => a.resolution_status === 'ignored').length,
    recent_kinds: args.anomaly_timeline.slice(0, 5).map((a) => a.kind),
  };

  const userContent =
    `Business: ${args.business_name}\nVertical: ${args.vertical}\nHas paid ads: ${args.has_ads}\n\n` +
    'TRENDS:\n```json\n' +
    JSON.stringify(trendDigest, null, 2) +
    '\n```\n\nFORECAST:\n```json\n' +
    JSON.stringify(forecastDigest, null, 2) +
    '\n```\n\nBENCHMARK:\n```json\n' +
    JSON.stringify(benchmarkDigest, null, 2) +
    '\n```\n\nANOMALY ROLLUP:\n```json\n' +
    JSON.stringify(anomalyDigest, null, 2) +
    '\n```\n\nReturn readings via emit_structured_output. The `trends` object key MUST equal each metric name.';

  const result = await callClaude<NarrativeReadings>({
    system,
    user_messages: [{ role: 'user', content: userContent }],
    tier: 'sonnet',
    output_schema: READING_SCHEMA,
    tool_name: 'emit_structured_output',
    agent_name: 'client-insights-readings',
    client_id: args.client_id,
  });
  return result.output;
}

async function loadCachedReadings(args: {
  supa: ReturnType<typeof getServiceSupabase>;
  client_id: string;
  key: string;
}): Promise<NarrativeReadings | null> {
  const { data } = await args.supa
    .from('agency_artifacts')
    .select('content')
    .eq('client_id', args.client_id)
    .eq('type', 'chart_reading')
    .eq('content->>cache_key', args.key)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const content = (data.content ?? {}) as { readings?: NarrativeReadings };
  return content.readings || null;
}

async function persistReadings(args: {
  supa: ReturnType<typeof getServiceSupabase>;
  client_id: string;
  key: string;
  readings: NarrativeReadings;
}): Promise<void> {
  try {
    await args.supa.from('agency_artifacts').insert({
      client_id: args.client_id,
      type: 'chart_reading',
      status: 'shipped',
      generated_by: 'client-insights-readings',
      model: 'sonnet-4.6',
      content: {
        cache_key: args.key,
        readings: args.readings,
      },
      ship_target: 'client_portal',
      confidence: 0.85,
      reasoning_trace: [
        'Generated daily narrative readings for the client analytics page.',
        'Cached for the calendar day to keep readings stable across reloads.',
        'Source: trend deltas + benchmark percentiles + anomaly resolution counts.',
      ],
      retrieved_context: [],
      alternatives_rejected: [],
    });
  } catch (err) {
    console.warn('[agency-client-insights] persist readings failed:', err);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function nextNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 1; i <= n; i += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = xs.reduce((a, b) => a + b, 0);
  return Math.round((s / xs.length) * 100) / 100;
}

function numberFrom(p: Record<string, unknown>, k: string): number | null {
  const v = p[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export const testHandler = handler;
export default withLegacyHandler(handler);
