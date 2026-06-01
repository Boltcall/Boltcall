-- ═══════════════════════════════════════════════════════════════════════════
-- V2 Setup Wizard — state version pinning (anti-TOCTOU for finalize)
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds a monotonic counter that is bumped every time `v2_setup_state` is
-- mutated by the conversation endpoint. The finalize endpoint requires the
-- client to echo the version it last saw; mismatch = 409 Conflict, so a
-- second tab (or a stolen-token attacker mutating state between review and
-- deploy) cannot ship a different draft than the one the user approved.
--
-- Default 0 means existing in-flight workspaces don't break — the first save
-- from the conversation endpoint will bump them to 1.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS v2_setup_state_version bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.workspaces.v2_setup_state_version IS
  'Monotonic counter incremented every time v2_setup_state is mutated by '
  'saas-v2-setup-conversation. The client echoes the last-seen version on '
  'finalize; mismatch = 409 (someone else mutated state mid-deploy). '
  'Default 0 — first save bumps to 1, no backfill needed.';
