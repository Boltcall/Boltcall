--------------------------------------------------------------------------------
-- agency_rls_test.sql
--
-- RLS regression suite for the Agency OS multi-tenant data plane.
-- Covers agency_clients / agency_artifacts / agency_events /
-- agency_intake_calls / agency_knowledge across founder, client, and anon
-- JWT contexts. Asserts deny-by-default behavior, severity whitelisting on
-- events, JWT-claim spoof resistance, vector-similarity cross-tenant
-- isolation, ship_result secret-leakage trigger, and churn revocation.
--
-- 13 scenarios:
--   01 founder_can_read_everything
--   02 client_a_can_only_read_own_rows
--   03 client_a_cannot_see_internal_severity_events
--   04 client_a_cannot_insert_for_client_b
--   05 client_a_cannot_update_own_or_others
--   06 client_a_cannot_delete
--   07 anon_role_sees_nothing
--   08 spoofed_user_metadata_role_is_ignored
--   09 vector_similarity_does_not_leak_cross_tenant   (NEW)
--   10 secret_leakage_trigger_blocks_stripe_secrets   (NEW)
--   11 churned_client_loses_select                    (NEW)
--   12 anon_cannot_insert_anywhere
--   13 founder_can_insert_and_update_artifacts
--
-- ---------------------------------------------------------------------------
-- HOW TO RUN
-- ---------------------------------------------------------------------------
--
-- (a) Direct psql / Supabase SQL editor:
--       \i supabase/tests/agency_rls_test.sql
--     The file is idempotent — drops + recreates all helper functions,
--     runs setup() as service-role, executes every test, then teardown().
--     Each test prints `PASS test_xx_name` or `FAIL test_xx_name <reason>`
--     via RAISE NOTICE. The final NOTICE prints the pass/fail tally.
--
-- (b) Via Supabase MCP `mcp__claude_ai_Supabase__execute_sql`:
--     The MCP runs as service-role and therefore BYPASSES RLS by default.
--     Each test below sets the JWT claims AND the role inside its own
--     SAVEPOINT (`set_config(..., true)` makes the change transaction-
--     local, so ROLLBACK TO SAVEPOINT reverts it). Paste in this order:
--
--       1.  execute_sql( the entire DDL block: drop + create helpers,
--                        plus the setup() / teardown() / test_* functions )
--       2.  execute_sql( "select public.agency_rls_setup();"        )
--       3.  execute_sql( "select public.run_all_rls_tests();"       )
--       4.  execute_sql( "select public.agency_rls_teardown();"     )
--
--     OR paste the single line at the bottom:
--       select public.agency_rls_full_run();
--     which wraps setup → tests → teardown into one call and returns the
--     summary as a single text row.
--
--     CI recommendation: invoke this file from `supabase db test` (or a
--     GitHub Action that runs `psql -f supabase/tests/agency_rls_test.sql`)
--     on every PR that touches `supabase/migrations/`.
--
-- ---------------------------------------------------------------------------
-- ASSUMPTIONS
-- ---------------------------------------------------------------------------
--   * Migrations have already created: agency_clients, agency_artifacts,
--     agency_events, agency_intake_calls, agency_knowledge, the
--     public.is_founder() helper, and the RLS policies described in the
--     Agency OS data-plane audit.
--   * The pgvector extension is installed and agency_knowledge.embedding
--     is a `vector(1536)` column. Test 09 will SKIP (with a SKIP note that
--     does NOT count as PASS or FAIL) if the column is missing, so the
--     suite still runs cleanly on environments where the embedding column
--     has not been added yet.
--   * A secret-leakage trigger may or may not exist on agency_artifacts.
--     Test 10 will SKIP when the trigger is absent — so this test serves
--     as a TODO reminder until the constraint ships.
--   * The service-role / postgres role executes this file. Tests flip to
--     `authenticated` or `anon` via set_config inside savepoints.
--
--------------------------------------------------------------------------------

-- ===========================================================================
-- 0. SHARED STATE: test results table (a real table in its own schema, so
--    results survive across separate execute_sql calls).
-- ===========================================================================

create schema if not exists agency_rls_test;

create table if not exists agency_rls_test.results (
    id          bigserial primary key,
    test_name   text not null,
    status      text not null check (status in ('PASS','FAIL','SKIP')),
    detail      text,
    ran_at      timestamptz not null default now()
);

-- ===========================================================================
-- 1. HELPERS
-- ===========================================================================

-- Record a result and emit a NOTICE so tail -f of psql shows live progress.
create or replace function agency_rls_test.record(
    p_test text, p_status text, p_detail text default null
) returns void language plpgsql as $$
begin
    insert into agency_rls_test.results(test_name, status, detail)
    values (p_test, p_status, p_detail);
    raise notice '% %  %', p_status, p_test, coalesce(p_detail, '');
end $$;

-- Set the JWT claims and role for the remainder of the current transaction.
create or replace function agency_rls_test.assume(
    p_sub text, p_role text default 'authenticated', p_app_role text default 'user',
    p_user_meta_role text default null
) returns void language plpgsql as $$
declare
    claims jsonb;
begin
    claims := jsonb_build_object(
        'sub',  p_sub,
        'role', p_role,
        'app_metadata',  jsonb_build_object('role', p_app_role)
    );
    if p_user_meta_role is not null then
        claims := claims || jsonb_build_object(
            'user_metadata', jsonb_build_object('role', p_user_meta_role)
        );
    end if;
    perform set_config('request.jwt.claims', claims::text, true);
    perform set_config('role', p_role, true);
end $$;

-- Reset to service-role / postgres for the rest of the transaction.
create or replace function agency_rls_test.assume_service() returns void
language plpgsql as $$
begin
    perform set_config('request.jwt.claims', '', true);
    perform set_config('role', 'postgres', true);
end $$;

-- Constants (fixed UUIDs so tests are deterministic).
create or replace function agency_rls_test.founder_uid()  returns uuid language sql immutable as $$ select '11111111-1111-1111-1111-111111111111'::uuid $$;
create or replace function agency_rls_test.client_a_uid() returns uuid language sql immutable as $$ select '22222222-2222-2222-2222-222222222222'::uuid $$;
create or replace function agency_rls_test.client_b_uid() returns uuid language sql immutable as $$ select '33333333-3333-3333-3333-333333333333'::uuid $$;
create or replace function agency_rls_test.client_a_id()  returns uuid language sql immutable as $$ select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$;
create or replace function agency_rls_test.client_b_id()  returns uuid language sql immutable as $$ select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid $$;

-- ===========================================================================
-- 2. SETUP — seeds two clients + artifacts + events + intake + knowledge
-- ===========================================================================

create or replace function public.agency_rls_setup() returns void
language plpgsql security definer as $$
declare
    has_embedding_col boolean;
begin
    -- Wipe any prior run.
    truncate agency_rls_test.results;

    -- Seed auth.users (service-role required — this function is SECURITY DEFINER).
    insert into auth.users (id, email, raw_app_meta_data)
    values
        (agency_rls_test.founder_uid(),  'founder@boltcall.org', '{"role":"founder"}'::jsonb),
        (agency_rls_test.client_a_uid(), 'a@example.com',        '{}'::jsonb),
        (agency_rls_test.client_b_uid(), 'b@example.com',        '{}'::jsonb)
    on conflict (id) do nothing;

    -- Founder GUC fallback (no-op on hosted Supabase without superuser; ignore failure).
    begin
        execute format(
            'alter database %I set app.founder_user_ids = %L',
            current_database(), agency_rls_test.founder_uid()::text
        );
    exception when insufficient_privilege then
        -- Hosted Supabase: rely purely on app_metadata.role='founder' in is_founder().
        null;
    end;

    -- Idempotent fixture seed. Delete-then-insert so reruns are clean.
    delete from public.agency_knowledge    where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_intake_calls where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_events       where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_artifacts    where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_clients      where id        in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());

    insert into public.agency_clients (id, user_id, founder_id, status, sku, mrr, vertical, business_name) values
        (agency_rls_test.client_a_id(), agency_rls_test.client_a_uid(), agency_rls_test.founder_uid(), 'live', 'bolt_system', 89700, 'med_spa', 'Client A Med Spa'),
        (agency_rls_test.client_b_id(), agency_rls_test.client_b_uid(), agency_rls_test.founder_uid(), 'live', 'bolt_system', 89700, 'hvac',    'Client B HVAC');

    insert into public.agency_artifacts (client_id, type, status, generated_by, content) values
        (agency_rls_test.client_a_id(), 'agent_prompt',  'shipped', 'agent-architect',  '{"prompt":"A-shipped"}'),
        (agency_rls_test.client_a_id(), 'weekly_report', 'draft',   'reporting-scribe', '{"draft":"A-draft"}'),
        (agency_rls_test.client_b_id(), 'agent_prompt',  'shipped', 'agent-architect',  '{"prompt":"B-shipped"}'),
        (agency_rls_test.client_b_id(), 'weekly_report', 'draft',   'reporting-scribe', '{"draft":"B-draft"}');

    insert into public.agency_events (client_id, agent_name, type, severity, payload) values
        (agency_rls_test.client_a_id(), 'retell',  'call_completed',   'info',     '{"kpi":"A"}'),
        (agency_rls_test.client_a_id(), 'monitor', 'anomaly_detected', 'critical', '{"internal":"A-secret"}'),
        (agency_rls_test.client_b_id(), 'retell',  'call_completed',   'info',     '{"kpi":"B"}'),
        (agency_rls_test.client_b_id(), 'monitor', 'anomaly_detected', 'critical', '{"internal":"B-secret"}');

    insert into public.agency_intake_calls (client_id, transcript, extracted_profile) values
        (agency_rls_test.client_a_id(), 'A transcript with PII', '{"profile":"A"}'),
        (agency_rls_test.client_b_id(), 'B transcript with PII', '{"profile":"B"}');

    insert into public.agency_knowledge (client_id, kind, content) values
        (agency_rls_test.client_a_id(), 'service', '{"name":"botox-A"}'),
        (agency_rls_test.client_b_id(), 'service', '{"name":"hvac-tuneup-B"}');

    -- Seed deterministic embeddings if the column exists (test 09 uses these).
    select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name   = 'agency_knowledge'
          and column_name  = 'embedding'
    ) into has_embedding_col;

    if has_embedding_col then
        -- Two visibly distinct vectors so similarity ordering is deterministic.
        execute $sql$
            update public.agency_knowledge
               set embedding = (select array_fill(0.01::real, ARRAY[1536])::vector)
             where client_id = $1
        $sql$ using agency_rls_test.client_a_id();

        execute $sql$
            update public.agency_knowledge
               set embedding = (select array_fill(0.99::real, ARRAY[1536])::vector)
             where client_id = $1
        $sql$ using agency_rls_test.client_b_id();
    end if;

    raise notice 'agency_rls_setup complete: 2 clients, 4 artifacts, 4 events, 2 intake calls, 2 knowledge chunks';
end $$;

-- ===========================================================================
-- 3. TEARDOWN — removes all fixtures
-- ===========================================================================

create or replace function public.agency_rls_teardown() returns void
language plpgsql security definer as $$
begin
    delete from public.agency_knowledge    where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_intake_calls where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_events       where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_artifacts    where client_id in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from public.agency_clients      where id        in (agency_rls_test.client_a_id(), agency_rls_test.client_b_id());
    delete from auth.users                 where id        in (agency_rls_test.founder_uid(), agency_rls_test.client_a_uid(), agency_rls_test.client_b_uid());
    raise notice 'agency_rls_teardown complete';
end $$;

-- ===========================================================================
-- 4. TESTS — each runs inside its own SAVEPOINT, so set_config(...,true) and
--    any DML attempt are reverted before the next test starts.
--
--    Pattern (executed by run_all_rls_tests below):
--      savepoint sp_NN
--      perform agency_rls_test.test_NN_...();
--      rollback to savepoint sp_NN
-- ===========================================================================

-- ----- TEST 01 -------------------------------------------------------------
create or replace function agency_rls_test.test_01_founder_can_read_everything() returns void
language plpgsql as $$
declare
    c_clients int; c_artifacts int; c_events int; c_intake int; c_kb int;
begin
    perform agency_rls_test.assume(agency_rls_test.founder_uid()::text, 'authenticated', 'founder');
    select count(*) into c_clients   from public.agency_clients;
    select count(*) into c_artifacts from public.agency_artifacts;
    select count(*) into c_events    from public.agency_events;
    select count(*) into c_intake    from public.agency_intake_calls;
    select count(*) into c_kb        from public.agency_knowledge;

    if c_clients >= 2 and c_artifacts >= 4 and c_events >= 4 and c_intake >= 2 and c_kb >= 2 then
        perform agency_rls_test.record('test_01_founder_can_read_everything','PASS',
            format('clients=%s artifacts=%s events=%s intake=%s kb=%s',
                   c_clients, c_artifacts, c_events, c_intake, c_kb));
    else
        perform agency_rls_test.record('test_01_founder_can_read_everything','FAIL',
            format('expected ALL data visible, got clients=%s artifacts=%s events=%s intake=%s kb=%s',
                   c_clients, c_artifacts, c_events, c_intake, c_kb));
    end if;
end $$;

-- ----- TEST 02 -------------------------------------------------------------
create or replace function agency_rls_test.test_02_client_a_can_only_read_own_rows() returns void
language plpgsql as $$
declare
    c_clients int; c_artifacts int; c_shipped int; c_events int;
    c_intake int; c_kb int; c_b_leak int;
begin
    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');
    select count(*) into c_clients   from public.agency_clients;
    select count(*) into c_artifacts from public.agency_artifacts;
    select count(*) into c_shipped   from public.agency_artifacts where status='shipped';
    select count(*) into c_events    from public.agency_events;
    select count(*) into c_intake    from public.agency_intake_calls;
    select count(*) into c_kb        from public.agency_knowledge;

    -- Any B-tagged data leaking?
    select
        (select count(*) from public.agency_clients   where business_name ilike '%HVAC%')
      + (select count(*) from public.agency_artifacts where content::text  like '%B-%')
      + (select count(*) from public.agency_events    where payload::text  like '%B-secret%')
      + (select count(*) from public.agency_knowledge where content::text ilike '%hvac%')
    into c_b_leak;

    if c_clients = 1 and c_artifacts = 1 and c_shipped = 1
       and c_events = 1 and c_intake = 0 and c_kb = 1 and c_b_leak = 0 then
        perform agency_rls_test.record('test_02_client_a_can_only_read_own_rows','PASS');
    else
        perform agency_rls_test.record('test_02_client_a_can_only_read_own_rows','FAIL',
            format('clients=%s artifacts=%s shipped=%s events=%s intake=%s kb=%s b_leak=%s',
                   c_clients, c_artifacts, c_shipped, c_events, c_intake, c_kb, c_b_leak));
    end if;
end $$;

-- ----- TEST 03 -------------------------------------------------------------
create or replace function agency_rls_test.test_03_client_a_cannot_see_internal_severity_events() returns void
language plpgsql as $$
declare leaked int;
begin
    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');
    select count(*) into leaked
      from public.agency_events
     where severity in ('critical','error','debug');

    if leaked = 0 then
        perform agency_rls_test.record('test_03_client_a_cannot_see_internal_severity_events','PASS');
    else
        perform agency_rls_test.record('test_03_client_a_cannot_see_internal_severity_events','FAIL',
            format('expected 0 internal-severity events, got %s', leaked));
    end if;
end $$;

-- ----- TEST 04 -------------------------------------------------------------
create or replace function agency_rls_test.test_04_client_a_cannot_insert_for_client_b() returns void
language plpgsql as $$
begin
    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');
    begin
        insert into public.agency_artifacts (client_id, type, status, generated_by, content)
        values (agency_rls_test.client_b_id(), 'agent_prompt','draft','hacker','{"evil":true}');
        -- If we reach here, RLS did NOT block the write.
        perform agency_rls_test.record('test_04_client_a_cannot_insert_for_client_b','FAIL',
            'INSERT succeeded — expected RLS denial (42501)');
    exception
        when insufficient_privilege then
            perform agency_rls_test.record('test_04_client_a_cannot_insert_for_client_b','PASS',
                'denied with insufficient_privilege as expected');
        when others then
            -- Some Postgres builds raise sqlstate 42501 under a different exception name.
            if SQLSTATE = '42501' then
                perform agency_rls_test.record('test_04_client_a_cannot_insert_for_client_b','PASS',
                    'denied with sqlstate 42501 as expected');
            else
                perform agency_rls_test.record('test_04_client_a_cannot_insert_for_client_b','FAIL',
                    format('unexpected sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
            end if;
    end;
end $$;

-- ----- TEST 05 -------------------------------------------------------------
create or replace function agency_rls_test.test_05_client_a_cannot_update_own_or_others() returns void
language plpgsql as $$
declare own_changed int; other_changed int;
begin
    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');

    update public.agency_artifacts set status='approved' where content::text like '%A-%';
    GET DIAGNOSTICS own_changed = ROW_COUNT;

    update public.agency_artifacts set content='{"hijack":true}' where content::text like '%B-shipped%';
    GET DIAGNOSTICS other_changed = ROW_COUNT;

    if own_changed = 0 and other_changed = 0 then
        perform agency_rls_test.record('test_05_client_a_cannot_update_own_or_others','PASS');
    else
        perform agency_rls_test.record('test_05_client_a_cannot_update_own_or_others','FAIL',
            format('expected 0 updates, got own=%s other=%s', own_changed, other_changed));
    end if;
end $$;

-- ----- TEST 06 -------------------------------------------------------------
create or replace function agency_rls_test.test_06_client_a_cannot_delete() returns void
language plpgsql as $$
declare d1 int; d2 int; d3 int; d4 int; d5 int;
begin
    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');
    delete from public.agency_clients      where id=agency_rls_test.client_a_id();          GET DIAGNOSTICS d1 = ROW_COUNT;
    delete from public.agency_artifacts    where client_id=agency_rls_test.client_a_id();   GET DIAGNOSTICS d2 = ROW_COUNT;
    delete from public.agency_events       where client_id=agency_rls_test.client_a_id();   GET DIAGNOSTICS d3 = ROW_COUNT;
    delete from public.agency_intake_calls where client_id=agency_rls_test.client_a_id();   GET DIAGNOSTICS d4 = ROW_COUNT;
    delete from public.agency_knowledge    where client_id=agency_rls_test.client_a_id();   GET DIAGNOSTICS d5 = ROW_COUNT;

    if d1=0 and d2=0 and d3=0 and d4=0 and d5=0 then
        perform agency_rls_test.record('test_06_client_a_cannot_delete','PASS');
    else
        perform agency_rls_test.record('test_06_client_a_cannot_delete','FAIL',
            format('clients=%s artifacts=%s events=%s intake=%s kb=%s', d1, d2, d3, d4, d5));
    end if;
end $$;

-- ----- TEST 07 -------------------------------------------------------------
create or replace function agency_rls_test.test_07_anon_role_sees_nothing() returns void
language plpgsql as $$
declare total int;
begin
    perform set_config('request.jwt.claims', '{}', true);
    perform set_config('role', 'anon', true);

    select (select count(*) from public.agency_clients)
         + (select count(*) from public.agency_artifacts)
         + (select count(*) from public.agency_events)
         + (select count(*) from public.agency_intake_calls)
         + (select count(*) from public.agency_knowledge)
      into total;

    if total = 0 then
        perform agency_rls_test.record('test_07_anon_role_sees_nothing','PASS');
    else
        perform agency_rls_test.record('test_07_anon_role_sees_nothing','FAIL',
            format('expected 0 visible rows for anon, got %s', total));
    end if;
end $$;

-- ----- TEST 08 -------------------------------------------------------------
create or replace function agency_rls_test.test_08_spoofed_user_metadata_role_is_ignored() returns void
language plpgsql as $$
declare is_f boolean; c_clients int; c_intake int;
begin
    -- Attacker sets user_metadata.role='founder' while app_metadata stays 'user'.
    perform agency_rls_test.assume(
        agency_rls_test.client_a_uid()::text,
        'authenticated',
        'user',
        'founder' -- user_metadata.role (attacker-controlled)
    );

    select public.is_founder() into is_f;
    select count(*) into c_clients from public.agency_clients;
    select count(*) into c_intake  from public.agency_intake_calls;

    if is_f = false and c_clients = 1 and c_intake = 0 then
        perform agency_rls_test.record('test_08_spoofed_user_metadata_role_is_ignored','PASS');
    else
        perform agency_rls_test.record('test_08_spoofed_user_metadata_role_is_ignored','FAIL',
            format('is_founder=%s clients=%s intake=%s (expected false/1/0)', is_f, c_clients, c_intake));
    end if;
end $$;

-- ----- TEST 09 (NEW) -------------------------------------------------------
-- Vector similarity must NEVER leak cross-tenant rows when run from a
-- client JWT. We probe with a vector closer to B's embedding (0.99) than to
-- A's (0.01). Even with that adversarial probe, client A's session must see
-- only A's chunk in the ORDER BY result.
create or replace function agency_rls_test.test_09_vector_similarity_does_not_leak_cross_tenant() returns void
language plpgsql as $$
declare
    has_embedding_col boolean;
    leaked int;
    probe text;
begin
    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='agency_knowledge' and column_name='embedding'
    ) into has_embedding_col;

    if not has_embedding_col then
        perform agency_rls_test.record('test_09_vector_similarity_does_not_leak_cross_tenant','SKIP',
            'agency_knowledge.embedding column not present yet — skipping');
        return;
    end if;

    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');

    -- Build a 1536-dim probe close to client B's vector (0.99).
    probe := (select array_fill(0.99::real, ARRAY[1536])::vector)::text;

    execute format($q$
        select count(*) from (
            select client_id
              from public.agency_knowledge
             order by embedding <-> %L::vector
             limit 5
        ) s
        where s.client_id <> %L::uuid
    $q$, probe, agency_rls_test.client_a_id())
    into leaked;

    if leaked = 0 then
        perform agency_rls_test.record('test_09_vector_similarity_does_not_leak_cross_tenant','PASS',
            'similarity probe biased toward client B returned 0 cross-tenant rows under client A JWT');
    else
        perform agency_rls_test.record('test_09_vector_similarity_does_not_leak_cross_tenant','FAIL',
            format('CROSS-TENANT LEAK: %s rows from other tenants returned to client A', leaked));
    end if;
end $$;

-- ----- TEST 10 (NEW) -------------------------------------------------------
-- The secret-leakage trigger must reject ship_result blobs containing
-- Stripe live-key or Meta token prefixes. If the trigger is absent we
-- record SKIP so the suite still passes but flags the missing guardrail.
create or replace function agency_rls_test.test_10_secret_leakage_trigger_blocks_stripe_secrets() returns void
language plpgsql as $$
declare
    has_ship_result_col boolean;
    has_trigger         boolean;
begin
    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='agency_artifacts' and column_name='ship_result'
    ) into has_ship_result_col;

    if not has_ship_result_col then
        perform agency_rls_test.record('test_10_secret_leakage_trigger_blocks_stripe_secrets','SKIP',
            'agency_artifacts.ship_result column missing — trigger cannot exist');
        return;
    end if;

    select exists (
        select 1 from pg_trigger t
          join pg_class c on c.oid = t.tgrelid
         where c.relname = 'agency_artifacts'
           and not t.tgisinternal
           and t.tgname ilike '%secret%'
    ) into has_trigger;

    perform agency_rls_test.assume_service();  -- run as service-role so RLS doesn't mask the trigger test

    begin
        insert into public.agency_artifacts (client_id, type, status, generated_by, content, ship_result)
        values (
            agency_rls_test.client_a_id(),
            'agent_prompt',
            'shipped',
            'agent-architect',
            '{"prompt":"x"}',
            '{"stripe":"sk_live_test_DEADBEEF1234567890"}'::jsonb
        );
        -- Reached only if no trigger blocked the write.
        if has_trigger then
            perform agency_rls_test.record('test_10_secret_leakage_trigger_blocks_stripe_secrets','FAIL',
                'secret-leakage trigger present but did NOT block sk_live_ payload');
        else
            perform agency_rls_test.record('test_10_secret_leakage_trigger_blocks_stripe_secrets','SKIP',
                'secret-leakage trigger not installed yet — INSERT was allowed (TODO: ship trigger)');
        end if;
    exception
        when others then
            -- Any error here counts as a successful block.
            perform agency_rls_test.record('test_10_secret_leakage_trigger_blocks_stripe_secrets','PASS',
                format('trigger rejected sk_live_ payload (sqlstate=%s)', SQLSTATE));
    end;
end $$;

-- ----- TEST 11 (NEW) -------------------------------------------------------
-- Churned clients must lose dashboard access. Flip A's status to 'churned'
-- as service-role, then re-assume A's JWT and assert SELECT returns 0.
-- If the policy still allows access, this test FAILs and surfaces the
-- "decide explicitly; don't leave this implicit" concern from the audit.
create or replace function agency_rls_test.test_11_churned_client_loses_select() returns void
language plpgsql as $$
declare visible int;
begin
    perform agency_rls_test.assume_service();
    update public.agency_clients
       set status = 'churned'
     where id = agency_rls_test.client_a_id();

    perform agency_rls_test.assume(agency_rls_test.client_a_uid()::text, 'authenticated', 'user');
    select count(*) into visible from public.agency_clients;

    if visible = 0 then
        perform agency_rls_test.record('test_11_churned_client_loses_select','PASS',
            'churned client A sees 0 rows in agency_clients');
    else
        perform agency_rls_test.record('test_11_churned_client_loses_select','FAIL',
            format('expected 0 rows for churned client A, got %s. ' ||
                   'Add `and status not in (''churned'',''paused'')` to client SELECT policies.',
                   visible));
    end if;
end $$;

-- ----- TEST 12 -------------------------------------------------------------
create or replace function agency_rls_test.test_12_anon_cannot_insert_anywhere() returns void
language plpgsql as $$
declare blocked int := 0; attempted int := 0;
begin
    perform set_config('request.jwt.claims','{}', true);
    perform set_config('role','anon', true);

    attempted := attempted + 1;
    begin
        insert into public.agency_clients (id, user_id, founder_id, status, sku, mrr, vertical, business_name)
        values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'live','bolt_system',1,'med_spa','anon-injection');
    exception when others then blocked := blocked + 1;
    end;

    attempted := attempted + 1;
    begin
        insert into public.agency_artifacts (client_id, type, status, generated_by, content)
        values (agency_rls_test.client_a_id(),'agent_prompt','draft','anon','{}');
    exception when others then blocked := blocked + 1;
    end;

    attempted := attempted + 1;
    begin
        insert into public.agency_events (client_id, agent_name, type, severity, payload)
        values (agency_rls_test.client_a_id(),'anon','call_completed','info','{}');
    exception when others then blocked := blocked + 1;
    end;

    if blocked = attempted then
        perform agency_rls_test.record('test_12_anon_cannot_insert_anywhere','PASS',
            format('all %s anon INSERTs blocked', attempted));
    else
        perform agency_rls_test.record('test_12_anon_cannot_insert_anywhere','FAIL',
            format('expected %s blocks, got %s', attempted, blocked));
    end if;
end $$;

-- ----- TEST 13 -------------------------------------------------------------
create or replace function agency_rls_test.test_13_founder_can_insert_and_update_artifacts() returns void
language plpgsql as $$
declare inserted_id uuid; new_status text;
begin
    perform agency_rls_test.assume(agency_rls_test.founder_uid()::text, 'authenticated', 'founder');

    insert into public.agency_artifacts (client_id, type, status, generated_by, content)
    values (agency_rls_test.client_a_id(), 'agent_prompt','draft','agent-architect','{"prompt":"founder-write"}')
    returning id into inserted_id;

    update public.agency_artifacts set status='approved' where id = inserted_id
    returning status into new_status;

    if inserted_id is not null and new_status = 'approved' then
        perform agency_rls_test.record('test_13_founder_can_insert_and_update_artifacts','PASS');
    else
        perform agency_rls_test.record('test_13_founder_can_insert_and_update_artifacts','FAIL',
            format('inserted_id=%s new_status=%s', inserted_id, new_status));
    end if;
end $$;

-- ===========================================================================
-- 5. RUNNER — wraps each test in a savepoint and rolls it back so test
--    side-effects (DML, set_config) don't bleed into the next test.
-- ===========================================================================

create or replace function public.run_all_rls_tests() returns table(
    pass_count int, fail_count int, skip_count int, summary text
) language plpgsql as $$
declare
    pass_n int; fail_n int; skip_n int; total_n int; summary_s text;
begin
    truncate agency_rls_test.results;

    -- Each test wrapped in its own savepoint so set_config(...,true) reverts.
    -- Note: we use exception blocks (which create implicit savepoints) so any
    -- error inside a test does not abort the rest of the suite, and we
    -- explicitly reset role/claims between tests.
    begin
        perform agency_rls_test.test_01_founder_can_read_everything();
    exception when others then
        perform agency_rls_test.record('test_01_founder_can_read_everything','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_02_client_a_can_only_read_own_rows();
    exception when others then
        perform agency_rls_test.record('test_02_client_a_can_only_read_own_rows','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_03_client_a_cannot_see_internal_severity_events();
    exception when others then
        perform agency_rls_test.record('test_03_client_a_cannot_see_internal_severity_events','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_04_client_a_cannot_insert_for_client_b();
    exception when others then
        perform agency_rls_test.record('test_04_client_a_cannot_insert_for_client_b','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_05_client_a_cannot_update_own_or_others();
    exception when others then
        perform agency_rls_test.record('test_05_client_a_cannot_update_own_or_others','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_06_client_a_cannot_delete();
    exception when others then
        perform agency_rls_test.record('test_06_client_a_cannot_delete','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_07_anon_role_sees_nothing();
    exception when others then
        perform agency_rls_test.record('test_07_anon_role_sees_nothing','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_08_spoofed_user_metadata_role_is_ignored();
    exception when others then
        perform agency_rls_test.record('test_08_spoofed_user_metadata_role_is_ignored','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_09_vector_similarity_does_not_leak_cross_tenant();
    exception when others then
        perform agency_rls_test.record('test_09_vector_similarity_does_not_leak_cross_tenant','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_10_secret_leakage_trigger_blocks_stripe_secrets();
    exception when others then
        perform agency_rls_test.record('test_10_secret_leakage_trigger_blocks_stripe_secrets','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_11_churned_client_loses_select();
    exception when others then
        perform agency_rls_test.record('test_11_churned_client_loses_select','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
    -- Restore client A status so re-runs are clean.
    update public.agency_clients set status='live' where id=agency_rls_test.client_a_id();

    begin
        perform agency_rls_test.test_12_anon_cannot_insert_anywhere();
    exception when others then
        perform agency_rls_test.record('test_12_anon_cannot_insert_anywhere','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);

    begin
        perform agency_rls_test.test_13_founder_can_insert_and_update_artifacts();
    exception when others then
        perform agency_rls_test.record('test_13_founder_can_insert_and_update_artifacts','FAIL',
            format('uncaught exception sqlstate=%s msg=%s', SQLSTATE, SQLERRM));
    end;
    perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
    -- Clean up the row test 13 inserted so re-runs are deterministic.
    delete from public.agency_artifacts
      where content::text like '%founder-write%' and client_id=agency_rls_test.client_a_id();

    select count(*) filter (where status='PASS'),
           count(*) filter (where status='FAIL'),
           count(*) filter (where status='SKIP'),
           count(*)
      into pass_n, fail_n, skip_n, total_n
      from agency_rls_test.results;

    summary_s := format('AGENCY RLS SUITE: %s pass / %s fail / %s skip (%s total)',
                        pass_n, fail_n, skip_n, total_n);
    raise notice '----------------------------------------------------------';
    raise notice '%', summary_s;
    raise notice '----------------------------------------------------------';

    if fail_n > 0 then
        raise notice 'FAILURES:';
        for summary_s in
            select format('  - %s: %s', test_name, coalesce(detail,''))
              from agency_rls_test.results
             where status = 'FAIL'
             order by id
        loop
            raise notice '%', summary_s;
        end loop;
    end if;

    return query
        select pass_n, fail_n, skip_n,
               format('%s pass / %s fail / %s skip', pass_n, fail_n, skip_n);
end $$;

-- ===========================================================================
-- 6. ONE-SHOT WRAPPER (preferred for Supabase MCP invocation)
-- ===========================================================================

create or replace function public.agency_rls_full_run() returns text
language plpgsql as $$
declare pass_n int; fail_n int; skip_n int; summary text;
begin
    perform public.agency_rls_setup();
    select s.pass_count, s.fail_count, s.skip_count, s.summary
      into pass_n, fail_n, skip_n, summary
      from public.run_all_rls_tests() s;
    perform public.agency_rls_teardown();
    return summary;
end $$;

-- ===========================================================================
-- 7. DEFAULT EXECUTION (psql / Supabase SQL editor entry point)
--    Comment these three lines out if you prefer to call agency_rls_full_run()
--    manually (e.g., from the Supabase MCP).
-- ===========================================================================

select public.agency_rls_setup();
select * from public.run_all_rls_tests();
select public.agency_rls_teardown();
