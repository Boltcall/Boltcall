# Batch 3 — 10x Product Plan

**Date:** 2026-07-12
**Scope:** Distribution + expansion tier: (2) unified inbox, (5) CRM connectors, (7) lead scoring + hot-handoff, (9) speed-test proof widget.
**Basis:** Codebase exploration 2026-07-12 (four parallel deep-dives). Companion docs: `docs/batch1-10x-plan.md`, `docs/batch2-10x-plan.md`.

**Key corrections to the original brief:**
- Unified inbox has a dead, purpose-built schema already sitting in the repo (`chats` table + `ChatService`) that nothing writes to, and a full read/list/detail API + UI already built against it (`V2MessagesPage.tsx` + `saas-v2-messages.ts`) that shows empty because of it. This is not a build — it's wiring existing pipes to an existing sink.
- CRM connectors: HubSpot, GoHighLevel, Pipedrive, **ServiceTitan** are already live. Jobber and Housecall Pro are the actual gaps. Zapier is already a full shortcut — worth pushing as the default answer before building bespoke Jobber/HCP code.
- Lead scoring + hot-handoff: Retell's SDK already supports inferred (LLM-decided) transfer destinations and dynamic per-call transfer numbers — Boltcall uses neither, hardcoding one static number per agent. The real gap is routing logic, not telephony capability.
- Speed-test proof widget: **route name collision** (`/speed-test` is a live, unrelated Lighthouse checker) and a **legal risk** (calling a third party's number without their consent is TCPA/prank-call-adjacent) — both must be resolved before building, not discovered during.

---

## Execution order

| Order | Item | Why | Effort |
|---|---|---|---|
| 1 | Task 5 — CRM connectors (Jobber, Housecall Pro) | Reuses a proven dispatcher pattern; unlocks agency distribution fastest | S–M (2 sessions) |
| 2 | Task 2 — Unified inbox | Wiring existing dead schema to existing dead UI; high leverage, contained | M (2–3 sessions) |
| 3 | Task 7 — Lead scoring + hot-handoff | Needs unified inbox's lead-dedup work as a prerequisite for clean scoring | M (2–3 sessions) |
| 4 | Task 9 — Speed-test proof widget | Needs a legal/product decision first (see below) before any code | S once scoped, blocked until decided |

---

## Task 5 — CRM Connectors (Jobber, Housecall Pro)

### Current state (verified)

- `netlify/functions/integration-sync.ts` is a **working multi-provider dispatcher** — HubSpot, GoHighLevel, Pipedrive, Zapier, Make.com, Google Sheets, Google Calendar, Google Business, **ServiceTitan** all live. Central `sync_lead` switch (`:973–1098`) fans out to per-provider `syncToX()` functions; adding a CRM = one `case` + one function + one `test` branch.
- ServiceTitan (`:568`, OAuth client-credentials / API-key + tenant_id pattern) is the closest analog to Jobber (OAuth) and Housecall Pro (API-key based, needs confirming at build time).
- Generic OAuth skeleton (`hubspot-auth-start.ts` / `-callback.ts`, CSRF via `_shared/oauth-state.ts`) is reusable — but `OAuthProvider` is a **closed TypeScript union** (`'gmail'|'outlook'|'google_calendar'|'facebook'|'hubspot'|'pipedrive'`) — adding Jobber requires appending to this union, easy to miss, will silently type-error if skipped.
- Token refresh is **not abstracted** — each OAuth provider hand-rolls its own refresh (`integration-sync.ts:293–354` for Google). Jobber needs its own copy.
- `user_integrations.config` (jsonb) is the reusable per-integration credential store — already handles this shape for 6+ providers.
- **Post-call payload is thin**: only `call.call_analysis.call_summary` text flows into the CRM push (`retell-webhook.ts:238–261`). `conversation-outcome.ts`'s structured `{outcome_type, reason, confidence}` and the scorer's outcome taxonomy are NOT wired into the sync payload — a real "post-call summary in Jobber" needs this extended.
- **No retry/queue infra** — single-attempt, log-only, both in `integration-sync.ts` and `webhook-manager.ts`. A down CRM API = silently dropped sync.
- **Catalog exists in 3 places, already inconsistent**: `IntegrationHubTab.tsx`, `CrmSyncTab.tsx` (only lists HubSpot/Pipedrive — missing GHL/ServiceTitan already), `saas-v2-integrations.ts`. All three need updating per new connector; worth reconciling before adding more entries.
- **Zapier is already a full shortcut** (`syncToZapier`, `:221–249`) — generic outbound webhook, works today for any Zapier-supported CRM including Jobber and Housecall Pro, zero new code. Trade-off: fire-and-forget, no dedup/lookup-before-create (unlike the bespoke HubSpot/Pipedrive/ServiceTitan functions).

### Step 0 — Decision: bespoke connector vs. push Zapier

Before building Jobber/HCP: **does Zapier's existing path satisfy the actual ask** ("agencies won't sell Boltcall without X CRM")? Zapier already reaches both. Bespoke buys: dedup-before-create, richer field mapping, no per-user Zapier subscription cost. Recommend: ship Zapier as the immediate answer (zero-cost, already live), build bespoke Jobber only if a specific agency deal requires native dedup.

**If proceeding with bespoke (assume yes — Jobber has real API demand):**

### Step 1 — Jobber OAuth connector

1. Append `'jobber'` to `OAuthProvider` union (`_shared/oauth-state.ts:5`).
2. `netlify/functions/jobber-auth-start.ts` / `jobber-auth-callback.ts` — copy `hubspot-auth-start.ts`/`-callback.ts` shape exactly. Jobber uses GraphQL API + standard OAuth2 — confirm scope requirements at build time.
3. `refreshJobberToken()` — copy Google's refresh pattern (`integration-sync.ts:293–354`), adapt to Jobber's token endpoint.
4. `syncToJobber()` in `integration-sync.ts` — search-then-create/update pattern (like HubSpot/Pipedrive, not fire-and-forget like Zapier) to avoid duplicate contacts. Add `case 'jobber':` to the `sync_lead` dispatcher and `test` branch.
5. Add to all 3 catalogs: `IntegrationHubTab.tsx`, `CrmSyncTab.tsx`, `saas-v2-integrations.ts` — reconcile the existing HubSpot/Pipedrive-only gap in `CrmSyncTab.tsx` while here (add GHL, ServiceTitan too, since they're already live but missing from that tab).

**Verify:** connect flow completes OAuth round-trip, token stored in `user_integrations.config`; test sync creates one Jobber client, re-sync updates (not duplicates) the same client.

### Step 2 — Housecall Pro connector

Confirm auth model at build time (API-key vs OAuth — HCP has historically been API-key based, closer to ServiceTitan's pattern than HubSpot's). Mirror whichever `syncToServiceTitan` or `syncToHubSpot` shape fits. Same 3-catalog registration.

**Verify:** same as Jobber.

### Step 3 — Richer post-call payload (shared improvement, benefits all connectors)

Extend the `sync_lead` payload in `retell-webhook.ts:238–261` to include `conversation-outcome.ts`'s structured `{outcome_type, reason, confidence}` alongside the existing summary text, so Jobber/HCP job notes carry structured outcome, not just prose.

**Verify:** test call → `sync_lead` payload includes `outcome_type` field; visible in CRM contact/job notes.

### Step 4 — Retry sweep (shared resilience improvement)

New table `integration_sync_failures` (or reuse `webhook_events` with a `retry_count` column) + a scheduled function (5–15 min cron, mirroring `message-dispatcher` pattern) that re-attempts failed syncs up to N times before giving up. Applies to all providers, not just the new ones — closes a gap batch 1/2 didn't touch.

**Verify:** simulate a CRM API failure → sync retried on next cron tick, succeeds on 2nd attempt, logged.

### Files touched

`netlify/functions/integration-sync.ts`, `netlify/functions/jobber-auth-start.ts` (new), `netlify/functions/jobber-auth-callback.ts` (new), `netlify/functions/housecall-pro-*.ts` (new, shape TBD), `_shared/oauth-state.ts`, `retell-webhook.ts`, 3 catalog files, 1 new scheduled function + migration for retry.

---

## Task 2 — Unified Inbox

### Current state (verified)

**The unification target already exists and is dead, not missing:**

- `chats` table (schema in `src/types/chats.ts`, CRUD in `src/lib/chats.ts`) — has `lead_id, agent_id, customer_name, primary_phone, customer_email, source, chat_type, status, chat_history jsonb[], message_count, last_message_at, priority, customer_sentiment, resolution_status`. Exactly the cross-channel shape needed. **Zero inserts anywhere in the codebase** — orphaned.
- `src/pages/v2/V2MessagesPage.tsx` — already built, explicitly labeled "Unified inbox across SMS, chat, and email," backed by `netlify/functions/saas-v2-messages.ts` / `saas-v2-message-thread.ts`. **Queries the empty `chats` table** — shows cold-start/empty state in production today. Excludes WhatsApp and voice by design (`Channel = 'sms'|'chat'|'email'`).
- Per-channel storage is fragmented and inconsistent:
  - `sms_conversations`, `whatsapp_conversations` — both have `lead_id` FK columns, computed sorted-phone-pair `thread_id` string (not a real thread table).
  - `email_threads`/`email_messages` — best-modeled, real relational thread table with `lead_id` FK.
  - Voice — **no local persistence** at all except `retell_calls` (QA-scoring side effect, no `lead_id`, caller phone buried in `retell_payload` jsonb).
  - Web chat — **no local persistence**, lives entirely in OpenAI's hosted ChatKit session.
- Lead linking is inconsistent per channel — the actual blocker for clean merging:
  - SMS: only linked if AI qualification score ≥ 30 (`sms-ai-responder.ts:195–200`); inbound webhook itself never touches `leads`.
  - WhatsApp: **never touches `leads` at all** — zero references in `whatsapp-ai-responder.ts`. Worst gap.
  - Email: unconditional lead creation on every new sender (`email-inbox-poller.ts:301–330`).
  - Voice: creates a new lead on nearly every inbound call, weak dedup (phone match only on the no-answer path).
  - No unique constraint ties phone+email to one canonical lead — same person can spawn duplicate `leads` rows across channels today.
- Realtime: only WhatsApp has a live `postgres_changes` subscription (`WhatsappPage.tsx:248–277`). SMS/Email are poll-on-mount.

### Step 1 — Fix WhatsApp lead-linking gap (prerequisite, small)

`whatsapp-webhook.ts` inbound handler: add lead lookup/creation matching the SMS pattern (`leads.phone` match, create on qualification threshold or unconditionally — decide consistency with SMS in same step, see Step 2).

**Verify:** inbound WhatsApp message from new number → `whatsapp_conversations.lead_id` populated.

### Step 2 — Normalize lead creation triggers across channels

Decide one policy (recommend: unconditional creation on first inbound contact per channel, since a "hot lead scoring" feature in Task 7 wants clean signal from all leads, not just AI-qualified ones) and apply consistently to SMS, WhatsApp, voice. Add a phone+email dedup check before insert (`SELECT id FROM leads WHERE user_id=? AND (phone=? OR email=?) LIMIT 1` → link instead of create).

**Verify:** simulate same person calling then texting then emailing → single `leads` row, three channel records all pointing to it.

### Step 3 — Persist voice + web chat into `chats` (or a thin bridge)

Two options, pick the lazier one that satisfies the read API:
- **(a)** Write voice call summaries and web chat transcripts into `chats` directly at call-end / session-end (webhook additions to `retell-webhook.ts` and `chatkit-session.ts` completion handler).
- **(b)** Keep voice/chat in their native stores (`retell_calls`, OpenAI) and have `saas-v2-message-thread.ts` fan out live reads across sources instead of relying solely on `chats`.

Recommend (a) — simpler, matches what `V2MessagesPage.tsx` already expects, avoids a live fan-out on every page load. Voice: on `call_ended` webhook, insert/update a `chats` row keyed by `lead_id` with `chat_type: 'voice'`, `chat_history` appended with call summary + transcript link. Web chat: on ChatKit session completion, same insert with `chat_type: 'web_chat'`.

**Verify:** complete a call → `chats` row appears with correct `lead_id`; `V2MessagesPage` renders it without further changes (since it already reads this table).

### Step 4 — Backfill SMS/WhatsApp/Email into `chats` (or dual-write going forward)

Either backfill historical `sms_conversations`/`whatsapp_conversations`/`email_threads` into `chats`, or (lazier, ponytail-favored) **dual-write going forward only** — new messages insert into both the native table (preserves existing SmsPage/WhatsappPage/EmailPage) and `chats` (feeds the unified view). No backfill for pre-revenue user count; historical messages simply won't show pre-launch in the new unified view.

**Verify:** new inbound SMS after this ships appears in both `SmsPage` and `V2MessagesPage`.

### Step 5 — Realtime for the unified view

Add `postgres_changes` subscription on `chats` table (copy `WhatsappPage.tsx:248–277` pattern) into `V2MessagesPage.tsx`. One subscription now covers all channels instead of needing one per channel table.

**Verify:** send a test SMS → unified inbox updates live without refresh.

### Step 6 — Decide fate of per-channel pages

Once `V2MessagesPage` is live and correct, either promote it to the primary inbox (redirect `/dashboard/sms`, `/dashboard/whatsapp`, `/dashboard/email` into filtered views of it) or keep per-channel pages as detail drill-downs linked from the unified view. Defer this UX decision to a design pass — out of scope for the data-plumbing work above.

### Files touched

`netlify/functions/whatsapp-webhook.ts`, `netlify/functions/twilio-inbound-sms.ts`, `netlify/functions/retell-webhook.ts`, `netlify/functions/chatkit-session.ts`, `src/lib/chats.ts` (already exists, wire up), `src/pages/v2/V2MessagesPage.tsx`, 1 migration (dedup constraint on `leads`).

---

## Task 7 — Lead Scoring + Hot-Handoff

### Current state (verified)

- `retell-call-scorer.ts` is **strictly post-call** — triggered only after `call_ended`, needs the full transcript + `call_analysis`. Cannot run mid-call as architected. 6 dimensions scored, none measure urgency or deal value — closest proxy (`caller_sentiment`) measures mood, not stakes.
- **Retell's `transfer_call` tool is already wired and live** (`retell-agents.ts:381–396`) — warm transfer, but `transfer_destination: { type: 'predefined', number: transferNumber }` — one static number per agent, set at creation/edit time. The *decision* to transfer is already dynamic (LLM judgment during the live call, steered only by a description string) — no threshold, no keyword list, no structured signal.
- **Retell SDK already supports what this feature needs and Boltcall doesn't use it:**
  - `TransferDestinationInferred` — `{ type: 'inferred', prompt: '...' }` — lets the model deduce the right number from the live transcript + a routing prompt. Never used.
  - `predefined.number` accepts a dynamic-variable placeholder (`{{transfer_number}}`) resolved per-call from `retell_llm_dynamic_variables` set at call creation. Never used — Boltcall always passes a literal string.
- Vertical knowledge packs (`20260608_vertical_intelligence_packs.sql`) already encode urgency-trigger taxonomies per industry as prompt text (`"triggers": [...], "agent_rule": "mark urgent, transfer if possible"`) — advisory copy only, no code reads or acts on it structurally.
- Job-value estimation (`_shared/booking-value.ts`) only runs **after** a booking succeeds, from a flat per-business average — no live budget/urgency signal extraction from what the caller says.
- **No real-time dashboard mechanism exists.** No Supabase Realtime subscription tied to calls/leads, no websocket. The only "push" is a single hardcoded internal Telegram bot (`_shared/notify.ts`, Boltcall's own ops channel, not per-tenant/per-owner).

### Step 1 — Dynamic transfer number via Retell dynamic variables (foundation, small)

Replace the literal `transferNumber` string with a dynamic-variable placeholder in the tool definition (`retell-agents.ts:381–396`), and pass the actual number via `retell_llm_dynamic_variables` at call-creation time instead of baking it into the agent config. This alone unlocks per-call/per-scenario routing without re-provisioning agents.

**Verify:** call still transfers correctly with variable-resolved number (regression check on existing behavior before adding branching logic).

### Step 2 — Scenario-based routing table

New table `transfer_rules (user_id, agent_id, condition_type, condition_value, destination_number, priority)` — e.g. `condition_type: 'keyword'`, `condition_value: 'emergency'` → owner cell; default row → existing front-desk number. Small settings UI addition (extend `AgentsPage.tsx`'s existing "Human Transfer Phone" field into a short list).

**Verify:** two rules configured (default + "emergency" keyword) → test calls route correctly per rule.

### Step 3 — Switch to inferred transfer destination for LLM-driven routing

For agents with multiple transfer rules configured, swap `transfer_destination` to `{ type: 'inferred', prompt: '<built from transfer_rules>' }` so Retell's own model picks the right number from live conversation content, rather than Boltcall pre-computing it. Fallback to `predefined` (Step 1's dynamic-variable version) when only one rule (default) exists — no need for inference overhead on simple agents.

**Verify:** call mentioning "this is a $30k roof replacement, need someone today" → transfers to owner-cell rule; routine call → default number.

### Step 4 — Dashboard red-flag for calls that don't warrant a live transfer but are still hot

Not every hot lead should interrupt the owner via live transfer (mid-call) — some should just surface loudly in the dashboard. Post-call: extend the scorer's outcome write (`retell-call-scorer.ts`) with a lightweight urgency classification (reuse the same `chatCompletion` call already scoring the transcript — add one more dimension: `urgency_signal: 0–1` with keyword-seeded rubric from the vertical knowledge packs). Write to `retell_calls.urgency_signal` (new column) or a 7th `retell_call_scores` dim row (cheaper — no schema change, same table).

**Verify:** transcript with explicit urgency language scores high `urgency_signal`; routine transcript scores low.

### Step 5 — Realtime dashboard alert

Supabase Realtime subscription on `retell_call_scores` (or `retell_calls`) filtered to `urgency_signal > threshold`, surfaced as a dashboard toast/badge (copy `WhatsappPage.tsx:248–277` subscription pattern). This is the first tenant-facing realtime alert in the app — the existing Telegram notify stays as Boltcall's internal ops channel, unrelated.

**Verify:** seed a high-urgency call score → dashboard shows live alert without refresh.

### Files touched

`netlify/functions/retell-agents.ts`, `netlify/functions/retell-call-scorer.ts`, `src/pages/dashboard/AgentsPage.tsx`, new dashboard alert component, 2 migrations (`transfer_rules` table, urgency scoring).

---

## Task 9 — Speed-Test Proof Widget

### Current state (verified) — blockers before any code

1. **Route collision.** `/speed-test`, `/speed-test/login`, `/speed-test/report`, `/speed-test/offer` are live and serve an unrelated Google PageSpeed/Lighthouse checker (`src/pages/speed-test/*`) — visitors enter their *own website URL*, get Lighthouse scores, lead-capture into `website_leads`. Confusingly named the same as the "speed-to-lead" concept but a completely different product. New widget needs a different route (e.g. `/response-time-test`, `/call-speed-check`) — do not overwrite the existing lead-gen tool without checking its traffic/conversion first.

2. **Legal risk — the core mechanic as originally scoped is a problem.** "Prospect enters a competitor's phone number, we call it" means Boltcall originates a call to a third party who never consented to being called, to demonstrate a product to someone else. This is materially different from the existing `homepage-demo-call.ts` (which only ever calls the *submitter's own* number, with rate limits and phone-based abuse controls). Calling arbitrary third-party numbers is prank-call/TCPA-adjacent regardless of intent.

   **Recommend reframing before building:** instead of "call your competitor," have the visitor **request a benchmark call to their own number** and separately self-report their own average response time (survey question, not a live call) — or restrict competitor-calling to a manual, sales-assisted flow (Noam or a rep places the comparison call themselves with the prospect's knowledge) rather than a fully public self-serve form. Cannot recommend building the fully public "call anyone's number" version without a legal review — flagging this explicitly rather than defaulting to the lazy build.

### If reframed to "call your own number, get a response-time report" (recommended safe version)

This becomes a near-fork of `homepage-demo-call.ts`, which is already public, rate-limited, and calls only the submitter's own number.

**Step 1 — New route + page**
New page at `/response-time-test` (or similar), forking the page-scaffold pattern from `SpeedTestLanding.tsx` (Header/Footer/motion) but new copy/flow: "See how fast Boltcall answers — enter your number, we'll call you right now."

**Step 2 — New store**
`speedProofStore.ts` (zustand) — `{ phone, email, dialedAt, answeredAt, latencyMs, status }`. Not a fork of `speedTestStore.ts` (wrong domain, Lighthouse-shaped).

**Step 3 — Fork `homepage-demo-call.ts`**
New function `response-time-demo-call.ts`: same public/rate-limited/E.164-validated shape, but additionally **persists** `call_id + dialed_at + email` to a new table `response_time_demos` (the original function doesn't persist anything — this is the actual gap to close, not the calling mechanism itself).

**Step 4 — Webhook correlation**
Extend `retell-webhook.ts` (or a dedicated route) to match incoming `call_ended` events against `response_time_demos` by `call_id`, compute `latency_ms = call.start_timestamp - dialed_at`, store result. Note: this is approximate (resolves only after call ends, bakes in Retell's own setup overhead) — acceptable for a marketing proof point, not a lab-grade measurement.

**Step 5 — Report email**
Copy `daily-lead-summary.ts`'s `buildEmailHtml()`/`sendBrevoEmail()` pattern verbatim — new copy: "Boltcall answered your test call in {latency_ms/1000}s. Most local businesses miss the call entirely or take 4+ minutes to call back — here's what instant response is worth to you." Skip PDF entirely (`pdf-renderer.ts` is chromium/puppeteer machinery, over-engineered for a marketing email).

**Verify:** submit own number → phone rings within seconds → call answers → email arrives with correct measured latency.

### If the competitor-calling version is confirmed acceptable (requires explicit sign-off)

Same steps 2–5, plus: sales-assisted gate (rep-initiated, not fully public self-serve) OR consent-capture step ("confirm you have authorization to request this call") before dial — reduces but does not eliminate risk. Flag to Noam explicitly; do not silently build the risky version because it matches the original one-liner brief.

### Files touched (safe version)

New page + route, `speedProofStore.ts` (new), `response-time-demo-call.ts` (new), `retell-webhook.ts` (extend), 1 migration (`response_time_demos` table), Brevo email template.

---

## Dependencies & sequencing

```
Task 5 (CRM)              — fully independent, start anytime
Task 2 (Unified inbox)
  Step 1 (WhatsApp lead-link) → Step 2 (dedup) → Step 3/4 (persist) → Step 5 (realtime)
Task 7 (Lead scoring)
  depends on Task 2 Step 2 (clean lead dedup) for signal quality
  Step 1 (dynamic transfer var) → Step 2 (routing table) → Step 3 (inferred transfer)
  Step 4/5 independent of 1-3, can run parallel
Task 9 (Speed-test proof)
  BLOCKED on product/legal decision (reframe vs. sign-off) before any code
```

## Cross-cutting rules

- Every item: own worktree branch, auto-commit, merge on command, deploy only when asked.
- Migrations: verify against live schema first — same drift risk pattern flagged in batches 1–2 (`chats`, `leads`, `retell_calls` all lack full in-repo DDL in places).
- No PDF generation for marketing emails — Brevo HTML is the established, lazy-correct pattern.
- Task 9 does not proceed past the planning stage until the legal/product framing question is answered by the user.
