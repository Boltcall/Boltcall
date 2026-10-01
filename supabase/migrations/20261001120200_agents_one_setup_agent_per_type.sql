-- One setup-provisioned inbound + one speed_to_lead agent per user.
--
-- provisionAgentSetup (src/lib/setup/provisionAgentSetup.ts) is idempotent for
-- serial retries (reuses workspace/profile, skips existing agent types), but two
-- concurrent runs (/start launch + /setup-loading, double tab) can both pass the
-- "no agent yet" check. With this index the loser's insert in retell-agents
-- create_agent fails, which already rolls back the Retell agent + LLM and 5xxs.
--
-- Scope: only setup-created rows (business_profile_id set). Agents added from
-- the Agents page carry no business_profile_id and stay unlimited.
-- created_at cutoff: the founder test account (a836439d…) already holds 6+6
-- pre-fix duplicates from repeated onboarding runs; nothing is deleted here.
create unique index if not exists agents_one_setup_agent_per_type
  on public.agents (user_id, agent_type)
  where business_profile_id is not null
    and agent_type in ('inbound', 'speed_to_lead')
    and created_at >= '2026-10-02 00:00:00+00';
