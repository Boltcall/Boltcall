import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-cron-benchmark-curation — Cross-cutting feature #4 (BENCHMARK curator)
 * ==============================================================================
 *
 * Implements BENCHMARK regeneration from real data per the audit lines 124–128:
 *
 *   "Every agent's BENCHMARK.md scenario set is auto-expanded monthly. The
 *   'benchmark-curator' meta-agent reads the last 30 days of (artifact,
 *   real-world-outcome) pairs, finds outcomes that diverged from predicted,
 *   and adds them as new held-out scenarios. The benchmark gets harder as the
 *   OS sees more of the world. Loop-monitor's regression check thus tightens
 *   automatically."
 *
 *   "NEVER auto-merges — opens a PR/queues for human review."
 *
 * Schedule:
 *   '0 4 * * 0'  — Sundays at 04:00 UTC (weekly, not monthly per the audit
 *   wording — weekly is more responsive and the writes are proposals to disk
 *   so cost is bounded).
 *
 * What it does per agent in the fleet:
 *   1. Fetch all `agency_artifacts` from the last 30 days WHERE
 *        generated_by = <agent>
 *        AND status IN ('shipped','reverted')
 *        AND predicted_impact IS NOT NULL
 *      Pair each with its `post_ship_outcome_recorded` event.
 *   2. Compute the divergence vector: (predicted - actual) per artifact.
 *      Filter to artifacts with |divergence| above the per-agent threshold.
 *   3. Cluster divergences using a simple greedy embedding similarity (no
 *      external clustering deps — we use cosine sim on artifact-summary
 *      embeddings via azure-ai.generateEmbedding).
 *   4. For each cluster: write a proposed scenario addition (markdown stanza)
 *      to a JSON file at:
 *        strategy/skills/agency-fleet/<agent>/BENCHMARK-proposals/<YYYY-MM-DD>.json
 *      The JSON has shape:
 *        {
 *          "generated_at": "...",
 *          "agent": "...",
 *          "cluster_count": N,
 *          "proposals": [
 *            { "scenario_id": "...", "input_summary": "...", "expected_outcome": "...",
 *              "rationale": "...", "source_artifact_ids": [...] },
 *            ...
 *          ]
 *        }
 *   5. Emit ONE `benchmark_score_recorded` event per agent with op='curation_proposed'
 *      so the dashboard surfaces "N proposals waiting for review".
 *
 * IMPORTANT: This function NEVER edits BENCHMARK.md directly. The proposals
 * file is the queue; a human pulls it into the BENCHMARK.md as part of a
 * normal review PR. The "never auto-merges" rule from the audit is enforced
 * at the file boundary — the BENCHMARK.md files are not in our write set.
 *
 * Why JSON output instead of a Markdown PR:
 *   - The Netlify scheduled function has no GitHub PR write surface in this
 *     repo's plumbing; opening a PR would require a token + workflow we
 *     haven't wired. Writing to disk + tagging an event = same trust boundary
 *     with less infrastructure surface area.
 *   - A separate small CLI / loop can later pick up the JSON files and open
 *     PRs; that's a layer 8 concern, not a layer 2 concern.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { generateEmbedding } from './_shared/azure-ai';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

// ─────────────────────────────────────────────────────────────────────────────
//   Constants
// ─────────────────────────────────────────────────────────────────────────────

const CURATOR_NAME = 'benchmark-curator';

const FLEET_AGENTS = [
  'intake-officer',
  'agent-architect',
  'creative-foundry',
  'reporting-scribe',
  'optimization-strategist',
  'qa-auditor',
  'delivery-monitor',
  'churn-sentinel',
  'expansion-spotter',
] as const;

type FleetAgent = typeof FLEET_AGENTS[number];

const LOOKBACK_DAYS = 30;
const MIN_DIVERGENCE_RATIO = 0.20;  // |predicted - actual| / max(|predicted|, 1e-6) ≥ 20%
const MIN_DIVERGENCE_ABS = 0.05;     // OR absolute divergence ≥ 0.05 (for small base rates)
const CLUSTER_SIMILARITY_THRESHOLD = 0.86; // cosine ≥ 0.86 = same cluster
const MAX_CLUSTERS_PER_AGENT = 8;     // cap proposal count per agent per week
const MAX_ARTIFACTS_PER_AGENT = 200;  // safety cap on inputs

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

interface ShippedArtifactWithOutcome {
  artifact_id: string;
  client_id: string;
  type: string;
  shipped_at: string;
  generated_by: string;
  content: Record<string, unknown> | null;
  predicted_impact: {
    metric?: string;
    prediction?: number;
    horizon_hours?: number;
    base_rate?: number;
  } | null;
  outcome_metric: string;
  observed_value: number;
  baseline_value: number;
  verdict: 'pass' | 'regress' | 'inconclusive';
}

interface DivergencePoint {
  artifact_id: string;
  type: string;
  vertical_hint: string;
  predicted: number;
  observed: number;
  divergence_ratio: number;
  divergence_abs: number;
  summary: string;
  embedding?: number[];
}

interface DivergenceCluster {
  cluster_id: string;
  centroid_summary: string;
  members: DivergencePoint[];
  median_divergence_ratio: number;
}

interface BenchmarkProposal {
  scenario_id: string;
  input_summary: string;
  expected_outcome: string;
  rationale: string;
  source_artifact_ids: string[];
  median_divergence_ratio: number;
  members_count: number;
}

interface PerAgentResult {
  agent: FleetAgent;
  artifact_count: number;
  divergence_count: number;
  cluster_count: number;
  output_path: string | null;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyAgent = url.searchParams.get('agent') as FleetAgent | null;

  const agents: ReadonlyArray<FleetAgent> = onlyAgent && FLEET_AGENTS.includes(onlyAgent)
    ? [onlyAgent]
    : FLEET_AGENTS;

  const results: PerAgentResult[] = [];
  for (const agent of agents) {
    try {
      const r = await curateForAgent(agent);
      results.push(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agency-cron-benchmark-curation] agent ${agent} failed: ${msg}`);
      results.push({
        agent,
        artifact_count: 0,
        divergence_count: 0,
        cluster_count: 0,
        output_path: null,
        reason: msg.slice(0, 200),
      });
    }
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-cron-benchmark-curation] processed ${results.length} agents in ${latency_ms}ms`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processed_agents: results.length,
      latency_ms,
      per_agent: results,
    }),
  };
};
const handler = wrapCronWithAlert('agency-cron-benchmark-curation', inner);

// ─────────────────────────────────────────────────────────────────────────────
//   Per-agent curator
// ─────────────────────────────────────────────────────────────────────────────

async function curateForAgent(agent: FleetAgent): Promise<PerAgentResult> {
  // 1. Pull (artifact, outcome) pairs
  const pairs = await loadArtifactOutcomePairs(agent);
  if (pairs.length === 0) {
    return {
      agent,
      artifact_count: 0,
      divergence_count: 0,
      cluster_count: 0,
      output_path: null,
      reason: 'no shipped artifacts with outcomes',
    };
  }

  // 2. Compute divergences
  const divergences = computeDivergences(pairs);
  if (divergences.length === 0) {
    return {
      agent,
      artifact_count: pairs.length,
      divergence_count: 0,
      cluster_count: 0,
      output_path: null,
      reason: 'no divergences above threshold',
    };
  }

  // 3. Embed each divergence summary for clustering. Cap inputs.
  const capped = divergences.slice(0, MAX_ARTIFACTS_PER_AGENT);
  await embedDivergencesBestEffort(capped);

  // 4. Cluster greedily
  const clusters = clusterDivergences(capped).slice(0, MAX_CLUSTERS_PER_AGENT);

  // 5. Build proposals + write JSON
  const proposals = clusters.map(buildProposal);
  const outPath = await writeProposalsFile(agent, proposals);

  // 6. Emit single curator event so the dashboard sees "N proposals waiting"
  try {
    await emitAgencyEvent({
      client_id: '00000000-0000-0000-0000-000000000000', // sentinel: curator is OS-wide.
      agent_name: CURATOR_NAME,
      type: 'benchmark_score_recorded',
      severity: 'info',
      payload: {
        benchmark_id: `proposals/${agent}/${todayStamp()}`,
        agent_target: agent,
        score: proposals.length,         // count of proposals
        passed: true,                     // 'passed' here means "produced output"; auto-merge gate is human review
        scenario_count: proposals.reduce((s, p) => s + p.members_count, 0),
      },
      why_explanation:
        `Benchmark curator produced ${proposals.length} new scenario proposals for ${agent} from ${pairs.length} shipped artifacts last week.`,
    });
  } catch {
    /* telemetry only */
  }

  return {
    agent,
    artifact_count: pairs.length,
    divergence_count: divergences.length,
    cluster_count: clusters.length,
    output_path: outPath,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 1 — load (artifact, outcome) pairs for this agent
// ─────────────────────────────────────────────────────────────────────────────

async function loadArtifactOutcomePairs(
  agent: FleetAgent,
): Promise<ShippedArtifactWithOutcome[]> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const { data: artifacts, error } = await supabase
    .from('agency_artifacts')
    .select(
      'id, client_id, type, shipped_at, generated_by, content, predicted_impact, status',
    )
    .eq('generated_by', agent)
    .in('status', ['shipped', 'reverted'])
    .gte('shipped_at', since)
    .not('predicted_impact', 'is', null)
    .limit(MAX_ARTIFACTS_PER_AGENT * 2);
  if (error) throw error;
  if (!artifacts || artifacts.length === 0) return [];

  // Outcome events
  const ids = artifacts.map((a) => a.id as string);
  const { data: events, error: e2 } = await supabase
    .from('agency_events')
    .select('payload, created_at')
    .eq('type', 'post_ship_outcome_recorded')
    .gte('created_at', since);
  if (e2) {
    console.warn(`[agency-cron-benchmark-curation] outcome events fetch failed: ${e2.message}`);
  }
  const outcomeByArtifactId: Record<string, Record<string, unknown>> = {};
  for (const e of events ?? []) {
    const p = e.payload as Record<string, unknown> | null;
    if (!p) continue;
    const aid = p.artifact_id;
    if (typeof aid === 'string' && ids.includes(aid)) {
      outcomeByArtifactId[aid] = p;
    }
  }

  const pairs: ShippedArtifactWithOutcome[] = [];
  for (const a of artifacts) {
    const aid = a.id as string;
    const outcome = outcomeByArtifactId[aid];
    if (!outcome) continue;
    const verdict = outcome.verdict as 'pass' | 'regress' | 'inconclusive' | undefined;
    if (!verdict || verdict === 'inconclusive') continue;
    const observed = outcome.observed_value;
    const baseline = outcome.baseline_value;
    const metric = outcome.observed_metric;
    if (
      typeof observed !== 'number' ||
      typeof baseline !== 'number' ||
      typeof metric !== 'string'
    ) {
      continue;
    }
    pairs.push({
      artifact_id: aid,
      client_id: a.client_id as string,
      type: a.type as string,
      shipped_at: a.shipped_at as string,
      generated_by: a.generated_by as string,
      content: (a.content as Record<string, unknown> | null) ?? null,
      predicted_impact: (a.predicted_impact as ShippedArtifactWithOutcome['predicted_impact']) ?? null,
      outcome_metric: metric,
      observed_value: observed,
      baseline_value: baseline,
      verdict,
    });
  }
  return pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 2 — compute divergences
// ─────────────────────────────────────────────────────────────────────────────

function computeDivergences(pairs: ShippedArtifactWithOutcome[]): DivergencePoint[] {
  const out: DivergencePoint[] = [];
  for (const p of pairs) {
    const predicted = p.predicted_impact?.prediction;
    if (typeof predicted !== 'number') continue;
    const observed = p.observed_value;
    const divAbs = Math.abs(predicted - observed);
    const divRatio = divAbs / Math.max(Math.abs(predicted), 1e-6);
    if (divAbs < MIN_DIVERGENCE_ABS && divRatio < MIN_DIVERGENCE_RATIO) continue;
    out.push({
      artifact_id: p.artifact_id,
      type: p.type,
      vertical_hint: extractVerticalHint(p.content),
      predicted,
      observed,
      divergence_ratio: divRatio,
      divergence_abs: divAbs,
      summary: summarizeForEmbedding(p),
    });
  }
  // Sort by largest divergence first — keeps the most actionable at the top.
  out.sort((a, b) => b.divergence_ratio - a.divergence_ratio);
  return out;
}

function extractVerticalHint(content: Record<string, unknown> | null): string {
  if (!content) return 'other';
  const payload = (content.payload as Record<string, unknown> | undefined) ?? {};
  const v = payload.vertical ?? content.vertical;
  if (typeof v === 'string' && v.length > 0) return v;
  return 'other';
}

function summarizeForEmbedding(p: ShippedArtifactWithOutcome): string {
  const verticalHint = extractVerticalHint(p.content);
  const predicted = p.predicted_impact?.prediction;
  const direction = p.observed_value > (predicted ?? 0) ? 'over' : 'under';
  const contentSummary = compactSummary(p.content);
  return [
    `type=${p.type}`,
    `vertical=${verticalHint}`,
    `predicted=${predicted}`,
    `observed=${p.observed_value}`,
    `direction=${direction}`,
    `verdict=${p.verdict}`,
    `content=${contentSummary}`,
  ]
    .join(' | ')
    .slice(0, 1200);
}

function compactSummary(content: Record<string, unknown> | null): string {
  if (!content) return '';
  const payload = content.payload as Record<string, unknown> | undefined;
  const cand =
    (payload?.summary as string | undefined) ??
    (payload?.title as string | undefined) ??
    (content.summary as string | undefined) ??
    (content.title as string | undefined);
  if (typeof cand === 'string' && cand.length > 0) return cand.slice(0, 600);
  try {
    return JSON.stringify(payload ?? content).slice(0, 600);
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 3 — embed (best-effort; skips silently on API failure)
// ─────────────────────────────────────────────────────────────────────────────

async function embedDivergencesBestEffort(divs: DivergencePoint[]): Promise<void> {
  // Process serially to keep our azure-openai RPM low and to avoid a burst.
  for (const d of divs) {
    try {
      const emb = await generateEmbedding(d.summary);
      d.embedding = emb;
    } catch (err) {
      // Embedding is a soft dep — without it the clusterer falls back to
      // type+vertical bucketing which is still useful.
      console.warn(
        `[agency-cron-benchmark-curation] embedding failed for ${d.artifact_id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      d.embedding = undefined;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 4 — greedy clustering
// ─────────────────────────────────────────────────────────────────────────────

function clusterDivergences(divs: DivergencePoint[]): DivergenceCluster[] {
  const clusters: DivergenceCluster[] = [];
  for (const d of divs) {
    let assigned = false;
    for (const c of clusters) {
      const first = c.members[0];
      const sim = similarity(d, first);
      if (sim >= CLUSTER_SIMILARITY_THRESHOLD) {
        c.members.push(d);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({
        cluster_id: `c_${clusters.length + 1}_${d.type}_${d.vertical_hint}`,
        centroid_summary: d.summary,
        members: [d],
        median_divergence_ratio: d.divergence_ratio,
      });
    }
  }
  // Recompute medians + drop singletons that aren't large divergences. A
  // cluster of 1 with low divergence is noise; a cluster of 1 with extreme
  // divergence is still a worthwhile black-swan to capture.
  const out = clusters
    .map((c) => {
      const med = median(c.members.map((m) => m.divergence_ratio));
      return { ...c, median_divergence_ratio: med };
    })
    .filter((c) => c.members.length >= 2 || c.median_divergence_ratio >= 0.50);
  // Largest, most divergent clusters first.
  out.sort(
    (a, b) =>
      b.members.length * b.median_divergence_ratio -
      a.members.length * a.median_divergence_ratio,
  );
  return out;
}

function similarity(a: DivergencePoint, b: DivergencePoint): number {
  if (a.embedding && b.embedding && a.embedding.length === b.embedding.length) {
    return cosine(a.embedding, b.embedding);
  }
  // Fallback when embeddings unavailable: same type+vertical_hint = 1.0,
  // same type only = 0.7, otherwise 0.
  if (a.type === b.type && a.vertical_hint === b.vertical_hint) return 1.0;
  if (a.type === b.type) return 0.7;
  return 0;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Step 5 — proposal construction + JSON file write
// ─────────────────────────────────────────────────────────────────────────────

function buildProposal(cluster: DivergenceCluster): BenchmarkProposal {
  // Use Array.from instead of spread to avoid `--downlevelIteration` requirement.
  const types = Array.from(new Set(cluster.members.map((m) => m.type)));
  const verticals = Array.from(new Set(cluster.members.map((m) => m.vertical_hint)));
  const direction = cluster.members[0].observed > cluster.members[0].predicted ? 'overshoots' : 'undershoots';
  const examplePredicted = cluster.members[0].predicted;
  const exampleObserved = cluster.members[0].observed;

  return {
    scenario_id: cluster.cluster_id,
    input_summary:
      `Cluster of ${cluster.members.length} divergent ${types.join('/')} artifacts in ` +
      `${verticals.join('/')} vertical(s). Representative case: predicted ${examplePredicted}, observed ${exampleObserved}.`,
    expected_outcome:
      `When the agent ships a similar artifact, the prediction should land within ` +
      `±${(median(cluster.members.map((m) => m.divergence_ratio)) * 100).toFixed(0)}% of the realized value.`,
    rationale:
      `Predictions ${direction} reality consistently in this cluster (median divergence ` +
      `${(cluster.median_divergence_ratio * 100).toFixed(0)}%, ${cluster.members.length} cases over the last ${LOOKBACK_DAYS} days). ` +
      `Adding these as held-out scenarios will surface the miscalibration earlier on prompt rewrites.`,
    source_artifact_ids: cluster.members.map((m) => m.artifact_id),
    median_divergence_ratio: cluster.median_divergence_ratio,
    members_count: cluster.members.length,
  };
}

async function writeProposalsFile(
  agent: FleetAgent,
  proposals: BenchmarkProposal[],
): Promise<string | null> {
  if (proposals.length === 0) return null;
  const baseDir = resolveProposalsDir(agent);
  await fs.mkdir(baseDir, { recursive: true });
  const filePath = path.join(baseDir, `${todayStamp()}.json`);
  const body = {
    generated_at: new Date().toISOString(),
    agent,
    cluster_count: proposals.length,
    note:
      'AUTO-GENERATED. Do NOT auto-merge into BENCHMARK.md. A human review is required ' +
      'so we never weaken the regression gate by accepting curator-produced false positives.',
    proposals,
  };
  await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8');
  return filePath;
}

function resolveProposalsDir(agent: FleetAgent): string {
  // The skill folder lives in the Marketing repo outside the Boltcall worktree.
  // Mirror the path resolution used by run-agent / delivery-monitor.
  const base =
    process.env.AGENCY_FLEET_DIR ??
    path.resolve(process.cwd(), '../../Marketing/strategy/skills/agency-fleet');
  return path.join(base, agent, 'BENCHMARK-proposals');
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export const testHandler = handler;
export default withLegacyHandler(handler);
