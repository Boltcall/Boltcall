-- P0.4: add phone + source columns to public.website_leads so the
-- speed-test /offer submit and future lead-capture flows can persist
-- the incoming form fields.
--
-- Refs: docs/v1-production-readiness-plan.md P0.4

ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS phone  text,
  ADD COLUMN IF NOT EXISTS source text;
