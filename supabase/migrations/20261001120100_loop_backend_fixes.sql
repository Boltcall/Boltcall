-- Self-improving call loop backend fixes (branch loop-backend).
-- Apply BEFORE deploying the matching functions.

-- 1. RLS: retell_calls.workspace_id is a workspaces.id (FK), never a user id,
--    so `workspace_id = auth.uid()` hid every call from its customer.
--    Same owner pattern as leads/chats/agents (launch_hardening), plus active
--    team members (workspace_members.workspace_id = owner's auth uid, classic
--    convention).
DROP POLICY IF EXISTS users_view_own_workspace_calls ON public.retell_calls;
CREATE POLICY users_view_own_workspace_calls ON public.retell_calls
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.user_id = (SELECT auth.uid())
       OR w.user_id IN (
         SELECT wm.workspace_id FROM public.workspace_members wm
         WHERE wm.user_id = (SELECT auth.uid()) AND wm.status = 'active'
       )
  ));

-- The subquery on retell_calls runs under retell_calls' own RLS, so a score
-- is visible exactly when its call is.
DROP POLICY IF EXISTS users_view_own_call_scores ON public.retell_call_scores;
CREATE POLICY users_view_own_call_scores ON public.retell_call_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.retell_calls c WHERE c.call_id = retell_call_scores.call_id
  ));

-- 2. Per-call report written by retell-call-scorer.
--    {status:'scored', summary, went_well, went_wrong, top_improvement, weighted_score, law_firm}
--    or {status:'failed', error} when the judge LLM failed (no score rows written).
ALTER TABLE public.retell_calls ADD COLUMN IF NOT EXISTS score_report jsonb;

-- 3. Statuses the code already writes but prod's CHECK rejected:
--    'superseded' (shadow-monitor retires the previous live version) and
--    'ab_testing' (retell-ab-start).
ALTER TABLE public.retell_prompt_versions DROP CONSTRAINT IF EXISTS retell_prompt_versions_status_check;
ALTER TABLE public.retell_prompt_versions ADD CONSTRAINT retell_prompt_versions_status_check
  CHECK (status = ANY (ARRAY['proposed', 'benchmark_passed', 'cekura_passed', 'shadowing', 'ab_testing', 'live', 'superseded', 'reverted', 'rejected']));

-- 4. Approve-first self-heal: a verified fix (or an objection-miner
--    suggestion) waits as 'pending_approval' until the owner approves it in
--    /dashboard/qa/review; reject -> 'rejected'.
ALTER TABLE public.agent_self_heal_log DROP CONSTRAINT IF EXISTS agent_self_heal_log_status_check;
ALTER TABLE public.agent_self_heal_log ADD CONSTRAINT agent_self_heal_log_status_check
  CHECK (status = ANY (ARRAY['analyzing', 'reproducing', 'fixing', 'testing', 'pending_approval', 'fixed', 'rejected', 'reverted', 'failed']));
