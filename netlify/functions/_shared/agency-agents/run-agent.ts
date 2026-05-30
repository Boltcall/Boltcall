/**
 * Agency OS — Agent Runner Harness
 * ================================
 *
 * Every agent in `strategy/skills/agency-fleet/<agent>/` runs through this single
 * harness. It owns the cross-cutting features the OS depends on:
 *
 *   - per-call model routing (Haiku/Sonnet/Opus) via `router-classifier`
 *   - RAG pre-pass over `agency_knowledge` (Layer 5)
 *   - Claude tool-use generation with `output_schema` enforcement
 *   - schema-required confidence + reasoning_trace + retrieved_context +
 *     alternatives_rejected on every artifact (Feature #1)
 *   - generate-simulate-iterate loop for producer agents (agent-architect)
 *   - adversarial-critic stage with one rebuttal pass (Feature #7)
 *   - artifact insert into `agency_artifacts` (status='draft')
 *   - matching `agency_events` row with `why_explanation`
 *   - per-call `cost_incurred` event for cost dashboard
 *   - one-shot transient-error retry + loud `adapter_error` on second failure
 *
 * The harness does NOT ship artifacts. That's a separate concern handled by the
 * approval queue + ship handlers (`agency-deploy-agent.ts` etc).
 */

import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../token-utils';

// ─────────────────────────────────────────────────────────────────────────────
//   Parallel-task stubs — these files are written by sibling agents in this
//   phase. Importing them by relative path lets TS compile in the meantime.
// ─────────────────────────────────────────────────────────────────────────────
import { classifyDifficulty } from './router-classifier';
import { retrieve } from '../agency-knowledge/retrieve';

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export type ArtifactType =
  | 'agent_prompt'
  | 'knowledge_base'
  | 'ad_creative'
  | 'ad_copy'
  | 'weekly_report'
  | 'optimization_brief'
  | 'prompt_revision'
  | 'client_outreach'
  | 'escalation_action';

export interface IterationCheckResult {
  pass: boolean;
  why?: string;
}

export interface RunAgentOptions<TInput, TOutput> {
  agent_name: string;
  client_id: string;
  input: TInput;
  /** Absolute path to `strategy/skills/agency-fleet/<agent>/`. */
  skill_dir: string;
  /** JSONSchema for the structured output the agent must emit via tool-use. */
  output_schema: JsonSchemaObject;
  /** Force a model tier instead of using the router-classifier. */
  model_hint?: ModelTier;
  /** Default: true. Producer agents pass through critic; pure scorers skip. */
  adversarial_critic?: boolean;
  /** Default: 1. Iterative agents (agent-architect) pass >1. */
  max_iterations?: number;
  /** Iteration guard for generate-simulate-iterate loops. */
  iteration_check?: (output: TOutput) => Promise<IterationCheckResult>;
  /** Artifact type for `agency_artifacts.type` + event mirroring. */
  artifact_type: ArtifactType;
  /** What this artifact would ship to once approved. */
  ship_target?: string;
  /** Top-K knowledge chunks to retrieve. Defaults to 10. */
  knowledge_k?: number;
  /** Optional pre-formed retrieval query; default = JSON.stringify(input). */
  knowledge_query?: string;
}

export interface AdversarialReview {
  findings: string[];
  rebuttals: string[];
}

export interface RunAgentResult<TOutput> {
  artifact_id: string;
  output: TOutput;
  confidence: number;
  reasoning_trace: string[];
  retrieved_context: KnowledgeChunk[];
  alternatives_rejected: unknown[];
  adversarial_review?: AdversarialReview;
  iterations: number;
  cost_usd: number;
  latency_ms: number;
}

export interface KnowledgeChunk {
  id: string;
  kind: string;
  content: unknown;
  score: number;
}

export interface CallClaudeArgs {
  system: string;
  user_messages: Anthropic.MessageParam[];
  tier: ModelTier;
  output_schema: JsonSchemaObject;
  tool_name?: string;
  max_tokens?: number;
  agent_name: string;
  client_id: string;
}

export interface CallClaudeResult<T = Record<string, unknown>> {
  output: T;
  cost_usd: number;
  latency_ms: number;
  tokens: { input: number; output: number };
  model: string;
}

// JSONSchema we accept — kept narrow so we can pass it straight to Claude.
export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  items?: JsonSchemaProperty | JsonSchemaObject;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  enum?: unknown[];
  [key: string]: unknown;
}

// What every artifact MUST carry (Feature #1). Merged into the caller's schema.
interface CrossCuttingArtifactFields {
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
}

// Internal: model ID per tier (kept here so a single edit covers the OS).
const MODEL_IDS: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6-20251015',
  opus: 'claude-opus-4-7-20260101',
};

// Approximate USD pricing per 1M tokens. Tunable; logged-not-billed.
// Values reflect public Anthropic pricing as of late 2025 — adjust if needed.
const MODEL_PRICING: Record<
  ModelTier,
  { input_per_mtok: number; output_per_mtok: number }
> = {
  haiku: { input_per_mtok: 1.0, output_per_mtok: 5.0 },
  sonnet: { input_per_mtok: 3.0, output_per_mtok: 15.0 },
  opus: { input_per_mtok: 15.0, output_per_mtok: 75.0 },
};

const DEFAULT_TOOL_NAME = 'emit_structured_output';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_KNOWLEDGE_K = 10;

// Critic templates per artifact type — used when the skill_dir doesn't supply
// its own `adversarial-critic.md`.
const DEFAULT_CRITIC_TEMPLATES: Record<ArtifactType, string> = {
  agent_prompt:
    'You are an adversarial reviewer of voice-AI agent prompts. Attack the supplied prompt: hallucination risk, missing guardrails, ambiguous transfer rules, vertical-compliance gaps (med-spa FDA, legal bar rules, HVAC guarantees). Return concrete findings only.',
  knowledge_base:
    'You are an adversarial reviewer of an AI knowledge base. Find missing edge cases, contradictions, jargon a real caller would not understand, and policy gaps. Return concrete findings only.',
  ad_creative:
    'You are an adversarial creative reviewer. Attack the supplied ad creative for compliance risk, claim-substantiation gaps, vertical-disclaimer requirements, hook fatigue vs recent approved ads, and image-fingerprint patterns Meta penalizes. Return concrete findings only.',
  ad_copy:
    'You are an adversarial copy reviewer. Attack the supplied ad copy: unsubstantiated claims, compliance issues for this vertical, weak hook, generic angle, hook-overlap with recent ads. Return concrete findings only.',
  weekly_report:
    'You are an adversarial report reviewer. Attack the supplied weekly report: vague claims, jargon, passive voice, charts without takeaways, missing client-facing actionability, and any number that is not traceable to a transcript or KPI. Return concrete findings only.',
  optimization_brief:
    'You are an adversarial strategy reviewer. Attack the supplied optimization brief: unfalsifiable recommendations, missing predicted lift + CI, missing BENCHMARK scenario, missing rollback trigger, generic best-practice filler. Return concrete findings only.',
  prompt_revision:
    'You are an adversarial reviewer of a prompt revision. Attack: does the diff actually address the failure mode it claims to fix, does it introduce new failure modes, does it regress existing scenarios. Return concrete findings only.',
  client_outreach:
    'You are an adversarial reviewer of client outreach. Attack: tone-mismatch with the client, generic openers, missing specific evidence, weak ask, anything that reads as automated. Return concrete findings only.',
  escalation_action:
    'You are an adversarial reviewer of an escalation action. Attack: is the root cause hypothesis actually supported, is the proposed action reversible, is the rollback path defined. Return concrete findings only.',
};

// Errors that are worth one retry. Everything else fails immediately.
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504, 529]);

// ─────────────────────────────────────────────────────────────────────────────
//   Public — runAgent
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgent<TInput, TOutput extends CrossCuttingArtifactFields>(
  options: RunAgentOptions<TInput, TOutput>,
): Promise<RunAgentResult<TOutput>> {
  const t0 = Date.now();
  const supabase = getServiceSupabase();

  const {
    agent_name,
    client_id,
    input,
    skill_dir,
    output_schema,
    model_hint,
    adversarial_critic = true,
    max_iterations = 1,
    iteration_check,
    artifact_type,
    ship_target,
    knowledge_k = DEFAULT_KNOWLEDGE_K,
    knowledge_query,
  } = options;

  // (a) Load SKILL.md + prompt.md + output-schema.json from skill_dir.
  const { systemPrompt, skillNotes, schemaFromDisk } = loadSkillFiles(skill_dir);
  // Caller's output_schema is authoritative; the on-disk schema is just a sanity
  // check we surface to the developer if they diverge.
  if (schemaFromDisk && !schemasShallowMatch(output_schema, schemaFromDisk)) {
    console.warn(
      `[run-agent:${agent_name}] caller output_schema differs from on-disk output-schema.json — caller wins.`,
    );
  }

  // Merge cross-cutting fields into the schema so Claude is forced to emit them.
  const enforcedSchema = withCrossCuttingFields(output_schema);

  // (b) Route model tier unless caller provided a hint.
  const tier: ModelTier =
    model_hint ??
    (await pickTierViaRouter({
      agent_name,
      client_id,
      input,
      supabase,
    }));

  // (c) RAG pre-pass.
  const retrieved_context: KnowledgeChunk[] = await safeRetrieve({
    client_id,
    agent_name,
    query: knowledge_query ?? safeStringify(input),
    k: knowledge_k,
    supabase,
  });

  // Build the initial user message. The agent prompt template can reference
  // {{input}} and {{retrieved_context}} — we just append them as JSON so even
  // skills that don't template still get the data.
  const baseUserMessage: string = [
    skillNotes ? `# Skill notes\n${skillNotes}\n` : '',
    `# Input\n\`\`\`json\n${safeStringify(input)}\n\`\`\``,
    `# Retrieved context (top ${retrieved_context.length})\n\`\`\`json\n${safeStringify(
      retrieved_context.map((c) => ({ id: c.id, kind: c.kind, content: c.content })),
    )}\n\`\`\``,
    '',
    'Emit your answer by calling the tool `emit_structured_output` exactly once.',
    'You MUST populate: confidence (0..1), reasoning_trace (>=3 bullets), alternatives_rejected (>=1 entry, or [] only if no real alternative existed).',
  ]
    .filter(Boolean)
    .join('\n\n');

  // (d) Generate, enforcing schema. One immediate retry on schema-shape failure.
  let iteration = 0;
  let totalCost = 0;
  let output: TOutput | undefined;
  let lastModel = MODEL_IDS[tier];
  const iterationHistory: Array<{ iteration: number; pass: boolean; why?: string }> = [];

  const conversation: Anthropic.MessageParam[] = [
    { role: 'user', content: baseUserMessage },
  ];

  for (iteration = 1; iteration <= Math.max(1, max_iterations); iteration += 1) {
    let attempt: CallClaudeResult<TOutput> | undefined;

    for (let schemaTry = 0; schemaTry < 2; schemaTry += 1) {
      try {
        attempt = await callClaude<TOutput>({
          system: systemPrompt,
          user_messages: conversation,
          tier,
          output_schema: enforcedSchema,
          agent_name,
          client_id,
        });
      } catch (err) {
        await emitAdapterError(supabase, client_id, agent_name, 'callClaude failed', err);
        throw err;
      }

      const validation = validateCrossCutting(attempt.output);
      if (validation.ok) {
        break;
      }

      // Schema-shape failure → tell the model what's missing and try again once.
      if (schemaTry === 0) {
        conversation.push({
          role: 'assistant',
          content: `Tool emitted but failed validation: ${validation.reason}. Re-emit with the missing fields.`,
        });
        conversation.push({
          role: 'user',
          content: `Your last tool call was missing: ${validation.reason}. Re-emit emit_structured_output with all required fields populated.`,
        });
        attempt = undefined;
        continue;
      }

      // Second failure → loud event + throw.
      await emitAdapterError(
        supabase,
        client_id,
        agent_name,
        `schema validation failed twice: ${validation.reason}`,
        new Error(validation.reason ?? 'schema invalid'),
      );
      throw new Error(
        `[run-agent:${agent_name}] schema validation failed after retry: ${validation.reason}`,
      );
    }

    if (!attempt) {
      throw new Error(`[run-agent:${agent_name}] no valid generation produced`);
    }

    totalCost += attempt.cost_usd;
    lastModel = attempt.model;
    output = attempt.output;

    // (e) Iteration guard (generate-simulate-iterate).
    if (max_iterations > 1 && iteration_check) {
      const guard = await iteration_check(output);
      iterationHistory.push({ iteration, pass: guard.pass, why: guard.why });
      if (guard.pass) break;
      if (iteration >= max_iterations) break;

      conversation.push({
        role: 'assistant',
        content: `Previous attempt did not pass iteration check: ${guard.why ?? 'no reason given'}. Revise.`,
      });
      conversation.push({
        role: 'user',
        content: `Iteration ${iteration} failed: ${guard.why ?? 'unknown'}. Produce a revised version that addresses the failure. Re-emit emit_structured_output.`,
      });
      continue;
    }

    break;
  }

  if (!output) {
    throw new Error(`[run-agent:${agent_name}] generation produced no output`);
  }

  // (f) Adversarial critic + one rebuttal pass.
  let adversarial_review: AdversarialReview | undefined;
  if (adversarial_critic) {
    const criticPrompt = loadCriticTemplate(skill_dir, artifact_type);
    const critic = await runCritic({
      agent_name,
      client_id,
      tier,
      criticPrompt,
      artifact: output,
      supabase,
    });
    totalCost += critic.cost_usd;

    let rebuttals: string[] = [];
    if (critic.findings.length > 0) {
      const rebuttalResult = await runRebuttal<TOutput>({
        agent_name,
        client_id,
        tier,
        systemPrompt,
        priorOutput: output,
        findings: critic.findings,
        output_schema: enforcedSchema,
        supabase,
      });
      totalCost += rebuttalResult.cost_usd;
      rebuttals = rebuttalResult.rebuttals;
      // The rebuttal pass may have produced a revised artifact. Trust it only
      // if it still validates.
      if (rebuttalResult.revised) {
        const v = validateCrossCutting(rebuttalResult.revised);
        if (v.ok) {
          output = rebuttalResult.revised;
        }
      }
    }

    adversarial_review = {
      findings: critic.findings,
      rebuttals,
    };
  }

  const latency_ms = Date.now() - t0;
  const confidence = clampConfidence(output.confidence);

  // (g) Insert artifact.
  const artifact_id = await insertArtifact({
    supabase,
    client_id,
    agent_name,
    artifact_type,
    model: lastModel,
    output,
    cost_usd: totalCost,
    latency_ms,
    confidence,
    retrieved_context,
    adversarial_review,
    iteration_history: iterationHistory,
    ship_target,
  });

  // (h) Matching event.
  await emitAgencyEvent({
    supabase,
    client_id,
    agent_name,
    type: artifact_type,
    severity: 'info',
    payload: {
      artifact_id,
      iterations: iteration,
      cost_usd: totalCost,
      latency_ms,
      confidence,
      model: lastModel,
    },
    why_explanation: summarizeWhy(agent_name, artifact_type, output, confidence, iteration),
  });

  return {
    artifact_id,
    output,
    confidence,
    reasoning_trace: Array.isArray(output.reasoning_trace) ? output.reasoning_trace : [],
    retrieved_context,
    alternatives_rejected: Array.isArray(output.alternatives_rejected)
      ? output.alternatives_rejected
      : [],
    adversarial_review,
    iterations: iteration,
    cost_usd: totalCost,
    latency_ms,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Public — callClaude
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thin wrapper around @anthropic-ai/sdk that enforces tool-use, computes cost
 * + latency, and emits a `cost_incurred` event. One retry on transient errors.
 */
export async function callClaude<T = Record<string, unknown>>(
  args: CallClaudeArgs,
): Promise<CallClaudeResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const client = new Anthropic({ apiKey });
  const model = MODEL_IDS[args.tier];
  const tool_name = args.tool_name ?? DEFAULT_TOOL_NAME;
  const max_tokens = args.max_tokens ?? DEFAULT_MAX_TOKENS;

  const tools: Anthropic.Tool[] = [
    {
      name: tool_name,
      description:
        'Emit the structured artifact. Must include confidence, reasoning_trace, alternatives_rejected, plus all agent-specific fields.',
      // The SDK's input_schema type is permissive; our JsonSchemaObject is a
      // valid subset.
      input_schema: args.output_schema as unknown as Anthropic.Tool.InputSchema,
    },
  ];

  const t0 = Date.now();
  let response: Anthropic.Message | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await client.messages.create({
        model,
        max_tokens,
        system: args.system,
        messages: args.user_messages,
        tools,
        tool_choice: { type: 'tool', name: tool_name },
      });
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && isTransientError(err)) {
        await sleep(750 + Math.floor(Math.random() * 750));
        continue;
      }
      await safeEmitAdapterError(
        args.client_id,
        args.agent_name,
        `Claude call failed (${model})`,
        err,
      );
      throw err;
    }
  }

  if (!response) {
    throw lastErr instanceof Error ? lastErr : new Error('Claude call failed with no response');
  }

  const latency_ms = Date.now() - t0;

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === tool_name,
  );
  if (!toolUseBlock) {
    throw new Error(
      `[callClaude:${args.agent_name}] expected tool_use block named ${tool_name}, got: ${response.content
        .map((b) => b.type)
        .join(',')}`,
    );
  }

  const input_tokens = response.usage?.input_tokens ?? 0;
  const output_tokens = response.usage?.output_tokens ?? 0;
  const cost_usd = computeCostUsd(args.tier, input_tokens, output_tokens);

  // Fire-and-forget cost event. Never block the caller on this.
  void safeEmitCostEvent({
    client_id: args.client_id,
    agent_name: args.agent_name,
    model,
    cost_usd,
    tokens: { input: input_tokens, output: output_tokens },
    latency_ms,
  });

  return {
    output: toolUseBlock.input as T,
    cost_usd,
    latency_ms,
    tokens: { input: input_tokens, output: output_tokens },
    model,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Skill-file loading
// ─────────────────────────────────────────────────────────────────────────────

interface LoadedSkill {
  systemPrompt: string;
  skillNotes: string;
  schemaFromDisk: JsonSchemaObject | null;
}

function loadSkillFiles(skill_dir: string): LoadedSkill {
  const promptPath = path.join(skill_dir, 'prompt.md');
  const skillPath = path.join(skill_dir, 'SKILL.md');
  const schemaPath = path.join(skill_dir, 'output-schema.json');

  if (!fs.existsSync(promptPath)) {
    throw new Error(`[run-agent] missing prompt.md at ${promptPath}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, 'utf8');
  const skillNotes = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';

  let schemaFromDisk: JsonSchemaObject | null = null;
  if (fs.existsSync(schemaPath)) {
    try {
      const raw = fs.readFileSync(schemaPath, 'utf8');
      schemaFromDisk = JSON.parse(raw) as JsonSchemaObject;
    } catch (err) {
      console.warn(`[run-agent] failed to parse ${schemaPath}: ${(err as Error).message}`);
    }
  }

  return { systemPrompt, skillNotes, schemaFromDisk };
}

function loadCriticTemplate(skill_dir: string, artifact_type: ArtifactType): string {
  const localCritic = path.join(skill_dir, 'adversarial-critic.md');
  if (fs.existsSync(localCritic)) {
    return fs.readFileSync(localCritic, 'utf8');
  }
  return DEFAULT_CRITIC_TEMPLATES[artifact_type];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Schema enforcement
// ─────────────────────────────────────────────────────────────────────────────

function withCrossCuttingFields(schema: JsonSchemaObject): JsonSchemaObject {
  const properties: Record<string, JsonSchemaProperty> = {
    ...schema.properties,
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Self-assessed confidence in this artifact, 0..1.',
    },
    reasoning_trace: {
      type: 'array',
      minItems: 3,
      items: { type: 'string' },
      description: 'Three or more bullets explaining the key choices made.',
    },
    alternatives_rejected: {
      type: 'array',
      items: { type: 'object' },
      description:
        'Alternative versions or strategies considered but rejected. Empty array allowed only when no real alternative existed.',
    },
  };

  const requiredSet = new Set<string>([
    ...(schema.required ?? []),
    'confidence',
    'reasoning_trace',
    'alternatives_rejected',
  ]);

  return {
    ...schema,
    properties,
    required: Array.from(requiredSet),
  };
}

interface ValidationResult {
  ok: boolean;
  reason?: string;
}

function validateCrossCutting(output: unknown): ValidationResult {
  if (!output || typeof output !== 'object') {
    return { ok: false, reason: 'tool output is not an object' };
  }
  const o = output as Record<string, unknown>;

  if (typeof o.confidence !== 'number' || o.confidence < 0 || o.confidence > 1) {
    return { ok: false, reason: 'confidence must be a number between 0 and 1' };
  }
  if (!Array.isArray(o.reasoning_trace) || o.reasoning_trace.length < 3) {
    return {
      ok: false,
      reason: 'reasoning_trace must be an array with at least 3 string bullets',
    };
  }
  if (!o.reasoning_trace.every((b): b is string => typeof b === 'string' && b.trim().length > 0)) {
    return { ok: false, reason: 'reasoning_trace entries must be non-empty strings' };
  }
  if (!Array.isArray(o.alternatives_rejected)) {
    return { ok: false, reason: 'alternatives_rejected must be an array' };
  }
  return { ok: true };
}

function schemasShallowMatch(a: JsonSchemaObject, b: JsonSchemaObject): boolean {
  const ka = Object.keys(a.properties ?? {}).sort().join(',');
  const kb = Object.keys(b.properties ?? {}).sort().join(',');
  return ka === kb;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Router-classifier + retrieve safety wrappers
// ─────────────────────────────────────────────────────────────────────────────

async function pickTierViaRouter(args: {
  agent_name: string;
  client_id: string;
  input: unknown;
  supabase: SupabaseClient;
}): Promise<ModelTier> {
  try {
    const difficulty = await classifyDifficulty({
      agent_name: args.agent_name,
      client_id: args.client_id,
      input: args.input,
    });
    // Map router output to a tier. The router returns trivial|normal|hard;
    // the agent's natural tier is bumped up one step on hard inputs.
    if (difficulty === 'hard') return 'opus';
    if (difficulty === 'normal') return 'sonnet';
    return 'haiku';
  } catch (err) {
    console.warn(
      `[run-agent:${args.agent_name}] router-classifier failed, defaulting to sonnet: ${
        (err as Error).message
      }`,
    );
    return 'sonnet';
  }
}

async function safeRetrieve(args: {
  client_id: string;
  agent_name: string;
  query: string;
  k: number;
  supabase: SupabaseClient;
}): Promise<KnowledgeChunk[]> {
  try {
    const chunks = await retrieve({
      client_id: args.client_id,
      query: args.query,
      k: args.k,
      agent_name: args.agent_name,
    });
    return Array.isArray(chunks) ? (chunks as KnowledgeChunk[]) : [];
  } catch (err) {
    // Retrieval is a soft dependency — never fail the agent because RAG broke.
    console.warn(
      `[run-agent:${args.agent_name}] retrieve failed, continuing without context: ${
        (err as Error).message
      }`,
    );
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Adversarial critic + rebuttal
// ─────────────────────────────────────────────────────────────────────────────

interface CriticResult {
  findings: string[];
  cost_usd: number;
}

async function runCritic(args: {
  agent_name: string;
  client_id: string;
  tier: ModelTier;
  criticPrompt: string;
  artifact: unknown;
  supabase: SupabaseClient;
}): Promise<CriticResult> {
  // Critic uses one tier lower than the producer (cost-contained). Opus -> Sonnet,
  // Sonnet -> Haiku, Haiku stays Haiku.
  const criticTier: ModelTier =
    args.tier === 'opus' ? 'sonnet' : args.tier === 'sonnet' ? 'haiku' : 'haiku';

  const criticSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: { type: 'string' },
        description: 'Concrete attack-points. Empty if the artifact is clean.',
      },
    },
    required: ['findings'],
    additionalProperties: false,
  };

  const result = await callClaude<{ findings: string[] }>({
    system: args.criticPrompt,
    user_messages: [
      {
        role: 'user',
        content:
          'Artifact to attack:\n\n```json\n' +
          safeStringify(args.artifact) +
          '\n```\n\nReturn findings via emit_structured_output.',
      },
    ],
    tier: criticTier,
    output_schema: criticSchema,
    tool_name: DEFAULT_TOOL_NAME,
    agent_name: `${args.agent_name}:critic`,
    client_id: args.client_id,
  });

  const findings = Array.isArray(result.output?.findings)
    ? result.output.findings.filter(
        (f): f is string => typeof f === 'string' && f.trim().length > 0,
      )
    : [];

  return { findings, cost_usd: result.cost_usd };
}

interface RebuttalResult<TOutput> {
  rebuttals: string[];
  revised?: TOutput;
  cost_usd: number;
}

async function runRebuttal<TOutput extends CrossCuttingArtifactFields>(args: {
  agent_name: string;
  client_id: string;
  tier: ModelTier;
  systemPrompt: string;
  priorOutput: TOutput;
  findings: string[];
  output_schema: JsonSchemaObject;
  supabase: SupabaseClient;
}): Promise<RebuttalResult<TOutput>> {
  const rebuttalSystem = [
    args.systemPrompt,
    '',
    '# Adversarial review pass',
    'An adversarial critic produced findings against your previous artifact.',
    'For each finding: either fix the artifact (preferred) OR write a short rebuttal explaining why the finding is wrong.',
    'Then re-emit the artifact via emit_structured_output. The output schema is unchanged; add a top-level `rebuttals` array of strings (one per finding, in order) so the founder can see both sides.',
  ].join('\n');

  // Inject `rebuttals` into the schema for this pass only.
  const rebuttalSchema: JsonSchemaObject = {
    ...args.output_schema,
    properties: {
      ...args.output_schema.properties,
      rebuttals: {
        type: 'array',
        items: { type: 'string' },
        description: 'One rebuttal per critic finding, in the order they were raised.',
      },
    },
    required: Array.from(new Set([...(args.output_schema.required ?? []), 'rebuttals'])),
  };

  const result = await callClaude<TOutput & { rebuttals?: string[] }>({
    system: rebuttalSystem,
    user_messages: [
      {
        role: 'user',
        content:
          '# Prior artifact\n```json\n' +
          safeStringify(args.priorOutput) +
          '\n```\n\n# Critic findings\n' +
          args.findings.map((f, i) => `${i + 1}. ${f}`).join('\n') +
          '\n\nReturn the revised artifact via emit_structured_output, including the `rebuttals` array.',
      },
    ],
    tier: args.tier,
    output_schema: rebuttalSchema,
    agent_name: `${args.agent_name}:rebuttal`,
    client_id: args.client_id,
  });

  const rebuttals = Array.isArray(result.output?.rebuttals)
    ? result.output.rebuttals.filter((r): r is string => typeof r === 'string')
    : [];

  // Strip rebuttals back off the artifact before returning so it matches TOutput.
  const { rebuttals: _drop, ...revised } = result.output;
  void _drop;

  return {
    rebuttals,
    revised: revised as TOutput,
    cost_usd: result.cost_usd,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Persistence — artifacts + events
// ─────────────────────────────────────────────────────────────────────────────

interface InsertArtifactArgs {
  supabase: SupabaseClient;
  client_id: string;
  agent_name: string;
  artifact_type: ArtifactType;
  model: string;
  output: Record<string, unknown> & CrossCuttingArtifactFields;
  cost_usd: number;
  latency_ms: number;
  confidence: number;
  retrieved_context: KnowledgeChunk[];
  adversarial_review?: AdversarialReview;
  iteration_history: Array<{ iteration: number; pass: boolean; why?: string }>;
  ship_target?: string;
}

async function insertArtifact(args: InsertArtifactArgs): Promise<string> {
  // `content` carries the agent payload + the cross-cutting epistemic context.
  // The schema column on agency_artifacts is `content jsonb`; columns like
  // confidence/retrieved_context/adversarial_review may not exist yet on the
  // base table (plan ships them additive). We store them inside `content` so
  // this code works against the v1 migration; if a follow-up migration adds
  // dedicated columns, those can be promoted from here in one place.
  const predicted_impact =
    typeof args.output.predicted_impact === 'object' && args.output.predicted_impact !== null
      ? args.output.predicted_impact
      : undefined;

  const content = {
    payload: stripCrossCutting(args.output),
    confidence: args.confidence,
    reasoning_trace: args.output.reasoning_trace,
    alternatives_rejected: args.output.alternatives_rejected,
    retrieved_context: args.retrieved_context.map((c) => ({
      id: c.id,
      kind: c.kind,
      score: c.score,
    })),
    adversarial_review: args.adversarial_review ?? null,
    iteration_history: args.iteration_history,
    predicted_impact: predicted_impact ?? null,
  };

  const { data, error } = await args.supabase
    .from('agency_artifacts')
    .insert({
      client_id: args.client_id,
      type: args.artifact_type,
      status: 'draft',
      generated_by: args.agent_name,
      model: args.model,
      content,
      ship_target: args.ship_target ?? null,
      cost_usd: args.cost_usd,
      latency_ms: args.latency_ms,
    })
    .select('id')
    .single();

  if (error || !data) {
    await safeEmitAdapterError(
      args.client_id,
      args.agent_name,
      'agency_artifacts insert failed',
      error ?? new Error('no row returned'),
    );
    throw new Error(
      `[run-agent:${args.agent_name}] failed to insert artifact: ${error?.message ?? 'unknown'}`,
    );
  }

  return data.id as string;
}

function stripCrossCutting(
  output: Record<string, unknown> & CrossCuttingArtifactFields,
): Record<string, unknown> {
  const {
    confidence: _c,
    reasoning_trace: _r,
    alternatives_rejected: _a,
    ...rest
  } = output;
  void _c;
  void _r;
  void _a;
  return rest;
}

interface EmitAgencyEventArgs {
  supabase: SupabaseClient;
  client_id: string;
  agent_name: string;
  type: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  payload: Record<string, unknown>;
  why_explanation?: string;
}

async function emitAgencyEvent(args: EmitAgencyEventArgs): Promise<void> {
  const row = {
    client_id: args.client_id,
    agent_name: args.agent_name,
    type: args.type,
    severity: args.severity,
    payload: {
      ...args.payload,
      ...(args.why_explanation ? { why_explanation: args.why_explanation } : {}),
    },
  };
  const { error } = await args.supabase.from('agency_events').insert(row);
  if (error) {
    console.error(
      `[run-agent:${args.agent_name}] agency_events insert failed: ${error.message}`,
    );
  }
}

async function emitAdapterError(
  supabase: SupabaseClient,
  client_id: string,
  agent_name: string,
  description: string,
  err: unknown,
): Promise<void> {
  await emitAgencyEvent({
    supabase,
    client_id,
    agent_name,
    type: 'adapter_error',
    severity: 'error',
    payload: {
      description,
      error:
        err instanceof Error
          ? { message: err.message, name: err.name }
          : { message: String(err) },
    },
    why_explanation: `${agent_name} hit an adapter error: ${description}`,
  });
}

async function safeEmitAdapterError(
  client_id: string,
  agent_name: string,
  description: string,
  err: unknown,
): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await emitAdapterError(supabase, client_id, agent_name, description, err);
  } catch (innerErr) {
    console.error(
      `[run-agent:${agent_name}] failed to emit adapter_error event: ${(innerErr as Error).message}`,
    );
  }
}

interface CostEventArgs {
  client_id: string;
  agent_name: string;
  model: string;
  cost_usd: number;
  tokens: { input: number; output: number };
  latency_ms: number;
}

async function safeEmitCostEvent(args: CostEventArgs): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await emitAgencyEvent({
      supabase,
      client_id: args.client_id,
      agent_name: args.agent_name,
      type: 'cost_incurred',
      severity: 'debug',
      payload: {
        model: args.model,
        cost_usd: args.cost_usd,
        tokens: args.tokens,
        latency_ms: args.latency_ms,
      },
    });
  } catch (err) {
    // Never let cost-event failures take down a real run.
    console.warn(
      `[callClaude:${args.agent_name}] cost_incurred event failed (non-fatal): ${
        (err as Error).message
      }`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//   Utilities
// ─────────────────────────────────────────────────────────────────────────────

function computeCostUsd(tier: ModelTier, input_tokens: number, output_tokens: number): number {
  const p = MODEL_PRICING[tier];
  const cost = (input_tokens * p.input_per_mtok + output_tokens * p.output_per_mtok) / 1_000_000;
  // Round to 6dp — matches numeric(10,4) in the schema with headroom.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; statusCode?: number; name?: string; message?: string };
  const status = e.status ?? e.statusCode;
  if (typeof status === 'number' && TRANSIENT_STATUS_CODES.has(status)) return true;
  // The SDK throws subclassed errors; key on name when available.
  if (e.name === 'APIConnectionError' || e.name === 'APIConnectionTimeoutError') return true;
  if (
    typeof e.message === 'string' &&
    /timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(e.message)
  ) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampConfidence(c: unknown): number {
  if (typeof c !== 'number' || Number.isNaN(c)) return 0;
  if (c < 0) return 0;
  if (c > 1) return 1;
  return c;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '"<unserializable>"';
  }
}

function summarizeWhy(
  agent_name: string,
  artifact_type: ArtifactType,
  output: CrossCuttingArtifactFields,
  confidence: number,
  iterations: number,
): string {
  const firstReason =
    Array.isArray(output.reasoning_trace) && output.reasoning_trace.length > 0
      ? String(output.reasoning_trace[0]).slice(0, 200)
      : '(no reasoning provided)';
  return `${agent_name} produced a ${artifact_type} (confidence ${confidence.toFixed(
    2,
  )}, ${iterations} iter${iterations === 1 ? '' : 's'}). ${firstReason}`;
}
