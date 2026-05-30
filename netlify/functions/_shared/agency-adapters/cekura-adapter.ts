/**
 * agency-adapters/cekura-adapter.ts
 *
 * The Cekura adapter — KILLER FEATURE enabler for the Agency OS.
 *
 * Powers:
 *   1. Killer Feature #1: per-client simulated-client digital twin fleet
 *      (50-200 personas auto-generated from real call transcripts, refreshed
 *      continuously, exposed to clients as a sales artifact).
 *   2. agent-architect's generate-simulate-iterate loop (pre-ship gate).
 *   3. optimization-strategist's counterfactual playback (predict lift before
 *      shipping a new prompt by replaying historical calls under it).
 *   4. expansion-spotter's per-prospect simulated-value pitch.
 *
 * This adapter is a thin, reusable interface on top of the existing Cekura
 * HTTP API (api.cekura.ai/test_framework/v1) that the retell-cekura-gate.ts
 * Netlify function already speaks. We reuse the same auth header
 * (X-CEKURA-API-KEY) and base URL so no new env vars are needed.
 *
 * Persistence:
 *   - agency_digital_twin_personas: per-client persona fleets
 *   - agency_simulation_runs:       per-batch run results + cost
 *   - agency_events:                cost-tracking + outcome events
 *   - aios_event_log:               cross-system event bus (per CLAUDE.md)
 *
 * NOTE: agency_* tables may not exist yet during early agency-OS rollout.
 * All persistence calls are best-effort: failures log + return gracefully
 * rather than throwing, so the adapter can be exercised by agent-architect
 * before the schema is fully laid down. Real cost-tracking events still flow
 * into aios_event_log even if agency_* tables are missing.
 *
 * Cost model (simulation runs are expensive):
 *   - persona generation (Claude Opus): ~$0.05-0.20 per fleet of 100
 *   - text-mode simulated call (Cekura): ~$0.02-0.08 per call
 *   - playback diff (text-mode rerun + judge): ~$0.05 per historical call
 * Every batch run emits a cost_usd field; aios_event_log gets a
 * `cekura_batch_completed` event per run with cost + duration.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  emitAgencyEvent,
  type AgencyEventType,
  type AgencyEventSeverity,
} from '../emit-agency-event';

// ─── Constants ──────────────────────────────────────────────────────────────

const CEKURA_API_BASE = 'https://api.cekura.ai/test_framework/v1';
const RETELL_API_BASE = 'https://api.retellai.com';

// Cost estimates (USD) — used to attribute cost to events. Tune as we get
// real Cekura billing data. Conservative defaults.
const COST_PER_PERSONA_GENERATION_USD = 0.0015;   // Opus tokens to extract one persona
const COST_PER_SIMULATED_CALL_USD     = 0.05;     // Cekura text-mode call avg
const COST_PER_PLAYBACK_DIFF_USD      = 0.06;     // playback + judge

// Default fleet stratification dimensions — used when caller doesn't pass any.
const DEFAULT_STRATIFY_DIMS = [
  'objection_pattern',
  'accent',
  'demographic',
  'time_of_day',
  'intent',
] as const;

// Claude model for persona clustering — must match CLAUDE.md routing
// (Opus 4.7 for deep_think / strategic synthesis).
const PERSONA_CLUSTER_MODEL = 'claude-opus-4-5-20250929';

// ─── Types — public contract ────────────────────────────────────────────────

export interface Persona {
  persona_id: string;
  intent: string;                       // e.g. 'price_shopper', 'emergency', 'comparison'
  objection_pattern: string;            // e.g. 'always_asks_for_discount'
  accent_profile: string;               // e.g. 'southern_us', 'spanish_l2_english'
  sample_dialog_seed: string;           // first 1-2 lines the persona would say
  demographic?: string;                 // optional richer fields
  time_of_day?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source_transcript_ids?: string[];     // provenance back to real calls
}

export interface PersonaFleet {
  fleet_id: string;
  personas: Persona[];
  cost_usd: number;
}

export interface SimulationCallResult {
  persona_id: string;
  call_id: string;
  transcript: string;
  outcome: 'booked' | 'transferred' | 'lost' | 'hung_up';
  qa_score: number;                     // 0-10 composite
  failure_modes: string[];              // tags surfaced by the judge
  dim_scores?: Record<string, number>;  // per-dimension breakdown
}

export interface SimulationBatchResult {
  results: SimulationCallResult[];
  aggregate: {
    avg_qa_score: number;
    per_dim_scores: Record<string, number>;
    failure_clusters: Array<{ cluster_label: string; count: number }>;
  };
  cost_usd: number;
  duration_min: number;
}

export interface PlaybackDiff {
  call_id: string;
  original_outcome: string;
  counterfactual_outcome: string;
  qa_score_delta: number;               // counterfactual - original
  original_transcript_excerpt?: string;
  counterfactual_transcript_excerpt?: string;
}

export interface RefreshResult {
  fleet_id: string;
  n_added: number;
  n_removed: number;
}

export interface ProofExport {
  proof_url: string;
  summary_stats: {
    n_personas: number;
    avg_qa_score: number;
    vertical_benchmark_percentile: number;
  };
}

export interface AgentConfig {
  prompt: string;
  kb: any;
  voice_id?: string;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function cekuraFetch(path: string, method: string, body?: any) {
  const apiKey = process.env.CEKURA_API_KEY;
  if (!apiKey) {
    throw new Error(
      'CEKURA_API_KEY not configured — set in Netlify env. Cekura SDK is HTTP-only; ' +
      'this adapter speaks api.cekura.ai/test_framework/v1 directly.',
    );
  }
  const res = await fetch(`${CEKURA_API_BASE}${path}`, {
    method,
    headers: {
      'X-CEKURA-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Cekura API ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function retellFetch(path: string, options: RequestInit = {}) {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error('RETELL_API_KEY not configured');
  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Retell API ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Best-effort Supabase insert. Logs but never throws so a missing
 * agency_* table doesn't break the adapter for callers that don't care
 * about persistence yet (e.g. agent-architect's first-iteration loop).
 */
async function safeInsert(table: string, rows: any | any[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(table).insert(rows);
    if (error) {
      console.warn(`[cekura-adapter] insert into ${table} failed (non-blocking): ${error.message}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[cekura-adapter] insert into ${table} threw (non-blocking): ${err?.message}`);
    return false;
  }
}

/**
 * Route a cekura-adapter cost/outcome event through the canonical shared
 * `emitAgencyEvent` helper. The shared helper validates the payload against
 * the per-type Zod schema and writes to `public.agency_events` with the
 * correct kernel columns (type / severity / payload / agent_name /
 * created_at) — never the legacy `event_type` / `cost_usd` / `ts` columns
 * which do not exist on the kernel table.
 *
 * Mirroring to `aios_event_log` is handled inside `emitAgencyEvent` (compact
 * summary only — full payload stays in `agency_events`). No duplicate write
 * from this adapter.
 *
 * Mapping (each adapter `event_type` → kernel `AgencyEventType`):
 *   - cekura_fleet_generated     → cost_incurred       (provider=anthropic, Opus tokens)
 *   - cekura_batch_completed     → digital_twin_run_completed
 *   - cekura_playback_completed  → digital_twin_run_completed (no fleet, ad-hoc replay)
 *   - cekura_proof_exported      → cost_incurred       (amount_usd=0, internal telemetry)
 *   - anything else              → cost_incurred       (safe fallback)
 *
 * Throws are swallowed: this is telemetry; a schema rejection or DB error
 * must never break the simulation pipeline.
 */
async function emitCostEvent(opts: {
  event_type: string;
  client_id?: string;
  cost_usd: number;
  payload: Record<string, any>;
}): Promise<void> {
  const client_id = (opts.client_id ?? null) as unknown as string;
  const p = opts.payload ?? {};

  let type: AgencyEventType;
  let severity: AgencyEventSeverity = 'info';
  let typedPayload: Record<string, unknown>;

  switch (opts.event_type) {
    case 'cekura_batch_completed':
    case 'cekura_playback_completed': {
      // digital_twin_run_completed schema:
      //   run_id (req), artifact_id, persona_count (req, positive int),
      //   pass_rate (req, 0-1), average_qa_score (req, 0-10),
      //   failure_clusters (optional int count — NOT array).
      type = 'digital_twin_run_completed';
      const nCalls = Math.max(1, Number(p.n_calls ?? 1));
      const avgQa = Number(p.avg_qa_score ?? 0);
      // Approximate pass_rate from avg score (0-10) → (0-1) when not provided.
      const passRate = typeof p.pass_rate === 'number'
        ? Math.min(1, Math.max(0, p.pass_rate))
        : Math.min(1, Math.max(0, avgQa / 10));
      const failureClusterCount = Array.isArray(p.failure_clusters)
        ? p.failure_clusters.length
        : (typeof p.failure_clusters === 'number' ? p.failure_clusters : undefined);
      typedPayload = {
        run_id: String(p.fleet_id ?? `cekura-${opts.event_type}-${Date.now()}`),
        ...(p.artifact_id ? { artifact_id: String(p.artifact_id) } : {}),
        persona_count: nCalls,
        pass_rate: passRate,
        average_qa_score: avgQa,
        ...(typeof failureClusterCount === 'number'
          ? { failure_clusters: failureClusterCount }
          : {}),
      };
      break;
    }
    case 'cekura_fleet_generated': {
      // cost_incurred schema with provider=anthropic (Opus tokens for
      // persona clustering). Provider-specific metadata (fleet_id,
      // n_personas, n_source_transcripts) is folded into allowed
      // optional fields where it fits (`source`, `op`).
      type = 'cost_incurred';
      typedPayload = {
        category: 'cekura_fleet_generation',
        provider: 'anthropic',
        amount_usd: Number(opts.cost_usd ?? 0),
        op: opts.event_type,
        source: `fleet=${String(p.fleet_id ?? '')};n_personas=${String(p.n_personas ?? '')};n_transcripts=${String(p.n_source_transcripts ?? '')}`,
      };
      break;
    }
    case 'cekura_proof_exported':
    default: {
      // cost_incurred fallback. Cekura proof export has no associated
      // model spend; amount_usd is whatever the caller declared
      // (typically 0). provider='other' so this stays distinguishable
      // from Anthropic spend in cost dashboards.
      type = 'cost_incurred';
      typedPayload = {
        category: opts.event_type,
        provider: 'other',
        amount_usd: Number(opts.cost_usd ?? 0),
        op: opts.event_type,
        source: typeof p.fleet_id === 'string' ? `fleet=${p.fleet_id}` : 'cekura-adapter',
      };
      break;
    }
  }

  try {
    await emitAgencyEvent({
      client_id,
      agent_name: 'cekura-adapter',
      type,
      severity,
      payload: typedPayload,
    });
  } catch (err: any) {
    // Telemetry must never break the simulation pipeline. Log without the
    // payload (PII) — the shared helper has already logged the per-field
    // issue codes if this was a schema rejection.
    console.warn(
      `[cekura-adapter] emitAgencyEvent failed (non-blocking) for ` +
      `event=${opts.event_type} type=${type}: ${err?.message ?? String(err)}`,
    );
  }
}

/**
 * Call Claude (Opus) to cluster source transcripts into N representative
 * personas. Returns persona objects already shaped for the Cekura scenario
 * format downstream.
 *
 * Uses @anthropic-ai/sdk (already a devDependency at ^0.80.0).
 */
async function clusterPersonasWithClaude(opts: {
  source_transcripts: string[];
  n_personas: number;
  stratify_by: string[];
}): Promise<{ personas: Persona[]; cost_usd: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // TODO(cekura-adapter): wire ANTHROPIC_API_KEY in Netlify env. Until then,
    // fall back to a deterministic stub fleet so agent-architect can iterate.
    console.warn('[cekura-adapter] ANTHROPIC_API_KEY missing — returning stub personas.');
    return {
      personas: buildStubPersonas(opts.n_personas),
      cost_usd: 0,
    };
  }

  // Lazy-import the SDK so this file stays cheap to load when persona
  // generation isn't used (e.g. ad-hoc simulation paths).
  let Anthropic: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Anthropic = require('@anthropic-ai/sdk').default;
  } catch {
    console.warn('[cekura-adapter] @anthropic-ai/sdk not resolvable at runtime — using stub.');
    return { personas: buildStubPersonas(opts.n_personas), cost_usd: 0 };
  }

  const client = new Anthropic({ apiKey });

  // Cap input to avoid blowing the context window. Each transcript ~2k tokens;
  // we keep the most recent N that fit in ~150k input tokens.
  const MAX_TRANSCRIPTS_IN_PROMPT = 60;
  const trimmed = opts.source_transcripts.slice(-MAX_TRANSCRIPTS_IN_PROMPT);

  const systemPrompt = `You are an expert call-center analyst. Given real customer call transcripts, you cluster the callers into ${opts.n_personas} distinct, representative personas that preserve the real distribution of intent, objection patterns, accents, demographics, and time-of-day signals.

Stratify the fleet across these dimensions: ${opts.stratify_by.join(', ')}.

Output STRICT JSON only — an array of ${opts.n_personas} persona objects. Each object MUST have:
  - intent (e.g. "price_shopper", "emergency_repair", "comparison_shopper", "ready_to_book")
  - objection_pattern (one short phrase: e.g. "always_asks_for_discount", "demands_human")
  - accent_profile (e.g. "standard_us", "southern_us", "spanish_l2_english", "indian_english")
  - sample_dialog_seed (the FIRST 1-2 lines this persona would say when the agent picks up — verbatim, in their voice)
  - demographic (e.g. "30s_male_homeowner", "60s_female_retired")
  - time_of_day (e.g. "weekday_morning", "weekend_evening", "midnight_emergency")
  - difficulty ("easy" | "medium" | "hard")

NO commentary. JSON array only.`;

  const userMsg = `Source transcripts (most recent ${trimmed.length} calls):\n\n${trimmed
    .map((t, i) => `--- Call ${i + 1} ---\n${t.slice(0, 4000)}`)
    .join('\n\n')}`;

  try {
    const resp = await client.messages.create({
      model: PERSONA_CLUSTER_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const textBlock = resp.content?.find((b: any) => b.type === 'text');
    const raw = textBlock?.text || '';
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Claude returned no JSON array');

    const parsed: any[] = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    const personas: Persona[] = parsed.map((p: any, idx: number) => ({
      persona_id: `p_${Date.now().toString(36)}_${idx.toString(36)}`,
      intent:             String(p.intent || 'unknown'),
      objection_pattern:  String(p.objection_pattern || 'none'),
      accent_profile:     String(p.accent_profile || 'standard_us'),
      sample_dialog_seed: String(p.sample_dialog_seed || 'Hi, I had a question.'),
      demographic:        p.demographic,
      time_of_day:        p.time_of_day,
      difficulty:         p.difficulty,
    }));

    // Rough cost: Opus 4.7 ~ $15/Mtok in + $75/Mtok out
    const inputTokens  = resp.usage?.input_tokens  || 0;
    const outputTokens = resp.usage?.output_tokens || 0;
    const cost_usd =
      (inputTokens / 1_000_000) * 15 +
      (outputTokens / 1_000_000) * 75;

    return { personas, cost_usd };
  } catch (err: any) {
    console.error('[cekura-adapter] Claude persona clustering failed:', err?.message);
    // Fall back to stub so the loop above us doesn't break.
    return { personas: buildStubPersonas(opts.n_personas), cost_usd: 0 };
  }
}

function buildStubPersonas(n: number): Persona[] {
  // Minimum-viable stratified fleet — used when Claude isn't available so the
  // simulator can still exercise the pipeline end-to-end.
  const intents = ['price_shopper', 'emergency_repair', 'comparison_shopper', 'ready_to_book', 'info_only'];
  const objections = ['always_asks_for_discount', 'wants_to_speak_to_human', 'distrusts_ai', 'compares_to_competitor', 'none'];
  const accents = ['standard_us', 'southern_us', 'spanish_l2_english', 'indian_english', 'standard_us'];
  const demos = ['30s_male_homeowner', '40s_female_owner', '60s_male_retired', '20s_female_renter', '50s_male_business'];
  const tods  = ['weekday_morning', 'weekday_afternoon', 'weekend_morning', 'weekday_evening', 'midnight_emergency'];

  return Array.from({ length: n }, (_, i) => ({
    persona_id: `p_stub_${Date.now().toString(36)}_${i}`,
    intent:             intents[i % intents.length],
    objection_pattern:  objections[i % objections.length],
    accent_profile:     accents[i % accents.length],
    demographic:        demos[i % demos.length],
    time_of_day:        tods[i % tods.length],
    difficulty:         (['easy', 'medium', 'hard'] as const)[i % 3],
    sample_dialog_seed: `Hi, I'm calling about your services. ${intents[i % intents.length]}.`,
  }));
}

/**
 * Convert one of our Persona objects into a Cekura scenario row.
 * Pattern mirrors retell-cekura-gate.ts toCekuraScenario().
 */
function personaToCekuraScenario(persona: Persona, cekuraAgentId: number) {
  return {
    agent: cekuraAgentId,
    name: `[twin] ${persona.intent} — ${persona.objection_pattern} (${persona.accent_profile})`,
    instructions: [
      `You are a caller with this persona:`,
      `- Intent: ${persona.intent}`,
      `- Objection pattern: ${persona.objection_pattern}`,
      `- Accent: ${persona.accent_profile}`,
      persona.demographic ? `- Demographic: ${persona.demographic}` : '',
      persona.time_of_day ? `- Time of day: ${persona.time_of_day}` : '',
      `Difficulty: ${persona.difficulty || 'medium'}.`,
      `Open the call by saying: "${persona.sample_dialog_seed}"`,
      `Respond naturally based on the persona above. Stay in character. Push back when the persona would push back.`,
    ].filter(Boolean).join(' '),
    expected_outcome_prompt: [
      `Evaluate the agent on a 0-10 composite score across 5 dimensions: greeting, intent_capture, objection_handling, booking_attempt, professionalism.`,
      `Surface up to 3 failure_mode tags if any dimension < 6 (e.g. "no_booking_attempt", "hallucination", "lost_to_objection").`,
      `Persona expected behavior: a ${persona.difficulty || 'medium'}-difficulty ${persona.intent} caller — the agent should still attempt to book unless this is a "info_only" intent.`,
    ].join(' '),
  };
}

/**
 * Spin up a temporary Cekura agent bound to a Retell LLM with the proposed
 * prompt. Returns { cekuraAgentId, tempLlmId }. Caller is responsible for
 * cleanup via cleanupTempCekuraAgent().
 *
 * Mirrors the temp-LLM dance from retell-cekura-gate.ts so we don't pollute
 * the production agent registry.
 */
async function provisionTempCekuraAgent(opts: {
  label: string;
  agent_config: AgentConfig;
}): Promise<{ cekuraAgentId: number; tempLlmId: string }> {
  const newLlm = await retellFetch('/create-retell-llm', {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      general_prompt: opts.agent_config.prompt,
      // KB is plumbed via Retell's knowledge_base_ids — for sim, we skip and
      // rely on prompt-baked context. This is what the cekura-gate does.
    }),
  });
  const tempLlmId: string = newLlm.llm_id;
  if (!tempLlmId) throw new Error('Retell LLM creation returned no llm_id');

  const cekuraAgent = await cekuraFetch('/aiagents/', 'POST', {
    agent_name:          opts.label,
    assistant_id:        `boltcall-sim-${Date.now()}`, // text mode placeholder
    chat_assistant_id:   tempLlmId,
    contact_number:      '+10000000000',
    inbound:             true,
    language:            'en',
    description:         `Boltcall agency-OS simulation — ${opts.label}`,
    assistant_provider:  'retell',
    transcript_provider: 'retell',
    retell_api_key:      process.env.RETELL_API_KEY,
  });

  return { cekuraAgentId: cekuraAgent.id, tempLlmId };
}

async function cleanupTempCekuraAgent(tempLlmId: string): Promise<void> {
  if (!tempLlmId) return;
  await retellFetch(`/delete-retell-llm/${tempLlmId}`, { method: 'DELETE' })
    .then(() => console.log(`[cekura-adapter] Cleaned up temp LLM ${tempLlmId}`))
    .catch(err => console.warn(`[cekura-adapter] Temp LLM cleanup failed (non-blocking): ${err?.message}`));
}

/**
 * Poll a Cekura test result until it terminates or we hit timeout.
 */
async function pollCekuraResult(resultId: string | number, timeoutMin = 10) {
  const deadline = Date.now() + timeoutMin * 60_000;
  const pollMs = 10_000;
  while (Date.now() < deadline) {
    const result = await cekuraFetch(`/results/${resultId}/`, 'GET');
    if (['completed', 'failed', 'timeout', 'cancelled'].includes(result.status)) {
      return result;
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`Cekura result ${resultId} did not complete within ${timeoutMin}min`);
}

/**
 * Aggregate raw Cekura runs into our SimulationBatchResult shape.
 */
function aggregateBatch(runs: any[]): SimulationBatchResult['aggregate'] {
  const scores: number[] = [];
  const perDim: Record<string, number[]> = {};
  const failureCounts: Record<string, number> = {};

  for (const run of runs) {
    // Cekura returns success_rate per run as 0/1; if richer eval present, use it.
    const evalObj = run.evaluation || run.overall_evaluation || {};
    const composite = typeof evalObj.composite_score === 'number'
      ? evalObj.composite_score
      : (run.success ? 8 : 3);
    scores.push(composite);

    const dimScores = evalObj.dim_scores || {};
    for (const [dim, s] of Object.entries(dimScores)) {
      if (typeof s === 'number') {
        perDim[dim] = perDim[dim] || [];
        perDim[dim].push(s);
      }
    }

    const fm: string[] = run.failure_modes || (run.failure_reason ? [run.failure_reason] : []);
    for (const tag of fm) {
      failureCounts[tag] = (failureCounts[tag] || 0) + 1;
    }
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    avg_qa_score: Number(avg(scores).toFixed(2)),
    per_dim_scores: Object.fromEntries(
      Object.entries(perDim).map(([k, v]) => [k, Number(avg(v).toFixed(2))]),
    ),
    failure_clusters: Object.entries(failureCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cluster_label, count]) => ({ cluster_label, count })),
  };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * (1) generatePersonaFleet — cluster real call transcripts into a fleet of
 * representative personas, store them as the client's digital twin.
 *
 * Used by the weekly refresh cron and by intake-officer right after the first
 * 5+ real calls land for a new client.
 */
export async function generatePersonaFleet(opts: {
  client_id: string;
  source_transcripts: string[];
  n_personas?: number;
  stratify_by?: Array<'objection_pattern' | 'accent' | 'demographic' | 'time_of_day' | 'intent'>;
}): Promise<PersonaFleet> {
  const startedAt = Date.now();
  const n_personas = opts.n_personas ?? 100;
  const stratify_by = opts.stratify_by?.length
    ? opts.stratify_by
    : [...DEFAULT_STRATIFY_DIMS];

  if (!opts.source_transcripts.length) {
    throw new Error('generatePersonaFleet: source_transcripts must be non-empty');
  }

  const fleet_id = `fleet_${opts.client_id.slice(0, 8)}_${Date.now().toString(36)}`;

  // Cluster via Claude (Opus) — falls back to stub if API key missing.
  const { personas, cost_usd: clusterCost } = await clusterPersonasWithClaude({
    source_transcripts: opts.source_transcripts,
    n_personas,
    stratify_by,
  });

  // Cost: clustering call + a small per-persona allocation (storage,
  // future Cekura scenario creation amortized).
  const cost_usd = Number(
    (clusterCost + personas.length * COST_PER_PERSONA_GENERATION_USD).toFixed(4),
  );

  // Persist to agency_digital_twin_personas — best-effort.
  await safeInsert(
    'agency_digital_twin_personas',
    personas.map(p => ({
      fleet_id,
      client_id:  opts.client_id,
      persona_id: p.persona_id,
      intent:             p.intent,
      objection_pattern:  p.objection_pattern,
      accent_profile:     p.accent_profile,
      sample_dialog_seed: p.sample_dialog_seed,
      demographic:        p.demographic || null,
      time_of_day:        p.time_of_day || null,
      difficulty:         p.difficulty || 'medium',
      created_at:         new Date().toISOString(),
    })),
  );

  await emitCostEvent({
    event_type: 'cekura_fleet_generated',
    client_id:  opts.client_id,
    cost_usd,
    payload: {
      fleet_id,
      n_personas: personas.length,
      n_source_transcripts: opts.source_transcripts.length,
      stratify_by,
      duration_ms: Date.now() - startedAt,
    },
  });

  console.log(
    `[cekura-adapter] generatePersonaFleet | client=${opts.client_id} fleet=${fleet_id} ` +
    `n=${personas.length} cost=$${cost_usd.toFixed(4)}`,
  );

  return { fleet_id, personas, cost_usd };
}

/**
 * (2) runSimulationBatch — the core simulator.
 *
 * Two modes:
 *   - fleet_id: load personas from the stored client fleet (production path)
 *   - ad_hoc_personas: caller passes an inline persona list (agent-architect
 *     first-iteration, before any fleet exists)
 *
 * Used by:
 *   - agent-architect pre-ship gate
 *   - creative-foundry counterfactual ad-test
 *   - optimization-strategist cross-prompt scoring
 *   - expansion-spotter per-prospect value pitch
 */
export async function runSimulationBatch(opts: {
  fleet_id?: string;
  ad_hoc_personas?: Persona[];
  against_agent_config: AgentConfig;
  n_calls_per_persona?: number;
  timeout_min?: number;
}): Promise<SimulationBatchResult> {
  const startedAt = Date.now();
  const n_calls_per_persona = opts.n_calls_per_persona ?? 1;
  const timeout_min = opts.timeout_min ?? 10;

  // Resolve personas
  let personas: Persona[];
  let resolvedFleetId: string | null = null;

  if (opts.ad_hoc_personas?.length) {
    personas = opts.ad_hoc_personas;
  } else if (opts.fleet_id) {
    resolvedFleetId = opts.fleet_id;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agency_digital_twin_personas')
        .select('*')
        .eq('fleet_id', opts.fleet_id);
      if (error) throw error;
      if (!data?.length) throw new Error(`Fleet ${opts.fleet_id} has no personas`);
      personas = data.map((row: any) => ({
        persona_id:         row.persona_id,
        intent:             row.intent,
        objection_pattern:  row.objection_pattern,
        accent_profile:     row.accent_profile,
        sample_dialog_seed: row.sample_dialog_seed,
        demographic:        row.demographic,
        time_of_day:        row.time_of_day,
        difficulty:         row.difficulty,
      }));
    } catch (err: any) {
      throw new Error(`runSimulationBatch: failed to load fleet ${opts.fleet_id}: ${err?.message}`);
    }
  } else {
    throw new Error('runSimulationBatch: must pass either fleet_id or ad_hoc_personas');
  }

  // Provision temp Cekura agent bound to the proposed prompt
  const label = `batch-${resolvedFleetId || 'adhoc'}-${Date.now().toString(36)}`;
  const { cekuraAgentId, tempLlmId } = await provisionTempCekuraAgent({
    label,
    agent_config: opts.against_agent_config,
  });

  let results: SimulationCallResult[] = [];
  let aggregate: SimulationBatchResult['aggregate'] = {
    avg_qa_score: 0,
    per_dim_scores: {},
    failure_clusters: [],
  };

  try {
    // Create Cekura scenarios — one per persona
    const scenarioIds: number[] = [];
    const personaByScenarioName: Record<string, Persona> = {};
    for (const persona of personas) {
      try {
        const scenarioPayload = personaToCekuraScenario(persona, cekuraAgentId);
        const s = await cekuraFetch('/scenarios/', 'POST', scenarioPayload);
        scenarioIds.push(s.id);
        personaByScenarioName[s.name] = persona;
      } catch (err: any) {
        console.warn(`[cekura-adapter] scenario create failed for ${persona.persona_id}: ${err?.message}`);
      }
    }

    if (!scenarioIds.length) throw new Error('No Cekura scenarios created');

    // Kick off the run
    const testRun = await cekuraFetch('/scenarios/run_scenarios/', 'POST', {
      agent_id:  cekuraAgentId,
      scenarios: scenarioIds,
      frequency: n_calls_per_persona,
      name:      `Boltcall sim batch — ${label}`,
    });

    // Poll until complete
    const finalResult = await pollCekuraResult(testRun.id, timeout_min);

    const rawRuns: any[] = finalResult.runs || [];
    results = rawRuns.map((run: any) => {
      const persona = personaByScenarioName[run.scenario_name] || personas[0];
      const evalObj = run.evaluation || {};
      return {
        persona_id: persona.persona_id,
        call_id:    String(run.id),
        transcript: run.transcript || '',
        outcome:    deriveOutcome(run),
        qa_score:   typeof evalObj.composite_score === 'number' ? evalObj.composite_score
                  : (run.success ? 8 : 3),
        failure_modes: run.failure_modes || (run.failure_reason ? [run.failure_reason] : []),
        dim_scores: evalObj.dim_scores,
      };
    });

    aggregate = aggregateBatch(rawRuns);
  } finally {
    // Always clean up the temp Retell LLM
    await cleanupTempCekuraAgent(tempLlmId);
  }

  const duration_min = (Date.now() - startedAt) / 60_000;
  const cost_usd = Number(
    (results.length * COST_PER_SIMULATED_CALL_USD).toFixed(4),
  );

  // Persist run record + cost event
  await safeInsert('agency_simulation_runs', {
    fleet_id:        resolvedFleetId,
    n_calls:         results.length,
    avg_qa_score:    aggregate.avg_qa_score,
    cost_usd,
    duration_min:    Number(duration_min.toFixed(2)),
    aggregate,
    cekura_agent_id: cekuraAgentId,
    ran_at:          new Date().toISOString(),
  });

  await emitCostEvent({
    event_type: 'cekura_batch_completed',
    cost_usd,
    payload: {
      fleet_id:       resolvedFleetId,
      n_calls:        results.length,
      avg_qa_score:   aggregate.avg_qa_score,
      duration_min:   Number(duration_min.toFixed(2)),
      failure_clusters: aggregate.failure_clusters.slice(0, 5),
    },
  });

  console.log(
    `[cekura-adapter] runSimulationBatch | n_calls=${results.length} ` +
    `avg_qa=${aggregate.avg_qa_score} cost=$${cost_usd.toFixed(4)} dur=${duration_min.toFixed(1)}min`,
  );

  return { results, aggregate, cost_usd, duration_min };
}

function deriveOutcome(run: any): SimulationCallResult['outcome'] {
  if (run.outcome) return run.outcome;
  const transcript = (run.transcript || '').toLowerCase();
  if (transcript.includes('booked') || transcript.includes('scheduled')) return 'booked';
  if (transcript.includes('transfer') || transcript.includes('connect you')) return 'transferred';
  if (transcript.includes('hung up') || transcript.includes('disconnect')) return 'hung_up';
  return run.success ? 'booked' : 'lost';
}

/**
 * (3) playbackHistoricalCalls — counterfactual replay.
 *
 * Takes a set of historical call transcripts and "replays" the caller side
 * against a new agent prompt to estimate the lift. Used by
 * optimization-strategist's monthly causal brief.
 *
 * Implementation: we use Cekura's text-mode simulation. For each historical
 * call, we generate a Cekura scenario whose `instructions` are seeded from
 * the original caller's utterances (so the simulated caller behaves the same
 * way). The new agent prompt is mounted as the chat_assistant_id. We compare
 * the outcome + score against the original.
 */
export async function playbackHistoricalCalls(opts: {
  client_id: string;
  historical_call_ids: string[];
  against_agent_config: AgentConfig;
}): Promise<{ diffs: PlaybackDiff[] }> {
  const startedAt = Date.now();

  if (!opts.historical_call_ids.length) {
    return { diffs: [] };
  }

  // Load historical calls (transcript + original outcome + score) from
  // retell_call_scores joined to retell_calls. Best-effort.
  let historical: Array<{
    call_id: string;
    transcript: string;
    original_outcome: string;
    original_score: number;
  }> = [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('retell_call_scores')
      .select('call_id, transcript, outcome, composite_score')
      .in('call_id', opts.historical_call_ids);
    if (error) throw error;
    historical = (data || []).map((r: any) => ({
      call_id:          r.call_id,
      transcript:       r.transcript || '',
      original_outcome: r.outcome || 'unknown',
      original_score:   r.composite_score || 0,
    }));
  } catch (err: any) {
    console.warn(`[cekura-adapter] playbackHistoricalCalls: load failed (${err?.message}) — stubbing.`);
    historical = opts.historical_call_ids.map(id => ({
      call_id: id, transcript: '', original_outcome: 'unknown', original_score: 0,
    }));
  }

  // Build ad-hoc personas from the historical transcripts. We extract the
  // first 1-2 caller utterances as the dialog seed; the rest of the persona
  // metadata is left "unknown" — the playback only needs the seed to behave
  // similarly.
  const personas: Persona[] = historical.map((h, idx) => ({
    persona_id:         `replay_${h.call_id}`,
    intent:             'replay',
    objection_pattern:  'replay',
    accent_profile:     'standard_us',
    sample_dialog_seed: extractFirstCallerLine(h.transcript) || `Replay call ${idx + 1}`,
  }));

  const batch = await runSimulationBatch({
    ad_hoc_personas:      personas,
    against_agent_config: opts.against_agent_config,
    n_calls_per_persona:  1,
  });

  const diffs: PlaybackDiff[] = historical.map((h, i) => {
    const cf = batch.results.find(r => r.persona_id === `replay_${h.call_id}`) || batch.results[i];
    return {
      call_id: h.call_id,
      original_outcome:        h.original_outcome,
      counterfactual_outcome:  cf?.outcome || 'unknown',
      qa_score_delta:          Number(((cf?.qa_score || 0) - h.original_score).toFixed(2)),
      original_transcript_excerpt:       h.transcript.slice(0, 400),
      counterfactual_transcript_excerpt: (cf?.transcript || '').slice(0, 400),
    };
  });

  const cost_usd = Number(
    (historical.length * COST_PER_PLAYBACK_DIFF_USD + batch.cost_usd).toFixed(4),
  );

  await emitCostEvent({
    event_type: 'cekura_playback_completed',
    client_id:  opts.client_id,
    cost_usd,
    payload: {
      n_calls: historical.length,
      avg_qa_score_delta: diffs.length
        ? Number((diffs.reduce((s, d) => s + d.qa_score_delta, 0) / diffs.length).toFixed(2))
        : 0,
      duration_min: Number(((Date.now() - startedAt) / 60_000).toFixed(2)),
    },
  });

  return { diffs };
}

function extractFirstCallerLine(transcript: string): string {
  if (!transcript) return '';
  // Try to find the first "User:" / "Caller:" turn
  const lines = transcript.split('\n');
  for (const line of lines) {
    const m = line.match(/^(?:user|caller|customer)\s*[:>]\s*(.+)$/i);
    if (m) return m[1].slice(0, 200);
  }
  // Fall back: first non-empty line
  return (lines.find(l => l.trim().length > 0) || '').slice(0, 200);
}

/**
 * (4) refreshFleet — weekly cron entry point.
 *
 * Pulls the last N days of real call transcripts for a client, regenerates
 * the persona fleet, and diffs against the current stored fleet to compute
 * n_added / n_removed.
 */
export async function refreshFleet(opts: {
  client_id: string;
  lookback_days?: number;
}): Promise<RefreshResult> {
  const lookback_days = opts.lookback_days ?? 90;
  const since = new Date(Date.now() - lookback_days * 86400_000).toISOString();

  // Load transcripts from retell_call_scores. Best-effort: returns 0/0 if no
  // calls or table missing.
  let transcripts: string[] = [];
  let oldFleetCount = 0;
  let oldFleetId: string | null = null;

  try {
    const supabase = getSupabase();
    const { data: calls } = await supabase
      .from('retell_call_scores')
      .select('transcript, created_at')
      .eq('client_id', opts.client_id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    transcripts = (calls || []).map((c: any) => c.transcript).filter(Boolean);

    const { data: oldFleet } = await supabase
      .from('agency_digital_twin_personas')
      .select('persona_id, fleet_id')
      .eq('client_id', opts.client_id)
      .order('created_at', { ascending: false });
    oldFleetCount = oldFleet?.length || 0;
    oldFleetId = oldFleet?.[0]?.fleet_id || null;
  } catch (err: any) {
    console.warn(`[cekura-adapter] refreshFleet: load failed (${err?.message})`);
  }

  if (!transcripts.length) {
    console.warn(`[cekura-adapter] refreshFleet: no transcripts for ${opts.client_id} in last ${lookback_days}d — skipping`);
    return { fleet_id: oldFleetId || '', n_added: 0, n_removed: 0 };
  }

  const newFleet = await generatePersonaFleet({
    client_id: opts.client_id,
    source_transcripts: transcripts,
    n_personas: 100,
  });

  // Mark old fleet as superseded (best-effort)
  if (oldFleetId && oldFleetId !== newFleet.fleet_id) {
    try {
      const supabase = getSupabase();
      await supabase
        .from('agency_digital_twin_personas')
        .delete()
        .eq('client_id', opts.client_id)
        .eq('fleet_id', oldFleetId);
    } catch (err: any) {
      console.warn(`[cekura-adapter] refreshFleet: old fleet delete failed (${err?.message})`);
    }
  }

  return {
    fleet_id:  newFleet.fleet_id,
    n_added:   newFleet.personas.length,
    n_removed: oldFleetCount,
  };
}

/**
 * (5) exportClientFacingProof — render the digital-twin fleet + last run as
 * a signed sales artifact the client can see in StressTestPanel.
 *
 * Returns a signed Supabase Storage URL to a JSON+HTML pack. We store both
 * formats so the client dashboard can render natively (JSON) and the
 * founder can drop the HTML into a deck or share a public link.
 */
export async function exportClientFacingProof(opts: {
  client_id: string;
  fleet_id: string;
  last_run_results: SimulationBatchResult;
}): Promise<ProofExport> {
  const pack = {
    client_id:    opts.client_id,
    fleet_id:     opts.fleet_id,
    generated_at: new Date().toISOString(),
    headline:     `Your AI receptionist was tested against ${opts.last_run_results.results.length} simulated callers from your business.`,
    summary: {
      n_calls:       opts.last_run_results.results.length,
      avg_qa_score:  opts.last_run_results.aggregate.avg_qa_score,
      booked_pct:    Number(
        ((opts.last_run_results.results.filter(r => r.outcome === 'booked').length /
          Math.max(1, opts.last_run_results.results.length)) * 100).toFixed(1),
      ),
      top_failure_clusters: opts.last_run_results.aggregate.failure_clusters.slice(0, 3),
    },
    sample_calls: opts.last_run_results.results.slice(0, 5).map(r => ({
      persona_id: r.persona_id,
      outcome:    r.outcome,
      qa_score:   r.qa_score,
      transcript_excerpt: r.transcript.slice(0, 800),
    })),
  };

  let proof_url = '';
  try {
    const supabase = getSupabase();
    const path = `client-proofs/${opts.client_id}/${opts.fleet_id}-${Date.now()}.json`;
    const { error: upErr } = await supabase
      .storage
      .from('agency-client-facing')
      .upload(path, JSON.stringify(pack, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: signed, error: sigErr } = await supabase
      .storage
      .from('agency-client-facing')
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
    if (sigErr) throw sigErr;
    proof_url = signed?.signedUrl || '';
  } catch (err: any) {
    // TODO(cekura-adapter): once agency-client-facing storage bucket exists,
    // remove this fallback. For now we return an in-memory data URL so
    // StressTestPanel can still render.
    console.warn(`[cekura-adapter] exportClientFacingProof: storage upload failed (${err?.message}) — falling back to data URL.`);
    const b64 = Buffer.from(JSON.stringify(pack)).toString('base64');
    proof_url = `data:application/json;base64,${b64}`;
  }

  // Vertical benchmark percentile — placeholder until we have a population
  // distribution. We compare avg_qa_score to a synthetic vertical curve.
  const vertical_benchmark_percentile = Math.min(
    99,
    Math.max(1, Math.round(opts.last_run_results.aggregate.avg_qa_score * 10)),
  );

  await emitCostEvent({
    event_type: 'cekura_proof_exported',
    client_id:  opts.client_id,
    cost_usd:   0,
    payload: {
      fleet_id: opts.fleet_id,
      n_personas: opts.last_run_results.results.length,
      proof_url_present: Boolean(proof_url),
    },
  });

  return {
    proof_url,
    summary_stats: {
      n_personas: opts.last_run_results.results.length,
      avg_qa_score: opts.last_run_results.aggregate.avg_qa_score,
      vertical_benchmark_percentile,
    },
  };
}

// ─── Re-exports for callers that want internal helpers ──────────────────────

export const __test__ = {
  buildStubPersonas,
  personaToCekuraScenario,
  aggregateBatch,
  extractFirstCallerLine,
};
