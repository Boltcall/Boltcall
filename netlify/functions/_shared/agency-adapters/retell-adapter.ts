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
 */

import Retell from 'retell-sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateAgentFromArtifactOpts {
  client_id: string;
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
}

export interface UpdateAgentPromptResult {
  updated_at: string;
}

export interface RevertAgentPromptOpts {
  agent_id: string;
  previous_prompt: string;
}

export interface RevertAgentPromptResult {
  reverted_at: string;
}

export interface ProvisionPhoneNumberOpts {
  country: string;
  area_code?: string;
  agent_id: string;
}

export interface ProvisionPhoneNumberResult {
  phone_number: string;
  retell_phone_id: string;
}

export interface GetCallTranscriptOpts {
  call_id: string;
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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
 * Best-effort write to `agency_events`. Never throws — event logging must not
 * cause an adapter call to fail. If Supabase isn't configured we fall back to
 * a structured console log so local dev still gets observability.
 */
async function emitAgencyEvent(args: {
  client_id?: string | null;
  type: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  payload?: Record<string, unknown>;
}): Promise<void> {
  const row = {
    client_id: args.client_id ?? null,
    agent_name: ADAPTER_NAME,
    type: args.type,
    severity: args.severity,
    payload: args.payload ?? {},
  };
  try {
    const sb = getSupabaseAdmin();
    if (!sb) {
      console.log(`[${ADAPTER_NAME}] event`, row);
      return;
    }
    const { error } = await sb.from('agency_events').insert(row);
    if (error) {
      console.warn(`[${ADAPTER_NAME}] agency_events insert failed:`, error.message);
    }
  } catch (e) {
    console.warn(
      `[${ADAPTER_NAME}] emitAgencyEvent threw (non-blocking):`,
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
 * silent retries." — so the retry path emits a `warn` event.
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
    await emitAgencyEvent({
      client_id,
      type: 'adapter_retry',
      severity: 'warn',
      payload: { op: label, error: sanitizeErrorMessage(err) },
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
  const kbHash =
    opts.knowledge_base != null
      ? `present:${JSON.stringify(opts.knowledge_base).length}b`
      : 'none';

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

    await emitAgencyEvent({
      client_id: opts.client_id,
      type: 'agent_deployed',
      severity: 'info',
      payload: {
        agent_id: agent.agent_id,
        llm_id: llm.llm_id,
        voice_id: opts.voice_id,
        language: opts.language,
        kb: kbHash,
        transfer_number_set: !!opts.transfer_number,
      },
    });

    // Whitelisted return — do not expose raw Retell response.
    return { agent_id: agent.agent_id, llm_id: llm.llm_id };
  } catch (err) {
    await emitAgencyEvent({
      client_id: opts.client_id,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'createAgentFromArtifact',
        error: sanitizeErrorMessage(err),
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
    const agent = await callWithRetry('agent.retrieve', null, () =>
      client.agent.retrieve(opts.agent_id),
    );
    const llmId = (agent as { response_engine?: { llm_id?: string } })
      .response_engine?.llm_id;
    if (!llmId) {
      throw new Error(
        `Agent ${opts.agent_id} has no retell-llm response_engine; prompt updates require a Retell-managed LLM`,
      );
    }

    await callWithRetry('llm.update', null, () =>
      client.llm.update(llmId, {
        general_prompt: opts.prompt,
      } as Parameters<typeof client.llm.update>[1]),
    );

    const updated_at = new Date().toISOString();
    await emitAgencyEvent({
      type: 'prompt_updated',
      severity: 'info',
      payload: {
        agent_id: opts.agent_id,
        llm_id: llmId,
        prompt_length: opts.prompt.length,
        updated_at,
      },
    });
    return { updated_at };
  } catch (err) {
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'updateAgentPrompt',
        agent_id: opts.agent_id,
        error: sanitizeErrorMessage(err),
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
    });
    const reverted_at = result.updated_at;
    await emitAgencyEvent({
      type: 'prompt_reverted',
      severity: 'warn',
      payload: {
        agent_id: opts.agent_id,
        prompt_length: opts.previous_prompt.length,
        reverted_at,
      },
    });
    return { reverted_at };
  } catch (err) {
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'revertAgentPrompt',
        agent_id: opts.agent_id,
        error: sanitizeErrorMessage(err),
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
 */
export async function provisionPhoneNumber(
  opts: ProvisionPhoneNumberOpts,
): Promise<ProvisionPhoneNumberResult> {
  const client = getRetellClient();
  const country = (opts.country || 'US').toUpperCase();
  if (country !== 'US' && country !== 'CA') {
    const msg = `provisionPhoneNumber: unsupported country '${country}' (Retell supports US, CA)`;
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: { op: 'provisionPhoneNumber', error: msg },
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
    const phone = await callWithRetry('phoneNumber.create', null, () =>
      client.phoneNumber.create(params),
    );
    await emitAgencyEvent({
      type: 'phone_provisioned',
      severity: 'info',
      payload: {
        agent_id: opts.agent_id,
        country,
        area_code: params.area_code ?? null,
        phone_number: phone.phone_number,
      },
    });
    // E.164 number is also the Retell-side identifier for the resource.
    return {
      phone_number: phone.phone_number,
      retell_phone_id: phone.phone_number,
    };
  } catch (err) {
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'provisionPhoneNumber',
        agent_id: opts.agent_id,
        country,
        error: sanitizeErrorMessage(err),
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
    const call = await callWithRetry('call.retrieve', null, () =>
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

    await emitAgencyEvent({
      type: 'transcript_fetched',
      severity: 'info',
      payload: {
        call_id: opts.call_id,
        duration_sec,
        outcome: outcome ?? null,
        transcript_length: transcript.length,
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
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'getCallTranscript',
        call_id: opts.call_id,
        error: sanitizeErrorMessage(err),
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
    const calls = await callWithRetry('call.list', null, () =>
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

    await emitAgencyEvent({
      type: 'calls_listed',
      severity: 'info',
      payload: {
        agent_id: opts.agent_id,
        since: opts.since,
        returned: summaries.length,
      },
    });
    return summaries;
  } catch (err) {
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'listRecentCalls',
        agent_id: opts.agent_id,
        error: sanitizeErrorMessage(err),
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
      await emitAgencyEvent({
        type: 'in_call_context_injected',
        severity: 'info',
        payload: {
          call_id: opts.call_id,
          context_length: opts.additional_context.length,
          injected_at,
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
    await emitAgencyEvent({
      type: 'adapter_error',
      severity: 'error',
      payload: {
        op: 'injectInCallContext',
        call_id: opts.call_id,
        error: sanitizeErrorMessage(err),
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
    // warn event below is the source of truth either way.
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
  await emitAgencyEvent({
    type: 'in_call_context_queued',
    severity: 'warn',
    payload: {
      call_id: opts.call_id,
      reason,
      context_length: opts.additional_context.length,
      queued_at,
    },
  });
  return { status: 'queued_for_followup', queued_at, reason };
}
