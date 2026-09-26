-- 20260924 launch hardening (law-firm launch).
--
-- Idempotent and additive for the currently deployed code, except where noted
-- (F38 token credit, F48 AuditPage) — those need the client changes listed in
-- the launch fix notes. Verified with BEGIN; <this file>; <asserts>; ROLLBACK;
-- against prod before commit.
--
-- Sections: schema gaps (F35 F41 F42 F43 F44 F72 F86) → RLS/grants
-- (F37 F38 F39 F46 F47 F48) → triggers/FKs (F18 F93) → BACKFILL (F18).

-- ─── F35: appointments.call_id (agent-tools book_appointment, appointment-handler) ─
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_id text;
CREATE INDEX IF NOT EXISTS idx_appointments_call_id
  ON public.appointments (call_id) WHERE call_id IS NOT NULL;

-- ─── F86: find_user_by_email (appointment-handler Cal.com organizer lookup) ──
CREATE OR REPLACE FUNCTION public.find_user_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
    FROM auth.users u
   WHERE lower(u.email) = lower(trim(lookup_email))
   ORDER BY u.created_at
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO service_role;

-- ─── F41: search_kb (from 20260506_search_kb_halfvec.sql; vector lives in `extensions`) ─
CREATE OR REPLACE FUNCTION public.search_kb(
  query_embedding extensions.halfvec,
  match_user_id uuid,
  match_count integer DEFAULT 3,
  match_threshold double precision DEFAULT 0.7
)
RETURNS TABLE(id uuid, title character varying, content text, category character varying, similarity double precision)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.user_id = match_user_id
    AND kb.tier = 'search'
    AND kb.status = 'active'
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
-- Callers (kb-search, saas-v2-help-ask, agent-context) are service-role only; the
-- default public-schema ACL would otherwise let anon search any tenant's KB.
REVOKE ALL ON FUNCTION public.search_kb(extensions.halfvec, uuid, integer, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_kb(extensions.halfvec, uuid, integer, double precision) TO service_role;

-- ─── F42: check_google_lead_form_rate_limit (from 20260615000002; columns already in prod) ─
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

-- ─── F43: marketing lead capture columns (20260721190000, 20260726140000, 20260825120000, 20260827120000) ─
ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS report_url text,
  ADD COLUMN IF NOT EXISTS report_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS monthly_leads text,
  ADD COLUMN IF NOT EXISTS avg_job_value text;
ALTER TABLE public.giveaway_entries ADD COLUMN IF NOT EXISTS industry text;

-- ─── F44: other unapplied repo-migration objects that live classic code touches ─
-- agents.avatar/color: AgentsPage.tsx, SetupCompletionPopup.tsx (20260418_agent_customization)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS avatar text,
  ADD COLUMN IF NOT EXISTS color text;
-- provisionAgentSetup.ts upsert (20260531_add_missed_call_columns_to_business_features)
ALTER TABLE public.business_features
  ADD COLUMN IF NOT EXISTS missed_call_textback_enabled boolean DEFAULT false;
-- WorkspaceBrand.tsx logo, teamStore createRole / updateMemberStatus (20260325_team_rbac_workspace).
-- Nullable here (the repo file had NOT NULL/UNIQUE) so existing prod rows stay valid.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Shield';
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;
-- email-inbox-poller daily cap (20260328_email_service)
CREATE OR REPLACE FUNCTION public.get_email_daily_count(p_account_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
    FROM email_messages em
    JOIN email_threads et ON et.id = em.thread_id
   WHERE et.email_account_id = p_account_id
     AND em.direction = 'inbound'
     AND em.created_at >= CURRENT_DATE;
$$;
REVOKE ALL ON FUNCTION public.get_email_daily_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_daily_count(uuid) TO service_role;
-- AgentDetailPage experiment card (20260711110000_ab_testing_attribution)
DROP POLICY IF EXISTS users_view_own_agent_prompt_versions ON public.retell_prompt_versions;
CREATE POLICY users_view_own_agent_prompt_versions ON public.retell_prompt_versions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = retell_prompt_versions.agent_id
      AND a.user_id = (SELECT auth.uid())
  ));

-- ─── F72: aios_event_log (lead-response-service + ~20 telemetry writers; service role only) ─
CREATE TABLE IF NOT EXISTS public.aios_event_log (
  id bigserial PRIMARY KEY,
  loop_name text NOT NULL DEFAULT 'misc',
  event_type text NOT NULL DEFAULT 'event',
  actor text,
  subject_id text,
  channel text,
  outcome text,
  source text,
  severity text,
  sentiment text,
  workspace_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aios_event_log_type_ts_idx ON public.aios_event_log (event_type, ts DESC);
ALTER TABLE public.aios_event_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.aios_event_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.aios_event_log_id_seq FROM anon, authenticated;
GRANT ALL ON TABLE public.aios_event_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.aios_event_log_id_seq TO service_role;

-- ─── F37: workspace_members — insert/update only inside a workspace you own ──
-- Classic convention: workspace_members.workspace_id = owner's auth uid
-- (teamStore self-seed, invite-member). workspaces.id is accepted too.
-- Invite + accept go through invite-member.ts with the service role, so no
-- client path needs to insert someone else's row.
DROP POLICY IF EXISTS owners_insert_members ON public.workspace_members;
CREATE POLICY owners_insert_members ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
    AND (
      workspace_id = (SELECT auth.uid())
      OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))
    )
  );
DROP POLICY IF EXISTS owners_update_members ON public.workspace_members;
CREATE POLICY owners_update_members ON public.workspace_members
  FOR UPDATE
  USING (invited_by = (SELECT auth.uid()))
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND (
      workspace_id = (SELECT auth.uid())
      OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))
    )
  );

-- ─── F38: token_balances — clients may create the 50-credit starter row, never raise it ─
-- Direct client UPDATEs now change 0 rows (no error). TokenContext.claimReward must call
-- claim_token_reward below; consumeTokens has no callers (server debits use service role).
DROP POLICY IF EXISTS "Users can update their own token balance" ON public.token_balances;
DROP POLICY IF EXISTS "Service can insert token balances" ON public.token_balances;
DROP POLICY IF EXISTS "Users can create their starter token balance" ON public.token_balances;
CREATE POLICY "Users can create their starter token balance" ON public.token_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND balance = 0
    AND bonus_balance BETWEEN 0 AND 50
    AND plan_tokens_monthly = 0
    AND tokens_used_this_period = 0
  );

-- One-time onboarding rewards: amount decided here, once per (user, reward) via the
-- token_rewards unique key. Returns tokens credited, 0 when already claimed.
CREATE OR REPLACE FUNCTION public.claim_token_reward(p_reward_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  uid uuid := auth.uid();
  -- ponytail: mirrors TOKEN_REWARDS in src/lib/tokens.ts; edit both together.
  amt integer := CASE p_reward_type
    WHEN 'complete_business_profile' THEN 50
    WHEN 'add_first_kb_document' THEN 30
    WHEN 'connect_phone_number' THEN 50
    WHEN 'setup_ai_agent' THEN 100
    WHEN 'connect_facebook' THEN 75
    WHEN 'upload_first_file' THEN 20
    WHEN 'configure_reminders' THEN 25
    WHEN 'enable_reputation' THEN 25
    WHEN 'connect_email' THEN 75
  END;
BEGIN
  IF uid IS NULL OR amt IS NULL THEN
    RAISE EXCEPTION 'invalid reward claim' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.token_rewards (user_id, reward_type, tokens_awarded)
  VALUES (uid, p_reward_type, amt)
  ON CONFLICT (user_id, reward_type) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  UPDATE public.token_balances
     SET bonus_balance = bonus_balance + amt, updated_at = now()
   WHERE user_id = uid;
  INSERT INTO public.token_transactions (user_id, amount, type, category, description, metadata)
  VALUES (uid, amt, 'credit', p_reward_type, 'Reward: ' || p_reward_type, jsonb_build_object('reward_type', p_reward_type));
  RETURN amt;
END;
$fn$;
REVOKE ALL ON FUNCTION public.claim_token_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_token_reward(text) TO authenticated, service_role;

-- ─── F39: tenant writes must carry the writer's own workspace_id ─────────────
-- BEFORE triggers (set_workspace_id_from_user_id) run before WITH CHECK, so a
-- row inserted without workspace_id gets the owner's workspace and passes.
-- retell_calls has no client write policy (service role only) — nothing to do.
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
CREATE POLICY "Users can insert own chats" ON public.chats FOR INSERT
  WITH CHECK (((SELECT auth.uid()) = user_id OR user_id IS NULL)
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));
DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own callbacks" ON public.callbacks;
CREATE POLICY "Users can insert own callbacks" ON public.callbacks FOR INSERT
  WITH CHECK (((SELECT auth.uid()) = user_id OR user_id IS NULL)
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));
DROP POLICY IF EXISTS "Users can update own callbacks" ON public.callbacks;
CREATE POLICY "Users can update own callbacks" ON public.callbacks FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert their own agents" ON public.agents;
CREATE POLICY "Users can insert their own agents" ON public.agents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can insert their own knowledge base" ON public.knowledge_base;
CREATE POLICY "Users can insert their own knowledge base" ON public.knowledge_base FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));
DROP POLICY IF EXISTS "Users can update their own knowledge base" ON public.knowledge_base;
CREATE POLICY "Users can update their own knowledge base" ON public.knowledge_base FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (workspace_id IS NULL OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.user_id = (SELECT auth.uid()))));

-- ─── F46: playbook_captures (legacy Telegram capture copy; read via service role / SQL only) ─
DO $$
BEGIN
  IF to_regclass('public.playbook_captures') IS NOT NULL THEN
    ALTER TABLE public.playbook_captures ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.playbook_captures FROM anon, authenticated;
  END IF;
END $$;

-- ─── F47: acquire_provisioning_lock is service-role only (retell-agents.ts) ──
REVOKE EXECUTE ON FUNCTION public.acquire_provisioning_lock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_provisioning_lock(uuid) TO service_role;

-- ─── F48: audit_sessions — no anon listing; the link id is the only key ─────
-- AuditPage.tsx must call these RPCs instead of selecting/updating the table.
DO $$
BEGIN
  IF to_regclass('public.audit_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS audit_sessions_public_select ON public.audit_sessions;
    DROP POLICY IF EXISTS audit_sessions_public_update ON public.audit_sessions;

    CREATE OR REPLACE FUNCTION public.get_audit_session(p_id uuid)
    RETURNS TABLE (id uuid, business_name text, vertical text, audit_payload jsonb, booked_at timestamptz)
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $fn$
      SELECT s.id, s.business_name, s.vertical, s.audit_payload, s.booked_at
        FROM public.audit_sessions s
       WHERE s.id = p_id;
    $fn$;

    CREATE OR REPLACE FUNCTION public.mark_audit_session(p_id uuid, p_booked boolean DEFAULT false)
    RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = ''
    AS $fn$
      UPDATE public.audit_sessions
         SET viewed_at = coalesce(viewed_at, now()),
             booked_at = CASE WHEN p_booked THEN coalesce(booked_at, now()) ELSE booked_at END
       WHERE id = p_id;
    $fn$;

    REVOKE ALL ON FUNCTION public.get_audit_session(uuid) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.mark_audit_session(uuid, boolean) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_audit_session(uuid) TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.mark_audit_session(uuid, boolean) TO anon, authenticated, service_role;
  END IF;
END $$;

-- ─── F18: stamp workspace_id on agents / knowledge_base like leads/chats/callbacks ─
DROP TRIGGER IF EXISTS trg_agents_set_workspace_id ON public.agents;
CREATE TRIGGER trg_agents_set_workspace_id
  BEFORE INSERT OR UPDATE OF user_id, workspace_id ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id_from_user_id();
DROP TRIGGER IF EXISTS trg_knowledge_base_set_workspace_id ON public.knowledge_base;
CREATE TRIGGER trg_knowledge_base_set_workspace_id
  BEFORE INSERT OR UPDATE OF user_id, workspace_id ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id_from_user_id();

-- ─── F93: deleting a workspace erases its call transcripts/recordings ───────
-- (leads has no workspace FK; delete-workspace.ts deletes leads explicitly.)
ALTER TABLE public.retell_calls
  DROP CONSTRAINT IF EXISTS retell_calls_workspace_id_fkey,
  ADD CONSTRAINT retell_calls_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ═══ BACKFILL (F18, one-time data fix; safe to re-run: only touches NULLs) ═══
-- Same rule as set_workspace_id_from_user_id(): the user's oldest workspace.
UPDATE public.agents a
   SET workspace_id = w.id
  FROM (SELECT DISTINCT ON (user_id) user_id, id
          FROM public.workspaces ORDER BY user_id, created_at) w
 WHERE a.workspace_id IS NULL AND a.user_id = w.user_id;

UPDATE public.knowledge_base kb
   SET workspace_id = w.id
  FROM (SELECT DISTINCT ON (user_id) user_id, id
          FROM public.workspaces ORDER BY user_id, created_at) w
 WHERE kb.workspace_id IS NULL AND kb.user_id = w.user_id;

UPDATE public.retell_calls r
   SET workspace_id = a.workspace_id
  FROM public.agents a
 WHERE r.workspace_id IS NULL
   AND a.workspace_id IS NOT NULL
   AND (r.agent_id = a.id OR (r.agent_id IS NULL AND r.retell_agent_id = a.retell_agent_id));

-- ═══════════════════════════ ROUND 2 (r2-db-additions) ═══════════════════════
-- Additive only. Idempotent (re-running matches 0 rows on the two UPDATEs and
-- the ALTER is DROP/ADD ... IF EXISTS). Checked live before writing:
--   - prod scheduled_messages_channel_check today: CHECK (channel IN ('sms','email')).
--   - business_profiles.country distribution: 'ישראל' x7, 'United States' x7,
--     'us' x3, 'US' x2, 'GB' x1 (read-only pg_constraint / GROUP BY query, no writes).

-- ─── scheduled_messages.channel: allow 'call' (F70 deferred first-touch call, ─
-- sequence-processor 'call' step). Keep both values prod already allows.
ALTER TABLE public.scheduled_messages
  DROP CONSTRAINT IF EXISTS scheduled_messages_channel_check,
  ADD CONSTRAINT scheduled_messages_channel_check
    CHECK (channel IN ('sms', 'email', 'call'));

-- ─── F138: backfill workspace display name from the business profile ────────
-- Only rows still on the untouched default; never overwrites a name someone
-- (or a prior run of this statement) already set.
UPDATE public.workspaces w
   SET name = bp.business_name
  FROM public.business_profiles bp
 WHERE bp.workspace_id = w.id
   AND (w.name IS NULL OR w.name = 'My Workspace')
   AND coalesce(bp.business_name, '') <> '';

-- ─── business_profiles.country: normalize recognized US spellings to the ────
-- lowercase ISO-2 code normalizeCountryCode() (retell-agents.ts,
-- provisionAgentSetup.ts) and generate-agent-prompt.ts's normalizeCountry()
-- both expect. Every other free-text value (Hebrew 'ישראל', stray 'GB', ...)
-- is left as-is -- guessing a real country from free text is not this
-- migration's call; see db-rollback-test.md for the untouched-row counts.
UPDATE public.business_profiles
   SET country = 'us'
 WHERE lower(trim(country)) IN ('united states', 'usa', 'u.s.', 'u.s.a.', 'united states of america', 'us')
   AND country IS DISTINCT FROM 'us';
