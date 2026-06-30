create table if not exists public.daily_seo_atp_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  entry_date date not null,
  tasks jsonb not null default '[]'::jsonb,
  raw_atp jsonb not null default '{}'::jsonb,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, entry_date)
);

alter table public.daily_seo_atp_entries
  add column if not exists user_id uuid;

alter table public.daily_seo_atp_entries
  add column if not exists tasks jsonb not null default '[]'::jsonb;

alter table public.daily_seo_atp_entries
  add column if not exists raw_atp jsonb not null default '{}'::jsonb;

alter table public.daily_seo_atp_entries
  add column if not exists last_saved_at timestamptz;

alter table public.daily_seo_atp_entries
  add column if not exists submitted_at timestamptz;

alter table public.daily_seo_atp_entries
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.daily_seo_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_date date not null,
  status text not null default 'completed',
  scorecard text not null default '',
  warnings jsonb not null default '[]'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  selected_action jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, run_date)
);

create table if not exists public.daily_seo_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_daily_seo_atp_entries_workspace_date
  on public.daily_seo_atp_entries(workspace_id, entry_date desc);

create index if not exists idx_daily_seo_runs_workspace_date
  on public.daily_seo_runs(workspace_id, run_date desc);

alter table public.daily_seo_atp_entries enable row level security;
alter table public.daily_seo_atp_entries force row level security;
alter table public.daily_seo_runs enable row level security;
alter table public.daily_seo_runs force row level security;
alter table public.daily_seo_secrets enable row level security;
alter table public.daily_seo_secrets force row level security;

comment on table public.daily_seo_atp_entries is
  'Daily AnswerThePublic prompt results for the Boltcall SEO + AEO operating loop.';

comment on table public.daily_seo_runs is
  'Automatic daily Boltcall SEO + AEO scorecards and source snapshots.';

comment on table public.daily_seo_secrets is
  'Server-only daily SEO secrets read through the Supabase service role.';
