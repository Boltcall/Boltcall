-- Website audit step 2 asks lead volume + average job value. Together they drive
-- the missed-call revenue estimate in the report, and size the lead for sales.
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS monthly_leads  text,
  ADD COLUMN IF NOT EXISTS avg_job_value  text;
