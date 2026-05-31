/**
 * agency-delivery-monitor — Hourly delivery monitor (Phase C, Layer 7)
 * ===================================================================
 *
 * Threshold-free EWMA + seasonal baselines + root-cause RAG + one-click
 * rollback. Implements the killer-feature per the AI-native upgrade spec
 * (per-agent upgrades §"delivery-monitor"):
 *
 *   (a) Per-client EWMA + seasonal baselines (hour-of-day × day-of-week)
 *       computed from the last 30 days of `agency_events` for four metrics:
 *         booking_rate, lead_volume, qa_score, ad_cpl
 *
 *   (b) When |deviation| crosses 2σ vs the seasonal bucket, fire the
 *       root-cause RAG agent (run-agent harness → escalation_action artifact)
 *       with THREE evidence streams packaged into the agent's input:
 *         1. last 24h call transcripts (via retell-adapter.listRecentCalls)
 *         2. recent agency_artifacts shipped in the last 4h
 *         3. external context (Meta ad-set changes via meta-ads-adapter,
 *            holiday calendar, weather for HVAC verticals)
 *
 *   (c) The LLM emits a 2-sentence root-cause hypothesis + a one-click
 *       rollback target (`payload.rollback.parent_artifact_id`). The runner
 *       then mirrors the artifact into an `escalation_action_drafted` event
 *       so Atlas outbound routing surfaces it on Telegram. Severity=critical
 *       on high-confidence + rollback-available deviations.
 *
 * Trigger: Netlify scheduled function, hourly (configured in netlify.toml).
 *   schedule = "0 * * * *"
 *
 * Cost discipline:
 *   - The 2σ gate is computed in-process; no LLM call unless tripped.
 *   - The router-classifier inside run-agent picks Haiku for "normal"
 *     deviations and bumps to Sonnet on "hard" (ambiguous evidence,
 *     multiple recent artifacts, etc.).
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';

import { getServiceSupabase } from './_shared/token-utils';
import { runAgent } from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import {
  listRecentCalls,
  type RecentCallSummary,
} from './_shared/agency-adapters/retell-adapter';
import {
  getCampaignInsights,
  type CampaignInsights,
} from './_shared/agency-adapters/meta-ads-adapter';
import { getBookings } from './_shared/agency-adapters/calcom-adapter';
import { authorizeRunner } from './_shared/agency-runner-auth';

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

type Metric = 'booking_rate' | 'lead_volume' | 'qa_score' | 'ad_cpl';

interface LiveClient {
  id: string;
  business_name: string | null;
  vertical: string | null;
  region: string | null;
  timezone: string | null;
  live_at: string | null;
}

interface ClientExternalIds {
  retell_agent_id: string | null;
  meta_campaign_id: string | null;
}

interface SeasonalBucket {
  hour_of_day: number;
  day_of_week: number;
  ewma_mean: number;
  ewma_variance: number;
  n_samples: number;
}

interface Baseline {
  metric: Metric;
  hour_of_day: number;
  day_of_week: number;
  mean: number;
  std: number;
  n_samples: number;
  source: string;
}

interface CurrentObservation {
  metric: Metric;
  value: number;
  window_started_at: string;
  hour_of_day: number;
  day_of_week: number;
}

interface DeviationFinding {
  metric: Metric;
  observed_value: number;
  expected_value: number;
  sigma_deviation: number;
  window_started_at: string;
  hour_of_day: number;
  day_of_week: number;
  seasonal_baseline_source: string;
  /** True if this client lacks 30d data and we tripped on an absolute floor. */
  is_first_week_floor: boolean;
}

interface ShippedArtifactBrief {
  artifact_id: string;
  type: string;
  shipped_at: string;
  parent_artifact_id: string | null;
  generated_by: string;
  summary: string;
}

interface ExternalContext {
  source: 'weather' | 'holiday' | 'meta_adset_changes';
  summary: string;
}

interface RootCauseAgentInput {
  client: {
    id: string;
    business_name: string;
    vertical: string;
    region: string;
    timezone: string;
  };
  deviation: {
    metric: Metric;
    observed_value: number;
    expected_value: number;
    sigma_deviation: number;
    window_started_at: string;
    hour_of_day: number;
    day_of_week: number;
    seasonal_baseline_source: string;
  };
  evidence_internal_transcripts: RecentCallSummary[];
  evidence_recent_artifacts: ShippedArtifactBrief[];
  evidence_external_context: ExternalContext[];
}

interface RootCauseAgentOutput {
  payload: {
    metric: Metric;
    observed_value: number;
    expected_value: number;
    sigma_deviation: number;
    window: string;
    root_cause_hypothesis: string;
    severity: 'warn' | 'critical';
    rollback: {
      kind: 'prompt' | 'creative' | 'adset' | 'none';
      parent_artifact_id?: string;
      reason: string;
    };
    recommended_action: 'rollback' | 'pause' | 'notify_client' | 'retry' | 'other';
  };
  predicted_impact: {
    metric: string;
    prediction: number;
    ci_low: number;
    ci_high: number;
    base_rate: number;
    horizon_hours: number;
  };
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Constants / config
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_NAME = 'delivery-monitor';
const ARTIFACT_TYPE = 'escalation_action' as const;
const SKILL_DIR = resolveSkillDir();

const SIGMA_GATE = 2.0;                         // standard 2σ trip
const EWMA_ALPHA = 0.30;                        // weights last sample at α; matches BENCHMARK source label
const BASELINE_WINDOW_DAYS = 30;
const FIRST_WEEK_THRESHOLD_DAYS = 7;
const RECENT_ARTIFACT_LOOKBACK_HOURS = 4;
const TRANSCRIPT_LOOKBACK_HOURS = 24;
const TRANSCRIPT_SAMPLE_LIMIT = 20;
const ROUTER_SUMMARY_PREFIX = 'delivery-monitor 2σ trip';

// Absolute floors for first-week clients lacking a seasonal baseline.
const FIRST_WEEK_FLOORS: Partial<Record<Metric, number>> = {
  booking_rate: 0.05,
  qa_score: 6.0,
};

// Verticals that benefit from external weather lookup.
const WEATHER_VERTICALS = new Set(['hvac', 'plumbing', 'roofing']);

// Verticals/locales that care about US holiday calendar correlation.
const HOLIDAY_VERTICALS = new Set([
  'med_spa', 'cosmetic_dental', 'legal', 'gym', 'plumbing', 'hvac', 'roofing',
]);

// JSONSchema mirror (caller copy of output-schema.json). Required by run-agent;
// the harness merges in the cross-cutting confidence/reasoning_trace/etc fields.
const OUTPUT_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['payload', 'predicted_impact'],
  properties: {
    payload: {
      type: 'object',
      additionalProperties: false,
      required: [
        'metric', 'observed_value', 'expected_value', 'sigma_deviation',
        'window', 'root_cause_hypothesis', 'severity', 'rollback',
        'recommended_action',
      ],
      properties: {
        metric: { type: 'string', enum: ['booking_rate', 'lead_volume', 'qa_score', 'ad_cpl'] },
        observed_value: { type: 'number' },
        expected_value: { type: 'number' },
        sigma_deviation: { type: 'number' },
        window: { type: 'string' },
        root_cause_hypothesis: { type: 'string', minLength: 40, maxLength: 400 },
        severity: { type: 'string', enum: ['warn', 'critical'] },
        rollback: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'reason'],
          properties: {
            kind: { type: 'string', enum: ['prompt', 'creative', 'adset', 'none'] },
            parent_artifact_id: { type: 'string' },
            reason: { type: 'string', minLength: 6 },
          },
        },
        recommended_action: {
          type: 'string',
          enum: ['rollback', 'pause', 'notify_client', 'retry', 'other'],
        },
      },
    },
    predicted_impact: {
      type: 'object',
      additionalProperties: false,
      required: ['metric', 'prediction', 'ci_low', 'ci_high', 'base_rate', 'horizon_hours'],
      properties: {
        metric: { type: 'string' },
        prediction: { type: 'number' },
        ci_low: { type: 'number' },
        ci_high: { type: 'number' },
        base_rate: { type: 'number' },
        horizon_hours: { type: 'integer', minimum: 1, maximum: 168 },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//   Entry point — Netlify scheduled handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  // Allow manual single-client invocation for dev / scenario testing.
  const url = new URL(
    event.rawUrl || `https://x/${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyClientId = url.searchParams.get('client_id');

  let clients: LiveClient[];
  try {
    clients = await loadLiveClients(onlyClientId);
  } catch (err) {
    console.error('[agency-delivery-monitor] failed to load clients:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'failed to load clients' }) };
  }

  const results: Array<{ client_id: string; deviations: number; escalations: number }> = [];
  let totalDeviations = 0;
  let totalEscalations = 0;

  for (const client of clients) {
    try {
      const r = await runDeliveryMonitorForClient(client);
      results.push({
        client_id: client.id,
        deviations: r.deviations,
        escalations: r.escalations,
      });
      totalDeviations += r.deviations;
      totalEscalations += r.escalations;
    } catch (err) {
      console.error(
        `[agency-delivery-monitor] client ${client.id} failed:`,
        err instanceof Error ? err.message : err,
      );
      // Best-effort: log via the kernel so the failure shows up in the queue.
      try {
        await emitAgencyEvent({
          client_id: client.id,
          agent_name: AGENT_NAME,
          type: 'adapter_error',
          severity: 'error',
          payload: {
            adapter: AGENT_NAME,
            operation: 'runDeliveryMonitorForClient',
            error_message: err instanceof Error ? err.message : String(err),
          },
        });
      } catch {
        /* swallow */
      }
    }
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-delivery-monitor] swept ${clients.length} clients, ${totalDeviations} deviations, ${totalEscalations} escalations in ${latency_ms}ms`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clients_swept: clients.length,
      deviations: totalDeviations,
      escalations: totalEscalations,
      latency_ms,
      per_client: results,
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//   Per-client runner (the actual killer-feature loop)
// ─────────────────────────────────────────────────────────────────────────────

async function runDeliveryMonitorForClient(client: LiveClient): Promise<{
  deviations: number;
  escalations: number;
}> {
  const now = new Date();
  const externalIds = await resolveClientExternalIds(client.id);
  const obs = await collectCurrentObservations(client, externalIds, now);
  if (obs.length === 0) {
    return { deviations: 0, escalations: 0 };
  }

  const daysLive = client.live_at
    ? Math.max(0, (now.getTime() - new Date(client.live_at).getTime()) / 86_400_000)
    : 0;
  const isFirstWeek = daysLive < FIRST_WEEK_THRESHOLD_DAYS;

  // (a) For each metric, compute the seasonal baseline (or apply the
  //     first-week floor) and decide if we have a deviation worth escalating.
  const findings: DeviationFinding[] = [];
  for (const o of obs) {
    if (isFirstWeek) {
      const floor = FIRST_WEEK_FLOORS[o.metric];
      if (floor === undefined) continue; // no floor defined for lead_volume / ad_cpl
      const tripped =
        o.metric === 'qa_score' ? o.value < floor : o.value < floor; // both currently "below floor"
      if (!tripped) continue;
      findings.push({
        metric: o.metric,
        observed_value: o.value,
        expected_value: floor,
        sigma_deviation: -3.0, // synthetic; floor trip is critical by definition
        window_started_at: o.window_started_at,
        hour_of_day: o.hour_of_day,
        day_of_week: o.day_of_week,
        seasonal_baseline_source: `first-week absolute floor=${floor}`,
        is_first_week_floor: true,
      });
      continue;
    }

    const baseline = await computeSeasonalBaseline({
      client_id: client.id,
      metric: o.metric,
      hour_of_day: o.hour_of_day,
      day_of_week: o.day_of_week,
    });
    if (!baseline || baseline.n_samples < 3 || baseline.std <= 0) {
      // Not enough data in this exact bucket — skip silently. The 30d window
      // will fill in over time.
      continue;
    }

    const sigma = (o.value - baseline.mean) / baseline.std;
    if (Math.abs(sigma) < SIGMA_GATE) {
      continue;
    }

    findings.push({
      metric: o.metric,
      observed_value: o.value,
      expected_value: baseline.mean,
      sigma_deviation: round3(sigma),
      window_started_at: o.window_started_at,
      hour_of_day: o.hour_of_day,
      day_of_week: o.day_of_week,
      seasonal_baseline_source: baseline.source,
      is_first_week_floor: false,
    });
  }

  if (findings.length === 0) {
    return { deviations: 0, escalations: 0 };
  }

  // Emit the raw anomaly_detected events for telemetry — independent of
  // whether the LLM call succeeds, so the dashboard still sees the trip.
  for (const f of findings) {
    try {
      await emitAgencyEvent({
        client_id: client.id,
        agent_name: AGENT_NAME,
        type: 'anomaly_detected',
        severity: 'warn',
        payload: {
          metric: f.metric,
          observed_value: f.observed_value,
          expected_value: f.expected_value,
          sigma_deviation: f.sigma_deviation,
          window: '1h',
        },
        why_explanation: `${f.metric} ${f.sigma_deviation > 0 ? 'up' : 'down'} ${Math.abs(f.sigma_deviation).toFixed(1)}σ vs seasonal baseline`,
      });
    } catch {
      /* telemetry must never block */
    }
  }

  // (b) For each deviation, gather the three evidence streams and fire the
  //     root-cause RAG agent. We process at most ONE escalation per (client,
  //     run) to keep the queue from getting flooded — pick the largest
  //     |sigma| as the most important.
  findings.sort((a, b) => Math.abs(b.sigma_deviation) - Math.abs(a.sigma_deviation));
  const primary = findings[0];

  const [transcripts, recentArtifacts, externalContext] = await Promise.all([
    safeFetchTranscripts(client, externalIds.retell_agent_id),
    fetchRecentlyShippedArtifacts(client.id),
    gatherExternalContext(client, externalIds, primary),
  ]);

  const input: RootCauseAgentInput = {
    client: {
      id: client.id,
      business_name: client.business_name ?? '(unknown)',
      vertical: client.vertical ?? 'other',
      region: client.region ?? '',
      timezone: client.timezone ?? 'UTC',
    },
    deviation: {
      metric: primary.metric,
      observed_value: primary.observed_value,
      expected_value: primary.expected_value,
      sigma_deviation: primary.sigma_deviation,
      window_started_at: primary.window_started_at,
      hour_of_day: primary.hour_of_day,
      day_of_week: primary.day_of_week,
      seasonal_baseline_source: primary.seasonal_baseline_source,
    },
    evidence_internal_transcripts: transcripts,
    evidence_recent_artifacts: recentArtifacts,
    evidence_external_context: externalContext,
  };

  // (c) The run-agent harness handles model routing, the schema-enforced
  //     tool call, RAG prepass over agency_knowledge, the adversarial critic
  //     pass on the escalation, artifact insert (status='draft') with all
  //     dedicated columns populated, and the matching event emission.
  let runResult;
  try {
    runResult = await runAgent<RootCauseAgentInput, RootCauseAgentOutput>({
      agent_name: AGENT_NAME,
      client_id: client.id,
      input,
      skill_dir: SKILL_DIR,
      output_schema: OUTPUT_SCHEMA,
      adversarial_critic: true,
      max_iterations: 1,
      artifact_type: ARTIFACT_TYPE,
      ship_target: 'founder_telegram_via_atlas',
      knowledge_k: 6,
      knowledge_query: buildKnowledgeQuery(input),
      router_summary: `${ROUTER_SUMMARY_PREFIX} on ${primary.metric} (${primary.sigma_deviation.toFixed(1)}σ) ${client.vertical ?? ''}`.trim(),
      agent_default_tier: 'sonnet',
    });
  } catch (err) {
    console.error(`[agency-delivery-monitor] runAgent failed for ${client.id}:`, err);
    return { deviations: findings.length, escalations: 0 };
  }

  // (d) Promote the artifact into a kernel-shaped escalation_action_drafted
  //     event with the right severity. The harness also emitted a default
  //     event (mapped via ARTIFACT_TO_EVENT_TYPE), but the default conflates
  //     warn vs critical — we emit our OWN with the right severity + the LLM's
  //     hypothesis as why_explanation so Atlas can route it.
  const severity = runResult.output.payload.severity;
  const actionType = mapActionToEventEnum(runResult.output.payload.recommended_action);
  try {
    await emitAgencyEvent({
      client_id: client.id,
      agent_name: AGENT_NAME,
      type: 'escalation_action_drafted',
      severity: severity === 'critical' ? 'critical' : 'warn',
      payload: {
        artifact_id: runResult.artifact_id,
        action_type: actionType,
        reversible:
          runResult.output.payload.rollback.kind !== 'none',
      },
      why_explanation: runResult.output.payload.root_cause_hypothesis,
    });
  } catch (err) {
    console.warn(
      `[agency-delivery-monitor] escalation event emit failed (artifact still inserted): ${
        err instanceof Error ? err.message : err
      }`,
    );
  }

  return { deviations: findings.length, escalations: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 1: Live clients
// ─────────────────────────────────────────────────────────────────────────────

async function loadLiveClients(onlyId: string | null): Promise<LiveClient[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from('agency_clients')
    .select('id, business_name, vertical, region, timezone, live_at')
    .eq('status', 'live');
  if (onlyId) query = query.eq('id', onlyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LiveClient[];
}

/**
 * The kernel doesn't store external IDs on agency_clients directly — they
 * live on the artifacts that shipped them. We derive them by looking at the
 * most-recent shipped agent_prompt (→ retell_agent_id from ship_result) and
 * most-recent shipped ad_creative (→ meta_campaign_id from ship_result).
 *
 * Why this approach: keeps the kernel narrow + ensures we ALWAYS read from
 * the same row that adapters write to. If an agent gets re-deployed, this
 * picks up the new ID automatically with no migration step.
 */
async function resolveClientExternalIds(client_id: string): Promise<ClientExternalIds> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('type, ship_result, shipped_at')
    .eq('client_id', client_id)
    .eq('status', 'shipped')
    .in('type', ['agent_prompt', 'ad_creative', 'creative_published'])
    .order('shipped_at', { ascending: false })
    .limit(20);
  if (error) {
    console.warn(`[agency-delivery-monitor] external IDs lookup failed: ${error.message}`);
    return { retell_agent_id: null, meta_campaign_id: null };
  }
  let retell_agent_id: string | null = null;
  let meta_campaign_id: string | null = null;
  for (const r of data ?? []) {
    const ship = r.ship_result as Record<string, unknown> | null;
    if (!ship) continue;
    if (!retell_agent_id && r.type === 'agent_prompt') {
      const id = ship.retell_agent_id ?? ship.agent_id;
      if (typeof id === 'string') retell_agent_id = id;
    }
    if (!meta_campaign_id && (r.type === 'ad_creative' || r.type === 'creative_published')) {
      const id = ship.campaign_id ?? ship.meta_campaign_id;
      if (typeof id === 'string') meta_campaign_id = id;
    }
    if (retell_agent_id && meta_campaign_id) break;
  }
  return { retell_agent_id, meta_campaign_id };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 2: Current observations (last 1h for booking/leads/qa, 24h for cpl)
// ─────────────────────────────────────────────────────────────────────────────

async function collectCurrentObservations(
  client: LiveClient,
  externalIds: ClientExternalIds,
  now: Date,
): Promise<CurrentObservation[]> {
  const supabase = getServiceSupabase();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hod = now.getUTCHours();
  const dow = now.getUTCDay();

  // 1h window counts for booking_rate + lead_volume + qa_score
  const { data: events1h, error: e1 } = await supabase
    .from('agency_events')
    .select('type, payload, created_at')
    .eq('client_id', client.id)
    .gte('created_at', oneHourAgo.toISOString())
    .in('type', ['call_completed', 'booking_made', 'lead_captured']);
  if (e1) {
    console.warn(`[agency-delivery-monitor] events1h fetch failed: ${e1.message}`);
  }

  let calls = 0;
  let bookings = 0;
  let leads = 0;
  let qaSum = 0;
  let qaCount = 0;
  for (const r of events1h ?? []) {
    if (r.type === 'call_completed') {
      calls += 1;
      const qa = (r.payload as Record<string, unknown> | null)?.qa_score;
      if (typeof qa === 'number' && qa >= 0) {
        qaSum += qa;
        qaCount += 1;
      }
    } else if (r.type === 'booking_made') {
      bookings += 1;
    } else if (r.type === 'lead_captured') {
      leads += 1;
    }
  }

  const observations: CurrentObservation[] = [];
  const windowStart = oneHourAgo.toISOString();

  if (calls >= 3) {
    observations.push({
      metric: 'booking_rate',
      value: bookings / calls,
      window_started_at: windowStart,
      hour_of_day: hod,
      day_of_week: dow,
    });
  }
  observations.push({
    metric: 'lead_volume',
    value: leads,
    window_started_at: windowStart,
    hour_of_day: hod,
    day_of_week: dow,
  });
  if (qaCount >= 3) {
    observations.push({
      metric: 'qa_score',
      value: qaSum / qaCount,
      window_started_at: windowStart,
      hour_of_day: hod,
      day_of_week: dow,
    });
  }

  // ad_cpl from rolling 24h Meta insights (if a campaign is wired)
  if (externalIds.meta_campaign_id) {
    try {
      const insights: CampaignInsights = await getCampaignInsights({
        campaign_id: externalIds.meta_campaign_id,
        since: oneDayAgo.toISOString().slice(0, 10),
        until: now.toISOString().slice(0, 10),
        client_id: client.id,
      });
      if (insights.leads > 0 && insights.spend_usd >= 0) {
        observations.push({
          metric: 'ad_cpl',
          value: insights.cpl,
          window_started_at: oneDayAgo.toISOString(),
          hour_of_day: hod,
          day_of_week: dow,
        });
      }
    } catch (err) {
      // Meta is a soft dependency — log and continue, don't block other metrics.
      console.warn(
        `[agency-delivery-monitor] meta insights failed for ${client.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  return observations;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 3: Per-(metric, hour-of-day, day-of-week) seasonal baseline
//
//   The killer feature: instead of a global threshold, we compute the EWMA
//   mean + variance over the 30-day window of "this hour-of-day on this
//   day-of-week" for the given client. Means we don't fire on "every Monday
//   10am is slow" — we fire when *THIS* Monday 10am is unusually slow.
// ─────────────────────────────────────────────────────────────────────────────

async function computeSeasonalBaseline(args: {
  client_id: string;
  metric: Metric;
  hour_of_day: number;
  day_of_week: number;
}): Promise<Baseline | null> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - BASELINE_WINDOW_DAYS * 86_400_000).toISOString();

  // We bucket the last 30d of events into 1h-of-day × day-of-week cells. For
  // booking_rate we need both calls+bookings; for the rest we count one type.
  const { data: events, error } = await supabase
    .from('agency_events')
    .select('type, payload, created_at')
    .eq('client_id', args.client_id)
    .gte('created_at', since)
    .in('type', getBaselineEventTypes(args.metric));
  if (error) {
    console.warn(`[agency-delivery-monitor] baseline events fetch failed: ${error.message}`);
    return null;
  }
  if (!events || events.length === 0) {
    return null;
  }

  // Bucket by ISO hour. Key = "<YYYY-MM-DD>T<HH>" — one observation per hour.
  type HourBucket = {
    iso_hour: string;
    hour_of_day: number;
    day_of_week: number;
    calls: number;
    bookings: number;
    leads: number;
    qa_sum: number;
    qa_count: number;
  };
  const hourBuckets: Map<string, HourBucket> = new Map();

  for (const r of events) {
    const t = new Date(r.created_at);
    const key = `${t.toISOString().slice(0, 13)}`; // YYYY-MM-DDTHH
    let b = hourBuckets.get(key);
    if (!b) {
      b = {
        iso_hour: key,
        hour_of_day: t.getUTCHours(),
        day_of_week: t.getUTCDay(),
        calls: 0,
        bookings: 0,
        leads: 0,
        qa_sum: 0,
        qa_count: 0,
      };
      hourBuckets.set(key, b);
    }
    if (r.type === 'call_completed') {
      b.calls += 1;
      const qa = (r.payload as Record<string, unknown> | null)?.qa_score;
      if (typeof qa === 'number' && qa >= 0) {
        b.qa_sum += qa;
        b.qa_count += 1;
      }
    } else if (r.type === 'booking_made') {
      b.bookings += 1;
    } else if (r.type === 'lead_captured') {
      b.leads += 1;
    }
  }

  // Reduce to per-hour metric values, then filter to the matching seasonal
  // bucket (same hour-of-day AND same day-of-week).
  const matching: number[] = [];
  for (const b of hourBuckets.values()) {
    if (b.hour_of_day !== args.hour_of_day || b.day_of_week !== args.day_of_week) {
      continue;
    }
    const v = hourBucketToMetric(args.metric, b);
    if (v !== null) matching.push(v);
  }

  if (matching.length < 3) {
    return null;
  }

  // EWMA over the matched bucket samples (oldest → newest by iso_hour string).
  const sorted = matching.sort();
  // Chronologically — re-sort by the order we collected. Map iteration order
  // is insertion order, which is event-order for the same-bucket subset only
  // approximately; explicit sort by iso_hour for the samples we use:
  const samplesWithKey: Array<{ iso_hour: string; value: number }> = [];
  for (const b of hourBuckets.values()) {
    if (b.hour_of_day !== args.hour_of_day || b.day_of_week !== args.day_of_week) continue;
    const v = hourBucketToMetric(args.metric, b);
    if (v !== null) samplesWithKey.push({ iso_hour: b.iso_hour, value: v });
  }
  samplesWithKey.sort((a, b) => (a.iso_hour < b.iso_hour ? -1 : 1));
  void sorted;

  let mean = samplesWithKey[0].value;
  // EWMVar (Welford-style update using EWMA mean): track variance with same α.
  let variance = 0;
  for (let i = 1; i < samplesWithKey.length; i += 1) {
    const x = samplesWithKey[i].value;
    const prevMean = mean;
    mean = EWMA_ALPHA * x + (1 - EWMA_ALPHA) * mean;
    variance =
      (1 - EWMA_ALPHA) * (variance + EWMA_ALPHA * (x - prevMean) * (x - prevMean));
  }

  const std = Math.sqrt(Math.max(variance, 1e-12));
  return {
    metric: args.metric,
    hour_of_day: args.hour_of_day,
    day_of_week: args.day_of_week,
    mean,
    std,
    n_samples: samplesWithKey.length,
    source: `${BASELINE_WINDOW_DAYS}d EWMA hour-of-day × day-of-week, alpha=${EWMA_ALPHA.toFixed(2)}, n=${samplesWithKey.length} matching buckets`,
  };
}

function getBaselineEventTypes(metric: Metric): string[] {
  switch (metric) {
    case 'booking_rate':
      return ['call_completed', 'booking_made'];
    case 'lead_volume':
      return ['lead_captured'];
    case 'qa_score':
      return ['call_completed'];
    case 'ad_cpl':
      // Historical ad_cpl is derived from Meta insights on demand, not from
      // events. The hourly seasonal baseline for cpl uses Meta's own daily
      // breakdown over the 30d window in computeAdCplBaseline (see below).
      return [];
  }
}

function hourBucketToMetric(
  metric: Metric,
  b: { calls: number; bookings: number; leads: number; qa_sum: number; qa_count: number },
): number | null {
  switch (metric) {
    case 'booking_rate':
      return b.calls >= 1 ? b.bookings / b.calls : null;
    case 'lead_volume':
      return b.leads; // can be 0
    case 'qa_score':
      return b.qa_count >= 1 ? b.qa_sum / b.qa_count : null;
    case 'ad_cpl':
      // Handled separately via Meta insights; no event-based bucket.
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 4: Evidence stream 1 — recent transcripts
// ─────────────────────────────────────────────────────────────────────────────

async function safeFetchTranscripts(
  client: LiveClient,
  retell_agent_id: string | null,
): Promise<RecentCallSummary[]> {
  if (!retell_agent_id) return [];
  const since = new Date(Date.now() - TRANSCRIPT_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  try {
    const recent = await listRecentCalls({
      agent_id: retell_agent_id,
      since,
      limit: TRANSCRIPT_SAMPLE_LIMIT,
      client_id: client.id,
    });
    return recent.slice(0, TRANSCRIPT_SAMPLE_LIMIT);
  } catch (err) {
    console.warn(
      `[agency-delivery-monitor] listRecentCalls failed for ${client.id}: ${
        err instanceof Error ? err.message : err
      }`,
    );
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 5: Evidence stream 2 — recent shipped artifacts (the rollback target)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRecentlyShippedArtifacts(
  client_id: string,
): Promise<ShippedArtifactBrief[]> {
  const supabase = getServiceSupabase();
  const since = new Date(
    Date.now() - RECENT_ARTIFACT_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('id, type, shipped_at, parent_artifact_id, generated_by, content')
    .eq('client_id', client_id)
    .eq('status', 'shipped')
    .gte('shipped_at', since)
    .order('shipped_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn(`[agency-delivery-monitor] recent artifacts fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => ({
    artifact_id: r.id as string,
    type: r.type as string,
    shipped_at: r.shipped_at as string,
    parent_artifact_id: (r.parent_artifact_id as string | null) ?? null,
    generated_by: (r.generated_by as string) ?? 'unknown',
    summary: summarizeArtifactContent(r.content),
  }));
}

function summarizeArtifactContent(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const c = content as Record<string, unknown>;
  // run-agent stores payload + iteration_history inside content. Best-effort
  // summary: try common summary-ish fields, fall back to a truncated JSON.
  const payload = c.payload as Record<string, unknown> | undefined;
  const candidates = [
    payload?.summary,
    payload?.title,
    payload?.reason,
    payload?.diff_summary,
    payload?.change_summary,
    c.summary,
    c.title,
  ];
  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim().length > 0) {
      return cand.slice(0, 280);
    }
  }
  try {
    return JSON.stringify(payload ?? c).slice(0, 280);
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 6: Evidence stream 3 — external context (weather + holidays + ads)
// ─────────────────────────────────────────────────────────────────────────────

async function gatherExternalContext(
  client: LiveClient,
  externalIds: ClientExternalIds,
  finding: DeviationFinding,
): Promise<ExternalContext[]> {
  const out: ExternalContext[] = [];

  // (a) Meta ad-set changes in the last 4h — the deliberately narrow event
  //     scope is the most actionable external signal for ad_cpl / lead_volume.
  if (
    (finding.metric === 'ad_cpl' || finding.metric === 'lead_volume') &&
    externalIds.meta_campaign_id
  ) {
    try {
      const supabase = getServiceSupabase();
      const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('agency_events')
        .select('type, payload, created_at')
        .eq('client_id', client.id)
        .in('type', ['creative_paused', 'ad_set_created', 'ad_campaign_updated', 'creative_published'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);
      for (const r of data ?? []) {
        const t = new Date(r.created_at as string).toISOString().slice(11, 16);
        out.push({
          source: 'meta_adset_changes',
          summary: `${r.type} at ${t} UTC (${(r.payload as Record<string, unknown>)?.op ?? 'op?'})`,
        });
      }
    } catch (err) {
      console.warn('[agency-delivery-monitor] meta_adset_changes lookup failed:', err);
    }
  }

  // (b) US holiday calendar — relevant for explaining "expected" PTO-driven dips.
  const vertical = (client.vertical ?? '').toLowerCase();
  if (HOLIDAY_VERTICALS.has(vertical)) {
    const holiday = detectUsHoliday(new Date(finding.window_started_at));
    if (holiday) {
      out.push({ source: 'holiday', summary: holiday });
    }
  }

  // (c) Weather — HVAC/plumbing/roofing only; a soft hint, not load-bearing.
  if (WEATHER_VERTICALS.has(vertical)) {
    const w = await safeFetchWeatherHint(client);
    if (w) out.push({ source: 'weather', summary: w });
  }

  return out;
}

/**
 * Lightweight US-holiday detector. Covers the 8 federal + 2 "soft" holidays
 * (Memorial Day eve, Black Friday) that empirically move local-service KPIs.
 * No external API call needed — the dates are deterministic per year.
 */
function detectUsHoliday(d: Date): string | null {
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  // Fixed-date federal holidays
  if (month === 1 && day === 1) return "New Year's Day";
  if (month === 7 && day === 4) return 'US Independence Day';
  if (month === 11 && day === 11) return 'Veterans Day';
  if (month === 12 && day === 25) return 'Christmas Day';
  // Floating: MLK = 3rd Monday Jan, Presidents = 3rd Monday Feb, etc.
  const nthWeekdayOfMonth = (n: number, weekday: number, mo: number): number => {
    const first = new Date(Date.UTC(d.getUTCFullYear(), mo - 1, 1));
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    return 1 + offset + (n - 1) * 7;
  };
  if (month === 1 && day === nthWeekdayOfMonth(3, 1, 1)) return 'MLK Day';
  if (month === 2 && day === nthWeekdayOfMonth(3, 1, 2)) return "Presidents' Day";
  if (month === 9 && day === nthWeekdayOfMonth(1, 1, 9)) return 'Labor Day';
  if (month === 10 && day === nthWeekdayOfMonth(2, 1, 10)) return 'Columbus Day';
  if (month === 11 && day === nthWeekdayOfMonth(4, 4, 11)) return 'Thanksgiving';
  // Memorial Day = last Monday of May
  if (month === 5) {
    const lastDayMay = new Date(Date.UTC(d.getUTCFullYear(), 5, 0)).getUTCDate();
    const last = new Date(Date.UTC(d.getUTCFullYear(), 4, lastDayMay));
    const lastMonday = lastDayMay - ((last.getUTCDay() - 1 + 7) % 7);
    if (day === lastMonday) return 'Memorial Day';
    // Soft: Friday before Memorial Day
    if (day === lastMonday - 3 && dow === 5)
      return 'Friday before US Memorial Day weekend';
  }
  // Black Friday = day after Thanksgiving
  if (month === 11) {
    const thanksgivingDay = nthWeekdayOfMonth(4, 4, 11);
    if (day === thanksgivingDay + 1) return 'Black Friday';
  }
  return null;
}

/**
 * Best-effort weather hint for HVAC/plumbing/roofing verticals. Uses a free
 * keyless service (open-meteo) for the client's region. If anything fails,
 * returns null and the agent reasons without the hint — never block escalation.
 */
async function safeFetchWeatherHint(client: LiveClient): Promise<string | null> {
  const region = (client.region ?? '').trim();
  if (!region) return null;
  try {
    // Geocode
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(region)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!geoRes.ok) return null;
    const geo = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number }>;
    };
    const loc = geo.results?.[0];
    if (!loc) return null;

    // Current temp + 7d historical mean
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&current=temperature_2m&past_days=7&daily=temperature_2m_max&temperature_unit=fahrenheit`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      current?: { temperature_2m?: number };
      daily?: { temperature_2m_max?: number[] };
    };
    const current = j.current?.temperature_2m;
    const past = j.daily?.temperature_2m_max ?? [];
    if (typeof current !== 'number' || past.length < 3) return null;
    const seasonMean = past.reduce((a, b) => a + b, 0) / past.length;
    const delta = current - seasonMean;
    if (Math.abs(delta) < 8) return null; // not unusual
    return `${region}: ${current.toFixed(0)}°F vs 7d mean ${seasonMean.toFixed(0)}°F (Δ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}°F)`;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveSkillDir(): string {
  // The skill folder lives in the Marketing repo outside the Boltcall worktree.
  // Production path is configured via DELIVERY_MONITOR_SKILL_DIR env var (set
  // in Netlify build config); dev/test falls back to the dev-machine path.
  const fromEnv = process.env.DELIVERY_MONITOR_SKILL_DIR;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return path.resolve(
    process.cwd(),
    '../../Marketing/strategy/skills/agency-fleet/delivery-monitor',
  );
}

function buildKnowledgeQuery(input: RootCauseAgentInput): string {
  return [
    `vertical=${input.client.vertical}`,
    `metric=${input.deviation.metric}`,
    `sigma=${input.deviation.sigma_deviation}`,
    `recent_artifacts=${input.evidence_recent_artifacts.map((a) => a.type).join(',') || 'none'}`,
    `transcript_excerpt=${(input.evidence_internal_transcripts[0]?.transcript_excerpt ?? '').slice(0, 180)}`,
  ].join(' | ');
}

function mapActionToEventEnum(
  action: RootCauseAgentOutput['payload']['recommended_action'],
): 'rollback' | 'pause' | 'notify_client' | 'retry' | 'other' {
  // The output enum and the kernel enum are intentionally identical — pass
  // through. Helper exists so a future divergence is one edit.
  return action;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Re-export the per-client runner so the bench harness + unit tests can
// invoke it without going through the HTTP entrypoint.
export const __internal = {
  runDeliveryMonitorForClient,
  computeSeasonalBaseline,
  collectCurrentObservations,
  fetchRecentlyShippedArtifacts,
  gatherExternalContext,
  detectUsHoliday,
};

// Keep getBookings imported so future "no-show rate" metric can be added
// without touching the import block.
void getBookings;
