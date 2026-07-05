-- P1 follow-up: retell_calls + retell_call_scores had RLS enabled but no
-- policies, which meant the dashboard couldn't read call history through
-- the anon client. Backend (service_role) was still writing to them via
-- the retell webhook; users just couldn't see the results.
--
-- Adds:
--   - retell_calls: SELECT for the user whose workspace_id matches auth.uid()
--   - retell_call_scores: SELECT for the parent call's owner
--
-- Writes remain service-role only.
--
-- Applied via MCP on 2026-07-05; SQL kept here for repo tracking.
-- Refs: docs/v1-production-readiness-plan.md P1 RLS-no-policy follow-up

CREATE POLICY users_view_own_workspace_calls ON public.retell_calls
  FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY users_view_own_call_scores ON public.retell_call_scores
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.retell_calls c
    WHERE c.call_id = retell_call_scores.call_id
      AND c.workspace_id = auth.uid()
  ));
