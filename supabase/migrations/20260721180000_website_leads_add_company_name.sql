-- Website Audit lead magnet needs the business name alongside url/email.
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS company_name text;
