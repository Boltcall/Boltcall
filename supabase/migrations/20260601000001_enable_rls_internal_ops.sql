-- ═══════════════════════════════════════════════════════════════════════════
-- Enable RLS on 59 internal-ops tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Closes the Supabase security advisor finding `rls_disabled_in_public` for
-- every internal-ops / Atlas / AIOS / lead / CEO table. These tables are all
-- accessed exclusively by Netlify functions using the service-role key, and
-- `service_role` has the BYPASSRLS attribute, so enabling RLS without policies
-- continues to allow backend access while blocking anon + authenticated roles
-- (which is the correct state — none of these tables should be reachable from
-- the public-facing dashboard).
--
-- Verification before this migration:
--   - Grepped src/ for `.from('<table>')`: zero matches against any of the 59
--     tables (only hit was `retell_llms`, which is a separate table NOT in
--     this set and already has RLS).
--   - Backend usages all go through `getServiceSupabase()` → service-role key
--     → BYPASSRLS → continues to work after this migration.
--
-- We use ENABLE (not FORCE) because:
--   - service_role bypasses ENABLE via BYPASSRLS (this is what we want).
--   - The table owner (postgres) still has full access — useful for admin
--     SQL via the Supabase dashboard / MCP.
--   - These tables are not multi-tenant client data; the agency_* tables that
--     hold per-client tenant data DO use FORCE in 20260530000003_agency_rls.sql.
--
-- Reversibility: `ALTER TABLE <name> DISABLE ROW LEVEL SECURITY` per table.
-- Applied to production hbwogktdajorojljkjwg on 2026-05-31 via MCP.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── AIOS / Atlas substrate (21 tables) ───────────────────────────────────
ALTER TABLE public.aios_campaigns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_channels                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_command_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_event_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_experiment_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_experiment_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_experiments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_feedback                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_goals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_loop_audit                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_loops                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_run_history               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_runs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_seo_cache                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_settings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_skill_memory              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_skill_overrides           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_skill_proposals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_workflows                 ENABLE ROW LEVEL SECURITY;

-- ─── Atlas wiki / agent steps (4 tables) ──────────────────────────────────
ALTER TABLE public.atlas_agent_steps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_raw                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_wiki                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_wiki_index               ENABLE ROW LEVEL SECURITY;

-- ─── CEO substrate (5 tables) ─────────────────────────────────────────────
ALTER TABLE public.ceo_agent_runs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_briefings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_decisions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_goals                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_sessions                   ENABLE ROW LEVEL SECURITY;

-- ─── Calendar / channel intel (4 tables) ──────────────────────────────────
ALTER TABLE public.calendar_routines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_knowledge_docs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_suggestions            ENABLE ROW LEVEL SECURITY;

-- ─── Cold-email leads & enrichment (10 tables) ────────────────────────────
ALTER TABLE public.audit_outreach                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_campaigns                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_runs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_signals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medspa_leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_appointments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_cases_signed                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_firms                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_intakes                     ENABLE ROW LEVEL SECURITY;

-- ─── LinkedIn assistant (4 tables) ────────────────────────────────────────
ALTER TABLE public.li_engagement                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_ideas                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_posts                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_comment_leads         ENABLE ROW LEVEL SECURITY;

-- ─── Retell call scoring / eval substrate (5 tables) ──────────────────────
ALTER TABLE public.retell_call_scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_calls                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_eval_runs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_eval_scenarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_prompt_versions         ENABLE ROW LEVEL SECURITY;

-- ─── Misc internal-ops (6 tables) ─────────────────────────────────────────
ALTER TABLE public.glacier_settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_jobs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_priority                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_outbox                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_chunks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_leads                    ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- END enable_rls_internal_ops
-- ═══════════════════════════════════════════════════════════════════════════
