/**
 * SaaS V2 event emitter — workspace-scoped, NOT client-scoped.
 *
 * Why this exists:
 *   The legacy `emit-agency-event.ts` requires a `client_id` (FK to
 *   `agency_clients.id`). SaaS V2 self-serve users do NOT have agency_clients
 *   rows — they're owners of `workspaces`, not managed by an agency. Wiring
 *   their telemetry through emit-agency-event would either silently drop the
 *   event (today's behavior in saas-v2-toggle.ts) or pollute agency_events
 *   with rows that have no client.
 *
 *   So we write SaaS V2 telemetry STRAIGHT to `aios_event_log` with
 *   `source: 'saas_v2'`. The AIOS dashboard's cross-system firehose already
 *   reads from this table, so observability is unchanged; we just skip the
 *   client-scoped agency_events row.
 *
 * Per-type payload schemas use Zod `.strict()` — exactly the same pattern as
 * emit-agency-event so unknown keys fail loud rather than silently leaking
 * data into the firehose.
 *
 * This helper NEVER throws. It logs and returns. The primary write the caller
 * is doing (e.g. listing leads) must not be blocked by telemetry.
 */

import { z } from 'zod';
import { getServiceSupabase } from './token-utils';

// ── Event types ─────────────────────────────────────────────────────────────

export type SaasV2EventType =
  | 'saas_v2_leads_list_rendered'
  | 'saas_v2_messages_list_rendered'
  | 'saas_v2_agent_stress_test_run'
  | 'saas_v2_knowledge_gap_detected'
  | 'saas_v2_lead_drawer_opened'
  | 'saas_v2_message_reply_drafted'
  | 'saas_v2_agent_summary_rendered'
  | 'saas_v2_kb_draft_accepted';

export type SaasV2EventSeverity = 'debug' | 'info' | 'warn' | 'error';

// ── Per-type payload schemas ────────────────────────────────────────────────

const leadsListRenderedSchema = z
  .object({
    workspace_id: z.string(),
    count: z.number().int().nonnegative(),
    has_hot_lead: z.boolean().optional(),
    filter_applied: z.boolean().optional(),
    latency_ms: z.number().optional(),
  })
  .strict();

const messagesListRenderedSchema = z
  .object({
    workspace_id: z.string(),
    count: z.number().int().nonnegative(),
    channel_breakdown: z.record(z.string(), z.number()).optional(),
  })
  .strict();

const agentStressTestRunSchema = z
  .object({
    workspace_id: z.string(),
    scenario_id: z.enum([
      'price_shopper',
      'emergency',
      'hostile_caller',
      'comparison_shopper',
      'non_english',
      'low_info',
    ]),
    qa_score: z.number().min(0).max(10),
    outcome: z.string(),
    duration_min: z.number().nonnegative().optional(),
  })
  .strict();

const knowledgeGapDetectedSchema = z
  .object({
    workspace_id: z.string(),
    query_text: z.string().max(200),
    top_score: z.number(),
    source: z.enum(['kb_search', 'ai_extract', 'conversation']),
  })
  .strict();

const leadDrawerOpenedSchema = z
  .object({
    workspace_id: z.string(),
    lead_id: z.string(),
  })
  .strict();

const messageReplyDraftedSchema = z
  .object({
    workspace_id: z.string(),
    thread_id: z.string(),
    channel: z.enum(['sms', 'email', 'chat']),
    tier: z.enum(['haiku', 'sonnet', 'opus']),
  })
  .strict();

const agentSummaryRenderedSchema = z
  .object({
    workspace_id: z.string(),
    agent_id: z.string(),
    narrative_confidence: z.number().min(0).max(1),
  })
  .strict();

const kbDraftAcceptedSchema = z
  .object({
    workspace_id: z.string(),
    kb_folder_id: z.string(),
    doc_count: z.number().int().nonnegative(),
    source: z.enum(['scrape', 'upload', 'ai_extract']),
  })
  .strict();

const SAAS_V2_EVENT_SCHEMAS = {
  saas_v2_leads_list_rendered: leadsListRenderedSchema,
  saas_v2_messages_list_rendered: messagesListRenderedSchema,
  saas_v2_agent_stress_test_run: agentStressTestRunSchema,
  saas_v2_knowledge_gap_detected: knowledgeGapDetectedSchema,
  saas_v2_lead_drawer_opened: leadDrawerOpenedSchema,
  saas_v2_message_reply_drafted: messageReplyDraftedSchema,
  saas_v2_agent_summary_rendered: agentSummaryRenderedSchema,
  saas_v2_kb_draft_accepted: kbDraftAcceptedSchema,
} as const satisfies Record<SaasV2EventType, z.ZodTypeAny>;

// ── Public API ──────────────────────────────────────────────────────────────

export interface EmitSaasV2EventInput<T extends SaasV2EventType = SaasV2EventType> {
  workspace_id: string;
  type: T;
  payload: Record<string, unknown>;
  severity?: SaasV2EventSeverity;
}

/**
 * Validate and emit a SaaS V2 event to aios_event_log. NEVER throws — if the
 * payload is invalid we log a sanitized warning (no payload contents — could
 * be PII) and return. The caller's primary operation has already succeeded
 * and must not be blocked.
 */
export async function emitSaasV2Event<T extends SaasV2EventType>(
  input: EmitSaasV2EventInput<T>,
): Promise<void> {
  const schema = SAAS_V2_EVENT_SCHEMAS[input.type];
  if (!schema) {
    console.warn(`[emit-saas-v2-event] unknown type=${input.type} workspace=${input.workspace_id}`);
    return;
  }
  const parsed = schema.safeParse(input.payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message,
    }));
    // Log issue codes, never payload values — PII risk.
    console.warn(
      `[emit-saas-v2-event] schema rejection type=${input.type} workspace=${input.workspace_id} ` +
        `issues=${JSON.stringify(issues)}`,
    );
    return;
  }

  try {
    const supa = getServiceSupabase();
    const { error } = await supa.from('aios_event_log').insert({
      source: 'saas_v2',
      event_type: input.type,
      severity: input.severity ?? 'info',
      payload: { ...parsed.data, workspace_id: input.workspace_id },
    });
    if (error) {
      console.warn(
        `[emit-saas-v2-event] insert failed type=${input.type} workspace=${input.workspace_id} ` +
          `err=${error.message}`,
      );
    }
  } catch (err) {
    console.warn(
      `[emit-saas-v2-event] insert threw type=${input.type} workspace=${input.workspace_id} ` +
        `err=${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
