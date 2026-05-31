/**
 * emit-agency-event — typed event bus for agency + SaaS V2 surface telemetry.
 *
 * Writes to `aios_event_log` (preferred) with a fallback to `agency_events`
 * when the agency multi-tenant rows are present. Best-effort: emission failures
 * never throw — they log + return { ok: false } so callers can fire-and-forget.
 *
 * Each event has a Zod schema in EVENT_SCHEMAS. The payload is validated with
 * `.strict()` to catch typos and drift between callers and consumers.
 */

import { z } from 'zod';
import { getServiceSupabase } from './token-utils';

/* ------------------------------------------------------------------ */
/*  Event-type union                                                   */
/* ------------------------------------------------------------------ */

export type AgencyEventType =
  // Lifecycle / onboarding
  | 'workspace_created'
  | 'workspace_v2_toggled'
  | 'subscription_changed'
  // SaaS V2 dashboard surface
  | 'saas_v2_ask_ai_query'
  | 'saas_v2_narrative_rendered'
  | 'saas_v2_call_drawer_opened'
  | 'saas_v2_home_rendered'
  | 'saas_v2_calls_list_rendered';

/* ------------------------------------------------------------------ */
/*  Payload schemas                                                    */
/* ------------------------------------------------------------------ */

const workspaceCreatedSchema = z.object({
  workspace_id: z.string(),
  owner_id: z.string(),
}).strict();

const workspaceV2ToggledSchema = z.object({
  workspace_id: z.string(),
  enabled: z.boolean(),
}).strict();

const subscriptionChangedSchema = z.object({
  workspace_id: z.string(),
  old_plan: z.string().optional(),
  new_plan: z.string().optional(),
}).strict();

const saasV2AskAiQuerySchema = z.object({
  workspace_id: z.string(),
  question_chars: z.number().int().nonnegative(),
  tier: z.enum(['haiku', 'sonnet', 'opus']).optional(),
  sources_cited: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  cost_usd: z.number().nonnegative().optional(),
  conversation_id: z.string().optional(),
}).strict();

const saasV2NarrativeRenderedSchema = z.object({
  workspace_id: z.string(),
  page: z.enum(['home', 'calls', 'analytics', 'leads', 'qa', 'other']),
  narrative_chars: z.number().int().nonnegative(),
  tier: z.enum(['haiku', 'sonnet', 'opus']).optional(),
  cost_usd: z.number().nonnegative().optional(),
  cache_hit: z.boolean().optional(),
}).strict();

const saasV2CallDrawerOpenedSchema = z.object({
  workspace_id: z.string(),
  call_id: z.string(),
  has_transcript: z.boolean().optional(),
  has_qa_score: z.boolean().optional(),
}).strict();

const saasV2HomeRenderedSchema = z.object({
  workspace_id: z.string(),
  widgets_rendered: z.array(z.string()).max(20).optional(),
  load_ms: z.number().int().nonnegative().optional(),
}).strict();

const saasV2CallsListRenderedSchema = z.object({
  workspace_id: z.string(),
  rows_returned: z.number().int().nonnegative(),
  filters_applied: z.array(z.string()).max(10).optional(),
  load_ms: z.number().int().nonnegative().optional(),
}).strict();

export const EVENT_SCHEMAS = {
  workspace_created: workspaceCreatedSchema,
  workspace_v2_toggled: workspaceV2ToggledSchema,
  subscription_changed: subscriptionChangedSchema,
  // SaaS V2 dashboard surface
  saas_v2_ask_ai_query: saasV2AskAiQuerySchema,
  saas_v2_narrative_rendered: saasV2NarrativeRenderedSchema,
  saas_v2_call_drawer_opened: saasV2CallDrawerOpenedSchema,
  saas_v2_home_rendered: saasV2HomeRenderedSchema,
  saas_v2_calls_list_rendered: saasV2CallsListRenderedSchema,
} as const satisfies Record<AgencyEventType, z.ZodSchema>;

/* ------------------------------------------------------------------ */
/*  Client-visible field allowlists                                    */
/* ------------------------------------------------------------------ */

/**
 * For each event type, the payload field names that MAY surface in a
 * client-facing view. Empty array = internal-only telemetry, never shown
 * to the end customer.
 */
export const CLIENT_VISIBLE_FIELDS: Record<AgencyEventType, readonly string[]> = {
  workspace_created: [],
  workspace_v2_toggled: [],
  subscription_changed: [],
  // SaaS V2 internal telemetry — never client-facing
  saas_v2_ask_ai_query: [],
  saas_v2_narrative_rendered: [],
  saas_v2_call_drawer_opened: [],
  saas_v2_home_rendered: [],
  saas_v2_calls_list_rendered: [],
};

/**
 * Event types that may appear in any client-facing view at all.
 * V2 internal telemetry is deliberately NOT in this list.
 */
export const CLIENT_VISIBLE_TYPES: readonly AgencyEventType[] = [];

/* ------------------------------------------------------------------ */
/*  Emit                                                               */
/* ------------------------------------------------------------------ */

export type Severity = 'info' | 'warn' | 'error';

export interface EmitArgs<T extends AgencyEventType = AgencyEventType> {
  /** workspace_id (or legacy agency client_id) — kept as `client_id` for table compatibility */
  client_id: string;
  agent_name: string;
  type: T;
  severity?: Severity;
  payload: z.infer<typeof EVENT_SCHEMAS[T]>;
  why_explanation?: string;
}

export interface EmitResult {
  ok: boolean;
  error?: string;
}

export async function emitAgencyEvent<T extends AgencyEventType>(
  args: EmitArgs<T>,
): Promise<EmitResult> {
  const schema = EVENT_SCHEMAS[args.type] as z.ZodSchema | undefined;
  if (!schema) {
    console.warn(`[emit-agency-event] unknown event type "${args.type}" — dropping`);
    return { ok: false, error: 'unknown_event_type' };
  }

  const parsed = schema.safeParse(args.payload);
  if (!parsed.success) {
    console.warn(
      `[emit-agency-event] payload validation failed for "${args.type}":`,
      parsed.error.message,
    );
    return { ok: false, error: 'payload_invalid' };
  }

  try {
    const supabase = getServiceSupabase();
    const row = {
      client_id: args.client_id,
      agent_name: args.agent_name,
      type: args.type,
      severity: args.severity ?? 'info',
      payload: parsed.data,
      why_explanation: args.why_explanation ?? null,
      created_at: new Date().toISOString(),
    };

    // Preferred sink: aios_event_log (V2 + loops). Best-effort.
    const eventLog = await supabase.from('aios_event_log').insert({
      workspace_id: args.client_id,
      source: args.agent_name,
      event_type: args.type,
      severity: row.severity,
      payload: parsed.data,
      created_at: row.created_at,
    });

    if (eventLog.error) {
      // Fall back to legacy agency_events table when present.
      const legacy = await supabase.from('agency_events').insert(row);
      if (legacy.error) {
        console.warn(
          `[emit-agency-event] both sinks failed for "${args.type}":`,
          eventLog.error.message,
          legacy.error.message,
        );
        return { ok: false, error: legacy.error.message };
      }
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[emit-agency-event] emit threw for "${args.type}":`, message);
    return { ok: false, error: message };
  }
}
