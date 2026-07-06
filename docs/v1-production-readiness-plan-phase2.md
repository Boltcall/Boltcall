# Boltcall V1 — Production Readiness Plan, Phase 2

> **Status**: active plan of record. Successor to `docs/v1-production-readiness-plan.md` (Phase 1 — 36/37 items closed).
> **Prepared**: 2026-07-05 via three parallel deep audits covering the areas Phase 1 never reached:
> dashboard pages (60+ pages), settings + billing wiring, and 91 previously-unaudited Netlify functions.
> **Counts**: **9 P0 · 18 P1 · 14 P2**. Execution 2026-07-06: **8/9 P0 closed** + 5 P1 (billing correctness, retell LLM rollback, webhook fail-closed rolled up in the same commits). Remaining P0: HIBP toggle (carryover, needs Noam + Supabase PAT).

**How to use this file.** Same protocol as Phase 1: execute top-down, mark `[x]` with commit hash, append new findings, never delete items. Work in a worktree — root main checkout is read-only.

---

## Executive read

Phase 1 fixed auth, tenancy, pricing, RLS, and the funnel. Phase 2's audits found the next layer: **billing correctness and fake features**.

The three findings that matter most:

1. **The add-on Packages page takes no money.** Toggling a "$29/mo" package flips a boolean in `business_features` — no PayPal charge, no subscription line item. A client "buys" and is never billed (or worse: believes they paid).
2. **PayPal customers never see an invoice.** `paypal-webhook.ts` never inserts `invoices` rows, so Billing History is permanently empty for the only payment provider the UI offers. And deleting a workspace does NOT cancel the PayPal subscription — charges continue after "delete".
3. **Two dashboard product pages are fully mocked** (`AssistantPage`, `LeadReactivationPage` — local `useState` only, nothing persists), and the sidebar exposes only 6 of ~35 real dashboard routes. A local business owner literally cannot find Leads, Calls, Messages, or Missed Calls from the nav.

Also: the vitest suite is dead — 155 of 158 test files fail at collection (`TypeError: Cannot read properties of undefined (reading 'config')` in `describe()`, vitest v4 infra breakage). Typecheck is clean, but the CI test gate currently verifies nothing.

Build health snapshot (2026-07-05): `tsc --noEmit` ✅ clean · vitest ❌ 155/158 files fail collection · Supabase security advisors: 0 ERROR, 7 WARN (incl. HIBP off).

---

## P0 — blocks launch

### Billing / money

- [x] **PackagesPage fake purchase** (ac140623f)
  Redirected `/dashboard/settings/packages` to `/dashboard/settings/plan-billing` + dropped Packages entry from settings nav. Route + component removed from bundle. Restore once add-on charges are wired through PayPal.

  ORIGINAL:
  `src/pages/dashboard/settings/PackagesPage.tsx:29-98, 142-163`
  "$29/$29/$39 per month" add-ons toggle a boolean in `business_features` with zero billing wiring. Legal/refund exposure. Decision: either wire real PayPal plan add-ons, or remove prices and relabel as feature toggles gated by plan, or hide the page for V1. **Recommended for V1: hide the page** (smallest correct diff), re-ship when billing wiring exists.

- [x] **PayPal webhook never writes invoices** (f15eb1f94)
  `handlePaymentSaleCompleted` now looks up the subscription, rolls its period forward, and upserts an `invoices` row (amount_paid in cents, paypal_capture_id as conflict key) so Billing History renders.

  ORIGINAL:
  `netlify/functions/paypal-webhook.ts:223-244`
  `PAYMENT.SALE.COMPLETED` updates subscription status but inserts no `invoices` row → `PlanBillingPage` Billing History is always empty for every PayPal customer. Insert an invoice row (amount, date, plan, PayPal txn id) on each completed sale.

- [x] **Delete-workspace leaves the PayPal subscription active** (7f5cd6eb7)
  New `netlify/functions/delete-workspace.ts` (JWT-authed): cancels active PayPal subs via `/v1/billing/subscriptions/:id/cancel`, then cascade-deletes 12 dependent tables + KB storage. Aborts (502) if the PayPal cancel fails so a customer never gets deleted while still being charged. Both GeneralPage delete button + `teamStore.deleteWorkspace` now route through this single function.

  ORIGINAL:
  `src/pages/dashboard/settings/GeneralPage.tsx:583-599` + `WorkspacePage.tsx:118-134`
  Delete removes `business_profiles` + `workspaces` + storage but not `subscriptions`, `agents`, `workspace_members`, `business_features`, `paypal_payments` — and never cancels the PayPal subscription server-side. Customer keeps getting charged after "deleting" their account. Move deletion behind one Netlify function (service role) that: cancels PayPal sub → deletes dependent rows → deletes workspace. Also collapse the two divergent delete paths (GeneralPage vs WorkspacePage) into that one function.

### Fake features

- [x] **AssistantPage is fully mocked** (ac140623f)
  Deleted `src/pages/dashboard/AssistantPage.tsx` (314 lines). Route `/dashboard/assistant` already redirects to `/dashboard/calls`. Also removed dead "Set Up Personal Assistant" step from `Dashboard.tsx` getting-started list.

  ORIGINAL:
  `src/pages/dashboard/AssistantPage.tsx:1-314`
  Enable/disable toggles are local `useState`; nothing persists, nothing wires. Ship decision: delete the page (routes already redirect `/dashboard/assistant` → `/dashboard/calls`) or wire it. **Recommended: delete** — the redirect already exists; the component is dead-code risk.

- [x] **LeadReactivationPage fake CRM connect** (ac140623f)
  Deleted `src/pages/dashboard/LeadReactivationPage.tsx` (329 lines). Route already redirects to `/dashboard/leads`. Also removed the Lead Reactivation card from `FeatureHub.tsx` so users don't hit a redirect-only path.

  ORIGINAL:
  `src/pages/dashboard/LeadReactivationPage.tsx:1-329`
  "Connect CRM" sets local state; no OAuth, no persistence, no fetch. `/lead-reactivation` redirect (AppRoutes:495) routes users into a dead feature. Same decision: hide/delete for V1 or build it. **Recommended: remove from nav + route for V1.**

### Security

- [x] **Fail-open webhook auth when secrets are unset** (f15eb1f94)
  All four functions now return 500 `misconfigured` in production if their secret env is unset (checks `CONTEXT === 'production'` or `NODE_ENV === 'production'`). Dev/preview still allow the skip path so local testing works.

  ORIGINAL:
  `netlify/functions/lead-webhook.ts:292`, `whatsapp-webhook.ts:78`, `instantly-webhook.ts:27`, `twilio-inbound-sms.ts:41`
  All four skip signature/secret verification entirely when their env var is unset. A prod env drift silently opens lead injection → outbound Retell calls + SMS billing (lead-webhook), fake WhatsApp inbound → auto-reply billing, etc. Fix: fail-closed — if the secret env is unset, return 500 `misconfigured` and alert; never process unsigned payloads.

### Navigation

- [x] **Sidebar exposes 6 of ~35 dashboard routes** (7f5cd6eb7)
  Rewrote `Sidebar.tsx` with 6 grouped sections (Home, Leads & Calls, Channels, Setup, Growth, Account) exposing 20 real dashboard routes with plain-language labels ("Missed Calls", "Text Messages", "Voice Receptionist"). Preserves ClientPortal + Agency section render order.

  ORIGINAL:
  `src/components/dashboard/Sidebar.tsx:20-27`
  Leads, Calls, Messages, Missed Calls, Phone Numbers, Reminders, Reputation, SMS, WhatsApp, Email, Integrations, Knowledge Base, Getting Started etc. are reachable only by typed URL or in-page cross-links. Non-technical owners can't find the product. Redesign nav into grouped sections (e.g. Home · Leads & Calls · Channels · Agents · Knowledge · Settings). This is the single highest-leverage UX fix for the "understandable for local business owners" goal.

### Test infrastructure

- [x] **Vitest suite dead — 155/158 test files fail collection** (e322c7bde)
  Root cause: vitest 4 default threads pool. Added `pool: 'forks'` to `vitest.config.ts`. Result: 157/158 files pass, 1149/1152 tests pass. Remaining 3 test failures in one file are real content bugs to triage separately, not infra.

  ORIGINAL:
  `TypeError: Cannot read properties of undefined (reading 'config')` at `describe()` (vitest 4.1.2). All Phase 1 security tests (`team-manage-roles-security`, `saas-v2-security`) currently don't run. Fix the vitest config/setup breakage, then make CI actually block on the suite.

### Carryover from Phase 1

- [ ] **Supabase HIBP leaked-password protection still off** *(NEEDS NOAM — one command)*
  Advisor WARN still present. Run `node scripts/enable-hibp-protection.mjs` with a `SUPABASE_ACCESS_TOKEN` PAT. See Phase 1 P0.8 for details.

---

## P1 — must-fix pre-launch

### Billing correctness

- [x] **paypal-webhook: unknown planId silently defaults to starter/monthly** (f15eb1f94). `mapPayPalPlan` now returns null on miss; handler throws + Telegram alert so PayPal retries and Noam fixes the env var mapping.
- [x] **paypal-webhook: no `current_period_end` on ACTIVATED** (f15eb1f94). Uses `resource.billing_info.next_billing_time` when present, else computes +1 month/year from `start_time`.
- [x] **paypal-webhook: `findUserByEmail` only checks page 1 of 1000 users** (f15eb1f94). Paginates up to 50 pages (50k users), stops at the first partial page.
- [ ] **PlanBillingPage silent checkout failure** — `PlanBillingPage.tsx:165-182`. Catch clears spinner, shows nothing. Add error toast.
- [ ] **PlanBillingPage hardcoded prices duplicate `PLAN_INFO`** — `PlanBillingPage.tsx:140-146`. Import from `src/lib/stripe.ts` — one source of truth (this is exactly how Phase 1's stale-price P0 happened).
- [ ] **create-paypal-subscription: no server-side plan validation + env-name leak in error hint** — `create-paypal-subscription.ts:107`.
- [ ] **stripe-webhook service key falls back to `''`** — `stripe-webhook.ts:10-13`. Fail loudly on missing env.

### Data correctness (backend → charts)

- [ ] **Leads have two sources of truth** — `SpeedToLeadPage.tsx:214-241` reads `leads` table; `dashboardStore`/`dashboardApi.ts:170` reads `callbacks`. The two "leads" surfaces will disagree. Pick the authoritative table, migrate the other reader.
- [ ] **dashboardStore KPI semantics wrong** — `dashboardStore.ts:206-208`: `kpis.leads` set from callback total; `bookings` set from `ai_calls_today`. Home KPIs lie. Map each KPI to its real query.
- [ ] **Fake sparklines** — `TodayGlanceCard.tsx:8-13` synthesizes a 3-point "trend" from one scalar; `AnalyticsPage.tsx:212,474` passes `emptySparkline=[0,0,...]` to secondary KPI row even with live data. Wire real series or drop the sparkline.
- [ ] **dashboardApi swallows every error into empty arrays** — `dashboardApi.ts:95-100,123-125,146-149,189-193`. UI can't distinguish "no data" from "server down"; combined with missing empty states, outage and new-user look identical. Surface `fetchError` in `DashboardPage` (currently no error state at all).

### Provisioning / functions

- [x] **retell-agents orphans a billable Retell LLM on agent.create failure** (f15eb1f94). Both create_agent and create_full now wrap `client.agent.create` in try/catch that deletes the minted LLM before rethrowing.
- [ ] **whatsapp-ai-responder internal-secret drift** — `whatsapp-ai-responder.ts:96` only accepts `INTERNAL_WEBHOOK_SECRET`; callers send `INTERNAL_API_SECRET || INTERNAL_WEBHOOK_SECRET`. If only the new name is set, internal calls silently 401. Accept both (match `_shared/user-auth.ts` pattern).
- [ ] **outbound-calls start_campaign can exceed the 10s function budget and double-call leads** — `outbound-calls.ts:164-227`. Move to background function; mark lead row before Retell call so retries skip already-called leads.

### Settings reliability (client configurability)

- [ ] **teamStore client-side role/status updates bypass server checks** — `stores/teamStore.ts:177-205`. `updateMemberRole`/`updateMemberStatus` write `workspace_members` directly from the client; only RLS stands between a member and self-escalation. Verify the RLS policy blocks role self-modification, or route through a Netlify function like `invite-member`. Same verification for `createRole/updateRole/deleteRole` (`RolesPage.tsx:131-145`) and `WorkspacePage` `transferOwnership`.
- [ ] **NotificationPage data model can't round-trip** — `NotificationPage.tsx:143-163`. Per-channel toggles (email/push/sms) collapse into single booleans on save; reload shows all channels enabled if any was. Store per-channel columns or a JSONB map. Also verify anything actually consumes these prefs — if no dispatcher reads them, say so on the page.
- [ ] **Settings pages missing loading/error/empty states** — `WorkspacePage` (no loading, generic catch swallows real error `:79-99`), `ActivityLogPage` (no error/empty UI), `RolesPage` (no loading), `GeneralPage`/`BusinessPage` (form flashes empty then hydrates), `MembersPage` (owner auto-seed race + silent swallow `:80-93`), plus empty states across ApiKeys/Members/Notification/Packages/PlanBilling/Preferences/Usage ("Invite your first teammate", "No invoices yet"). One sweep, one pattern: skeleton on load, toast+retry on error, friendly empty state.

---

## P2 — polish

- [ ] Delete dead code: `src/server/mockApi.ts` (zero importers), `createMockServer` in `src/server/api.ts:126-143`, `src/lib/stripe-checkout.ts` `redirectToCheckout` (nothing imports it), `LeadsPage.tsx` wrapper, PayPal sandbox test functions (`*-paypal-test-*.ts`), `break-my-ai.ts` if truly uncalled.
- [ ] `openCustomerPortal` misnamed — opens paypal.com; broken for legacy Stripe subs — `stripe-checkout.ts:60-74`.
- [ ] Enterprise plan unreachable from PlanBilling grid; its `handlePlanChange` branch is dead — `PlanBillingPage.tsx:451-517`.
- [ ] Usage progress bar `limit || 1000` masks a 0 token limit — `PlanBillingPage.tsx:153`.
- [ ] MembersPage renders literal `—` text instead of em-dash — `MembersPage.tsx:495,541`.
- [ ] Timezone lists hardcoded (13 zones) + default `America/New_York` — `PreferencesPage.tsx:39,198-212`. Use `Intl.supportedValuesOf('timeZone')` + browser-resolved default.
- [ ] UnsavedChanges banner sticks after successful save — `PreferencesPage.tsx:431-438`.
- [ ] Country list hardcoded to 12; no postal/state validation — `GeneralPage.tsx:242-255`.
- [ ] Predefined-role edits lost on reload (no override table) — `RolesPage.tsx:102-108`. Disable editing of system roles in UI.
- [ ] `agency-reporting-scribe.ts:249` non-constant-time bearer compare — use `crypto.timingSafeEqual`.
- [ ] `calcom-webhook.ts:130` stores Cal.com API key plaintext in JSONB — move to encrypted storage or dedicated secrets table post-V1.
- [ ] Rate-limit `generate-agent-prompt.ts` (unauthenticated pure compute) and `silent-touch-attribution.ts` (unauthenticated service-role insert).
- [ ] `agent-tools.ts:58` fail-open in non-prod — add loud misconfig log.
- [ ] KB-linkage errors console-swallowed in create_full — `retell-agents.ts:833-863`. Return warning in response payload so UI can surface "KB not attached".

---

## Live verification — status update (from Phase 1 list)

- [x] `workspaces.user_id` unique? **NO** — only a regular index. Double-workspace race duplicates silently. Add partial unique index post-cleanup (check for existing dupes first): `CREATE UNIQUE INDEX ... ON workspaces(user_id)`.
- [x] `workspaces.slug` NOT NULL? **YES** (+ unique). `ensureWorkspaceForUser` must always set slug — verified constraint exists; code path check remains part of provisioning e2e.
- [x] Supabase security advisors: **0 ERROR**, 7 WARN, 142 INFO (rls_enabled_no_policy on internal/marketing tables — triaged in Phase 1).
- [ ] Remaining from Phase 1 (still open): Confirm-email setting, OAuth redirect URIs, anon-client RLS provisioning e2e, create_full timing inside Netlify budget, live recovery-email flow, stale-price grep, Retell/Twilio failure timeout behavior, Playwright coverage map.

---

## Three-week roadmap

Solo founder. Ordered so money and trust land first, correctness second, polish third.

### Week 1 — Money + fake features + fail-closed (P0 sweep)
- Mon: PayPal invoices row on PAYMENT.SALE; `current_period_end` on ACTIVATED; unknown-planId hard-error. Verify with sandbox sub end-to-end.
- Tue: Single server-side delete-workspace function: cancel PayPal sub → cascade deletes. Wire both delete buttons to it.
- Wed: Hide PackagesPage for V1. Delete AssistantPage + LeadReactivationPage (routes already redirect). Delete dead code batch.
- Thu: Fail-closed auth on the 4 webhook functions + Netlify env audit (all secrets present in prod). Run HIBP script (Noam, 1 command).
- Fri: Fix vitest infra; get the 46 existing tests + Phase 1 security tests green in CI. Buffer.

### Week 2 — Data correctness + error handling (P1 sweep)
- Leads source-of-truth unification (`leads` vs `callbacks`); fix dashboardStore KPI mappings; real sparklines or none.
- DashboardPage error state; dashboardApi error propagation; settings loading/error/empty sweep (one shared pattern).
- retell-agents LLM rollback on both throw paths; whatsapp internal-secret drift; outbound-calls background + idempotency.
- teamStore RLS verification (role self-escalation) — test with a member-role JWT; move to functions if RLS insufficient.
- PlanBillingPage: error toast, prices from PLAN_INFO, downgrade UX.
- NotificationPage data model fix (or hide channels that don't round-trip).

### Week 3 — Owner UX + live QA
- Sidebar information architecture: grouped nav exposing all real routes; plain-language labels ("Missed Calls", "Text Messages" — no jargon).
- Playwright: extend cta-smoke with dashboard smoke (login → each nav item renders data or empty state, no console errors); billing flow spec against PayPal sandbox.
- Run remaining Phase 1 live-verification items (OAuth buttons, recovery email, provisioning e2e, create_full timing).
- Three consecutive real-user tests (fresh signup → configured agent → test call → dashboard shows the call) without founder help. Every trip-up becomes a ticket.
- Deploy + `npm run gsc-submit` for any changed public pages.

---

## Definition of done (Phase 2)

- [ ] Every visible price is either charged correctly or not shown. No UI path takes a "purchase" action without money moving.
- [ ] PayPal lifecycle complete: subscribe → invoice rows → renewal date shown → cancel on delete-workspace.
- [ ] Zero mocked product pages reachable from any route.
- [ ] Sidebar reaches every user-facing dashboard page; a non-technical owner can find leads, calls, and messages in one click.
- [ ] Every dashboard/settings page: real data + loading + error + empty state (per-page table in audit shows no "no" cells).
- [ ] All webhook endpoints fail closed on missing secrets.
- [ ] Vitest suite green and blocking in CI; Playwright covers signup, reset, provisioning, funnel, dashboard smoke, billing.
- [ ] KPIs on the home dashboard provably match the underlying tables (spot-check query vs UI).
- [ ] Three consecutive live user tests pass without intervention.

---

## For future sessions

Same rules as Phase 1 (worktree-only, mark `[x]` + commit hash, append don't rewrite, live-verify everything). Full audit detail (per-page data/loading/error/empty table for all 60+ dashboard pages) lives in the session that produced this plan; the per-page table's "no" cells are the P1 settings-sweep worklist.
