-- Batch-2 Task 6: confirmed-booking attribution + A/B testing surface.
--
-- 1. appointments.call_id — links a confirmed booking to the retell call that
--    produced it. Populated by agent-tools (direct) and appointment-handler
--    (best-effort phone match). Nullable; text to match retell_calls.call_id.
-- 2. RLS: let an agent's owner read that agent's prompt-version experiments
--    so AgentDetailPage can render the experiment card (writes stay
--    service-role only).

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_id text;
CREATE INDEX IF NOT EXISTS idx_appointments_call_id
  ON public.appointments (call_id) WHERE call_id IS NOT NULL;

DROP POLICY IF EXISTS users_view_own_agent_prompt_versions ON public.retell_prompt_versions;
CREATE POLICY users_view_own_agent_prompt_versions ON public.retell_prompt_versions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = retell_prompt_versions.agent_id
      AND a.user_id = auth.uid()
  ));
