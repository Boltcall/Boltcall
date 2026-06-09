-- Lock down internal analytics/AIOS objects that lived in the public schema
-- with broad API grants. Service-role code can still read/write them, but
-- anon/authenticated API clients cannot enumerate internal data.

DO $$
DECLARE
  table_name text;
  table_ref regclass;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'aios_context_pack_versions',
    'aios_context_packs',
    'aios_repair_runs',
    'aios_trace_blobs',
    'aios_triage_findings',
    'atlas_mission_steps',
    'atlas_missions',
    'atlas_outcome_evals',
    'conversation_evals',
    'lead_accounts',
    'lead_contacts',
    'lead_enrichment_events',
    'lead_generation_sessions',
    'lead_list_members',
    'lead_lists',
    'lead_outreach_events',
    'lead_sources',
    'lead_trace_events',
    'llm_usage_events',
    'omnichannel_revenue_messages'
  ]
  LOOP
    table_ref := to_regclass(format('public.%I', table_name));
    IF table_ref IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_ref);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', table_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', table_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', table_ref);
    EXECUTE format('GRANT ALL ON TABLE %s TO service_role', table_ref);
  END LOOP;
END
$$;

DO $$
DECLARE
  view_name text;
  view_ref regclass;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'aios_contact_journey',
    'atlas_lead_memory',
    'ceo_world_state',
    'ceo_world_state_v2',
    'gsc_accidental_keywords',
    'gsc_quick_wins',
    'lead_directory',
    'lead_magnet_performance',
    'metrics_dashboard',
    'omnichannel_messages',
    'ops_tasks_stuck',
    'outreach_scorecard',
    'usage_daily_summary',
    'usage_summary'
  ]
  LOOP
    view_ref := to_regclass(format('public.%I', view_name));
    IF view_ref IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER VIEW %s SET (security_invoker = true)', view_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', view_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', view_ref);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', view_ref);
    EXECUTE format('GRANT SELECT ON TABLE %s TO service_role', view_ref);
  END LOOP;
END
$$;

-- This view is intentionally SECURITY DEFINER: it exposes a narrow, explicit
-- projection of agency_events.payload while filtering rows by auth.uid().
-- Keep it callable only by signed-in users and the service role, never anon.
REVOKE ALL ON TABLE public.agency_events_client_view FROM PUBLIC;
REVOKE ALL ON TABLE public.agency_events_client_view FROM anon;
REVOKE ALL ON TABLE public.agency_events_client_view FROM authenticated;
GRANT SELECT ON TABLE public.agency_events_client_view TO authenticated;
GRANT SELECT ON TABLE public.agency_events_client_view TO service_role;
