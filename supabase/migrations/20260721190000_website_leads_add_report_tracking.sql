-- The Modal website-audit app writes back where/when the generated PDF landed.
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS report_url text,
  ADD COLUMN IF NOT EXISTS report_generated_at timestamptz;
