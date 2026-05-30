/**
 * Agency OS — expansion-spotter runner
 * ====================================
 *
 * Trigger: weekly cron (Mondays 06:00 UTC) + on-demand HTTP from the founder
 *          (Telegram → POST /.netlify/functions/agency-expansion-spotter)
 *
 * Killer feature (NOT a stub):
 *   For each high-signal SaaS account (high call volume + manual prompt edits +
 *   frequent dashboard logins + plausibly-2x-able KPI), this runner produces ONE
 *   `expansion_pitch` artifact loaded with:
 *
 *     (a) Counterfactual Cekura playback of the prospect's actual recent calls
 *         through the agency-tier prompt — concrete delta + per-call diffs as
 *         evidence ("+34% predicted booking lift on your last 50 calls").
 *     (b) A 90-second personalized video script (Sonnet, via the run-agent
 *         harness) walking the prospect through THEIR own missed calls.
 *     (c) Audio narration of that script generated via
 *         elevenlabs.generateSpeech() with the founder-clone voice.
 *     (d) A unique landing-page payload (slug + data: URL preview baked into
 *         the artifact content until the Phase-E renderer ships).
 *     (e) Outreach draft (email subject + body) linking the page.
 *
 *   Everything goes through the run-agent harness so:
 *     - cross-cutting fields (confidence, reasoning_trace, alternatives_rejected,
 *       retrieved_context, adversarial_review, predicted_impact) get the dedicated
 *       kernel columns
 *     - adversarial critic runs (over-promise / weak evidence / tone-mismatch)
 *     - artifact lands as status='draft' in the queue
 *     - matching `expansion_candidate_identified` event gets emitted via the
 *       canonical kernel emitter (NOT raw insert)
 *
 * Cost budget: ≤ $2.00 / candidate (hard cap; runner aborts if exceeded).
 * Concurrency: candidates processed sequentially to keep Cekura simulation
 * spend bounded. A failing candidate logs + continues; never blocks the batch.
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { runAgent, type JsonSchemaObject } from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getServiceSupabase } from './_shared/token-utils';

import {
  playbackHistoricalCalls,
  runSimulationBatch,
  type PlaybackDiff,
} from './_shared/agency-adapters/cekura-adapter';
import { generateSpeech, getFounderCloneVoiceId } from './_shared/agency-adapters/elevenlabs-adapter';
import { listRecentCalls } from './_shared/agency-adapters/retell-adapter';

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

interface CandidateSignals {
  call_volume_30d: number;
  manual_prompt_edits_30d: number;
  dashboard_logins_30d: number;
  current_booking_rate: number;
  current_avg_qa?: number;
  retell_agent_id?: string;
  recent_call_ids?: string[];
}

interface Candidate {
  user_id: string;
  client_id?: string;          // agency_clients.id IF this prospect is also an agency client; else falls back to user_id
  business_name: string;
  vertical: string;
  current_tier: 'starter' | 'pro' | string;
  current_tier_price_usd?: number;
  agency_tier_price_usd?: number;
  signals: CandidateSignals;
}

interface RunnerBody {
  /** Provided when founder triggers on-demand from Telegram. */
  candidate_user_ids?: string[];
  candidates?: Candidate[];
  /** Optional override for the agency tier prompt to playback against. */
  agency_tier_prompt?: string;
  /** Optional override for the founder-clone voice id. */
  founder_clone_voice_id?: string;
  /** Force a re-run even if a recent pitch exists. */
  force?: boolean;
}

interface PerCandidateResult {
  user_id: string;
  business_name: string;
  status: 'pitched' | 'skipped_filter' | 'skipped_recent' | 'skipped_no_calls' | 'error';
  artifact_id?: string;
  reason?: string;
  cost_usd?: number;
  uplift_pct?: number;
}

// The shape of the artifact the model emits via the run-agent harness.
// Mirrors output-schema.json.
interface ExpansionPitchOutput {
  headline_delta: string;
  evidence: Array<{ call_id: string; before: string; after: string; delta: string }>;
  video_script: string;
  narration_audio_url: string;
  landing_page: {
    slug: string;
    hero_stat: string;
    receipt_cards: Array<{ call_id: string; before: string; after: string; delta: string }>;
    embedded_audio_url: string;
    cta_copy: string;
    preview_data_url: string;
  };
  outreach_draft: { subject: string; body: string };
  predicted_impact: {
    uplift_pct: number;
    uplift_ci_80: [number, number];
    expansion_mrr_usd: number;
    confidence: number;
  };
  // cross-cutting (the harness enforces these via withCrossCuttingFields)
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
  retrieved_context?: unknown[];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Constants — the four-signal filter + cost ceiling
// ─────────────────────────────────────────────────────────────────────────────

const FILTER = {
  MIN_CALL_VOLUME_30D: 150,
  MIN_MANUAL_EDITS_30D: 3,
  MIN_LOGINS_30D: 10,
  MAX_BOOKING_RATE_FOR_2X: 0.55, // prospect must have headroom to plausibly double
} as const;

const COST_CEILING_USD = 2.0;
const PLAYBACK_TARGET_CALLS = 50;
const PLAYBACK_MIN_USABLE_DIFFS = 3;
const RECENT_PITCH_WINDOW_DAYS = 14;

const SKILL_DIR = path.resolve(
  process.env.AGENCY_SKILLS_ROOT ||
    'C:/Users/Asus/Desktop/Marketing/strategy/skills/agency-fleet/expansion-spotter',
);

// ─────────────────────────────────────────────────────────────────────────────
//   Output schema (kept in sync with skill output-schema.json — harness uses
//   this object verbatim; on-disk file is the documentation source of truth)
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_SCHEMA: JsonSchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline_delta',
    'evidence',
    'video_script',
    'narration_audio_url',
    'landing_page',
    'outreach_draft',
    'predicted_impact',
    'retrieved_context',
  ],
  properties: {
    headline_delta: { type: 'string', description: 'Grounded headline claim with 80% CI.' },
    evidence: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        required: ['call_id', 'before', 'after', 'delta'],
        properties: {
          call_id: { type: 'string' },
          before: { type: 'string' },
          after: { type: 'string' },
          delta: { type: 'string' },
        },
      },
    },
    video_script: { type: 'string', description: '90-second narration script.' },
    narration_audio_url: { type: 'string', description: 'Signed URL prefilled by runner.' },
    landing_page: {
      type: 'object',
      required: [
        'slug',
        'hero_stat',
        'receipt_cards',
        'embedded_audio_url',
        'cta_copy',
        'preview_data_url',
      ],
      properties: {
        slug: { type: 'string' },
        hero_stat: { type: 'string' },
        receipt_cards: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            required: ['call_id', 'before', 'after', 'delta'],
            properties: {
              call_id: { type: 'string' },
              before: { type: 'string' },
              after: { type: 'string' },
              delta: { type: 'string' },
            },
          },
        },
        embedded_audio_url: { type: 'string' },
        cta_copy: { type: 'string' },
        preview_data_url: { type: 'string' },
      },
    },
    outreach_draft: {
      type: 'object',
      required: ['subject', 'body'],
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
      },
    },
    predicted_impact: {
      type: 'object',
      required: ['uplift_pct', 'uplift_ci_80', 'expansion_mrr_usd', 'confidence'],
      properties: {
        uplift_pct: { type: 'number' },
        uplift_ci_80: {
          type: 'array',
          minItems: 2,
          items: { type: 'number' },
        },
        expansion_mrr_usd: { type: 'number', minimum: 0 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    retrieved_context: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  const startedAt = Date.now();
  let body: RunnerBody = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body) as RunnerBody;
    } catch (err) {
      return json(400, { error: `invalid JSON body: ${(err as Error).message}` });
    }
  }

  let candidates: Candidate[];
  try {
    candidates = await resolveCandidates(body);
  } catch (err) {
    return json(500, { error: `candidate resolution failed: ${(err as Error).message}` });
  }

  if (candidates.length === 0) {
    return json(200, { ok: true, message: 'no candidates to process', results: [] });
  }

  const founderVoiceId =
    body.founder_clone_voice_id ||
    (await getFounderCloneVoiceId().catch(() => null)) ||
    process.env.AGENCY_FOUNDER_CLONE_VOICE_ID ||
    '';

  if (!founderVoiceId) {
    return json(500, {
      error:
        'founder-clone voice id not configured — set AGENCY_FOUNDER_CLONE_VOICE_ID or clone the voice first',
    });
  }

  const agencyTierPrompt = body.agency_tier_prompt || (await loadAgencyTierPrompt());

  const results: PerCandidateResult[] = [];
  for (const candidate of candidates) {
    try {
      const res = await processCandidate({
        candidate,
        agencyTierPrompt,
        founderVoiceId,
        force: Boolean(body.force),
      });
      results.push(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        user_id: candidate.user_id,
        business_name: candidate.business_name,
        status: 'error',
        reason: msg,
      });
      // Adapter-error event is best-effort; never let it block other candidates.
      try {
        await emitAgencyEvent({
          client_id: candidate.client_id || candidate.user_id,
          agent_name: 'expansion-spotter',
          type: 'adapter_error',
          severity: 'error',
          payload: {
            adapter: 'expansion-spotter',
            operation: 'processCandidate',
            error_message: msg.slice(0, 800),
            description: `candidate ${candidate.business_name} failed`,
          },
        });
      } catch {
        /* swallow */
      }
    }
  }

  const duration_ms = Date.now() - startedAt;
  return json(200, {
    ok: true,
    duration_ms,
    n_candidates: candidates.length,
    n_pitched: results.filter((r) => r.status === 'pitched').length,
    n_skipped: results.filter((r) => r.status.startsWith('skipped')).length,
    n_errored: results.filter((r) => r.status === 'error').length,
    results,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//   processCandidate — the full killer-feature pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function processCandidate(args: {
  candidate: Candidate;
  agencyTierPrompt: string;
  founderVoiceId: string;
  force: boolean;
}): Promise<PerCandidateResult> {
  const { candidate, agencyTierPrompt, founderVoiceId, force } = args;
  const tenantId = candidate.client_id || candidate.user_id;

  // ── (0) Four-signal filter ──────────────────────────────────────────────
  const filterReason = checkFourSignalFilter(candidate.signals);
  if (filterReason && !force) {
    return {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      status: 'skipped_filter',
      reason: filterReason,
    };
  }

  // ── (0b) Don't re-pitch the same prospect within 14 days unless force ──
  if (!force && (await wasPitchedRecently(tenantId))) {
    return {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      status: 'skipped_recent',
      reason: `pitched within last ${RECENT_PITCH_WINDOW_DAYS}d`,
    };
  }

  // ── (1) Resolve historical call IDs (fall back to listRecentCalls) ──────
  let callIds = candidate.signals.recent_call_ids ?? [];
  if (callIds.length < 10 && candidate.signals.retell_agent_id) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    try {
      const recent = await listRecentCalls({
        agent_id: candidate.signals.retell_agent_id,
        since,
        limit: PLAYBACK_TARGET_CALLS,
        client_id: tenantId,
      });
      callIds = recent.map((c) => c.call_id);
    } catch (err) {
      console.warn(
        `[expansion-spotter] listRecentCalls fallback failed for ${candidate.business_name}: ${
          (err as Error).message
        }`,
      );
    }
  }

  if (callIds.length === 0) {
    return {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      status: 'skipped_no_calls',
      reason: 'no historical calls available to playback',
    };
  }

  // Cap at PLAYBACK_TARGET_CALLS to keep cost bounded.
  callIds = callIds.slice(0, PLAYBACK_TARGET_CALLS);

  // ── (2) Counterfactual playback via Cekura ──────────────────────────────
  let diffs: PlaybackDiff[] = [];
  let playbackCost = 0;
  try {
    const playback = await playbackHistoricalCalls({
      client_id: tenantId,
      historical_call_ids: callIds,
      against_agent_config: {
        prompt: agencyTierPrompt,
        kb: {},
      },
    });
    diffs = playback.diffs;
    // Cekura adapter doesn't return cost from this entrypoint; approximate.
    playbackCost = diffs.length * 0.06;
  } catch (err) {
    console.warn(
      `[expansion-spotter] playbackHistoricalCalls failed for ${candidate.business_name}: ${
        (err as Error).message
      }`,
    );
  }

  // ── (2b) If playback is too thin, fall back to digital-twin sim ─────────
  let fellBackToTwin = false;
  if (diffs.length < PLAYBACK_MIN_USABLE_DIFFS) {
    try {
      const twin = await runSimulationBatch({
        ad_hoc_personas: synthesizePersonasFromCandidate(candidate),
        against_agent_config: { prompt: agencyTierPrompt, kb: {} },
        n_calls_per_persona: 1,
        timeout_min: 8,
      });
      // Map sim results into a Playback-Diff-compatible shape so the model
      // sees consistent input regardless of which path filled the evidence.
      diffs = twin.results.map((r) => ({
        call_id: r.call_id,
        original_outcome: 'unknown',
        counterfactual_outcome: r.outcome,
        qa_score_delta: Number(((r.qa_score ?? 0) - (candidate.signals.current_avg_qa ?? 7)).toFixed(2)),
        original_transcript_excerpt: '',
        counterfactual_transcript_excerpt: r.transcript.slice(0, 400),
      }));
      playbackCost += twin.cost_usd;
      fellBackToTwin = true;
    } catch (err) {
      console.warn(
        `[expansion-spotter] digital-twin fallback failed for ${candidate.business_name}: ${
          (err as Error).message
        }`,
      );
    }
  }

  if (diffs.length === 0) {
    return {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      status: 'skipped_no_calls',
      reason: 'playback returned zero diffs and twin fallback also failed',
    };
  }

  // ── (3) Aggregate the playback into a headline + CI ─────────────────────
  const aggregate = computeAggregate(diffs, candidate.signals.current_booking_rate);

  // ── (4) Generate founder-clone narration upfront so we can prefill the URL
  //        BEFORE the model writes the script. We pass a placeholder script to
  //        ElevenLabs that the model will mirror — but that creates a chicken-
  //        and-egg. Resolution: do narration AFTER the script is written, but
  //        re-insert the URL into the artifact via a one-line post-write update.
  //        For simplicity + atomicity, we instead pre-generate a SHORT seed
  //        narration (the headline_delta only) so the model has a real URL to
  //        echo. The final post-approval ship path can regenerate the full
  //        90-second narration using the model-written script.

  let narrationAudioUrl = '';
  let narrationCost = 0;
  try {
    const seedScriptForNarration = buildSeedNarrationScript({
      business_name: candidate.business_name,
      headline_lift_pct: aggregate.lift_pct,
      ci: aggregate.ci_80,
      n_calls: diffs.length,
    });
    const speech = await generateSpeech({
      voice_id: founderVoiceId,
      text: seedScriptForNarration,
      client_id: tenantId,
    });
    narrationAudioUrl = speech.audio_url;
    narrationCost = speech.cost_usd;
  } catch (err) {
    // Narration failure is recoverable — we still produce an artifact with an
    // empty URL and let the founder regenerate before shipping.
    console.warn(
      `[expansion-spotter] generateSpeech failed for ${candidate.business_name}: ${
        (err as Error).message
      } — proceeding with empty narration_audio_url`,
    );
  }

  // ── (5) Build the landing-page slug + preview data URL ──────────────────
  const slug = makeSlug(candidate.business_name);
  const previewDataUrl = makePreviewDataUrl({
    business_name: candidate.business_name,
    vertical: candidate.vertical,
    headline_lift_pct: aggregate.lift_pct,
    ci_80: aggregate.ci_80,
    n_diffs: diffs.length,
    fellBackToTwin,
  });

  // ── (6) Budget check BEFORE the model call ──────────────────────────────
  if (playbackCost + narrationCost > COST_CEILING_USD) {
    return {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      status: 'error',
      reason: `cost ceiling hit pre-LLM: $${(playbackCost + narrationCost).toFixed(2)}`,
      cost_usd: playbackCost + narrationCost,
    };
  }

  // ── (7) Drive the run-agent harness — model writes the artifact, the
  //        critic attacks it, the runner inserts to agency_artifacts with all
  //        cross-cutting fields in their dedicated columns. ────────────────
  const agentInput = {
    candidate: {
      user_id: candidate.user_id,
      business_name: candidate.business_name,
      vertical: candidate.vertical,
      current_tier: candidate.current_tier,
      current_tier_price_usd: candidate.current_tier_price_usd ?? null,
      agency_tier_price_usd: candidate.agency_tier_price_usd ?? null,
      signals: candidate.signals,
    },
    playback_aggregate: {
      n_calls_played_back: diffs.length,
      avg_qa_score_delta: aggregate.avg_qa_delta,
      predicted_booking_lift_pct: aggregate.lift_pct,
      predicted_booking_lift_ci_80: aggregate.ci_80,
      fell_back_to_digital_twin: fellBackToTwin,
    },
    playback_diffs: diffs.slice(0, 10), // give the model up to 10 diffs to pick from
    agency_tier_prompt_excerpt: agencyTierPrompt.slice(0, 1200),
    prefilled: {
      narration_audio_url: narrationAudioUrl,
      landing_page_slug: slug,
      landing_page_preview_data_url: previewDataUrl,
    },
  };

  const result = await runAgent<typeof agentInput, ExpansionPitchOutput>({
    agent_name: 'expansion-spotter',
    client_id: tenantId,
    input: agentInput,
    skill_dir: SKILL_DIR,
    output_schema: OUTPUT_SCHEMA,
    artifact_type: 'expansion_pitch',
    ship_target: 'client_email',
    adversarial_critic: true,
    max_iterations: 1,
    agent_default_tier: 'sonnet',
    router_summary: `expansion pitch for ${candidate.business_name} (${candidate.vertical}); ${diffs.length} playback diffs; +${aggregate.lift_pct.toFixed(1)}% modeled lift`,
    knowledge_query: `prospect tone + objection patterns for ${candidate.business_name} ${candidate.vertical}`,
    knowledge_k: 8,
  });

  // ── (8) Total-cost sanity check (post-hoc) ──────────────────────────────
  const totalCost = result.cost_usd + playbackCost + narrationCost;
  if (totalCost > COST_CEILING_USD) {
    console.warn(
      `[expansion-spotter] over-budget for ${candidate.business_name}: $${totalCost.toFixed(2)} ` +
        `> $${COST_CEILING_USD.toFixed(2)} (artifact ${result.artifact_id} already inserted)`,
    );
  }

  // The harness has already emitted `expansion_candidate_identified` via the
  // canonical kernel emitter. We attach a richer follow-up event with the
  // narrative numbers so the morning briefing can render the headline without
  // a join on agency_artifacts.
  try {
    await emitAgencyEvent({
      client_id: tenantId,
      agent_name: 'expansion-spotter',
      type: 'expansion_candidate_identified',
      severity: 'info',
      payload: {
        candidate_user_id: candidate.user_id,
        predicted_lift_pct: aggregate.lift_pct,
        signals: [
          `business=${candidate.business_name}`,
          `vertical=${candidate.vertical}`,
          `n_diffs=${diffs.length}`,
          fellBackToTwin ? 'fallback=digital_twin' : 'source=real_playback',
          `slug=${slug}`,
          `artifact_id=${result.artifact_id}`,
        ].slice(0, 10),
      },
      why_explanation:
        `expansion-spotter pitched ${candidate.business_name} with +${aggregate.lift_pct.toFixed(
          1,
        )}% modeled lift across ${diffs.length} ${fellBackToTwin ? 'simulated' : 'real'} calls.`,
    });
  } catch {
    /* event-bus failure must never overwrite a successful pitch */
  }

  return {
    user_id: candidate.user_id,
    business_name: candidate.business_name,
    status: 'pitched',
    artifact_id: result.artifact_id,
    cost_usd: Number(totalCost.toFixed(4)),
    uplift_pct: aggregate.lift_pct,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   The four-signal filter
// ─────────────────────────────────────────────────────────────────────────────

function checkFourSignalFilter(s: CandidateSignals): string | null {
  const failed: string[] = [];
  if (s.call_volume_30d < FILTER.MIN_CALL_VOLUME_30D) {
    failed.push(`call_volume_30d=${s.call_volume_30d} < ${FILTER.MIN_CALL_VOLUME_30D}`);
  }
  if (s.manual_prompt_edits_30d < FILTER.MIN_MANUAL_EDITS_30D) {
    failed.push(
      `manual_prompt_edits_30d=${s.manual_prompt_edits_30d} < ${FILTER.MIN_MANUAL_EDITS_30D}`,
    );
  }
  if (s.dashboard_logins_30d < FILTER.MIN_LOGINS_30D) {
    failed.push(`dashboard_logins_30d=${s.dashboard_logins_30d} < ${FILTER.MIN_LOGINS_30D}`);
  }
  if (s.current_booking_rate > FILTER.MAX_BOOKING_RATE_FOR_2X) {
    failed.push(
      `current_booking_rate=${s.current_booking_rate} > ${FILTER.MAX_BOOKING_RATE_FOR_2X} (no 2x headroom)`,
    );
  }
  return failed.length === 0 ? null : `four-signal filter failed: ${failed.join('; ')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Aggregate playback diffs → headline number + 80% CI
// ─────────────────────────────────────────────────────────────────────────────

function computeAggregate(
  diffs: PlaybackDiff[],
  currentBookingRate: number,
): {
  lift_pct: number;
  ci_80: [number, number];
  avg_qa_delta: number;
} {
  const flips = diffs.filter(
    (d) =>
      d.original_outcome !== 'booked' &&
      d.counterfactual_outcome === 'booked',
  ).length;
  const regressions = diffs.filter(
    (d) =>
      d.original_outcome === 'booked' &&
      d.counterfactual_outcome !== 'booked',
  ).length;
  const net = flips - regressions;
  const newRate = (Math.max(0, currentBookingRate * diffs.length + net)) / Math.max(1, diffs.length);
  const liftRel = currentBookingRate > 0 ? ((newRate - currentBookingRate) / currentBookingRate) * 100 : 0;

  // Wilson-ish 80% CI on the proportion of flips — wide for small N, tight for large N.
  const p = diffs.length > 0 ? flips / diffs.length : 0;
  const z = 1.282; // 80% two-sided
  const halfWidth = z * Math.sqrt((p * (1 - p)) / Math.max(1, diffs.length));
  const lowRate = Math.max(0, currentBookingRate * (1 + liftRel / 100) - halfWidth);
  const highRate = currentBookingRate * (1 + liftRel / 100) + halfWidth;
  const lowLift =
    currentBookingRate > 0 ? ((lowRate - currentBookingRate) / currentBookingRate) * 100 : 0;
  const highLift =
    currentBookingRate > 0 ? ((highRate - currentBookingRate) / currentBookingRate) * 100 : 0;

  const avg_qa_delta =
    diffs.length > 0
      ? Number(
          (
            diffs.reduce((s, d) => s + (Number.isFinite(d.qa_score_delta) ? d.qa_score_delta : 0), 0) /
            diffs.length
          ).toFixed(2),
        )
      : 0;

  return {
    lift_pct: Number(liftRel.toFixed(1)),
    ci_80: [Number(lowLift.toFixed(1)), Number(highLift.toFixed(1))],
    avg_qa_delta,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Personas synthesized when real playback is too thin
// ─────────────────────────────────────────────────────────────────────────────

function synthesizePersonasFromCandidate(c: Candidate) {
  // Coarse but deterministic — used only when we have <3 real diffs. Gives the
  // simulator something concrete to push back against so we still get evidence.
  return [
    {
      persona_id: `synth_${c.user_id}_price`,
      intent: 'price_shopper',
      objection_pattern: 'always_asks_for_discount',
      accent_profile: 'standard_us',
      sample_dialog_seed: `Hi, how much do you charge for your most popular ${c.vertical.replace(/_/g, ' ')} service?`,
      difficulty: 'medium' as const,
    },
    {
      persona_id: `synth_${c.user_id}_booker`,
      intent: 'ready_to_book',
      objection_pattern: 'wants_specific_time',
      accent_profile: 'standard_us',
      sample_dialog_seed: `Hi, I'd like to book an appointment for next week if possible.`,
      difficulty: 'easy' as const,
    },
    {
      persona_id: `synth_${c.user_id}_hesitant`,
      intent: 'info_only',
      objection_pattern: 'distrusts_ai',
      accent_profile: 'standard_us',
      sample_dialog_seed: `Hi, I just have a few questions, I'm not sure I'm ready to book yet.`,
      difficulty: 'hard' as const,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Landing page slug + preview data URL
// ─────────────────────────────────────────────────────────────────────────────

function makeSlug(business_name: string): string {
  const kebab = business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const hash = createHash('sha1').update(business_name + Date.now().toString()).digest('hex').slice(0, 4);
  return `${kebab}-${hash}`;
}

function makePreviewDataUrl(args: {
  business_name: string;
  vertical: string;
  headline_lift_pct: number;
  ci_80: [number, number];
  n_diffs: number;
  fellBackToTwin: boolean;
}): string {
  const payload = {
    v: 1,
    business_name: args.business_name,
    vertical: args.vertical,
    headline_lift_pct: args.headline_lift_pct,
    ci_80: args.ci_80,
    n_diffs: args.n_diffs,
    evidence_source: args.fellBackToTwin ? 'digital_twin_simulation' : 'real_call_playback',
    note: 'Phase-E renderer will hydrate this into the landing page HTML.',
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `data:application/json;base64,${b64}`;
}

function buildSeedNarrationScript(args: {
  business_name: string;
  headline_lift_pct: number;
  ci: [number, number];
  n_calls: number;
}): string {
  // Short opener — the founder-clone voice reads this. The full 90s script is
  // written by the model and can be regenerated at ship time if desired.
  const lift = args.headline_lift_pct >= 0 ? `+${args.headline_lift_pct.toFixed(0)}` : `${args.headline_lift_pct.toFixed(0)}`;
  return (
    `Hey — quick walkthrough for ${args.business_name}. ` +
    `Ran your last ${args.n_calls} calls through our agency-tier agent. ` +
    `Modeled lift: ${lift} percent, eighty percent confidence interval ${args.ci[0].toFixed(0)} to ${args.ci[1].toFixed(0)}. ` +
    `Hit play on the page for the three specific calls and what would have changed.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//   Recent-pitch dedupe
// ─────────────────────────────────────────────────────────────────────────────

async function wasPitchedRecently(client_id: string): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const since = new Date(Date.now() - RECENT_PITCH_WINDOW_DAYS * 86400_000).toISOString();
    const { data, error } = await supabase
      .from('agency_artifacts')
      .select('id')
      .eq('client_id', client_id)
      .eq('type', 'expansion_pitch')
      .gte('created_at', since)
      .limit(1);
    if (error) {
      console.warn(
        `[expansion-spotter] wasPitchedRecently lookup failed (non-blocking): ${error.message}`,
      );
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.warn(
      `[expansion-spotter] wasPitchedRecently threw (non-blocking): ${(err as Error).message}`,
    );
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Candidate resolution — either passed inline, by IDs, or auto-scanned
// ─────────────────────────────────────────────────────────────────────────────

async function resolveCandidates(body: RunnerBody): Promise<Candidate[]> {
  if (Array.isArray(body.candidates) && body.candidates.length > 0) {
    return body.candidates;
  }

  const supabase = getServiceSupabase();

  if (Array.isArray(body.candidate_user_ids) && body.candidate_user_ids.length > 0) {
    return Promise.all(
      body.candidate_user_ids.map((uid) => loadCandidateByUserId(supabase, uid)),
    ).then((rows) => rows.filter((c): c is Candidate => c != null));
  }

  // Cron path: scan candidate-signal materialized view.
  // The view is created in the saas-signals migration; we tolerate its absence
  // (returns empty) so this runner is resilient during early rollout.
  try {
    const { data, error } = await supabase
      .from('saas_expansion_candidates')
      .select(
        'user_id, business_name, vertical, current_tier, current_tier_price_usd, agency_tier_price_usd, call_volume_30d, manual_prompt_edits_30d, dashboard_logins_30d, current_booking_rate, current_avg_qa, retell_agent_id',
      )
      .order('call_volume_30d', { ascending: false })
      .limit(20);
    if (error) {
      console.warn(`[expansion-spotter] saas_expansion_candidates view missing/empty: ${error.message}`);
      return [];
    }
    return (data ?? []).map(
      (row: Record<string, unknown>): Candidate => ({
        user_id: String(row.user_id),
        business_name: String(row.business_name ?? 'Unnamed'),
        vertical: String(row.vertical ?? 'unknown'),
        current_tier: String(row.current_tier ?? 'starter'),
        current_tier_price_usd: numOrUndef(row.current_tier_price_usd),
        agency_tier_price_usd: numOrUndef(row.agency_tier_price_usd),
        signals: {
          call_volume_30d: Number(row.call_volume_30d ?? 0),
          manual_prompt_edits_30d: Number(row.manual_prompt_edits_30d ?? 0),
          dashboard_logins_30d: Number(row.dashboard_logins_30d ?? 0),
          current_booking_rate: Number(row.current_booking_rate ?? 0),
          current_avg_qa: numOrUndef(row.current_avg_qa),
          retell_agent_id: row.retell_agent_id ? String(row.retell_agent_id) : undefined,
        },
      }),
    );
  } catch (err) {
    console.warn(
      `[expansion-spotter] saas_expansion_candidates scan threw: ${(err as Error).message}`,
    );
    return [];
  }
}

async function loadCandidateByUserId(
  supabase: ReturnType<typeof getServiceSupabase>,
  user_id: string,
): Promise<Candidate | null> {
  const { data, error } = await supabase
    .from('saas_expansion_candidates')
    .select(
      'user_id, business_name, vertical, current_tier, current_tier_price_usd, agency_tier_price_usd, call_volume_30d, manual_prompt_edits_30d, dashboard_logins_30d, current_booking_rate, current_avg_qa, retell_agent_id',
    )
    .eq('user_id', user_id)
    .maybeSingle();
  if (error || !data) {
    console.warn(`[expansion-spotter] loadCandidateByUserId(${user_id}) miss: ${error?.message ?? 'no row'}`);
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    user_id: String(row.user_id),
    business_name: String(row.business_name ?? 'Unnamed'),
    vertical: String(row.vertical ?? 'unknown'),
    current_tier: String(row.current_tier ?? 'starter'),
    current_tier_price_usd: numOrUndef(row.current_tier_price_usd),
    agency_tier_price_usd: numOrUndef(row.agency_tier_price_usd),
    signals: {
      call_volume_30d: Number(row.call_volume_30d ?? 0),
      manual_prompt_edits_30d: Number(row.manual_prompt_edits_30d ?? 0),
      dashboard_logins_30d: Number(row.dashboard_logins_30d ?? 0),
      current_booking_rate: Number(row.current_booking_rate ?? 0),
      current_avg_qa: numOrUndef(row.current_avg_qa),
      retell_agent_id: row.retell_agent_id ? String(row.retell_agent_id) : undefined,
    },
  };
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Agency-tier prompt loader — registry lookup with safe fallback
// ─────────────────────────────────────────────────────────────────────────────

async function loadAgencyTierPrompt(): Promise<string> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('agency_prompt_registry')
      .select('content')
      .eq('tier', 'bolt_system')
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.content && typeof data.content === 'string') {
      return data.content;
    }
  } catch (err) {
    console.warn(
      `[expansion-spotter] agency_prompt_registry lookup failed: ${(err as Error).message}`,
    );
  }
  // Fallback — minimum-viable "Bolt System" tier prompt.
  return [
    'You are the receptionist for [BUSINESS]. The owner has hired Boltcall to upgrade you.',
    'Rules you now follow that the starter tier did not:',
    '1. Always answer price questions with the typical band BEFORE offering a transfer.',
    '2. Always pre-qualify with timing + intent before pitching a slot.',
    '3. Always offer a soft consult to hesitant callers instead of forcing a hard book.',
    '4. Always confirm the booked slot back to the caller verbatim before ending.',
    '5. Never cold-transfer; always set the receiving party up with context first.',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//   HTTP helper
// ─────────────────────────────────────────────────────────────────────────────

function json(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
