-- Customer runbooks — the "amnesia handbook" per Allie K Miller video insight
-- (2026-08-13): the boring SOP file is the highest-leverage AI artifact,
-- the doc you'd hand to a new hire if you woke up with amnesia.
-- Generated on Day 3 of onboarding, editable by the customer.

create table if not exists public.customer_runbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,
  status text not null default 'pending' check (status in ('pending', 'generating', 'ready', 'failed')),
  content_md text,
  source_snapshot jsonb,          -- {retell_config, first_calls_count, first_leads_count, industry}
  generated_at timestamptz,
  edited_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_runbooks_user_id_idx on public.customer_runbooks(user_id);
create index if not exists customer_runbooks_workspace_id_idx on public.customer_runbooks(workspace_id) where workspace_id is not null;
create index if not exists customer_runbooks_status_idx on public.customer_runbooks(status);

alter table public.customer_runbooks enable row level security;

-- Owner-only RLS — matches sibling tables like leads/business_profiles.
create policy customer_runbooks_owner_select on public.customer_runbooks
  for select using (auth.uid() = user_id);
create policy customer_runbooks_owner_insert on public.customer_runbooks
  for insert with check (auth.uid() = user_id);
create policy customer_runbooks_owner_update on public.customer_runbooks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy customer_runbooks_owner_delete on public.customer_runbooks
  for delete using (auth.uid() = user_id);

-- Service role bypasses RLS by default; explicit grant kept for clarity.
grant all on public.customer_runbooks to service_role;

-- Bump updated_at trigger (reuses the standard function if present).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'trigger_set_updated_at') then
    execute 'drop trigger if exists customer_runbooks_updated_at on public.customer_runbooks';
    execute 'create trigger customer_runbooks_updated_at before update on public.customer_runbooks
             for each row execute procedure public.trigger_set_updated_at()';
  end if;
end$$;
