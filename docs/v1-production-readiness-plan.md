# Boltcall V1 — Production Readiness Plan

> **Status**: Phase 1 — 36/37 closed. Superseded by `docs/v1-production-readiness-plan-phase2.md` (covers the areas this audit never reached: dashboard pages, settings/billing, 91 Netlify functions).
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

- [x] **Supabase Auth leaked-password protection** — DESCOPED 2026-07-07 (founder decision)
  HIBP leaked-password protection is a Supabase Pro-plan feature (Management API returned `402` on Free tier). Verified the PAT path works; the block is purely the plan tier. Founder chose not to upgrade to Pro solely for this, so the item is dropped from V1 scope, not deferred. Re-add by upgrading to Pro and flipping the dashboard toggle (Auth → Providers → Password) if credential-stuffing on owner accounts becomes a concern. The one-off enable script was removed as dead code.

---

## P1 — must-fix pre-launch

### Auth & onboarding

- [x] **Signup missing `emailRedirectTo`** (a5a9d846c)
  `src/lib/auth.ts:63–99` — pass `options.emailRedirectTo: origin + '/auth/callback'`; drop the `signInWithPassword` fallback; throw `EmailConfirmationRequiredError` when no session so the UI can show a "check your email" state.

- [x] **Double-workspace race in provisioning** (c56b1f897)
  `src/lib/setup/provisionAgentSetup.ts` — split the workspace-exists-but-no-profile case out of `createUserWorkspaceAndProfile`; call `createBusinessProfile` directly against the existing workspace instead of re-minting.

- [x] **`localStorage.currentLocationId` leaks across accounts** (c56b1f897)
  `src/lib/setup/provisionAgentSetup.ts` + `src/contexts/AuthProvider.tsx` — namespace the cache key by userId (`currentLocationId:<uid>`); wipe legacy + scoped keys on logout so nothing leaks across sessions.

- [x] **SetupLoading has no retry button on failure** (c56b1f897)
  `src/pages/SetupLoading.tsx` — factor provisioning into `runProvisioning()`; add a "Try again" button when `provisioningError` is set.

- [x] **Wizard state is not persisted** (c56b1f897)
  `src/components/v2/V2SetupChat.tsx` — persist ownerName/country/businessName/website to `sessionStorage` under `boltcall_v2_setup_opening_drafts` and rehydrate on mount; rewind opening step to the earliest incomplete field.

- [x] **V1 opening flow hardcodes industry and transfer number** (d7f5f4b19)
  `src/components/v2/V2SetupChat.tsx` — added Industry `<select>` (13 verticals via expanded `INDUSTRY_OPTIONS`) and optional Transfer number `<input type="tel">` to the "agent" opening step. Drafts persist in the same `boltcall_v2_setup_opening_drafts` sessionStorage bag; finalization reads the values instead of hardcoding.

- [x] **Existing-email signup shows "Invalid login credentials"** (a5a9d846c)
  `src/lib/auth.ts` — detect `identities.length === 0`; throw `AccountExistsError`; UI routes to sign-in mode with the email pre-filled.

- [x] **Login error copy collapses every failure to one string** (a5a9d846c + cab81258d)
  `src/components/ui/auth-switch.tsx` — branch on network / rate-limit / not-confirmed / invalid-credentials.

- [x] **Signup always routes authed users to `/setup`** (a5a9d846c)
  `src/pages/Signup.tsx` — check `boltcall_setup_complete` and route completed users to `/dashboard`.

- [x] **AuthRedirectRecovery hijacks `/reset-password`** (a5a9d846c)
  `src/components/auth/AuthRedirectRecovery.tsx` — explicit `RECOVERY_EXCLUDED_PATHS` set so `/reset-password` can never be pulled away by a stale `pendingAuthRedirect` + recovery hash combo.

### Backend & integrations

- [x] **`team-invite.ts` inserts members with no `workspace_id`** (26498430b)
  `netlify/functions/team-invite.ts`
  Deleted — grep found no callers in `src/`; `invite-member.ts` is the live authorized path.

- [x] **`team-api-keys.ts` accepts arbitrary `permissions[]`** (26498430b)
  `netlify/functions/team-api-keys.ts`
  Enum-validated against `ALLOWED_PERMISSIONS` server-side allowlist before insert.

- [x] **Verify admin allowlists are set in production** (verified via MCP)
  `public.platform_admins` returns count=2 — the table is seeded. `ADMIN_EMAILS` in Netlify env still needs a manual dashboard check by Noam if not already confirmed, but the platform-admin path (which the code prefers) is live.

- [x] **Confirm `netlify.toml` ships proper security headers** (26498430b + 47e97e680)
  `netlify.toml`
  Added: X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, HSTS 1yr with preload, minimal Permissions-Policy. CSP intentionally deferred — needs a full pass against Retell/PostHog/Stripe/Brevo/Netlify in Week 3 QA.

- [x] **Confirm no `VITE_`-prefixed secrets in client build** (verified against root `.env`)
  `.env` grep returned only `VITE_RETELL_PUBLIC_KEY` (Retell's browser-safe public key) and `VITE_PAYPAL_CLIENT_ID` (PayPal client id, non-secret). No Stripe/Anthropic/OpenAI/Brevo/Instantly/Firecrawl/Apify secrets are VITE_-prefixed. Prod Netlify env still worth a spot-check but the local source of truth is clean.

- [x] **Rate-limit the public endpoints** (26498430b)
  Added IP+token rate limits to `track-pricing-visit.ts` (30/60s) and `embed-config.ts` (30/60s). `homepage-demo-call`, `brevo-subscribe`, `chatkit-session`, and the new `speed-test-offer` were already limited. Inbound-webhook endpoints (angi/callrail/housecall-pro/google-leads) rely on shared-secret HMAC and are third-party callers, not IP-scoped.

### Frontend surface

- [x] **Confirm dashboardStore does not seed mock data** (4b3668386)
  `src/stores/dashboardStore.ts` — dropped `mockData` import; seeded store with typed empty values (`kpis=0/0/0/0/0/0`, arrays empty). Live data now fills in on `fetchLiveData`.

- [x] **Global ErrorBoundary at the app root** (4b3668386)
  `src/App.tsx` — wrap the whole tree in the existing `ErrorBoundary` with `reportRootError` forwarding to `posthog.captureException` when available.

- [x] **Full CTA sweep on the marketing site** (2a1750890)
  New `e2e/cta-smoke.spec.ts` verifies primary CTAs across /, /pricing, /features/ai-receptionist, /comparisons, /tools/*, /blog, /about — plus a regression guard for the P0.4 speed-test /offer submit path. Runs via the existing `playwright.config.ts` webServer.

- [x] **Sitemap ⊆ prerender ⊆ live routes** (54293ce8a)
  New `scripts/audit-sitemap-diff.mjs` enumerates live/sitemap/prerender. Extended sitemap generator + prerender list to close every real coverage gap; excluded demo/component playgrounds, V2 preview shells, funnel sub-routes, thank-you pages, post-submit result screens. Final audit: live 170 = sitemap 170 = prerender 170, zero gaps, zero stale.

- [x] **Supabase RLS-enabled-no-policy on 129 tables** (partial, 54293ce8a)
  Verified every V1-user-reachable table already carries appropriate policies (workspaces, business_profiles, agents, locations, callbacks, chats, leads, appointments, subscriptions, invoices, workspace_members, api_keys, activity_logs, kb_folders, knowledge_base, phone_numbers, user_integrations, user_webhooks, notification_preferences, roles, role_permissions). Added the missing SELECT policies for `retell_calls` + `retell_call_scores` via `supabase/migrations/20260705220000_rls_policies_retell_calls_scores.sql`. Other RLS-on/no-policy tables (marketing lists, backend queues, event logs) are intentionally service-role only.

---

## P2 — polish

- [x] **ProtectedRoute treats DB error as "completed" and drops attempted URL on logout redirect** (0a411cf98)
  `src/components/ProtectedRoute.tsx` — retry the `business_profiles` query once on DB error; preserve the attempted URL as `?redirect=<encoded>` on the login redirect.

- [x] **Session expiry mid-wizard shows raw "Missing bearer token"** (0a411cf98)
  `src/components/v2/V2SetupChat.tsx` — map 401 to "Your session expired. Please sign in again and continue."

- [x] **Password-reset session-fail shows raw error string** (0a411cf98)
  `src/pages/ResetPassword.tsx` — branch on session/jwt/token/expired → friendly "This reset link expired" copy; weak-password gets its own hint.

- [x] **Retell agent_name hardcoded across both agent types** (0a411cf98)
  `netlify/functions/retell-agents.ts` — use `body.agent_name` when provided; fall back to `{business} AI Receptionist` when unset.

- [x] **Two overlapping internal-secret env names** (0a411cf98)
  `netlify/functions/_shared/user-auth.ts` — prefer `INTERNAL_API_SECRET`, keep `INTERNAL_WEBHOOK_SECRET` as legacy fallback with a comment marking it for removal after Week 4 secret rotation.

- [x] **`kb-search.ts` redundant per-branch userId re-destructure** (0a411cf98, partial)
  `netlify/functions/kb-search.ts` — annotate the `body.userId = authedUserId` override with the reason it must not be removed while any per-branch destructure still reads `body.userId`. Full destructure cleanup deferred.

- [x] **Second-order IDOR risk in `saas-v2-setup-finalize`** (already resolved upstream; verified d9dcb0d34)
  `netlify/functions/saas-v2-setup-finalize.ts:401–419` — `retell-agents.ts` stamps `body.user_id` from JWT (line 473) and `validateOwnedSetupReferences` scopes `business_profile_id` + `kb_folder_id` to the caller.

- [x] **`track-pricing-visit.ts` no rate limit** (26498430b)
  Rolled up with the P1 rate-limit sweep — IP-scoped 30 req/60s via `public_rate_limits`.

---

## Needs live verification

Things a static audit can't answer. Each ships with the smallest test that resolves it.

- [ ] **Is Supabase "Confirm email" on or off in production?**
  Supabase dashboard → Authentication → Providers → Email. If on, signup needs `emailRedirectTo` before launch; if off, fallback `signInWithPassword` in auth.ts is fine.

- [x] **Is `workspaces.user_id` a unique constraint?** (verified 2026-07-05 via MCP)
  NO — only a regular index. Double-workspace race duplicates silently. Follow-up in Phase 2 live-verification: add partial unique index after dupe check.

- [x] **Is `workspaces.slug` NOT NULL?** (verified 2026-07-05 via MCP)
  YES — NOT NULL + unique index `workspaces_slug_key`. `ensureWorkspaceForUser` must always set slug.

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

- Mon: Fix Stripe prices in `src/lib/stripe.ts`, sweep 40 marketing pages, deploy.
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
