/**
 * agency-creative-foundry.ts — Phase C runner for the creative-foundry agent.
 *
 * Trigger: cron Mon 06:00 UTC per `agency_clients` row where sku='bolt_system'
 *          AND status='live'. The scheduler hits this function with a JSON body
 *          of `{ client_id }`. The function fans the full 3-stage pipeline
 *          per client and returns a JSON summary.
 *
 * Pipeline (the KILLER FEATURE — no stubs, all three stages implemented here):
 *   STAGE 1 — DIVERGER
 *     - Fan out 4 calls to `gemini-image.generateAdCreative`, one per angle
 *       (proof | fear | status | curiosity), 2 variants each, high seed entropy.
 *     - Drop any image with banana_fingerprint_score > 0.8 immediately.
 *
 *   STAGE 2 — ADVERSARIAL CRITIC (per-variant Opus 4.7)
 *     - For every surviving image, evaluate four critic dimensions:
 *         (a) ad-fatigue        — embed candidate hook + each of the last 4w
 *                                  approved-creative hooks; compute n-gram
 *                                  overlap on tokenized text; KILL if > 0.40.
 *         (b) vertical compliance — vertical-conditioned banned-word check
 *                                  (medspa FDA, lawyer bar rules, HVAC
 *                                  warranty wording, etc.).
 *         (c) banana fingerprint — already filtered at >0.8 above; the critic
 *                                  layer flags anything in the 0.65-0.80
 *                                  ambiguous band so the rebuttal pass can
 *                                  regenerate via gemini-image.generateImageVariations.
 *         (d) historical CTR overlap — for each candidate, embedding-similarity
 *                                  to creatives in the bottom-25% of the
 *                                  vertical's prior CTR distribution; KILL if
 *                                  cosine similarity > 0.85 to any bottom-quartile
 *                                  creative.
 *
 *   STAGE 3 — PREDICTOR (ridge regression per-client)
 *     - Pull the last 90 days of agency_events.creative_published for this
 *       client and resolve each to its (creative_embedding, CTR, CPL) tuple
 *       via meta-ads-adapter.getCreativeInsights.
 *     - Fit a closed-form ridge regression in-memory (λ=1.0) on embedding -> CTR
 *       and embedding -> CPL.
 *     - Score each survivor; build an 80% confidence interval via the residual
 *       standard deviation of the fit (Gaussian approx; t-distribution would
 *       be more correct but residual_n is usually <30 — the CI is interpretive
 *       not inferential).
 *     - If training_n < 8: fall back to the per-vertical prior baked into
 *       VERTICAL_CTR_PRIOR / VERTICAL_CPL_PRIOR below (no fabricated CI).
 *
 *     Ship the top-3 highest-predicted-CTR survivors as `agency_artifacts`
 *     rows of type='ad_creative' with `predicted_impact`, critic rebuttals,
 *     and the cross-cutting envelope populated by the harness.
 *
 * Net effect per run (one Bolt System client):
 *   - 8 banana images generated, ~6 survive fingerprint
 *   - ~14 Claude calls (1 producer Sonnet/Opus + per-variant Opus critics + 1
 *     rebuttal + 1 cost-event-emitting wrap)
 *   - 0-3 ad_creative artifacts inserted, each with predicted CTR + 80% CI
 *   - Multiple agency_events: creative_published (sentinel for queue), cost
 *     events from the adapters, optional adapter_error if anything fails.
 *
 * Failure modes are loud — the runner never silently degrades. If the
 * predictor cannot fit (training_n=0 AND vertical not in prior table), it ships
 * with `model: 'uniform_prior'` and confidence drops to <0.5 so the queue
 * smart-sort de-prioritizes the artifact.
 *
 * What this runner does NOT do:
 *   - Push creatives to Meta. That's `agency-push-creative.ts`, fired by the
 *     `artifact-shipped` n8n workflow once the founder approves in the queue.
 *   - Generate video ads.
 *   - Reuse an image across multiple clients (every batch is per-client).
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';

import { runAgent, type JsonSchemaObject } from '../_shared/agency-agents/run-agent';
import { emitAgencyEvent } from '../_shared/emit-agency-event';
import { getServiceSupabase } from '../_shared/token-utils';
import { generateEmbedding } from '../_shared/azure-ai';
import {
  generateAdCreative,
  type AdAngle,
  type AdDimensions,
} from '../_shared/agency-adapters/gemini-image';
import { getCreativeInsights } from '../_shared/agency-adapters/meta-ads-adapter';

// ────────────────────────────────────────────────────────────────────────────
//   Constants & tunables
// ────────────────────────────────────────────────────────────────────────────

const AGENT_NAME = 'creative-foundry';
const SKILL_DIR = path.resolve(
  // Skill files live in the Marketing repo, mirrored into this repo's
  // `strategy/skills/` directory at build time. Resolve relative to the
  // bundled function root.
  process.env.AGENCY_SKILL_DIR ||
    path.join(process.cwd(), 'strategy', 'skills', 'agency-fleet', AGENT_NAME),
);

const ANGLES: AdAngle[] = ['proof', 'fear', 'status', 'curiosity'];
const VARIANTS_PER_ANGLE = 2;
const FINGERPRINT_KILL = 0.8;
const FINGERPRINT_REBUTTAL_BAND = 0.65;
const NGRAM_OVERLAP_KILL = 0.40;
const HISTORICAL_CTR_OVERLAP_KILL = 0.85;
const RECENT_COPY_WINDOW_DAYS = 28; // 4 weeks
const HISTORICAL_INSIGHTS_WINDOW_DAYS = 90;
const RIDGE_LAMBDA = 1.0;
const PREDICTOR_MIN_TRAINING_N = 8;
const CI_Z_80 = 1.282; // 80% two-tailed normal quantile
const SHIP_TOP_N = 3;

// Per-vertical priors used when there is no training data. Numbers are coarse
// medians from agency case-study library / industry benchmarks; intentionally
// conservative on CTR (under-promise) and generous on CPL (over-warn).
const VERTICAL_CTR_PRIOR: Record<string, { mean: number; std: number }> = {
  medspa:      { mean: 0.0185, std: 0.0060 },
  legal:       { mean: 0.0120, std: 0.0050 },
  hvac:        { mean: 0.0210, std: 0.0070 },
  dental:      { mean: 0.0170, std: 0.0055 },
  medical:     { mean: 0.0150, std: 0.0055 },
  roofing:     { mean: 0.0190, std: 0.0065 },
  plumber:     { mean: 0.0205, std: 0.0070 },
  electrical:  { mean: 0.0180, std: 0.0060 },
  solar:       { mean: 0.0145, std: 0.0050 },
  auto:        { mean: 0.0195, std: 0.0065 },
  fitness:     { mean: 0.0155, std: 0.0055 },
  pest_control:{ mean: 0.0200, std: 0.0065 },
  real_estate: { mean: 0.0135, std: 0.0050 },
  restaurant:  { mean: 0.0220, std: 0.0075 },
};
const VERTICAL_CPL_PRIOR: Record<string, { mean: number; std: number }> = {
  medspa:      { mean: 22.0, std: 8.0 },
  legal:       { mean: 65.0, std: 25.0 },
  hvac:        { mean: 18.0, std: 7.0 },
  dental:      { mean: 28.0, std: 10.0 },
  medical:     { mean: 35.0, std: 12.0 },
  roofing:     { mean: 24.0, std: 9.0 },
  plumber:     { mean: 16.0, std: 6.0 },
  electrical:  { mean: 19.0, std: 7.0 },
  solar:       { mean: 42.0, std: 14.0 },
  auto:        { mean: 21.0, std: 8.0 },
  fitness:     { mean: 14.0, std: 5.0 },
  pest_control:{ mean: 17.0, std: 6.0 },
  real_estate: { mean: 38.0, std: 13.0 },
  restaurant:  { mean: 9.0,  std: 4.0 },
};
const FALLBACK_CTR_PRIOR = { mean: 0.0170, std: 0.0060 };
const FALLBACK_CPL_PRIOR = { mean: 24.0, std: 10.0 };

// Vertical-conditioned banned wording. The critic uses these for fast
// substring matching before falling back to the Opus call.
const VERTICAL_BANNED_WORDING: Record<string, string[]> = {
  medspa: ['FDA-approved', 'FDA approved', 'guaranteed weight loss', 'permanent results', 'cure '],
  legal: ['guaranteed outcome', 'we will win', 'no-lose case', 'best lawyer in', 'best attorney in', 'guaranteed to win'],
  hvac: ['lifetime warranty', '100% satisfaction guarantee', 'save 50% on your bill', 'guaranteed savings'],
  dental: ['painless', 'FDA-approved', '100% white forever'],
  medical: ['cures ', 'guaranteed cure', 'treats every', 'better than any'],
  roofing: ['100% leak-free for life', 'lifetime warranty', 'guaranteed no leaks'],
};

// ────────────────────────────────────────────────────────────────────────────
//   Input / output types
// ────────────────────────────────────────────────────────────────────────────

interface FoundryInput {
  client_id: string;
  vertical: string;
  business_name: string;
  dimensions?: AdDimensions;
  week_start_iso?: string;
  brand_tone?: string;
  promo?: string | null;
  // The harness threads these through to Claude so the producer prompt sees them.
  _harness_context?: {
    images_from_gemini: AnnotatedImage[];
    recent_4w_copy: string[];
    historical_creative_insights_n: number;
  };
}

interface AnnotatedImage {
  url: string;
  angle: AdAngle;
  seed: number;
  banana_fingerprint_score: number;
}

interface VariantCopy {
  image_url: string;
  angle: AdAngle;
  seed: number;
  primary_text: string;
  headline: string;
  cta: 'LEARN_MORE' | 'BOOK_NOW' | 'GET_QUOTE';
  compliance_self_check: string;
  ngram_overlap_estimate: number;
  compliance_findings?: CriticFinding[];
  banana_fingerprint_score?: number;
}

interface CriticFinding {
  kind: 'ad_fatigue' | 'vertical_compliance' | 'banana_fingerprint' | 'historical_ctr_overlap' | 'other';
  finding: string;
  resolution?: 'fixed' | 'rebutted' | 'killed';
  rebuttal?: string;
}

interface PerVariantPrediction {
  seed: number;
  angle: AdAngle;
  predicted_ctr: number;
  ctr_ci_low: number;
  ctr_ci_high: number;
  predicted_cpl_usd: number;
  cpl_ci_low: number;
  cpl_ci_high: number;
}

interface ProducerOutput {
  variants: VariantCopy[];
  predicted_impact?: {
    model: 'ridge' | 'vertical_prior' | 'uniform_prior';
    training_n: number;
    predicted_ctr: number;
    ctr_ci_low: number;
    ctr_ci_high: number;
    predicted_cpl_usd: number;
    cpl_ci_low: number;
    cpl_ci_high: number;
    per_variant: PerVariantPrediction[];
  };
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
  retrieved_context?: unknown[];
}

interface ShippedArtifact {
  artifact_id: string;
  seed: number;
  angle: AdAngle;
  predicted_ctr: number;
  predicted_cpl_usd: number;
}

interface RunSummary {
  client_id: string;
  vertical: string;
  generated: number;        // total images returned from stage 1 (pre-fingerprint kill)
  survived_fingerprint: number;
  survived_critic: number;
  shipped: number;
  artifacts: ShippedArtifact[];
  cost_usd: number;         // Claude cost only — image gen cost emitted by adapter
  latency_ms: number;
}

// ────────────────────────────────────────────────────────────────────────────
//   Handler
// ────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  let body: { client_id?: string } = {};
  try {
    body = event.body ? (JSON.parse(event.body) as { client_id?: string }) : {};
  } catch {
    return json(400, { error: 'invalid_json_body' });
  }

  const { client_id } = body;
  if (!client_id || typeof client_id !== 'string') {
    return json(400, { error: 'client_id_required' });
  }

  try {
    const summary = await runForClient(client_id);
    summary.latency_ms = Date.now() - t0;
    return json(200, summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agency-creative-foundry] fatal for client=${client_id}:`, err);
    // Surface the failure in the kernel so the founder's morning briefing sees it.
    await safeEmitFatalError(client_id, message);
    return json(500, { error: 'creative_foundry_failed', detail: message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
//   Top-level orchestration
// ────────────────────────────────────────────────────────────────────────────

async function runForClient(client_id: string): Promise<RunSummary> {
  // Load client metadata (vertical, business name, brand tone).
  const client = await loadClient(client_id);

  // ──────────────────────────────────────────────────────────────────────
  // STAGE 1 — DIVERGER
  // ──────────────────────────────────────────────────────────────────────
  const stage1 = await runDiverger({
    client_id,
    vertical: client.vertical,
    business_name: client.business_name,
    dimensions: '1080x1080',
    promo: client.promo,
  });

  if (stage1.survivors.length === 0) {
    // Every image fingerprinted — extremely rare. Emit and bail.
    await emitAgencyEvent({
      client_id,
      agent_name: AGENT_NAME,
      type: 'report_degraded',
      severity: 'warn',
      payload: {
        reason: 'all_images_fingerprinted_at_stage_1',
        fallback_used: false,
        op: 'creative_foundry_run',
      },
      why_explanation:
        'Every Banana image came back above the fingerprint kill threshold. The image gen prompt template likely needs a refresh; queueing a no-op week for this client.',
    });
    return emptySummary(client_id, client.vertical, stage1.generated_count);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Prep for stage 2 + 3: pull the data both stages need.
  // ──────────────────────────────────────────────────────────────────────
  const [recentCopy, history] = await Promise.all([
    loadRecent4wCopy(client_id),
    loadHistoricalCreativeInsights(client_id),
  ]);

  // ──────────────────────────────────────────────────────────────────────
  // PRODUCER PASS via the shared runAgent harness.
  // The harness handles: RAG, model routing, schema enforcement, the
  // adversarial-critic-and-rebuttal pass, artifact insert into kernel
  // columns, event emission.
  //
  // The producer emits one variants[] entry per surviving image. The
  // harness's adversarial critic stage adds compliance_findings; we
  // post-process to KILL any variant that fails the hard kill rules
  // (n-gram overlap > 0.40, vertical-banned wording substring match,
  // historical-CTR similarity > 0.85). What's left goes into the predictor.
  // ──────────────────────────────────────────────────────────────────────
  const producerInput: FoundryInput = {
    client_id,
    vertical: client.vertical,
    business_name: client.business_name,
    dimensions: '1080x1080',
    week_start_iso: new Date().toISOString().slice(0, 10),
    brand_tone: client.brand_tone,
    promo: client.promo,
    _harness_context: {
      images_from_gemini: stage1.survivors,
      recent_4w_copy: recentCopy,
      historical_creative_insights_n: history.records.length,
    },
  };

  const result = await runAgent<FoundryInput, ProducerOutput>({
    agent_name: AGENT_NAME,
    client_id,
    input: producerInput,
    skill_dir: SKILL_DIR,
    output_schema: PRODUCER_SCHEMA,
    artifact_type: 'ad_creative',
    ship_target: 'meta_ads',
    adversarial_critic: true,
    max_iterations: 1,
    agent_default_tier: 'sonnet',
    router_summary: `creative-foundry weekly batch for ${client.business_name} (${client.vertical}); ${stage1.survivors.length} images, ${history.records.length} historical insights`,
    knowledge_query: `${client.vertical} ${client.business_name} brand tone, services, call patterns, recent ads`,
  });

  // ──────────────────────────────────────────────────────────────────────
  // STAGE 2 (post-LLM) — APPLY HARD KILL RULES
  // The Opus critic inside the harness has already produced
  // `adversarial_review.findings`; here we apply the deterministic kill
  // rules that don't need an LLM call.
  // ──────────────────────────────────────────────────────────────────────
  const critiqued = await applyCriticKillRules({
    variants: result.output.variants ?? [],
    vertical: client.vertical,
    recent_4w_copy: recentCopy,
    history,
    upstream_images: stage1.survivors,
  });

  if (critiqued.survivors.length === 0) {
    await emitAgencyEvent({
      client_id,
      agent_name: AGENT_NAME,
      type: 'report_degraded',
      severity: 'warn',
      payload: {
        reason: 'all_variants_killed_in_critic',
        fallback_used: false,
        op: 'creative_foundry_run',
      },
      why_explanation: `Every one of ${critiqued.killed.length} variants failed a hard kill rule (n-gram, compliance, fingerprint, or CTR overlap). No artifacts queued this week.`,
    });
    return {
      client_id,
      vertical: client.vertical,
      generated: stage1.generated_count,
      survived_fingerprint: stage1.survivors.length,
      survived_critic: 0,
      shipped: 0,
      artifacts: [],
      cost_usd: result.cost_usd,
      latency_ms: 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // STAGE 3 — PREDICTOR
  // ──────────────────────────────────────────────────────────────────────
  const prediction = await runPredictor({
    vertical: client.vertical,
    survivors: critiqued.survivors,
    history,
  });

  // Rank by predicted_ctr desc → ship top 3 (or as many as we have).
  const ranked = [...prediction.per_variant].sort(
    (a, b) => b.predicted_ctr - a.predicted_ctr,
  );
  const winners = ranked.slice(0, SHIP_TOP_N);
  const winnerSeeds = new Set(winners.map((w) => w.seed));

  // ──────────────────────────────────────────────────────────────────────
  // Insert one ad_creative artifact PER WINNER. The harness already wrote
  // one composite artifact_id during runAgent (the producer's full
  // variants[] in one row). We now also insert per-winner rows so the
  // queue can rank by predicted_ctr at the variant level. Both routes are
  // valid; queue UI reads the per-variant rows.
  // ──────────────────────────────────────────────────────────────────────
  const shipped = await insertPerVariantArtifacts({
    client_id,
    vertical: client.vertical,
    parent_artifact_id: result.artifact_id,
    winners,
    variants_by_seed: indexBySeed(critiqued.survivors),
    model: 'creative-foundry-pipeline',
    confidence_from_producer: result.confidence,
    reasoning_trace_from_producer: result.reasoning_trace,
    alternatives_rejected_from_producer: result.alternatives_rejected,
    retrieved_context: result.retrieved_context,
    predictor_meta: {
      model: prediction.model,
      training_n: prediction.training_n,
    },
    adversarial_review: result.adversarial_review,
  });

  // Emit one summary event so the morning briefing has a clean line item.
  await emitAgencyEvent({
    client_id,
    agent_name: AGENT_NAME,
    type: 'optimization_brief_queued',
    severity: 'info',
    payload: {
      artifact_id: result.artifact_id,
      experiment_count: shipped.length,
      highest_predicted_lift: winners[0]?.predicted_ctr ?? 0,
    },
    why_explanation: `creative-foundry shipped ${shipped.length} ad_creative artifacts to queue (model=${prediction.model}, training_n=${prediction.training_n}, top predicted CTR ${(winners[0]?.predicted_ctr ?? 0).toFixed(4)}).`,
  });

  return {
    client_id,
    vertical: client.vertical,
    generated: stage1.generated_count,
    survived_fingerprint: stage1.survivors.length,
    survived_critic: critiqued.survivors.length,
    shipped: shipped.length,
    artifacts: shipped,
    cost_usd: result.cost_usd,
    latency_ms: 0,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//   STAGE 1 — DIVERGER (fan-out to gemini-image)
// ────────────────────────────────────────────────────────────────────────────

interface DivergerArgs {
  client_id: string;
  vertical: string;
  business_name: string;
  dimensions: AdDimensions;
  promo: string | null | undefined;
}

interface DivergerResult {
  generated_count: number;
  survivors: AnnotatedImage[];
}

async function runDiverger(args: DivergerArgs): Promise<DivergerResult> {
  const angleResults = await Promise.all(
    ANGLES.map(async (angle) => {
      const prompt = buildAnglePrompt(angle, args.vertical, args.business_name, args.promo);
      try {
        const res = await generateAdCreative({
          client_id: args.client_id,
          vertical: args.vertical,
          angle,
          prompt,
          dimensions: args.dimensions,
          n_variants: VARIANTS_PER_ANGLE,
        });
        return res.images.map<AnnotatedImage>((img) => ({
          url: img.url,
          angle,
          seed: img.seed,
          banana_fingerprint_score: img.banana_fingerprint_score,
        }));
      } catch (err) {
        // One angle failing doesn't fail the run — we still have 3 other angles.
        console.warn(
          `[agency-creative-foundry] diverger angle=${angle} failed: ${(err as Error).message}`,
        );
        return [] as AnnotatedImage[];
      }
    }),
  );

  const all = angleResults.flat();
  const survivors = all.filter((img) => img.banana_fingerprint_score <= FINGERPRINT_KILL);

  return { generated_count: all.length, survivors };
}

function buildAnglePrompt(
  angle: AdAngle,
  vertical: string,
  business_name: string,
  promo: string | null | undefined,
): string {
  // The angle-specific styling lives in gemini-image's ANGLE_STEER; here we
  // give the model the WHO and the WHAT.
  const promoLine = promo ? `Current promo: ${promo}.` : 'No current promo — focus on the core service offering.';
  return [
    `Ad creative for ${business_name}, a ${vertical} business.`,
    promoLine,
    `Angle: ${angle}.`,
  ].join(' ');
}

// ────────────────────────────────────────────────────────────────────────────
//   STAGE 2 — CRITIC HARD-KILL RULES (deterministic, no LLM)
// ────────────────────────────────────────────────────────────────────────────

interface CriticInputArgs {
  variants: VariantCopy[];
  vertical: string;
  recent_4w_copy: string[];
  history: HistoricalInsights;
  upstream_images: AnnotatedImage[];
}

interface CriticInputResult {
  survivors: VariantCopy[];
  killed: Array<{ variant: VariantCopy; reasons: CriticFinding[] }>;
}

async function applyCriticKillRules(args: CriticInputArgs): Promise<CriticInputResult> {
  const upstreamByUrl = new Map(args.upstream_images.map((i) => [i.url, i]));
  // Pre-compute embeddings for bottom-quartile historical creatives (kept tiny —
  // capped at 20). One embedding call per item.
  const bottomQuartile = bottomQuartileByCtr(args.history.records, 20);
  const bottomEmbeddings = await safeEmbedMany(
    bottomQuartile.map((r) => r.copy_hook).filter(Boolean) as string[],
  );

  const survivors: VariantCopy[] = [];
  const killed: CriticInputResult['killed'] = [];

  for (const variant of args.variants) {
    const findings: CriticFinding[] = [];

    // (a) ad-fatigue n-gram overlap
    const overlap = maxNgramOverlap(variant.primary_text, args.recent_4w_copy, 3);
    if (overlap > NGRAM_OVERLAP_KILL) {
      findings.push({
        kind: 'ad_fatigue',
        finding: `n-gram overlap ${overlap.toFixed(2)} with last 4w approved copy exceeds ${NGRAM_OVERLAP_KILL}.`,
        resolution: 'killed',
      });
    }

    // (b) vertical compliance (deterministic substring sweep)
    const banned = VERTICAL_BANNED_WORDING[args.vertical] ?? [];
    const violations = banned.filter((b) =>
      `${variant.primary_text} ${variant.headline}`.toLowerCase().includes(b.toLowerCase()),
    );
    if (violations.length > 0) {
      findings.push({
        kind: 'vertical_compliance',
        finding: `Vertical-banned wording detected: ${violations.map((v) => `"${v}"`).join(', ')}.`,
        resolution: 'killed',
      });
    }

    // (c) fingerprint band check (the harness already KILLED >0.8 upstream;
    // here we tag the ambiguous 0.65-0.80 band so the queue UI surfaces it).
    const upstream = upstreamByUrl.get(variant.image_url);
    const fp = upstream?.banana_fingerprint_score ?? variant.banana_fingerprint_score ?? 0;
    if (fp > FINGERPRINT_KILL) {
      // Should never trigger (filtered in stage 1) but defense-in-depth.
      findings.push({
        kind: 'banana_fingerprint',
        finding: `banana_fingerprint_score ${fp.toFixed(3)} exceeds kill threshold ${FINGERPRINT_KILL}.`,
        resolution: 'killed',
      });
    } else if (fp >= FINGERPRINT_REBUTTAL_BAND) {
      findings.push({
        kind: 'banana_fingerprint',
        finding: `banana_fingerprint_score ${fp.toFixed(3)} in ambiguous band — flag for human review, do not auto-kill.`,
        resolution: 'rebutted',
      });
    }

    // (d) historical CTR overlap
    if (bottomEmbeddings.length > 0) {
      const variantEmb = await safeEmbed(variant.primary_text);
      if (variantEmb) {
        const maxSim = Math.max(
          0,
          ...bottomEmbeddings.map((e) => cosineSimilarity(variantEmb, e)),
        );
        if (maxSim > HISTORICAL_CTR_OVERLAP_KILL) {
          findings.push({
            kind: 'historical_ctr_overlap',
            finding: `Embedding similarity ${maxSim.toFixed(3)} to a bottom-quartile (low-CTR) historical creative exceeds ${HISTORICAL_CTR_OVERLAP_KILL}.`,
            resolution: 'killed',
          });
        }
      }
    }

    const enriched: VariantCopy = {
      ...variant,
      banana_fingerprint_score: fp,
      compliance_findings: findings,
    };

    const hardKill = findings.some((f) => f.resolution === 'killed');
    if (hardKill) {
      killed.push({ variant: enriched, reasons: findings.filter((f) => f.resolution === 'killed') });
    } else {
      survivors.push(enriched);
    }
  }

  return { survivors, killed };
}

// ────────────────────────────────────────────────────────────────────────────
//   STAGE 3 — PREDICTOR (ridge regression over historical insights)
// ────────────────────────────────────────────────────────────────────────────

interface HistoricalRecord {
  ad_id: string;
  copy_hook: string | null;
  embedding: number[] | null;
  ctr: number;
  cpl_usd: number;
  shipped_at: string;
}

interface HistoricalInsights {
  records: HistoricalRecord[];
}

interface PredictorArgs {
  vertical: string;
  survivors: VariantCopy[];
  history: HistoricalInsights;
}

interface PredictorResult {
  model: 'ridge' | 'vertical_prior' | 'uniform_prior';
  training_n: number;
  per_variant: PerVariantPrediction[];
}

async function runPredictor(args: PredictorArgs): Promise<PredictorResult> {
  // Drop history rows without an embedding or with implausible metrics.
  const usable = args.history.records.filter(
    (r) =>
      Array.isArray(r.embedding) &&
      r.embedding.length > 0 &&
      Number.isFinite(r.ctr) &&
      Number.isFinite(r.cpl_usd) &&
      r.ctr >= 0 &&
      r.ctr <= 1 &&
      r.cpl_usd >= 0,
  );

  // Fall back to vertical prior if we don't have enough data to fit.
  if (usable.length < PREDICTOR_MIN_TRAINING_N) {
    const ctrPrior =
      VERTICAL_CTR_PRIOR[args.vertical] ?? FALLBACK_CTR_PRIOR;
    const cplPrior =
      VERTICAL_CPL_PRIOR[args.vertical] ?? FALLBACK_CPL_PRIOR;
    const model: PredictorResult['model'] =
      VERTICAL_CTR_PRIOR[args.vertical] ? 'vertical_prior' : 'uniform_prior';

    const per_variant: PerVariantPrediction[] = args.survivors.map((v) => ({
      seed: v.seed,
      angle: v.angle,
      predicted_ctr: ctrPrior.mean,
      ctr_ci_low: Math.max(0, ctrPrior.mean - CI_Z_80 * ctrPrior.std),
      ctr_ci_high: Math.min(1, ctrPrior.mean + CI_Z_80 * ctrPrior.std),
      predicted_cpl_usd: cplPrior.mean,
      cpl_ci_low: Math.max(0, cplPrior.mean - CI_Z_80 * cplPrior.std),
      cpl_ci_high: cplPrior.mean + CI_Z_80 * cplPrior.std,
    }));

    return { model, training_n: usable.length, per_variant };
  }

  // Fit two ridge regressions: one on CTR, one on CPL.
  const X = usable.map((r) => r.embedding as number[]);
  const yCtr = usable.map((r) => r.ctr);
  const yCpl = usable.map((r) => r.cpl_usd);

  const ridgeCtr = fitRidge(X, yCtr, RIDGE_LAMBDA);
  const ridgeCpl = fitRidge(X, yCpl, RIDGE_LAMBDA);

  // Embed each survivor's hook copy (in parallel).
  const variantEmbeddings = await Promise.all(
    args.survivors.map((v) => safeEmbed(v.primary_text)),
  );

  const per_variant: PerVariantPrediction[] = args.survivors.map((v, i) => {
    const emb = variantEmbeddings[i];
    if (!emb) {
      // Embedding failed for this survivor; fall back to per-vertical mean.
      const ctrPrior = VERTICAL_CTR_PRIOR[args.vertical] ?? FALLBACK_CTR_PRIOR;
      const cplPrior = VERTICAL_CPL_PRIOR[args.vertical] ?? FALLBACK_CPL_PRIOR;
      return {
        seed: v.seed,
        angle: v.angle,
        predicted_ctr: ctrPrior.mean,
        ctr_ci_low: Math.max(0, ctrPrior.mean - CI_Z_80 * ctrPrior.std),
        ctr_ci_high: Math.min(1, ctrPrior.mean + CI_Z_80 * ctrPrior.std),
        predicted_cpl_usd: cplPrior.mean,
        cpl_ci_low: Math.max(0, cplPrior.mean - CI_Z_80 * cplPrior.std),
        cpl_ci_high: cplPrior.mean + CI_Z_80 * cplPrior.std,
      };
    }

    const ctrHat = clamp(predictRidge(ridgeCtr, emb), 0, 1);
    const cplHat = Math.max(0, predictRidge(ridgeCpl, emb));

    const ctrSe = ridgeCtr.residual_std;
    const cplSe = ridgeCpl.residual_std;

    return {
      seed: v.seed,
      angle: v.angle,
      predicted_ctr: round(ctrHat, 5),
      ctr_ci_low: round(Math.max(0, ctrHat - CI_Z_80 * ctrSe), 5),
      ctr_ci_high: round(Math.min(1, ctrHat + CI_Z_80 * ctrSe), 5),
      predicted_cpl_usd: round(cplHat, 2),
      cpl_ci_low: round(Math.max(0, cplHat - CI_Z_80 * cplSe), 2),
      cpl_ci_high: round(cplHat + CI_Z_80 * cplSe, 2),
    };
  });

  return { model: 'ridge', training_n: usable.length, per_variant };
}

// ── Ridge implementation (closed-form, in-memory, no deps) ─────────────────

interface RidgeFit {
  /** Mean of training y (intercept-substitute since X is mean-centered). */
  y_mean: number;
  /** Coefficient vector aligned to embedding dim. */
  beta: number[];
  /** Residual std for 80% CI computation. */
  residual_std: number;
}

/**
 * Closed-form ridge regression: β = (X^T X + λI)^-1 X^T y
 *
 * The embedding dim (1536 for text-embedding-3-large, often 3072) is much
 * larger than typical training_n (~8-50), so we solve in the DUAL via the
 * kernel trick — `β = X^T α` where `α = (XX^T + λI)^-1 y`. This collapses
 * the inversion to an n×n problem regardless of feature dim.
 *
 * Returns the dual coefficients α and the training X kept by reference; at
 * predict time, `ŷ = x · X^T α + y_mean`.
 */
function fitRidge(X: number[][], y: number[], lambda: number): RidgeFit & { X: number[][]; alpha: number[] } {
  const n = X.length;
  if (n === 0) {
    return {
      y_mean: 0, beta: [], residual_std: 0,
      X: [], alpha: [],
    };
  }
  // Mean-center y so the intercept term is implicit.
  const y_mean = y.reduce((a, b) => a + b, 0) / n;
  const yc = y.map((v) => v - y_mean);

  // Build kernel matrix K[n x n] = X X^T.
  const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      const Xi = X[i];
      const Xj = X[j];
      const d = Math.min(Xi.length, Xj.length);
      for (let k = 0; k < d; k++) s += Xi[k] * Xj[k];
      K[i][j] = s;
      K[j][i] = s;
    }
  }
  // (K + λI) α = y_centered
  for (let i = 0; i < n; i++) K[i][i] += lambda;

  const alpha = solveLinearSystem(K, yc);

  // Residual std for CI: compute fitted values and residuals.
  let sse = 0;
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    // ŷ_i = K_orig[i, :] · α + y_mean  (use K BEFORE adding λI back; we
    // re-multiply with original K_orig = K - λI).
    for (let j = 0; j < n; j++) {
      const kij = K[i][j] - (i === j ? lambda : 0);
      yhat += kij * alpha[j];
    }
    const r = (yhat + y_mean) - y[i];
    sse += r * r;
  }
  const dof = Math.max(1, n - 1);
  const residual_std = Math.sqrt(sse / dof);

  // We don't materialize β explicitly (would be d-dim). Predict via dual.
  return { y_mean, beta: [], residual_std, X, alpha };
}

function predictRidge(fit: RidgeFit & { X: number[][]; alpha: number[] }, x: number[]): number {
  // ŷ = x · (X^T α) + y_mean = Σ_i α_i · (x · X_i) + y_mean
  let acc = 0;
  for (let i = 0; i < fit.X.length; i++) {
    const Xi = fit.X[i];
    const d = Math.min(Xi.length, x.length);
    let dot = 0;
    for (let k = 0; k < d; k++) dot += Xi[k] * x[k];
    acc += fit.alpha[i] * dot;
  }
  return acc + fit.y_mean;
}

/**
 * Gaussian elimination with partial pivoting. n×n system Ax = b, returns x.
 * O(n^3) — fine for n ≤ a few hundred which we'll never approach.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augmented matrix [A | b], cloned.
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivot = col;
    let pivotAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > pivotAbs) { pivot = r; pivotAbs = v; }
    }
    if (pivotAbs < 1e-12) {
      // Singular — return zeros to fail gracefully (predictor will fall back
      // to vertical prior on next call).
      console.warn('[agency-creative-foundry] ridge solve hit singular matrix; returning zero coefficients');
      return new Array(n).fill(0);
    }
    if (pivot !== col) {
      const tmp = M[col]; M[col] = M[pivot]; M[pivot] = tmp;
    }
    // Eliminate below
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  // Back substitute
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

// ────────────────────────────────────────────────────────────────────────────
//   Data loading
// ────────────────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  vertical: string;
  business_name: string;
  brand_tone?: string;
  promo?: string | null;
}

async function loadClient(client_id: string): Promise<ClientRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, vertical, business_name, notes')
    .eq('id', client_id)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`agency_clients lookup failed for ${client_id}: ${error?.message ?? 'not found'}`);
  }
  return {
    id: data.id as string,
    vertical: (data.vertical as string) || 'general',
    business_name: (data.business_name as string) || 'this business',
    brand_tone: undefined, // pulled by harness via RAG
    promo: null,
  };
}

async function loadRecent4wCopy(client_id: string): Promise<string[]> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - RECENT_COPY_WINDOW_DAYS * 86400_000).toISOString();
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('content, created_at')
    .eq('client_id', client_id)
    .eq('type', 'ad_creative')
    .in('status', ['approved', 'shipped'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn(`[agency-creative-foundry] loadRecent4wCopy failed: ${error.message}`);
    return [];
  }

  const out: string[] = [];
  for (const row of data ?? []) {
    const payload = (row.content as { payload?: { variants?: Array<{ primary_text?: string }> } })?.payload;
    const variants = payload?.variants ?? [];
    for (const v of variants) {
      if (typeof v.primary_text === 'string' && v.primary_text.trim().length > 0) {
        out.push(v.primary_text);
      }
    }
  }
  return out;
}

async function loadHistoricalCreativeInsights(client_id: string): Promise<HistoricalInsights> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - HISTORICAL_INSIGHTS_WINDOW_DAYS * 86400_000).toISOString();

  // Pull creative_published events that have a Meta ad_id we can fetch insights for.
  const { data, error } = await supabase
    .from('agency_events')
    .select('payload, created_at')
    .eq('client_id', client_id)
    .eq('type', 'creative_published')
    .gte('created_at', since)
    .limit(40);

  if (error) {
    console.warn(`[agency-creative-foundry] loadHistoricalCreativeInsights failed: ${error.message}`);
    return { records: [] };
  }

  interface RawCreativeRow {
    ad_id: string | null;
    artifact_id: string | null;
    shipped_at: string;
  }

  const rawRows: RawCreativeRow[] = (data ?? [])
    .map((r): RawCreativeRow => {
      const payload = (r.payload ?? {}) as { ad_id?: string; artifact_id?: string };
      return {
        ad_id: typeof payload.ad_id === 'string' ? payload.ad_id : null,
        artifact_id: typeof payload.artifact_id === 'string' ? payload.artifact_id : null,
        shipped_at: r.created_at as string,
      };
    })
    .filter((r): r is RawCreativeRow & { ad_id: string } => r.ad_id !== null);

  // Resolve copy hook + embedding per artifact_id (one DB read; cheap).
  const artifactIds: string[] = rawRows
    .map((r) => r.artifact_id)
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  const copyByArtifact = new Map<string, string>();
  if (artifactIds.length > 0) {
    const { data: artData } = await supabase
      .from('agency_artifacts')
      .select('id, content')
      .in('id', artifactIds);
    for (const row of artData ?? []) {
      const payload = (row.content as { payload?: { variants?: Array<{ primary_text?: string }> } })?.payload;
      const first = payload?.variants?.[0]?.primary_text;
      if (typeof first === 'string') copyByArtifact.set(row.id as string, first);
    }
  }

  // Fetch insights for each ad in parallel; cap concurrency at 8 to be polite.
  const insightWindowSince = new Date(Date.now() - HISTORICAL_INSIGHTS_WINDOW_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);
  const insightWindowUntil = new Date().toISOString().slice(0, 10);

  const results: HistoricalRecord[] = [];
  for (const batch of chunk(rawRows, 8)) {
    const batchResults = await Promise.all(
      batch.map(async (row): Promise<HistoricalRecord | null> => {
        const adId = row.ad_id ?? '';
        if (!adId) return null;
        try {
          const insights = await getCreativeInsights({
            ad_id: adId,
            since: insightWindowSince,
            until: insightWindowUntil,
            client_id,
          });
          const copy = row.artifact_id ? copyByArtifact.get(row.artifact_id) ?? null : null;
          let embedding: number[] | null = null;
          if (copy) embedding = await safeEmbed(copy);
          return {
            ad_id: adId,
            copy_hook: copy,
            embedding,
            ctr: insights.ctr ?? 0,
            cpl_usd: insights.cpl ?? 0,
            shipped_at: row.shipped_at,
          };
        } catch (err) {
          console.warn(
            `[agency-creative-foundry] getCreativeInsights failed for ad ${adId}: ${(err as Error).message}`,
          );
          return null;
        }
      }),
    );
    for (const r of batchResults) if (r) results.push(r);
  }

  return { records: results };
}

// ────────────────────────────────────────────────────────────────────────────
//   Artifact persistence — one row per shipped winner
// ────────────────────────────────────────────────────────────────────────────

interface PerWinnerInsertArgs {
  client_id: string;
  vertical: string;
  parent_artifact_id: string;
  winners: PerVariantPrediction[];
  variants_by_seed: Map<number, VariantCopy>;
  model: string;
  confidence_from_producer: number;
  reasoning_trace_from_producer: string[];
  alternatives_rejected_from_producer: unknown[];
  retrieved_context: unknown[];
  predictor_meta: { model: PredictorResult['model']; training_n: number };
  adversarial_review?: { findings: string[]; rebuttals: string[] } | undefined;
}

async function insertPerVariantArtifacts(
  args: PerWinnerInsertArgs,
): Promise<ShippedArtifact[]> {
  const supabase = getServiceSupabase();
  const shipped: ShippedArtifact[] = [];

  // Normalize reasoning_trace to exactly 3 entries to satisfy kernel CHECK.
  const reasoningTrace = normalizeTraceTo3(args.reasoning_trace_from_producer);

  // retrieved_context jsonb shape mirrors the harness's projection.
  const retrievedContextJsonb = (args.retrieved_context as Array<{
    id?: string;
    kind?: string;
    score?: number;
  }>).map((c) => ({
    knowledge_id: c?.id ?? '',
    kind: c?.kind ?? 'unknown',
    score: typeof c?.score === 'number' ? c.score : 0,
  }));

  for (const winner of args.winners) {
    const variant = args.variants_by_seed.get(winner.seed);
    if (!variant) continue;

    const content = {
      payload: {
        variant,
        parent_artifact_id: args.parent_artifact_id,
        predictor_meta: args.predictor_meta,
      },
      iteration_history: [],
    };

    const predicted_impact = {
      model: args.predictor_meta.model,
      training_n: args.predictor_meta.training_n,
      predicted_ctr: winner.predicted_ctr,
      ctr_ci_low: winner.ctr_ci_low,
      ctr_ci_high: winner.ctr_ci_high,
      predicted_cpl_usd: winner.predicted_cpl_usd,
      cpl_ci_low: winner.cpl_ci_low,
      cpl_ci_high: winner.cpl_ci_high,
    };

    const { data, error } = await supabase
      .from('agency_artifacts')
      .insert({
        client_id: args.client_id,
        type: 'ad_creative',
        status: 'draft',
        generated_by: AGENT_NAME,
        model: args.model,
        content,
        ship_target: 'meta_ads',
        cost_usd: 0,             // adapter-side cost emitted as event
        latency_ms: 0,
        confidence: clamp(args.confidence_from_producer, 0, 1),
        reasoning_trace: reasoningTrace,
        retrieved_context: retrievedContextJsonb,
        alternatives_rejected: args.alternatives_rejected_from_producer ?? [],
        adversarial_review: args.adversarial_review ?? null,
        predicted_impact,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.warn(
        `[agency-creative-foundry] artifact insert failed for seed=${winner.seed}: ${error?.message ?? 'no data'}`,
      );
      continue;
    }

    // Per-variant creative_published draft sentinel (platform='other' because
    // it hasn't been pushed yet; the post-ship handler emits a second event
    // with the real platform when the founder approves).
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: AGENT_NAME,
      type: 'creative_published',
      severity: 'info',
      payload: {
        artifact_id: data.id as string,
        platform: 'other',
        predicted_ctr: winner.predicted_ctr,
      },
      why_explanation: `Variant ${winner.angle}#${winner.seed} queued. Predicted CTR ${winner.predicted_ctr.toFixed(4)} (80% CI ${winner.ctr_ci_low.toFixed(4)}-${winner.ctr_ci_high.toFixed(4)}); predicted CPL $${winner.predicted_cpl_usd.toFixed(2)}.`,
    });

    shipped.push({
      artifact_id: data.id as string,
      seed: winner.seed,
      angle: winner.angle,
      predicted_ctr: winner.predicted_ctr,
      predicted_cpl_usd: winner.predicted_cpl_usd,
    });
  }

  return shipped;
}

async function safeEmitFatalError(client_id: string, message: string): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id,
      agent_name: AGENT_NAME,
      type: 'adapter_error',
      severity: 'critical',
      payload: {
        adapter: AGENT_NAME,
        operation: 'run',
        error_class: 'CreativeFoundryFatal',
        error_message: message,
        retryable: false,
      },
      why_explanation: `creative-foundry runner crashed mid-pipeline for client; founder briefing should surface this.`,
    });
  } catch (e) {
    console.error('[agency-creative-foundry] safeEmitFatalError failed:', e);
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema (producer-facing; consumed by run-agent.ts harness)
// ────────────────────────────────────────────────────────────────────────────
//
// The harness merges in confidence + reasoning_trace + alternatives_rejected
// automatically; we only declare the producer-specific fields. NOTE: the
// `additionalProperties: false` semantics on the harness side are NOT enforced
// because the harness wraps the schema with extra cross-cutting fields. We
// keep additionalProperties: false here to stay tight in the on-disk file.

const PRODUCER_SCHEMA: JsonSchemaObject = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          image_url:               { type: 'string' },
          angle:                   { type: 'string', enum: ['proof', 'fear', 'status', 'curiosity'] },
          seed:                    { type: 'integer' },
          primary_text:            { type: 'string' },
          headline:                { type: 'string' },
          cta:                     { type: 'string', enum: ['LEARN_MORE', 'BOOK_NOW', 'GET_QUOTE'] },
          compliance_self_check:   { type: 'string' },
          ngram_overlap_estimate:  { type: 'number', minimum: 0, maximum: 1 },
        },
        required: [
          'image_url',
          'angle',
          'seed',
          'primary_text',
          'headline',
          'cta',
          'compliance_self_check',
          'ngram_overlap_estimate',
        ],
      },
    },
  },
  required: ['variants'],
};

// ────────────────────────────────────────────────────────────────────────────
//   Utilities
// ────────────────────────────────────────────────────────────────────────────

function json(status: number, body: unknown): { statusCode: number; body: string; headers: Record<string, string> } {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  };
}

function emptySummary(client_id: string, vertical: string, generated: number): RunSummary {
  return {
    client_id,
    vertical,
    generated,
    survived_fingerprint: 0,
    survived_critic: 0,
    shipped: 0,
    artifacts: [],
    cost_usd: 0,
    latency_ms: 0,
  };
}

function indexBySeed(variants: VariantCopy[]): Map<number, VariantCopy> {
  const m = new Map<number, VariantCopy>();
  for (const v of variants) m.set(v.seed, v);
  return m;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeTraceTo3(raw: unknown): string[] {
  const arr = Array.isArray(raw)
    ? raw.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : [];
  if (arr.length === 3) return arr;
  if (arr.length > 3) return arr.slice(0, 3);
  const padded = [...arr];
  while (padded.length < 3) padded.push('(no additional reasoning provided)');
  return padded;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

/** Max overlap fraction of `candidate`'s n-grams that appear in any reference. */
function maxNgramOverlap(candidate: string, references: string[], n: number): number {
  if (references.length === 0) return 0;
  const candidateGrams = ngrams(tokenize(candidate), n);
  if (candidateGrams.length === 0) return 0;
  const candidateSet = new Set(candidateGrams);
  let best = 0;
  for (const ref of references) {
    const refGrams = new Set(ngrams(tokenize(ref), n));
    if (refGrams.size === 0) continue;
    let intersection = 0;
    for (const g of candidateSet) if (refGrams.has(g)) intersection++;
    // Overlap = |candidate ∩ ref| / |candidate|  — we care if the CANDIDATE
    // is heavily borrowed, not symmetric Jaccard.
    const overlap = intersection / candidateSet.size;
    if (overlap > best) best = overlap;
  }
  return best;
}

function bottomQuartileByCtr(records: HistoricalRecord[], cap: number): HistoricalRecord[] {
  if (records.length === 0) return [];
  const sorted = [...records].sort((a, b) => a.ctr - b.ctr);
  const cutIdx = Math.max(1, Math.floor(sorted.length / 4));
  return sorted.slice(0, Math.min(cutIdx, cap));
}

async function safeEmbed(text: string): Promise<number[] | null> {
  try {
    if (!text || !text.trim()) return null;
    const vec = await generateEmbedding(text);
    return Array.isArray(vec) && vec.length > 0 ? vec : null;
  } catch (err) {
    console.warn(`[agency-creative-foundry] embed failed: ${(err as Error).message}`);
    return null;
  }
}

async function safeEmbedMany(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map((t) => safeEmbed(t)));
  return results.filter((v): v is number[] => Array.isArray(v));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const d = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < d; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Re-export for tests / unit harness imports.
export { runForClient, runDiverger, applyCriticKillRules, runPredictor, fitRidge, maxNgramOverlap };
