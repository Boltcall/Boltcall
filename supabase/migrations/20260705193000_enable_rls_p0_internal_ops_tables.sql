-- P0.3: Enable RLS on 15 internal-ops tables that were public with RLS off.
--
-- These tables belong to the AIOS / marketing internal ops surface, not the
-- SaaS user surface. No user path reads them. Backend workers use the
-- service_role key which bypasses RLS. Enabling RLS with no policy is
-- effectively a deny-all for anon and authenticated roles, which is the
-- correct behavior for this data.
--
-- Applied via MCP on 2026-07-05; this file exists so the change is tracked
-- in the repo and rebuildable if the project is ever rehydrated.
--
-- Refs: docs/v1-production-readiness-plan.md P0.3

ALTER TABLE public.whatsapp_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmaps_leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmaps_seed            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_prospects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_agent_spend      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_brain_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_brain_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_context_queue    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_linkedin_studio  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_routines_overlay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_state_blobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_board_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_leads        ENABLE ROW LEVEL SECURITY;

-- Fix SECURITY DEFINER view surfaced by advisors — invoker semantics
-- respect the caller's RLS instead of always running as the view owner.
ALTER VIEW public.approved_vertical_guardrails SET (security_invoker = true);
