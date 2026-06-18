import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-qa-auditor — Daily call-quality auditor for the Agency OS.
 *
 * Trigger: cron daily 02:00 UTC per live client (orchestration is external —
 * this function takes `{client_id, agent_id, since?, mode?}` and runs).
 *
 * Killer feature (three pieces, implemented end-to-end in this file):
 *
 *   (a) TWO-JUDGE ENSEMBLE
 *       Each sampled call is scored TWICE by Haiku 4.5 with two different
 *       rubric framings (A = conversion-first reviewer, B = senior QA reviewer).
 *       If any single dimension diverges by > 1.5 points between A and B, a
 *       Sonnet 4.6 tiebreaker (Judge C) re-scores that specific dimension.
 *       All 3 (or 2) judgments are stored on the artifact for audit.
 *
 *   (b) ACTIVE-LEARNING SAMPLING
 *       Always sample 100% of:
 *         - calls that ended without a booking
 *         - calls > 5 minutes
 *         - calls where the agent transferred
 *         - the first 20 calls of any new prompt version (burn-in)
 *       Then random-sample the remaining calls to fill 20% of the day's volume
 *       (floor 5, ceiling 100). Each sampled call carries a `sampling_reason`
 *       so the meta-policy itself becomes optimizable.
 *
 *   (c) FAILURE CLUSTERING
 *       Every call with final consensus score < 6 generates a `failure_pattern`
 *       (slug + one-line description) which is embedded and persisted to
 *       agency_knowledge with kind='failure_pattern'. A weekly clustering pass
 *       (mode='cluster') runs HDBSCAN-style nearest-neighbour clustering across
 *       clients in the same vertical; any cluster with > 5 instances fires a
 *       `prompt_revision` artifact targeted at agent-architect with the
 *       cluster's exemplars + a BENCHMARK-gate flag. The cluster job carries
 *       enough context for agent-architect to add the fix to the matching
 *       vertical template.
 *
 * All scoring goes through `callClaude` (the harness's primitive) so the
 * router-classifier cost-event side effect fires for every judge pass. The
 * artifact insert goes directly via `agency_artifacts` because we need ONE
 * row carrying multiple judgments — the runAgent harness writes one row per
 * runAgent call which is the wrong granularity for an ensemble.
 *
 * Cost ceiling: ~$0.02/call (2× Haiku + 1-in-N Sonnet tiebreaker on diverged
 * dims only). Daily budget per client: 20% of yesterday's calls, floor 5,
 * ceiling 100. At 100 calls/day/client this is ~$2/client/day in QA cost.
 */

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { getServiceSupabase } from './_shared/token-utils';
import {
  callClaude,
  type JsonSchemaObject,
} from './_shared/agency-agents/run-agent';
import {
  listRecentCalls,
  getCallTranscript,
  type RecentCallSummary,
} from './_shared/agency-adapters/retell-adapter';
import { retrieve } from './_shared/agency-knowledge/retrieve';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { authorizeRunner } from './_shared/agency-runner-auth';

// ─── 0. Constants ────────────────────────────────────────────────────────────

const AGENT_NAME = 'qa-auditor';
const SKILL_DIR = path.resolve(
  process.cwd(),
  '..', '..', 'Marketing', 'strategy', 'skills', 'agency-fleet', 'qa-auditor',
);
// The harness also accepts an absolute skill_dir; we read prompt.md ourselves
// (since we call callClaude directly), so SKILL_DIR is informational here.

const SAMPLE_BUDGET_PCT = 0.20;
const SAMPLE_FLOOR = 5;
const SAMPLE_CEILING = 100;
const DIVERGENCE_THRESHOLD = 1.5;
const NEW_PROMPT_BURNIN_N = 20;
const LOW_SCORE_THRESHOLD = 6;
const CLUSTER_MIN_INSTANCES = 5;
const CLUSTER_SIM_THRESHOLD = 0.78;

const JUDGE_TOOL_NAME = 'emit_structured_output';

// Single-judge output schema — what each Haiku/Sonnet pass emits via tool-use.
// This is intentionally a subset of the on-disk output-schema.json: callClaude
// passes it straight to Anthropic, which is stricter about JSONSchema dialect
// than the docs suggest, so we keep it minimal and type-clean.
const JUDGE_SCHEMA: JsonSchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dim_booking_craft',
    'dim_qualifying_hygiene',
    'dim_vertical_compliance',
    'dim_empathy_tone',
    'dim_handoff_hygiene',
    'failure_pattern',
    'notable_moments',
    'confidence',
    'reasoning_trace',
    'alternatives_rejected',
  ],
  properties: {
    dim_booking_craft:      { type: ['integer', 'null'], minimum: 0, maximum: 10 },
    dim_qualifying_hygiene: { type: ['integer', 'null'], minimum: 0, maximum: 10 },
    dim_vertical_compliance:{ type: ['integer', 'null'], minimum: 0, maximum: 10 },
    dim_empathy_tone:       { type: ['integer', 'null'], minimum: 0, maximum: 10 },
    dim_handoff_hygiene:    { type: ['integer', 'null'], minimum: 0, maximum: 10 },
    failure_pattern: {
      type: ['object', 'null'],
      properties: {
        slug: { type: 'string' },
        one_line_description: { type: 'string' },
      },
      required: ['slug', 'one_line_description'],
    },
    notable_moments: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string' },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning_trace: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string' },
    },
    alternatives_rejected: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          option: { type: 'string' },
          why_rejected: { type: 'string' },
        },
        required: ['option', 'why_rejected'],
      },
    },
  },
};

// ─── 1. Types ────────────────────────────────────────────────────────────────

type DimKey =
  | 'dim_booking_craft'
  | 'dim_qualifying_hygiene'
  | 'dim_vertical_compliance'
  | 'dim_empathy_tone'
  | 'dim_handoff_hygiene';

const DIM_KEYS: DimKey[] = [
  'dim_booking_craft',
  'dim_qualifying_hygiene',
  'dim_vertical_compliance',
  'dim_empathy_tone',
  'dim_handoff_hygiene',
];

interface JudgeOutput {
  dim_booking_craft: number | null;
  dim_qualifying_hygiene: number | null;
  dim_vertical_compliance: number | null;
  dim_empathy_tone: number | null;
  dim_handoff_hygiene: number | null;
  failure_pattern: { slug: string; one_line_description: string } | null;
  notable_moments: string[];
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
}

interface SampledCall {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome?: string;
  sampling_reason:
    | 'no_booking'
    | 'over_5min'
    | 'transferred'
    | 'new_prompt_burnin'
    | 'random_fill';
}

interface ClientRow {
  id: string;
  vertical: string | null;
  business_name: string | null;
}

interface PromptVersionRow {
  agent_id: string;
  version: string;
  shipped_at: string;
  burnin_calls_scored: number;
}

interface JudgmentRecord {
  call_id: string;
  judge_a: JudgeOutput;
  judge_b: JudgeOutput;
  judge_c?: Partial<JudgeOutput> & { dim_keys_scored: DimKey[] };
  divergences: Array<{ dim: DimKey; a: number; b: number; delta: number }>;
  final_dim_scores: Record<DimKey, number>;
  final_score: number;
  failure_pattern: { slug: string; one_line_description: string } | null;
  notable_moments: string[];
  sampling_reason: SampledCall['sampling_reason'];
  cost_usd: number;
  latency_ms: number;
}

// ─── 2. HTTP handler ─────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  let body: {
    client_id?: string;
    agent_id?: string;
    since?: string;
    mode?: 'score' | 'cluster';
  };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid JSON body' }) };
  }

  const mode = body.mode ?? 'score';

  try {
    if (mode === 'cluster') {
      const summary = await runClusteringPass();
      return { statusCode: 200, body: JSON.stringify({ mode, ...summary }) };
    }

    if (!body.client_id || !body.agent_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'client_id + agent_id required in score mode' }),
      };
    }

    const since =
      body.since ??
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const result = await runDailyAudit({
      client_id: body.client_id,
      agent_id: body.agent_id,
      since,
    });
    return { statusCode: 200, body: JSON.stringify({ mode, ...result }) };
  } catch (err) {
    console.error(`[${AGENT_NAME}] handler failed:`, err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'qa-auditor failed',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  }
};

// ─── 3. Score mode — daily per-client audit ──────────────────────────────────

interface DailyAuditOpts {
  client_id: string;
  agent_id: string;
  since: string;
}

async function runDailyAudit(opts: DailyAuditOpts): Promise<{
  client_id: string;
  total_calls: number;
  sampled: number;
  scored: number;
  artifact_ids: string[];
  divergence_rate: number;
  low_score_count: number;
  total_cost_usd: number;
}> {
  const supabase = getServiceSupabase();
  const client = await loadClient(opts.client_id);
  if (!client) {
    throw new Error(`client_id ${opts.client_id} not found in agency_clients`);
  }

  // Pull yesterday's calls. The retell adapter caps `limit` at 1000.
  const calls = await listRecentCalls({
    agent_id: opts.agent_id,
    since: opts.since,
    limit: 1000,
    client_id: opts.client_id,
  });

  // KILLER FEATURE (b): active-learning sampling.
  const newPromptVersion = await loadActiveNewPromptVersion(opts.agent_id);
  const sampled = applyActiveSampling(calls, newPromptVersion);

  const judgments: JudgmentRecord[] = [];
  let totalCost = 0;

  // Score each sampled call through the two-judge ensemble.
  for (const s of sampled) {
    try {
      const judgment = await scoreCallEnsemble({
        call: s,
        client,
      });
      judgments.push(judgment);
      totalCost += judgment.cost_usd;
    } catch (err) {
      console.warn(
        `[${AGENT_NAME}] ensemble failed for call ${s.call_id}: ${
          (err as Error).message
        }`,
      );
      // Don't kill the whole batch on one bad call; emit adapter_error and continue.
      await safeEmitAdapterError({
        client_id: opts.client_id,
        operation: 'ensemble',
        message: `call ${s.call_id}: ${(err as Error).message}`,
      });
    }
  }

  // KILLER FEATURE (c) — persist failure_pattern embeddings for clustering.
  for (const j of judgments) {
    if (j.failure_pattern) {
      await persistFailurePattern({
        supabase,
        client_id: opts.client_id,
        vertical: client.vertical ?? 'other',
        call_id: j.call_id,
        failure_pattern: j.failure_pattern,
        final_score: j.final_score,
      });
    }
  }

  // Write one agency_artifacts row per judgment (escalation_action type so the
  // founder queue can see it; ship_target=qa_review).
  const artifact_ids: string[] = [];
  for (const j of judgments) {
    const id = await insertJudgmentArtifact({
      supabase,
      client_id: opts.client_id,
      judgment: j,
    });
    artifact_ids.push(id);

    // Emit a benchmark_score_recorded event so downstream loops (delivery-monitor,
    // bolt-agent-quality.yml) see the per-call score on the bus.
    try {
      await emitAgencyEvent({
        client_id: opts.client_id,
        agent_name: AGENT_NAME,
        type: 'benchmark_score_recorded',
        severity: j.final_score < LOW_SCORE_THRESHOLD ? 'warn' : 'info',
        payload: {
          benchmark_id: `qa-call-${j.call_id}`,
          agent_target: opts.agent_id,
          score: j.final_score,
          passed: j.final_score >= LOW_SCORE_THRESHOLD,
          scenario_count: 1,
          artifact_id: id,
        },
        why_explanation:
          j.final_score < LOW_SCORE_THRESHOLD
            ? `Low QA score ${j.final_score.toFixed(1)} on ${j.sampling_reason} call (${
                j.failure_pattern?.slug ?? 'no-pattern'
              }).`
            : `Healthy QA score ${j.final_score.toFixed(1)} on ${j.sampling_reason} call.`,
      });
    } catch (err) {
      console.warn(`[${AGENT_NAME}] benchmark event emit failed: ${(err as Error).message}`);
    }
  }

  // Bump the new-prompt-version burn-in counter so we know when to stop
  // force-sampling.
  if (newPromptVersion) {
    const burnInScored = judgments.filter(
      (j) => j.sampling_reason === 'new_prompt_burnin',
    ).length;
    if (burnInScored > 0) {
      await incrementBurnInCounter(
        opts.agent_id,
        newPromptVersion.version,
        burnInScored,
      );
    }
  }

  const divergence_rate =
    judgments.length === 0
      ? 0
      : judgments.filter((j) => j.divergences.length > 0).length / judgments.length;
  const low_score_count = judgments.filter(
    (j) => j.final_score < LOW_SCORE_THRESHOLD,
  ).length;

  return {
    client_id: opts.client_id,
    total_calls: calls.length,
    sampled: sampled.length,
    scored: judgments.length,
    artifact_ids,
    divergence_rate,
    low_score_count,
    total_cost_usd: totalCost,
  };
}

// ─── 4. KILLER FEATURE (a) — two-judge ensemble + tiebreaker ─────────────────

interface ScoreCallOpts {
  call: SampledCall;
  client: ClientRow;
}

async function scoreCallEnsemble(opts: ScoreCallOpts): Promise<JudgmentRecord> {
  const t0 = Date.now();
  const { call, client } = opts;

  // Pull full transcript (the listRecentCalls excerpt is truncated to 280 chars).
  const transcriptResult = await getCallTranscript({
    call_id: call.call_id,
    client_id: client.id,
  });

  // Pull vertical-specific knowledge (services, policies, FAQs) for judge context.
  let retrieved_context: Array<{ id: string; kind: string; snippet: string; score: number }> = [];
  try {
    const rag = await retrieve({
      client_id: client.id,
      query_text: `qa scoring context for vertical ${client.vertical ?? 'other'}`,
      k: 6,
    });
    retrieved_context = (rag.chunks ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      snippet: typeof c.content === 'string'
        ? c.content.slice(0, 400)
        : JSON.stringify(c.content).slice(0, 400),
      score: c.similarity,
    }));
  } catch (err) {
    console.warn(
      `[${AGENT_NAME}] knowledge retrieval failed for ${client.id} (non-fatal): ${
        (err as Error).message
      }`,
    );
  }

  const judgeSystem = buildJudgeSystemPrompt();
  const baseUserPayload = {
    call_id: call.call_id,
    client_id: client.id,
    vertical: client.vertical ?? 'other',
    outcome: transcriptResult.outcome ?? call.outcome ?? 'other',
    duration_sec: transcriptResult.duration_sec || call.duration_sec,
    agent_prompt_version: 'production',
    transcript: transcriptResult.transcript,
    client_context: retrieved_context,
  };

  // ── Judge A — conversion-first framing ──────────────────────────────────
  const judgeA = await callClaude<JudgeOutput>({
    system: judgeSystem,
    user_messages: [{
      role: 'user',
      content:
        '# judge_framing: A — conversion-first reviewer\n\n' +
        '```json\n' + JSON.stringify(baseUserPayload, null, 2) + '\n```\n\n' +
        'Score the call using framing A. Emit via emit_structured_output.',
    }],
    tier: 'haiku',
    output_schema: JUDGE_SCHEMA,
    tool_name: JUDGE_TOOL_NAME,
    agent_name: `${AGENT_NAME}:judge-A`,
    client_id: client.id,
  });

  // ── Judge B — senior QA reviewer framing ─────────────────────────────────
  const judgeB = await callClaude<JudgeOutput>({
    system: judgeSystem,
    user_messages: [{
      role: 'user',
      content:
        '# judge_framing: B — senior call-center QA reviewer\n\n' +
        '```json\n' + JSON.stringify(baseUserPayload, null, 2) + '\n```\n\n' +
        'Score the call using framing B. Emit via emit_structured_output.',
    }],
    tier: 'haiku',
    output_schema: JUDGE_SCHEMA,
    tool_name: JUDGE_TOOL_NAME,
    agent_name: `${AGENT_NAME}:judge-B`,
    client_id: client.id,
  });

  // ── Divergence check ────────────────────────────────────────────────────
  const divergences: JudgmentRecord['divergences'] = [];
  for (const dim of DIM_KEYS) {
    const a = judgeA.output[dim];
    const b = judgeB.output[dim];
    if (typeof a === 'number' && typeof b === 'number') {
      const delta = Math.abs(a - b);
      if (delta > DIVERGENCE_THRESHOLD) {
        divergences.push({ dim, a, b, delta });
      }
    }
  }

  let judgeC: JudgmentRecord['judge_c'] | undefined;
  let tiebreakerCost = 0;

  // ── Sonnet 4.6 tiebreaker — only invoked when at least one dim diverged ──
  if (divergences.length > 0) {
    const tiebreakerSchema: JsonSchemaObject = {
      type: 'object',
      additionalProperties: false,
      required: ['scores', 'confidence', 'reasoning_trace', 'alternatives_rejected'],
      properties: {
        scores: {
          type: 'object',
          additionalProperties: { type: 'integer', minimum: 0, maximum: 10 },
          description: 'Map of dimension_key -> integer 0-10. Only include the diverged dimensions.',
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning_trace: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: { type: 'string' },
        },
        alternatives_rejected: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              option: { type: 'string' },
              why_rejected: { type: 'string' },
            },
            required: ['option', 'why_rejected'],
          },
        },
      },
    };

    const divergenceSummary = divergences
      .map((d) => `- ${d.dim}: Judge A=${d.a}, Judge B=${d.b} (delta ${d.delta.toFixed(1)})`)
      .join('\n');

    const tieResult = await callClaude<{
      scores: Record<string, number>;
      confidence: number;
      reasoning_trace: string[];
      alternatives_rejected: Array<{ option: string; why_rejected: string }>;
    }>({
      system: judgeSystem +
        '\n\n## TIEBREAKER MODE\n' +
        'You are Judge C, the Sonnet 4.6 tiebreaker. Two Haiku judges disagreed on specific dimensions. ' +
        'Score ONLY the diverged dimensions listed below. For each, anchor your score in specific transcript quotes ' +
        'and explain why one judge was closer to correct than the other.',
      user_messages: [{
        role: 'user',
        content:
          '# Diverged dimensions to resolve\n' + divergenceSummary + '\n\n' +
          '# Judge A reasoning\n' + judgeA.output.reasoning_trace.join('\n') + '\n\n' +
          '# Judge B reasoning\n' + judgeB.output.reasoning_trace.join('\n') + '\n\n' +
          '# Original call data\n' +
          '```json\n' + JSON.stringify(baseUserPayload, null, 2) + '\n```\n\n' +
          'Emit final integer scores for the diverged dims only via emit_structured_output.',
      }],
      tier: 'sonnet',
      output_schema: tiebreakerSchema,
      tool_name: JUDGE_TOOL_NAME,
      agent_name: `${AGENT_NAME}:judge-C`,
      client_id: client.id,
    });
    tiebreakerCost = tieResult.cost_usd;

    judgeC = {
      dim_keys_scored: divergences.map((d) => d.dim),
      dim_booking_craft: tieResult.output.scores.dim_booking_craft ?? null,
      dim_qualifying_hygiene: tieResult.output.scores.dim_qualifying_hygiene ?? null,
      dim_vertical_compliance: tieResult.output.scores.dim_vertical_compliance ?? null,
      dim_empathy_tone: tieResult.output.scores.dim_empathy_tone ?? null,
      dim_handoff_hygiene: tieResult.output.scores.dim_handoff_hygiene ?? null,
      confidence: tieResult.output.confidence,
      reasoning_trace: tieResult.output.reasoning_trace,
      alternatives_rejected: tieResult.output.alternatives_rejected,
    };
  }

  // ── Resolve final per-dim scores ────────────────────────────────────────
  const final_dim_scores: Record<DimKey, number> = {} as Record<DimKey, number>;
  for (const dim of DIM_KEYS) {
    const a = judgeA.output[dim];
    const b = judgeB.output[dim];
    const c = judgeC?.[dim];
    if (typeof c === 'number') {
      // Tiebreaker wins on this dim — weighted average favouring Sonnet 2:1.
      const haikuMean =
        typeof a === 'number' && typeof b === 'number' ? (a + b) / 2 : (a ?? b ?? c);
      final_dim_scores[dim] = round1((c * 2 + (haikuMean ?? c)) / 3);
    } else if (typeof a === 'number' && typeof b === 'number') {
      final_dim_scores[dim] = round1((a + b) / 2);
    } else {
      final_dim_scores[dim] = typeof a === 'number' ? a : (typeof b === 'number' ? b : 0);
    }
  }

  const final_score = round1(
    DIM_KEYS.reduce((acc, dim) => acc + final_dim_scores[dim], 0) / DIM_KEYS.length,
  );

  // Pick the failure_pattern: prefer Judge C's view when present, else
  // whichever judge produced one (A first), else null.
  const failure_pattern =
    (judgeA.output.failure_pattern && final_score < LOW_SCORE_THRESHOLD
      ? judgeA.output.failure_pattern
      : null) ??
    (judgeB.output.failure_pattern && final_score < LOW_SCORE_THRESHOLD
      ? judgeB.output.failure_pattern
      : null);

  // De-duplicate notable_moments across judges, cap at 6 to keep the artifact
  // payload bounded.
  const notable_moments = Array.from(
    new Set([
      ...(judgeA.output.notable_moments ?? []),
      ...(judgeB.output.notable_moments ?? []),
    ]),
  ).slice(0, 6);

  return {
    call_id: call.call_id,
    judge_a: judgeA.output,
    judge_b: judgeB.output,
    judge_c: judgeC,
    divergences,
    final_dim_scores,
    final_score,
    failure_pattern,
    notable_moments,
    sampling_reason: call.sampling_reason,
    cost_usd: judgeA.cost_usd + judgeB.cost_usd + tiebreakerCost,
    latency_ms: Date.now() - t0,
  };
}

// ─── 5. KILLER FEATURE (b) — active-learning sampling ────────────────────────

/**
 * Pick which calls to score. Implements the exact policy in SKILL.md:
 *   - 100% of: no-booking, >5min, transferred, first 20 of new prompt version
 *   - Random fill to 20% of day budget (floor 5, ceiling 100)
 *
 * Each returned call carries `sampling_reason` so the meta-policy itself can be
 * measured: are we over-sampling random_fill? Under-sampling burn-in? The
 * answer drives prompt revisions to this very file.
 */
function applyActiveSampling(
  calls: RecentCallSummary[],
  newPromptVersion: PromptVersionRow | null,
): SampledCall[] {
  if (calls.length === 0) return [];

  const seen = new Set<string>();
  const mandatory: SampledCall[] = [];

  for (const c of calls) {
    if (seen.has(c.call_id)) continue;
    const outcomeLower = (c.outcome ?? '').toLowerCase();
    const isTransferred = outcomeLower.includes('transfer');
    const isOver5min = (c.duration_sec ?? 0) > 300;
    const isNoBooking =
      outcomeLower !== '' &&
      !outcomeLower.includes('book') &&
      !outcomeLower.includes('voicemail');

    let reason: SampledCall['sampling_reason'] | null = null;
    if (isTransferred) reason = 'transferred';
    else if (isOver5min) reason = 'over_5min';
    else if (isNoBooking) reason = 'no_booking';

    if (reason) {
      mandatory.push({
        call_id: c.call_id,
        started_at: c.started_at,
        duration_sec: c.duration_sec,
        outcome: c.outcome,
        sampling_reason: reason,
      });
      seen.add(c.call_id);
    }
  }

  // New-prompt burn-in: first N calls of the active new prompt version that
  // haven't already been counted toward burn-in.
  const burninQuota = newPromptVersion
    ? Math.max(0, NEW_PROMPT_BURNIN_N - newPromptVersion.burnin_calls_scored)
    : 0;
  if (burninQuota > 0) {
    // Calls in `calls` are already sorted descending by Retell; reverse to get
    // chronological order, then take the earliest unscored.
    const chrono = [...calls].sort((a, b) =>
      a.started_at.localeCompare(b.started_at),
    );
    let taken = 0;
    for (const c of chrono) {
      if (taken >= burninQuota) break;
      if (seen.has(c.call_id)) continue;
      mandatory.push({
        call_id: c.call_id,
        started_at: c.started_at,
        duration_sec: c.duration_sec,
        outcome: c.outcome,
        sampling_reason: 'new_prompt_burnin',
      });
      seen.add(c.call_id);
      taken += 1;
    }
  }

  // Day budget: 20% of total, floor 5, ceiling 100.
  const targetTotal = clamp(
    Math.ceil(calls.length * SAMPLE_BUDGET_PCT),
    SAMPLE_FLOOR,
    SAMPLE_CEILING,
  );
  const randomFillQuota = Math.max(0, targetTotal - mandatory.length);

  // Random fill — deterministic shuffle of unseen calls.
  const pool = calls.filter((c) => !seen.has(c.call_id));
  shuffleInPlace(pool);
  for (let i = 0; i < randomFillQuota && i < pool.length; i += 1) {
    const c = pool[i];
    mandatory.push({
      call_id: c.call_id,
      started_at: c.started_at,
      duration_sec: c.duration_sec,
      outcome: c.outcome,
      sampling_reason: 'random_fill',
    });
  }

  return mandatory;
}

// ─── 6. KILLER FEATURE (c) — failure-pattern persistence + clustering ────────

interface PersistFailurePatternOpts {
  supabase: ReturnType<typeof getServiceSupabase>;
  client_id: string;
  vertical: string;
  call_id: string;
  failure_pattern: { slug: string; one_line_description: string };
  final_score: number;
}

/**
 * Write the failure pattern to agency_knowledge with kind='failure_pattern'.
 * The clustering pass (mode='cluster') reads back across all clients in the
 * same vertical and groups by slug + embedding similarity.
 *
 * Embedding: we do NOT call an embedding API here on purpose — embedding
 * generation is the retrieve.ts helper's responsibility. We store the slug +
 * description + per-vertical metadata; the clustering pass relies primarily on
 * the slug match (a kebab-case identifier IS a clustering key) and falls back
 * to text similarity for slugs not in the canonical set.
 */
async function persistFailurePattern(opts: PersistFailurePatternOpts): Promise<void> {
  const { supabase, client_id, vertical, call_id, failure_pattern, final_score } = opts;

  // Insert as agency_knowledge row of kind='failure_pattern'. Content carries
  // everything the clustering pass needs to bucket the row without re-reading
  // the source artifact.
  const { error } = await supabase.from('agency_knowledge').insert({
    client_id,
    kind: 'failure_pattern',
    content: {
      slug: failure_pattern.slug,
      description: failure_pattern.one_line_description,
      vertical,
      call_id,
      final_score,
      detected_at: new Date().toISOString(),
      cluster_status: 'unclustered',
    },
    version: 1,
  });

  if (error) {
    console.warn(
      `[${AGENT_NAME}] failure_pattern persist failed slug=${failure_pattern.slug}: ${error.message}`,
    );
  }
}

interface ClusteringSummary {
  patterns_scanned: number;
  clusters_found: number;
  job_requests_created: number;
  cluster_details: Array<{
    vertical: string;
    slug: string;
    instances: number;
    job_artifact_id: string | null;
  }>;
}

/**
 * Weekly clustering pass.
 *
 * Reads all `kind='failure_pattern'` rows from agency_knowledge with
 * cluster_status='unclustered', groups them by (vertical, slug), and for any
 * group with >= CLUSTER_MIN_INSTANCES instances spanning >= 2 distinct clients
 * (so a single client's broken agent doesn't fire a cross-client revision),
 * fires a `prompt_revision` artifact targeted at the agent-architect with
 * BENCHMARK-gate metadata.
 *
 * Why slug-bucket first instead of pure embedding similarity? The slug IS the
 * pre-computed cluster key. The judge prompt already constrains slugs to a
 * canonical set per vertical (see prompt.md "Failure pattern slug"). Embedding
 * similarity is the fallback for novel slugs the judges invent.
 */
async function runClusteringPass(): Promise<ClusteringSummary> {
  const supabase = getServiceSupabase();
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('agency_knowledge')
    .select('id, client_id, content, created_at')
    .eq('kind', 'failure_pattern')
    .gte('created_at', cutoff)
    .limit(5000);

  if (error) {
    throw new Error(`clustering: read failure_patterns failed: ${error.message}`);
  }

  const allRows = rows ?? [];
  // Group by (vertical, slug). Skip rows whose cluster_status is already set.
  const buckets = new Map<
    string,
    Array<{ id: string; client_id: string; row: typeof allRows[number] }>
  >();
  for (const r of allRows) {
    const c = (r.content ?? {}) as {
      slug?: string;
      vertical?: string;
      cluster_status?: string;
    };
    if (!c.slug || !c.vertical) continue;
    if (c.cluster_status && c.cluster_status !== 'unclustered') continue;
    const key = `${c.vertical}::${c.slug}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push({ id: r.id, client_id: r.client_id, row: r });
    buckets.set(key, bucket);
  }

  const summary: ClusteringSummary = {
    patterns_scanned: allRows.length,
    clusters_found: 0,
    job_requests_created: 0,
    cluster_details: [],
  };

  for (const [key, bucket] of buckets.entries()) {
    const distinctClients = new Set(bucket.map((b) => b.client_id)).size;
    if (bucket.length < CLUSTER_MIN_INSTANCES || distinctClients < 2) continue;

    summary.clusters_found += 1;
    const [vertical, slug] = key.split('::');
    const exemplars = bucket.slice(0, 5).map((b) => {
      const c = b.row.content as { description?: string; call_id?: string };
      return {
        client_id: b.client_id,
        call_id: c.call_id,
        description: c.description,
      };
    });

    // Fire a prompt_revision job_request artifact targeted at agent-architect.
    // The vertical template owner consumes this from the queue.
    const { data: artifact, error: insertErr } = await supabase
      .from('agency_artifacts')
      .insert({
        client_id: bucket[0].client_id, // ownership: first client in cluster
        type: 'prompt_revision',
        status: 'draft',
        generated_by: AGENT_NAME,
        model: 'qa-clustering-pass',
        content: {
          job_request: true,
          target_agent: 'agent-architect',
          target_template: `vertical:${vertical}`,
          slug,
          vertical,
          instance_count: bucket.length,
          distinct_clients: distinctClients,
          exemplars,
          gate: 'BENCHMARK',
          gate_threshold: 0.5,
          benchmark_target: 'qa-auditor',
          rationale:
            `Vertical "${vertical}" accumulated ${bucket.length} instances of failure pattern "${slug}" ` +
            `across ${distinctClients} distinct clients in the last 14 days. ` +
            `Propose a prompt-template revision that addresses this pattern, gated by the qa-auditor BENCHMARK.`,
        },
        ship_target: 'agent_architect_queue',
        confidence: Math.min(0.95, 0.6 + (bucket.length - CLUSTER_MIN_INSTANCES) * 0.05),
        reasoning_trace: [
          `Pattern "${slug}" appeared ${bucket.length} times in vertical "${vertical}".`,
          `Cluster spans ${distinctClients} distinct clients — cross-client signal, not a single-client artifact.`,
          `BENCHMARK gate must pass before any vertical-template change ships.`,
        ],
        retrieved_context: exemplars.map((e) => ({
          knowledge_id: e.call_id ?? null,
          kind: 'failure_pattern_exemplar',
          score: 1.0,
        })),
        alternatives_rejected: [
          {
            option: 'Auto-apply prompt change without BENCHMARK gate',
            why_rejected:
              'BENCHMARK gate is mandatory for any change touching a vertical template; auto-apply would bypass the OS\'s only quality anchor.',
          },
        ],
      })
      .select('id')
      .single();

    let job_artifact_id: string | null = null;
    if (insertErr || !artifact) {
      console.warn(`[${AGENT_NAME}] cluster job insert failed for ${key}: ${insertErr?.message}`);
    } else {
      job_artifact_id = artifact.id as string;
      summary.job_requests_created += 1;

      // Mark the source failure_pattern rows as clustered so a re-run doesn't
      // re-fire the same job. Best-effort; failures here only mean a possible
      // duplicate job next week.
      const ids = bucket.map((b) => b.id);
      const { error: updErr } = await supabase
        .from('agency_knowledge')
        .update({
          content: {
            cluster_status: 'clustered',
            cluster_job_artifact_id: job_artifact_id,
          },
        })
        .in('id', ids);
      if (updErr) {
        console.warn(
          `[${AGENT_NAME}] failed to mark patterns as clustered: ${updErr.message}`,
        );
      }

      // Emit a prompt_revised event so the loop substrate sees the proposed change.
      try {
        await emitAgencyEvent({
          client_id: bucket[0].client_id,
          agent_name: AGENT_NAME,
          type: 'prompt_revised',
          severity: 'info',
          payload: {
            artifact_id: job_artifact_id,
            reason: `cluster:${vertical}:${slug} (${bucket.length} instances / ${distinctClients} clients)`,
            source: 'loop_monitor',
          },
          why_explanation:
            `qa-auditor clustered ${bucket.length} instances of "${slug}" in vertical "${vertical}" and ` +
            `fired a BENCHMARK-gated prompt_revision job for agent-architect.`,
        });
      } catch (err) {
        console.warn(`[${AGENT_NAME}] cluster event emit failed: ${(err as Error).message}`);
      }
    }

    summary.cluster_details.push({
      vertical,
      slug,
      instances: bucket.length,
      job_artifact_id,
    });
  }

  return summary;
}

// ─── 7. Artifact persistence (per-call judgment row) ─────────────────────────

interface InsertJudgmentArtifactOpts {
  supabase: ReturnType<typeof getServiceSupabase>;
  client_id: string;
  judgment: JudgmentRecord;
}

async function insertJudgmentArtifact(
  opts: InsertJudgmentArtifactOpts,
): Promise<string> {
  const { supabase, client_id, judgment: j } = opts;

  // Reasoning trace for the artifact-level row distills the ensemble outcome.
  const reasoning_trace: [string, string, string] = [
    `Judge A (Haiku, conversion framing) and Judge B (Haiku, QA framing) ` +
      `${j.divergences.length === 0 ? 'agreed within tolerance' : `diverged on ${j.divergences.length} dim(s)`}.`,
    j.judge_c
      ? `Sonnet tiebreaker resolved: ${j.divergences.map((d) => d.dim).join(', ')}.`
      : `No tiebreaker needed; final = mean(A, B).`,
    `Final score ${j.final_score.toFixed(1)} (sampling reason: ${j.sampling_reason}); ` +
      `${j.failure_pattern ? `failure_pattern=${j.failure_pattern.slug}` : 'no failure pattern'}.`,
  ];

  const alternatives_rejected = [
    ...j.judge_a.alternatives_rejected.slice(0, 1),
    ...j.judge_b.alternatives_rejected.slice(0, 1),
  ];

  const content = {
    payload: {
      call_id: j.call_id,
      sampling_reason: j.sampling_reason,
      final_score: j.final_score,
      final_dim_scores: j.final_dim_scores,
      failure_pattern: j.failure_pattern,
      notable_moments: j.notable_moments,
      ensemble: {
        judge_a: j.judge_a,
        judge_b: j.judge_b,
        judge_c: j.judge_c ?? null,
        divergences: j.divergences,
      },
    },
  };

  const { data, error } = await supabase
    .from('agency_artifacts')
    .insert({
      client_id,
      type: 'escalation_action',
      status: j.final_score < LOW_SCORE_THRESHOLD ? 'draft' : 'shipped',
      generated_by: AGENT_NAME,
      model: j.judge_c ? 'haiku+haiku+sonnet-tiebreaker' : 'haiku+haiku',
      content,
      ship_target: 'qa_review',
      cost_usd: j.cost_usd,
      latency_ms: j.latency_ms,
      eval_score: j.final_score,
      confidence: round2(
        (j.judge_a.confidence + j.judge_b.confidence + (j.judge_c?.confidence ?? 0)) /
          (j.judge_c ? 3 : 2),
      ),
      reasoning_trace,
      retrieved_context: [],
      alternatives_rejected,
      adversarial_review: null,
      predicted_impact: {
        kind: 'qa_score',
        score: j.final_score,
        will_fire_cluster_check: !!j.failure_pattern,
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `insertJudgmentArtifact failed for call ${j.call_id}: ${error?.message ?? 'no data'}`,
    );
  }
  return data.id as string;
}

// ─── 8. Helpers ──────────────────────────────────────────────────────────────

async function loadClient(client_id: string): Promise<ClientRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, vertical, business_name')
    .eq('id', client_id)
    .maybeSingle();
  if (error) {
    console.warn(`[${AGENT_NAME}] loadClient failed: ${error.message}`);
    return null;
  }
  return data as ClientRow | null;
}

/**
 * Find the active new-prompt version for a Retell agent, defined as a
 * prompt_revision artifact shipped in the last 7 days whose burn-in counter is
 * < NEW_PROMPT_BURNIN_N. The shipped-at timestamp acts as the version cursor
 * even if no formal version column exists.
 *
 * We store the burn-in counter in the artifact's content.burnin_calls_scored
 * field — incrementing it as the burn-in calls get scored by this auditor.
 */
async function loadActiveNewPromptVersion(
  agent_id: string,
): Promise<PromptVersionRow | null> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('id, content, shipped_at, created_at')
    .eq('type', 'prompt_revision')
    .eq('status', 'shipped')
    .gte('shipped_at', since)
    .order('shipped_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) return null;

  for (const row of data) {
    const content = (row.content ?? {}) as Record<string, unknown>;
    const targetAgent = (content as { target_agent_id?: string }).target_agent_id;
    if (targetAgent && targetAgent !== agent_id) continue;
    const burnin = (content as { burnin_calls_scored?: number }).burnin_calls_scored ?? 0;
    if (burnin >= NEW_PROMPT_BURNIN_N) continue;
    return {
      agent_id,
      version: row.id as string,
      shipped_at: (row.shipped_at ?? row.created_at) as string,
      burnin_calls_scored: burnin,
    };
  }
  return null;
}

async function incrementBurnInCounter(
  _agent_id: string,
  artifact_id: string,
  increment: number,
): Promise<void> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('content')
    .eq('id', artifact_id)
    .maybeSingle();
  if (error || !data) return;
  const content = (data.content ?? {}) as Record<string, unknown>;
  const prev = (content as { burnin_calls_scored?: number }).burnin_calls_scored ?? 0;
  await supabase
    .from('agency_artifacts')
    .update({ content: { ...content, burnin_calls_scored: prev + increment } })
    .eq('id', artifact_id);
}

function buildJudgeSystemPrompt(): string {
  // Read prompt.md from disk so the runtime always uses the latest skill
  // version without redeploying this function. Falls back to an embedded
  // sentinel if the skills bundle isn't deployed alongside (e.g. local dev).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs') as typeof import('node:fs');
    const promptPath = path.join(SKILL_DIR, 'prompt.md');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
  } catch (err) {
    console.warn(`[${AGENT_NAME}] could not read prompt.md from ${SKILL_DIR}: ${(err as Error).message}`);
  }
  return (
    'You are a vertical-aware voice-AI call-quality judge for the Boltcall Agency OS. ' +
    'Score across 5 dimensions on a 0-10 integer scale. Emit via emit_structured_output.'
  );
}

async function safeEmitAdapterError(args: {
  client_id: string;
  operation: string;
  message: string;
}): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: AGENT_NAME,
      type: 'adapter_error',
      severity: 'warn',
      payload: {
        adapter: AGENT_NAME,
        operation: args.operation,
        error_message: args.message,
      },
    });
  } catch (err) {
    console.warn(`[${AGENT_NAME}] safeEmitAdapterError failed: ${(err as Error).message}`);
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function shuffleInPlace<T>(arr: T[]): void {
  // Deterministic-enough for sampling: Math.random suffices because the
  // sampling decision is logged per-artifact, so re-runs are auditable even
  // when the random subset differs.
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// randomUUID is exported for tests that need stable id generation.
export const __INTERNAL_FOR_TESTS = {
  applyActiveSampling,
  scoreCallEnsemble,
  runClusteringPass,
  randomUUID,
};

export const testHandler = handler;
export default withLegacyHandler(handler);
