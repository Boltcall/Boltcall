# Boltcall V1 — Production Readiness Plan

> **Status**: active plan of record for getting V1 to 100% production.
> **Prepared**: 2026-07-05 by Noam (via deep static audit).
> **Coverage**: ~60% (session limits killed 4 parallel audit agents mid-run).
> **Rendered view**: <https://claude.ai/code/artifact/eec03576-0f09-461b-b071-9d069ee7dac0>

**How to use this file.** Any Claude Code session opened in this repo can read this file and pick up the plan. Execute items top-down. Do NOT delete an item — mark it `[x]` and add a commit hash beside it. When new findings appear, append them to the correct section rather than rewriting.

---

## Executive read

V1 is close, not shippable today.

The P0/P1 fixes in commit `8e7b94fc3` (`/reset-password` route, AuthCallback profile guard, provisioning idempotency, LOGOUT-in-finally) all hold. This deeper audit surfaced a second wave: two cross-tenant privilege-escalation issues in team-role routes, stale Stripe pricing shipping on every plan page, a fake submit on the speed-test offer funnel, and 14 Supabase tables with RLS disabled in the same project as the SaaS DB.

**Three findings that matter most:**

1. Any authenticated user can rewrite or delete any workspace's custom roles (`team-manage-roles.ts` missing tenant scope).
2. Every pricing page renders `$99 / $179 / $249` instead of canonical `$549 / $897 / $4997` because `src/lib/stripe.ts` is stale.
3. The `/speed-test/offer` submit is a no-op — every lead that reaches the money page is dropped.

Counts: **8 P0 · 20 P1 · 9 P2**.

---

## P0 — blocks launch

Fix before anyone else signs up. Combined cost: one focused work day + half day for the RLS sweep.

- [x] **Cross-tenant IDOR on custom roles and permissions** (723fe5fe4)
  `netlify/functions/team-manage-roles.ts:96, 100, 125–126`
  Fixed: pre-fetch role, verify `workspace_id === user.id` before UPDATE/DELETE/`role_permissions` rewrite; 5 new tests in `__tests__/team-manage-roles-security.test.ts` covering cross-tenant blocks + system-role guard, all pass.

- [x] **Stripe plan prices stale in `src/lib/stripe.ts`** (849fb8de2 + b11ad1e51)
  `src/lib/stripe.ts:60–63`
  Fixed: PLAN_INFO now Starter $549, Pro $897, Ultimate $4997, Enterprise $997 (yearly = monthly × 9 for tiered plans, × 12 for Enterprise). Bulk-swept 62 marketing pages across 5 scripted passes + hand-fixes for competitor-compare files (Emitrr/SmithAi/LeadMagnetThankYou). Preserved competitor prices (GoodCall $249, Emitrr $49, Smith.ai $95, Lindy $49.99). Deleted dead `IsAiReceptionistWorthIt.tsx.broken`.

- [x] **Supabase RLS disabled on 14 tables in the prod project** (ea94c0799)
  Supabase project `hbwogktdajorojljkjwg`
  Fixed: enabled RLS on 15 tables (advisor also flagged `outbound_leads`) via `supabase/migrations/20260705193000_enable_rls_p0_internal_ops_tables.sql`. No policies added — service_role bypasses RLS; no user path reads these. `approved_vertical_guardrails` view switched to `security_invoker=true`. Advisor `rls_disabled_in_public` count: 15 → 0.

- [x] **Speed-test `/offer` form is a fake submit** (f9a8f0381)
  `src/pages/speed-test/SpeedTestOffer.tsx` + new `netlify/functions/speed-test-offer.ts` + migration `20260705193500_website_leads_add_phone_source.sql`
  Fixed: real POST to a new rate-limited endpoint that validates name/email/phone, inserts into `public.website_leads` (added `phone` + `source` columns), fires Telegram alert via `notifyInfo`. Errors surface inline instead of falsely showing Thank You.

- [x] **`retell-agents.ts` silently succeeds when the agents insert fails** (d9dcb0d34)
  `netlify/functions/retell-agents.ts:779–784`
  Fixed: on Supabase agents insert error, delete the Retell agent, delete the LLM if we minted one this invocation (new `createdLlmId` tracker), return 500 with `code=supabase_agent_insert_failed`. Retries no longer double-provision billable Retell resources.

- [x] **Ownership spoofable in `retell-agents.ts` create_full** (already fixed upstream; verified d9dcb0d34)
  `netlify/functions/retell-agents.ts:751–775`
  Already resolved: line 473 stamps `body.user_id = userId` from JWT after a strict 403 mismatch check (line 466). `validateOwnedSetupReferences` at line 180 already scopes `business_profile_id` and `kb_folder_id` to the caller before create_full continues.

- [x] **Setup guard bypass via `?setupCompleted=true`** (bacd8ed07)
  `src/components/ProtectedRoute.tsx:41–46`
  Fixed: removed the shortcut that cached `boltcall_setup_complete` without a DB check. Now always queries `business_profiles`; the URL flag no longer strands users in an empty dashboard.

- [ ] **Supabase Auth leaked-password protection is off** *(NEEDS NOAM)*
  Supabase Auth settings (advisor: `auth_leaked_password_protection`)
  This setting lives in the Supabase dashboard (Auth → Passwords → HIBP toggle); the Management API isn't exposed to this session. One-click fix.

---

## P1 — must-fix pre-launch

### Auth & onboarding

- [ ] **Signup missing `emailRedirectTo`**
  `src/lib/auth.ts:63–99`
  Pass `options.emailRedirectTo: origin + '/auth/callback'` and show a "check your email" state instead of falling through to `signInWithPassword`. If Supabase "Confirm email" is on, the confirm link currently lands on the Site URL, not the callback.

- [ ] **Double-workspace race in provisioning**
  `src/lib/setup/provisionAgentSetup.ts:17–29` + `netlify/functions/_shared/setup-workspace.ts:94–110`
  Reuse the "My Workspace" row that `ensureWorkspaceForUser` creates on `/setup` entry. Provisioning currently sees workspace-but-no-profile and calls `createUserWorkspaceAndProfile`, which duplicates or throws depending on `workspaces.user_id` uniqueness.

- [ ] **`localStorage.currentLocationId` leaks across accounts**
  `src/lib/setup/provisionAgentSetup.ts:38–40`
  Scope key by `userId`, or clear on `LOGOUT` in `AuthProvider`. Second account in same browser silently skips creating its primary location.

- [ ] **SetupLoading has no retry button on failure**
  `src/pages/SetupLoading.tsx:205–228`
  Add a Retry button that re-invokes `provisionAgentSetup`. Path is idempotent and `pendingSetup` is retained; today the only recovery is refresh.

- [ ] **Wizard state is not persisted**
  `src/components/v2/V2SetupChat.tsx:136–151, 466–477`
  Persist the three opening steps to `sessionStorage`, and pass `ownerName` through to the `business_profiles` insert (field exists, currently dropped). Refresh / back / session expiry mid-wizard restarts at step 1.

- [ ] **V1 opening flow hardcodes industry and transfer number**
  `src/components/v2/V2SetupChat.tsx:466–477`
  Add a transfer-number step and an industry picker, or accept the constraint publicly. Every V1 agent deploys with `industry: 'other'` and no transfer number.

- [ ] **Existing-email signup shows "Invalid login credentials"**
  `src/lib/auth.ts:86–99`
  Detect `identities.length === 0` on signup response; route to "account exists, sign in instead."

- [ ] **Login error copy collapses every failure to one string**
  `src/components/ui/auth-switch.tsx:162–164`
  Branch on error message and status. Network errors, Supabase 500s, and rate-limits all show as "Invalid email or password."

- [ ] **Signup always routes authed users to `/setup`**
  `src/pages/Signup.tsx:15–19`
  Check `boltcall_setup_complete` (or profile query); send completed users to `/dashboard`.

- [ ] **AuthRedirectRecovery hijacks `/reset-password`**
  `src/components/auth/AuthRedirectRecovery.tsx:23–46`
  Exclude `/reset-password` from `hasAuthHash` path. Stale `pendingAuthRedirect` + recovery hash currently pulls user to `/setup`, consuming the recovery token.

### Backend & integrations

- [ ] **`team-invite.ts` inserts members with no `workspace_id`**
  `netlify/functions/team-invite.ts:65–71`
  Delete this function and point callers at `invite-member.ts` (correctly authorized version). If it stays, add `workspace_id` and gate on `isOwnerOrAdmin`.

- [ ] **`team-api-keys.ts` accepts arbitrary `permissions[]`**
  `netlify/functions/team-api-keys.ts:50–60`
  Enum-validate the permissions array against a server-side allowlist.

- [ ] **Verify admin allowlists are set in production**
  `netlify/functions/dashboard-stats.ts, admin-metrics.ts`
  Confirm `ADMIN_EMAILS` is populated in Netlify env and `platform_admins` table is seeded.

- [ ] **Confirm `netlify.toml` ships proper security headers**
  `netlify.toml`
  Verify CSP, X-Frame-Options, Referrer-Policy, Strict-Transport-Security, Permissions-Policy.

- [ ] **Confirm no `VITE_`-prefixed secrets in client build**
  `.env`, `.env.example`, netlify env dashboard
  Grep built `dist/` for Stripe/Retell/Anthropic/OpenAI/Brevo secrets. Only Supabase anon key + PostHog project key should ship.

- [ ] **Rate-limit the public endpoints**
  `track-pricing-visit.ts`, `embed-config.ts`, `brevo-subscribe.ts`, `chatkit-session.ts`, `homepage-demo-call.ts`, `angi-lead-webhook.ts`, `callrail-lead-webhook.ts`, `housecall-pro-lead-webhook.ts`
  IP-scoped 10 req/min. Netlify Edge Functions rate-limit primitive, or Supabase-backed counter.

### Frontend surface

- [ ] **Confirm dashboardStore does not seed mock data**
  `src/stores/dashboardStore.ts` (audit agent flagged mock-seeded KPIs on default landing)
  If any Zustand initial state comes from `src/server/mockApi.ts`, replace with empty-state loader.

- [ ] **Global ErrorBoundary at the app root**
  `src/routes/AppRoutes.tsx` (or one level above)
  Confirm one exists and reports to PostHog.

- [ ] **Full CTA sweep on the marketing site**
  `Home.tsx`, `PricingPage.tsx`, `features/*`, `comparisons/*`, `tools/*`
  Click every primary CTA. Given the speed-test-offer finding, assume other CTAs are broken until proven otherwise.

- [ ] **Sitemap ⊆ prerender ⊆ live routes**
  `scripts/generate-sitemap.mjs`, `scripts/prerender.mjs`, `src/routes/AppRoutes.tsx`
  Diff the three lists. 141 sitemap entries against a very large AppRoutes.tsx; gap is currently unmeasured.

- [ ] **Supabase RLS-enabled-no-policy on 129 tables**
  Supabase advisors (informational level)
  Audit which are user-reachable in V1 (subscriptions, invoices, business_profiles, workspaces, agents, locations, callbacks, retell_calls). Any V1 table with RLS on and no policy is effectively locked.

---

## P2 — polish

- [ ] **ProtectedRoute treats DB error as "completed" and drops attempted URL on logout redirect**
  `src/components/ProtectedRoute.tsx:58–73, 117–118`
  One retry before defaulting open; append `?redirect=<path>` to login redirect.

- [ ] **Session expiry mid-wizard shows raw "Missing bearer token"**
  `src/components/v2/V2SetupChat.tsx:296–334`
  Map 401 to friendly re-auth prompt.

- [ ] **Password-reset session-fail shows raw error string**
  `src/pages/ResetPassword.tsx`
  Custom copy: "This link expired. Request a new one."

- [ ] **Retell agent_name hardcoded across both agent types**
  `netlify/functions/retell-agents.ts:684–686`
  Use `body.agent_name`. Retell dashboard shows two identical names per user today.

- [ ] **Two overlapping internal-secret env names**
  `netlify/functions/_shared/user-auth.ts:33–44`
  Consolidate on one of `INTERNAL_WEBHOOK_SECRET` or `INTERNAL_API_SECRET`.

- [ ] **`kb-search.ts` redundant per-branch userId re-destructure**
  `netlify/functions/kb-search.ts` (twelve action branches)
  Delete per-branch destructures. Line 119 already mutated `body.userId`; the noise is one refactor away from re-introducing spoofability.

- [ ] **Second-order IDOR risk in `saas-v2-setup-finalize`**
  `netlify/functions/saas-v2-setup-finalize.ts:401–419`
  Confirm `retell-agents.ts` does not trust `body.user_id` after JWT verify. Rolls up with the retell-agents P0.

- [ ] **`track-pricing-visit.ts` no rate limit**
  Rolls up with P1 rate-limit sweep.

---

## Needs live verification

Things a static audit can't answer. Each ships with the smallest test that resolves it.

- [ ] **Is Supabase "Confirm email" on or off in production?**
  Supabase dashboard → Authentication → Providers → Email. If on, signup needs `emailRedirectTo` before launch; if off, fallback `signInWithPassword` in auth.ts is fine.

- [ ] **Is `workspaces.user_id` a unique constraint?**
  `SELECT indexdef FROM pg_indexes WHERE tablename = 'workspaces';`. Decides whether the double-workspace P1 duplicates or throws.

- [ ] **Is `workspaces.slug` NOT NULL?**
  `\d workspaces` in psql. If yes, `ensureWorkspaceForUser` throws and the chat-resume path is dead.

- [ ] **Are Google/Microsoft/Facebook OAuth redirect URIs configured for production?**
  Click each OAuth button in incognito. Microsoft and Facebook especially unverified.

- [ ] **Do RLS policies actually let the anon client insert workspaces/business_profiles/agents/locations?**
  Full new-user provisioning path end-to-end with fresh Supabase account.

- [ ] **Does `retell-agents.ts action=create_full` fit inside a Netlify function invocation?**
  Time it. Firecrawl scrape → KB → prompt → Retell LLM → Retell agent → Cekura, twice per user. Sync functions cap at 10s (26s background).

- [ ] **Does the real recovery email land on `/reset-password` with a session that `getSession()` resolves?**
  Trigger a reset from live site, click emailed link, complete form, log in.

- [ ] **Are there any hardcoded stale prices outside `src/lib/stripe.ts`?**
  Grep marketing pages that showed up on the sweep (40 files touched old numbers). Any hardcoded `$99`, `$179`, `$249` is a bug.

- [ ] **Do Netlify functions time out under a realistic Retell + Twilio failure?**
  Kill Retell API key on staging; run provisioning. Confirm client sees real error, not a hung spinner.

- [ ] **Playwright — which flows have any coverage?**
  Read `e2e/` or `tests/`. Cover at minimum signup → confirm → setup → provisioning → dashboard, and forgot-password → reset → login.

---

## Four-week roadmap

Solo founder, ~40 productive hrs/wk. Order chosen so nothing later depends on something earlier being partial.

### Week 1 — Stop the bleed

- Mon: Fix Stripe prices in `src/lib/stripe.ts`, sweep 40 marketing pages, deploy. Flip Supabase leaked-password protection on.
- Mon: Enable RLS on the 14 disabled tables; add minimal explicit policies or move AIOS/marketing tables to separate project.
- Tue: Add workspace scoping to `team-manage-roles.ts` UPDATE/DELETE/`role_permissions` rewrite. Extend `__tests__/saas-v2-security.test.ts` cross-tenant test.
- Tue: Fix `retell-agents.ts create_full`: fail-hard on insert error + delete created Retell agent; switch inserts to JWT `userId`.
- Wed: Wire speed-test `/offer` submit to real endpoint with Brevo notification.
- Wed: Fix `ProtectedRoute` so `?setupCompleted=true` requires real profile row.
- Thu: Full read-through of every P0 fix in browser, live. Deploy behind checklist.
- Fri: Buffer. Verify: `npm run readiness:production` passes, Supabase advisors show zero `ERROR`-level items.

### Week 2 — Close the P1 tail

- Auth: `emailRedirectTo`, existing-email branch, network-error copy, Signup guard, AuthRedirectRecovery exclusion.
- Onboarding: reuse pre-created workspace, scope `currentLocationId`, SetupLoading retry button, wizard `sessionStorage`, pass `ownerName` through.
- Wizard: transfer-number step + industry picker (or defer publicly).
- Backend: delete or fix `team-invite.ts`; enum-validate `team-api-keys.ts` permissions; confirm `ADMIN_EMAILS` + `platform_admins` in prod.
- Headers: verify + tighten `netlify.toml` security headers. Grep `dist/` for leaked secrets.
- Rate-limit: IP-scoped limits on the 8 public write endpoints.
- Frontend: dashboardStore mock check, global ErrorBoundary, marketing CTA sweep, sitemap ⊆ prerender ⊆ AppRoutes diff.
- Data: audit 129 RLS-enabled-no-policy tables; confirm every V1-critical table has explicit policies.

### Week 3 — Verify live

- Playwright specs: (1) signup → email confirm → setup → provisioning → dashboard; (2) forgot password → reset → login; (3) speed-test → offer submit → lead exists.
- Run the ten live-verification checks; fix anything that surfaces.
- Two-tab race on provisioning; verify no duplicate Retell agents. Load-test setup path with Retell API forced offline.
- Sweep 9 P2 items in same window.
- Three consecutive real user tests without founder intervention. Everything they trip on becomes a ticket; nothing new ships until all three land.

### Week 4 — Production hardening

- Errors: Sentry (or PostHog error events) wired from ErrorBoundary + every Netlify function. Alerting on error rate.
- Backup: Supabase PITR verified. One restore drill on staging project.
- Deploy: Decide on Netlify auto-deploy — fix GitHub App or accept manual permanently and document.
- Uptime: External probes on `boltcall.org`, `/dashboard`, one representative Netlify function. Retell + Twilio health monitor with Telegram alert.
- Docs: Runbook for Retell/Twilio degradation, Supabase rollback, "how to rotate every secret" list.
- Public: Open the doors.

---

## Definition of "100% production"

- [ ] All 8 P0 items closed **and** re-verified live (clicked through in browser with fresh incognito user, not just "fixed in code").
- [ ] All 20 P1 items closed.
- [ ] Playwright specs green on every deploy for signup, password reset, provisioning, speed-test funnel. CI blocks merge on failure.
- [ ] Zero mock data seeded in any user-facing store. Grep for `mockApi` in `src/` returns nothing that a user path hits.
- [ ] Sitemap ⊆ prerender ⊆ live routes. Diff produces empty set.
- [ ] Every price on every page is canonical. Grep for `$99`, `$179`, `$249` in `src/` returns nothing outside legacy tests.
- [ ] Supabase security advisors show zero `ERROR`-level findings on any prod-facing table.
- [ ] Every public write endpoint is rate-limited.
- [ ] Error stream monitored. Sentry (or equivalent) receives events; on-call pings when rate rises.
- [ ] Three consecutive live user tests complete signup → active dashboard without founder intervention.

---

## Coverage note

Session limits killed 4 of 6 parallel audit agents mid-run. What was actually covered vs. what still needs its own audit:

| Area | Status |
|---|---|
| Auth + onboarding flow (signup, callback, login, reset, setup, provisioning) | FULL |
| Netlify functions — saas-v2, team, admin, usage, api-keys, kb-search, webhook-manager | FULL |
| Supabase security advisors (all 14 disabled + 129 no-policy + 1 definer view) | FULL |
| Supabase performance advisors (194 initplan, 61 unindexed FK, 377 unused index) | FULL (deferred to post-launch) |
| Pricing consistency across marketing pages | PARTIAL — 40 files flagged, one-by-one sweep still needed |
| Public route inventory vs sitemap vs prerender | PARTIAL — 141 sitemap entries vs AppRoutes.tsx unmeasured |
| Dashboard pages — data source, empty states, error states | PARTIAL — infra findings collected, per-page audit died mid-run |
| Speed-test funnel, Contact form, Book-a-Call CTA | PARTIAL — offer submit flagged as fake, others unchecked |
| Netlify functions — retell-*, twilio-*, whatsapp-*, agency-*, integrations | NOT AUDITED — 100+ functions untouched |
| Build health — typecheck, lint, vitest, playwright coverage, bundle sanity | NOT AUDITED — infra agent died before running gates |
| Settings sub-pages — save actions, billing wiring, Stripe checkout end-to-end | NOT AUDITED |

Everything in the "not audited" bucket is a candidate for the Week 3 live-QA pass. Findings in this plan are the floor, not the ceiling — expect the four-week roadmap to gain P1/P2 items as coverage fills in.

---

## For future sessions executing this plan

1. **Never edit the root main checkout.** Boltcall CLAUDE.md hard rule. Create a worktree first: `git worktree add -b <short-branch> ../Boltcall-<branch> HEAD` under `C:\Users\Asus\Desktop\Boltcall_website\worktrees\`.
2. **Do not re-audit.** Read this file, pick an unchecked item, execute. Only re-audit if the code has diverged materially from the file references cited above (e.g. line numbers off, function renamed).
3. **When you finish an item**, mark it `[x]` with the commit hash. Example: `- [x] Fix stripe prices ... (c0ffee1)`.
4. **When you find something new**, append to the correct P0/P1/P2 section with the same format: bold summary, file:line, one-line fix.
5. **Commit checkpoint after each item.** Follow the global commit rules: `git add -u`, inferred message, no auto-push.
6. **Do not skip live verification.** A green typecheck is not the same as a working flow. Week 3 rules apply even for a single-item fix.

**Related files**
- Rendered artifact view: <https://claude.ai/code/artifact/eec03576-0f09-461b-b071-9d069ee7dac0>
- Prior P0/P1 fix: commit `8e7b94fc3` (`/reset-password`, AuthCallback guard, provisioning idempotency, LOGOUT-in-finally)
- Reference for correct tenant-scoped pattern: `netlify/functions/invite-member.ts`
- Reference for admin-gate pattern: `netlify/functions/admin-metrics.ts`, `netlify/functions/dashboard-stats.ts`
- Reference for tenant-cross security test: `netlify/functions/__tests__/saas-v2-security.test.ts`
