import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-optimization-strategist
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Monthly cron entry point. For each live agency client, generates 3 ready-to-
 * launch shadow-split experiments via a 3-step causal pipeline:
 *
 *   STEP 1 — Counterfactual baseline (cekura.playbackHistoricalCalls)
 *            Replay the last 30 days of real calls against:
 *              - current (control)
 *              - more_aggressive_booking
 *              - more_qualifying_question
 *            Each call gets a qa_score; deltas vs control = predicted lift.
 *
 *   STEP 2 — Cross-client RAG over agency_knowledge.kind='case_study'
 *            Pull top 3 anonymized priors most similar by vertical + maturity
 *            + KPI shape. Used to widen / tighten the per-client CI.
 *
 *   STEP 3 — runAgent() with Opus 4.7 — emits an experiment_plan artifact.
 *            Adversarial critic + cross-cutting fields + dedicated kernel
 *            columns are all handled by the harness.
 *
 * On founder approval (separate ship handler), each experiment is handed to
 * the existing W4 shadow-rollout infra: retell-shadow-promote inserts a row
 * into retell_prompt_versions with status='cekura_passed', then mounts the
 * variant at shadow_split_pct of traffic. retell-shadow-monitor polls every
 * 4h and either auto-promotes or auto-reverts via the rollback_trigger.
 *
 * Trigger: Netlify scheduled function — `monthly-optimization` workflow fires
 * this per client on the 1st of every month at 09:00 client-local. Also
 * callable manually via POST { client_id } for ad-hoc reruns.
 *
 * Cost ceiling: <$0.40/client/run (Opus brief ~$0.20 + ~30 cekura playback
 * calls @ $0.006 avg = $0.18). Hard-cap via MAX_PLAYBACK_CALLS.
 */

import path from 'node:path';
import type { Handler } from '@netlify/functions';

import {
  runAgent,
  type RunAgentResult,
} from './_shared/agency-agents/run-agent';
import { listRecentCalls } from './_shared/agency-adapters/retell-adapter';
import { playbackHistoricalCalls } from './_shared/agency-adapters/cekura-adapter';
import { retrieve } from './_shared/agency-knowledge/retrieve';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getServiceSupabase } from './_shared/token-utils';
import { authorizeRunner } from './_shared/agency-runner-auth';

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_NAME = 'optimization-strategist';
const ARTIFACT_TYPE = 'experiment_plan' as const;
const SKILL_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'Marketing',
  'strategy',
  'skills',
  'agency-fleet',
  AGENT_NAME,
);

// Hard cap on per-variant playback calls — keeps cost bounded.
const MAX_PLAYBACK_CALLS = 30;
const LOOKBACK_DAYS = 30;
const SHIP_TARGET = 'retell_shadow_split';
const KNOWLEDGE_TOP_K = 8;
const VERTICAL_FORBIDDEN_AGGRESSIVE = new Set([
  'legal',
  'medical',
  'med_spa',
  'cosmetic_dental',
]);
const VERTICAL_REQUIRES_TRIAGE = new Set(['hvac', 'plumbing']);

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  vertical: string | null;
  business_name: string | null;
  signed_up_at: string | null;
  status: string;
}

interface PlaybackVariantResult {
  variant_label:
    | 'current'
    | 'more_aggressive_booking'
    | 'more_qualifying_question';
  sample_size: number;
  avg_qa_score: number;
  avg_qa_score_delta_vs_baseline: number;
  booked_pct: number;
  top_failure_modes: string[];
}

interface CaseStudyPrior {
  case_study_id: string;
  structural_pattern: string;
  vertical_match: string;
  maturity_match: string;
  lift_central_pct: number;
  lift_ci_80_low: number;
  lift_ci_80_high: number;
  sample_n: number;
  similarity_score: number;
}

interface FailurePattern {
  pattern: string;
  count: number;
}

interface StrategistInput {
  client_profile: {
    client_id: string;
    vertical: string;
    business_name: string;
    signed_up_at: string;
    current_kpis_30d: {
      calls_total: number;
      calls_answered: number;
      bookings_made: number;
      booking_rate_pct: number;
      avg_qa_score: number;
      transfer_rate_pct: number;
      hangup_rate_pct: number;
    };
  };
  current_prompt: string;
  playback_results: PlaybackVariantResult[];
  case_study_priors: CaseStudyPrior[];
  recent_failure_patterns: FailurePattern[];
  vertical_template_constraints: {
    forbidden_variants: string[];
    required_disclaimers: string[];
    notes: string;
  };
}

interface ExperimentOut {
  experiment_id: string;
  hypothesis: string;
  prompt_diff: {
    lines_added: string[];
    lines_removed: string[];
    full_new_prompt: string;
  };
  predicted_lift_pct: number;
  ci_80_low: number;
  ci_80_high: number;
  benchmark_scenario: string;
  rollback_trigger: {
    metric: string;
    threshold: number;
    direction: 'above' | 'below';
    window_hours: number;
  };
  shadow_split_pct: number;
  evaluation_window_hours: number;
  promotion_criterion: string;
  addresses_failure_patterns: string[];
  cross_client_evidence: string;
}

interface StrategistOutput {
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ name: string; why_rejected: string }>;
  predicted_impact: {
    metric: string;
    central_estimate_pct: number;
    ci_80_low: number;
    ci_80_high: number;
  };
  client_facing_note: string;
  playback_summary: {
    sample_size: number;
    baseline_avg_qa_score: number;
    variant_aggressive_qa_score?: number;
    variant_qualifying_qa_score?: number;
    best_variant_label: string;
  };
  experiments: ExperimentOut[];
}

// ─── Output schema (matches output-schema.json on disk) ─────────────────────
// We declare it inline so the runner can pass a typed JsonSchemaObject and
// also so the harness's on-disk-vs-caller sanity check matches.

const OUTPUT_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning_trace: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string', minLength: 1 },
    },
    alternatives_rejected: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          why_rejected: { type: 'string', minLength: 1 },
        },
        required: ['name', 'why_rejected'],
      },
    },
    predicted_impact: {
      type: 'object',
      additionalProperties: false,
      properties: {
        metric: {
          type: 'string',
          enum: ['qa_score', 'booking_rate', 'transfer_rate', 'hangup_rate'],
        },
        central_estimate_pct: { type: 'number' },
        ci_80_low: { type: 'number' },
        ci_80_high: { type: 'number' },
      },
      required: ['metric', 'central_estimate_pct', 'ci_80_low', 'ci_80_high'],
    },
    client_facing_note: { type: 'string' },
    playback_summary: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sample_size: { type: 'integer', minimum: 0 },
        baseline_avg_qa_score: { type: 'number' },
        variant_aggressive_qa_score: { type: 'number' },
        variant_qualifying_qa_score: { type: 'number' },
        best_variant_label: {
          type: 'string',
          enum: [
            'current',
            'more_aggressive_booking',
            'more_qualifying_question',
            'tie',
            'none',
          ],
        },
      },
      required: ['sample_size', 'baseline_avg_qa_score', 'best_variant_label'],
    },
    experiments: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          experiment_id: { type: 'string' },
          hypothesis: { type: 'string', minLength: 20 },
          prompt_diff: {
            type: 'object',
            additionalProperties: false,
            properties: {
              lines_added: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
              },
              lines_removed: { type: 'array', items: { type: 'string' } },
              full_new_prompt: { type: 'string', minLength: 50 },
            },
            required: ['lines_added', 'lines_removed', 'full_new_prompt'],
          },
          predicted_lift_pct: { type: 'number', minimum: -50, maximum: 25 },
          ci_80_low: { type: 'number' },
          ci_80_high: { type: 'number' },
          benchmark_scenario: { type: 'string', minLength: 80 },
          rollback_trigger: {
            type: 'object',
            additionalProperties: false,
            properties: {
              metric: {
                type: 'string',
                enum: [
                  'qa_score',
                  'booking_rate',
                  'transfer_rate',
                  'hangup_rate',
                ],
              },
              threshold: { type: 'number' },
              direction: { type: 'string', enum: ['above', 'below'] },
              window_hours: { type: 'integer', minimum: 6, maximum: 168 },
            },
            required: ['metric', 'threshold', 'direction', 'window_hours'],
          },
          shadow_split_pct: { type: 'integer', minimum: 5, maximum: 25 },
          evaluation_window_hours: {
            type: 'integer',
            minimum: 24,
            maximum: 168,
          },
          promotion_criterion: { type: 'string', minLength: 20 },
          addresses_failure_patterns: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 },
          },
          cross_client_evidence: { type: 'string', minLength: 10 },
        },
        required: [
          'experiment_id',
          'hypothesis',
          'prompt_diff',
          'predicted_lift_pct',
          'ci_80_low',
          'ci_80_high',
          'benchmark_scenario',
          'rollback_trigger',
          'shadow_split_pct',
          'evaluation_window_hours',
          'promotion_criterion',
          'addresses_failure_patterns',
          'cross_client_evidence',
        ],
      },
    },
  },
  required: [
    'confidence',
    'reasoning_trace',
    'alternatives_rejected',
    'predicted_impact',
    'client_facing_note',
    'playback_summary',
    'experiments',
  ],
};

// ─── KILLER FEATURE — 3-step causal pipeline ────────────────────────────────

/**
 * STEP 1 — counterfactual baseline.
 *
 * Pull the last 30 days of real calls via retell-adapter.listRecentCalls, then
 * fan out three cekura.playbackHistoricalCalls runs (current / more_aggressive /
 * more_qualifying), each scored. Returns one PlaybackVariantResult per variant.
 *
 * Variant prompts are vertical-aware: legal/medical/med-spa skip the
 * aggressive variant and substitute a "more_disclaiming" variant (still
 * labeled more_aggressive_booking in the output for schema consistency, but
 * the content is the disclaiming version).
 */
async function step1_counterfactualBaseline(args: {
  client: ClientRow;
  current_prompt: string;
  retell_agent_id: string;
}): Promise<{
  results: PlaybackVariantResult[];
  call_count: number;
  baseline_qa: number;
}> {
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 86400_000,
  ).toISOString();

  // Pull recent calls (Retell adapter handles auth + retry + event emission).
  const recent = await listRecentCalls({
    agent_id: args.retell_agent_id,
    since,
    limit: MAX_PLAYBACK_CALLS,
    client_id: args.client.id,
  });

  if (recent.length === 0) {
    console.warn(
      `[${AGENT_NAME}] no recent calls for client ${args.client.id} — counterfactual baseline empty`,
    );
    return { results: [], call_count: 0, baseline_qa: 0 };
  }

  const call_ids = recent.map((c) => c.call_id);

  // Build the three candidate prompts — vertical-aware.
  const variants = buildCandidateVariants({
    vertical: args.client.vertical ?? 'other',
    current_prompt: args.current_prompt,
  });

  // Fan out playback in parallel. Each call hits Cekura through the adapter,
  // which already emits cost + digital_twin_run_completed events.
  const playbacks = await Promise.all(
    variants.map(async (v) => {
      try {
        const result = await playbackHistoricalCalls({
          client_id: args.client.id,
          historical_call_ids: call_ids,
          against_agent_config: { prompt: v.prompt, kb: null },
        });
        return { variant_label: v.label, diffs: result.diffs };
      } catch (err) {
        console.warn(
          `[${AGENT_NAME}] playback variant ${v.label} failed (non-fatal): ${
            (err as Error).message
          }`,
        );
        return {
          variant_label: v.label,
          diffs: [] as Awaited<
            ReturnType<typeof playbackHistoricalCalls>
          >['diffs'],
        };
      }
    }),
  );

  // Aggregate. Use the "current" variant as the baseline anchor; the other
  // variants get their delta computed against current's average.
  const currentRun = playbacks.find((p) => p.variant_label === 'current');
  const baselineCounterfactualQa = currentRun
    ? avg(
        currentRun.diffs.map((d) =>
          // counterfactual qa_score = original_score + qa_score_delta
          // We don't have original_score directly; the delta is what we have.
          // Use delta as a proxy — the absolute number is less important than
          // the cross-variant ordering for the strategist.
          d.qa_score_delta,
        ),
      )
    : 0;

  const results: PlaybackVariantResult[] = playbacks.map((p) => {
    const deltas = p.diffs.map((d) => d.qa_score_delta);
    const variantQa = avg(deltas);
    const bookedCount = p.diffs.filter(
      (d) => d.counterfactual_outcome === 'booked',
    ).length;

    return {
      variant_label: p.variant_label,
      sample_size: p.diffs.length,
      avg_qa_score: round2(variantQa),
      avg_qa_score_delta_vs_baseline: round2(
        variantQa - baselineCounterfactualQa,
      ),
      booked_pct: p.diffs.length
        ? round2((bookedCount / p.diffs.length) * 100)
        : 0,
      top_failure_modes: extractFailureModes(p.diffs),
    };
  });

  return {
    results,
    call_count: recent.length,
    baseline_qa: round2(baselineCounterfactualQa),
  };
}

/**
 * STEP 2 — cross-client case-study RAG.
 *
 * Query agency_knowledge.kind='case_study' for the most-similar anonymized
 * patterns, ranked by vertical + maturity. The retrieve() helper handles the
 * embedding generation + pgvector similarity query.
 *
 * We pass client_id of the CURRENT client (not OS-level) because that's how
 * retrieve() is contracted; the case_study filter restricts kind to anonymized
 * cross-client priors which are still surfaced to any client by design.
 */
async function step2_caseStudyRAG(args: {
  client: ClientRow;
  failure_patterns: FailurePattern[];
  baseline_qa: number;
}): Promise<CaseStudyPrior[]> {
  // Build a query that biases retrieval toward the client's vertical and
  // current failure patterns. The retriever does the semantic match.
  const vertical = args.client.vertical ?? 'general';
  const failureBlob = args.failure_patterns
    .slice(0, 5)
    .map((p) => p.pattern)
    .join(', ');
  const maturity = inferMaturityBucket(args.client.signed_up_at);

  const query = [
    `vertical:${vertical}`,
    `maturity:${maturity}`,
    `baseline_qa:${args.baseline_qa.toFixed(1)}`,
    `failure_patterns:${failureBlob || 'none'}`,
    'prompt-revision case studies that lifted booking_rate or qa_score',
  ].join(' | ');

  let chunks: Awaited<ReturnType<typeof retrieve>>['chunks'] = [];
  try {
    const result = await retrieve({
      client_id: args.client.id,
      query_text: query,
      kinds: ['case_study'],
      k: KNOWLEDGE_TOP_K,
    });
    chunks = result.chunks;
  } catch (err) {
    console.warn(
      `[${AGENT_NAME}] case-study retrieve failed (non-fatal): ${
        (err as Error).message
      }`,
    );
    return [];
  }

  // Convert each chunk to a CaseStudyPrior. Case studies are stored as jsonb
  // with structural_pattern + lift_central_pct + lift_ci + sample_n fields.
  // Missing fields fall back to conservative defaults so the strategist still
  // gets directional signal.
  const priors: CaseStudyPrior[] = chunks
    .map((c) => {
      const content = (c.content ?? {}) as Record<string, unknown>;
      return {
        case_study_id: c.id,
        structural_pattern: String(
          content.structural_pattern ?? content.title ?? 'unknown_pattern',
        ),
        vertical_match: String(content.vertical ?? vertical),
        maturity_match: String(content.maturity ?? maturity),
        lift_central_pct: numberOr(content.lift_central_pct, 0),
        lift_ci_80_low: numberOr(content.lift_ci_80_low, 0),
        lift_ci_80_high: numberOr(content.lift_ci_80_high, 0),
        sample_n: integerOr(content.sample_n, 0),
        similarity_score: round2(c.score ?? 0),
      };
    })
    .slice(0, 3); // Top 3 — keeps the prompt context focused.

  return priors;
}

/**
 * STEP 3 — runAgent harness call.
 *
 * Build the StrategistInput, hand it to the runAgent harness which handles
 * model routing (force Opus), RAG pre-pass, schema enforcement, adversarial
 * critic, cross-cutting field injection, artifact insert with predicted_impact
 * column, and event emission. Returns the artifact_id + structured output.
 *
 * Post-run we (a) populate experiment_ids with real uuids and re-persist them
 * on the artifact's content jsonb, and (b) emit the canonical
 * `optimization_brief_queued` event with experiment_count + highest_predicted_lift
 * so the queue UI can rank by predicted impact.
 */
async function step3_runAgent(args: {
  client: ClientRow;
  current_prompt: string;
  playback_results: PlaybackVariantResult[];
  case_study_priors: CaseStudyPrior[];
  failure_patterns: FailurePattern[];
  current_kpis: StrategistInput['client_profile']['current_kpis_30d'];
}): Promise<RunAgentResult<StrategistOutput>> {
  const verticalConstraints = buildVerticalConstraints(
    args.client.vertical ?? 'other',
    args.current_prompt,
  );

  const input: StrategistInput = {
    client_profile: {
      client_id: args.client.id,
      vertical: args.client.vertical ?? 'other',
      business_name: args.client.business_name ?? '(unknown)',
      signed_up_at: args.client.signed_up_at ?? new Date().toISOString(),
      current_kpis_30d: args.current_kpis,
    },
    current_prompt: args.current_prompt,
    playback_results: args.playback_results,
    case_study_priors: args.case_study_priors,
    recent_failure_patterns: args.failure_patterns,
    vertical_template_constraints: verticalConstraints,
  };

  const router_summary = [
    `optimization-strategist monthly brief for ${input.client_profile.vertical} client`,
    `playback_n=${args.playback_results.reduce(
      (s, p) => s + p.sample_size,
      0,
    )}`,
    `failure_patterns=${args.failure_patterns.length}`,
    `case_study_priors=${args.case_study_priors.length}`,
  ].join('; ');

  const result = await runAgent<StrategistInput, StrategistOutput>({
    agent_name: AGENT_NAME,
    client_id: args.client.id,
    input,
    skill_dir: SKILL_DIR,
    output_schema: OUTPUT_SCHEMA,
    artifact_type: ARTIFACT_TYPE,
    ship_target: SHIP_TARGET,
    // This is strategic work — force Opus regardless of router.
    model_hint: 'opus',
    agent_default_tier: 'opus',
    adversarial_critic: true,
    max_iterations: 1,
    knowledge_k: KNOWLEDGE_TOP_K,
    knowledge_query: `vertical:${input.client_profile.vertical} prompt experimentation case studies`,
    router_summary,
  });

  return result;
}

/**
 * Post-process: assign real experiment_ids, persist them to the artifact, and
 * emit the canonical optimization_brief_queued event with experiment_count +
 * highest_predicted_lift so the queue can rank items.
 */
async function postProcessArtifact(args: {
  client_id: string;
  artifact_id: string;
  output: StrategistOutput;
}): Promise<{ experiment_ids: string[]; highest_predicted_lift: number }> {
  const experiment_ids = args.output.experiments.map(() => crypto.randomUUID());
  const stamped = args.output.experiments.map((exp, i) => ({
    ...exp,
    experiment_id: experiment_ids[i],
  }));

  // Update content.payload.experiments with the stamped versions. We do NOT
  // overwrite the cross-cutting epistemic columns — those were already
  // populated by the harness.
  const supabase = getServiceSupabase();
  const { data: existing, error: readErr } = await supabase
    .from('agency_artifacts')
    .select('content')
    .eq('id', args.artifact_id)
    .single();

  if (!readErr && existing) {
    const content = (existing.content ?? {}) as Record<string, unknown>;
    const payload = ((content.payload ?? {}) as Record<string, unknown>);
    payload.experiments = stamped;
    const newContent = { ...content, payload };

    const { error: updErr } = await supabase
      .from('agency_artifacts')
      .update({ content: newContent })
      .eq('id', args.artifact_id);
    if (updErr) {
      console.warn(
        `[${AGENT_NAME}] failed to stamp experiment_ids onto artifact ${args.artifact_id}: ${updErr.message}`,
      );
    }
  }

  const highest_predicted_lift =
    args.output.experiments.length > 0
      ? Math.max(...args.output.experiments.map((e) => e.predicted_lift_pct))
      : 0;

  // Emit the canonical optimization_brief_queued event with the real
  // experiment_count (the harness emits a default with experiment_count=0
  // because it doesn't know our output shape — we overwrite here).
  try {
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: AGENT_NAME,
      type: 'optimization_brief_queued',
      severity: 'info',
      payload: {
        artifact_id: args.artifact_id,
        experiment_count: args.output.experiments.length,
        highest_predicted_lift,
      },
      why_explanation: `optimization-strategist queued ${args.output.experiments.length} experiment(s) for ${args.client_id}; top predicted lift ${highest_predicted_lift}%`,
    });
  } catch (err) {
    console.warn(
      `[${AGENT_NAME}] optimization_brief_queued event failed (non-fatal): ${
        (err as Error).message
      }`,
    );
  }

  return { experiment_ids, highest_predicted_lift };
}

// ─── Vertical-aware variant builder ─────────────────────────────────────────

interface CandidateVariant {
  label: PlaybackVariantResult['variant_label'];
  prompt: string;
}

function buildCandidateVariants(args: {
  vertical: string;
  current_prompt: string;
}): CandidateVariant[] {
  const current: CandidateVariant = {
    label: 'current',
    prompt: args.current_prompt,
  };

  // Qualifying-question variant — universally safe across verticals.
  const qualifying: CandidateVariant = {
    label: 'more_qualifying_question',
    prompt: [
      args.current_prompt,
      '',
      '# OVERRIDE — More-Qualifying variant',
      'BEFORE quoting any price or making any commitment, ask ONE qualifier:',
      "'Quick one — are you exploring options today or ready to book?' Pause for response.",
      'If "exploring": pivot to a 90-second value statement + offer the consult slot. Do NOT quote price.',
      'If "ready to book" or unclear: proceed normally.',
    ].join('\n'),
  };

  // Aggressive-booking variant — REPLACED by more_disclaiming for regulated
  // verticals. Schema field still says 'more_aggressive_booking' for
  // consistency; content shifts.
  const isForbiddenAggressive = VERTICAL_FORBIDDEN_AGGRESSIVE.has(args.vertical);
  const aggressive: CandidateVariant = {
    label: 'more_aggressive_booking',
    prompt: isForbiddenAggressive
      ? [
          args.current_prompt,
          '',
          '# OVERRIDE — More-Disclaiming variant (substituted for regulated vertical)',
          'Front-load any required disclaimer. Repeat it before any treatment or service description.',
          'Use phrase: "Just so you know upfront — [disclaimer]. With that said, here is what we can do..."',
        ].join('\n')
      : [
          args.current_prompt,
          '',
          '# OVERRIDE — More-Aggressive Booking variant',
          'Attempt to book within the first 3 turns. Do not wait for the caller to ask about availability.',
          'After ANY positive signal (question about services, asking about pricing, hours), pivot immediately to:',
          "'I can hold a spot for you right now — what day works best?'",
        ].join('\n'),
  };

  return [current, qualifying, aggressive];
}

function buildVerticalConstraints(
  vertical: string,
  current_prompt: string,
): StrategistInput['vertical_template_constraints'] {
  const forbidden: string[] = [];
  const required_disclaimers: string[] = [];
  const notes: string[] = [];

  if (VERTICAL_FORBIDDEN_AGGRESSIVE.has(vertical)) {
    forbidden.push('more_aggressive_booking');
    notes.push(
      `${vertical} is regulated — aggressive booking variants are forbidden by guardrail.`,
    );
  }

  if (vertical === 'med_spa') {
    required_disclaimers.push(
      'Treatments require an in-person consultation',
      'FDA-sensitive language — never promise medical outcomes',
    );
  }
  if (vertical === 'legal') {
    required_disclaimers.push(
      'Not legal advice; this is informational only',
      'No attorney-client relationship is formed by this call',
    );
  }
  if (vertical === 'medical') {
    required_disclaimers.push(
      'Not medical advice; consult your physician',
    );
  }
  if (vertical === 'cosmetic_dental') {
    required_disclaimers.push(
      'Insurance coverage varies; verify with your provider',
    );
  }
  if (VERTICAL_REQUIRES_TRIAGE.has(vertical)) {
    if (!/emergency|urgent|right now/i.test(current_prompt)) {
      notes.push(
        `${vertical} requires emergency_vs_routine triage; current_prompt lacks it — FIRST experiment should add it.`,
      );
    }
  }

  return {
    forbidden_variants: forbidden,
    required_disclaimers,
    notes: notes.join(' '),
  };
}

// ─── Data fetchers ──────────────────────────────────────────────────────────

async function loadClient(client_id: string): Promise<ClientRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, vertical, business_name, signed_up_at, status')
    .eq('id', client_id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ClientRow;
}

async function loadLiveClients(): Promise<ClientRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, vertical, business_name, signed_up_at, status')
    .eq('status', 'live');

  if (error) {
    console.warn(`[${AGENT_NAME}] loadLiveClients failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as ClientRow[];
}

async function loadCurrentPrompt(client_id: string): Promise<{
  prompt: string;
  retell_agent_id: string;
} | null> {
  const supabase = getServiceSupabase();

  // Two paths:
  //   (a) agency_artifacts with type='agent_prompt' status='shipped' (newest)
  //   (b) fall back to `agents` table joined via client mapping
  const { data: art, error: artErr } = await supabase
    .from('agency_artifacts')
    .select('content, ship_result')
    .eq('client_id', client_id)
    .eq('type', 'agent_prompt')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!artErr && art) {
    const content = (art.content ?? {}) as Record<string, unknown>;
    const payload = (content.payload ?? {}) as Record<string, unknown>;
    const ship_result = (art.ship_result ?? {}) as Record<string, unknown>;
    const prompt =
      typeof payload.prompt === 'string'
        ? (payload.prompt as string)
        : typeof payload.full_prompt === 'string'
        ? (payload.full_prompt as string)
        : '';
    const retell_agent_id =
      typeof ship_result.retell_agent_id === 'string'
        ? (ship_result.retell_agent_id as string)
        : '';
    if (prompt && retell_agent_id) {
      return { prompt, retell_agent_id };
    }
  }

  return null;
}

async function loadRecentFailurePatterns(
  client_id: string,
): Promise<FailurePattern[]> {
  const supabase = getServiceSupabase();
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 86400_000,
  ).toISOString();

  // qa-auditor writes failure_pattern via agency_artifacts (type='escalation_action').
  // We count instances by pattern slug.
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('content')
    .eq('client_id', client_id)
    .eq('type', 'escalation_action')
    .eq('generated_by', 'qa-auditor')
    .gte('created_at', since)
    .limit(500);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const content = (row.content ?? {}) as Record<string, unknown>;
    const payload = (content.payload ?? {}) as Record<string, unknown>;
    const fp = payload.failure_pattern;
    if (typeof fp === 'string' && fp.trim()) {
      counts[fp] = (counts[fp] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function loadCurrentKpis(
  client_id: string,
): Promise<StrategistInput['client_profile']['current_kpis_30d']> {
  const supabase = getServiceSupabase();
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 86400_000,
  ).toISOString();

  // call_completed + booking_made events drive the KPI snapshot.
  const { data: events } = await supabase
    .from('agency_events')
    .select('type, payload')
    .eq('client_id', client_id)
    .gte('created_at', since)
    .in('type', ['call_completed', 'booking_made'])
    .limit(2000);

  let calls_total = 0;
  let calls_answered = 0;
  let bookings_made = 0;
  let qa_sum = 0;
  let qa_count = 0;
  let transfer_count = 0;
  let hangup_count = 0;

  for (const e of events ?? []) {
    if (e.type === 'call_completed') {
      calls_total++;
      const p = (e.payload ?? {}) as Record<string, unknown>;
      const outcome = p.outcome as string | undefined;
      if (outcome && outcome !== 'voicemail' && outcome !== 'hangup') {
        calls_answered++;
      }
      if (outcome === 'transferred') transfer_count++;
      if (outcome === 'hangup') hangup_count++;
      const qa = p.qa_score;
      if (typeof qa === 'number') {
        qa_sum += qa;
        qa_count++;
      }
    } else if (e.type === 'booking_made') {
      bookings_made++;
    }
  }

  return {
    calls_total,
    calls_answered,
    bookings_made,
    booking_rate_pct: calls_total
      ? round2((bookings_made / calls_total) * 100)
      : 0,
    avg_qa_score: qa_count ? round2(qa_sum / qa_count) : 0,
    transfer_rate_pct: calls_total
      ? round2((transfer_count / calls_total) * 100)
      : 0,
    hangup_rate_pct: calls_total
      ? round2((hangup_count / calls_total) * 100)
      : 0,
  };
}

// ─── Per-client orchestrator ────────────────────────────────────────────────

async function runForClient(client_id: string): Promise<{
  ok: boolean;
  artifact_id?: string;
  experiment_count?: number;
  highest_predicted_lift?: number;
  reason?: string;
}> {
  const client = await loadClient(client_id);
  if (!client) return { ok: false, reason: 'client_not_found' };
  if (client.status !== 'live')
    return { ok: false, reason: `client_status_${client.status}` };

  const promptInfo = await loadCurrentPrompt(client_id);
  if (!promptInfo)
    return { ok: false, reason: 'no_live_agent_prompt_found' };

  // PARALLEL fetches — these are independent.
  const [step1, failure_patterns, current_kpis] = await Promise.all([
    step1_counterfactualBaseline({
      client,
      current_prompt: promptInfo.prompt,
      retell_agent_id: promptInfo.retell_agent_id,
    }),
    loadRecentFailurePatterns(client_id),
    loadCurrentKpis(client_id),
  ]);

  // STEP 2 depends on baseline_qa from step 1.
  const case_study_priors = await step2_caseStudyRAG({
    client,
    failure_patterns,
    baseline_qa: step1.baseline_qa,
  });

  // STEP 3 — runAgent with full input.
  const result = await step3_runAgent({
    client,
    current_prompt: promptInfo.prompt,
    playback_results: step1.results,
    case_study_priors,
    failure_patterns,
    current_kpis,
  });

  const post = await postProcessArtifact({
    client_id,
    artifact_id: result.artifact_id,
    output: result.output,
  });

  return {
    ok: true,
    artifact_id: result.artifact_id,
    experiment_count: result.output.experiments.length,
    highest_predicted_lift: post.highest_predicted_lift,
  };
}

// ─── Netlify handler ────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  const HEADERS = { 'Content-Type': 'application/json' };

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: HEADERS,
      body: JSON.stringify({ error: authz.message }),
    };
  }

  // Two trigger modes:
  //   - POST { client_id } → ad-hoc single-client run
  //   - GET (or scheduled cron) → iterate all live clients
  if (event.httpMethod === 'POST') {
    let client_id: string;
    try {
      const body = JSON.parse(event.body || '{}');
      client_id = body.client_id;
    } catch {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'invalid_json' }),
      };
    }
    if (!client_id) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'client_id_required' }),
      };
    }
    try {
      const result = await runForClient(client_id);
      return {
        statusCode: result.ok ? 200 : 422,
        headers: HEADERS,
        body: JSON.stringify(result),
      };
    } catch (err) {
      console.error(`[${AGENT_NAME}] runForClient threw:`, err);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          error: 'agent_run_failed',
          message: (err as Error).message,
        }),
      };
    }
  }

  // Cron fan-out: one client at a time so a single failure doesn't poison
  // the whole batch.
  const clients = await loadLiveClients();
  const summaries: Array<{ client_id: string; result: unknown }> = [];
  for (const c of clients) {
    try {
      const r = await runForClient(c.id);
      summaries.push({ client_id: c.id, result: r });
    } catch (err) {
      summaries.push({
        client_id: c.id,
        result: { ok: false, reason: (err as Error).message },
      });
    }
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      ran: clients.length,
      summaries,
    }),
  };
};

// ─── Small utilities ────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function integerOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) ? v : fallback;
}

function extractFailureModes(
  diffs: Awaited<ReturnType<typeof playbackHistoricalCalls>>['diffs'],
): string[] {
  // Cheap heuristic — count outcome differences. Real failure tags would come
  // from a deeper per-call judge, which the qa-auditor handles separately;
  // here we just surface counterfactual outcome distribution as a hint.
  const counts: Record<string, number> = {};
  for (const d of diffs) {
    const o = d.counterfactual_outcome;
    counts[o] = (counts[o] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

function inferMaturityBucket(signed_up_at: string | null): string {
  if (!signed_up_at) return 'unknown';
  const ageMs = Date.now() - Date.parse(signed_up_at);
  if (!Number.isFinite(ageMs)) return 'unknown';
  const ageMonths = ageMs / (30 * 86400_000);
  if (ageMonths < 1) return '0-1mo';
  if (ageMonths < 6) return '0-6mo';
  if (ageMonths < 12) return '6-12mo';
  return '12mo+';
}

export default withLegacyHandler(handler);
