-- 20260531 — add missed_call columns to business_features
--
-- MissedCallsPage.tsx, retell-webhook.ts, and ai-assistant.ts all reference
-- business_features.missed_call_config (jsonb) and
-- business_features.missed_call_textback_enabled (bool), but neither column
-- ever existed. Result: the Missed-Call Recovery feature was silently broken
-- end to end:
--
--   • MissedCallsPage save returned a 400 the page swallowed in catch,
--     so the UI showed the empty state instead of the user's saved config.
--   • retell-webhook couldn't read the textback config when a real missed
--     call fired — the auto-text-back never sent.
--   • ai-assistant's chat command "Enable missed call textback" no-op'd.
--
-- Found in the 2026-05-31 pre-ship QA. The "Set up Missed-Call Recovery" card
-- on the Getting Started checklist points at this feature, so leaving it
-- broken would be a visible ship-day regression.
--
-- Fix: add both columns with safe defaults. Pure additive — Postgres backfills
-- existing rows automatically and no existing query can be broken by columns
-- it doesn't reference.

ALTER TABLE public.business_features
  ADD COLUMN IF NOT EXISTS missed_call_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS missed_call_textback_enabled boolean DEFAULT false;
