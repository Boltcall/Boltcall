-- Vertical Intelligence Packs: approved shared niche context for V2 Agency OS.
-- Live agents must use only approved rows from these packs plus client KB.

create or replace function public.normalize_vertical_pack_slug(p_vertical text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_vertical is null or btrim(p_vertical) = '' then null
    when lower(p_vertical) in ('law_firm', 'law', 'lawyer', 'lawyers', 'attorney', 'attorneys', 'legal') then 'law_firm'
    when lower(p_vertical) in ('med_spa', 'medical_spa', 'medspa', 'med spa', 'aesthetics', 'aesthetic', 'botox', 'spa') then 'med_spa'
    when lower(p_vertical) in ('solar', 'solar_installation', 'solar panel', 'solar_panel', 'solar_panels', 'solar_energy') then 'solar'
    when lower(p_vertical) ~ '(law|legal|attorney|lawyer)' then 'law_firm'
    when lower(p_vertical) ~ '(med[ _-]*spa|medspa|aesthetic|botox|filler)' then 'med_spa'
    when lower(p_vertical) ~ '(solar|photovoltaic|pv)' then 'solar'
    else null
  end;
$$;

revoke all on function public.normalize_vertical_pack_slug(text) from public;
grant execute on function public.normalize_vertical_pack_slug(text) to authenticated, service_role;

create table if not exists public.vertical_packs (
  slug text primary key,
  display_name text not null,
  jurisdiction_scope text not null default 'us_national',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),
  version int not null default 1 check (version > 0),
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug in ('law_firm', 'med_spa', 'solar'))
);

create table if not exists public.vertical_knowledge (
  id uuid primary key default gen_random_uuid(),
  pack_slug text not null references public.vertical_packs(slug) on delete cascade,
  pack_version int not null default 1 check (pack_version > 0),
  kind text not null check (
    kind in (
      'guardrail',
      'intake_flow',
      'faq',
      'escalation_rule',
      'disallowed_claim',
      'qualification_field',
      'source_note'
    )
  ),
  section text not null,
  content jsonb not null,
  source_url text,
  source_title text,
  source_type text not null check (
    source_type in ('official', 'regulator', 'bar_rule', 'client_override', 'internal_review')
  ),
  jurisdiction text not null default 'us_national',
  confidence text not null default 'high' check (confidence in ('high', 'medium', 'low')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  effective_date date not null default current_date,
  expires_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  embedding halfvec(3072),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_slug, pack_version, kind, section)
);

create index if not exists idx_vertical_knowledge_pack_status
  on public.vertical_knowledge(pack_slug, status, kind);

create index if not exists idx_vertical_knowledge_active
  on public.vertical_knowledge(pack_slug, status, expires_at)
  where status = 'approved';

create index if not exists idx_vertical_knowledge_embedding
  on public.vertical_knowledge
  using hnsw (embedding halfvec_cosine_ops)
  where embedding is not null;

create or replace function public.set_vertical_pack_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vertical_packs_updated_at on public.vertical_packs;
create trigger trg_vertical_packs_updated_at
before update on public.vertical_packs
for each row execute function public.set_vertical_pack_updated_at();

drop trigger if exists trg_vertical_knowledge_updated_at on public.vertical_knowledge;
create trigger trg_vertical_knowledge_updated_at
before update on public.vertical_knowledge
for each row execute function public.set_vertical_pack_updated_at();

alter table public.vertical_packs enable row level security;
alter table public.vertical_packs force row level security;
alter table public.vertical_knowledge enable row level security;
alter table public.vertical_knowledge force row level security;

drop policy if exists vertical_packs_founder_all on public.vertical_packs;
create policy vertical_packs_founder_all
  on public.vertical_packs
  for all
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists vertical_packs_approved_select on public.vertical_packs;
create policy vertical_packs_approved_select
  on public.vertical_packs
  for select
  using (status = 'approved');

drop policy if exists vertical_knowledge_founder_all on public.vertical_knowledge;
create policy vertical_knowledge_founder_all
  on public.vertical_knowledge
  for all
  using (public.is_founder())
  with check (public.is_founder());

revoke all on public.vertical_packs from anon, authenticated;
revoke all on public.vertical_knowledge from anon, authenticated;
grant select on public.vertical_packs to authenticated;
grant all on public.vertical_packs to service_role;
grant all on public.vertical_knowledge to service_role;

create or replace function public.retrieve_vertical_knowledge(
  p_pack_slug text,
  p_query_embedding halfvec(3072),
  p_k int default 12,
  p_kinds text[] default null
)
returns table (
  id uuid,
  pack_slug text,
  kind text,
  section text,
  content jsonb,
  source_title text,
  jurisdiction text,
  similarity real
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    vk.id,
    vk.pack_slug,
    vk.kind,
    vk.section,
    vk.content,
    vk.source_title,
    vk.jurisdiction,
    (1 - (vk.embedding <=> p_query_embedding))::real as similarity
  from public.vertical_knowledge vk
  where vk.pack_slug = public.normalize_vertical_pack_slug(p_pack_slug)
    and vk.status = 'approved'
    and vk.embedding is not null
    and (vk.expires_at is null or vk.expires_at > now())
    and (p_kinds is null or vk.kind = any(p_kinds))
    and (
      (vk.source_url is not null and vk.source_title is not null)
      or (vk.source_type = 'internal_review' and vk.approved_at is not null)
    )
  order by vk.embedding <=> p_query_embedding
  limit greatest(1, least(coalesce(p_k, 12), 30));
$$;

revoke all on function public.retrieve_vertical_knowledge(text, halfvec(3072), int, text[]) from public;
grant execute on function public.retrieve_vertical_knowledge(text, halfvec(3072), int, text[]) to service_role;

comment on function public.retrieve_vertical_knowledge(text, halfvec(3072), int, text[]) is
  'Approved-only shared vertical pack retrieval. SECURITY DEFINER; service_role only. Live agents must never retrieve draft, archived, expired, or unsourced rows.';

create or replace view public.approved_vertical_guardrails
with (security_barrier = true)
as
select
  vk.id,
  vk.pack_slug,
  vp.display_name as pack_display_name,
  vk.kind,
  vk.section,
  vk.content,
  vk.jurisdiction,
  vk.confidence,
  vk.pack_version,
  vk.effective_date,
  vk.expires_at
from public.vertical_knowledge vk
join public.vertical_packs vp on vp.slug = vk.pack_slug
where vp.status = 'approved'
  and vk.status = 'approved'
  and vk.kind in ('guardrail', 'intake_flow', 'escalation_rule', 'disallowed_claim', 'qualification_field')
  and (vk.expires_at is null or vk.expires_at > now())
  and (
    public.is_founder()
    or exists (
      select 1
      from public.business_profiles bp
      where bp.user_id = auth.uid()
        and public.normalize_vertical_pack_slug(
          coalesce(bp.user_preferences -> 'v2_settings' ->> 'vertical', bp.main_category)
        ) = vk.pack_slug
    )
  );

revoke all on public.approved_vertical_guardrails from anon;
grant select on public.approved_vertical_guardrails to authenticated, service_role;

insert into public.vertical_packs (slug, display_name, jurisdiction_scope, status, version, approved_at)
values
  ('law_firm', 'Law Firm', 'us_national', 'approved', 1, now()),
  ('med_spa', 'Med Spa', 'us_national', 'approved', 1, now()),
  ('solar', 'Solar', 'us_national', 'approved', 1, now())
on conflict (slug) do update set
  display_name = excluded.display_name,
  jurisdiction_scope = excluded.jurisdiction_scope,
  status = excluded.status,
  version = excluded.version,
  approved_at = coalesce(public.vertical_packs.approved_at, excluded.approved_at),
  updated_at = now();

insert into public.vertical_knowledge
  (pack_slug, pack_version, kind, section, content, source_url, source_title, source_type, jurisdiction, confidence, status, expires_at, approved_at)
values
  (
    'law_firm', 1, 'guardrail', 'No legal advice or outcome promises',
    '{"summary":"The agent may collect facts and schedule consultation, but must not give legal advice, assess case strength, predict outcomes, interpret deadlines, or promise fees/results.","agent_rule":"If the caller asks what they should do legally, whether they have a case, or whether they will win, collect the facts and transfer or book a lawyer consultation."}'::jsonb,
    'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_7_2_advertising/',
    'ABA Model Rule 7.2: Communications Concerning a Lawyer''s Services',
    'bar_rule', 'us_national', 'high', 'approved', now() + interval '12 months', now()
  ),
  (
    'law_firm', 1, 'intake_flow', 'Law firm intake essentials',
    '{"fields":["practice area","state or jurisdiction","deadline or court date","opposing/adverse party","current representation status","caller contact details","urgency or safety issue"],"agent_rule":"Capture enough detail for conflict checks and fast attorney follow-up, then book or transfer according to client rules."}'::jsonb,
    'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/',
    'ABA Model Rules of Professional Conduct',
    'bar_rule', 'us_national', 'high', 'approved', now() + interval '12 months', now()
  ),
  (
    'law_firm', 1, 'escalation_rule', 'Urgent legal escalation',
    '{"triggers":["imminent deadline","court date within 7 days","active arrest or custody issue","domestic violence or safety concern","caller asks for immediate legal instruction"],"agent_rule":"Do not troubleshoot the legal issue. Mark urgent, transfer if possible, otherwise capture callback details and tell the caller an attorney or staff member will follow up."}'::jsonb,
    'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/',
    'ABA Model Rules of Professional Conduct',
    'bar_rule', 'us_national', 'high', 'approved', now() + interval '12 months', now()
  ),
  (
    'law_firm', 1, 'disallowed_claim', 'Legal marketing claims',
    '{"disallowed":["guaranteed win","best lawyer unless client-approved and substantiated","legal advice over the phone","exact deadline interpretation","case value estimate"],"agent_rule":"Use neutral scheduling language and avoid comparative or guaranteed claims unless supplied in the client KB."}'::jsonb,
    'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_7_2_advertising/comment_on_rule_7_2/',
    'ABA Comment on Rule 7.2',
    'bar_rule', 'us_national', 'high', 'approved', now() + interval '12 months', now()
  ),

  (
    'med_spa', 1, 'guardrail', 'No medical diagnosis or candidacy decision',
    '{"summary":"The agent may explain scheduling and collect intake details, but must not diagnose, decide candidacy, advise on complications, or guarantee treatment results.","agent_rule":"Medical, side-effect, contraindication, pregnancy, medication, and complication questions must be routed to licensed staff."}'::jsonb,
    'https://www.fda.gov/medical-devices/aesthetic-cosmetic-devices/dermal-fillers-soft-tissue-fillers',
    'FDA: Dermal Fillers (Soft Tissue Fillers)',
    'regulator', 'us_national', 'high', 'approved', now() + interval '6 months', now()
  ),
  (
    'med_spa', 1, 'guardrail', 'PHI-sensitive call handling',
    '{"summary":"Treat health details as sensitive. The agent should collect the minimum necessary information for booking and avoid repeating private medical details unnecessarily.","agent_rule":"For medical-history detail beyond scheduling needs, tell the caller licensed staff will review it during consultation."}'::jsonb,
    'https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html',
    'HHS: Summary of the HIPAA Privacy Rule',
    'regulator', 'us_national', 'high', 'approved', now() + interval '6 months', now()
  ),
  (
    'med_spa', 1, 'intake_flow', 'Med spa consult intake',
    '{"fields":["treatment interest","new or returning client","desired timing","provider preference","contact details","basic consult reason"],"agent_rule":"Book consults and collect scheduling data. Do not screen medically unless the client KB supplies an approved script."}'::jsonb,
    'https://www.fda.gov/medical-devices/products-and-medical-procedures/aesthetic-cosmetic-devices',
    'FDA: Aesthetic (Cosmetic) Devices',
    'regulator', 'us_national', 'high', 'approved', now() + interval '6 months', now()
  ),
  (
    'med_spa', 1, 'escalation_rule', 'Medical concern escalation',
    '{"triggers":["possible allergic reaction","swelling or drooping after procedure","pregnancy or contraindication question","medication interaction question","infection or severe pain","asks if treatment is safe for them"],"agent_rule":"Do not reassure medically. Transfer to licensed staff if possible; otherwise capture details and mark urgent clinical follow-up."}'::jsonb,
    'https://www.fda.gov/consumers/consumer-updates/dermal-filler-dos-and-donts-wrinkles-lips-and-more',
    'FDA: Dermal Filler Do''s and Don''ts',
    'regulator', 'us_national', 'high', 'approved', now() + interval '6 months', now()
  ),
  (
    'med_spa', 1, 'disallowed_claim', 'Aesthetic result and price claims',
    '{"disallowed":["guaranteed results","no-risk treatment","medical advice","exact candidacy decision","unsourced pricing or specials"],"agent_rule":"Only quote pricing, promos, and treatment claims from client KB. Otherwise offer a consultation."}'::jsonb,
    'https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance',
    'FTC: Health Products Compliance Guidance',
    'regulator', 'us_national', 'high', 'approved', now() + interval '6 months', now()
  ),

  (
    'solar', 1, 'guardrail', 'No guaranteed savings or free-solar claims',
    '{"summary":"The agent may qualify the homeowner and book a consultation, but must not promise free solar, guaranteed savings, tax-credit eligibility, or financing approval.","agent_rule":"If asked for exact savings, incentives, tax credits, financing, or eligibility, collect details and route to a solar consultant."}'::jsonb,
    'https://consumer.ftc.gov/consumer-alerts/2024/08/how-avoid-getting-burned-solar-or-clean-energy-scams',
    'FTC: How to avoid getting burned by solar or clean energy scams',
    'regulator', 'us_national', 'high', 'approved', now() + interval '90 days', now()
  ),
  (
    'solar', 1, 'intake_flow', 'Solar qualification intake',
    '{"fields":["homeowner or renter","service address","utility provider or bill range","roof age/type/shade","timeline","prior quotes","HOA or roof constraints"],"agent_rule":"Qualify for a solar consultation without making financial, engineering, or tax promises."}'::jsonb,
    'https://www.energy.gov/energysaver/homeowners-guide-going-solar',
    'U.S. Department of Energy: Homeowner''s Guide to Going Solar',
    'official', 'us_national', 'high', 'approved', now() + interval '90 days', now()
  ),
  (
    'solar', 1, 'escalation_rule', 'Solar finance and incentive escalation',
    '{"triggers":["tax credit eligibility","state or utility incentive","financing approval","lease or PPA contract terms","roof suitability","HOA approval","utility interconnection"],"agent_rule":"Do not answer as a financial, tax, legal, or engineering advisor. Collect facts and book or transfer to the consultant."}'::jsonb,
    'https://home.treasury.gov/news/press-releases/jy2389',
    'U.S. Treasury: Consumer Advisory on Solar Energy',
    'official', 'us_national', 'high', 'approved', now() + interval '90 days', now()
  ),
  (
    'solar', 1, 'disallowed_claim', 'Solar advertising claims',
    '{"disallowed":["free solar","no cost unless client KB substantiates the program terms","guaranteed bill elimination","guaranteed tax credit","guaranteed financing approval","government/utility affiliation unless explicitly true"],"agent_rule":"Use careful, conditional language. Book a consultation for exact savings, tax, financing, and eligibility questions."}'::jsonb,
    'https://www.ftc.gov/business-guidance/blog/2024/08/dont-waste-your-energy-solar-scam',
    'FTC Business Blog: Don''t waste your energy on a solar scam',
    'regulator', 'us_national', 'high', 'approved', now() + interval '90 days', now()
  )
on conflict (pack_slug, pack_version, kind, section) do update set
  content = excluded.content,
  source_url = excluded.source_url,
  source_title = excluded.source_title,
  source_type = excluded.source_type,
  jurisdiction = excluded.jurisdiction,
  confidence = excluded.confidence,
  status = excluded.status,
  expires_at = excluded.expires_at,
  approved_at = coalesce(public.vertical_knowledge.approved_at, excluded.approved_at),
  updated_at = now();
