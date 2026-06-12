-- V1 self-improvement loop persistence.
--
-- These tables back:
-- - conversation-outcome.ts: records wins or triggers self-heal
-- - agent-self-heal.ts: stores heal attempts and QA review items
-- - AgentTestsPage.tsx: stores manual stress-test runs
-- - QAReviewPage / QAAnalyticsPage / dashboard cards: read owner-scoped history

CREATE TABLE IF NOT EXISTS public.conversation_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  channel text NOT NULL DEFAULT 'unknown',
  outcome_type text NOT NULL CHECK (outcome_type IN ('booked', 'answered', 'unresolved')),
  conversation_id text,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_wins
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS outcome_type text,
  ADD COLUMN IF NOT EXISTS conversation_id text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.agent_self_heal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_id text NOT NULL,
  call_id text,
  failure_type text,
  failure_summary text,
  root_cause text,
  severity text,
  reproduced_count integer NOT NULL DEFAULT 0,
  original_prompt text,
  prompt_fix_applied text,
  fix_verified boolean,
  fix_success_rate numeric,
  fix_pass_count integer,
  fix_total_runs integer,
  prompt_reverted boolean NOT NULL DEFAULT false,
  elapsed_ms integer,
  status text,
  heal_iterations integer NOT NULL DEFAULT 0,
  failed_scenario_labels text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_self_heal_log
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS call_id text,
  ADD COLUMN IF NOT EXISTS failure_type text,
  ADD COLUMN IF NOT EXISTS failure_summary text,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS reproduced_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_prompt text,
  ADD COLUMN IF NOT EXISTS prompt_fix_applied text,
  ADD COLUMN IF NOT EXISTS fix_verified boolean,
  ADD COLUMN IF NOT EXISTS fix_success_rate numeric,
  ADD COLUMN IF NOT EXISTS fix_pass_count integer,
  ADD COLUMN IF NOT EXISTS fix_total_runs integer,
  ADD COLUMN IF NOT EXISTS prompt_reverted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elapsed_ms integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS heal_iterations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_scenario_labels text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  call_id text,
  heal_log_id uuid,
  call_type text NOT NULL CHECK (call_type IN ('success', 'failure')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  rubric_scores jsonb,
  overall_score numeric,
  friction_score numeric,
  auto_summary text,
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_reviews
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS call_id text,
  ADD COLUMN IF NOT EXISTS heal_log_id uuid,
  ADD COLUMN IF NOT EXISTS call_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rubric_scores jsonb,
  ADD COLUMN IF NOT EXISTS overall_score numeric,
  ADD COLUMN IF NOT EXISTS friction_score numeric,
  ADD COLUMN IF NOT EXISTS auto_summary text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.qa_success_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  call_id text,
  qa_review_id uuid,
  friction_points text[] NOT NULL DEFAULT ARRAY[]::text[],
  positive_patterns text[] NOT NULL DEFAULT ARRAY[]::text[],
  improvement_suggestions text[] NOT NULL DEFAULT ARRAY[]::text[],
  friction_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_success_insights
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS call_id text,
  ADD COLUMN IF NOT EXISTS qa_review_id uuid,
  ADD COLUMN IF NOT EXISTS friction_points text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS positive_patterns text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS improvement_suggestions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS friction_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.agent_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  test_type text NOT NULL DEFAULT 'manual',
  scenarios_total integer NOT NULL DEFAULT 0,
  scenarios_passed integer NOT NULL DEFAULT 0,
  scenarios_failed integer NOT NULL DEFAULT 0,
  scenarios_unknown integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_source text,
  elapsed_ms integer,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_test_runs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS test_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS scenarios_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scenarios_passed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scenarios_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scenarios_unknown integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS results jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trigger_source text,
  ADD COLUMN IF NOT EXISTS elapsed_ms integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversation_wins_user_created
  ON public.conversation_wins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_wins_agent_created
  ON public.conversation_wins(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_self_heal_log_user_created
  ON public.agent_self_heal_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_self_heal_log_agent_created
  ON public.agent_self_heal_log(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qa_reviews_user_created
  ON public.qa_reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_reviews_heal_log
  ON public.qa_reviews(heal_log_id);

CREATE INDEX IF NOT EXISTS idx_qa_success_insights_review
  ON public.qa_success_insights(qa_review_id);
CREATE INDEX IF NOT EXISTS idx_qa_success_insights_user_created
  ON public.qa_success_insights(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_test_runs_user_created
  ON public.agent_test_runs(user_id, created_at DESC);

ALTER TABLE public.conversation_wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_self_heal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_success_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage conversation wins" ON public.conversation_wins;
CREATE POLICY "Owner can manage conversation wins"
  ON public.conversation_wins FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Owner can manage self heal logs" ON public.agent_self_heal_log;
CREATE POLICY "Owner can manage self heal logs"
  ON public.agent_self_heal_log FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Owner can manage QA reviews" ON public.qa_reviews;
CREATE POLICY "Owner can manage QA reviews"
  ON public.qa_reviews FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Owner can manage QA success insights" ON public.qa_success_insights;
CREATE POLICY "Owner can manage QA success insights"
  ON public.qa_success_insights FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Owner can manage agent test runs" ON public.agent_test_runs;
CREATE POLICY "Owner can manage agent test runs"
  ON public.agent_test_runs FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

REVOKE ALL ON public.conversation_wins FROM anon;
REVOKE ALL ON public.agent_self_heal_log FROM anon;
REVOKE ALL ON public.qa_reviews FROM anon;
REVOKE ALL ON public.qa_success_insights FROM anon;
REVOKE ALL ON public.agent_test_runs FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.conversation_wins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_self_heal_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qa_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qa_success_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_test_runs TO authenticated;
