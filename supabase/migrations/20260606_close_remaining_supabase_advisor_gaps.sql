-- Close remaining high-confidence Supabase security advisor findings.
--
-- 1. Use invoker semantics for the client event view. The view still exposes
--    only payload_safe, while the underlying agency_events RLS policy limits
--    rows by auth.uid(), type, and severity.
ALTER VIEW IF EXISTS public.agency_events_client_view
  SET (security_invoker = true);

-- 2. Pin search_path on public functions to avoid role-mutable lookup behavior
--    in SECURITY DEFINER functions, triggers, and RPC helpers.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.deptype = 'e'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(setting)
        WHERE cfg.setting LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, extensions, pg_catalog',
      fn.signature
    );
  END LOOP;
END
$$;

-- 3. Remove broad public direct-write policies from legacy lead/tracking tables.
--    Lead capture should go through serverless functions with validation and
--    rate limiting, not direct anonymous Supabase writes.
DROP POLICY IF EXISTS "Allow anon insert to ai_audit_leads" ON public.ai_audit_leads;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.beta_waitlist;
DROP POLICY IF EXISTS "service_all" ON public.dm_tracking;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.utm_tracking;

DO $$
DECLARE
  table_name text;
  table_ref regclass;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ai_audit_leads',
    'beta_waitlist',
    'dm_tracking',
    'utm_tracking'
  ]
  LOOP
    table_ref := to_regclass(format('public.%I', table_name));
    IF table_ref IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', table_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', table_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', table_ref);
    EXECUTE format('GRANT ALL ON TABLE %s TO service_role', table_ref);
  END LOOP;
END
$$;

-- 4. Public buckets do not need broad storage.objects SELECT policies for public
--    object URLs, and broad INSERT/UPDATE turns them into anonymous upload sinks.
DROP POLICY IF EXISTS "Allow public reads from audit-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from funnel-reports" ON storage.objects;
DROP POLICY IF EXISTS "voice-notes public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to audit-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to funnel-reports" ON storage.objects;
DROP POLICY IF EXISTS "voice-notes service upload" ON storage.objects;
DROP POLICY IF EXISTS "voice-notes service upsert" ON storage.objects;

DO $$
BEGIN
  CREATE POLICY "Service role manages audit-reports"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'audit-reports')
    WITH CHECK (bucket_id = 'audit-reports');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE POLICY "Service role manages funnel-reports"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'funnel-reports')
    WITH CHECK (bucket_id = 'funnel-reports');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE POLICY "Service role manages voice-notes"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'voice-notes')
    WITH CHECK (bucket_id = 'voice-notes');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 5. RLS helper functions only inspect auth claims or rely on the caller's
--    agency_clients visibility, so they do not need SECURITY DEFINER.
ALTER FUNCTION public.is_founder() SECURITY INVOKER;
ALTER FUNCTION public.owns_client(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_founder_or_owns(uuid) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.is_founder() FROM anon;
REVOKE ALL ON FUNCTION public.owns_client(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_founder_or_owns(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder_or_owns(uuid) TO authenticated;
