# Batch 1 — 10x Product Plan

**Date:** 2026-07-11
**Scope:** Three highest-leverage tasks: (1) missed-call SMS hardening, (3) booked-revenue dashboard, (8) onboarding fix + convergence on `/start`.
**Basis:** Codebase exploration 2026-07-11 (three parallel deep-dives). Key correction to the original brief: the missed-call → SMS recovery pipeline **already exists end-to-end in production** — the work is hardening, not building.

---

## Execution order

| Order | Item | Why | Effort |
|---|---|---|---|
| 1 | Task 8 step 1 — `create_full` idempotency | Live prod bug (duplicate agents), ~1 hour fix | XS |
| 2 | Task 1 — missed-call hardening | Small, protects the core value prop, compliance risk (TCPA) | S (1–2 sessions) |
| 3 | Task 3 — booked-revenue dashboard | New revenue-proof surface, kills "am I getting value" churn | M (2–3 sessions) |
| 4 | Task 8 steps 2–5 — onboarding convergence | Biggest lift; benefits from Task 3's `services` table | L (3–4 sessions) |

Each item gets its own worktree branch per the auto workflow (worktree → commit → merge → deploy on command).

---

## Task 1 — Missed-Call SMS: Harden, Don't Build

### Current state (verified)

The pipeline is live:

- **Detection:** `netlify/functions/retell-webhook.ts` — `isMissedCall()` (lines 28–39): `call_status === 'not_connected'`, `'error'`, or `ended` with `duration_ms < 15000` (`MISSED_CALL_THRESHOLD_MS`, line 19).
- **Enrollment:** webhook lines 432–548 — if user has an active `followup_sequences` row with `trigger_event = 'missed_call'`, caller is enrolled into `followup_enrollments`; immediate SMS step inserts a `scheduled_messages` row (lines 466–513). Legacy single-shot fallback via `business_features.missed_call_config` (lines 566–647).
- **Sending:** `netlify/functions/message-dispatcher.ts` cron (`*/5 * * * *` in `netlify.toml`) drains `scheduled_messages` via Twilio (`sendTwilioSms()`, lines 16–48). `sequence-processor` advances drips.
- **Cancel-on-answer:** webhook lines 204–215 — answered call ≥15s marks active enrollments `completed`.
- **Replies:** `netlify/functions/twilio-inbound-sms.ts` → `sms_conversations`. AI reply drafting in `sms-ai-responder.ts`.
- **Config UI:** `src/pages/dashboard/MissedCallsPage.tsx` (template, enable, delay — `MissedCallConfig` lines 26–34).
- **Tables:** `followup_sequences`, `followup_sequence_steps`, `followup_enrollments`, `sms_conversations` (migration `supabase/migrations/20260321_followup_sequences.sql`), plus `scheduled_messages`, `business_features`, `leads` (base schema).

### Gap 1 — Enrollment dedup (double-text risk)

**Problem:** webhook inserts `followup_enrollments` without checking for an existing active enrollment for the same `contact_phone`. Second missed call from the same number = double enrollment = duplicate texts. Looks broken, burns trust, burns Twilio spend.

**Fix:**
1. In `retell-webhook.ts` before the insert at ~line 466: `SELECT id FROM followup_enrollments WHERE user_id = ? AND contact_phone = ? AND status = 'active' LIMIT 1` → skip enrollment if found (log skip).
2. Same guard on the legacy single-shot path (~line 566): skip if a `scheduled_messages` row of type `missed_call_textback` for that phone is already `scheduled` within the last 24h.
3. DB backstop migration: unique partial index `CREATE UNIQUE INDEX ... ON followup_enrollments (user_id, contact_phone) WHERE status = 'active'`. Handle the insert conflict gracefully (race between two concurrent webhooks).

**Verify:** fire two missed-call webhook payloads for the same phone within 1 minute → exactly 1 enrollment, 1 scheduled message. Third call after answer-cancel → new enrollment allowed.

### Gap 2 — STOP + quiet hours (TCPA compliance)

**Problem:** no quiet-hours guard found in `retell-webhook.ts` or `message-dispatcher.ts`. STOP handling in `twilio-inbound-sms.ts` unverified. Texting leads at 2am or after opt-out is a legal exposure, not a polish item.

**Fix:**
1. Verify/complete STOP handling in `twilio-inbound-sms.ts`: on STOP/UNSUBSCRIBE/QUIT body → mark all active `followup_enrollments` for that phone `unsubscribed`, cancel pending `scheduled_messages`, add phone to a blocklist (new column or table). Reply with confirmation per carrier requirements.
2. Quiet-hours guard in `message-dispatcher.ts`: before send, if local time (business timezone from `business_profiles`; per-recipient timezone is out of scope) outside 08:00–21:00 → push `scheduled_for` to next 08:00, leave status `scheduled`, continue batch.
3. Blocklist check in dispatcher send path (defense in depth — enrollment guard alone misses already-queued messages).

**Verify:** message scheduled for 23:00 → dispatcher defers to 08:00 next day. STOP reply → all pending messages for that phone cancelled and future enrollments refused.

### Gap 3 — Delivery status surfaced in dashboard

**Problem:** `scheduled_messages.status` transitions exist but the missed-calls inbox doesn't show them. "Text sent 2 minutes after the missed call" is the product's proof-of-value moment — currently invisible.

**Fix:** in `MissedCallsPage.tsx`, per missed-call row, query the matching `scheduled_messages` / `sms_conversations` records by phone + time window and show a badge: `Text sent · 2m after` / `Scheduled` / `Failed` / `Replied`.

**Verify:** missed call row shows badge matching DB status; reply from the lead flips badge to `Replied`.

### Files touched

`netlify/functions/retell-webhook.ts`, `netlify/functions/message-dispatcher.ts`, `netlify/functions/twilio-inbound-sms.ts`, `src/pages/dashboard/MissedCallsPage.tsx`, 1 migration (unique index + blocklist).

---

## Task 3 — Booked-Revenue Dashboard

### Current state (verified)

- **No dollar value is captured anywhere live.** Bookings land in the `appointments` table from three paths: Cal.com webhook (`netlify/functions/appointment-handler.ts:159–177`), Retell agent tool `book_appointment` (`netlify/functions/agent-tools.ts:572–584`), and SMS flows (`acs-inbound-sms.ts:144`, `twilio-inbound-sms.ts:128`). Columns include `service_name` but no price/value.
- **`appointments` has no `CREATE TABLE` in repo migrations** — schema drift risk; dump live schema before writing the migration.
- Onboarding collects `services[].price` (`src/pages/start/StartOnboarding.tsx:610`) but it only flows into the generated Retell prompt (`generate-agent-prompt.ts:2803` `formatServices()`) and dies there — never persisted to a table.
- `RoiDashboard` (`src/components/analytics/RoiDashboard.tsx`) shows a synthetic estimate: callbacks count × `avgDealValue` × 0.3 close rate (`src/lib/analyticsApi.ts:271`). `RoiConfig` lives in localStorage only (`useAnalytics.ts:81–95`).
- Reusable UI already built: `OverviewMetricCard` (KPI tile + sparkline), `TimeSeriesCard` (Recharts area chart), `TodayGlanceCard` (`src/components/dashboard/TodayGlanceCard.tsx:45–84` — currently 4 tiles, no revenue). Main dashboard is `src/pages/dashboard/HomePage.tsx`.
- Dead field: `dashboardStore` `kpis.estRevenue` (`src/types/dashboard.ts:29`) — seeded 0, never written.
- Proven pattern to copy: agency side computes `today_pipeline_value_usd` from `booking_made` events with `payload.estimated_value_usd` fallback to `VERTICAL_AVG_TICKET_USD` map (`netlify/functions/agency-client-home.ts:91–103, 303–312`).

### Step 1 — Migration

1. Dump live `appointments` schema first (no in-repo DDL).
2. Add `estimated_value_cents INTEGER` to `appointments`.
3. New table:
   ```sql
   CREATE TABLE services (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id),
     workspace_id uuid,
     name text NOT NULL,
     price_cents integer,
     duration_min integer,
     created_at timestamptz DEFAULT now()
   );
   ```
   RLS: owner read/write (copy pattern from `20260705220000_rls_policies_retell_calls_scores.sql`).
4. Add `avg_deal_value_cents integer` to `business_profiles` (global fallback).

**Verify:** migration applies clean against prod schema dump.

### Step 2 — Persist services from onboarding

Onboarding services step (`StartOnboarding.tsx` + `src/lib/setup/provisionAgentSetup.ts`) writes rows to `services` in addition to feeding the prompt. No backfill needed (pre-revenue, few users) — existing users edit via the new settings page.

**Verify:** complete onboarding with 2 services → 2 `services` rows with correct `price_cents`.

### Step 3 — Stamp value at booking time

In all insert paths (`appointment-handler.ts:159`, `agent-tools.ts:572`; SMS paths if they set `service_name`):
1. Look up `services` by `user_id` + fuzzy name match (`ilike` on `service_name`).
2. Stamp `estimated_value_cents` from the match; fallback to `business_profiles.avg_deal_value_cents`; else NULL.
3. Lookup failure is non-fatal — never block a booking insert on pricing.

**Verify:** fire test Cal.com webhook with a known `service_name` → row has correct cents. Unknown service → falls back to avg deal value.

### Step 4 — Settings UI

New `src/pages/dashboard/settings/ServicesPage.tsx` (copy existing settings sub-page pattern from `GeneralPage.tsx`):
- CRUD list of services: name, price, duration.
- Single "average job value" field → `business_profiles.avg_deal_value_cents`.
- Register route in `AppRoutes.tsx` + settings nav.

**Verify:** edit a price → next booking with that service stamps the new value.

### Step 5 — Dashboard tile + real ROI

1. `fetchBookedRevenueMTD()` in `src/lib/dashboardApi.ts`: sum `estimated_value_cents` for month-to-date `appointments` where status not cancelled.
2. 5th tile in `TodayGlanceCard.tsx` via `OverviewMetricCard`: **"Booked this month: $X"**. Zero state: "Set your service prices" linking to the settings page.
3. Wire `kpis.estRevenue` to the real number or delete the dead field.
4. `RoiDashboard`: when real booking values exist, replace the synthetic leads×0.3 estimate with the actual sum; keep the estimate as labeled fallback.

**Verify:** seed 3 appointments with values → tile shows correct sum; empty state renders the settings link.

### Sequencing

1 → 2 → 3 strictly ordered; 4 and 5 parallel after 3.

---

## Task 8 — Onboarding: Fix V1, Converge on `/start`

### Current state (verified — worse than assumed)

**V1 wizard (`src/pages/VoiceAgentOnboarding.tsx`, route `/voice-agent-setup`) is live AND broken:**
- Never creates a `business_profiles` row → `create_full` skips KB folder creation (`retell-agents.ts:870` gate) → **the agent runs blind on its knowledge base**.
- Phone purchase (`twilio-numbers.ts:187–192`) requires `business_profiles` + `workspaces` → **always 409s**; the wizard silently swallows it (`VoiceAgentOnboarding.tsx:234–238`) → every V1 user lands on "Number pending — configure in dashboard".
- UI promises "2 AI voice agents" (line 593) but only one `create_full` runs.
- Inbound links: `Footer.tsx:95`, `BlogCenter.tsx:533`, `YourAiOverview.tsx:128`.

**The duplicate-agent race is a missing idempotency check, not a missing lock.** A provisioning lock exists since 2026-07-09 (`acquire_provisioning_lock` RPC, migration `20260709163000_provisioning_locks.sql`, called at `retell-agents.ts:586`, released in `finally` at 942–944). But `create_full` never checks whether an agent of that type already exists — a sequential re-run of any wizard mints a second Retell agent + LLM + `agents` row. The lock only stops *concurrent* requests.

**`/start` (StartOnboarding) already has the right architecture:** website-scrape prefill (`useWebsiteIntel`), client-side idempotent provisioner (`src/lib/setup/provisionAgentSetup.ts` — reuses workspace/profile lines 21–54, pre-checks agents by type lines 56–61, creates both inbound + speed_to_lead, calls `setup-launch`).

**Best lock pattern in the repo** (reference for any finalize endpoint): `saas-v2-setup-finalize.ts:180–227` — compare-and-set on `workspaces.v2_setup_state_version` with 409 `deploy_in_flight` for the loser.

**Dead code:** `src/pages/Setup.tsx` (654 lines, old chat wizard) — not routed, only imported by its own tests. Delete.

### Step 1 — Server-side idempotency in `create_full` (DO FIRST — prod bug)

In `netlify/functions/retell-agents.ts` at ~line 605 (after lock acquire, before Firecrawl/KB work):

```
SELECT id, retell_agent_id FROM agents
WHERE user_id = ? AND agent_type = ? LIMIT 1
```

If found → return existing `{ agent_id, supabase_agent_id, already_provisioned: true }` instead of minting. Root-cause fix for all callers (V1 wizard, V2 finalize, `/start`) — one guard in the shared function.

**Verify:** call `create_full` twice for same user + agent_type → exactly 1 Retell agent; second call returns the existing IDs with `already_provisioned: true`. V2 finalize (which intentionally creates two *different* agent types) still works.

### Step 2 — Kill V1 wizard

1. `AppRoutes.tsx`: redirect `/voice-agent-setup` → `/start`.
2. Update 3 inbound links (`Footer.tsx:95`, `BlogCenter.tsx:533`, `YourAiOverview.tsx:128`) to `/start`.
3. Delete `src/pages/VoiceAgentOnboarding.tsx`, `src/pages/Setup.tsx`, and their tests (`Setup.test.tsx`, `setup-flow.test.tsx`).

**Verify:** old URL redirects; `npm run build` passes; grep confirms no remaining references.

### Step 3 — `/start` completes the promise

Close the gaps so `/start` delivers everything end-to-end: profile + workspace + both agents + KB attached + **phone number** + test call.

1. Audit `provisionAgentSetup.ts` output against the checklist: `business_profiles` row, `workspaces` row, inbound + speed_to_lead agents, `kb_folders` + `agent_kb_folders` linkage.
2. Add phone purchase after agent creation: call `twilio-numbers` `action: 'purchase'` (works here — business_profile exists). Non-fatal on failure, but **show the failure** with a retry affordance. No silent swallow.
3. Persist services to the `services` table (shared step with Task 3 step 2).

**Verify:** fresh account through `/start` end-to-end → both agents exist, `agent_kb_folders` row present, phone number `active` in `phone_numbers`, number dialable and answers as the configured agent.

### Step 4 — Calendar OAuth in the flow

Add optional "Connect Google Calendar" step to the `/start` launch scene, reusing `google-calendar-auth-start.ts` / `google-calendar-auth-callback.ts` and the `GoogleCalendarTab.tsx` pattern. Skippable — but without it the agent's `book_appointment` / `check_availability` tools silently no-op, so:
- If skipped, show a persistent post-launch banner: "Connect your calendar so your agent can book jobs."

**Verify:** connect during onboarding → `check_availability` agent tool returns real slots.

### Step 5 — Test call as finale

`/start` "live" scene:
1. Show the purchased number + "Call your agent right now" CTA (pattern from old V1 wizard line 676–680).
2. In-browser web-call alternative: reuse `TalkToAgentPage.tsx` flow (`create_web_call` action, `retell-agents.ts:948–967`, `retell-client-js-sdk`).

**Verify:** web call connects with mic and agent responds; dialing the number reaches the configured agent.

### Files touched

`netlify/functions/retell-agents.ts`, `src/routes/AppRoutes.tsx`, `src/components/Footer.tsx`, `src/pages/BlogCenter.tsx`, `src/pages/dashboard/YourAiOverview.tsx`, `src/pages/start/StartOnboarding.tsx`, `src/lib/setup/provisionAgentSetup.ts`, deletions (`VoiceAgentOnboarding.tsx`, `Setup.tsx`, tests).

---

## Cross-cutting rules

- Every item: own worktree branch, auto-commit on completion, merge on command, deploy only when asked.
- Migrations: verify against live schema first (`appointments` has no in-repo DDL — dump before touching).
- Non-trivial logic ships with one runnable check (webhook dedup, quiet-hours math, value stamping).
- No new dependencies anticipated for any task.
