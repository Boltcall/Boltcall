CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.app_secrets IS
  'Server-side platform secrets read only with the Supabase service role. Never expose this table to browser clients.';

DROP POLICY IF EXISTS app_secrets_service_role_all ON public.app_secrets;
CREATE POLICY app_secrets_service_role_all
  ON public.app_secrets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

