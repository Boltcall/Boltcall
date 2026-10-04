-- PI free intake: one firm per authenticated owner; service-role writes only.
create table public.pi_intake_firms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  website text not null,
  draft jsonb not null,
  approved_at timestamptz,
  connection_requested_at timestamptz,
  sms_verified_at timestamptz,
  handoff_verified_at timestamptz,
  sending_number text unique,
  integration_key_hash text unique,
  paused boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.pi_intake_conversations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.pi_intake_firms(id) on delete cascade,
  source_id text not null,
  phone text,
  name text,
  is_demo boolean not null default false,
  quota_reserved boolean not null default false,
  status text not null default 'active' check (status in ('active','needs_attention','human','opted_out')),
  messages jsonb not null default '[]',
  consent jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours',
  unique(firm_id, source_id)
);
create index pi_intake_inbox on public.pi_intake_conversations(firm_id, created_at desc);
create table public.pi_intake_receipts (
  firm_id uuid not null references public.pi_intake_firms(id) on delete cascade,
  event_id text not null,
  created_at timestamptz not null default now(),
  primary key(firm_id,event_id)
);
alter table public.pi_intake_firms enable row level security;
alter table public.pi_intake_conversations enable row level security;
alter table public.pi_intake_receipts enable row level security;
-- No browser table access. All reads and writes go through owner-authenticated endpoints.
revoke all on public.pi_intake_firms, public.pi_intake_conversations, public.pi_intake_receipts from anon, authenticated;
grant all on public.pi_intake_firms, public.pi_intake_conversations, public.pi_intake_receipts to service_role;

create function public.pi_intake_start(p_firm uuid, p_source text, p_phone text, p_name text,
  p_consent jsonb, p_messages jsonb, p_demo boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f pi_intake_firms; c pi_intake_conversations; used integer; limited boolean := false;
begin
  select * into f from pi_intake_firms where id=p_firm for update;
  if not found then raise exception 'Firm not found'; end if;
  select * into c from pi_intake_conversations where firm_id=p_firm and source_id=p_source;
  if found then return jsonb_build_object('duplicate',true,'conversation',to_jsonb(c)); end if;
  if not p_demo and p_phone is null then raise exception 'Phone required'; end if;
  if not p_demo then
    select count(*) into used from pi_intake_conversations where firm_id=p_firm and quota_reserved
      and created_at >= date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
    limited := used >= 10;
    if exists(select 1 from pi_intake_conversations where firm_id=p_firm and phone=p_phone and status='opted_out')
      or exists(select 1 from sms_optouts where phone=p_phone) then
      return jsonb_build_object('opted_out',true);
    end if;
  else
    select count(*) into used from pi_intake_conversations where firm_id=p_firm and is_demo and created_at>now()-interval '1 hour';
    if used >= 10 then return jsonb_build_object('limited',true); end if;
  end if;
  insert into pi_intake_conversations(firm_id,source_id,phone,name,consent,messages,is_demo,quota_reserved,status)
    values(p_firm,p_source,p_phone,p_name,p_consent,p_messages,p_demo,not p_demo and not limited,
      case when not p_demo and (limited or f.paused or f.sms_verified_at is null or f.approved_at is null
        or coalesce((p_consent->>'accepted')::boolean,false) is false) then 'needs_attention' else 'active' end)
    returning * into c;
  return jsonb_build_object('limited',limited,'conversation',to_jsonb(c));
end $$;

-- Compare-and-swap prevents concurrent replies or takeover from overwriting each other.
create function public.pi_intake_turn(p_firm uuid,p_conversation uuid,p_expected jsonb,
  p_messages jsonb,p_status text,p_event text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c pi_intake_conversations;
begin
  select * into c from pi_intake_conversations where id=p_conversation and firm_id=p_firm for update;
  if not found then raise exception 'Conversation not found'; end if;
  if p_event is not null and exists(select 1 from pi_intake_receipts where firm_id=p_firm and event_id=p_event) then
    return jsonb_build_object('duplicate',true);
  end if;
  if c.messages <> p_expected or (c.status <> 'active' and p_status not in (c.status,'human','opted_out')) then
    return jsonb_build_object('conflict',true);
  end if;
  if p_event is not null then insert into pi_intake_receipts(firm_id,event_id) values(p_firm,p_event); end if;
  update pi_intake_conversations set messages=p_messages,status=p_status where id=c.id returning * into c;
  return jsonb_build_object('conversation',to_jsonb(c));
end $$;
revoke all on function public.pi_intake_start(uuid,text,text,text,jsonb,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.pi_intake_turn(uuid,uuid,jsonb,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.pi_intake_start(uuid,text,text,text,jsonb,jsonb,boolean) to service_role;
grant execute on function public.pi_intake_turn(uuid,uuid,jsonb,jsonb,text,text) to service_role;
