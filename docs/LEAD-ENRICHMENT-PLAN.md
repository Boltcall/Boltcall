# Boltcall Lead Enrichment — Design Spec (deferred wiring)

Source insight: `Marketing/insights/2026-07-29-cody-schneider-ai-agents-for-marketing.md` (Cody Schneider, video `gy9hUWJvYMQ`, 2026-04-14).

## Trigger

`checkout.completed` webhook from PayPal → creates a paid workspace → fires the enrichment pipeline for that tenant's declared business URL.

## Pipeline

1. **Exa business research** (`exa.ai`). Query = `site:<business_domain>` and `<business_name> reviews`. Extract: services offered, hours of operation, socials, review sentiment. Cost ≈ $0.02.
2. **Apollo decisionmaker lookup** (`apollo.io`). Query by business_domain, role_seniority ∈ {owner, manager}. Return: name, direct phone, LinkedIn. Cost ≈ $0.05.
3. **MillionVerifier email check** on the Apollo email. Cost ≈ $0.001.
4. **Insert row into `account_manager_queue`** (Supabase). Shape: `{ workspace_id, business_summary, decisionmaker, phone, email_status, exa_sources[], created_at }`.

Boltcall's human account manager picks the row up; nothing auto-outbounds.

## Ship-disabled contract

The handler at `netlify/functions/tenant-lead-enrichment.ts` responds 501 with a plan payload until:

1. `LEAD_ENRICHMENT_ENABLED=true` in Netlify env.
2. `EXA_API_KEY`, `APOLLO_API_KEY`, `MILLIONVERIFIER_API_KEY` provisioned.
3. Migration adds `account_manager_queue` table with `is_founder()` RLS.
4. Rate-limit table so a burst of signups can't drain the Exa budget in one hour.

The 501 payload includes the full plan so a follow-up session doesn't need to redesign the contract.

## Non-negotiable guardrail

Per `feedback_never_run_campaigns.md`, this pipeline is a research artifact, NOT a trigger. The `account_manager_queue` row is where enrichment ends. No downstream automation may pick it up and turn it into an outbound sequence — even under a feature flag — without Noam's explicit sign-off on that separate change.

## Why deferred here

- External API keys not budgeted.
- Migration + RLS for `account_manager_queue` is a separate PR.
- Wiring into PayPal webhook belongs with the billing side, not this batch.
