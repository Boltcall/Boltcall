-- Break Our AI Challenge — winners prize-claim log
-- Written by netlify/functions/break-our-ai.ts (path /winner) via service role.

CREATE TABLE IF NOT EXISTS public.challenge_winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  website_url TEXT,
  phone TEXT,
  city TEXT,
  biggest_challenge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_winners_email ON public.challenge_winners(email);
CREATE INDEX IF NOT EXISTS idx_challenge_winners_created_at ON public.challenge_winners(created_at DESC);

ALTER TABLE public.challenge_winners ENABLE ROW LEVEL SECURITY;

-- Service role (Netlify functions) is the only writer. No anon access.
DROP POLICY IF EXISTS "Service role full access" ON public.challenge_winners;
CREATE POLICY "Service role full access" ON public.challenge_winners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.challenge_winners FROM anon, authenticated;
