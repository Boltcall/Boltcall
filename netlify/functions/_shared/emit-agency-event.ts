/**
 * Agency OS Event Bus — the kernel write path every agent uses to emit events.
 *
 * Why this exists:
 *   `agency_events.payload` is a JSONB column. Without a per-type allowlist, a
 *   careless `payload: { ...rawApiResponse }` from any agent can leak transcripts,
 *   cost numbers, API tokens, or PII into a row that may later be projected to
 *   clients via `agency_events_client_view`. The schema map below is the PRIMARY
 *   defense against that fire-hose; the RLS view is the second.
 *
 *   Rule: every event type defines an explicit Zod `.strict()` schema. Unknown
 *   fields are rejected (loud) rather than silently dropped, because a
 *   surprising field usually means the caller is leaking data they shouldn't be.
 *
 * Usage:
 *   await emitAgencyEvent({
 *     client_id,
 *     agent_name: 'intake-officer',
 *     type: 'intake_call_completed',
 *     severity: 'info',
 *     payload: { call_id, duration_seconds, extraction_score },
 *     why_explanation: 'Intake call ended normally; profile extracted at 0.92 conf.',
 *   });
 *
 * Never pass `payload: { ...rawRetellResponse }` — only the explicit allowlisted
 * fields per the schema map. Validation rejections are logged WITHOUT the payload
 * (PII risk); only the type, agent, and field issue codes are surfaced.
 */

import { z } from 'zod';
import { getServiceSupabase } from './token-utils';

// ── 1. Event type union ─────────────────────────────────────────────────────

export type AgencyEventType =
  // Customer / lead lifecycle
  | 'call_completed'
  | 'lead_captured'
  | 'booking_made'
  | 'intake_call_completed'
  // Agent / artifact lifecycle
  | 'agent_deployed'
  | 'prompt_revised'
  | 'prompt_reverted'
  | 'creative_published'
  | 'creative_paused'
  // Reporting + optimization
  | 'report_sent'
  | 'report_degraded'
  | 'report_failed'
  | 'optimization_brief_queued'
  | 'escalation_action_drafted'
  // Monitoring + risk
  | 'anomaly_detected'
  | 'churn_risk_changed'
  | 'expansion_candidate_identified'
  // Infra / cost / errors
  | 'cost_incurred'
  | 'rate_limit_hit'
  | 'adapter_error'
  // Self-improvement loop
  | 'digital_twin_run_completed'
  | 'benchmark_score_recorded'
  | 'post_ship_outcome_recorded'
  // Notifications (slack-adapter)
  | 'notification_sent'
  | 'notification_failed'
  | 'notification_fallback_email'
  // Cohort / community (slack-adapter)
  | 'cohort_invited'
  | 'cohort_win_posted'
  | 'cohort_members_listed'
  // Ads (meta-ads-adapter)
  | 'ad_campaign_created'
  | 'ad_campaign_updated'
  | 'ad_set_created'
  | 'conversion_event_sent'
  // Calendar (calcom-adapter)
  | 'calendar_event_created'
  | 'booking_fetched'
  | 'booking_cancelled'
  // Billing (stripe-adapter)
  | 'subscription_changed'
  // SaaS V2 dashboard surface (wave-2 pages) — telemetry only, never client-visible
  | 'saas_v2_leads_list_rendered'
  | 'saas_v2_messages_list_rendered'
  | 'saas_v2_agent_stress_test_run'
  | 'saas_v2_knowledge_gap_detected'
  | 'saas_v2_lead_drawer_opened'
  | 'saas_v2_message_reply_drafted'
  | 'saas_v2_agent_summary_rendered'
  | 'saas_v2_kb_draft_accepted'
  | 'saas_v2_message_thread_opened';

export type AgencyEventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// ── 2. Per-type payload schemas ─────────────────────────────────────────────
//
// Every schema is `.strict()` — unknown keys cause a validation error. The
// caller is forced to explicitly pass an allowlisted payload. This is the gate
// that prevents the events table from becoming a fire hose of internal data.

const callCompletedSchema = z.object({
  call_id: z.string(),
  agent_id: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']),
  duration_seconds: z.number().int().nonnegative(),
  outcome: z.enum(['booked', 'qualified', 'not_qualified', 'voicemail', 'hangup', 'transferred', 'other']).optional(),
  qa_score: z.number().min(0).max(10).optional(),
  ended_reason: z.string().optional(),
}).strict();

const leadCapturedSchema = z.object({
  lead_id: z.string(),
  source: z.string(),
  channel: z.enum(['web_form', 'phone', 'facebook', 'instagram', 'tiktok', 'google', 'manual', 'api', 'other']).optional(),
  campaign_id: z.string().optional(),
  estimated_value_usd: z.number().nonnegative().optional(),
}).strict();

const bookingMadeSchema = z.object({
  booking_id: z.string(),
  lead_id: z.string().optional(),
  service: z.string().optional(),
  scheduled_at: z.string(), // ISO-8601
  channel: z.enum(['inbound_call', 'outbound_call', 'web', 'sms', 'email', 'other']).optional(),
  estimated_value_usd: z.number().nonnegative().optional(),
}).strict();

const intakeCallCompletedSchema = z.object({
  intake_id: z.string(),
  call_id: z.string().optional(),
  duration_seconds: z.number().int().nonnegative(),
  extraction_score: z.number().min(0).max(1),
  flagged_gaps_count: z.number().int().nonnegative().optional(),
  vertical: z.string().optional(),
}).strict();

const agentDeployedSchema = z.object({
  artifact_id: z.string(),
  retell_agent_id: z.string().optional(),
  agent_version: z.string(),
  vertical: z.string().optional(),
  benchmark_score: z.number().min(0).max(10).optional(),
  simulation_pass_rate: z.number().min(0).max(1).optional(),
}).strict();

const promptRevisedSchema = z.object({
  artifact_id: z.string(),
  parent_artifact_id: z.string().optional(),
  retell_agent_id: z.string().optional(),
  reason: z.string(),
  benchmark_delta: z.number().optional(),
  source: z.enum(['founder', 'loop_monitor', 'optimization_strategist', 'post_ship_critic']).optional(),
}).strict();

const promptRevertedSchema = z.object({
  artifact_id: z.string(),
  reverted_to_artifact_id: z.string(),
  retell_agent_id: z.string().optional(),
  reason: z.string(),
  triggered_by: z.enum(['post_ship_critic', 'delivery_monitor', 'founder', 'benchmark_regression']).optional(),
}).strict();

const creativePublishedSchema = z.object({
  artifact_id: z.string(),
  platform: z.enum(['meta', 'google', 'tiktok', 'other']),
  campaign_id: z.string().optional(),
  ad_id: z.string().optional(),
  predicted_ctr: z.number().min(0).max(1).optional(),
}).strict();

const creativePausedSchema = z.object({
  artifact_id: z.string(),
  platform: z.enum(['meta', 'google', 'tiktok', 'other']),
  ad_id: z.string().optional(),
  reason: z.string(),
  observed_cpl_usd: z.number().nonnegative().optional(),
}).strict();

const reportSentSchema = z.object({
  report_id: z.string().optional(),
  period_start: z.string().optional(), // ISO date
  period_end: z.string().optional(),   // ISO date
  delivery_channel: z.enum(['email', 'slack', 'portal', 'pdf_download']).optional(),
  next_week_ask: z.string().optional(),
  // pdf-renderer adapter fields (kept as optional for the file-output path):
  path: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  page_count: z.number().int().nonnegative().optional(),
  page_format: z.string().optional(),
  ttl_sec: z.number().int().nonnegative().optional(),
}).strict();

const reportDegradedSchema = z.object({
  reason: z.string(),
  error: z.string().optional(),
  fallback_used: z.boolean().optional(),
  op: z.string().optional(),
}).strict();

const reportFailedSchema = z.object({
  reason: z.string(),
  error: z.string().optional(),
  op: z.string().optional(),
}).strict();

const optimizationBriefQueuedSchema = z.object({
  artifact_id: z.string(),
  experiment_count: z.number().int().nonnegative(),
  highest_predicted_lift: z.number().optional(),
}).strict();

const escalationActionDraftedSchema = z.object({
  artifact_id: z.string(),
  trigger_event_id: z.string().optional(),
  action_type: z.enum(['rollback', 'pause', 'notify_client', 'retry', 'other']),
  reversible: z.boolean(),
}).strict();

const anomalyDetectedSchema = z.object({
  metric: z.string(),
  observed_value: z.number(),
  expected_value: z.number(),
  sigma_deviation: z.number(),
  window: z.string(), // e.g. "1h", "24h"
  root_cause_hypothesis: z.string().optional(),
}).strict();

const churnRiskChangedSchema = z.object({
  previous_tier: z.enum(['green', 'yellow', 'red']),
  new_tier: z.enum(['green', 'yellow', 'red']),
  score: z.number().min(0).max(1),
  top_drivers: z.array(z.string()).max(5),
}).strict();

const expansionCandidateIdentifiedSchema = z.object({
  candidate_user_id: z.string(),
  predicted_lift_pct: z.number().optional(),
  signals: z.array(z.string()).max(10),
}).strict();

const costIncurredSchema = z.object({
  category: z.string(),
  provider: z.enum(['anthropic', 'openai', 'retell', 'meta', 'google', 'stripe', 'supabase', 'twilio', 'gemini', 'azure-openai', 'other']),
  amount_usd: z.number().nonnegative(),
  tokens: z.union([
    z.number().int().nonnegative(),
    z.object({ input: z.number().int().nonnegative(), output: z.number().int().nonnegative() }),
  ]).optional(),
  model: z.string().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
  op: z.string().optional(),
  n_images: z.number().int().nonnegative().optional(),
  dimensions: z.string().optional(),
  angle: z.string().optional(),
  vertical: z.string().optional(),
  prompt_fingerprint: z.string().optional(),
  variation_strength: z.string().optional(),
  cost_table_version: z.string().optional(),
  embedding_model: z.string().optional(),
  query_chars: z.number().int().nonnegative().optional(),
  k: z.number().int().nonnegative().optional(),
  kinds: z.union([z.array(z.string()), z.literal('all')]).optional(),
  returned_chunks: z.number().int().nonnegative().optional(),
  operation: z.string().optional(),
}).strict();

const rateLimitHitSchema = z.object({
  provider: z.string(),
  endpoint: z.string().optional(),
  retry_after_seconds: z.number().int().nonnegative().optional(),
}).strict();

const adapterErrorSchema = z.object({
  adapter: z.string(),
  operation: z.string(),
  error_class: z.string().optional(),
  error_message: z.string(), // already-sanitized; NEVER raw provider response
  retryable: z.boolean().optional(),
  op: z.string().optional(),
  external_id: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  error: z.union([z.string(), z.object({ message: z.string(), name: z.string().optional() })]).optional(),
}).strict();

const digitalTwinRunCompletedSchema = z.object({
  run_id: z.string(),
  artifact_id: z.string().optional(),
  persona_count: z.number().int().positive(),
  pass_rate: z.number().min(0).max(1),
  average_qa_score: z.number().min(0).max(10),
  failure_clusters: z.number().int().nonnegative().optional(),
}).strict();

const benchmarkScoreRecordedSchema = z.object({
  benchmark_id: z.string(),
  agent_target: z.string(),
  score: z.number(),
  passed: z.boolean(),
  scenario_count: z.number().int().positive(),
  artifact_id: z.string().optional(),
}).strict();

const postShipOutcomeRecordedSchema = z.object({
  artifact_id: z.string(),
  window: z.string(), // e.g. "72h", "50_calls"
  observed_metric: z.string(),
  observed_value: z.number(),
  baseline_value: z.number(),
  verdict: z.enum(['pass', 'regress', 'inconclusive']),
}).strict();

// ── Notification schemas (slack-adapter) ──────────────────────────────────

const notificationSentSchema = z.object({
  channel: z.enum(['critical', 'digest', 'weekly_report', 'portal_link', 'other']).optional(),
  ts: z.string().optional(),
  has_file: z.boolean().optional(),
  op: z.string().optional(),
  return_url_host: z.string().optional(),
  customer: z.string().optional(),
}).strict();

const notificationFailedSchema = z.object({
  channel: z.string().optional(),
  reason: z.string(),
  op: z.string().optional(),
}).strict();

const notificationFallbackEmailSchema = z.object({
  channel: z.string(),
  reason: z.string(),
  fallback_ts: z.string().optional(),
}).strict();

// ── Cohort / community schemas (slack-adapter) ────────────────────────────

const cohortInvitedSchema = z.object({
  channel_id: z.string(),
  vertical: z.string(),
  region: z.string().nullable().optional(),
  revenue_tier: z.string().nullable().optional(),
  slack_user_id: z.string().nullable().optional(),
  method: z.string().optional(),
}).strict();

const cohortWinPostedSchema = z.object({
  cohort_channel_id: z.string(),
  ts: z.string(),
  has_evidence: z.boolean().optional(),
}).strict();

const cohortMembersListedSchema = z.object({
  cohort_channel_id: z.string(),
  count: z.number().int().nonnegative(),
}).strict();

// ── Ad schemas (meta-ads-adapter) ─────────────────────────────────────────

const adCampaignCreatedSchema = z.object({
  campaign_id: z.string(),
  ad_account_id: z.string().optional(),
  objective: z.string().optional(),
  daily_budget_usd: z.number().nonnegative().optional(),
  op: z.string().optional(),
  external_id: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).strict();

const adCampaignUpdatedSchema = z.object({
  campaign_id: z.string().optional(),
  pixel_id: z.string().optional(),
  configured_at: z.string().optional(),
  has_test_event_code: z.boolean().optional(),
  op: z.string().optional(),
  external_id: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).strict();

const adSetCreatedSchema = z.object({
  adset_id: z.string(),
  campaign_id: z.string(),
  daily_budget_usd: z.number().nonnegative().optional(),
  has_lead_form: z.boolean().optional(),
  op: z.string().optional(),
  external_id: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).strict();

const conversionEventSentSchema = z.object({
  pixel_id: z.string(),
  event_name: z.string(),
  events_received: z.number().int().nonnegative().optional(),
  test_mode: z.boolean().optional(),
  op: z.string().optional(),
  external_id: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).strict();

// ── Calendar schemas (calcom-adapter) ─────────────────────────────────────

const calendarEventCreatedSchema = z.object({
  event_type_id: z.number().int().optional(),
  slug: z.string().optional(),
  duration_min: z.number().int().optional(),
  owner: z.string().optional(),
  public_url: z.string().optional(),
  scheduling_url: z.string().optional(),
  paused_at: z.string().optional(),
  op: z.string().optional(),
}).strict();

const bookingFetchedSchema = z.object({
  count: z.number().int().nonnegative(),
  event_type_id: z.number().int().nullable().optional(),
  since: z.string(),
  until: z.string(),
  op: z.string().optional(),
}).strict();

const bookingCancelledSchema = z.object({
  booking_id: z.number().int(),
  reason: z.string(),
  cancelled_at: z.string(),
  op: z.string().optional(),
}).strict();

// ── Billing schemas (stripe-adapter) ──────────────────────────────────────

const subscriptionChangedSchema = z.object({
  subscription: z.string().optional(),       // masked id like "sub_***Lq3F"
  customer: z.string().optional(),           // masked id
  status: z.string().optional(),
  mrr_usd: z.number().optional(),
  latest_invoice_status: z.string().optional(),
  event_id: z.string().optional(),
  event_type: z.string().optional(),
  recommended_action: z.string().optional(),
  livemode: z.boolean().optional(),
  keys: z.array(z.string()).optional(),
  updated_at: z.string().optional(),
  op: z.string().optional(),
}).strict();

// ── SaaS V2 dashboard schemas (wave-2 pages) ──────────────────────────────
// These are internal telemetry only — never projected to clients. Workspace_id
// is used in place of client_id for SaaS self-serve users (no agency_clients row).

const saasV2LeadsListRenderedSchema = z.object({
  workspace_id: z.string(),
  count: z.number().int().nonnegative(),
  filter_applied: z.string().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
}).strict();

const saasV2MessagesListRenderedSchema = z.object({
  workspace_id: z.string(),
  count: z.number().int().nonnegative(),
  needs_reply_count: z.number().int().nonnegative().optional(),
  channel_breakdown: z.record(z.number().int().nonnegative()).optional(),
  latency_ms: z.number().int().nonnegative().optional(),
}).strict();

const saasV2AgentStressTestRunSchema = z.object({
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
}).strict();

const saasV2KnowledgeGapDetectedSchema = z.object({
  workspace_id: z.string(),
  query_text: z.string().max(200),
  top_score: z.number(),
  source: z.enum(['kb_search', 'ai_extract', 'conversation']),
}).strict();

const saasV2LeadDrawerOpenedSchema = z.object({
  workspace_id: z.string(),
  lead_id: z.string(),
}).strict();

const saasV2MessageReplyDraftedSchema = z.object({
  workspace_id: z.string(),
  thread_id: z.string(),
  channel: z.enum(['sms', 'email', 'chat']),
  tier: z.enum(['haiku', 'sonnet']),
  latency_ms: z.number().int().nonnegative().optional(),
}).strict();

const saasV2AgentSummaryRenderedSchema = z.object({
  workspace_id: z.string(),
  agent_id: z.string(),
  narrative_confidence: z.number().min(0).max(1),
}).strict();

const saasV2KbDraftAcceptedSchema = z.object({
  workspace_id: z.string(),
  kb_folder_id: z.string(),
  doc_count: z.number().int().nonnegative(),
  source: z.enum(['scrape', 'upload', 'ai_extract']),
}).strict();

const saasV2MessageThreadOpenedSchema = z.object({
  workspace_id: z.string(),
  thread_id: z.string(),
  channel: z.enum(['sms', 'email', 'chat']),
  message_count: z.number().int().nonnegative().optional(),
}).strict();

const EVENT_SCHEMAS = {
  call_completed: callCompletedSchema,
  lead_captured: leadCapturedSchema,
  booking_made: bookingMadeSchema,
  intake_call_completed: intakeCallCompletedSchema,
  agent_deployed: agentDeployedSchema,
  prompt_revised: promptRevisedSchema,
  prompt_reverted: promptRevertedSchema,
  creative_published: creativePublishedSchema,
  creative_paused: creativePausedSchema,
  report_sent: reportSentSchema,
  report_degraded: reportDegradedSchema,
  report_failed: reportFailedSchema,
  optimization_brief_queued: optimizationBriefQueuedSchema,
  escalation_action_drafted: escalationActionDraftedSchema,
  anomaly_detected: anomalyDetectedSchema,
  churn_risk_changed: churnRiskChangedSchema,
  expansion_candidate_identified: expansionCandidateIdentifiedSchema,
  cost_incurred: costIncurredSchema,
  rate_limit_hit: rateLimitHitSchema,
  adapter_error: adapterErrorSchema,
  digital_twin_run_completed: digitalTwinRunCompletedSchema,
  benchmark_score_recorded: benchmarkScoreRecordedSchema,
  post_ship_outcome_recorded: postShipOutcomeRecordedSchema,
  // Notifications (slack-adapter)
  notification_sent: notificationSentSchema,
  notification_failed: notificationFailedSchema,
  notification_fallback_email: notificationFallbackEmailSchema,
  // Cohort / community (slack-adapter)
  cohort_invited: cohortInvitedSchema,
  cohort_win_posted: cohortWinPostedSchema,
  cohort_members_listed: cohortMembersListedSchema,
  // Ads (meta-ads-adapter)
  ad_campaign_created: adCampaignCreatedSchema,
  ad_campaign_updated: adCampaignUpdatedSchema,
  ad_set_created: adSetCreatedSchema,
  conversion_event_sent: conversionEventSentSchema,
  // Calendar (calcom-adapter)
  calendar_event_created: calendarEventCreatedSchema,
  booking_fetched: bookingFetchedSchema,
  booking_cancelled: bookingCancelledSchema,
  // Billing (stripe-adapter)
  subscription_changed: subscriptionChangedSchema,
  // SaaS V2 dashboard surface (wave-2 pages) — telemetry only
  saas_v2_leads_list_rendered: saasV2LeadsListRenderedSchema,
  saas_v2_messages_list_rendered: saasV2MessagesListRenderedSchema,
  saas_v2_agent_stress_test_run: saasV2AgentStressTestRunSchema,
  saas_v2_knowledge_gap_detected: saasV2KnowledgeGapDetectedSchema,
  saas_v2_lead_drawer_opened: saasV2LeadDrawerOpenedSchema,
  saas_v2_message_reply_drafted: saasV2MessageReplyDraftedSchema,
  saas_v2_agent_summary_rendered: saasV2AgentSummaryRenderedSchema,
  saas_v2_kb_draft_accepted: saasV2KbDraftAcceptedSchema,
  saas_v2_message_thread_opened: saasV2MessageThreadOpenedSchema,
} as const satisfies Record<AgencyEventType, z.ZodTypeAny>;

// ── 3. Fields the client RLS view is allowed to expose ─────────────────────
//
// Mirrors the `agency_events_client_view` projection in the RLS migration:
// type, severity, and ONLY a curated subset of payload fields per type. Anything
// not in this allowlist is stripped before being returned by the client API.
//
// Rule of thumb: no internal artifact IDs, no cost numbers, no error internals,
// no model names, no token counts, no qa_score (founder-only).

const CLIENT_VISIBLE_FIELDS: Record<AgencyEventType, ReadonlyArray<string>> = {
  call_completed:                   ['direction', 'outcome', 'duration_seconds'],
  lead_captured:                    ['source', 'channel'],
  booking_made:                     ['service', 'scheduled_at', 'channel'],
  intake_call_completed:            ['duration_seconds', 'vertical'],
  agent_deployed:                   ['agent_version', 'vertical'],
  prompt_revised:                   ['reason'],
  prompt_reverted:                  ['reason'],
  creative_published:               ['platform'],
  creative_paused:                  ['platform', 'reason'],
  report_sent:                      ['period_start', 'period_end', 'delivery_channel'],
  report_degraded:                  [],
  report_failed:                    [],
  optimization_brief_queued:        ['experiment_count'],
  escalation_action_drafted:        ['action_type'],
  anomaly_detected:                 ['metric', 'window'],
  churn_risk_changed:               [],
  expansion_candidate_identified:   [],
  cost_incurred:                    [],
  rate_limit_hit:                   [],
  adapter_error:                    [],
  digital_twin_run_completed:       ['pass_rate'],
  benchmark_score_recorded:         ['passed'],
  post_ship_outcome_recorded:       ['verdict', 'window'],
  // Notifications (slack-adapter) — internal telemetry; nothing exposed to clients.
  notification_sent:                [],
  notification_failed:              [],
  notification_fallback_email:      [],
  // Cohort / community (slack-adapter) — internal.
  cohort_invited:                   [],
  cohort_win_posted:                [],
  cohort_members_listed:            [],
  // Ads (meta-ads-adapter) — internal; campaign ids etc. are founder-only.
  ad_campaign_created:              [],
  ad_campaign_updated:              [],
  ad_set_created:                   [],
  conversion_event_sent:            [],
  // Calendar (calcom-adapter) — internal.
  calendar_event_created:           [],
  booking_fetched:                  [],
  booking_cancelled:                [],
  // Billing (stripe-adapter) — internal; never expose subscription internals.
  subscription_changed:             [],
  // SaaS V2 dashboard surface (wave-2 pages) — internal telemetry only.
  saas_v2_leads_list_rendered:      [],
  saas_v2_messages_list_rendered:   [],
  saas_v2_agent_stress_test_run:    [],
  saas_v2_knowledge_gap_detected:   [],
  saas_v2_lead_drawer_opened:       [],
  saas_v2_message_reply_drafted:    [],
  saas_v2_agent_summary_rendered:   [],
  saas_v2_kb_draft_accepted:        [],
  saas_v2_message_thread_opened:    [],
};

// Event types the client is allowed to see at all. Anything not in this set
// returns `null` from `getClientFacingPayload`. Mirrors the WHERE clause of
// `agency_events_client_view` in the RLS migration.
const CLIENT_VISIBLE_TYPES: ReadonlySet<AgencyEventType> = new Set<AgencyEventType>([
  'call_completed',
  'lead_captured',
  'booking_made',
  'intake_call_completed',
  'agent_deployed',
  'prompt_revised',
  'prompt_reverted',
  'creative_published',
  'creative_paused',
  'report_sent',
  'optimization_brief_queued',
  'anomaly_detected',
  'digital_twin_run_completed',
  'benchmark_score_recorded',
  'post_ship_outcome_recorded',
]);

// ── 4. Public API types ─────────────────────────────────────────────────────

export interface EmitAgencyEventInput<T extends AgencyEventType = AgencyEventType> {
  client_id: string;
  agent_name: string;
  type: T;
  severity: AgencyEventSeverity;
  payload: Record<string, unknown>;
  why_explanation?: string;
}

export interface AgencyEventRow {
  id: string;
  client_id: string;
  agent_name: string;
  type: AgencyEventType;
  severity: AgencyEventSeverity;
  payload: Record<string, unknown>;
  why_explanation: string | null;
  created_at: string;
}

export interface ClientFacingEvent {
  id: string;
  type: AgencyEventType;
  severity: AgencyEventSeverity;
  payload: Record<string, unknown>;
  why_explanation: string | null;
  created_at: string;
}

// ── 5. Internal helpers ─────────────────────────────────────────────────────

/**
 * Validate a payload against its event-type schema. Returns the parsed/scrubbed
 * payload on success. On failure, logs a sanitized warning (NEVER the payload
 * contents — could be PII) and throws.
 *
 * Zod's `.strict()` causes unknown keys to fail validation. This is intentional:
 * we want callers to be loud about misspelled or surprising fields rather than
 * silently dropping them into the void.
 */
function validatePayload(
  type: AgencyEventType,
  payload: Record<string, unknown>,
  agent_name: string,
): Record<string, unknown> {
  const schema = EVENT_SCHEMAS[type];
  if (!schema) {
    console.warn(`[emit-agency-event] no schema registered for type=${type} agent=${agent_name}`);
    throw new Error(`emit-agency-event: unknown event type "${type}"`);
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    // SAFETY: only log field names + issue codes, never the values — payloads
    // can carry call transcripts, names, phone numbers, addresses, etc.
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      code: i.code,
      // `message` is generated by zod from the schema + code; safe to log.
      message: i.message,
    }));
    console.warn(
      `[emit-agency-event] schema rejection type=${type} agent=${agent_name} ` +
      `issues=${JSON.stringify(issues)}`,
    );
    throw new Error(
      `emit-agency-event: payload for "${type}" failed schema validation ` +
      `(${issues.length} issue${issues.length === 1 ? '' : 's'})`,
    );
  }
  return result.data as Record<string, unknown>;
}

/**
 * Build the compact mirror payload that goes into aios_event_log. Full payload
 * stays in agency_events; the mirror is intentionally tiny so the firehose
 * table doesn't double-ingest PII or large transcripts.
 */
function buildMirrorPayload(
  input: EmitAgencyEventInput,
  validated: Record<string, unknown>,
): Record<string, unknown> {
  // One-line summary: type-specific best-effort, falls back to a humanized
  // version of the event type.
  let summary = '';
  switch (input.type) {
    case 'call_completed':
      summary = `${String(validated.direction ?? 'unknown')} call ${String(validated.outcome ?? 'completed')}`;
      break;
    case 'booking_made':
      summary = `booking scheduled${validated.service ? ` for ${String(validated.service)}` : ''}`;
      break;
    case 'anomaly_detected':
      summary = `anomaly on ${String(validated.metric ?? 'metric')} (${String(validated.sigma_deviation ?? '?')}σ)`;
      break;
    case 'adapter_error':
      summary = `${String(validated.adapter ?? 'adapter')} ${String(validated.operation ?? 'op')} failed`;
      break;
    case 'cost_incurred':
      summary = `${String(validated.provider ?? 'provider')} cost`;
      break;
    case 'post_ship_outcome_recorded':
      summary = `post-ship ${String(validated.verdict ?? 'recorded')}`;
      break;
    default:
      summary = input.type.replace(/_/g, ' ');
  }
  return {
    agent_name: input.agent_name,
    client_id: input.client_id,
    type: input.type,
    severity: input.severity,
    summary,
  };
}

/**
 * Best-effort mirror to aios_event_log. Never throws — the primary write to
 * agency_events is the source of truth; the mirror is for the AIOS dashboard's
 * cross-system event firehose. If aios_event_log doesn't exist in this env
 * (e.g. local dev) we just log and move on.
 */
async function mirrorToAiosEventLog(
  supabase: ReturnType<typeof getServiceSupabase>,
  input: EmitAgencyEventInput,
  validated: Record<string, unknown>,
  agency_event_id: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('aios_event_log').insert({
      source: 'agency_os',
      event_type: input.type,
      severity: input.severity,
      payload: { ...buildMirrorPayload(input, validated), agency_event_id },
    });
    if (error) {
      // Don't escalate: the agency_events row is authoritative; the mirror is
      // observability sugar. Log so we notice if the mirror is broken in prod.
      console.warn(
        `[emit-agency-event] aios_event_log mirror failed type=${input.type} ` +
        `agent=${input.agent_name} err=${error.message}`,
      );
    }
  } catch (mirrorErr) {
    console.warn(
      `[emit-agency-event] aios_event_log mirror threw type=${input.type} ` +
      `err=${mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr)}`,
    );
  }
}

// ── 6. Public API ───────────────────────────────────────────────────────────

/**
 * Emit a single agency event. Validates payload against the per-type schema,
 * writes to public.agency_events, and best-effort mirrors a compact summary to
 * aios_event_log.
 *
 * Throws if:
 *   - the event type is not registered
 *   - the payload fails schema validation (missing required, unknown key, wrong type)
 *   - the agency_events insert fails
 *
 * Returns the inserted row's id.
 *
 * Events are kernel state — callers should NOT swallow the throw. Let it
 * propagate so the originating function returns 5xx and the operation can be
 * retried (idempotency is the caller's responsibility via event-specific ids).
 */
export async function emitAgencyEvent<T extends AgencyEventType>(
  input: EmitAgencyEventInput<T>,
): Promise<string> {
  const validated = validatePayload(input.type, input.payload, input.agent_name);
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('agency_events')
    .insert({
      client_id: input.client_id,
      agent_name: input.agent_name,
      type: input.type,
      severity: input.severity,
      payload: validated,
      why_explanation: input.why_explanation ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Don't log the payload — could be PII. Type + agent is enough to find it.
    console.warn(
      `[emit-agency-event] agency_events insert failed type=${input.type} ` +
      `agent=${input.agent_name} err=${error?.message ?? 'no data returned'}`,
    );
    throw new Error(
      `emit-agency-event: failed to insert agency_events row: ${error?.message ?? 'unknown'}`,
    );
  }

  // Awaited but never throws — mirror failure must not block the primary write.
  await mirrorToAiosEventLog(supabase, input, validated, data.id as string);

  return data.id as string;
}

/**
 * Emit a batch of agency events in a single insert (perf path for hourly
 * monitors that may emit 50-500 events at once). Validation is run per-event
 * BEFORE any insert — if ANY event fails validation, the whole batch is
 * rejected. This is intentional: partial batches make debugging miserable and
 * the caller should fix the offender, not silently drop it.
 *
 * Returns the inserted row ids in input order.
 */
export async function emitAgencyEvents(
  inputs: ReadonlyArray<EmitAgencyEventInput>,
): Promise<string[]> {
  if (inputs.length === 0) return [];

  // Validate everything first; throw before touching the DB if any fail.
  const rows = inputs.map((input) => {
    const validated = validatePayload(input.type, input.payload, input.agent_name);
    return {
      input,
      row: {
        client_id: input.client_id,
        agent_name: input.agent_name,
        type: input.type,
        severity: input.severity,
        payload: validated,
        why_explanation: input.why_explanation ?? null,
      },
    };
  });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_events')
    .insert(rows.map((r) => r.row))
    .select('id');

  if (error || !data) {
    console.warn(
      `[emit-agency-event] batch insert failed count=${inputs.length} ` +
      `err=${error?.message ?? 'no data returned'}`,
    );
    throw new Error(
      `emit-agency-event: batch insert failed: ${error?.message ?? 'unknown'}`,
    );
  }

  if (data.length !== rows.length) {
    console.warn(
      `[emit-agency-event] batch insert returned ${data.length} rows for ` +
      `${rows.length} inputs — id ordering may be inaccurate`,
    );
  }

  // Best-effort mirror per event. Use Promise.allSettled so one mirror failure
  // doesn't poison the rest.
  await Promise.allSettled(
    rows.map((r, i) =>
      mirrorToAiosEventLog(
        supabase,
        r.input,
        r.row.payload as Record<string, unknown>,
        (data[i]?.id ?? '') as string,
      ),
    ),
  );

  return data.map((d) => d.id as string);
}

/**
 * Project an agency_events row to its client-safe representation.
 *
 * This is the SECOND line of defense (the first being the RLS view
 * `agency_events_client_view` at the database layer). The view restricts ROW
 * access; this function restricts FIELD access within the payload. Use it in
 * any Netlify function that serves event rows to a client-authenticated
 * caller — never `JSON.stringify(eventRow)` directly into a client response.
 *
 * Returns null if the event type is not on the client-visible allowlist (the
 * caller should filter these out of the response entirely).
 */
export function getClientFacingPayload(event: AgencyEventRow): ClientFacingEvent | null {
  if (!CLIENT_VISIBLE_TYPES.has(event.type)) {
    return null;
  }
  const allowed = CLIENT_VISIBLE_FIELDS[event.type] ?? [];
  const scrubbed: Record<string, unknown> = {};
  for (const field of allowed) {
    if (event.payload && Object.prototype.hasOwnProperty.call(event.payload, field)) {
      scrubbed[field] = event.payload[field];
    }
  }
  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    payload: scrubbed,
    // why_explanation is intentionally pass-through: it's generated by an
    // internal LLM specifically for client-facing display per the Why-Log
    // design. If a generator ever writes internal jargon there, fix the
    // generator, not this projection.
    why_explanation: event.why_explanation,
    created_at: event.created_at,
  };
}

// ── 7. SaaS V2 sibling emitter ──────────────────────────────────────────────
//
// SaaS V2 self-serve users have NO `agency_clients` row, so the kernel
// `emitAgencyEvent` (which REQUIRES a `client_id`) is the wrong tool. This
// sibling helper writes ONLY to `aios_event_log` (the cross-system firehose
// table) with `source = 'saas_v2'`. It still validates the payload against
// the same per-type Zod schema so SaaS V2 telemetry stays as disciplined as
// the agency-OS bus.
//
// Never throws — telemetry must not break the user-facing primary write.

export type SaasV2EventType =
  | 'saas_v2_leads_list_rendered'
  | 'saas_v2_messages_list_rendered'
  | 'saas_v2_agent_stress_test_run'
  | 'saas_v2_knowledge_gap_detected'
  | 'saas_v2_lead_drawer_opened'
  | 'saas_v2_message_reply_drafted'
  | 'saas_v2_agent_summary_rendered'
  | 'saas_v2_kb_draft_accepted'
  | 'saas_v2_message_thread_opened';

export interface EmitSaasV2EventInput<T extends SaasV2EventType = SaasV2EventType> {
  workspace_id: string;
  type: T;
  severity?: AgencyEventSeverity;
  payload: Record<string, unknown>;
}

export async function emitSaasV2Event<T extends SaasV2EventType>(
  input: EmitSaasV2EventInput<T>,
): Promise<void> {
  try {
    // Validate against the same per-type schema bank.
    const validated = validatePayload(
      input.type as AgencyEventType,
      input.payload,
      `saas_v2:${input.type}`,
    );

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('aios_event_log').insert({
      source: 'saas_v2',
      event_type: input.type,
      severity: input.severity ?? 'info',
      payload: {
        workspace_id: input.workspace_id,
        ...validated,
      },
    });
    if (error) {
      console.warn(
        `[emit-saas-v2-event] aios_event_log insert failed type=${input.type} ` +
        `workspace=${input.workspace_id} err=${error.message}`,
      );
    }
  } catch (err) {
    // Validation failure or supabase throw — telemetry only, never escalate.
    console.warn(
      `[emit-saas-v2-event] swallowed type=${input.type} workspace=${
        input.workspace_id
      } err=${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Schema introspection — exported for tests and for the docs generator. Do not
 * import in hot paths; the Zod schemas should be referenced directly.
 */
export const __INTERNAL_EVENT_SCHEMAS = EVENT_SCHEMAS;
export const __INTERNAL_CLIENT_VISIBLE_FIELDS = CLIENT_VISIBLE_FIELDS;
export const __INTERNAL_CLIENT_VISIBLE_TYPES = CLIENT_VISIBLE_TYPES;
