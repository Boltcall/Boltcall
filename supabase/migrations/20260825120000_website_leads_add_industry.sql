-- Website Audit flow now asks industry on step 1 to personalize the PDF report.
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS industry text;
