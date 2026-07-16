-- Giveaway entries (table already live in prod; recorded here for schema parity)
create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  page_path text not null default '/giveaway',
  contact_name text not null,
  contact_email text not null,
  company_name text,
  website text,
  why_choose text,
  report_type text not null default 'speed-to-lead-scorecard',
  allow_notifications boolean not null default false,
  referral_code text not null,
  referred_by_code text,
  source_ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.giveaway_entries enable row level security;

-- Applied live 2026-07-16: allow plain giveaway entries alongside report-prize entries
alter table public.giveaway_entries drop constraint if exists giveaway_entries_report_type_check;
alter table public.giveaway_entries add constraint giveaway_entries_report_type_check
  check (report_type = any (array[
    'speed-to-lead-scorecard',
    'homepage-conversion-teardown',
    'ai-lead-response-audit',
    'reviews-reminders-opportunity-report',
    'giveaway'
  ]));
