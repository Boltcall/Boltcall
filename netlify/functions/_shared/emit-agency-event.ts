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
 * Also exposes a `emitSaasV2Event` sibling helper for SaaS V2 self-serve users
 * that writes only to `aios_event_log` (no `agency_clients` row required), and a
 * fire-and-forget `emitAgencyEvent` shape for SaaS V2 surface telemetry.
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
  // Billing (stripe-adapter) + workspace lifecycle
  | 'workspace_created'
  | 'workspace_v2_toggled'
  | 'subscription_changed'
  // SaaS V2 dashboard surface (wave-1 home/calls/analytics)
  | 'saas_v2_ask_ai_query'
  | 'saas_v2_narrative_rendered'
  | 'saas_v2_call_drawer_opened'
  | 'saas_v2_home_rendered'
  | 'saas_v2_calls_list_rendered'
  // SaaS V2 dashboard surface (wave-2 pages) — telemetry only, never client-visible
  | 'saas_v2_leads_list_rendered'
  | 'saas_v2_messages_list_rendered'
  | 'saas_v2_agent_stress_test_run'
  | 'saas_v2_knowledge_gap_detected'
  | 'saas_v2_lead_drawer_opened'
  | 'saas_v2_message_reply_drafted'
  | 'saas_v2_agent_summary_rendered'
  | 'saas_v2_kb_draft_accepted'
  | 'saas_v2_message_thread_opened'
  | 'saas_v2_agent_suggest_edits'
  // SaaS V2 surface (wave-3 integrations/reviews/help/qa/settings)
  | 'saas_v2_integrations_list_rendered'
  | 'saas_v2_integration_recommended'
  | 'saas_v2_review_drafted'
  | 'saas_v2_help_answer_rendered'
  | 'saas_v2_qa_rendered'
  | 'saas_v2_qa_run'
  | 'saas_v2_settings_updated'
  | 'saas_v2_settings_suggestion_applied';

export type AgencyEventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// Legacy alias used by some callers.
export type Severity = 'info' | 'warn' | 'error';
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

// ── 2. Per-type payload schemas ─────────────────────────────────────────────

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
  scheduled_at: z.string(),
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
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  delivery_channel: z.enum(['email', 'slack', 'portal', 'pdf_download']).optional(),
  next_week_ask: z.string().optional(),
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
  window: z.string(),
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
  error_message: z.string(),
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
  window: z.string(),
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

// ── Workspace lifecycle schemas (wave-1) ───────────────────────────────────

const workspaceCreatedSchema = z.object({
  workspace_id: z.string(),
  owner_id: z.string(),
}).strict();

const workspaceV2ToggledSchema = z.object({
  workspace_id: z.string(),
  enabled: z.boolean(),
}).strict();

// ── Billing schemas (stripe-adapter) ──────────────────────────────────────
// Union of legacy stripe-adapter shape and wave-1 workspace subscription change.

const subscriptionChangedSchema = z.object({
  workspace_id: z.string().optional(),
  old_plan: z.string().optional(),
  new_plan: z.string().optional(),
  subscription: z.string().optional(),
  customer: z.string().optional(),
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

// ── SaaS V2 dashboard schemas (wave-1: home/calls/analytics) ──────────────

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
  rows_returned: z.number().int().nonnegative().optional(),
  count: z.number().int().nonnegative().optional(),
  filters_applied: z.array(z.string()).max(10).optional(),
  filter_applied: z.string().optional(),
  load_ms: z.number().int().nonnegative().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
}).strict();

// ── SaaS V2 dashboard schemas (wave-2 pages) ──────────────────────────────

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
    'caller-emergency',
    'caller-pricing-objection',
    'caller-wants-callback',
    'caller-asks-about-insurance',
    'caller-difficult-spelling',
    'caller-wrong-number',
  ]),
  qa_score: z.number().min(0).max(10).optional(),
  outcome: z.string().optional(),
  passed: z.boolean().optional(),
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
  agent_id: z.string().optional(),
  prompt_version: z.number().int().optional(),
  prompt_length: z.number().int().nonnegative().optional(),
  capabilities_count: z.number().int().nonnegative().optional(),
  gaps_count: z.number().int().nonnegative().optional(),
  narrative_confidence: z.number().min(0).max(1).optional(),
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

const saasV2AgentSuggestEditsSchema = z.object({
  workspace_id: z.string(),
  suggestion_count: z.number().int().nonnegative(),
  high_severity_count: z.number().int().nonnegative().optional(),
  used_qa_failures: z.boolean().optional(),
}).strict();

// ── SaaS V2 surface schemas (wave-3 integrations/reviews/help/qa/settings) ─
// V2 events are internal-only — they describe owner-facing UI surface activity
// and never carry client-facing payload bits. All payloads are .strict().

const saasV2IntegrationsListRenderedSchema = z.object({
  workspace_id: z.string(),
  connected_count: z.number().int().nonnegative(),
  available_count: z.number().int().nonnegative(),
  op: z.string().optional(),
}).strict();

const saasV2IntegrationRecommendedSchema = z.object({
  workspace_id: z.string(),
  provider: z.string(),
  reason: z.string(),
  model: z.string().optional(),
}).strict();

const saasV2ReviewDraftedSchema = z.object({
  workspace_id: z.string(),
  review_id: z.string(),
  platform: z.string(),
  rating: z.number().int().min(1).max(5),
  draft_chars: z.number().int().nonnegative(),
  model: z.string().optional(),
}).strict();

const saasV2HelpAnswerRenderedSchema = z.object({
  workspace_id: z.string(),
  query_chars: z.number().int().nonnegative(),
  sources_cited: z.number().int().nonnegative(),
  source_kinds: z.array(z.string()),
  model: z.string().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
}).strict();

const saasV2QaRenderedSchema = z.object({
  workspace_id: z.string(),
  scored_count: z.number().int().nonnegative(),
  failing_count: z.number().int().nonnegative(),
  avg_score: z.number().nullable(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
}).strict();

const saasV2QaRunSchema = z.object({
  workspace_id: z.string(),
  scored_count: z.number().int().nonnegative(),
  window_days: z.number().int().positive().optional(),
  skipped_count: z.number().int().nonnegative().optional(),
  failures_count: z.number().int().nonnegative().optional(),
  average_score: z.number().nullable().optional(),
  low_score_count: z.number().int().nonnegative().optional(),
}).strict();

const saasV2SettingsUpdatedSchema = z.object({
  workspace_id: z.string(),
  field: z.string(),
  op: z.string().optional(),
}).strict();

const saasV2SettingsSuggestionAppliedSchema = z.object({
  workspace_id: z.string(),
  field: z.string(),
  prior_value: z.string(),
  new_value: z.string(),
  source: z.enum(['ai_strategist', 'heuristic', 'user']),
}).strict();

export const EVENT_SCHEMAS = {
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
  notification_sent: notificationSentSchema,
  notification_failed: notificationFailedSchema,
  notification_fallback_email: notificationFallbackEmailSchema,
  cohort_invited: cohortInvitedSchema,
  cohort_win_posted: cohortWinPostedSchema,
  cohort_members_listed: cohortMembersListedSchema,
  ad_campaign_created: adCampaignCreatedSchema,
  ad_campaign_updated: adCampaignUpdatedSchema,
  ad_set_created: adSetCreatedSchema,
  conversion_event_sent: conversionEventSentSchema,
  calendar_event_created: calendarEventCreatedSchema,
  booking_fetched: bookingFetchedSchema,
  booking_cancelled: bookingCancelledSchema,
  workspace_created: workspaceCreatedSchema,
  workspace_v2_toggled: workspaceV2ToggledSchema,
  subscription_changed: subscriptionChangedSchema,
  // SaaS V2 wave-1 (home/calls/analytics)
  saas_v2_ask_ai_query: saasV2AskAiQuerySchema,
  saas_v2_narrative_rendered: saasV2NarrativeRenderedSchema,
  saas_v2_call_drawer_opened: saasV2CallDrawerOpenedSchema,
  saas_v2_home_rendered: saasV2HomeRenderedSchema,
  saas_v2_calls_list_rendered: saasV2CallsListRenderedSchema,
  // SaaS V2 wave-2 (leads/messages/agent/kb)
  saas_v2_leads_list_rendered: saasV2LeadsListRenderedSchema,
  saas_v2_messages_list_rendered: saasV2MessagesListRenderedSchema,
  saas_v2_agent_stress_test_run: saasV2AgentStressTestRunSchema,
  saas_v2_knowledge_gap_detected: saasV2KnowledgeGapDetectedSchema,
  saas_v2_lead_drawer_opened: saasV2LeadDrawerOpenedSchema,
  saas_v2_message_reply_drafted: saasV2MessageReplyDraftedSchema,
  saas_v2_agent_summary_rendered: saasV2AgentSummaryRenderedSchema,
  saas_v2_kb_draft_accepted: saasV2KbDraftAcceptedSchema,
  saas_v2_message_thread_opened: saasV2MessageThreadOpenedSchema,
  saas_v2_agent_suggest_edits: saasV2AgentSuggestEditsSchema,
  // SaaS V2 wave-3 (integrations/reviews/help/qa/settings)
  saas_v2_integrations_list_rendered: saasV2IntegrationsListRenderedSchema,
  saas_v2_integration_recommended: saasV2IntegrationRecommendedSchema,
  saas_v2_review_drafted: saasV2ReviewDraftedSchema,
  saas_v2_help_answer_rendered: saasV2HelpAnswerRenderedSchema,
  saas_v2_qa_rendered: saasV2QaRenderedSchema,
  saas_v2_qa_run: saasV2QaRunSchema,
  saas_v2_settings_updated: saasV2SettingsUpdatedSchema,
  saas_v2_settings_suggestion_applied: saasV2SettingsSuggestionAppliedSchema,
} as const satisfies Record<AgencyEventType, z.ZodTypeAny>;

// ── 3. Fields the client RLS view is allowed to expose ─────────────────────

export const CLIENT_VISIBLE_FIELDS: Record<AgencyEventType, ReadonlyArray<string>> = {
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
  notification_sent:                [],
  notification_failed:              [],
  notification_fallback_email:      [],
  cohort_invited:                   [],
  cohort_win_posted:                [],
  cohort_members_listed:            [],
  ad_campaign_created:              [],
  ad_campaign_updated:              [],
  ad_set_created:                   [],
  conversion_event_sent:            [],
  calendar_event_created:           [],
  booking_fetched:                  [],
  booking_cancelled:                [],
  workspace_created:                [],
  workspace_v2_toggled:             [],
  subscription_changed:             [],
  // SaaS V2 internal telemetry — never client-facing
  saas_v2_ask_ai_query:             [],
  saas_v2_narrative_rendered:       [],
  saas_v2_call_drawer_opened:       [],
  saas_v2_home_rendered:            [],
  saas_v2_calls_list_rendered:      [],
  saas_v2_leads_list_rendered:      [],
  saas_v2_messages_list_rendered:   [],
  saas_v2_agent_stress_test_run:    [],
  saas_v2_knowledge_gap_detected:   [],
  saas_v2_lead_drawer_opened:       [],
  saas_v2_message_reply_drafted:    [],
  saas_v2_agent_summary_rendered:   [],
  saas_v2_kb_draft_accepted:        [],
  saas_v2_message_thread_opened:    [],
  saas_v2_agent_suggest_edits:      [],
  // SaaS V2 surface (wave-3) — owner-only internal telemetry; never client-facing.
  saas_v2_integrations_list_rendered:  [],
  saas_v2_integration_recommended:     [],
  saas_v2_review_drafted:              [],
  saas_v2_help_answer_rendered:        [],
  saas_v2_qa_rendered:                 [],
  saas_v2_qa_run:                      [],
  saas_v2_settings_updated:            [],
  saas_v2_settings_suggestion_applied: [],
};

export const CLIENT_VISIBLE_TYPES: ReadonlySet<AgencyEventType> = new Set<AgencyEventType>([
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

// Legacy/wave-1 shape: severity optional, fire-and-forget result.
export interface EmitArgs<T extends AgencyEventType = AgencyEventType> {
  client_id: string;
  agent_name: string;
  type: T;
  severity?: Severity;
  payload: Record<string, unknown>;
  why_explanation?: string;
}

export interface EmitResult {
  ok: boolean;
  error?: string;
  id?: string;
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

function validatePayload(
  type: AgencyEventType,
  payload: Record<string, unknown>,
  agent_name: string,
): Record<string, unknown> {
  const schema = EVENT_SCHEMAS[type] as z.ZodTypeAny | undefined;
  if (!schema) {
    console.warn(`[emit-agency-event] no schema registered for type=${type} agent=${agent_name}`);
    throw new Error(`emit-agency-event: unknown event type "${type}"`);
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      code: i.code,
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

function buildMirrorPayload(
  input: EmitAgencyEventInput,
  validated: Record<string, unknown>,
): Record<string, unknown> {
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
 * Two calling conventions are supported for backward compatibility:
 *   - Wave-2/3 (strict): severity required, throws on failure, returns id string.
 *   - Wave-1 (fire-and-forget): severity optional; SaaS V2 surface callers may
 *     use this shape — the function never throws but returns { ok, error, id }.
 *
 * To preserve the strict throw-on-failure behavior for the kernel write path,
 * the function still throws when severity is provided (wave-2/3 callers). When
 * severity is omitted, it falls back to fire-and-forget semantics for telemetry
 * callers that should never break the user-facing primary write.
 */
export async function emitAgencyEvent<T extends AgencyEventType>(
  input: EmitAgencyEventInput<T>,
): Promise<string>;
export async function emitAgencyEvent<T extends AgencyEventType>(
  input: EmitArgs<T>,
): Promise<EmitResult>;
export async function emitAgencyEvent<T extends AgencyEventType>(
  input: EmitAgencyEventInput<T> | EmitArgs<T>,
): Promise<string | EmitResult> {
  const fireAndForget = !('severity' in input) || input.severity === undefined ||
    (input.severity !== 'debug' && input.severity !== 'info' && input.severity !== 'warn' &&
     input.severity !== 'error' && input.severity !== 'critical');

  // Determine severity: default to 'info' for fire-and-forget callers.
  const severity: AgencyEventSeverity = (input.severity as AgencyEventSeverity) ?? 'info';

  try {
    const validated = validatePayload(input.type, input.payload, input.agent_name);
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('agency_events')
      .insert({
        client_id: input.client_id,
        agent_name: input.agent_name,
        type: input.type,
        severity,
        payload: validated,
        why_explanation: input.why_explanation ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.warn(
        `[emit-agency-event] agency_events insert failed type=${input.type} ` +
        `agent=${input.agent_name} err=${error?.message ?? 'no data returned'}`,
      );
      // Fall back to aios_event_log directly for fire-and-forget callers.
      if (fireAndForget) {
        const fallback = await supabase.from('aios_event_log').insert({
          workspace_id: input.client_id,
          source: input.agent_name,
          event_type: input.type,
          severity,
          payload: validated,
        });
        if (fallback.error) {
          return { ok: false, error: fallback.error.message };
        }
        return { ok: true };
      }
      throw new Error(
        `emit-agency-event: failed to insert agency_events row: ${error?.message ?? 'unknown'}`,
      );
    }

    const normalizedInput: EmitAgencyEventInput<T> = {
      client_id: input.client_id,
      agent_name: input.agent_name,
      type: input.type,
      severity,
      payload: input.payload,
      why_explanation: input.why_explanation,
    };
    await mirrorToAiosEventLog(supabase, normalizedInput, validated, data.id as string);

    if (fireAndForget) {
      return { ok: true, id: data.id as string };
    }
    return data.id as string;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (fireAndForget) {
      console.warn(`[emit-agency-event] emit threw for "${input.type}":`, message);
      return { ok: false, error: message };
    }
    throw err;
  }
}

/**
 * Emit a batch of agency events in a single insert (perf path for hourly
 * monitors that may emit 50-500 events at once). Validation is run per-event
 * BEFORE any insert — if ANY event fails validation, the whole batch is
 * rejected.
 */
export async function emitAgencyEvents(
  inputs: ReadonlyArray<EmitAgencyEventInput>,
): Promise<string[]> {
  if (inputs.length === 0) return [];

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
    why_explanation: event.why_explanation,
    created_at: event.created_at,
  };
}

// ── 7. SaaS V2 sibling emitter ──────────────────────────────────────────────

export type SaasV2EventType =
  | 'saas_v2_ask_ai_query'
  | 'saas_v2_narrative_rendered'
  | 'saas_v2_call_drawer_opened'
  | 'saas_v2_home_rendered'
  | 'saas_v2_calls_list_rendered'
  | 'saas_v2_leads_list_rendered'
  | 'saas_v2_messages_list_rendered'
  | 'saas_v2_agent_stress_test_run'
  | 'saas_v2_knowledge_gap_detected'
  | 'saas_v2_lead_drawer_opened'
  | 'saas_v2_message_reply_drafted'
  | 'saas_v2_agent_summary_rendered'
  | 'saas_v2_kb_draft_accepted'
  | 'saas_v2_message_thread_opened'
  | 'saas_v2_agent_suggest_edits'
  | 'saas_v2_integrations_list_rendered'
  | 'saas_v2_integration_recommended'
  | 'saas_v2_review_drafted'
  | 'saas_v2_help_answer_rendered'
  | 'saas_v2_qa_rendered'
  | 'saas_v2_qa_run'
  | 'saas_v2_settings_updated'
  | 'saas_v2_settings_suggestion_applied';

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
    console.warn(
      `[emit-saas-v2-event] swallowed type=${input.type} workspace=${
        input.workspace_id
      } err=${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Schema introspection — exported for tests and for the docs generator.
 */
export const __INTERNAL_EVENT_SCHEMAS = EVENT_SCHEMAS;
export const __INTERNAL_CLIENT_VISIBLE_FIELDS = CLIENT_VISIBLE_FIELDS;
export const __INTERNAL_CLIENT_VISIBLE_TYPES = CLIENT_VISIBLE_TYPES;
