-- ─────────────────────────────────────────────────────────────────────────────
-- Add client-portal preference columns to agency_clients.
-- ─────────────────────────────────────────────────────────────────────────────
-- Backs the /client/settings page (Phase E). Columns are all nullable / default
-- so existing rows remain valid, and so the portal degrades gracefully when a
-- client has never opened settings.
--
-- All four are jsonb / bool. Schema for each documented in column COMMENTs so
-- the next reader knows what shape the UI writes — without having to grep the
-- TS adapters.

ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS business_hours jsonb,
  ADD COLUMN IF NOT EXISTS notifications jsonb,
  ADD COLUMN IF NOT EXISTS auto_approve_low_risk boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secrets jsonb,
  ADD COLUMN IF NOT EXISTS preferred_voice_id text,
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;

COMMENT ON COLUMN public.agency_clients.business_hours IS
  'Per-weekday open/close. Shape: { "mon": { "open": "09:00", "close": "17:00", "closed": false }, ... }. NULL until client edits. Timezone is the row''s `timezone` column.';

COMMENT ON COLUMN public.agency_clients.notifications IS
  'Notification routing per severity. Shape: { "critical": ["sms","push"], "digest": ["email"], "weekly_report": ["email"] }. Channels: "sms","push","email","slack". Empty array silences that severity.';

COMMENT ON COLUMN public.agency_clients.auto_approve_low_risk IS
  'When true, the /client/approvals queue auto-applies any draft artifact older than 72h whose risk_level is "low". Default false (explicit supervision).';

COMMENT ON COLUMN public.agency_clients.secrets IS
  'Per-client adapter secrets (Slack webhook url, etc.). Shape: { "slack_webhook_url": "https://...", "slack_channel_overrides": { "critical": "C123" } }. Service-role writes only; never readable via RLS from the client surface — only the slack-adapter (via service supabase) touches this.';

COMMENT ON COLUMN public.agency_clients.preferred_voice_id IS
  'ElevenLabs voice_id selected by the client in /client/settings VoicePicker. NULL = use vertical default.';

COMMENT ON COLUMN public.agency_clients.paused_until IS
  'Smart pause — when set in the future, the agent is paused and auto-resumes at this timestamp. NULL = active.';
