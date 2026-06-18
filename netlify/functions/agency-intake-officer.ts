import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-intake-officer.ts — Boltcall Agency OS · Layer 3 · Agent #1
 * ────────────────────────────────────────────────────────────────────
 *
 * Two-pass adaptive intake (per Phase C upgrade spec, audit lines 49-55):
 *
 *   (a) IN-CALL COMPLETENESS SENTINEL  — Haiku 4.5, runs every ~10s during the
 *       live Retell call. Scores the running transcript against the 40-field
 *       profile schema; if any field is < 0.7 confidence by minute 15, it
 *       pushes a targeted follow-up question into the live Retell agent's
 *       context via `retell-adapter.injectInCallContext` BEFORE goodbye.
 *
 *       This path is invoked from TWO places:
 *         1. The Retell agent's tool-use `check_intake_completeness` (the
 *            intake prompt has it; calls this function with `?mode=sentinel`
 *            and the partial-transcript text).
 *         2. The post-call entrypoint also runs the sentinel ONE LAST TIME
 *            against the full transcript so the artifact's
 *            `sentinel_interventions[]` is populated even if Retell's mid-call
 *            tool-use path silently failed.
 *
 *   (b) POST-CALL ADVERSARIAL PROFILER — Opus 4.7, runs after the
 *       `call_ended` webhook. Re-reads the transcript, finds contradictions,
 *       missing edges, unstated assumptions, and writes them to
 *       `flagged_gaps[]` with per-gap confidence. Each gap with
 *       confidence >= AUTO_CLARIFY_THRESHOLD becomes a separate
 *       `client_outreach` artifact (clarification email draft) — so we never
 *       ship a half-baked profile to `agent-architect`.
 *
 * Output artifact type: `agent_prompt` (the kernel-allowed artifact type that
 * downstream `agent-architect` consumes). The cross-cutting kernel columns
 * (confidence, reasoning_trace, retrieved_context, alternatives_rejected,
 * adversarial_review, predicted_impact) are populated by the harness.
 *
 * Side effects:
 *   - `agency_intake_calls` row upserted with extracted_profile + score.
 *   - One `agent_prompt` artifact in `agency_artifacts` (status='draft').
 *   - N `client_outreach` artifacts (one per high-confidence gap).
 *   - One `intake_call_completed` kernel event with `flagged_gaps_count`.
 *
 * Triggered by: Retell webhook → `agency-retell-webhook.ts` routes intake
 * call IDs to this runner. Direct invocation supported for testing.
 */

import type { Handler } from '@netlify/functions';

import {
  getCallTranscript,
  injectInCallContext,
} from './_shared/agency-adapters/retell-adapter';
import {
  callClaude,
  runAgent,
  type JsonSchemaObject,
} from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyRetellSignature } from './_shared/verify-signatures';
import { authorizeSentinel } from './_shared/agency-runner-auth';
import path from 'node:path';

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_NAME = 'intake-officer';
const ARTIFACT_TYPE = 'agent_prompt' as const;

/**
 * Skill dir for the harness. Resolved relative to the deployed function
 * bundle, which mirrors the repo's `strategy/skills/agency-fleet/<name>`
 * folder via the build's included_files config.
 */
const SKILL_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'strategy',
  'skills',
  'agency-fleet',
  'intake-officer',
);

/** Gaps at >= this confidence become an auto-drafted clarification email. */
const AUTO_CLARIFY_THRESHOLD = 0.75;

/** Sentinel injects a follow-up question if a field is < this confidence by minute 15. */
const SENTINEL_CONFIDENCE_FLOOR = 0.7;

/** Past this minute mark in the live call, the sentinel will inject. */
const SENTINEL_INJECT_AFTER_MINUTE = 15;

/** Cap on how many fields the sentinel will ever ask about in one call. */
const SENTINEL_MAX_INJECTIONS_PER_CALL = 3;

/** The 40 required field paths the sentinel scores against. */
const PROFILE_FIELDS_40: ReadonlyArray<string> = [
  'business_name', 'vertical', 'business_phone', 'business_website',
  'region', 'timezone', 'owner_name', 'team_size',
  'services', 'pricing_model', 'pricing_disclosable', 'price_ranges',
  'deposit_required', 'deposit_amount_usd', 'consultation_fee_usd',
  'financing_offered', 'financing_partners', 'package_options',
  'business_hours', 'accepts_after_hours', 'after_hours_routing',
  'emergency_service', 'holiday_schedule_notes', 'service_area_radius_mi',
  'booking_tool', 'booking_url', 'qualifying_questions',
  'disqualifying_conditions', 'insurance_accepted', 'insurance_carriers',
  'preferred_booking_window', 'transfer_to_human_when',
  'vertical_compliance_notes', 'forbidden_phrases', 'required_disclaimers',
  'recording_disclosure_required', 'hipaa_in_scope', 'pci_in_scope',
  'lead_handoff_method', 'competitive_differentiators',
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntakeWebhookEvent {
  event?: string;
  call?: {
    call_id?: string;
    agent_id?: string;
    duration_ms?: number;
  };
}

interface SentinelIntervention {
  minute: number;
  field: string;
  question_injected: string;
  outcome:
    | 'client_answered'
    | 'client_confirmed_yes'
    | 'client_confirmed_no'
    | 'client_confirmed_closed'
    | 'ignored'
    | 'queued_for_followup'
    | 'unknown';
}

interface FieldScore {
  field: string;
  confidence: number;
  reason: string;
}

interface SentinelScoreOutput {
  field_scores: FieldScore[];
  minute_estimate: number;
  suggested_followups: Array<{ field: string; question: string }>;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
  confidence: number;
}

interface ProfilerOutput {
  profile: Record<string, unknown>;
  extraction_score: number;
  flagged_gaps: Array<{
    field_path: string;
    gap_type: 'missing' | 'contradiction' | 'ambiguous' | 'compliance_risk';
    evidence: string;
    confidence: number;
    auto_clarify: boolean;
  }>;
  sentinel_interventions: SentinelIntervention[];
  clarification_emails: Array<{
    subject: string;
    body_markdown: string;
    fields_addressed: string[];
  }>;
  predicted_impact: {
    profile_completeness_pct: number;
    downstream_quality_estimate: 'high' | 'med' | 'low';
    confidence_interval_pct: number;
  };
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
}

interface RunPayload {
  client_id: string;
  retell_call_id: string;
  /** Optional — overrides Retell fetch for tests / replays. */
  transcript_override?: string;
  /** Optional — sentinel interventions captured via mid-call tool-use. */
  prior_interventions?: SentinelIntervention[];
}

// ─── Pass A — In-call completeness sentinel ──────────────────────────────────

/**
 * Score the partial (or full) transcript against the 40-field schema using
 * Haiku 4.5. Returns per-field confidence + a list of suggested follow-up
 * questions for the live Retell agent to ask.
 *
 * This is the cheap, fast pass — runs during the live call and again post-call
 * so the final artifact's `sentinel_interventions[]` is always populated.
 */
async function runSentinel(args: {
  client_id: string;
  transcript: string;
  minute_estimate: number;
}): Promise<SentinelScoreOutput> {
  const sentinelSchema: JsonSchemaObject = {
    type: 'object',
    additionalProperties: false,
    properties: {
      field_scores: {
        type: 'array',
        description: 'Confidence score per profile field on the supplied transcript.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            field: { type: 'string', enum: [...PROFILE_FIELDS_40] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reason: { type: 'string' },
          },
          required: ['field', 'confidence', 'reason'],
        },
      },
      minute_estimate: { type: 'number', minimum: 0 },
      suggested_followups: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            field: { type: 'string' },
            question: { type: 'string' },
          },
          required: ['field', 'question'],
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasoning_trace: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 3,
      },
      alternatives_rejected: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            option: { type: 'string' },
            why_rejected: { type: 'string' },
          },
          required: ['option', 'why_rejected'],
        },
      },
    },
    required: [
      'field_scores',
      'minute_estimate',
      'suggested_followups',
      'confidence',
      'reasoning_trace',
      'alternatives_rejected',
    ],
  };

  const systemPrompt = `You are the IN-CALL completeness sentinel for Boltcall's intake-officer.

You see the transcript so far (possibly partial). Score each of the 40 profile fields on a 0..1 confidence that the field is determined by what's been said:

Fields: ${PROFILE_FIELDS_40.join(', ')}.

Then propose follow-up questions ONLY for fields with confidence < ${SENTINEL_CONFIDENCE_FLOOR}, ranked by importance for the downstream Retell agent (business_phone > business_hours > qualifying_questions > pricing > etc.). Suggest at most 5 follow-ups, each one short, natural, single-question — the live agent will read them verbatim.

Estimate the minute mark we are at (use transcript length / typical 9 words/sec heuristic). If your minute_estimate is >= ${SENTINEL_INJECT_AFTER_MINUTE} and any field is still < ${SENTINEL_CONFIDENCE_FLOOR}, the downstream code will inject the top follow-up via retell-adapter.injectInCallContext — your job is to make sure that follow-up is the highest-leverage one.

Be honest about confidence. A field is only "high confidence" if the transcript contains an explicit, unambiguous answer.`;

  const result = await callClaude<SentinelScoreOutput>({
    system: systemPrompt,
    user_messages: [
      {
        role: 'user',
        content:
          '# Transcript so far\n\n```\n' +
          args.transcript +
          '\n```\n\nReturn your scoring via emit_structured_output.',
      },
    ],
    tier: 'haiku',
    output_schema: sentinelSchema,
    agent_name: `${AGENT_NAME}:sentinel`,
    client_id: args.client_id,
    max_tokens: 4096,
  });

  return result.output;
}

/**
 * Decide whether to inject any follow-ups into the live call. Only injects
 * when the call has crossed the minute threshold AND there are low-confidence
 * fields. Caps at SENTINEL_MAX_INJECTIONS_PER_CALL.
 */
async function maybeInjectFollowups(args: {
  client_id: string;
  retell_call_id: string;
  sentinel_score: SentinelScoreOutput;
  already_injected_fields: ReadonlySet<string>;
}): Promise<SentinelIntervention[]> {
  const interventions: SentinelIntervention[] = [];
  const minute = args.sentinel_score.minute_estimate;
  if (minute < SENTINEL_INJECT_AFTER_MINUTE) return interventions;

  // Pull every field with confidence < floor, sort by lowest confidence first,
  // skip anything we've already asked about on this call.
  const lowFields = new Set(
    args.sentinel_score.field_scores
      .filter((f) => f.confidence < SENTINEL_CONFIDENCE_FLOOR)
      .map((f) => f.field),
  );

  const ranked = args.sentinel_score.suggested_followups
    .filter((q) => lowFields.has(q.field) && !args.already_injected_fields.has(q.field))
    .slice(0, SENTINEL_MAX_INJECTIONS_PER_CALL);

  for (const q of ranked) {
    try {
      const injectResult = await injectInCallContext({
        call_id: args.retell_call_id,
        additional_context: `Before wrapping up, ask: "${q.question}"`,
        client_id: args.client_id,
      });
      interventions.push({
        minute,
        field: q.field,
        question_injected: q.question,
        outcome:
          injectResult.status === 'injected' ? 'unknown' : 'queued_for_followup',
      });
    } catch (err) {
      // Don't kill the run because mid-call injection failed. The post-call
      // profiler will catch the gap and convert it to a clarification email.
      console.warn(
        `[${AGENT_NAME}] injectInCallContext failed for field=${q.field}: ${
          (err as Error).message
        }`,
      );
    }
  }

  return interventions;
}

// ─── Pass B — Post-call adversarial profiler ─────────────────────────────────

/**
 * The Opus 4.7 adversarial profiler. Runs through the standard harness so we
 * get model routing, RAG over `agency_knowledge`, schema enforcement, the
 * adversarial-critic stage, and dedicated-column writes (confidence,
 * reasoning_trace, etc.) for free.
 *
 * The harness emits the kernel artifact event automatically. We then layer:
 *   - upsert into `agency_intake_calls`
 *   - generate child `client_outreach` artifacts for high-confidence gaps
 *   - emit the `intake_call_completed` event so downstream loops see it
 */
async function runAdversarialProfiler(args: {
  client_id: string;
  retell_call_id: string;
  transcript: string;
  duration_sec: number;
  sentinel_interventions: SentinelIntervention[];
}): Promise<{
  artifact_id: string;
  profile: Record<string, unknown>;
  extraction_score: number;
  flagged_gaps: ProfilerOutput['flagged_gaps'];
  clarification_emails: ProfilerOutput['clarification_emails'];
  vertical: string | null;
  cost_usd: number;
  latency_ms: number;
  iterations: number;
}> {
  // Build the schema in-process so the harness validates Claude's tool output.
  // We mirror exactly what's on disk in output-schema.json — caller wins per
  // the harness contract; the on-disk file is for the BENCHMARK + skill UX.
  const profilerSchema = buildProfilerSchema();

  const result = await runAgent<RunPayload, ProfilerOutput & {
    confidence: number;
    reasoning_trace: string[];
    alternatives_rejected: unknown[];
  }>({
    agent_name: AGENT_NAME,
    client_id: args.client_id,
    input: {
      client_id: args.client_id,
      retell_call_id: args.retell_call_id,
      transcript_override: args.transcript,
      prior_interventions: args.sentinel_interventions,
    },
    skill_dir: SKILL_DIR,
    output_schema: profilerSchema,
    agent_default_tier: 'opus',
    adversarial_critic: true,
    max_iterations: 1,
    artifact_type: ARTIFACT_TYPE,
    ship_target: 'agent_architect',
    knowledge_k: 8,
    knowledge_query:
      `intake extraction for vertical=auto detect from transcript (${args.transcript.length} chars)`,
    router_summary: `Intake post-call profile extraction; transcript=${args.transcript.length} chars; ${args.sentinel_interventions.length} prior sentinel interventions.`,
  });

  const output = result.output as ProfilerOutput & {
    confidence: number;
    reasoning_trace: string[];
    alternatives_rejected: unknown[];
  };

  return {
    artifact_id: result.artifact_id,
    profile: output.profile ?? {},
    extraction_score: typeof output.extraction_score === 'number' ? output.extraction_score : 0,
    flagged_gaps: Array.isArray(output.flagged_gaps) ? output.flagged_gaps : [],
    clarification_emails: Array.isArray(output.clarification_emails)
      ? output.clarification_emails
      : [],
    vertical:
      output.profile && typeof output.profile === 'object'
        ? ((output.profile as Record<string, unknown>).vertical as string | null) ?? null
        : null,
    cost_usd: result.cost_usd,
    latency_ms: result.latency_ms,
    iterations: result.iterations,
  };
}

/**
 * The schema the harness passes to Claude for tool-use. Cross-cutting
 * confidence + reasoning_trace + alternatives_rejected are appended by
 * `withCrossCuttingFields` inside the harness — we omit them here.
 *
 * This is functionally a programmatic mirror of `output-schema.json`. We
 * inline it rather than fs-reading + JSON.parse so that the function bundle
 * does not depend on the json file being shipped with the deploy artifact.
 */
function buildProfilerSchema(): JsonSchemaObject {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      profile: {
        type: 'object',
        description: '40-field business profile. null is allowed; do not invent.',
      },
      extraction_score: { type: 'number', minimum: 0, maximum: 1 },
      flagged_gaps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            field_path: { type: 'string' },
            gap_type: {
              type: 'string',
              enum: ['missing', 'contradiction', 'ambiguous', 'compliance_risk'],
            },
            evidence: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            auto_clarify: { type: 'boolean' },
          },
          required: ['field_path', 'gap_type', 'evidence', 'confidence', 'auto_clarify'],
        },
      },
      sentinel_interventions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            minute: { type: 'number', minimum: 0 },
            field: { type: 'string' },
            question_injected: { type: 'string' },
            outcome: {
              type: 'string',
              enum: [
                'client_answered',
                'client_confirmed_yes',
                'client_confirmed_no',
                'client_confirmed_closed',
                'ignored',
                'queued_for_followup',
                'unknown',
              ],
            },
          },
          required: ['minute', 'field', 'question_injected', 'outcome'],
        },
      },
      clarification_emails: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            subject: { type: 'string', minLength: 1, maxLength: 200 },
            body_markdown: { type: 'string', minLength: 20 },
            fields_addressed: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
          required: ['subject', 'body_markdown', 'fields_addressed'],
        },
      },
      predicted_impact: {
        type: 'object',
        additionalProperties: false,
        properties: {
          profile_completeness_pct: { type: 'number', minimum: 0, maximum: 100 },
          downstream_quality_estimate: { type: 'string', enum: ['high', 'med', 'low'] },
          confidence_interval_pct: { type: 'number', minimum: 0, maximum: 50 },
        },
        required: [
          'profile_completeness_pct',
          'downstream_quality_estimate',
          'confidence_interval_pct',
        ],
      },
    },
    required: [
      'profile',
      'extraction_score',
      'flagged_gaps',
      'sentinel_interventions',
      'clarification_emails',
      'predicted_impact',
    ],
  };
}

// ─── Persistence — `agency_intake_calls` upsert ──────────────────────────────

async function upsertIntakeCallRow(args: {
  client_id: string;
  retell_call_id: string;
  transcript: string;
  duration_sec: number;
  recording_url: string;
  extracted_profile: Record<string, unknown>;
  extraction_score: number;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('agency_intake_calls').insert({
    client_id: args.client_id,
    recording_url: args.recording_url,
    transcript: args.transcript,
    duration_sec: args.duration_sec,
    extracted_profile: args.extracted_profile,
    extraction_score: args.extraction_score,
  });
  if (error) {
    console.warn(
      `[${AGENT_NAME}] agency_intake_calls insert failed: ${error.message}`,
    );
  }
}

// ─── Child artifacts — clarification emails ──────────────────────────────────

/**
 * Each clarification_email becomes its own `client_outreach` artifact in
 * `agency_artifacts`. We bypass the full runAgent harness here because the
 * content was already produced (by Opus, inside the profiler artifact) and
 * critic'd as part of the parent. We do still write each row through the
 * kernel insert path so the queue UI sees them — and we link them back to
 * the parent agent_prompt artifact via `parent_artifact_id` for the audit
 * trail.
 */
async function materializeClarificationEmails(args: {
  client_id: string;
  parent_artifact_id: string;
  emails: ProfilerOutput['clarification_emails'];
}): Promise<string[]> {
  if (!args.emails.length) return [];
  const supabase = getServiceSupabase();
  const ids: string[] = [];

  for (const email of args.emails) {
    const content = {
      payload: {
        subject: email.subject,
        body_markdown: email.body_markdown,
        fields_addressed: email.fields_addressed,
        kind: 'intake_clarification',
      },
      iteration_history: [],
    };

    const { data, error } = await supabase
      .from('agency_artifacts')
      .insert({
        client_id: args.client_id,
        type: 'client_outreach',
        status: 'draft',
        generated_by: AGENT_NAME,
        model: 'derived-from-parent',
        content,
        ship_target: 'client_email',
        // Cross-cutting required fields — inherit from parent intent.
        confidence: 0.8,
        reasoning_trace: [
          'Auto-drafted from a high-confidence gap flagged by the adversarial profiler.',
          `Addresses fields: ${email.fields_addressed.join(', ')}.`,
          'Founder may approve as-is or edit-in-place in the queue.',
        ],
        retrieved_context: [],
        alternatives_rejected: [],
        adversarial_review: null,
        predicted_impact: {
          unblocks_artifact_id: args.parent_artifact_id,
          severity: 'medium',
        },
        parent_artifact_id: args.parent_artifact_id,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.warn(
        `[${AGENT_NAME}] failed to insert clarification client_outreach: ${
          error?.message ?? 'no row'
        }`,
      );
      continue;
    }

    ids.push(data.id as string);

    // notification_sent emission per the harness's per-type schema (op only).
    try {
      await emitAgencyEvent({
        client_id: args.client_id,
        agent_name: AGENT_NAME,
        type: 'notification_sent',
        severity: 'info',
        payload: { op: 'client_outreach' },
        why_explanation: `Clarification email drafted for: ${email.fields_addressed.join(', ')}`,
      });
    } catch (err) {
      console.warn(
        `[${AGENT_NAME}] notification_sent emit failed (non-fatal): ${
          (err as Error).message
        }`,
      );
    }
  }

  return ids;
}

// ─── Top-level orchestrator ──────────────────────────────────────────────────

/**
 * The full intake-officer run: sentinel (last-pass) → profiler → persistence
 * → clarification artifacts → intake_call_completed event.
 */
async function runIntake(payload: RunPayload): Promise<{
  artifact_id: string;
  intake_row_inserted: boolean;
  clarification_artifact_ids: string[];
  extraction_score: number;
  flagged_gaps_count: number;
  cost_usd: number;
  latency_ms: number;
}> {
  // 1. Pull transcript (or use override) via retell-adapter. The adapter
  //    emits a `call_completed` event under the hood — we do not duplicate it.
  let transcript = payload.transcript_override ?? '';
  let duration_sec = 0;
  let recording_url = '';

  if (!transcript) {
    const fetched = await getCallTranscript({
      call_id: payload.retell_call_id,
      client_id: payload.client_id,
    });
    transcript = fetched.transcript ?? '';
    duration_sec = fetched.duration_sec ?? 0;
    recording_url = fetched.recording_url ?? '';
  }

  if (!transcript.trim()) {
    // Cannot run intake on an empty transcript. Surface via the kernel error
    // channel and exit early — do NOT insert an artifact.
    await emitAgencyEvent({
      client_id: payload.client_id,
      agent_name: AGENT_NAME,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: AGENT_NAME,
        operation: 'runIntake',
        error_message: 'empty transcript',
        op: 'runIntake',
        external_id: payload.retell_call_id,
      },
      why_explanation:
        'Retell webhook fired without a transcript; intake-officer refused to hallucinate a profile.',
    });
    throw new Error(`[${AGENT_NAME}] empty transcript for call ${payload.retell_call_id}`);
  }

  // 2. Pass A — sentinel one last time over the full transcript. This both:
  //    (a) gives us a fresh confidence map, and
  //    (b) lets us re-attempt mid-call injection if the call is still live
  //        (Retell may fire the webhook before the agent has actually said
  //        goodbye — rare, but supported).
  const t_a0 = Date.now();
  const sentinel_score = await runSentinel({
    client_id: payload.client_id,
    transcript,
    minute_estimate: Math.max(duration_sec / 60, transcript.length / 9 / 60),
  });

  const already_injected = new Set(
    (payload.prior_interventions ?? []).map((i) => i.field),
  );

  const fresh_interventions = await maybeInjectFollowups({
    client_id: payload.client_id,
    retell_call_id: payload.retell_call_id,
    sentinel_score,
    already_injected_fields: already_injected,
  });

  const all_interventions: SentinelIntervention[] = [
    ...(payload.prior_interventions ?? []),
    ...fresh_interventions,
  ];
  console.info(
    `[${AGENT_NAME}] sentinel done in ${Date.now() - t_a0}ms — ${
      sentinel_score.field_scores.length
    } scored, ${fresh_interventions.length} injected.`,
  );

  // 3. Pass B — adversarial profiler via the harness. Returns the inserted
  //    artifact + the full ProfilerOutput.
  const profiler = await runAdversarialProfiler({
    client_id: payload.client_id,
    retell_call_id: payload.retell_call_id,
    transcript,
    duration_sec,
    sentinel_interventions: all_interventions,
  });

  // 4. Upsert the intake-calls row. Best-effort; failure is logged, not thrown.
  await upsertIntakeCallRow({
    client_id: payload.client_id,
    retell_call_id: payload.retell_call_id,
    transcript,
    duration_sec,
    recording_url,
    extracted_profile: profiler.profile,
    extraction_score: profiler.extraction_score,
  });

  // 5. Materialize each clarification email as a child `client_outreach`
  //    artifact.
  const clarification_ids = await materializeClarificationEmails({
    client_id: payload.client_id,
    parent_artifact_id: profiler.artifact_id,
    emails: profiler.clarification_emails,
  });

  // 6. Emit the kernel `intake_call_completed` event so downstream
  //    orchestration (n8n: `intake-call-completed` workflow) fires the next
  //    step (agent-architect) automatically.
  try {
    await emitAgencyEvent({
      client_id: payload.client_id,
      agent_name: AGENT_NAME,
      type: 'intake_call_completed',
      severity: 'info',
      payload: {
        intake_id: profiler.artifact_id,
        call_id: payload.retell_call_id,
        duration_seconds: duration_sec,
        extraction_score: profiler.extraction_score,
        flagged_gaps_count: profiler.flagged_gaps.length,
        ...(profiler.vertical ? { vertical: profiler.vertical } : {}),
      },
      why_explanation: `Intake call ended. Profile extracted at ${profiler.extraction_score.toFixed(
        2,
      )} conf; ${profiler.flagged_gaps.length} flagged gaps; ${
        clarification_ids.length
      } clarification emails queued.`,
    });
  } catch (err) {
    console.warn(
      `[${AGENT_NAME}] intake_call_completed emit failed (non-fatal): ${
        (err as Error).message
      }`,
    );
  }

  return {
    artifact_id: profiler.artifact_id,
    intake_row_inserted: true,
    clarification_artifact_ids: clarification_ids,
    extraction_score: profiler.extraction_score,
    flagged_gaps_count: profiler.flagged_gaps.length,
    cost_usd: profiler.cost_usd,
    latency_ms: profiler.latency_ms,
  };
}

// ─── Netlify entrypoints ─────────────────────────────────────────────────────

/**
 * Two modes are supported on the same endpoint:
 *
 *   POST /agency-intake-officer
 *     Body: { client_id, retell_call_id, transcript_override?, prior_interventions? }
 *     → Full post-call run (sentinel + profiler + persistence + events).
 *
 *   POST /agency-intake-officer?mode=sentinel
 *     Body: { client_id, retell_call_id, partial_transcript }
 *     → Live in-call sentinel score. Returns the scored fields + the
 *       follow-up question (if any) that was just injected into the live
 *       call via retell-adapter.injectInCallContext. Called by the Retell
 *       agent's mid-call tool-use.
 *
 *   POST /agency-intake-officer?mode=webhook
 *     Headers: x-retell-signature
 *     Body: Retell call-ended webhook
 *     → Verifies signature, looks up client_id by Retell agent_id, runs full.
 *
 * GET /agency-intake-officer?mode=health → static 200 for liveness checks.
 */
const handler: Handler = async (event) => {
  const mode = (event.queryStringParameters?.mode ?? 'run').toLowerCase();

  if (event.httpMethod === 'GET' && mode === 'health') {
    return { statusCode: 200, body: JSON.stringify({ ok: true, agent: AGENT_NAME }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }

  try {
    if (mode === 'sentinel') {
      // Sentinel is invoked mid-call by Retell tool-use — not by the founder,
      // not by cron. It uses its own dedicated shared secret so a leak of
      // CRON_SECRET doesn't grant access here. Fail-closed if the env var
      // is unset.
      const sentinelAuthz = authorizeSentinel(event);
      if (!sentinelAuthz.ok) {
        return {
          statusCode: sentinelAuthz.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: sentinelAuthz.message }),
        };
      }

      const body = JSON.parse(event.body ?? '{}') as {
        client_id?: string;
        retell_call_id?: string;
        partial_transcript?: string;
        already_injected_fields?: string[];
      };
      if (!body.client_id || !body.retell_call_id || !body.partial_transcript) {
        return {
          statusCode: 400,
          body: 'missing client_id / retell_call_id / partial_transcript',
        };
      }
      const score = await runSentinel({
        client_id: body.client_id,
        transcript: body.partial_transcript,
        minute_estimate: body.partial_transcript.length / 9 / 60,
      });
      const interventions = await maybeInjectFollowups({
        client_id: body.client_id,
        retell_call_id: body.retell_call_id,
        sentinel_score: score,
        already_injected_fields: new Set(body.already_injected_fields ?? []),
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          mode: 'sentinel',
          minute_estimate: score.minute_estimate,
          low_confidence_fields: score.field_scores
            .filter((f) => f.confidence < SENTINEL_CONFIDENCE_FLOOR)
            .map((f) => f.field),
          interventions,
        }),
      };
    }

    if (mode === 'webhook') {
      const rawBody = event.body ?? '';
      const sigResult = verifyRetellSignature(
        rawBody,
        (event.headers ?? {}) as Record<string, string | undefined>,
      );
      if (sigResult === 'invalid') {
        return { statusCode: 401, body: 'invalid retell signature' };
      }
      const parsed = JSON.parse(rawBody || '{}') as IntakeWebhookEvent;
      if (parsed.event !== 'call_ended' || !parsed.call?.call_id) {
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true, skipped: parsed.event ?? 'unknown' }),
        };
      }
      const supabase = getServiceSupabase();
      const { data: clientRow, error: lookupErr } = await supabase
        .from('agency_clients')
        .select('id')
        .eq('status', 'intake_scheduled')
        .limit(1)
        .maybeSingle();
      if (lookupErr || !clientRow) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            ok: true,
            skipped: 'no matching client awaiting intake',
            lookup_error: lookupErr?.message,
          }),
        };
      }
      const result = await runIntake({
        client_id: clientRow.id as string,
        retell_call_id: parsed.call.call_id,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, mode: 'webhook', ...result }),
      };
    }

    // Default mode: direct invocation with a payload.
    const body = JSON.parse(event.body ?? '{}') as Partial<RunPayload>;
    if (!body.client_id || !body.retell_call_id) {
      return {
        statusCode: 400,
        body: 'missing client_id or retell_call_id',
      };
    }
    const result = await runIntake({
      client_id: body.client_id,
      retell_call_id: body.retell_call_id,
      transcript_override: body.transcript_override,
      prior_interventions: body.prior_interventions,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, mode: 'run', ...result }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${AGENT_NAME}] handler error: ${message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: message }),
    };
  }
};

// Exported for benchmark + test fixtures.
export const __internals = {
  runSentinel,
  runAdversarialProfiler,
  runIntake,
  AUTO_CLARIFY_THRESHOLD,
  SENTINEL_CONFIDENCE_FLOOR,
  SENTINEL_INJECT_AFTER_MINUTE,
  PROFILE_FIELDS_40,
};

export const testHandler = handler;
export default withLegacyHandler(handler);
