/**
 * emit-agency-event.ts — V2 SaaS dashboard event surface (subset).
 *
 * NOTE FOR MERGE: This worktree (v2-calls) introduces the V2 SaaS event
 * surface. Pages 1 and 2 (v2-home and v2-messages worktrees) are expected
 * to extend the AgencyEventType union and EVENT_SCHEMAS map with their own
 * variants. The merge agent should union the additions from all three
 * worktrees — do NOT replace this file wholesale, merge field-by-field.
 *
 * What v2-calls adds:
 *   AgencyEventType union literals:
 *     'saas_v2_ask_ai_query'
 *     'saas_v2_narrative_rendered'
 *     'saas_v2_call_drawer_opened'
 *     'saas_v2_home_rendered'
 *     'saas_v2_calls_list_rendered'
 *
 *   Zod schemas + EVENT_SCHEMAS entries for each of those five.
 *   CLIENT_VISIBLE_FIELDS entries are empty arrays — V2 events are internal
 *   SaaS telemetry only, never client-facing.
 *
 * Event lifecycle:
 *   1. Validate payload against the schema for `type`. Drop on failure (log only).
 *   2. Insert into `agency_events` table with service-role supabase.
 *   3. Best-effort fire-and-forget — callers never await rejection.
 */

import { z } from 'zod';
import { getServiceSupabase } from './token-utils';

// ── Event type union (V2 subset — extend in merge with v2-home + v2-messages) ──
export type AgencyEventType =
  // SaaS V2 dashboard surface
  | 'saas_v2_ask_ai_query'
  | 'saas_v2_narrative_rendered'
  | 'saas_v2_call_drawer_opened'
  | 'saas_v2_home_rendered'
  | 'saas_v2_calls_list_rendered';

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

// ── Schemas ────────────────────────────────────────────────────────────
const saasV2AskAiQuerySchema = z
  .object({
    workspace_id: z.string(),
    question_chars: z.number().int().nonnegative(),
    tier: z.enum(['haiku', 'sonnet', 'opus']).optional(),
    sources_cited: z.number().int().nonnegative().optional(),
    confidence: z.number().min(0).max(1).optional(),
    cost_usd: z.number().nonnegative().optional(),
    conversation_id: z.string().optional(),
  })
  .strict();

const saasV2NarrativeRenderedSchema = z
  .object({
    workspace_id: z.string(),
    page: z.enum(['home', 'calls', 'analytics', 'leads', 'qa', 'other']),
    narrative_chars: z.number().int().nonnegative(),
    tier: z.enum(['haiku', 'sonnet', 'opus']).optional(),
    cost_usd: z.number().nonnegative().optional(),
    cache_hit: z.boolean().optional(),
  })
  .strict();

const saasV2CallDrawerOpenedSchema = z
  .object({
    workspace_id: z.string(),
    call_id: z.string(),
    has_transcript: z.boolean().optional(),
    has_qa_score: z.boolean().optional(),
  })
  .strict();

const saasV2HomeRenderedSchema = z
  .object({
    workspace_id: z.string(),
    widgets_rendered: z.array(z.string()).max(20).optional(),
    load_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

const saasV2CallsListRenderedSchema = z
  .object({
    workspace_id: z.string(),
    rows_returned: z.number().int().nonnegative(),
    filters_applied: z.array(z.string()).max(10).optional(),
    load_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export const EVENT_SCHEMAS = {
  // SaaS V2 dashboard surface
  saas_v2_ask_ai_query: saasV2AskAiQuerySchema,
  saas_v2_narrative_rendered: saasV2NarrativeRenderedSchema,
  saas_v2_call_drawer_opened: saasV2CallDrawerOpenedSchema,
  saas_v2_home_rendered: saasV2HomeRenderedSchema,
  saas_v2_calls_list_rendered: saasV2CallsListRenderedSchema,
} as const satisfies Record<AgencyEventType, z.ZodTypeAny>;

// ── Client-visible field allowlist (empty for V2 — internal telemetry only) ──
export const CLIENT_VISIBLE_FIELDS: Record<AgencyEventType, string[]> = {
  saas_v2_ask_ai_query: [],
  saas_v2_narrative_rendered: [],
  saas_v2_call_drawer_opened: [],
  saas_v2_home_rendered: [],
  saas_v2_calls_list_rendered: [],
};

// Types we expose to client-facing views. V2 telemetry is excluded by design.
export const CLIENT_VISIBLE_TYPES: AgencyEventType[] = [];

// ── Public API ──────────────────────────────────────────────────────────
export interface EmitAgencyEventInput<T extends AgencyEventType = AgencyEventType> {
  client_id: string; // workspace_id for V2 events (column name kept for compat)
  agent_name: string;
  type: T;
  severity: EventSeverity;
  payload: Record<string, unknown>;
  why_explanation?: string;
}

/**
 * Validate + insert an event. Never throws — failures are logged and dropped
 * so caller code paths stay non-blocking.
 */
export async function emitAgencyEvent(input: EmitAgencyEventInput): Promise<void> {
  const schema = EVENT_SCHEMAS[input.type];
  if (!schema) {
    console.warn('[emit-agency-event] unknown event type, dropping', input.type);
    return;
  }

  const parsed = schema.safeParse(input.payload);
  if (!parsed.success) {
    console.warn(
      '[emit-agency-event] payload validation failed, dropping',
      input.type,
      parsed.error.flatten(),
    );
    return;
  }

  try {
    const supa = getServiceSupabase();
    const { error } = await supa.from('agency_events').insert({
      client_id: input.client_id,
      agent_name: input.agent_name,
      type: input.type,
      severity: input.severity,
      payload: parsed.data,
      why_explanation: input.why_explanation || null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      // Table may not exist on a brand-new deploy; never fail the caller.
      console.warn('[emit-agency-event] insert failed (non-fatal)', error.message);
    }
  } catch (err) {
    console.warn('[emit-agency-event] supabase init failed (non-fatal)', err);
  }
}
