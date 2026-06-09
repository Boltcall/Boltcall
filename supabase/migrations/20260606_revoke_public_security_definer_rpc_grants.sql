-- Remove public/API execution from SECURITY DEFINER functions that are meant to
-- run only from trusted server-side code, triggers, or the service role.
--
-- Keep RLS helper functions such as is_founder(), owns_client(), and
-- is_founder_or_owns(uuid) executable by authenticated users because policies
-- call them directly.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'atlas_wiki_search',
        'backfill_lead_directory_from_legacy_sources',
        'bulk_insert_solar_leads',
        'bulk_update_solar_emails',
        'ceo_goal_intake',
        'create_business_features_for_new_user',
        'find_user_by_email',
        'get_leads_needing_email',
        'get_pending_reminders',
        'glacier_enqueue_new_lead',
        'ops_enqueue_after_insert',
        'ops_goal_sync_from_task',
        'personal_assistents_get_bot_token',
        'personal_assistents_get_webhook_secret',
        'personal_assistents_set_bot_token',
        'personal_assistents_set_webhook_secret',
        'record_usage',
        'retrieve_agency_knowledge',
        'update_test_cases_updated_at',
        'upsert_lead_directory'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END
$$;
