-- Schema reconciliation: retell_prompt_versions was created via MCP out-of-band
-- and its DDL never landed in supabase/migrations/. This file makes the repo
-- the source of truth. Idempotent — safe to run against the live DB where the
-- table already exists (verified against live PostgREST schema 2026-07-11).
--
-- FSM statuses observed in code: proposed → benchmark_passed → cekura_passed
--   → shadowing → live | reverted | superseded | rejected
--   (+ ab_testing added by batch-2 task 6)

CREATE TABLE IF NOT EXISTS public.retell_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text,
  vertical text,
  agent_id uuid,
  version integer,
  prompt_text text,
  parent_id uuid,
  status text,
  created_by text,
  diff_summary text,
  benchmark_score numeric,
  cekura_pass_rate numeric,
  shadow_book_rate numeric,
  applied_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz DEFAULT now(),
  cekura_result_id text,
  cekura_agent_id text,
  cekura_temp_llm_id text,
  shadow_started_at timestamptz,
  shadow_ended_at timestamptz,
  rollback_data jsonb,
  shadow_agent_ids text[]
);

-- Column-level guards for drift between environments.
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS diff_summary text;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS benchmark_score numeric;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS cekura_pass_rate numeric;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS shadow_book_rate numeric;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS cekura_result_id text;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS cekura_agent_id text;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS cekura_temp_llm_id text;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS shadow_started_at timestamptz;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS shadow_ended_at timestamptz;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS rollback_data jsonb;
ALTER TABLE public.retell_prompt_versions ADD COLUMN IF NOT EXISTS shadow_agent_ids text[];

CREATE INDEX IF NOT EXISTS idx_rpv_status_vertical
  ON public.retell_prompt_versions (status, vertical);
