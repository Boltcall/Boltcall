-- Giveaway: capture industry from entry form
alter table public.giveaway_entries
  add column if not exists industry text;
