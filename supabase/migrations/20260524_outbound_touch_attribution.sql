-- 20260524 — outbound_touch_attribution
--
-- Tracks the full lifecycle of an outbound Instantly touch keyed by a
-- campaign_lead_uid that we inject into every URL in the email body via the
-- {{lead_uid}} merge tag. Captures the "silent self-serve" outcome: the
-- recipient never replies but visits the site, books a meeting, or signs up.
--
-- Net-new campaigns only. Existing in-flight Instantly sequences are not
-- backfilled; they continue to run with their original (un-tagged) URLs.

create extension if not exists "pgcrypto";

create table if not exists public.outbound_touch_attribution (
  id                  uuid primary key default gen_random_uuid(),
  campaign_lead_uid   text unique not null,
  campaign_id         text not null,
  lead_email          text,
  lead_company        text,
  sent_at             timestamptz not null default now(),
  first_visit_at      timestamptz,
  visit_count         int not null default 0,
  booking_at          timestamptz,
  signup_at           timestamptz,
  -- silent_self_serve = booked or signed up AND never replied to the email.
  -- Kept as a plain column (not generated) because the reply-correlated path
  -- runs in a separate function — generated columns can't reference other
  -- tables without an immutable function and we want this lightweight.
  silent_self_serve   boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_otu_campaign on public.outbound_touch_attribution(campaign_id);
create index if not exists idx_otu_first_visit on public.outbound_touch_attribution(first_visit_at) where first_visit_at is not null;

comment on table public.outbound_touch_attribution is
  'Silent self-serve attribution: stamps every outbound Instantly send with a uid via {{lead_uid}} merge tag and tracks downstream site visits / bookings / signups even when the recipient never replies.';
comment on column public.outbound_touch_attribution.campaign_lead_uid is
  'Unique per email+campaign. Injected into URLs as ?ref=<uid>. Site captures it and POSTs to /.netlify/functions/silent-touch-attribution.';
comment on column public.outbound_touch_attribution.silent_self_serve is
  'Set true by the instantly-webhook function when a booking/signup is observed AND no reply event has arrived for this uid.';
