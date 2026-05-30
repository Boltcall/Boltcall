-- 20260530 — agency_rls
--
-- Row-level security for the Agency OS kernel (companion to
-- 20260530_agency_kernel.sql). Establishes founder-vs-client tenancy across
-- seven tables: agency_clients, agency_artifacts, agency_events,
-- agency_intake_calls, agency_knowledge, agency_artifact_baselines, and
-- agency_digital_twin_personas.
--
-- Design summary (full audit in tasks/w7h6i92v1.output L512-672):
--   * is_founder() — security-definer helper. Path A reads JWT
--     app_metadata.role='founder' (server-set, unforgeable). Path B falls back
--     to a Postgres GUC (app.founder_user_ids) for cold-boot / recovery.
--   * owns_client(uuid) — security-definer helper. Returns true iff the
--     calling user is the user_id on the agency_clients row.
--   * is_founder_or_owns(uuid) — convenience wrapper for child-table policies.
--   * Every table runs ENABLE + FORCE row level security. FORCE blocks
--     table-owner bypass (Supabase migrations execute as the table owner; a
--     stray DML statement in a future migration would silently bypass policies
--     without FORCE).
--   * Founders get FOR ALL (USING + WITH CHECK on is_founder()). Clients get
--     scoped SELECT only; no INSERT/UPDATE/DELETE policies for clients ever.
--   * Two new tables introduced by the kernel:
--       agency_artifact_baselines — founder-only (no client policy).
--       agency_digital_twin_personas — founder full, clients SELECT only when
--       parent agency_clients.user_id = auth.uid() AND parent status='live'.
--
-- Defense-in-depth shipped here (audit concerns #6, #7, #11, #14):
--   #6  agency_reject_secret_leakage() trigger blocks inserts/updates whose
--       content or ship_result jsonb stringifies to anything matching
--       /(sk_live_|pk_live_|EAA|^secret_)/. Stripe/Meta/Notion token shapes.
--   #7  agency_events_client_view — SECURITY DEFINER view that projects only
--       safe scalar fields plus per-type whitelisted payload extracts. Client
--       UI must read from this view; the RLS policy on agency_events is a
--       second line of defense, not the only line.
--   #11 agency_clients_client_select_self adds `status not in
--       ('churned','paused')` so churned tenants lose dashboard access on
--       status flip — no manual user_id removal required.
--   #14 pgvector cross-tenant leak warning at end-of-file. Vector similarity
--       queries against agency_knowledge MUST be invoked from service-role
--       with an explicit `where client_id = $1` pre-filter, never from a
--       client JWT.
--
-- Founder GUC setup (run ONCE via Supabase SQL editor as service-role; this
-- migration cannot ALTER DATABASE on hosted Supabase):
--   alter database postgres set app.founder_user_ids = '<founder-uid>';
--   update auth.users set raw_app_meta_data =
--     coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"founder"}'::jsonb
--     where id = '<founder-uid>';

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1a. is_founder() — JWT app_metadata.role primary, GUC allowlist fallback.
create or replace function public.is_founder()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text;
  v_founder_list text;
begin
  if v_uid is null then
    return false;  -- anon / service-role handled separately
  end if;

  -- Path A: JWT app_metadata.role = 'founder' (set via Supabase Admin API,
  -- signed by Supabase Auth, NOT writable from supabase.auth.updateUser).
  begin
    v_jwt_role := coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() ->> 'role')  -- legacy claim shape
    );
    if v_jwt_role = 'founder' then
      return true;
    end if;
  exception when others then
    -- auth.jwt() not available in this context — fall through to Path B.
    null;
  end;

  -- Path B: GUC allowlist (cold-boot / recovery / pre-JWT contexts).
  begin
    v_founder_list := current_setting('app.founder_user_ids', true);
    if v_founder_list is not null
       and v_uid::text = any(string_to_array(v_founder_list, ','))
    then
      return true;
    end if;
  exception when others then
    null;
  end;

  return false;
end;
$$;

revoke all on function public.is_founder() from public;
grant execute on function public.is_founder() to authenticated, anon;

-- 1b. owns_client(uuid) — does the calling user own this agency_clients row?
create or replace function public.owns_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.agency_clients c
    where c.id = p_client_id
      and c.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_client(uuid) from public;
grant execute on function public.owns_client(uuid) to authenticated;

-- 1c. is_founder_or_owns(uuid) — ergonomic wrapper used by child-table reads
-- where founders AND owning clients both have legitimate access.
create or replace function public.is_founder_or_owns(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_founder() or public.owns_client(p_client_id);
$$;

revoke all on function public.is_founder_or_owns(uuid) from public;
grant execute on function public.is_founder_or_owns(uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Secret-leakage Guard Trigger (audit concern #6)
-- ═══════════════════════════════════════════════════════════════════════════
-- The adapter layer (pushCreative / createAgent / createCampaign) is expected
-- to whitelist fields before writing ship_result, never JSON.stringify the raw
-- API response. This trigger is a backstop: if a careless code path ever
-- leaks a Stripe live key, Meta long-lived access token, or Notion secret
-- prefix into agency_artifacts.content or agency_artifacts.ship_result, the
-- insert/update is rejected loudly instead of becoming client-visible at
-- status='shipped'.

create or replace function public.agency_reject_secret_leakage()
returns trigger
language plpgsql
as $$
declare
  v_pattern text := '(sk_live_|pk_live_|EAA|^secret_)';
  v_content_text text := coalesce(new.content::text, '');
  v_ship_text text := coalesce(new.ship_result::text, '');
begin
  if v_content_text ~ v_pattern then
    raise exception
      'agency_artifacts.content rejected: matches secret-shape pattern % (artifact id=%, client_id=%, type=%)',
      v_pattern, new.id, new.client_id, new.type
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  if v_ship_text ~ v_pattern then
    raise exception
      'agency_artifacts.ship_result rejected: matches secret-shape pattern % (artifact id=%, client_id=%, type=%)',
      v_pattern, new.id, new.client_id, new.type
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists agency_artifacts_reject_secrets on public.agency_artifacts;
create trigger agency_artifacts_reject_secrets
  before insert or update on public.agency_artifacts
  for each row execute function public.agency_reject_secret_leakage();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS — agency_clients (parent tenant table)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.agency_clients enable row level security;
alter table public.agency_clients force row level security;

drop policy if exists agency_clients_founder_all on public.agency_clients;
create policy agency_clients_founder_all
  on public.agency_clients
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- Audit concern #11: churned/paused clients lose dashboard access on a simple
-- status flip. No row deletion or user_id rewrite required to revoke access.
drop policy if exists agency_clients_client_select_self on public.agency_clients;
create policy agency_clients_client_select_self
  on public.agency_clients
  as permissive
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and status not in ('churned','paused')
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS — agency_artifacts
-- ═══════════════════════════════════════════════════════════════════════════
-- Most sensitive table: holds draft prompts, ad creatives, ship_result
-- payloads from provider APIs. Client SELECT is gated on status='shipped'.

alter table public.agency_artifacts enable row level security;
alter table public.agency_artifacts force row level security;

drop policy if exists agency_artifacts_founder_all on public.agency_artifacts;
create policy agency_artifacts_founder_all
  on public.agency_artifacts
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- Clients see ONLY shipped artifacts for their own client_id. The EXISTS
-- subquery is the tenant join; idx_agency_clients_user_id keeps it cheap.
drop policy if exists agency_artifacts_client_select_own on public.agency_artifacts;
create policy agency_artifacts_client_select_own
  on public.agency_artifacts
  as permissive
  for select
  to authenticated
  using (
    status = 'shipped'
    and exists (
      select 1 from public.agency_clients c
      where c.id = agency_artifacts.client_id
        and c.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS — agency_events
-- ═══════════════════════════════════════════════════════════════════════════
-- payload jsonb may carry internal cost data, model identifiers, raw
-- transcripts, and provider error bodies. Default-deny for clients; tightly
-- whitelisted type + severity + tenant join for the safe subset.

alter table public.agency_events enable row level security;
alter table public.agency_events force row level security;

drop policy if exists agency_events_founder_all on public.agency_events;
create policy agency_events_founder_all
  on public.agency_events
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- Safe subset for clients: KPI-shaped event types only, info/warn only,
-- tenant-joined. Critical/error/debug severities never leak. NB: the React
-- client should query agency_events_client_view (defined below), not this
-- table directly — see audit concern #7.
drop policy if exists agency_events_client_select_safe on public.agency_events;
create policy agency_events_client_select_safe
  on public.agency_events
  as permissive
  for select
  to authenticated
  using (
    severity in ('info','warn')
    and type in (
      'call_completed','lead_captured','booking_made',
      'report_sent','creative_published'
    )
    and exists (
      select 1 from public.agency_clients c
      where c.id = agency_events.client_id
        and c.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RLS — agency_intake_calls
-- ═══════════════════════════════════════════════════════════════════════════
-- PII-heavy: raw transcript, recording_url, business profile dump. Founder
-- only. Clients NEVER see raw transcripts — if they need their structured
-- profile, build a SECURITY DEFINER view returning extracted_profile only.

alter table public.agency_intake_calls enable row level security;
alter table public.agency_intake_calls force row level security;

drop policy if exists agency_intake_calls_founder_all on public.agency_intake_calls;
create policy agency_intake_calls_founder_all
  on public.agency_intake_calls
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- INTENTIONALLY NO CLIENT POLICY on agency_intake_calls.
-- With RLS forced and only the founder ALL policy present, non-founder
-- authenticated access returns zero rows. This is the intended posture:
-- raw transcripts may contain offhand client disclosures (employee names,
-- pricing misspeaks, internal frustrations) the client did not knowingly
-- preserve. Surface only extracted_profile via a separate view if needed.


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS — agency_knowledge
-- ═══════════════════════════════════════════════════════════════════════════
-- The KB chunks the agent uses to answer the client's callers. Clients can
-- read their own. NOTE on the embedding column — see vector-leak warning
-- block at end of file.

alter table public.agency_knowledge enable row level security;
alter table public.agency_knowledge force row level security;

drop policy if exists agency_knowledge_founder_all on public.agency_knowledge;
create policy agency_knowledge_founder_all
  on public.agency_knowledge
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists agency_knowledge_client_select_own on public.agency_knowledge;
create policy agency_knowledge_client_select_own
  on public.agency_knowledge
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.agency_clients c
      where c.id = agency_knowledge.client_id
        and c.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS — agency_artifact_baselines
-- ═══════════════════════════════════════════════════════════════════════════
-- Founder-only. Baselines snapshot the pre-rollout state of an artifact for
-- A/B comparison and rollback. They contain prior content + ship_result and
-- therefore inherit the same secret-exposure surface as agency_artifacts.
-- Clients have NO read access; rollback / comparison UIs are founder-only.

alter table public.agency_artifact_baselines enable row level security;
alter table public.agency_artifact_baselines force row level security;

drop policy if exists agency_artifact_baselines_founder_all on public.agency_artifact_baselines;
create policy agency_artifact_baselines_founder_all
  on public.agency_artifact_baselines
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- INTENTIONALLY NO CLIENT POLICY on agency_artifact_baselines.


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RLS — agency_digital_twin_personas
-- ═══════════════════════════════════════════════════════════════════════════
-- Founder full CRUD. Clients SELECT only when the parent agency_clients row
-- belongs to them AND that parent has status='live'. Draft/churned/paused
-- clients see no personas — by design, since the persona reflects work in
-- progress until the client is live.

alter table public.agency_digital_twin_personas enable row level security;
alter table public.agency_digital_twin_personas force row level security;

drop policy if exists agency_digital_twin_personas_founder_all on public.agency_digital_twin_personas;
create policy agency_digital_twin_personas_founder_all
  on public.agency_digital_twin_personas
  as permissive
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists agency_digital_twin_personas_client_select_live on public.agency_digital_twin_personas;
create policy agency_digital_twin_personas_client_select_live
  on public.agency_digital_twin_personas
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.agency_clients c
      where c.id = agency_digital_twin_personas.client_id
        and c.user_id = auth.uid()
        and c.status = 'live'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Supporting indexes (MANDATORY for RLS performance)
-- ═══════════════════════════════════════════════════════════════════════════
-- Without these, the EXISTS subqueries in every child-table policy degenerate
-- to a seq scan over agency_clients per row, making the approval queue
-- O(N*M). Confirm usage with EXPLAIN ANALYZE under a non-founder JWT.

create index if not exists idx_agency_clients_user_id
  on public.agency_clients(user_id);

create index if not exists idx_agency_artifacts_client_status
  on public.agency_artifacts(client_id, status);

create index if not exists idx_agency_events_client_type
  on public.agency_events(client_id, type, severity);

create index if not exists idx_agency_intake_calls_client
  on public.agency_intake_calls(client_id);

create index if not exists idx_agency_knowledge_client
  on public.agency_knowledge(client_id);

create index if not exists idx_agency_artifact_baselines_client
  on public.agency_artifact_baselines(client_id);

create index if not exists idx_agency_digital_twin_personas_client
  on public.agency_digital_twin_personas(client_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. agency_events_client_view — safe projection (audit concern #7)
-- ═══════════════════════════════════════════════════════════════════════════
-- The client-facing dashboard MUST read events from this view instead of the
-- agency_events table. The RLS policy on agency_events then becomes a second
-- line of defense, not the only one. The view exposes:
--   * tenant scalar fields (client_id, type, severity, created_at)
--   * the human-readable why_explanation
--   * per-type whitelisted projections of payload (counts, durations, ids
--     that are safe to surface; never cost_usd, model identifiers, raw
--     transcripts, internal anomaly details, or escalation payloads).
-- If a future event type needs a new safe field, add it explicitly here.

create or replace view public.agency_events_client_view
with (security_invoker = false) as
select
  e.id,
  e.client_id,
  e.type,
  e.severity,
  e.created_at,
  e.why_explanation,
  -- per-type safe projection of payload
  case e.type
    when 'call_completed' then jsonb_build_object(
      'duration_seconds', (e.payload->>'duration_seconds')::int,
      'outcome',          e.payload->>'outcome',
      'caller_intent',    e.payload->>'caller_intent'
    )
    when 'lead_captured' then jsonb_build_object(
      'lead_source', e.payload->>'lead_source',
      'channel',     e.payload->>'channel'
    )
    when 'booking_made' then jsonb_build_object(
      'service',         e.payload->>'service',
      'booked_at',       e.payload->>'booked_at',
      'calendar_target', e.payload->>'calendar_target'
    )
    when 'report_sent' then jsonb_build_object(
      'period_start', e.payload->>'period_start',
      'period_end',   e.payload->>'period_end',
      'channel',      e.payload->>'channel'
    )
    when 'creative_published' then jsonb_build_object(
      'platform',        e.payload->>'platform',
      'creative_format', e.payload->>'creative_format'
    )
    else '{}'::jsonb
  end as payload_safe
from public.agency_events e
where e.severity in ('info','warn')
  and e.type in (
    'call_completed','lead_captured','booking_made',
    'report_sent','creative_published'
  )
  and exists (
    select 1 from public.agency_clients c
    where c.id = e.client_id
      and c.user_id = auth.uid()
      and c.status not in ('churned','paused')
  );

-- security_invoker=false (SECURITY DEFINER semantics) means the view runs
-- with the owner's privileges. The view body still applies an explicit
-- tenant predicate via auth.uid(), so a malicious client cannot widen scope.
-- The underlying agency_events RLS policy is the second line of defense.
revoke all on public.agency_events_client_view from public;
grant select on public.agency_events_client_view to authenticated;

comment on view public.agency_events_client_view is
'Client-safe projection of agency_events. UI must SELECT from this view, never
agency_events directly. Per-type payload projection whitelist; severity is
restricted to info/warn; tenant join filters by auth.uid() and client status.
Adding a new event type to the client surface requires extending the CASE
branch here AND the agency_events_client_select_safe RLS policy whitelist.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Vector cross-tenant leak warning (audit concern #14)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- DANGER — READ BEFORE ADDING ANY pgvector SIMILARITY QUERY ON agency_knowledge.
--
-- agency_knowledge.embedding is a pgvector column with an HNSW index. The
-- HNSW planner can traverse rows from OTHER tenants before RLS USING filters
-- are applied. Even though those rows are dropped before being returned to
-- the caller, the ORDER BY ranking and timing channel observe them. Worse:
-- if a developer ever bypasses RLS for vector retrieval performance (very
-- tempting — vector search under RLS is slow), client A's agent retrieval
-- call can return client B's chunks.
--
-- HARD RULES for any code that calls `embedding <-> $1`:
--
--   1. NEVER call vector similarity from a client JWT context. Retrieval
--      runs only from server-side code (Netlify functions, agent runners)
--      using the service-role key.
--
--   2. ALWAYS add `where client_id = $tenant_id` BEFORE the ORDER BY in the
--      SQL, even though RLS would also enforce it under an authenticated
--      JWT. Belt + suspenders, and the planner will use the partial index
--      path. Example:
--
--        select id, content
--        from public.agency_knowledge
--        where client_id = $1                  -- MANDATORY pre-filter
--        order by embedding <-> $2
--        limit 10;
--
--   3. The tenant_id used in step 2 MUST be derived from the verified JWT
--      claim or webhook signature, NEVER from an unverified request body
--      field (confused-deputy / IDOR class bug — see audit concern #2).
--
--   4. Consider partial HNSW indexes per high-volume client, or partition
--      agency_knowledge by client_id once N > 50 clients.
--
--   5. Write a regression test (supabase/tests/agency_rls_test.sql) that
--      runs a similarity query seeded with chunks from two tenants and
--      asserts zero cross-tenant rows appear in the result.
--
-- Re-read this block before writing or reviewing any retrieval code path.
-- ═══════════════════════════════════════════════════════════════════════════
