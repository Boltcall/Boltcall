-- Security hardening for public demo/challenge endpoints.
-- Public visitors can still consume demo links through Netlify functions, but
-- direct anonymous table reads are removed so prospect context is not exposed.

CREATE TABLE IF NOT EXISTS public_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  key text NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, key)
);

CREATE INDEX IF NOT EXISTS idx_public_rate_limits_window
  ON public_rate_limits(bucket, window_start);

ALTER TABLE public_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public_rate_limits;
CREATE POLICY "Service role full access" ON public_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE demo_sessions
  ADD COLUMN IF NOT EXISTS web_call_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS web_call_count integer NOT NULL DEFAULT 0 CHECK (web_call_count >= 0);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_web_call_started_at
  ON demo_sessions(web_call_started_at);

DROP POLICY IF EXISTS "public_select" ON demo_sessions;
DROP POLICY IF EXISTS "public_insert" ON demo_sessions;

DROP POLICY IF EXISTS "Service role full access" ON demo_sessions;
CREATE POLICY "Service role full access" ON demo_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
