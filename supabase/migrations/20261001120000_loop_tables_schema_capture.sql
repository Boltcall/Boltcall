-- Schema capture: these self-improving-loop tables were created out-of-band
-- (MCP) and never had CREATE TABLE in the repo. Mirrors the LIVE prod schema
-- (information_schema + pg_constraint + pg_indexes, read 2026-10-01).
-- Idempotent: a no-op on prod, builds the tables on a fresh database.
-- RLS policies live in 20261001120100_loop_backend_fixes.sql.

CREATE TABLE IF NOT EXISTS public.retell_eval_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  persona text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty = ANY (ARRAY['easy', 'medium', 'hard'])),
  category text NOT NULL,
  opening_line text NOT NULL,
  conversation_branches jsonb DEFAULT '[]'::jsonb,
  expected_outcome text NOT NULL,
  must_say text[],
  must_not_say text[],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retell_eval_scenarios_vertical ON public.retell_eval_scenarios (vertical, enabled);

CREATE TABLE IF NOT EXISTS public.retell_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope = ANY (ARRAY['template', 'customer'])),
  vertical text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  version integer NOT NULL,
  prompt_text text NOT NULL,
  parent_id uuid REFERENCES public.retell_prompt_versions(id),
  status text NOT NULL DEFAULT 'proposed' CONSTRAINT retell_prompt_versions_status_check
    CHECK (status = ANY (ARRAY['proposed', 'benchmark_passed', 'cekura_passed', 'shadowing', 'live', 'reverted', 'rejected'])),
  created_by text NOT NULL DEFAULT 'retell-improvement-loop',
  diff_summary text,
  benchmark_score numeric,
  cekura_pass_rate numeric,
  shadow_book_rate numeric,
  applied_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  cekura_result_id text,
  cekura_agent_id text,
  cekura_temp_llm_id text,
  shadow_started_at timestamptz,
  shadow_ended_at timestamptz,
  rollback_data jsonb DEFAULT '{}'::jsonb,
  shadow_agent_ids text[] DEFAULT '{}'::text[]
);
CREATE INDEX IF NOT EXISTS idx_retell_prompt_versions_agent ON public.retell_prompt_versions (agent_id, status) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retell_prompt_versions_vertical_status ON public.retell_prompt_versions (vertical, status);

CREATE TABLE IF NOT EXISTS public.retell_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid NOT NULL REFERENCES public.retell_prompt_versions(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.retell_eval_scenarios(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['local_benchmark', 'cekura'])),
  passed boolean,
  weighted_score numeric,
  dim_scores jsonb DEFAULT '{}'::jsonb,
  transcript text,
  failure_reason text,
  ran_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retell_eval_runs_version ON public.retell_eval_runs (prompt_version_id, source);

CREATE TABLE IF NOT EXISTS public.retell_calls (
  call_id text PRIMARY KEY,
  retell_agent_id text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vertical text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_s integer,
  transcript text,
  recording_url text,
  outcome text,
  call_type text DEFAULT 'inbound',
  cost_usd numeric,
  prompt_version_id uuid CONSTRAINT fk_retell_calls_prompt_version REFERENCES public.retell_prompt_versions(id) ON DELETE SET NULL,
  retell_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retell_calls_agent_started ON public.retell_calls (agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_retell_calls_vertical_started ON public.retell_calls (vertical, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_retell_calls_workspace ON public.retell_calls (workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_retell_calls_workspace_id ON public.retell_calls (workspace_id);

CREATE TABLE IF NOT EXISTS public.retell_call_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text NOT NULL REFERENCES public.retell_calls(call_id) ON DELETE CASCADE,
  dim text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 1),
  notes text,
  scored_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_id, dim)
);
CREATE INDEX IF NOT EXISTS idx_retell_call_scores_call ON public.retell_call_scores (call_id);
CREATE INDEX IF NOT EXISTS idx_retell_call_scores_dim_score ON public.retell_call_scores (dim, score);

CREATE TABLE IF NOT EXISTS public.qa_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.retell_eval_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_rubrics ENABLE ROW LEVEL SECURITY;

-- Prod policies for tables this capture owns (retell_calls / retell_call_scores
-- are rewritten in the next migration; retell_prompt_versions lives in
-- 20260924120000_launch_hardening.sql).
DROP POLICY IF EXISTS qa_rubrics_owner ON public.qa_rubrics;
CREATE POLICY qa_rubrics_owner ON public.qa_rubrics USING (user_id = auth.uid());
