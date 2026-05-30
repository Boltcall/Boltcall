/**
 * Per-artifact model routing classifier (Cross-cutting feature #5).
 *
 * The model-routing decision (Haiku / Sonnet / Opus) is NOT static per agent —
 * it's per-call, based on a tiny Haiku classifier that estimates "how hard is
 * THIS specific input". Trivial inputs get downgraded one tier, normal inputs
 * stay at the agent default, hard inputs get bumped up one tier.
 *
 * Why: a single agent processes wildly different inputs in production
 *   - intake call w/ a clear single-speaker voicemail   → trivial   (Haiku is plenty)
 *   - typical web-form lead with a few sentences        → normal    (agent default)
 *   - 40-min transcript w/ code-switching + 4 speakers  → hard      (need Opus)
 * Routing every call through Opus = burning money. Routing every call through
 * Haiku = quality regressions on the long-tail hard cases. This classifier is
 * the cheap escape valve: ~50 tokens of Haiku per call to decide what to spend
 * the real budget on.
 *
 * Exports:
 *   - classifyDifficulty(input)  →  { difficulty, reasoning, model_recommended }
 *   - routeModel({ agent_name, agent_default_tier, difficulty })  →  final tier
 *
 * Caching: identical input summaries are memoized for 24h via an in-memory LRU
 * (later: Supabase agency_events lookup so cache survives cold starts). Saves
 * cost on repeated work — e.g. nightly reruns over the same intake batch.
 *
 * Logging: every routing decision is emitted as an `agency_events` row of type
 * `cost_incurred` so the routing policy itself becomes optimizable by a
 * meta-loop (which inputs are we over-spending on? which agents are we
 * under-spending on?).
 */

import { chatCompletion } from '../azure-ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelTier = 'haiku' | 'sonnet' | 'opus';
export type Difficulty = 'trivial' | 'normal' | 'hard';

export interface ClassifyInput {
  /** Logical name of the calling agent (e.g. "intake-extractor", "transcript-summarizer"). */
  agent_name: string;
  /**
   * One-line description of the input — caller's responsibility to make this
   * representative. Examples:
   *   - "voicemail transcript, single speaker, 30s, clear English"
   *   - "web form lead: name + email + 2-sentence message asking about pricing"
   *   - "40min call transcript, 4 speakers, code-switching EN/ES, low audio quality"
   * Bad summaries → bad routing. The summary IS the classifier's input.
   */
  summary: string;
  /** Optional: byte count of the actual payload. >=50k auto-bumps difficulty. */
  payload_size_chars?: number;
  /**
   * Optional: pre-known difficulty hints the caller already detected. Any of
   * these present biases the classifier toward "hard". Recognized values:
   *   'code-switching'      — multiple languages mixed mid-utterance
   *   'multi-speaker'       — 3+ distinct speakers
   *   'low-quality-audio'   — heavy background noise, dropouts, etc.
   *   'long-context'        — >10k tokens of input
   *   'ambiguous-intent'    — caller / sender intent is unclear
   *   'adversarial'         — input may be trying to manipulate the agent
   *   'regulated-output'    — answer affects legal / medical / financial obligation
   */
  known_signals?: string[];
}

export interface ClassifyResult {
  difficulty: Difficulty;
  /** 1-2 sentence why-this-difficulty, mirrored from the Haiku classifier output. */
  reasoning: string;
  /**
   * Standalone recommendation IGNORING the agent's default tier. Use this only
   * if the caller wants a tier-agnostic recommendation (rare). Most callers
   * should pass `difficulty` through `routeModel(...)` instead.
   */
  model_recommended: ModelTier;
}

export interface RouteModelArgs {
  agent_name: string;
  agent_default_tier: ModelTier;
  difficulty: Difficulty;
}

// ---------------------------------------------------------------------------
// Constants — auto-bump thresholds + tier order
// ---------------------------------------------------------------------------

const PAYLOAD_AUTO_BUMP_CHARS = 50_000;
const TIER_ORDER: ModelTier[] = ['haiku', 'sonnet', 'opus'];

/** Signals that, if present, force the classifier toward "hard" regardless of summary. */
const HARD_SIGNALS = new Set<string>([
  'code-switching',
  'multi-speaker',
  'low-quality-audio',
  'long-context',
  'adversarial',
  'regulated-output',
]);

// ---------------------------------------------------------------------------
// 24h in-memory LRU cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1_000;

interface CacheEntry {
  result: ClassifyResult;
  expires_at: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(input: ClassifyInput): string {
  // Normalize so trivially different whitespace doesn't bust the cache.
  const summary = input.summary.trim().toLowerCase().replace(/\s+/g, ' ');
  const signals = (input.known_signals ?? []).slice().sort().join(',');
  // Bucket payload size into coarse buckets so 12_034 chars and 12_512 chars
  // share a cache slot. Buckets: <1k, <10k, <50k, <200k, >=200k.
  const size = input.payload_size_chars ?? 0;
  let bucket = '0';
  if (size >= 200_000) bucket = '200k+';
  else if (size >= 50_000) bucket = '50k';
  else if (size >= 10_000) bucket = '10k';
  else if (size >= 1_000) bucket = '1k';
  return `${input.agent_name}|${summary}|${signals}|${bucket}`;
}

function cacheGet(key: string): ClassifyResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires_at < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU touch: re-insert to move to end.
  cache.delete(key);
  cache.set(key, entry);
  return entry.result;
}

function cacheSet(key: string, result: ClassifyResult): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Evict oldest (first inserted) — Map preserves insertion order.
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { result, expires_at: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// emitAgencyEvent — lazy-bound, no-op fallback if module not yet shipped
// ---------------------------------------------------------------------------

/**
 * Lazy load `./events` so this file doesn't hard-fail if the events helper
 * hasn't landed yet. When the events module IS present, every routing decision
 * is logged as a `cost_incurred` row in `agency_events`.
 *
 * Failures here are silent on purpose: routing must never throw because the
 * audit log is down.
 */
type EmitAgencyEventFn = (event: {
  type: string;
  severity?: 'info' | 'warn' | 'error' | 'critical';
  agent_name?: string;
  payload: Record<string, unknown>;
}) => Promise<void> | void;

let emitAgencyEventCached: EmitAgencyEventFn | null | undefined;

async function getEmitAgencyEvent(): Promise<EmitAgencyEventFn | null> {
  if (emitAgencyEventCached !== undefined) return emitAgencyEventCached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('./events');
    const fn = (mod?.emitAgencyEvent ?? mod?.default ?? null) as EmitAgencyEventFn | null;
    emitAgencyEventCached = fn;
    return fn;
  } catch {
    emitAgencyEventCached = null;
    return null;
  }
}

async function safeEmitCostIncurred(payload: {
  agent_name: string;
  model_chosen: ModelTier;
  difficulty: Difficulty;
  reason: string;
}): Promise<void> {
  try {
    const emit = await getEmitAgencyEvent();
    if (!emit) return;
    await emit({
      type: 'cost_incurred',
      severity: 'info',
      agent_name: payload.agent_name,
      payload,
    });
  } catch {
    // Never throw from a logging hook.
  }
}

// ---------------------------------------------------------------------------
// Classifier prompt — tight rubric + concrete examples
// ---------------------------------------------------------------------------

const CLASSIFIER_SYSTEM_PROMPT = `You are a difficulty classifier for routing AI agent inputs to the right model tier (Haiku / Sonnet / Opus). Your ONLY job is to score how hard a given input is to handle correctly.

RUBRIC — pick exactly one of: "trivial", "normal", "hard".

TRIVIAL — Haiku is plenty. Pick this when ALL of the following are true:
  - Input is small (<2k chars) AND structurally simple (single message, single speaker, one clear ask).
  - Intent is unambiguous (e.g. "what are your hours", "schedule a callback", "thanks bye").
  - No regulated output (no legal/medical/financial advice required).
  - No multi-step reasoning required — extract a field, classify a sentiment, summarize one paragraph.
  Examples:
    - "voicemail transcript, single speaker, 20s, clear English, asking for callback"
    - "web form lead: name + phone + 'interested in pricing'"
    - "1-sentence SMS: 'can you call me tomorrow at 2pm'"

NORMAL — agent default tier. Pick this when the input is what the agent was designed for in the median case:
  - 2k-15k chars, 1-2 speakers, mostly clear intent.
  - Standard extraction / summarization / drafting work.
  - Some reasoning but no novel edge cases.
  Examples:
    - "5-minute intake call, single speaker, clear English, standard objections"
    - "email thread, 4 messages, customer asking about refund timeline"
    - "transcript of a discovery call, 1 caller + 1 agent, 12min, no audio issues"

HARD — bump up one tier. Pick this when ANY of the following are true:
  - Multiple speakers (3+) OR code-switching between languages mid-utterance.
  - Low-quality audio (background noise, dropouts, accents the model struggles with).
  - Long context (>15k chars / >10k tokens).
  - Ambiguous intent or adversarial input (caller trying to manipulate the agent).
  - Regulated output (legal advice, medical guidance, financial recommendations, immigration).
  - Multi-step reasoning where a wrong intermediate step compounds (e.g. multi-entity extraction with cross-references).
  - The agent is being asked to make a judgment call with downstream business impact >$1k.
  Examples:
    - "40min call transcript, 4 speakers, code-switching EN/ES, low audio quality"
    - "legal intake for personal injury case, must extract 12 entities with relationships"
    - "complaint email referencing 3 prior interactions, asking for refund + service credit + apology"
    - "voicemail in heavy accent with background noise, ambiguous intent"

OUTPUT FORMAT — return STRICT JSON, nothing else. No markdown fences, no commentary.
{
  "difficulty": "trivial" | "normal" | "hard",
  "reasoning": "<one short sentence, max 25 words, citing the signal that drove the decision>",
  "model_recommended": "haiku" | "sonnet" | "opus"
}

For "model_recommended": trivial→"haiku", normal→"sonnet", hard→"opus". This is the standalone recommendation. The caller will combine it with the agent default tier.`;

// ---------------------------------------------------------------------------
// classifyDifficulty
// ---------------------------------------------------------------------------

/**
 * Estimate how hard a single input is for an agent to handle. Cheap (~50
 * tokens of Haiku) and cached for 24h on identical summaries.
 *
 * Never throws — falls back to `normal` if the classifier fails for any reason
 * (network, parse error, missing API key). A degraded routing decision is
 * strictly better than blocking the caller.
 */
export async function classifyDifficulty(
  input: ClassifyInput,
): Promise<ClassifyResult> {
  // 1) Cache hit short-circuits everything.
  const key = cacheKey(input);
  const cached = cacheGet(key);
  if (cached) return cached;

  // 2) Auto-bump path — if a known-hard signal or massive payload is present,
  //    skip the Haiku call entirely. This saves cost and is more reliable than
  //    asking the classifier to also do this arithmetic.
  const autoBumpSignal = (input.known_signals ?? []).find((s) =>
    HARD_SIGNALS.has(s),
  );
  const autoBumpSize =
    (input.payload_size_chars ?? 0) >= PAYLOAD_AUTO_BUMP_CHARS;

  if (autoBumpSignal || autoBumpSize) {
    const reason = autoBumpSignal
      ? `Auto-bumped to hard: signal "${autoBumpSignal}" present.`
      : `Auto-bumped to hard: payload ${input.payload_size_chars} chars >= ${PAYLOAD_AUTO_BUMP_CHARS}.`;
    const result: ClassifyResult = {
      difficulty: 'hard',
      reasoning: reason,
      model_recommended: 'opus',
    };
    cacheSet(key, result);
    return result;
  }

  // 3) Build the user message — keep it short. The summary IS the signal.
  const signalsBlock =
    input.known_signals && input.known_signals.length
      ? `\nKnown signals: ${input.known_signals.join(', ')}`
      : '';
  const sizeBlock =
    input.payload_size_chars !== undefined
      ? `\nPayload size: ${input.payload_size_chars} chars`
      : '';
  const userPrompt = `Agent: ${input.agent_name}
Input summary: ${input.summary}${signalsBlock}${sizeBlock}

Classify the difficulty of this input per the rubric. Return JSON only.`;

  // 4) Run the classifier. Haiku via the existing azure-ai helper (which
  //    routes Foundry → legacy → Anthropic Haiku). 200 tokens is plenty for
  //    the structured JSON response.
  let raw = '';
  try {
    raw = await chatCompletion(CLASSIFIER_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 200,
      tier: 'light', // light = Haiku in the Anthropic fallback path, mini in Foundry
    });
  } catch {
    // Network / config failure → degrade to normal so caller keeps moving.
    const fallback: ClassifyResult = {
      difficulty: 'normal',
      reasoning: 'Classifier call failed; defaulted to normal.',
      model_recommended: 'sonnet',
    };
    cacheSet(key, fallback);
    return fallback;
  }

  // 5) Parse — strip markdown fences if the model added them despite the prompt.
  const parsed = parseClassifierJson(raw);
  if (!parsed) {
    const fallback: ClassifyResult = {
      difficulty: 'normal',
      reasoning: 'Classifier output unparseable; defaulted to normal.',
      model_recommended: 'sonnet',
    };
    cacheSet(key, fallback);
    return fallback;
  }

  cacheSet(key, parsed);
  return parsed;
}

function parseClassifierJson(raw: string): ClassifyResult | null {
  if (!raw) return null;
  // Strip ```json fences and stray whitespace.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    // Last-ditch: extract the first {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      obj = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const difficulty = o.difficulty;
  const reasoning = o.reasoning;
  const model_recommended = o.model_recommended;

  if (
    difficulty !== 'trivial' &&
    difficulty !== 'normal' &&
    difficulty !== 'hard'
  ) {
    return null;
  }
  if (
    model_recommended !== 'haiku' &&
    model_recommended !== 'sonnet' &&
    model_recommended !== 'opus'
  ) {
    return null;
  }

  return {
    difficulty,
    reasoning: typeof reasoning === 'string' ? reasoning : '',
    model_recommended,
  };
}

// ---------------------------------------------------------------------------
// routeModel
// ---------------------------------------------------------------------------

/**
 * Combine the agent's default tier with the classifier verdict to pick the
 * final model. Side-effect: emits a `cost_incurred` agency event so the
 * routing policy itself is observable + optimizable by a meta-loop.
 *
 * Mapping (relative to agent_default_tier):
 *   - trivial → downgrade one tier   (sonnet→haiku, opus→sonnet, haiku stays)
 *   - normal  → stay
 *   - hard    → upgrade one tier     (haiku→sonnet, sonnet→opus, opus stays)
 *
 * Synchronous return; the event emission is fire-and-forget.
 */
export function routeModel(args: RouteModelArgs): ModelTier {
  const { agent_name, agent_default_tier, difficulty } = args;

  const defaultIdx = TIER_ORDER.indexOf(agent_default_tier);
  if (defaultIdx === -1) {
    // Unknown tier — return as-is rather than guessing.
    void safeEmitCostIncurred({
      agent_name,
      model_chosen: agent_default_tier,
      difficulty,
      reason: `Unknown agent_default_tier "${agent_default_tier}"; returned unchanged.`,
    });
    return agent_default_tier;
  }

  let delta = 0;
  let reason = '';
  switch (difficulty) {
    case 'trivial':
      delta = -1;
      reason = `Trivial input — downgraded one tier from ${agent_default_tier}.`;
      break;
    case 'hard':
      delta = +1;
      reason = `Hard input — upgraded one tier from ${agent_default_tier}.`;
      break;
    case 'normal':
    default:
      delta = 0;
      reason = `Normal input — staying at agent default ${agent_default_tier}.`;
      break;
  }

  const clampedIdx = Math.max(
    0,
    Math.min(TIER_ORDER.length - 1, defaultIdx + delta),
  );
  const chosen = TIER_ORDER[clampedIdx];

  // Note if a clamp actually swallowed the bump (e.g. opus→opus on hard).
  if (clampedIdx !== defaultIdx + delta) {
    reason += ' (clamped at tier boundary)';
  }

  // Fire-and-forget: never block routing on the audit log.
  void safeEmitCostIncurred({
    agent_name,
    model_chosen: chosen,
    difficulty,
    reason,
  });

  return chosen;
}

// ---------------------------------------------------------------------------
// Test hooks — exported only so unit tests can reset state between cases.
// Not part of the public API; do not call from production code.
// ---------------------------------------------------------------------------

export const __test__ = {
  clearCache: (): void => cache.clear(),
  cacheSize: (): number => cache.size,
  cacheKey,
  parseClassifierJson,
  TIER_ORDER,
  HARD_SIGNALS,
  CACHE_TTL_MS,
  PAYLOAD_AUTO_BUMP_CHARS,
};
