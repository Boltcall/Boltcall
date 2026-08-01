-- Missed-call SMS hardening: enrollment dedup backstop + opt-out blocklist

-- One active enrollment per (user, phone, sequence). Application code
-- pre-checks before enrolling; this index closes the race between two
-- concurrent webhook invocations. sequence_id is included so a user with
-- multiple active sequences for the same trigger can still enroll a
-- contact in each of them within one webhook run.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_enrollment_per_contact
  ON followup_enrollments (user_id, contact_phone, sequence_id)
  WHERE status = 'active';

-- Global SMS opt-out list (TCPA). All outbound SMS share one Twilio
-- from-number, so a STOP applies platform-wide, keyed by phone alone.
-- user_id records whose number received the STOP, for context only.
CREATE TABLE IF NOT EXISTS sms_optouts (
  phone TEXT PRIMARY KEY,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service-role access only — no client policies.
ALTER TABLE sms_optouts ENABLE ROW LEVEL SECURITY;
