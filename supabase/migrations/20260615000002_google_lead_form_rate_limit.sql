-- 20260615 - Google Lead Form delivery safety and dashboard signal
--
-- A Google Lead Form key authorizes lead creation and first-touch calls billed
-- to the workspace. If a key leaks, the webhook must have a bounded blast
-- radius. This adds an atomic per-key fixed-window limiter and records the
-- last successful Google "Send test data" ping so customers can verify setup
-- in the dashboard.

ALTER TABLE public.business_features
  ADD COLUMN IF NOT EXISTS last_google_test_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_lead_form_window_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_lead_form_window_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_lead_form_throttle_until timestamptz;

ALTER TABLE public.business_features
  DROP CONSTRAINT IF EXISTS business_features_google_lead_form_window_count_nonnegative;

ALTER TABLE public.business_features
  ADD CONSTRAINT business_features_google_lead_form_window_count_nonnegative
  CHECK (google_lead_form_window_count >= 0);

CREATE INDEX IF NOT EXISTS idx_business_features_google_throttle_until
  ON public.business_features(google_lead_form_throttle_until)
  WHERE google_lead_form_throttle_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_google_lead_form_rate_limit(
  p_google_key text,
  p_now timestamptz DEFAULT now(),
  p_limit integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60,
  p_block_seconds integer DEFAULT 60
)
RETURNS TABLE (
  allowed boolean,
  user_id uuid,
  retry_after_seconds integer,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  feature_row public.business_features%ROWTYPE;
  next_count integer;
  retry_after integer;
BEGIN
  IF p_google_key IS NULL OR length(trim(p_google_key)) = 0 THEN
    RETURN;
  END IF;

  SELECT *
    INTO feature_row
    FROM public.business_features
    WHERE google_lead_form_key = p_google_key
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF feature_row.google_lead_form_throttle_until IS NOT NULL
     AND feature_row.google_lead_form_throttle_until > p_now THEN
    retry_after := greatest(
      1,
      ceil(extract(epoch FROM feature_row.google_lead_form_throttle_until - p_now))::integer
    );
    RETURN QUERY SELECT false, feature_row.user_id, retry_after, 'throttled'::text;
    RETURN;
  END IF;

  IF feature_row.google_lead_form_window_started_at IS NULL
     OR feature_row.google_lead_form_window_started_at <= p_now - make_interval(secs => p_window_seconds) THEN
    UPDATE public.business_features
       SET google_lead_form_window_started_at = p_now,
           google_lead_form_window_count = 1,
           google_lead_form_throttle_until = NULL,
           updated_at = p_now
     WHERE id = feature_row.id;

    RETURN QUERY SELECT true, feature_row.user_id, 0, 'allowed'::text;
    RETURN;
  END IF;

  next_count := coalesce(feature_row.google_lead_form_window_count, 0) + 1;

  IF next_count > p_limit THEN
    UPDATE public.business_features
       SET google_lead_form_window_count = next_count,
           google_lead_form_throttle_until = p_now + make_interval(secs => p_block_seconds),
           updated_at = p_now
     WHERE id = feature_row.id;

    RETURN QUERY SELECT false, feature_row.user_id, p_block_seconds, 'rate_limit_exceeded'::text;
    RETURN;
  END IF;

  UPDATE public.business_features
     SET google_lead_form_window_count = next_count,
         google_lead_form_throttle_until = NULL,
         updated_at = p_now
   WHERE id = feature_row.id;

  RETURN QUERY SELECT true, feature_row.user_id, 0, 'allowed'::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_google_lead_form_rate_limit(text, timestamptz, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_google_lead_form_rate_limit(text, timestamptz, integer, integer, integer)
  TO service_role;
