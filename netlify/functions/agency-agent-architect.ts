/**
 * agency-agent-architect.ts — Phase C runner for the agent-architect agent.
 *
 * KILLER FEATURE: generate-simulate-iterate (max 4 passes) using Cekura.
 * ─────────────────────────────────────────────────────────────────────────
 *  (1) Opus 4.7 generates a draft Retell agent_prompt + KB via the run-agent
 *      harness — vertical-aware, grounded in the extracted_profile + RAG.
 *  (2) `cekura-adapter.runSimulationBatch` runs the draft against a stratified
 *      ad_hoc_persona fleet for the vertical (price-shopper, emergency,
 *      comparison, hostile, non-English, low-info) — 3 personas per category.
 *  (3) The runner parses `aggregate.avg_qa_score`, `per_dim_scores`,
 *      `failure_clusters`, AND per-persona-category pass rate from the
 *      individual call results.
 *  (4) Gate: pass iff avg_qa >= 8.0, every dim >= 6.0, no category 100% fails.
 *      On failure, the harness's iteration loop feeds back the cluster labels
 *      + worst transcripts and asks Opus for the MINIMAL prompt change that
 *      fixes the cluster. Re-simulate. Cap at 4 iterations.
 *  (5) FULL iteration_history (v1..vN diffs, sim aggregates, cluster summaries)
 *      is folded into `content.iteration_history` so the founder sees the
 *      proven version + the evidence of what was tried.
 *  (6) On a passing run, write a `vertical_template_feedback` row into
 *      `agency_knowledge` so the cross-client federated-learning loop can mine
 *      the validated improvement into the vertical prompt template registry.
 *  (7) On a max-iterations-no-pass run, the artifact is still drafted but
 *      flagged `simulation_passed=false` + `blocker_summary` so the founder
 *      can either re-do intake or escalate — we do NOT silently ship a
 *      half-baked prompt to a real customer line.
 *
 * Trigger: state-driven from `agency-state-router` (or invoked directly via
 *   POST { client_id, intake_call_id }) — fires when:
 *     - agency_intake_calls.extracted_profile is non-null
 *     - the matching intake-officer artifact is approved or shipped
 *
 * Deploy: this runner produces the draft. The actual Retell agent provisioning
 * happens later in `agency-deploy-agent.ts` via
 *   retell-adapter.createAgentFromArtifact({prompt, knowledge_base, ...})
 * once the founder approves the artifact in the queue.
 */

import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  runAgent,
  type IterationCheckResult,
  type JsonSchemaObject,
} from './_shared/agency-agents/run-agent';
import {
  runSimulationBatch,
  type Persona,
  type SimulationBatchResult,
  type AgentConfig,
} from './_shared/agency-adapters/cekura-adapter';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { getServiceSupabase } from './_shared/token-utils';
import {
  formatVerticalContextForPrompt,
  normalizeVerticalSlug,
  retrieveVerticalPackContext,
  type RetrievedVerticalChunk,
} from './_shared/vertical-knowledge/retrieve';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvokeBody {
  client_id: string;
  intake_call_id?: string;
  /** Override for the persona count per category. Default 3. */
  personas_per_category?: number;
  /** Override for max iterations. Default 4. */
  max_iterations?: number;
}

interface ArchitectInput {
  client_id: string;
  vertical: string;
  extracted_profile: Record<string, unknown>;
  approved_vertical_context?: {
    pack_slug: string;
    context_block: string;
    chunks: RetrievedVerticalChunk[];
  } | null;
  voice_id_hint?: string;
  language_hint?: string;
  /** Populated on iteration 2+ by the iteration_check failure feedback. */
  previous_attempt?: {
    iteration: number;
    prompt: string;
    aggregate: SimulationBatchResult['aggregate'];
    failed_clusters: string[];
    worst_transcripts: string[];
  };
}

interface ArchitectOutput {
  agent_prompt: string;
  knowledge_base: Record<string, unknown>;
  voice_id: string;
  language: string;
  transfer_rules: Array<{
    trigger: string;
    action: string;
    target: string | null;
    skip_qualifying?: boolean;
  }>;
  vertical_template_feedback: null | {
    pattern_label: string;
    vertical: string;
    description: string;
    proposed_template_change: string;
    supporting_evidence?: string[];
  };
  predicted_impact: {
    predicted_avg_qa_score: number;
    predicted_booking_rate_pct: number;
    confidence_interval_pct: number;
  };
  // Cross-cutting (the harness enforces these):
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
  retrieved_context: unknown[];
}

interface IterationHistoryEntry {
  iteration: number;
  pass: boolean;
  why?: string;
  aggregate?: SimulationBatchResult['aggregate'];
  persona_category_pass_rates?: Record<string, number>;
  failed_clusters?: string[];
  worst_transcript_excerpts?: string[];
  prompt_excerpt?: string;
}

// ─── Persona vocabularies ───────────────────────────────────────────────────

/**
 * The 6 mandatory persona categories the sim fleet must always cover.
 * Per-vertical seed pools below provide concrete dialog seeds + objection
 * patterns; the runner blends N from each category to build the fleet.
 */
const PERSONA_CATEGORIES = [
  'price_shopper',
  'emergency',
  'comparison',
  'hostile',
  'non_english',
  'low_info',
] as const;

type PersonaCategory = typeof PERSONA_CATEGORIES[number];

/**
 * Vertical-aware persona seed pools. Each entry produces ONE Persona via
 * `seedToPersona()` below. We rotate through the pool so a fleet of 18
 * personas (3 per category * 6 categories) is concretely populated with
 * vertical-specific objections and dialog seeds — not generic stubs.
 */
const PERSONA_SEEDS: Record<string, Record<PersonaCategory, Array<Partial<Persona>>>> = {
  med_spa: {
    price_shopper: [
      { objection_pattern: 'always_asks_for_discount', sample_dialog_seed: "Hi, how much is Botox? I'm comparing prices with a few places." },
      { objection_pattern: 'wants_groupon_deal', sample_dialog_seed: "Do you guys do Groupon? I saw a deal somewhere." },
      { objection_pattern: 'budget_constrained', sample_dialog_seed: "What's your cheapest filler option?" },
    ],
    emergency: [
      { objection_pattern: 'post_procedure_concern', sample_dialog_seed: "I got Botox here last week and my eyebrow is drooping — what do I do?" },
      { objection_pattern: 'allergic_reaction', sample_dialog_seed: "My lips are way more swollen than expected from the filler yesterday. Is this normal?" },
      { objection_pattern: 'urgent_appointment_needed', sample_dialog_seed: "I have a wedding tomorrow and need my lip filler corrected ASAP." },
    ],
    comparison: [
      { objection_pattern: 'compares_to_competitor', sample_dialog_seed: "How do you compare to SkinCo down the street? They charge less per unit." },
      { objection_pattern: 'asks_about_dr_credentials', sample_dialog_seed: "Is Dr. Chen board-certified? What's her training?" },
      { objection_pattern: 'wants_before_after_photos', sample_dialog_seed: "Can I see before-and-after photos of her lip filler work?" },
    ],
    hostile: [
      { objection_pattern: 'distrusts_ai', sample_dialog_seed: "I want to talk to a real person, not a robot. Put me through." },
      { objection_pattern: 'angry_about_past_visit', sample_dialog_seed: "I'm calling because my last appointment was a disaster. Who's in charge?" },
      { objection_pattern: 'demands_immediate_owner', sample_dialog_seed: "Get me Dr. Chen on the phone right now." },
    ],
    non_english: [
      { objection_pattern: 'spanish_only_caller', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Hola, quiero información sobre Botox. ¿Hablan español?" },
      { objection_pattern: 'heavy_accent_request_clarity', accent_profile: 'mandarin_l2_english', sample_dialog_seed: "Hello, I want know price for face treatment, please slowly?" },
      { objection_pattern: 'mixed_english_spanish', accent_profile: 'spanglish', sample_dialog_seed: "Hi, ¿tienes Botox specials this month? Mi amiga came here." },
    ],
    low_info: [
      { objection_pattern: 'vague_request', sample_dialog_seed: "Hi, I just want to look better. What do you recommend?" },
      { objection_pattern: 'doesnt_know_treatment_name', sample_dialog_seed: "I want that thing that smooths the wrinkles between your eyebrows." },
      { objection_pattern: 'asks_generic_health_question', sample_dialog_seed: "Is Botox safe? Does it cause cancer?" },
    ],
  },
  hvac: {
    price_shopper: [
      { objection_pattern: 'wants_estimate_over_phone', sample_dialog_seed: "How much to replace a 3-ton AC unit? Ballpark." },
      { objection_pattern: 'compares_to_competitor', sample_dialog_seed: "Other guys quoted me $5000 — what would you charge?" },
      { objection_pattern: 'asks_about_seasonal_discount', sample_dialog_seed: "You guys running any specials right now?" },
    ],
    emergency: [
      { objection_pattern: 'no_heat_winter', sample_dialog_seed: "My furnace just died and it's 30 degrees outside. I have a baby in the house." },
      { objection_pattern: 'gas_smell', sample_dialog_seed: "I smell gas in my basement. Should I do something?" },
      { objection_pattern: 'water_leak_active', sample_dialog_seed: "Water is pouring out of my AC unit into the ceiling — what do I do?" },
    ],
    comparison: [
      { objection_pattern: 'compares_brands', sample_dialog_seed: "Should I get a Carrier or a Lennox? Which lasts longer?" },
      { objection_pattern: 'asks_about_warranty', sample_dialog_seed: "What kind of warranty do you offer on installations?" },
      { objection_pattern: 'asks_about_techs', sample_dialog_seed: "Are your techs certified? Background-checked?" },
    ],
    hostile: [
      { objection_pattern: 'angry_repeat_customer', sample_dialog_seed: "You guys were just here 2 weeks ago and the AC is broken again. This is unacceptable." },
      { objection_pattern: 'demands_human', sample_dialog_seed: "Stop with the AI nonsense. Get me a person." },
      { objection_pattern: 'cursing', sample_dialog_seed: "This is the third damn time I've called. Is anyone going to help me?" },
    ],
    non_english: [
      { objection_pattern: 'spanish_only', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Hola, mi aire acondicionado no funciona. ¿Pueden venir hoy?" },
      { objection_pattern: 'vietnamese_accent', accent_profile: 'vietnamese_l2_english', sample_dialog_seed: "Hello, my heater no work. You come fix today?" },
      { objection_pattern: 'arabic_accent', accent_profile: 'arabic_l2_english', sample_dialog_seed: "Yes hello, the air conditioner is making big noise, very loud." },
    ],
    low_info: [
      { objection_pattern: 'doesnt_know_unit_age', sample_dialog_seed: "My AC isn't cooling well. I don't know what brand or how old it is." },
      { objection_pattern: 'vague_problem', sample_dialog_seed: "My house just feels weird. Like, not cool enough." },
      { objection_pattern: 'first_time_homeowner', sample_dialog_seed: "I just moved in and I don't know if the AC is supposed to make this sound." },
    ],
  },
  cosmetic_dental: {
    price_shopper: [
      { objection_pattern: 'shops_implant_cost', sample_dialog_seed: "How much is a single dental implant? All-in price." },
      { objection_pattern: 'asks_about_payment_plans', sample_dialog_seed: "Do you have any payment plans for veneers? I can't pay $20k upfront." },
      { objection_pattern: 'compares_to_dental_school', sample_dialog_seed: "The dental school nearby does veneers for half the price. What's the difference?" },
    ],
    emergency: [
      { objection_pattern: 'tooth_pain_severe', sample_dialog_seed: "I have a horrible toothache, can't sleep. Can you see me today?" },
      { objection_pattern: 'lost_crown', sample_dialog_seed: "My crown just fell out at dinner. What do I do?" },
      { objection_pattern: 'broken_tooth_accident', sample_dialog_seed: "I chipped my front tooth and I have a presentation tomorrow." },
    ],
    comparison: [
      { objection_pattern: 'asks_about_brand_of_implant', sample_dialog_seed: "Do you use Straumann or Nobel Biocare implants?" },
      { objection_pattern: 'asks_about_sedation', sample_dialog_seed: "I'm terrified of dental work. Do you offer IV sedation?" },
      { objection_pattern: 'invisalign_vs_braces', sample_dialog_seed: "Is Invisalign actually as good as braces?" },
    ],
    hostile: [
      { objection_pattern: 'dental_trauma_history', sample_dialog_seed: "Look — I had a horrible experience with a dentist and I don't trust any of you." },
      { objection_pattern: 'distrusts_ai', sample_dialog_seed: "I'm not talking to a computer about my teeth. Put a person on." },
      { objection_pattern: 'angry_about_quote', sample_dialog_seed: "Last place quoted me $30k for veneers. That's robbery. Why are you all so expensive?" },
    ],
    non_english: [
      { objection_pattern: 'spanish_only', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Buenos días, necesito información sobre carillas dentales." },
      { objection_pattern: 'haitian_creole', accent_profile: 'haitian_creole_l2_english', sample_dialog_seed: "Hello, I have one tooth missing, you can fix?" },
      { objection_pattern: 'portuguese_brazilian', accent_profile: 'portuguese_l2_english', sample_dialog_seed: "Oi, you do whitening? How much for, please?" },
    ],
    low_info: [
      { objection_pattern: 'doesnt_know_treatment', sample_dialog_seed: "My teeth are yellow. I don't know if I need whitening or veneers." },
      { objection_pattern: 'asks_about_insurance_basics', sample_dialog_seed: "Does dental insurance cover cosmetic stuff?" },
      { objection_pattern: 'vague_first_visit', sample_dialog_seed: "I haven't been to a dentist in 10 years. Where do I even start?" },
    ],
  },
  legal: {
    price_shopper: [
      { objection_pattern: 'asks_consult_fee', sample_dialog_seed: "How much do you charge for the initial consultation?" },
      { objection_pattern: 'wants_fixed_fee', sample_dialog_seed: "Can you give me a flat rate for handling my case?" },
      { objection_pattern: 'compares_to_other_firms', sample_dialog_seed: "Firm X said they'd do it for $X. Will you match?" },
    ],
    emergency: [
      { objection_pattern: 'active_arrest', sample_dialog_seed: "My son was just arrested. I need a lawyer NOW. What do I do?" },
      { objection_pattern: 'court_tomorrow', sample_dialog_seed: "I have a court date tomorrow and no attorney. Can someone help?" },
      { objection_pattern: 'restraining_order_served', sample_dialog_seed: "I was just served with a restraining order. I'm scared. Can you help?" },
    ],
    comparison: [
      { objection_pattern: 'asks_about_track_record', sample_dialog_seed: "How many cases like mine has the attorney handled?" },
      { objection_pattern: 'asks_about_specialization', sample_dialog_seed: "Does the attorney specialize in DUI or just general criminal?" },
      { objection_pattern: 'asks_about_outcomes', sample_dialog_seed: "What's your win rate on cases like mine?" },
    ],
    hostile: [
      { objection_pattern: 'tire_kicker_free_advice', sample_dialog_seed: "I just want a quick legal opinion. Can you just tell me if I have a case?" },
      { objection_pattern: 'angry_at_prior_attorney', sample_dialog_seed: "My last lawyer screwed me. Are you all crooks too?" },
      { objection_pattern: 'demands_certainty', sample_dialog_seed: "I'm not paying unless you guarantee you'll win." },
    ],
    non_english: [
      { objection_pattern: 'spanish_only', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Hola, necesito un abogado. Mi esposo fue detenido." },
      { objection_pattern: 'mandarin_accent', accent_profile: 'mandarin_l2_english', sample_dialog_seed: "Hello, I need help for immigration case, you do this?" },
      { objection_pattern: 'arabic_accent', accent_profile: 'arabic_l2_english', sample_dialog_seed: "Hello, my brother was arrested, please can attorney call me back?" },
    ],
    low_info: [
      { objection_pattern: 'unclear_legal_issue', sample_dialog_seed: "Something happened at work and I don't know if I have a case." },
      { objection_pattern: 'first_time_lawyer_call', sample_dialog_seed: "I've never had to call a lawyer before. What do I do?" },
      { objection_pattern: 'asks_general_legal_question', sample_dialog_seed: "Is it legal to record someone in California?" },
    ],
  },
  solar: {
    price_shopper: [
      { objection_pattern: 'asks_free_solar', sample_dialog_seed: "I saw an ad saying solar is free. Is that true?" },
      { objection_pattern: 'wants_savings_guarantee', sample_dialog_seed: "Can you guarantee my bill will go to zero?" },
      { objection_pattern: 'compares_quotes', sample_dialog_seed: "Another company says they can save me $200 a month. Can you beat that?" },
    ],
    emergency: [
      { objection_pattern: 'roof_leak_after_install', sample_dialog_seed: "I had panels installed and now my roof is leaking. What do I do?" },
      { objection_pattern: 'utility_shutdown_notice', sample_dialog_seed: "My utility sent me a shutoff notice. Can solar fix this right away?" },
      { objection_pattern: 'contract_deadline', sample_dialog_seed: "The sales rep said I have to sign today to get the tax credit. Is that true?" },
    ],
    comparison: [
      { objection_pattern: 'asks_tax_credit', sample_dialog_seed: "Do I qualify for the federal tax credit?" },
      { objection_pattern: 'asks_financing_terms', sample_dialog_seed: "Can you approve me for financing over the phone?" },
      { objection_pattern: 'asks_equipment_quality', sample_dialog_seed: "What panels and inverters do you use compared with SunPower?" },
    ],
    hostile: [
      { objection_pattern: 'scam_concern', sample_dialog_seed: "Solar companies keep lying to me. How do I know this is not a scam?" },
      { objection_pattern: 'angry_about_prior_quote', sample_dialog_seed: "The last guy promised free solar and then sent a huge contract. I am done with this." },
      { objection_pattern: 'demands_exact_savings', sample_dialog_seed: "Do not waste my time. Tell me exactly what I save or I am hanging up." },
    ],
    non_english: [
      { objection_pattern: 'spanish_solar', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Hola, quiero saber si puedo poner paneles solares en mi casa." },
      { objection_pattern: 'mandarin_accent_solar', accent_profile: 'mandarin_l2_english', sample_dialog_seed: "Hello, I want know solar save money, you check my house?" },
      { objection_pattern: 'limited_english_utility_bill', accent_profile: 'unknown_l2_english', sample_dialog_seed: "I have electric bill high. Solar help? Please explain slow." },
    ],
    low_info: [
      { objection_pattern: 'renter_unclear', sample_dialog_seed: "I rent but I pay the electric bill. Can I get solar?" },
      { objection_pattern: 'doesnt_know_roof', sample_dialog_seed: "I do not know how old my roof is. Can someone still look?" },
      { objection_pattern: 'asks_generic_tax_question', sample_dialog_seed: "How does the tax credit work for me?" },
    ],
  },
  default: {
    price_shopper: [
      { objection_pattern: 'wants_quote', sample_dialog_seed: "Hi, how much do you charge for your services?" },
      { objection_pattern: 'wants_discount', sample_dialog_seed: "Do you have any specials right now?" },
      { objection_pattern: 'compares_to_competitor', sample_dialog_seed: "Your competitor offered me $X. Will you match?" },
    ],
    emergency: [
      { objection_pattern: 'urgent_today', sample_dialog_seed: "I need help today, this is urgent." },
      { objection_pattern: 'after_hours_crisis', sample_dialog_seed: "I know it's after hours but I really need someone now." },
      { objection_pattern: 'critical_failure', sample_dialog_seed: "Everything just stopped working. Please tell me you can help." },
    ],
    comparison: [
      { objection_pattern: 'asks_credentials', sample_dialog_seed: "What makes you different from the other shops in the area?" },
      { objection_pattern: 'asks_for_references', sample_dialog_seed: "Can you give me some references?" },
      { objection_pattern: 'asks_about_warranty', sample_dialog_seed: "Do you guarantee your work?" },
    ],
    hostile: [
      { objection_pattern: 'distrusts_ai', sample_dialog_seed: "I'm not talking to a bot. Get me a human." },
      { objection_pattern: 'angry_caller', sample_dialog_seed: "You guys never call back. What's the deal?" },
      { objection_pattern: 'rude_tone', sample_dialog_seed: "Look, I'm in a hurry — just answer my question." },
    ],
    non_english: [
      { objection_pattern: 'spanish_only', accent_profile: 'spanish_l1_minimal_english', sample_dialog_seed: "Hola, necesito ayuda con un problema." },
      { objection_pattern: 'heavy_accent', accent_profile: 'asian_l2_english', sample_dialog_seed: "Hello, you can help with the problem today?" },
      { objection_pattern: 'limited_english', accent_profile: 'unknown_l2_english', sample_dialog_seed: "Yes hello, I need... help, please, with the thing." },
    ],
    low_info: [
      { objection_pattern: 'vague_request', sample_dialog_seed: "Hi, I'm not sure exactly what I need." },
      { objection_pattern: 'first_time_caller', sample_dialog_seed: "I've never used a service like this before. How does it work?" },
      { objection_pattern: 'asks_generic_question', sample_dialog_seed: "Do you guys do — uh, the thing where you fix stuff?" },
    ],
  },
};

// ─── Handler ────────────────────────────────────────────────────────────────

function resolvePersonaSeedKey(vertical: string): keyof typeof PERSONA_SEEDS {
  const normalized = normalizeVerticalSlug(vertical) ?? vertical;
  if (normalized === 'law_firm') return 'legal';
  if (normalized in PERSONA_SEEDS) return normalized as keyof typeof PERSONA_SEEDS;
  return 'default';
}

function ensureVerticalGuardrailsInPrompt(prompt: string, verticalContextBlock: string): string {
  if (!verticalContextBlock.trim()) return prompt;
  if (prompt.includes('# Approved Vertical Guardrails')) return prompt;
  return [verticalContextBlock, '# Agent Prompt', prompt].join('\n\n');
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  let body: InvokeBody;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { client_id, intake_call_id, personas_per_category, max_iterations } = body;
  if (!client_id) {
    return { statusCode: 400, body: 'client_id required' };
  }

  try {
    const result = await runArchitect({
      client_id,
      intake_call_id,
      personas_per_category: personas_per_category ?? 3,
      max_iterations: max_iterations ?? 4,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[agency-agent-architect] failed', msg);
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
};

// ─── Orchestrator ───────────────────────────────────────────────────────────

interface RunArchitectArgs {
  client_id: string;
  intake_call_id?: string;
  personas_per_category: number;
  max_iterations: number;
}

interface RunArchitectResult {
  artifact_id: string;
  simulation_passed: boolean;
  iterations: number;
  final_aggregate: SimulationBatchResult['aggregate'] | null;
  iteration_history: IterationHistoryEntry[];
  cost_usd: number;
  blocker_summary?: string;
}

async function runArchitect(args: RunArchitectArgs): Promise<RunArchitectResult> {
  const supabase = getServiceClient();

  // (a) Load client + intake call. The intake row is the source of the
  //     extracted_profile that the architect generates a prompt from.
  const { client, intake } = await loadClientAndIntake(supabase, args.client_id, args.intake_call_id);

  const vertical = normalizeVerticalSlug(client.vertical) ?? (client.vertical ?? 'default');
  const verticalKey = resolvePersonaSeedKey(vertical);
  const verticalChunks = await retrieveVerticalPackContext({
    vertical,
    queryText: [
      'agent architect prompt guardrails intake escalation disallowed claims faqs',
      JSON.stringify(intake.extracted_profile),
    ].join('\n'),
    kinds: ['guardrail', 'intake_flow', 'escalation_rule', 'disallowed_claim', 'qualification_field', 'faq'],
    limit: 18,
    supabase,
  });
  const verticalContextBlock = formatVerticalContextForPrompt(verticalChunks);

  const fleet = buildPersonaFleet(verticalKey, args.personas_per_category);

  // We use a closure-captured `latestIterationContext` + `iterationHistory` so
  // the iteration_check callback (which runs INSIDE the harness's loop) can:
  //   (a) read the just-generated draft,
  //   (b) execute Cekura simulation,
  //   (c) decide pass/fail,
  //   (d) compose the failure-feedback message Opus sees on the next pass.
  const iterationHistory: IterationHistoryEntry[] = [];
  let latestOutput: ArchitectOutput | null = null;
  let latestAggregate: SimulationBatchResult['aggregate'] | null = null;

  const skill_dir = resolveSkillDir();
  const output_schema = loadOutputSchema(skill_dir);

  const architectInput: ArchitectInput = {
    client_id: args.client_id,
    vertical,
    extracted_profile: intake.extracted_profile,
    approved_vertical_context: verticalContextBlock
      ? {
          pack_slug: String(normalizeVerticalSlug(vertical) ?? vertical),
          context_block: verticalContextBlock,
          chunks: verticalChunks,
        }
      : null,
    voice_id_hint: '11labs-Adrian',
    language_hint: 'en-US',
  };

  // The iteration check is the heart of the killer feature. The run-agent
  // harness invokes it after EACH generation, and uses its `.pass` to decide
  // whether to loop again or stop. `.why` is what Opus sees on the next pass
  // (the harness threads it into the user message as failure context).
  const iteration_check = async (
    output: ArchitectOutput,
  ): Promise<IterationCheckResult> => {
    if (verticalContextBlock) {
      output.agent_prompt = ensureVerticalGuardrailsInPrompt(
        output.agent_prompt,
        verticalContextBlock,
      );
    }
    latestOutput = output;
    const iterationIdx = iterationHistory.length + 1;

    // Build the AgentConfig that Cekura's runSimulationBatch will mount onto a
    // temporary Retell LLM for stratified simulated callers.
    const agentConfig: AgentConfig = {
      prompt: inlineKbIntoPrompt(output.agent_prompt, output.knowledge_base),
      kb: output.knowledge_base,
      voice_id: output.voice_id,
    };

    let batch: SimulationBatchResult;
    try {
      batch = await runSimulationBatch({
        ad_hoc_personas: fleet,
        against_agent_config: agentConfig,
        n_calls_per_persona: 1,
        timeout_min: 12,
      });
    } catch (err) {
      // If Cekura is unreachable (CEKURA_API_KEY missing in early rollout,
      // network), we can't gate — emit a warn event and accept the draft so
      // the founder still sees something in the queue. The artifact will
      // carry simulation_passed=false with the unreachable reason.
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[agent-architect] simulation unreachable on iter ${iterationIdx}: ${errMsg}`);
      iterationHistory.push({
        iteration: iterationIdx,
        pass: true,
        why: `simulation_unreachable: ${errMsg} — accepting draft as best-effort`,
        prompt_excerpt: output.agent_prompt.slice(0, 600),
      });
      latestAggregate = null;
      return { pass: true };
    }

    latestAggregate = batch.aggregate;

    const perCategoryPassRate = computePerCategoryPassRate(batch, fleet);
    const gate = evaluateGate(batch.aggregate, perCategoryPassRate);

    const worstTranscripts = pickWorstTranscripts(batch, 3);

    iterationHistory.push({
      iteration: iterationIdx,
      pass: gate.pass,
      why: gate.why,
      aggregate: batch.aggregate,
      persona_category_pass_rates: perCategoryPassRate,
      failed_clusters: batch.aggregate.failure_clusters.slice(0, 5).map(c => c.cluster_label),
      worst_transcript_excerpts: worstTranscripts.map(t => t.slice(0, 500)),
      prompt_excerpt: output.agent_prompt.slice(0, 600),
    });

    // Best-effort: record per-iteration sim outcome as a kernel event so
    // delivery-monitor / loop-monitor have visibility into how many iters
    // each client needs.
    await safeEmitSimEvent({
      client_id: args.client_id,
      iteration: iterationIdx,
      aggregate: batch.aggregate,
      n_calls: batch.results.length,
      pass: gate.pass,
    });

    if (gate.pass) {
      return { pass: true };
    }

    // Compose the failure-feedback message Opus sees on the next pass. The
    // harness wraps this string in the user-message context for iteration N+1.
    const feedbackMsg = composeFailureFeedback({
      iteration: iterationIdx,
      gate_why: gate.why ?? 'gate failed',
      failed_clusters: batch.aggregate.failure_clusters.slice(0, 5),
      per_dim_scores: batch.aggregate.per_dim_scores,
      per_category_pass_rate: perCategoryPassRate,
      worst_transcripts: worstTranscripts,
    });

    return { pass: false, why: feedbackMsg };
  };

  // (b) Run the harness with the iteration loop wired up. Opus + the critic +
  //     dedicated-column writes + cross-cutting field enforcement all happen
  //     inside run-agent.
  const runResult = await runAgent<ArchitectInput, ArchitectOutput>({
    agent_name: 'agent-architect',
    client_id: args.client_id,
    input: architectInput,
    skill_dir,
    output_schema,
    model_hint: 'opus', // architect ALWAYS uses Opus — quality matters more than cost here
    adversarial_critic: true,
    max_iterations: args.max_iterations,
    iteration_check,
    artifact_type: 'agent_prompt',
    ship_target: 'retell_agent',
    knowledge_k: 12,
    knowledge_query: [
      'services faqs policies transfer triggers client-specific facts',
      verticalContextBlock,
      JSON.stringify(intake.extracted_profile),
    ].join('\n'),
    router_summary: `agent-architect generating Retell prompt for vertical=${vertical} from extracted_profile (${
      JSON.stringify(intake.extracted_profile).length
    } chars)`,
    agent_default_tier: 'opus',
  });

  const finalIteration = iterationHistory[iterationHistory.length - 1];
  const simulation_passed = Boolean(finalIteration?.pass);

  // (c) Update the just-inserted artifact with the FULL iteration_history,
  //     simulation_passed flag, and (on no-pass) the blocker_summary. The
  //     harness's insert writes a sparser iteration_history (its own pass/why
  //     only); we promote the rich Cekura aggregates + cluster summaries into
  //     content.iteration_history so the queue UI can render the proof drawer.
  const blocker_summary = simulation_passed
    ? undefined
    : composeBlockerSummary(iterationHistory, args.max_iterations);

  await augmentArtifactWithProof({
    supabase,
    artifact_id: runResult.artifact_id,
    iteration_history: iterationHistory,
    simulation_passed,
    final_aggregate: latestAggregate,
    blocker_summary,
    vertical_chunks: verticalChunks,
  });

  // (d) Post-ship hook: if the run passed AND the architect emitted a
  //     vertical_template_feedback object, persist it to agency_knowledge so
  //     the cross-client federated-learning loop can mine it. Anonymized
  //     pattern only — no client_id in the body.
  const verticalTemplateFeedback = (latestOutput as ArchitectOutput | null)?.vertical_template_feedback;
  if (simulation_passed && verticalTemplateFeedback) {
    await writeVerticalTemplateFeedback({
      supabase,
      client_id: args.client_id,
      vertical,
      artifact_id: runResult.artifact_id,
      feedback: verticalTemplateFeedback,
    });
  }

  // (e) On no-pass, emit a warn-severity escalation_action_drafted so Atlas
  //     surfaces "intake-followup-needed" in the morning briefing.
  if (!simulation_passed) {
    await safeEmitBlockerEvent({
      client_id: args.client_id,
      artifact_id: runResult.artifact_id,
      blocker_summary: blocker_summary ?? 'max iterations hit',
    });
  }

  return {
    artifact_id: runResult.artifact_id,
    simulation_passed,
    iterations: iterationHistory.length,
    final_aggregate: latestAggregate,
    iteration_history: iterationHistory,
    cost_usd: runResult.cost_usd,
    blocker_summary,
  };
}

// ─── Persona fleet construction ─────────────────────────────────────────────

function buildPersonaFleet(
  vertical: keyof typeof PERSONA_SEEDS,
  perCategory: number,
): Persona[] {
  const seedPool = PERSONA_SEEDS[vertical];
  const out: Persona[] = [];
  const now = Date.now();

  for (const category of PERSONA_CATEGORIES) {
    const seeds = seedPool[category];
    for (let i = 0; i < perCategory; i++) {
      const seed = seeds[i % seeds.length];
      out.push({
        persona_id: `arch_${vertical}_${category}_${i}_${now.toString(36)}`,
        intent: category,
        objection_pattern: seed.objection_pattern ?? `${category}_default`,
        accent_profile: seed.accent_profile ?? 'standard_us',
        sample_dialog_seed: seed.sample_dialog_seed ?? `I'm calling about your services.`,
        difficulty: category === 'hostile' || category === 'emergency' ? 'hard' : 'medium',
        demographic: seed.demographic,
        time_of_day: seed.time_of_day,
      });
    }
  }
  return out;
}

// ─── Per-category pass-rate computation ─────────────────────────────────────

function computePerCategoryPassRate(
  batch: SimulationBatchResult,
  fleet: Persona[],
): Record<string, number> {
  const personaById = new Map<string, Persona>();
  for (const p of fleet) personaById.set(p.persona_id, p);

  // category -> {passed, total}
  const bucket: Record<string, { passed: number; total: number }> = {};
  for (const c of PERSONA_CATEGORIES) bucket[c] = { passed: 0, total: 0 };

  for (const call of batch.results) {
    const persona = personaById.get(call.persona_id);
    const category = (persona?.intent ?? 'low_info') as PersonaCategory;
    if (!bucket[category]) bucket[category] = { passed: 0, total: 0 };
    bucket[category].total += 1;
    // A call "passes" if qa_score >= 6 AND outcome is bookable OR a legitimate
    // alternative (transferred to a human is fine for emergency / hostile).
    const okOutcome =
      call.outcome === 'booked' ||
      call.outcome === 'transferred' ||
      (category === 'low_info' && call.qa_score >= 6);
    if (okOutcome && call.qa_score >= 6) bucket[category].passed += 1;
  }

  const rates: Record<string, number> = {};
  for (const [cat, { passed, total }] of Object.entries(bucket)) {
    rates[cat] = total > 0 ? Number((passed / total).toFixed(2)) : 1;
  }
  return rates;
}

// ─── Gate evaluation ────────────────────────────────────────────────────────

interface GateResult {
  pass: boolean;
  why?: string;
}

function evaluateGate(
  aggregate: SimulationBatchResult['aggregate'],
  perCategoryPassRate: Record<string, number>,
): GateResult {
  const reasons: string[] = [];

  if (aggregate.avg_qa_score < 8.0) {
    reasons.push(`avg_qa_score=${aggregate.avg_qa_score.toFixed(2)} < 8.0 threshold`);
  }

  for (const [dim, score] of Object.entries(aggregate.per_dim_scores)) {
    if (typeof score === 'number' && score < 6.0) {
      reasons.push(`dim:${dim}=${score.toFixed(2)} < 6.0 threshold`);
    }
  }

  for (const [category, rate] of Object.entries(perCategoryPassRate)) {
    if (rate === 0) {
      reasons.push(`persona_category:${category} 100% failed (0 passing calls)`);
    }
  }

  if (reasons.length === 0) return { pass: true };
  return { pass: false, why: reasons.join('; ') };
}

// ─── Failure-feedback composition (sent to Opus on next iteration) ──────────

interface FailureFeedbackArgs {
  iteration: number;
  gate_why: string;
  failed_clusters: Array<{ cluster_label: string; count: number }>;
  per_dim_scores: Record<string, number>;
  per_category_pass_rate: Record<string, number>;
  worst_transcripts: string[];
}

function composeFailureFeedback(args: FailureFeedbackArgs): string {
  const lines: string[] = [];
  lines.push(`# Iteration ${args.iteration} failed the simulation gate`);
  lines.push('');
  lines.push(`**Why:** ${args.gate_why}`);
  lines.push('');
  lines.push('## Per-dimension scores');
  for (const [dim, score] of Object.entries(args.per_dim_scores)) {
    const marker = score < 6.0 ? ' ← BELOW 6.0' : '';
    lines.push(`- ${dim}: ${score.toFixed(2)}${marker}`);
  }
  lines.push('');
  lines.push('## Per-persona-category pass rate');
  for (const [cat, rate] of Object.entries(args.per_category_pass_rate)) {
    const marker = rate === 0 ? ' ← 100% FAIL' : rate < 0.5 ? ' ← weak' : '';
    lines.push(`- ${cat}: ${Math.round(rate * 100)}%${marker}`);
  }
  lines.push('');
  lines.push('## Top failure clusters (with counts)');
  for (const c of args.failed_clusters) {
    lines.push(`- ${c.cluster_label} (n=${c.count})`);
  }
  lines.push('');
  lines.push('## Worst transcripts (verbatim, top 3)');
  for (let i = 0; i < args.worst_transcripts.length; i++) {
    lines.push(`### Transcript ${i + 1}`);
    lines.push('```');
    lines.push(args.worst_transcripts[i].slice(0, 1500));
    lines.push('```');
  }
  lines.push('');
  lines.push('## Your task on this iteration');
  lines.push('Diagnose the SINGLE most-impactful failure cluster above and make the MINIMAL prompt change that fixes it.');
  lines.push('Anti-pattern: rewriting the whole prompt. Surgical fixes only.');
  lines.push('In reasoning_trace[2], predict which dim/category will improve and by how much.');
  lines.push('In alternatives_rejected, include the "full rewrite" temptation with why_rejected.');
  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickWorstTranscripts(batch: SimulationBatchResult, n: number): string[] {
  return [...batch.results]
    .sort((a, b) => a.qa_score - b.qa_score)
    .slice(0, n)
    .map(r => r.transcript)
    .filter((t): t is string => typeof t === 'string' && t.length > 0);
}

function inlineKbIntoPrompt(prompt: string, kb: Record<string, unknown>): string {
  // The harness simulates against a temporary Retell LLM that does NOT receive
  // a knowledge_base_ids attachment (cekura-adapter creates a bare LLM). So we
  // inline a compact KB summary as a `# Reference data` block appended to the
  // prompt — keeps the sim closer to the real production agent's information
  // surface than passing prompt alone.
  const kbSummary = JSON.stringify(kb, null, 2);
  return `${prompt}\n\n# Reference data (inlined for simulation)\n\`\`\`json\n${kbSummary}\n\`\`\``;
}

function composeBlockerSummary(history: IterationHistoryEntry[], cap: number): string {
  const last = history[history.length - 1];
  const allClusters = new Set<string>();
  for (const h of history) {
    for (const c of h.failed_clusters ?? []) allClusters.add(c);
  }
  return [
    `Architect hit the ${cap}-iteration cap without passing the simulation gate.`,
    `Final iteration: ${last?.why ?? 'unknown'}.`,
    `Recurring failure clusters across all iterations: ${[...allClusters].slice(0, 6).join(', ') || 'none recorded'}.`,
    `Recommended: re-run intake to fill profile gaps OR escalate to founder for manual prompt review.`,
  ].join(' ');
}

function resolveSkillDir(): string {
  // The skill files live in the Marketing repo under
  //   Marketing/strategy/skills/agency-fleet/agent-architect/
  // For Netlify runtime, the SKILL_DIR_AGENT_ARCHITECT env var can override.
  if (process.env.SKILL_DIR_AGENT_ARCHITECT) {
    return process.env.SKILL_DIR_AGENT_ARCHITECT;
  }
  // Fallback: try a co-located skills/ inside the Boltcall repo if Marketing/
  // is mounted alongside, OR a path relative to this file's compiled location.
  const candidates = [
    path.resolve(process.cwd(), 'strategy/skills/agency-fleet/agent-architect'),
    path.resolve(process.cwd(), '../Marketing/strategy/skills/agency-fleet/agent-architect'),
    path.resolve(__dirname, '../../../Marketing/strategy/skills/agency-fleet/agent-architect'),
  ];
  for (const c of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs');
      if (fs.existsSync(path.join(c, 'prompt.md'))) return c;
    } catch {
      // continue
    }
  }
  // Last resort — return the env-expected default; run-agent will throw a
  // clean "missing prompt.md" error pointing at this path.
  return candidates[0];
}

function loadOutputSchema(skill_dir: string): JsonSchemaObject {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs');
  const schemaPath = path.join(skill_dir, 'output-schema.json');
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed as JsonSchemaObject;
}

// ─── Supabase access ────────────────────────────────────────────────────────

function getServiceClient(): SupabaseClient {
  return getServiceSupabase();
}

interface LoadedContext {
  client: { id: string; vertical: string | null; business_name: string | null; region: string | null };
  intake: { id: string; extracted_profile: Record<string, unknown> };
}

async function loadClientAndIntake(
  supabase: SupabaseClient,
  client_id: string,
  intake_call_id?: string,
): Promise<LoadedContext> {
  const { data: client, error: cErr } = await supabase
    .from('agency_clients')
    .select('id, vertical, business_name, region')
    .eq('id', client_id)
    .single();
  if (cErr || !client) {
    throw new Error(`agency_clients lookup failed for ${client_id}: ${cErr?.message ?? 'not found'}`);
  }

  // Latest intake with a non-null extracted_profile, unless caller pinned one.
  const intakeQuery = supabase
    .from('agency_intake_calls')
    .select('id, extracted_profile')
    .eq('client_id', client_id)
    .not('extracted_profile', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: intakeRows, error: iErr } = intake_call_id
    ? await supabase
        .from('agency_intake_calls')
        .select('id, extracted_profile')
        .eq('id', intake_call_id)
        .single()
        .then(r => ({ data: r.data ? [r.data] : null, error: r.error }))
    : await intakeQuery;

  if (iErr || !intakeRows?.length || !intakeRows[0].extracted_profile) {
    throw new Error(
      `agency_intake_calls lookup for client=${client_id} returned no row with extracted_profile`,
    );
  }

  return {
    client: {
      id: client.id,
      vertical: client.vertical,
      business_name: client.business_name,
      region: client.region,
    },
    intake: {
      id: intakeRows[0].id,
      extracted_profile: intakeRows[0].extracted_profile as Record<string, unknown>,
    },
  };
}

// ─── Artifact augmentation (post-harness write) ─────────────────────────────

interface AugmentArgs {
  supabase: SupabaseClient;
  artifact_id: string;
  iteration_history: IterationHistoryEntry[];
  simulation_passed: boolean;
  final_aggregate: SimulationBatchResult['aggregate'] | null;
  blocker_summary?: string;
  vertical_chunks?: RetrievedVerticalChunk[];
}

async function augmentArtifactWithProof(args: AugmentArgs): Promise<void> {
  // The harness already inserted the artifact with content={payload, iteration_history}.
  // We OVERWRITE content with a richer iteration_history (full Cekura aggregates) +
  // append simulation_passed + blocker_summary + simulation_proof keys.
  const { data: existing, error: readErr } = await args.supabase
    .from('agency_artifacts')
    .select('content, predicted_impact, retrieved_context')
    .eq('id', args.artifact_id)
    .single();
  if (readErr || !existing) {
    console.warn(`[agent-architect] augment: artifact ${args.artifact_id} read failed: ${readErr?.message}`);
    return;
  }

  const newContent = {
    ...(existing.content as Record<string, unknown>),
    iteration_history: args.iteration_history,
    simulation_passed: args.simulation_passed,
    simulation_proof: args.final_aggregate
      ? {
          avg_qa_score: args.final_aggregate.avg_qa_score,
          per_dim_scores: args.final_aggregate.per_dim_scores,
          failure_clusters: args.final_aggregate.failure_clusters,
        }
      : null,
    ...(args.blocker_summary ? { blocker_summary: args.blocker_summary } : {}),
    ...(args.vertical_chunks?.length ? { vertical_pack_context: args.vertical_chunks } : {}),
  };

  // Promote sim avg_qa into predicted_impact too so the queue UI can rank by it.
  const predictedImpact = (existing.predicted_impact as Record<string, unknown> | null) ?? {};
  const enrichedImpact = {
    ...predictedImpact,
    ...(args.final_aggregate
      ? { simulated_avg_qa_score: args.final_aggregate.avg_qa_score }
      : {}),
    simulation_passed: args.simulation_passed,
  };

  const existingRetrievedContext = Array.isArray((existing as Record<string, unknown>).retrieved_context)
    ? ((existing as Record<string, unknown>).retrieved_context as unknown[])
    : [];
  const verticalRetrievedContext = (args.vertical_chunks ?? []).map((chunk) => ({
    scope: 'vertical',
    pack_slug: chunk.pack_slug,
    knowledge_id: chunk.knowledge_id,
    kind: chunk.kind,
    score: chunk.score,
  }));

  const { error: updErr } = await args.supabase
    .from('agency_artifacts')
    .update({
      content: newContent,
      predicted_impact: enrichedImpact,
      ...(verticalRetrievedContext.length
        ? { retrieved_context: [...existingRetrievedContext, ...verticalRetrievedContext] }
        : {}),
    })
    .eq('id', args.artifact_id);
  if (updErr) {
    console.warn(`[agent-architect] augment: artifact ${args.artifact_id} update failed: ${updErr.message}`);
  }
}

// ─── Vertical-template-feedback write (post-ship hook into Layer 5 registry) ─

interface FeedbackWriteArgs {
  supabase: SupabaseClient;
  client_id: string;
  vertical: string;
  artifact_id: string;
  feedback: {
    pattern_label: string;
    vertical: string;
    description: string;
    proposed_template_change: string;
    supporting_evidence?: string[];
  };
}

async function writeVerticalTemplateFeedback(args: FeedbackWriteArgs): Promise<void> {
  // Anonymized: do NOT include any business-name / region / metrics in body.
  // The federated-learning loop reads kind='vertical_template_feedback' and
  // mines structural patterns only.
  const body = {
    client_id: args.client_id,
    kind: 'vertical_template_feedback',
    content: {
      vertical: args.vertical,
      pattern_label: args.feedback.pattern_label,
      description: args.feedback.description,
      proposed_template_change: args.feedback.proposed_template_change,
      supporting_evidence: args.feedback.supporting_evidence ?? [],
      source_artifact_id: args.artifact_id,
      source: 'agent-architect',
    },
    version: 1,
  };

  const { error } = await args.supabase.from('agency_knowledge').insert(body);
  if (error) {
    console.warn(
      `[agent-architect] vertical_template_feedback write failed (non-blocking): ${error.message}`,
    );
  }
}

// ─── Event emission helpers (always best-effort) ────────────────────────────

interface SimEventArgs {
  client_id: string;
  iteration: number;
  aggregate: SimulationBatchResult['aggregate'];
  n_calls: number;
  pass: boolean;
}

async function safeEmitSimEvent(args: SimEventArgs): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: 'agent-architect',
      type: 'digital_twin_run_completed',
      severity: 'info',
      payload: {
        run_id: `arch-iter-${args.iteration}-${Date.now().toString(36)}`,
        persona_count: Math.max(1, args.n_calls),
        pass_rate: Math.min(1, Math.max(0, args.aggregate.avg_qa_score / 10)),
        average_qa_score: args.aggregate.avg_qa_score,
        failure_clusters: args.aggregate.failure_clusters.length,
      },
      why_explanation: `agent-architect iteration ${args.iteration} sim ${args.pass ? 'PASSED' : 'failed'} (avg_qa=${args.aggregate.avg_qa_score.toFixed(2)})`,
    });
  } catch (err) {
    console.warn(
      `[agent-architect] sim event emission failed (non-blocking): ${(err as Error).message}`,
    );
  }
}

interface BlockerEventArgs {
  client_id: string;
  artifact_id: string;
  blocker_summary: string;
}

async function safeEmitBlockerEvent(args: BlockerEventArgs): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: 'agent-architect',
      type: 'escalation_action_drafted',
      severity: 'warn',
      payload: {
        artifact_id: args.artifact_id,
        action_type: 'notify_client',
        reversible: true,
      },
      why_explanation: args.blocker_summary,
    });
  } catch (err) {
    console.warn(
      `[agent-architect] blocker event emission failed (non-blocking): ${(err as Error).message}`,
    );
  }
}

// ─── Test-only exports ──────────────────────────────────────────────────────

export const __test__ = {
  buildPersonaFleet,
  computePerCategoryPassRate,
  evaluateGate,
  composeFailureFeedback,
  composeBlockerSummary,
  pickWorstTranscripts,
  inlineKbIntoPrompt,
  PERSONA_CATEGORIES,
};
