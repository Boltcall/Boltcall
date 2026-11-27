-- New firms' SMS agent answers instantly (speed-to-lead) instead of drafting.
-- Existing rows keep whatever the owner saved.
ALTER TABLE sms_settings ALTER COLUMN auto_reply_enabled SET DEFAULT true;
