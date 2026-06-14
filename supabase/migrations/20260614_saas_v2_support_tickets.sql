-- Durable support trail for V2 help escalations.
-- The V2 help assistant can notify humans immediately, but customer support
-- also needs an auditable queue of what was asked, what the AI answered, and
-- what workspace diagnostics were visible at the time.

CREATE TABLE IF NOT EXISTS public.saas_v2_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workspace_name text NOT NULL DEFAULT 'Workspace',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high', 'urgent')),
  source text NOT NULL DEFAULT 'v2_help',
  current_page text,
  recent_action text,
  question text NOT NULL,
  answer_preview text NOT NULL DEFAULT '',
  diagnostics_snapshot text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_to text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_v2_support_tickets_workspace_created
  ON public.saas_v2_support_tickets(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_v2_support_tickets_status_priority
  ON public.saas_v2_support_tickets(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_v2_support_tickets_user_created
  ON public.saas_v2_support_tickets(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_saas_v2_support_tickets_updated_at ON public.saas_v2_support_tickets;
CREATE TRIGGER trg_saas_v2_support_tickets_updated_at
BEFORE UPDATE ON public.saas_v2_support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.saas_v2_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_v2_support_tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_v2_support_tickets_owner_select ON public.saas_v2_support_tickets;
CREATE POLICY saas_v2_support_tickets_owner_select
  ON public.saas_v2_support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS saas_v2_support_tickets_founder_all ON public.saas_v2_support_tickets;
CREATE POLICY saas_v2_support_tickets_founder_all
  ON public.saas_v2_support_tickets
  FOR ALL
  TO authenticated
  USING (public.is_founder())
  WITH CHECK (public.is_founder());

REVOKE ALL ON public.saas_v2_support_tickets FROM anon;
GRANT SELECT ON public.saas_v2_support_tickets TO authenticated;
GRANT ALL ON public.saas_v2_support_tickets TO service_role;

COMMENT ON TABLE public.saas_v2_support_tickets IS
  'Durable queue of V2 help assistant escalations. Inserted by service-role Netlify functions; users can read their own tickets.';
