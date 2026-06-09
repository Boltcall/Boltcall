/**
 * Retell Adapter — Agency OS Layer 4 driver
 *
 * One adapter per external system. Agency-OS agents call THIS module; this
 * module talks to Retell. Rules (from the Agency OS plan, §6 "Layer 4"):
 *   - Stateless. State lives in Supabase.
 *   - Idempotent where possible.
 *   - Emit `agency_events` on every call (info on success, error on failure).
 *   - Single retry with backoff for transient (5xx / 429) errors. No silent
 *     retries.
 *
 * Security: never return raw Retell API responses to the caller. Every export
 * returns a small whitelisted payload — full responses can leak internal IDs,
 * webhook URLs, model configuration, etc. (security concern #6 in the audit).
 *
 * Boltcall already has a server-side Retell wrapper at
 * `netlify/functions/retell-agents.ts`. We reuse the same `retell-sdk` client
 * here so the SDK version is consistent across the codebase. The shared
 * webhook-signature path stays in `_shared/verify-signatures.ts` — this
 * adapter does not handle inbound webhooks.
 *
 * Event emission: ALL events go through the canonical shared
 * `emitAgencyEvent` helper in `../emit-agency-event`. That helper enforces
 * per-type Zod schemas + writes to `public.agency_events` with the correct
 * column shape (`type`, `severity`, `payload`, `agent_name`, `created_at`).
 * Never call `supabase.from('agency_events').insert(...)` directly from this
 * file — the schema gate is the primary defense against payload-shape drift
 * and PII leakage into the event bus.
 */

import Retell from 'retell-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../token-utils';
import {
  emitAgencyEvent,
  type AgencyEventType,
  type AgencyEventSeverity,
} from '../emit-agency-event';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateAgentFromArtifactOpts {
  client_id: string;
  artifact_id?: string;
  agent_version?: string;
  vertical?: string;
  prompt: string;
  knowledge_base: unknown;
  voice_id: string;
  transfer_number?: string;
  language: string;
}

export interface CreateAgentResult {
  agent_id: string;
  llm_id: string;
}

export interface UpdateAgentPromptOpts {
  agent_id: string;
  prompt: string;
  client_id?: string;
  artifact_id?: string;
  parent_artifact_id?: string;
  reason?: string;
  source?: 'founder' | 'loop_monitor' | 'optimization_strategist' | 'post_ship_critic';
}

export interface UpdateAgentPromptResult {
  updated_at: string;
}

export interface RevertAgentPromptOpts {
  agent_id: string;
  previous_prompt: string;
  client_id?: string;
  artifact_id?: string;
  reverted_to_artifact_id?: string;
  reason?: string;
  triggered_by?: 'post_ship_critic' | 'delivery_monitor' | 'founder' | 'benchmark_regression';
}

export interface RevertAgentPromptResult {
  reverted_at: string;
}

export interface ProvisionPhoneNumberOpts {
  country: string;
  area_code?: string;
  agent_id: string;
  client_id?: string;
}

export interface ProvisionPhoneNumberResult {
  phone_number: string;
  retell_phone_id: string;
}

export interface GetCallTranscriptOpts {
  call_id: string;
  client_id?: string;
}

export interface GetCallTranscriptResult {
  transcript: string;
  duration_sec: number;
  outcome?: string;
  recording_url: string;
}

export interface ListRecentCallsOpts {
  agent_id: string;
  /** ISO-8601 timestamp string */
  since: string;
  limit?: number;
  client_id?: string;
}

export interface RecentCallSummary {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome?: string;
  transcript_excerpt: string;
}

export interface InjectInCallContextOpts {
  call_id: string;
  additional_context: string;
  client_id?: string;
}

export type InjectInCallContextResult =
  | { status: 'injected'; injected_at: string }
  | { status: 'queued_for_followup'; queued_at: string; reason: string };

// ─── Internal helpers ────────────────────────────────────────────────────────

const ADAPTER_NAME = 'retell-adapter';

function getRetellClient(): Retell {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error('RETELL_API_KEY not configured');
  }
  return new Retell({ apiKey });
}

function getSupabaseAdmin(): SupabaseClient | null {
  try {
    return getServiceSupabase();
  } catch {
    return null;
  }
}

/**
 * Strip any value that looks like a secret out of an error message so it can
 * be logged or stored without leaking the Retell API key. Belt-and-suspenders:
 * Retell's SDK shouldn't ever echo the key back, but defense-in-depth.
 */
function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let msg = raw;
  const apiKey = process.env.RETELL_API_KEY;
  if (apiKey && apiKey.length > 4 && msg.includes(apiKey)) {
    msg = msg.split(apiKey).join('[REDACTED_API_KEY]');
  }
  // Generic bearer-token / key=value scrubs
  msg = msg.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]');
  msg = msg.replace(
    /(api[_-]?key|secret|token)\s*[:=]\s*["']?[^"'\s,}]+/gi,
    '$1=[REDACTED]',
  );
  // Cap length so a giant SDK stack doesn't blow out the events table
  if (msg.length > 800) msg = msg.slice(0, 800) + '…';
  return msg;
}

/**
 * Best-effort wrapper around the shared `emitAgencyEvent` helper. The shared
 * helper throws on schema rejection / DB error — we swallow those here so
 * telemetry never causes an adapter call to fail. The shared helper logs the
 * rejection (without payload contents — PII safety) so failures stay visible.
 *
 * `client_id` is optional from the adapter's perspective: many Retell ops
 * (transcript fetch, list calls, phone provision retries) don't have a tenant
 * context. The kernel column is nullable so we pass null in those cases via a
 * cast — the shared helper's TS interface requires `string` for typed-caller
 * ergonomics, but the underlying column accepts null.
 */
async function emitEvent<T extends AgencyEventType>(args: {
  client_id?: string | null;
  type: T;
  severity: AgencyEventSeverity;
  payload: Record<string, unknown>;
  why_explanation?: string;
}): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: (args.client_id ?? null) as unknown as string,
      agent_name: ADAPTER_NAME,
      type: args.type,
      severity: args.severity,
      payload: args.payload,
      ...(args.why_explanation ? { why_explanation: args.why_explanation } : {}),
    });
  } catch (e) {
    console.warn(
      `[${ADAPTER_NAME}] emitAgencyEvent failed (non-blocking) type=${args.type}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * Treat HTTP 429 + every 5xx as transient. Network errors that bubble up
 * without a status code (DNS, socket reset) also retry once. Auth and
 * validation errors (4xx ≠ 429) fail fast — retrying won't fix them.
 */
function isTransient(err: unknown): boolean {
  const anyErr = err as { status?: number; code?: string };
  const status = anyErr?.status;
  if (typeof status === 'number') {
    return status === 429 || (status >= 500 && status < 600);
  }
  const code = anyErr?.code;
  if (code && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  return false;
}

/**
 * Run an SDK call with exactly one retry after a short backoff for transient
 * errors. Plan rule: "Single retry with backoff for transient errors. No
 * silent retries." — so the retry path emits an `adapter_error` warn event
 * (the shared kernel does not have a dedicated 'adapter_retry' type; we
 * surface the retry as a warn-severity adapter_error with retryable:true so
 * downstream alerting still sees it without inventing a new type).
 */
async function callWithRetry<T>(
  label: string,
  client_id: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransient(err)) throw err;
    await emitEvent({
      client_id,
      type: 'adapter_error',
      severity: 'warn',
      payload: {
        adapter: ADAPTER_NAME,
        operation: label,
        error_message: sanitizeErrorMessage(err),
        retryable: true,
        op: label,
      },
    });
    await new Promise((r) => setTimeout(r, 500));
    return fn();
  }
}

// ─── 1. createAgentFromArtifact ──────────────────────────────────────────────

/**
 * Creates a Retell LLM + Agent pair from a pre-built artifact (prompt + KB)
 * produced by the agent-architect. The knowledge_base argument is opaque to
 * the adapter — KB persistence is the architect's job; here we only need the
 * prompt and voice config to spin up Retell objects.
 *
 * Returns ONLY whitelisted identifiers. Raw Retell responses (containing
 * webhook URLs, internal config) are never bubbled up.
 */
export async function createAgentFromArtifact(
  opts: CreateAgentFromArtifactOpts,
): Promise<CreateAgentResult> {
  const client = getRetellClient();
  const baseUrl =
    process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

  // Knowledge base contents are inlined into the prompt by the architect
  // before the artifact is approved — the adapter just records that a KB
  // was supplied for traceability.
  const kbPresent = opts.knowledge_base != null;

  try {
    const llm = await callWithRetry('llm.create', opts.client_id, () =>
      client.llm.create({
        model: 'gpt-4o-mini',
        general_prompt: opts.prompt,
      } as Parameters<typeof client.llm.create>[0]),
    );

    const agent = await callWithRetry('agent.create', opts.client_id, () =>
      client.agent.create({
        agent_name: `agency-client-${opts.client_id}`,
        voice_id: opts.voice_id,
        language: opts.language,
        response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
        webhook_url: `${baseUrl}/.netlify/functions/retell-webhook`,
      } as Parameters<typeof client.agent.create>[0]),
    );

    // `agent_deployed` schema: artifact_id (required), retell_agent_id,
    // agent_version (required), vertical, benchmark_score, simulation_pass_rate.
    // Everything else (voice_id, language, kbPresent, transfer_number_set) is
    // provider-specific metadata — must be dropped to satisfy .strict().
    await emitEvent({
      client_id: opts.client_id,
      type: 'agent_deployed',
      severity: 'info',
      payload: {
        artifact_id: opts.artifact_id ?? `retell:${agent.agent_id}`,
        retell_agent_id: agent.agent_id,
        agent_version: opts.agent_version ?? '1',
        ...(opts.vertical ? { vertical: opts.vertical } : {}),
      },
    });

    // Whitelisted return — do not expose raw Retell response.
    void kbPresent; // retained for clarity; intentionally not emitted (not in schema)
    return { agent_id: agent.agent_id, llm_id: llm.llm_id };
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'createAgentFromArtifact',
        error_message: sanitizeErrorMessage(err),
        op: 'createAgentFromArtifact',
      },
    });
    throw new Error(`createAgentFromArtifact failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 2. updateAgentPrompt ────────────────────────────────────────────────────

/**
 * Updates the system prompt on the Retell LLM bound to `agent_id`. We look up
 * the LLM id via the agent so callers don't need to track both. Idempotent:
 * calling with the same prompt is safe (Retell no-ops if unchanged).
 */
export async function updateAgentPrompt(
  opts: UpdateAgentPromptOpts,
): Promise<UpdateAgentPromptResult> {
  const client = getRetellClient();
  try {
    const agent = await callWithRetry('agent.retrieve', opts.client_id ?? null, () =>
      client.agent.retrieve(opts.agent_id),
    );
    const llmId = (agent as { response_engine?: { llm_id?: string } })
      .response_engine?.llm_id;
    if (!llmId) {
      throw new Error(
        `Agent ${opts.agent_id} has no retell-llm response_engine; prompt updates require a Retell-managed LLM`,
      );
    }

    await callWithRetry('llm.update', opts.client_id ?? null, () =>
      client.llm.update(llmId, {
        general_prompt: opts.prompt,
      } as Parameters<typeof client.llm.update>[1]),
    );

    const updated_at = new Date().toISOString();
    // `prompt_revised` schema: artifact_id (required), parent_artifact_id,
    // retell_agent_id, reason (required), benchmark_delta, source.
    // agent_id (Retell id) maps to retell_agent_id; prompt_length / updated_at
    // are not in the schema and would fail .strict().
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'prompt_revised',
      severity: 'info',
      payload: {
        artifact_id: opts.artifact_id ?? `retell-llm:${llmId}`,
        ...(opts.parent_artifact_id ? { parent_artifact_id: opts.parent_artifact_id } : {}),
        retell_agent_id: opts.agent_id,
        reason: opts.reason ?? 'prompt updated via adapter',
        ...(opts.source ? { source: opts.source } : {}),
      },
    });
    return { updated_at };
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'updateAgentPrompt',
        error_message: sanitizeErrorMessage(err),
        op: 'updateAgentPrompt',
        external_id: opts.agent_id,
      },
    });
    throw new Error(`updateAgentPrompt failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 3. revertAgentPrompt ────────────────────────────────────────────────────

/**
 * Restores a known-good previous prompt. Used by the post-ship critic loop
 * when a freshly deployed prompt regresses on live calls. Implementation-wise
 * this is just `updateAgentPrompt` with a different intent — but separating
 * the function lets us emit a distinct event type so the loop-monitor and
 * dashboards can count reverts independently of normal edits.
 */
export async function revertAgentPrompt(
  opts: RevertAgentPromptOpts,
): Promise<RevertAgentPromptResult> {
  try {
    const result = await updateAgentPrompt({
      agent_id: opts.agent_id,
      prompt: opts.previous_prompt,
      client_id: opts.client_id,
      // Don't double-emit prompt_revised for a revert — but updateAgentPrompt
      // will emit one. That's acceptable: the revert is also a revision; the
      // distinct prompt_reverted event below carries the revert-specific
      // semantics for dashboards that filter on it.
      reason: opts.reason ?? 'revert to previous prompt',
    });
    const reverted_at = result.updated_at;
    // `prompt_reverted` schema: artifact_id (required), reverted_to_artifact_id
    // (required), retell_agent_id, reason (required), triggered_by.
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'prompt_reverted',
      severity: 'warn',
      payload: {
        artifact_id: opts.artifact_id ?? `retell-revert:${opts.agent_id}:${reverted_at}`,
        reverted_to_artifact_id: opts.reverted_to_artifact_id ?? `retell-prompt:${opts.agent_id}:previous`,
        retell_agent_id: opts.agent_id,
        reason: opts.reason ?? 'revert to previous prompt',
        ...(opts.triggered_by ? { triggered_by: opts.triggered_by } : {}),
      },
    });
    return { reverted_at };
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'revertAgentPrompt',
        error_message: sanitizeErrorMessage(err),
        op: 'revertAgentPrompt',
        external_id: opts.agent_id,
      },
    });
    throw new Error(`revertAgentPrompt failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 4. provisionPhoneNumber ─────────────────────────────────────────────────

/**
 * Buys a new Retell-managed phone number and binds it to `agent_id` as the
 * inbound agent. Retell currently only supports US/CA via the create API —
 * unsupported countries fail fast with a sanitized error rather than silently
 * defaulting.
 *
 * NOTE: the kernel does not have a dedicated `phone_provisioned` event type.
 * We surface phone provisioning as a `cost_incurred` event (provider=retell,
 * amount_usd=0 since the phone-number-create endpoint is billed asynchronously
 * by Retell and not echoed in the response) to keep all telemetry on the
 * schema-validated path. Adding a dedicated type would require expanding the
 * AgencyEventType union in emit-agency-event.ts.
 */
export async function provisionPhoneNumber(
  opts: ProvisionPhoneNumberOpts,
): Promise<ProvisionPhoneNumberResult> {
  const client = getRetellClient();
  const country = (opts.country || 'US').toUpperCase();
  if (country !== 'US' && country !== 'CA') {
    const msg = `provisionPhoneNumber: unsupported country '${country}' (Retell supports US, CA)`;
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'provisionPhoneNumber',
        error_message: msg,
        op: 'provisionPhoneNumber',
      },
    });
    throw new Error(msg);
  }

  const params: {
    country_code: 'US' | 'CA';
    inbound_agent_id: string;
    area_code?: number;
  } = {
    country_code: country,
    inbound_agent_id: opts.agent_id,
  };
  if (opts.area_code) {
    const parsed = Number.parseInt(opts.area_code, 10);
    if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 999) {
      params.area_code = parsed;
    }
  }

  try {
    const phone = await callWithRetry('phoneNumber.create', opts.client_id ?? null, () =>
      client.phoneNumber.create(params),
    );
    // `cost_incurred` schema: category (required), provider (required),
    // amount_usd (required), plus optional model/op/source/etc. Use it as a
    // structured telemetry channel for phone provisioning — country/agent_id
    // are passed via op/source which are allowlisted.
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'cost_incurred',
      severity: 'info',
      payload: {
        category: 'phone_number_provision',
        provider: 'retell',
        amount_usd: 0,
        op: 'provisionPhoneNumber',
        source: `country=${country}`,
      },
    });
    // E.164 number is also the Retell-side identifier for the resource.
    return {
      phone_number: phone.phone_number,
      retell_phone_id: phone.phone_number,
    };
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'provisionPhoneNumber',
        error_message: sanitizeErrorMessage(err),
        op: 'provisionPhoneNumber',
        external_id: opts.agent_id,
      },
    });
    throw new Error(`provisionPhoneNumber failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 5. getCallTranscript ────────────────────────────────────────────────────

/**
 * Flatten Retell's transcript shape into a single string. Retell may return
 * either `transcript` (string), `transcript_object` (array of role/content
 * turns), or both. Callers downstream (intake-officer, qa-auditor) expect a
 * plain text blob.
 */
function flattenTranscript(call: {
  transcript?: string;
  transcript_object?: Array<{
    role?: string;
    content?: string;
    words?: Array<{ word?: string }>;
  }>;
  call_analysis?: { call_summary?: string };
}): string {
  if (Array.isArray(call.transcript_object) && call.transcript_object.length) {
    return call.transcript_object
      .map((turn) => {
        const role = turn.role || 'unknown';
        const content =
          turn.content ||
          turn.words?.map((w) => w.word ?? '').join(' ') ||
          '';
        return `${role}: ${content}`.trim();
      })
      .join('\n');
  }
  if (typeof call.transcript === 'string') return call.transcript;
  return call.call_analysis?.call_summary || '';
}

export async function getCallTranscript(
  opts: GetCallTranscriptOpts,
): Promise<GetCallTranscriptResult> {
  const client = getRetellClient();
  try {
    const call = await callWithRetry('call.retrieve', opts.client_id ?? null, () =>
      client.call.retrieve(opts.call_id),
    );
    const c = call as {
      transcript?: string;
      transcript_object?: Array<{
        role?: string;
        content?: string;
        words?: Array<{ word?: string }>;
      }>;
      duration_ms?: number;
      recording_url?: string;
      disconnection_reason?: string;
      call_analysis?: { call_summary?: string; call_successful?: boolean };
    };

    const transcript = flattenTranscript(c);
    const duration_sec = Math.round((c.duration_ms ?? 0) / 1000);
    // Outcome prefers the LLM-derived analysis flag; falls back to the
    // disconnect reason (e.g. 'voicemail_reached', 'user_hangup').
    let outcome: string | undefined;
    if (typeof c.call_analysis?.call_successful === 'boolean') {
      outcome = c.call_analysis.call_successful ? 'successful' : 'unsuccessful';
    } else if (c.disconnection_reason) {
      outcome = c.disconnection_reason;
    }

    // `call_completed` schema: call_id (required), direction (required),
    // duration_seconds (required), outcome (enum), qa_score, ended_reason.
    // Map our free-form outcome string into the enum where possible; fall
    // back to 'other'. transcript_length is not in the schema and is dropped.
    const enumOutcome: 'booked' | 'qualified' | 'not_qualified' | 'voicemail' | 'hangup' | 'transferred' | 'other' = (() => {
      const o = (outcome ?? '').toLowerCase();
      if (o.includes('book')) return 'booked';
      if (o.includes('voicemail')) return 'voicemail';
      if (o.includes('hangup') || o === 'user_hangup' || o === 'agent_hangup') return 'hangup';
      if (o.includes('transfer')) return 'transferred';
      if (o === 'successful') return 'qualified';
      if (o === 'unsuccessful') return 'not_qualified';
      return 'other';
    })();
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'call_completed',
      severity: 'info',
      payload: {
        call_id: opts.call_id,
        direction: 'inbound',
        duration_seconds: duration_sec,
        outcome: enumOutcome,
        ...(c.disconnection_reason ? { ended_reason: c.disconnection_reason } : {}),
      },
    });

    // Whitelisted shape — no raw call object, no internal IDs beyond what
    // the caller already has.
    return {
      transcript,
      duration_sec,
      outcome,
      recording_url: c.recording_url ?? '',
    };
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'getCallTranscript',
        error_message: sanitizeErrorMessage(err),
        op: 'getCallTranscript',
        external_id: opts.call_id,
      },
    });
    throw new Error(`getCallTranscript failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 6. listRecentCalls ──────────────────────────────────────────────────────

export async function listRecentCalls(
  opts: ListRecentCallsOpts,
): Promise<RecentCallSummary[]> {
  const client = getRetellClient();
  const sinceMs = Date.parse(opts.since);
  if (!Number.isFinite(sinceMs)) {
    throw new Error(
      `listRecentCalls: 'since' must be a valid ISO-8601 timestamp (got: ${opts.since})`,
    );
  }
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 1000);

  try {
    const calls = await callWithRetry('call.list', opts.client_id ?? null, () =>
      client.call.list({
        filter_criteria: {
          agent_id: [opts.agent_id],
          start_timestamp: { lower_threshold: sinceMs },
        },
        limit,
        sort_order: 'descending',
      } as Parameters<typeof client.call.list>[0]),
    );

    const summaries: RecentCallSummary[] = (calls as Array<{
      call_id: string;
      start_timestamp?: number;
      duration_ms?: number;
      disconnection_reason?: string;
      transcript?: string;
      transcript_object?: Array<{
        role?: string;
        content?: string;
        words?: Array<{ word?: string }>;
      }>;
      call_analysis?: { call_summary?: string; call_successful?: boolean };
    }>).map((c) => {
      const transcript = flattenTranscript(c);
      const excerpt =
        transcript.length > 280 ? transcript.slice(0, 277) + '…' : transcript;
      let outcome: string | undefined;
      if (typeof c.call_analysis?.call_successful === 'boolean') {
        outcome = c.call_analysis.call_successful ? 'successful' : 'unsuccessful';
      } else if (c.disconnection_reason) {
        outcome = c.disconnection_reason;
      }
      return {
        call_id: c.call_id,
        started_at: c.start_timestamp
          ? new Date(c.start_timestamp).toISOString()
          : '',
        duration_sec: Math.round((c.duration_ms ?? 0) / 1000),
        outcome,
        transcript_excerpt: excerpt,
      };
    });

    // The kernel has no dedicated 'calls_listed' event type. We surface a
    // single info-severity cost_incurred row to keep this on the
    // schema-validated path — amount_usd=0 because list calls are not
    // priced. The `k` field carries how many were returned.
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'cost_incurred',
      severity: 'info',
      payload: {
        category: 'retell_list_calls',
        provider: 'retell',
        amount_usd: 0,
        op: 'listRecentCalls',
        k: summaries.length,
        source: `agent_id=${opts.agent_id}`,
      },
    });
    return summaries;
  } catch (err) {
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'listRecentCalls',
        error_message: sanitizeErrorMessage(err),
        op: 'listRecentCalls',
        external_id: opts.agent_id,
      },
    });
    throw new Error(`listRecentCalls failed: ${sanitizeErrorMessage(err)}`);
  }
}

// ─── 7. injectInCallContext ──────────────────────────────────────────────────

/**
 * For the intake-officer's completeness sentinel (audit ai-native upgrade
 * #1): if the agent realizes mid-call that a required field is missing, push
 * a hint into the LLM context so the next turn asks about it.
 *
 * Retell's public SDK does not expose a live "addMessage" / mid-call prompt
 * patch as of writing — so this function attempts a best-effort REST POST to
 * the documented `/v2/inject-call-context` endpoint and, if that 404s or the
 * SDK lacks the method, falls back to queueing the question into
 * `agency_followup_questions` for the next outbound call. The fallback emits
 * a `warn` event so the loop-monitor can track how often live injection is
 * unavailable.
 *
 * The kernel has no dedicated `in_call_context_injected` / `_queued` event
 * types. Both paths surface as cost_incurred (amount_usd=0) with a distinct
 * category so dashboards can still slice on them; the queued path uses
 * severity=warn so monitoring picks it up.
 */
export async function injectInCallContext(
  opts: InjectInCallContextOpts,
): Promise<InjectInCallContextResult> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error('RETELL_API_KEY not configured');
  }

  try {
    const res = await fetch(
      `https://api.retellai.com/v2/inject-call-context/${encodeURIComponent(opts.call_id)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ additional_context: opts.additional_context }),
      },
    );

    if (res.ok) {
      const injected_at = new Date().toISOString();
      await emitEvent({
        client_id: opts.client_id ?? null,
        type: 'cost_incurred',
        severity: 'info',
        payload: {
          category: 'retell_inject_context',
          provider: 'retell',
          amount_usd: 0,
          op: 'injectInCallContext',
          source: 'injected',
        },
      });
      return { status: 'injected', injected_at };
    }

    // Endpoint missing / not enabled → fall back to follow-up queue.
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      return await queueFollowupQuestion(
        opts,
        `retell_inject_unsupported_${res.status}`,
      );
    }

    // Some other error — sanitize and throw so the caller knows.
    const bodyText = await res.text().catch(() => '');
    throw new Error(
      `inject-call-context HTTP ${res.status}: ${sanitizeErrorMessage(bodyText)}`,
    );
  } catch (err) {
    // Network errors fall back to the follow-up queue too — the call is
    // already in progress, so failing to inject shouldn't abort the agent.
    if (err instanceof TypeError) {
      return await queueFollowupQuestion(opts, 'network_error');
    }
    await emitEvent({
      client_id: opts.client_id ?? null,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: ADAPTER_NAME,
        operation: 'injectInCallContext',
        error_message: sanitizeErrorMessage(err),
        op: 'injectInCallContext',
        external_id: opts.call_id,
      },
    });
    throw new Error(`injectInCallContext failed: ${sanitizeErrorMessage(err)}`);
  }
}

async function queueFollowupQuestion(
  opts: InjectInCallContextOpts,
  reason: string,
): Promise<InjectInCallContextResult> {
  const queued_at = new Date().toISOString();
  const sb = getSupabaseAdmin();
  if (sb) {
    // Best-effort — if the table doesn't exist yet, swallow the error; the
    // warn event below is the source of truth either way. Note: this is
    // `agency_followup_questions`, NOT `agency_events`, so it remains a
    // direct insert.
    await sb
      .from('agency_followup_questions')
      .insert({
        call_id: opts.call_id,
        question: opts.additional_context,
        reason,
        status: 'pending',
        queued_at,
      })
      .then(({ error }) => {
        if (error) {
          console.warn(
            `[${ADAPTER_NAME}] agency_followup_questions insert failed:`,
            error.message,
          );
        }
      });
  }
  await emitEvent({
    client_id: opts.client_id ?? null,
    type: 'cost_incurred',
    severity: 'warn',
    payload: {
      category: 'retell_inject_context_queued',
      provider: 'retell',
      amount_usd: 0,
      op: 'queueFollowupQuestion',
      source: `reason=${reason};call_id=${opts.call_id}`,
    },
  });
  return { status: 'queued_for_followup', queued_at, reason };
}
