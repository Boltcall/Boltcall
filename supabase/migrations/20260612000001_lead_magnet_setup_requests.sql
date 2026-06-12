CREATE TABLE IF NOT EXISTS public.lead_magnet_setup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_slug text NOT NULL CHECK (
    offer_slug IN (
      'after-hours-lead-rescue',
      'automatic-reviews-agent',
      'reminders-agent'
    )
  ),
  page_path text NOT NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  business_phone text NOT NULL,
  website text,
  industry text NOT NULL,
  sms_consent boolean NOT NULL DEFAULT false,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  automation_status text NOT NULL DEFAULT 'queued' CHECK (
    automation_status IN ('queued', 'sent', 'failed', 'not_configured')
  ),
  automation_error text,
  fulfillment_webhook_configured boolean NOT NULL DEFAULT false,
  source_ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_setup_requests_created
  ON public.lead_magnet_setup_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_setup_requests_offer
  ON public.lead_magnet_setup_requests(offer_slug, created_at DESC);

ALTER TABLE public.lead_magnet_setup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_setup_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lead_magnet_setup_requests FROM PUBLIC;
REVOKE ALL ON TABLE public.lead_magnet_setup_requests FROM anon;
REVOKE ALL ON TABLE public.lead_magnet_setup_requests FROM authenticated;
GRANT ALL ON TABLE public.lead_magnet_setup_requests TO service_role;
