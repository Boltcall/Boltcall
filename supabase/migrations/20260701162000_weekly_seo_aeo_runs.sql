create table if not exists public.weekly_seo_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_week_start date not null,
  run_week_end date not null,
  status text not null default 'completed',
  summary text not null default '',
  warnings jsonb not null default '[]'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  priority_queue jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, run_week_start)
);

create index if not exists idx_weekly_seo_runs_workspace_week
  on public.weekly_seo_runs(workspace_id, run_week_start desc);

alter table public.weekly_seo_runs enable row level security;
alter table public.weekly_seo_runs force row level security;

comment on table public.weekly_seo_runs is
  'Automatic weekly Boltcall SEO + AEO ranked queues and source snapshots.';
