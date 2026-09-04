-- Harden demo_sessions.
--
-- The landing page never reads this table directly: demo-web-call (service
-- role) is the only reader, keyed by the session id the client already holds.
-- The anon "public_select" policy exposed every prospect row to anyone with
-- the anon key. public_insert is left as-is (daily-facebook skill inserts via
-- anon MCP); demo-session-create also inserts with the service role.

DROP POLICY IF EXISTS "public_select" ON demo_sessions;

REVOKE SELECT ON TABLE demo_sessions FROM anon;
REVOKE SELECT ON TABLE demo_sessions FROM authenticated;

CREATE POLICY "Service role full access" ON demo_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
