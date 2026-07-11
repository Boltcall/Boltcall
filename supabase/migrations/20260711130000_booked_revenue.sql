-- Booked-revenue foundation: dollar value on appointments + services catalog
-- Live appointments schema verified 2026-07-11 via PostgREST OpenAPI dump
-- (no in-repo DDL for appointments — columns confirmed before this ALTER).

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS estimated_value_cents integer;

-- Services catalog — onboarding collects name/price/duration but only fed
-- the agent prompt until now. This table makes prices queryable so bookings
-- can be valued.
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid,
  name text NOT NULL,
  price_cents integer,
  duration_min integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_user ON services(user_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_manage_own_services ON public.services
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Global fallback when a booking's service doesn't match the catalog
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS avg_deal_value_cents integer;
