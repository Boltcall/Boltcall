-- Task 9 (batch3-10x-plan), safe/reframed version: "call your own number, see
-- how fast Boltcall answers" — not the original "call a competitor" brief,
-- which the plan doc flags as TCPA/prank-call-adjacent for a public form.
CREATE TABLE IF NOT EXISTS response_time_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT UNIQUE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  dialed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'dialed' CHECK (status IN ('dialed', 'answered', 'no_answer', 'report_sent')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_time_demos_call_id ON response_time_demos(call_id);

-- Public insert (unauthenticated demo form) + service-role-only read/update.
-- Matches the no-owner-auth shape of homepage_demo_ip/phone rate-limit buckets
-- this table sits alongside — there's no user_id, so no owner-scoped policy.
ALTER TABLE response_time_demos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_response_time_demos" ON response_time_demos;
CREATE POLICY "service_role_all_response_time_demos" ON response_time_demos FOR ALL USING (auth.role() = 'service_role');
