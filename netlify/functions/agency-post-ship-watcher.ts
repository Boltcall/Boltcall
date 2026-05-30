/**
 * agency-post-ship-watcher — Cross-cutting feature #2 (post-ship critic + auto-revert)
 * =====================================================================================
 *
 * Implements the post-ship critic with auto-revert per the audit lines 112–117:
 *
 *   "Every shipped artifact gets a post-ship monitor that watches its
 *   real-world outcome for a defined window (creatives: 72h Meta CPL;
 *   prompts: 50 calls of QA score; reports: 7d open/reply). If the artifact
 *   is in the bottom 10% of historical performance for its type+vertical,
 *   fire a 'post-ship critic' agent that explains the regression and proposes
 *   (auto-revert | hold | iterate). Auto-revert allowed only for changes
 *   covered by a BENCHMARK; otherwise queue for founder."
 *
 * Schedule:
 *   '*\/15 * * * *'  — every 15 minutes. The window-end check is the gate; we
 *   don't actually do anything for an artifact whose window is still open.
 *
 * What it does on each tick:
 *   1. Query agency_artifacts WHERE:
 *        status = 'shipped'
 *        AND ship_window_ends_at IS NOT NULL
 *        AND ship_window_ends_at <= now()
 *        AND NOT EXISTS (post_ship_outcome_recorded event for this artifact_id)
 *   2. For each candidate:
 *        a. Gather the real-world outcome from the right source:
 *             - ad_creative           → meta-ads-adapter.getCreativeInsights (CPL window)
 *             - agent_prompt/_revision → qa_score from agency_events.call_completed
 *                                        for the post-ship N-call window
 *             - weekly_report         → open_rate / reply_rate (best-effort: from
 *                                        report_sent payload, falls back to skip)
 *             - everything else       → mark inconclusive and emit the event
 *        b. Look up the baseline in agency_artifact_baselines for
 *           (type, vertical, metric). If absent → mark inconclusive.
 *        c. Compare observed vs baseline.p10 (with `better_when` direction):
 *             - PASS    : observed is within healthy band → record pass, done.
 *             - REGRESS : observed is in the bottom-10% tail → fire the critic.
 *             - INCONCLUSIVE: no baseline OR insufficient observed data → skip.
 *        d. The critic (Sonnet 4.6 via run-agent harness) explains the
 *           regression and proposes verdict ∈ {auto-revert, hold, iterate}.
 *        e. Auto-revert path (only if the parent artifact had BENCHMARK
 *           coverage AND verdict='auto-revert'):
 *             - Insert a new agency_artifacts row, type matches parent (e.g.
 *               'prompt_revision' for prompts, 'ad_creative' for creatives),
 *               status='draft', parent_artifact_id=<the bad artifact>,
 *               generated_by='post-ship-critic', content carries the revert plan.
 *             - Pre-approve and route through the artifact-shipped workflow by
 *               flipping status to 'approved' and emitting the queue-side
 *               event the n8n workflow polls for. (We do NOT call the deploy
 *               function directly — single source of truth is the artifact
 *               table + the artifact-shipped workflow.)
 *         Hold/iterate path: insert the revert proposal artifact as
 *         status='draft' for founder review in the queue.
 *     f. Always emit post_ship_outcome_recorded so the next tick doesn't
 *        re-process this artifact.
 *
 * Cost discipline: in steady state the gate is mostly "no candidates" — we
 * only spend tokens when an artifact crosses out of its window AND lacks a
 * recorded outcome. The Sonnet critic call happens only on REGRESS.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';

import { getServiceSupabase } from './_shared/token-utils';
import { runAgent, type JsonSchemaObject } from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getCreativeInsights } from './_shared/agency-adapters/meta-ads-adapter';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

// ─────────────────────────────────────────────────────────────────────────────
//   Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_NAME = 'post-ship-critic';
const SKILL_DIR = resolveSkillDir();

const MAX_CANDIDATES_PER_TICK = 20; // budget guardrail — most ticks see 0–3
const PROMPT_WINDOW_MIN_CALLS = 30; // need at least 30 calls in the post-ship window
const REPORT_WINDOW_MIN_VIEWS = 1;  // 1 view at minimum to compute an open rate

type ArtifactType =
  | 'agent_prompt'
  | 'prompt_revision'
  | 'knowledge_base'
  | 'ad_creative'
  | 'ad_copy'
  | 'weekly_report'
  | 'optimization_brief'
  | 'client_outreach'
  | 'escalation_action'
  | 'digital_twin_seed'
  | 'experiment_plan'
  | 'expansion_pitch';

interface ShippedArtifactRow {
  id: string;
  client_id: string;
  type: ArtifactType;
  shipped_at: string;
  ship_window_ends_at: string;
  parent_artifact_id: string | null;
  generated_by: string;
  content: Record<string, unknown> | null;
  ship_result: Record<string, unknown> | null;
  eval_score: number | null;
  predicted_impact: { metric?: string; prediction?: number; horizon_hours?: number } | null;
  vertical: string;
}

interface BaselineRow {
  artifact_type: string;
  vertical: string;
  metric: string;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  better_when: 'higher' | 'lower';
  sample_size: number;
}

interface OutcomeMeasurement {
  metric: string;
  observed_value: number;
  sample_size: number;
  source: 'meta_insights' | 'qa_events' | 'report_event' | 'none';
}

type Verdict = 'pass' | 'regress' | 'inconclusive';

interface PostShipCriticOutput {
  verdict_action: 'auto_revert' | 'hold' | 'iterate';
  reasoning: string;
  revert_plan: {
    summary: string;
    target_artifact_id: string;
    revert_to_artifact_id: string | null;
    confidence: number;
  };
  estimated_recovery_pct: number;
  // Cross-cutting envelope (required by run-agent harness — every artifact-
  // producing agent must emit these per audit feature #1).
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
  [key: string]: unknown;
}

const CRITIC_SCHEMA: JsonSchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'verdict_action',
    'reasoning',
    'revert_plan',
    'estimated_recovery_pct',
    // Cross-cutting envelope (feature #1) — every artifact-producing agent
    // must emit these so the founder approval queue can render the reasoning
    // drawer without opening the source. The run-agent harness enforces it
    // schema-side via the tool_choice contract.
    'confidence',
    'reasoning_trace',
    'alternatives_rejected',
  ],
  properties: {
    verdict_action: { type: 'string', enum: ['auto_revert', 'hold', 'iterate'] },
    reasoning: { type: 'string', minLength: 40, maxLength: 600 },
    revert_plan: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'target_artifact_id', 'confidence'],
      properties: {
        summary: { type: 'string', minLength: 10, maxLength: 400 },
        target_artifact_id: { type: 'string' },
        revert_to_artifact_id: { type: ['string', 'null'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    estimated_recovery_pct: { type: 'number', minimum: 0, maximum: 100 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning_trace: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
    },
    alternatives_rejected: { type: 'array' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyArtifactId = url.searchParams.get('artifact_id'); // manual replay

  let candidates: ShippedArtifactRow[];
  try {
    candidates = await loadCandidates(onlyArtifactId);
  } catch (err) {
    console.error('[agency-post-ship-watcher] candidate query failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'candidate query failed' }),
    };
  }

  if (candidates.length === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates: 0, latency_ms: Date.now() - t0 }),
    };
  }

  const results: Array<{
    artifact_id: string;
    verdict: Verdict;
    action?: PostShipCriticOutput['verdict_action'];
    reason?: string;
  }> = [];

  for (const art of candidates) {
    try {
      const r = await processOne(art);
      results.push(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agency-post-ship-watcher] artifact ${art.id} failed: ${msg}`);
      results.push({ artifact_id: art.id, verdict: 'inconclusive', reason: msg });
      try {
        await emitAgencyEvent({
          client_id: art.client_id,
          agent_name: AGENT_NAME,
          type: 'adapter_error',
          severity: 'warn',
          payload: {
            adapter: AGENT_NAME,
            operation: 'processOne',
            error_message: msg.slice(0, 500),
            external_id: art.id,
            retryable: true,
          },
        });
      } catch {
        /* swallow */
      }
    }
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-post-ship-watcher] processed ${results.length} candidates in ${latency_ms}ms ` +
      `verdicts=${JSON.stringify(countByVerdict(results))}`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidates: candidates.length,
      processed: results.length,
      latency_ms,
      results,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-post-ship-watcher', inner);

// ─────────────────────────────────────────────────────────────────────────────
//   Per-artifact processor
// ─────────────────────────────────────────────────────────────────────────────

async function processOne(art: ShippedArtifactRow): Promise<{
  artifact_id: string;
  verdict: Verdict;
  action?: PostShipCriticOutput['verdict_action'];
  reason?: string;
}> {
  // (a) Measure observed outcome
  const measurement = await measureOutcome(art);
  if (measurement.source === 'none') {
    await recordOutcome(art, {
      metric: art.predicted_impact?.metric ?? 'unknown',
      verdict: 'inconclusive',
      observed_value: NaN,
      baseline_value: NaN,
      reason: 'no measurable outcome source',
    });
    return { artifact_id: art.id, verdict: 'inconclusive', reason: 'no measurement source' };
  }

  // (b) Look up baseline
  const baseline = await loadBaseline(art.type, art.vertical, measurement.metric);
  if (!baseline) {
    await recordOutcome(art, {
      metric: measurement.metric,
      verdict: 'inconclusive',
      observed_value: measurement.observed_value,
      baseline_value: NaN,
      reason: 'no baseline available',
    });
    return { artifact_id: art.id, verdict: 'inconclusive', reason: 'no baseline' };
  }

  // (c) Compare observed vs baseline.p10 (direction-aware)
  const isRegress = isRegressionVsBaseline(measurement.observed_value, baseline);
  if (!isRegress) {
    await recordOutcome(art, {
      metric: measurement.metric,
      verdict: 'pass',
      observed_value: measurement.observed_value,
      baseline_value: baseline.median,
      reason: `observed inside healthy band (p10=${baseline.p10}, median=${baseline.median})`,
    });
    return { artifact_id: art.id, verdict: 'pass' };
  }

  // (d) REGRESS → fire the critic
  const benchmarkCovered = await hasBenchmarkCoverage(art);
  const criticResult = await runPostShipCritic(art, measurement, baseline, benchmarkCovered);

  // (e) Emit verdict event for dedupe + telemetry — must happen BEFORE we
  //     branch into revert/hold so we never re-process this artifact on the
  //     next tick even if the revert insert fails.
  await recordOutcome(art, {
    metric: measurement.metric,
    verdict: 'regress',
    observed_value: measurement.observed_value,
    baseline_value: baseline.median,
    reason: criticResult.output.reasoning.slice(0, 280),
  });

  // (f) Branch on critic verdict + benchmark coverage
  const allowAutoRevert =
    criticResult.output.verdict_action === 'auto_revert' && benchmarkCovered;

  await queueRevertProposal({
    parent_artifact: art,
    critic: criticResult.output,
    benchmark_covered: benchmarkCovered,
    auto_apply: allowAutoRevert,
  });

  // If we auto-applied, also emit prompt_reverted / creative_paused for the
  // matching audit trail (kept narrow to the two artifact types where
  // auto-revert is well-defined).
  if (allowAutoRevert) {
    try {
      if (art.type === 'agent_prompt' || art.type === 'prompt_revision') {
        await emitAgencyEvent({
          client_id: art.client_id,
          agent_name: AGENT_NAME,
          type: 'prompt_reverted',
          severity: 'critical',
          payload: {
            artifact_id: art.id,
            reverted_to_artifact_id:
              criticResult.output.revert_plan.revert_to_artifact_id ?? art.parent_artifact_id ?? art.id,
            reason: criticResult.output.reasoning.slice(0, 280),
            triggered_by: 'post_ship_critic',
          },
          why_explanation: criticResult.output.reasoning.slice(0, 280),
        });
      }
    } catch {
      /* telemetry-only */
    }
  }

  return {
    artifact_id: art.id,
    verdict: 'regress',
    action: criticResult.output.verdict_action,
    reason: allowAutoRevert ? 'auto-reverted' : 'queued for founder',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 1 — load candidates
// ─────────────────────────────────────────────────────────────────────────────

async function loadCandidates(onlyArtifactId: string | null): Promise<ShippedArtifactRow[]> {
  const supabase = getServiceSupabase();

  // Inner query — shipped + window-elapsed
  let baseQuery = supabase
    .from('agency_artifacts')
    .select(
      'id, client_id, type, shipped_at, ship_window_ends_at, parent_artifact_id, generated_by, content, ship_result, eval_score, predicted_impact',
    )
    .eq('status', 'shipped')
    .not('ship_window_ends_at', 'is', null)
    .lte('ship_window_ends_at', new Date().toISOString())
    .order('ship_window_ends_at', { ascending: true })
    .limit(MAX_CANDIDATES_PER_TICK);
  if (onlyArtifactId) baseQuery = baseQuery.eq('id', onlyArtifactId);

  const { data: shipped, error } = await baseQuery;
  if (error) throw error;
  if (!shipped || shipped.length === 0) return [];

  // Fetch all post_ship_outcome_recorded event payload artifact_ids for this set,
  // then filter out artifacts already recorded.
  const ids = shipped.map((r) => r.id as string);
  const { data: recorded, error: e2 } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('type', 'post_ship_outcome_recorded')
    .in('client_id', shipped.map((r) => r.client_id as string));
  if (e2) {
    console.warn(`[agency-post-ship-watcher] outcome dedupe query failed: ${e2.message}`);
    // Fail open — better to over-process than miss a regression.
  }
  const recordedIds = new Set(
    (recorded ?? [])
      .map((r) => (r.payload as Record<string, unknown> | null)?.artifact_id)
      .filter((v): v is string => typeof v === 'string'),
  );
  const filtered = shipped.filter((r) => !recordedIds.has(r.id as string));

  // Resolve vertical via agency_clients join (one query)
  const clientIds = Array.from(new Set(filtered.map((r) => r.client_id as string)));
  if (clientIds.length === 0) return [];
  const { data: clients, error: e3 } = await supabase
    .from('agency_clients')
    .select('id, vertical')
    .in('id', clientIds);
  if (e3) throw e3;
  const verticalByClient: Record<string, string> = {};
  for (const c of clients ?? []) {
    verticalByClient[c.id as string] = (c.vertical as string) ?? 'other';
  }

  void ids;
  return filtered.map((r) => ({
    id: r.id as string,
    client_id: r.client_id as string,
    type: r.type as ArtifactType,
    shipped_at: r.shipped_at as string,
    ship_window_ends_at: r.ship_window_ends_at as string,
    parent_artifact_id: (r.parent_artifact_id as string | null) ?? null,
    generated_by: (r.generated_by as string) ?? 'unknown',
    content: (r.content as Record<string, unknown> | null) ?? null,
    ship_result: (r.ship_result as Record<string, unknown> | null) ?? null,
    eval_score: (r.eval_score as number | null) ?? null,
    predicted_impact: (r.predicted_impact as Record<string, unknown> | null) as
      | { metric?: string; prediction?: number; horizon_hours?: number }
      | null,
    vertical: verticalByClient[r.client_id as string] ?? 'other',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 2 — measure observed outcome per artifact type
// ─────────────────────────────────────────────────────────────────────────────

async function measureOutcome(art: ShippedArtifactRow): Promise<OutcomeMeasurement> {
  switch (art.type) {
    case 'ad_creative':
    case 'ad_copy':
      return measureCreativeOutcome(art);
    case 'agent_prompt':
    case 'prompt_revision':
      return measurePromptOutcome(art);
    case 'weekly_report':
      return measureReportOutcome(art);
    default:
      return { metric: 'unknown', observed_value: 0, sample_size: 0, source: 'none' };
  }
}

async function measureCreativeOutcome(art: ShippedArtifactRow): Promise<OutcomeMeasurement> {
  // ship_result.ad_id is the Meta ad-id we should query against (the adapter
  // returns both ad_id + creative_id; ad_id is what insights are scoped to).
  const adId =
    (art.ship_result?.ad_id as string | undefined) ??
    (art.ship_result?.creative_id as string | undefined);
  if (!adId) {
    return { metric: 'cpl_usd', observed_value: 0, sample_size: 0, source: 'none' };
  }
  const since = new Date(art.shipped_at).toISOString().slice(0, 10);
  const until = new Date(art.ship_window_ends_at).toISOString().slice(0, 10);
  try {
    const insights = await getCreativeInsights({
      ad_id: adId,
      since,
      until,
      client_id: art.client_id,
    });
    if (insights.leads <= 0) {
      return { metric: 'cpl_usd', observed_value: 0, sample_size: 0, source: 'none' };
    }
    return {
      metric: 'cpl_usd',
      observed_value: insights.cpl,
      sample_size: insights.leads,
      source: 'meta_insights',
    };
  } catch (err) {
    console.warn(
      `[agency-post-ship-watcher] meta insights failed for ad ${adId}: ${
        err instanceof Error ? err.message : err
      }`,
    );
    return { metric: 'cpl_usd', observed_value: 0, sample_size: 0, source: 'none' };
  }
}

async function measurePromptOutcome(art: ShippedArtifactRow): Promise<OutcomeMeasurement> {
  // Average qa_score across calls in the [shipped_at, ship_window_ends_at] window.
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_events')
    .select('payload, created_at')
    .eq('client_id', art.client_id)
    .eq('type', 'call_completed')
    .gte('created_at', art.shipped_at)
    .lte('created_at', art.ship_window_ends_at);
  if (error) {
    console.warn(`[agency-post-ship-watcher] qa events fetch failed: ${error.message}`);
    return { metric: 'qa_score', observed_value: 0, sample_size: 0, source: 'none' };
  }
  let sum = 0;
  let count = 0;
  for (const r of data ?? []) {
    const v = (r.payload as Record<string, unknown> | null)?.qa_score;
    if (typeof v === 'number' && v >= 0) {
      sum += v;
      count += 1;
    }
  }
  if (count < PROMPT_WINDOW_MIN_CALLS) {
    return { metric: 'qa_score', observed_value: 0, sample_size: count, source: 'none' };
  }
  return {
    metric: 'qa_score',
    observed_value: sum / count,
    sample_size: count,
    source: 'qa_events',
  };
}

async function measureReportOutcome(art: ShippedArtifactRow): Promise<OutcomeMeasurement> {
  // Open/reply rate is tracked on the report_sent event payload — best-effort,
  // we don't synthesize a metric if the tracking pixel wasn't loaded.
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('client_id', art.client_id)
    .eq('type', 'report_sent')
    .gte('created_at', art.shipped_at)
    .lte('created_at', art.ship_window_ends_at)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) {
    return { metric: 'open_rate', observed_value: 0, sample_size: 0, source: 'none' };
  }
  const payload = data[0].payload as Record<string, unknown> | null;
  const opens = (payload?.opens as number | undefined) ?? 0;
  const sends = (payload?.sends as number | undefined) ?? 1;
  if (sends < REPORT_WINDOW_MIN_VIEWS) {
    return { metric: 'open_rate', observed_value: 0, sample_size: 0, source: 'none' };
  }
  return {
    metric: 'open_rate',
    observed_value: opens / sends,
    sample_size: sends,
    source: 'report_event',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 3 — baseline lookup + regression check
// ─────────────────────────────────────────────────────────────────────────────

async function loadBaseline(
  artifact_type: string,
  vertical: string,
  metric: string,
): Promise<BaselineRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_artifact_baselines')
    .select('*')
    .eq('artifact_type', artifact_type)
    .eq('vertical', vertical)
    .eq('metric', metric)
    .maybeSingle();
  if (error) {
    console.warn(`[agency-post-ship-watcher] baseline lookup failed: ${error.message}`);
    return null;
  }
  if (!data) return null;
  return data as BaselineRow;
}

function isRegressionVsBaseline(observed: number, baseline: BaselineRow): boolean {
  if (baseline.better_when === 'higher') {
    // bottom 10% = observed below p10
    return observed < baseline.p10;
  }
  // better_when='lower' — bottom 10% = observed above p90
  return observed > baseline.p90;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 4 — BENCHMARK coverage check (controls auto-revert eligibility)
// ─────────────────────────────────────────────────────────────────────────────

async function hasBenchmarkCoverage(art: ShippedArtifactRow): Promise<boolean> {
  // Coverage = a benchmark_score_recorded event for this artifact_id with passed=true.
  // The agent that produced the artifact is responsible for running the
  // BENCHMARK before shipping; we trust the event.
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('client_id', art.client_id)
    .eq('type', 'benchmark_score_recorded')
    .limit(50);
  if (error) return false;
  for (const r of data ?? []) {
    const p = r.payload as Record<string, unknown> | null;
    if (!p) continue;
    if (p.artifact_id === art.id && p.passed === true) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 5 — run the post-ship critic
// ─────────────────────────────────────────────────────────────────────────────

async function runPostShipCritic(
  art: ShippedArtifactRow,
  measurement: OutcomeMeasurement,
  baseline: BaselineRow,
  benchmarkCovered: boolean,
) {
  return runAgent<
    {
      artifact: {
        id: string;
        type: string;
        shipped_at: string;
        generated_by: string;
        parent_artifact_id: string | null;
        predicted_impact: Record<string, unknown> | null;
        content_summary: string;
      };
      measurement: OutcomeMeasurement;
      baseline: Pick<BaselineRow, 'median' | 'p10' | 'p25' | 'p75' | 'p90' | 'better_when' | 'sample_size'>;
      benchmark_covered: boolean;
    },
    PostShipCriticOutput
  >({
    agent_name: AGENT_NAME,
    client_id: art.client_id,
    input: {
      artifact: {
        id: art.id,
        type: art.type,
        shipped_at: art.shipped_at,
        generated_by: art.generated_by,
        parent_artifact_id: art.parent_artifact_id,
        predicted_impact: art.predicted_impact as Record<string, unknown> | null,
        content_summary: summarizeContent(art.content),
      },
      measurement,
      baseline: {
        median: baseline.median,
        p10: baseline.p10,
        p25: baseline.p25,
        p75: baseline.p75,
        p90: baseline.p90,
        better_when: baseline.better_when,
        sample_size: baseline.sample_size,
      },
      benchmark_covered: benchmarkCovered,
    },
    skill_dir: SKILL_DIR,
    output_schema: CRITIC_SCHEMA,
    adversarial_critic: false, // the post-ship critic IS the critic; no double-pass
    max_iterations: 1,
    artifact_type: art.type === 'ad_creative' || art.type === 'ad_copy' ? 'ad_creative' : 'prompt_revision',
    ship_target: 'founder_queue', // revert proposal lands in the queue
    knowledge_k: 3,
    knowledge_query: `${art.type} regression ${art.vertical} metric=${measurement.metric}`,
    router_summary: `post-ship critic ${art.type} ${measurement.metric} regress`,
    agent_default_tier: 'sonnet',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 6 — queue the revert proposal (or apply if auto-revert allowed)
// ─────────────────────────────────────────────────────────────────────────────

async function queueRevertProposal(args: {
  parent_artifact: ShippedArtifactRow;
  critic: PostShipCriticOutput;
  benchmark_covered: boolean;
  auto_apply: boolean;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { parent_artifact, critic, benchmark_covered, auto_apply } = args;

  const revertType: ArtifactType =
    parent_artifact.type === 'ad_creative' || parent_artifact.type === 'ad_copy'
      ? 'ad_creative'
      : 'prompt_revision';

  const insertPayload = {
    client_id: parent_artifact.client_id,
    type: revertType,
    status: auto_apply ? 'approved' : 'draft',
    generated_by: AGENT_NAME,
    model: 'claude-sonnet-4-6',
    content: {
      revert_plan: critic.revert_plan,
      reasoning: critic.reasoning,
      estimated_recovery_pct: critic.estimated_recovery_pct,
      summary: `Revert ${parent_artifact.type} ${parent_artifact.id} — ${critic.revert_plan.summary}`,
    },
    parent_artifact_id: parent_artifact.id,
    confidence: critic.revert_plan.confidence,
    reasoning_trace: buildReasoningTrace(critic, benchmark_covered),
    adversarial_review: {
      critic_model: 'claude-sonnet-4-6',
      findings: [
        {
          severity: auto_apply ? 'critical' : 'warn',
          note: `Post-ship critic verdict: ${critic.verdict_action}. Benchmark coverage: ${benchmark_covered ? 'yes' : 'no'}.`,
        },
      ],
      agent_response: critic.reasoning,
    },
    ship_target: revertType === 'ad_creative' ? 'meta_ads' : 'retell_agent',
  };
  const { error } = await supabase.from('agency_artifacts').insert(insertPayload);
  if (error) {
    throw new Error(`failed to insert revert proposal: ${error.message}`);
  }
}

function buildReasoningTrace(
  critic: PostShipCriticOutput,
  benchmark_covered: boolean,
): [string, string, string] {
  return [
    `Post-ship outcome regressed vs baseline; critic verdict=${critic.verdict_action}.`,
    `Estimated recovery if reverted: ${critic.estimated_recovery_pct.toFixed(0)}%.`,
    benchmark_covered
      ? 'BENCHMARK coverage present — auto-revert eligibility honored.'
      : 'No BENCHMARK coverage — queued as draft for founder review.',
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 7 — record outcome event (dedupe gate + telemetry)
// ─────────────────────────────────────────────────────────────────────────────

async function recordOutcome(
  art: ShippedArtifactRow,
  outcome: {
    metric: string;
    verdict: Verdict;
    observed_value: number;
    baseline_value: number;
    reason: string;
  },
): Promise<void> {
  const windowHours = Math.max(
    1,
    Math.round(
      (new Date(art.ship_window_ends_at).getTime() - new Date(art.shipped_at).getTime()) /
        (3600 * 1000),
    ),
  );
  try {
    await emitAgencyEvent({
      client_id: art.client_id,
      agent_name: AGENT_NAME,
      type: 'post_ship_outcome_recorded',
      severity: outcome.verdict === 'regress' ? 'warn' : 'info',
      payload: {
        artifact_id: art.id,
        window: `${windowHours}h`,
        observed_metric: outcome.metric,
        observed_value: Number.isFinite(outcome.observed_value) ? outcome.observed_value : 0,
        baseline_value: Number.isFinite(outcome.baseline_value) ? outcome.baseline_value : 0,
        verdict: outcome.verdict,
      },
      why_explanation: outcome.reason.slice(0, 280),
    });
  } catch (err) {
    // Best-effort — without this event the next tick will re-process the
    // artifact, but the revert proposal (if any) is already inserted.
    console.warn(
      `[agency-post-ship-watcher] outcome event emit failed for ${art.id}: ${
        err instanceof Error ? err.message : err
      }`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveSkillDir(): string {
  const fromEnv = process.env.POST_SHIP_CRITIC_SKILL_DIR;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Shares the delivery-monitor's parent fleet directory layout.
  return path.resolve(
    process.cwd(),
    '../../Marketing/strategy/skills/agency-fleet/post-ship-critic',
  );
}

function summarizeContent(content: Record<string, unknown> | null): string {
  if (!content) return '';
  const candidates: Array<unknown> = [
    (content.payload as Record<string, unknown> | undefined)?.summary,
    (content.payload as Record<string, unknown> | undefined)?.title,
    content.summary,
    content.title,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c.slice(0, 240);
  }
  try {
    return JSON.stringify(content).slice(0, 240);
  } catch {
    return '';
  }
}

function countByVerdict(
  results: Array<{ verdict: Verdict; action?: PostShipCriticOutput['verdict_action'] }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of results) {
    const key = r.action ? `regress:${r.action}` : r.verdict;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
