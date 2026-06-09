-- Harden the legacy challenge_attempts table.
--
-- The Netlify functions expose the challenge leaderboard/stats. Direct anon or
-- authenticated table access is not needed, and broad USING (true) policies are
-- risky if table grants drift later.

ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON challenge_attempts;
DROP POLICY IF EXISTS "Public can read challenge attempts" ON challenge_attempts;

REVOKE ALL ON TABLE challenge_attempts FROM anon;
REVOKE ALL ON TABLE challenge_attempts FROM authenticated;

CREATE POLICY "Service role full access" ON challenge_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
