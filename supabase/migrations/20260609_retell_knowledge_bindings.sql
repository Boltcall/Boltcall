-- Retell-native knowledge bindings for approved vertical packs and client KB.
-- These rows map Boltcall-approved knowledge snapshots to Retell knowledge_base ids
-- so live Retell agents can use native RAG while hard compliance rules stay in
-- the LLM prompt.

create table if not exists public.retell_knowledge_bindings (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('vertical', 'client')),
  pack_slug text references public.vertical_packs(slug) on delete cascade,
  pack_version integer,
  client_id uuid references public.agency_clients(id) on delete cascade,
  content_hash text not null,
  retell_knowledge_base_id text not null,
  retell_status text not null default 'in_progress'
    check (retell_status in ('in_progress', 'complete', 'error', 'refreshing_in_progress')),
  source_count integer not null default 0 check (source_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (scope = 'vertical' and pack_slug is not null and pack_version is not null and client_id is null)
    or
    (scope = 'client' and client_id is not null and pack_slug is null and pack_version is null)
  )
);

create unique index if not exists uq_retell_kb_binding_vertical_snapshot
  on public.retell_knowledge_bindings(scope, pack_slug, pack_version, content_hash)
  where scope = 'vertical';

create unique index if not exists uq_retell_kb_binding_client_snapshot
  on public.retell_knowledge_bindings(scope, client_id, content_hash)
  where scope = 'client';

create index if not exists idx_retell_kb_bindings_client
  on public.retell_knowledge_bindings(client_id)
  where scope = 'client';

create index if not exists idx_retell_kb_bindings_vertical
  on public.retell_knowledge_bindings(pack_slug, pack_version)
  where scope = 'vertical';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_retell_knowledge_bindings_updated_at on public.retell_knowledge_bindings;
create trigger trg_retell_knowledge_bindings_updated_at
before update on public.retell_knowledge_bindings
for each row execute function public.set_updated_at();

alter table public.retell_knowledge_bindings enable row level security;
alter table public.retell_knowledge_bindings force row level security;

drop policy if exists retell_knowledge_bindings_founder_all on public.retell_knowledge_bindings;
create policy retell_knowledge_bindings_founder_all
  on public.retell_knowledge_bindings
  for all
  using (public.is_founder())
  with check (public.is_founder());

revoke all on public.retell_knowledge_bindings from anon, authenticated;
grant all on public.retell_knowledge_bindings to service_role;

comment on table public.retell_knowledge_bindings is
  'Maps founder-approved Boltcall vertical/client knowledge snapshots to Retell knowledge_base ids used by live Retell LLMs.';
