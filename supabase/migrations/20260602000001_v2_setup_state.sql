-- ═══════════════════════════════════════════════════════════════════════════
-- V2 Conversational Setup Wizard — persistent state on workspaces
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds JSONB conversation/draft storage to workspaces so that the V2
-- conversational setup wizard survives page refreshes, device switches, and
-- mid-flight network errors. Replaces the V1 localStorage-only persistence
-- which was per-device and lost on logout.
--
-- Shape of v2_setup_state JSONB:
-- {
--   "conversation": [{"role":"assistant|user","content":"...","ts":"..."}],
--   "extracted": {
--     "businessName": "...",
--     "websiteUrl": "...",
--     "industry": "...",
--     "country": "...",
--     "city": "...","state": "...","addressLine1": "...","postalCode": "...",
--     "businessPhone": "...",
--     "openingHours": {...},
--     "languages": ["en"],
--     "serviceAreas": [...],
--     "services": [{"name":"...","duration":30,"price":0}],
--     "faqs": [{"question":"...","answer":"..."}],
--     "policies": {"cancellation":"...","reschedule":"...","deposit":"..."},
--     "agentConfig": {"agentName":"...","voiceId":"11labs-Adrian","tone":"friendly_concise","transferNumber":"..."},
--     "callFlow": {...}
--   },
--   "wizard_step": "intake|kb_extract|review|deploying",
--   "scrape_source": "firecrawl|n8n_fallback|basic",
--   "scrape_chars": 12345
-- }
--
-- This migration is idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS v2_setup_state jsonb,
  ADD COLUMN IF NOT EXISTS v2_setup_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS v2_setup_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS v2_setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS v2_setup_conversation_id text;

-- Add the status CHECK constraint via DO block so it stays idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_v2_setup_status_check'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_v2_setup_status_check
      CHECK (v2_setup_status IN ('not_started','in_progress','completed','abandoned'));
  END IF;
END$$;

-- Index for finding stuck / in-progress wizards (e.g. for stall-recovery cron)
CREATE INDEX IF NOT EXISTS idx_workspaces_v2_setup_status
  ON public.workspaces (v2_setup_status)
  WHERE v2_setup_status IN ('in_progress','abandoned');

-- Index for resuming by conversation_id from the client
CREATE INDEX IF NOT EXISTS idx_workspaces_v2_setup_conversation_id
  ON public.workspaces (v2_setup_conversation_id)
  WHERE v2_setup_conversation_id IS NOT NULL;

COMMENT ON COLUMN public.workspaces.v2_setup_state IS
  'V2 conversational wizard state. JSONB containing {conversation, extracted, wizard_step, scrape_source, scrape_chars}. NULL once wizard completes.';
COMMENT ON COLUMN public.workspaces.v2_setup_status IS
  'V2 wizard lifecycle: not_started | in_progress | completed | abandoned.';
COMMENT ON COLUMN public.workspaces.v2_setup_conversation_id IS
  'Client-shareable opaque id for resuming a V2 wizard session.';
