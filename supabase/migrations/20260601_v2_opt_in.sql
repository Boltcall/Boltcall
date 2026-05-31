-- ═══════════════════════════════════════════════════════════════════════════
-- V2 Opt-In Flag — workspaces.v2_enabled
-- ═══════════════════════════════════════════════════════════════════════════
--
-- What this migration does:
--   Adds a single boolean opt-in flag to the `workspaces` table so individual
--   workspaces can be promoted to the V2 experience without touching the V1
--   codebase (per plan `i-ahev-so-much-steady-frog.md`, Week 1 Track C).
--
-- Paired surface points (NOT in this file — do NOT edit V1):
--   - src/routes/AppRoutes.tsx       — /v2/* route tree reads this flag
--   - V1 Settings page               — opt-in toggle writes this flag
--   - netlify/functions/_shared/     — auth helpers can gate on v2_enabled
--
-- Semantics:
--   false (default) — workspace sees V1 dashboard at /dashboard/*
--   true            — workspace is routed to V2 dashboard at /v2/*
--   The migration is fully reversible: UPDATE workspaces SET v2_enabled = false
--   reverts any workspace instantly without data loss.
--
-- Conventions match `20260325_team_rbac_workspace.sql`:
--   snake_case identifiers, ALTER TABLE … ADD COLUMN IF NOT EXISTS,
--   CREATE INDEX IF NOT EXISTS, partial index where cardinality is skewed.
--
-- When applied:
--   2026-06-01 — Week 1 Track C of the V2 opt-in shadow rollout.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Add opt-in column ──────────────────────────────────────────────────

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS v2_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspaces.v2_enabled IS
  'Opt-in flag for the V2 dashboard experience. '
  'When true, this workspace is routed to /v2/* instead of /dashboard/*. '
  'Paired with the /v2/* route tree in src/routes/AppRoutes.tsx and the '
  'opt-in toggle in the V1 Settings page. '
  'Set to false at any time to revert — no data loss occurs. '
  'Default false: all existing workspaces remain on V1 until explicitly opted in.';


-- ─── 2. Partial index (only opted-in workspaces indexed) ──────────────────
--
-- Most workspaces will have v2_enabled = false for the foreseeable future
-- (shadow rollout). A partial index on the true minority avoids bloating the
-- index and keeps RLS + routing queries O(1) for the opted-in set.

CREATE INDEX IF NOT EXISTS idx_workspaces_v2_enabled
  ON public.workspaces (v2_enabled)
  WHERE v2_enabled = true;
