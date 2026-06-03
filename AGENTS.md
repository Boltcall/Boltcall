# Boltcall — Codex / Agent Handoff (multi-session)

> Speed-to-lead platform for local service businesses. Every inbound lead gets responded to immediately and booked on the calendar.

---

# ⚠ MULTIPLE HANDOFF DOCS — READ BOTH

Two parallel agent sessions ran in late May / early June 2026. Each wrote its own handoff:

- **`HANDOFF.md`** (this repo, root) — the WhatsApp E2E + Google Ads Lead Form webhook stream (16 bugs fixed + 2 features shipped + Azure v6→v7). Read this for: WhatsApp/Retell/Google-Ads-webhook context, recent infra debug, U1/U2 user tasks.
- **`AGENTS.md` ⚡ START HERE section below** — the V2 AI-native dashboard stream (13 V2 pages + setup wizard + Agency OS substrate + v8 pre-push verification fixes). Read this for: V2 architecture, V2 endpoint patterns, owner_id-vs-user_id gotcha, the boltcall-write-guard hook.

**The streams are independent — neither replaces the other.** A fresh agent should skim HANDOFF.md, then read AGENTS.md top section, then proceed.

---

# ⚡ START HERE — V2 / v8 handoff (2026-06-03)

## Current live state (V2 dashboard)

- **Production V2 dashboard is LIVE** at https://boltcall.org/v2/ — opt-in gated; founder workspace `b03e0598-b492-4cfd-a689-515b251fd4ea` (name "hi") has `v2_enabled=true`
- **13 V2 pages + setup wizard + Agency OS substrate** all merged + verified deployed

| Route | File |
|---|---|
| `/v2/` | `src/pages/v2/V2HomePage.tsx` |
| `/v2/analytics` | `src/pages/v2/V2AnalyticsPage.tsx` |
| `/v2/calls` | `src/pages/v2/V2CallsPage.tsx` |
| `/v2/leads` | `src/pages/v2/V2LeadsPage.tsx` |
| `/v2/messages` | `src/pages/v2/V2MessagesPage.tsx` |
| `/v2/agent` | `src/pages/v2/V2AgentPage.tsx` |
| `/v2/knowledge` | `src/pages/v2/V2KnowledgePage.tsx` |
| `/v2/integrations` | `src/pages/v2/V2IntegrationsPage.tsx` |
| `/v2/reputation` | `src/pages/v2/V2ReputationPage.tsx` |
| `/v2/help` | `src/pages/v2/V2HelpPage.tsx` |
| `/v2/qa` | `src/pages/v2/V2QAPage.tsx` |
| `/v2/settings` | `src/pages/v2/V2SettingsPage.tsx` |
| `/v2/setup` | `src/pages/v2/V2SetupPage.tsx` (UNGATED — reachable pre-opt-in) |

**30 saas-v2-* Netlify endpoints** under `netlify/functions/` — all use:
- `getServiceSupabase` from `_shared/token-utils` for DB
- `getV2CorsHeaders` from `_shared/cors-v2` for CORS (strict allowlist, never wildcard)
- `chatCompletion` from `_shared/azure-ai` for LLM
- `emitSaasV2Event` from `_shared/emit-agency-event` for telemetry
- `redactSecrets` from `_shared/redact-secrets` where user content is persisted

**Test suite:** vitest 794 pass / 3 pre-existing fails (lead-response × 2 + Setup flaky timeout). All 88 V2 smoke tests pass; all 21 V2 security tests pass.

## CRITICAL GOTCHAS — bugs that bit hard in v8

**1. `workspaces.user_id` (NOT `owner_id`)**
The `workspaces` table column is `user_id`. EVERY V2 query that does `.eq('owner_id', userId)` will 500 with `column "owner_id" does not exist`. This bit 30+ files in v8 — fixed but vigilance required.

Verify:
```bash
grep -rn "\.eq('owner_id'" netlify/functions/saas-v2-*.ts src/components/v2/ src/stores/
# Should return ZERO matches
```

**2. `tsconfig.app.json` has `include: ["src"]` — `tsc --noEmit` does NOT validate `netlify/functions/`**
`npx tsc --noEmit -p tsconfig.json` will report 0 errors even when netlify functions have broken `cors`/undefined/Cannot-find-name issues. Backend TS validation only happens at deploy time via Netlify's esbuild bundler. **DO NOT trust `tsc` for backend changes. Use `vitest` (real runtime) + `npm run build:fast` (esbuild bundle).**

**3. `V2OptInGate` is applied by the parent `/v2` route, NOT by individual pages**
Individual page components must NOT wrap themselves with `<V2OptInGate>` — that causes double-wrap nested loading flashes. The parent route at `src/routes/AppRoutes.tsx` wraps `<Outlet />` in `<V2OptInGate>`. EXCEPTION: `/v2/setup` is registered OUTSIDE the gate (new users must reach it pre-opt-in).

**4. V2 endpoints use `.eq('user_id', userId)` directly — single-workspace-per-user assumption**
Today every user has exactly 1 workspace. If we ever support multi-workspace-per-user, 18+ V2 endpoints will silently merge data across workspaces. Documented as a Phase-1 refactor; not currently a bug.

**5. Mass regex sweeps on code are DANGEROUS**
A v8 Python script that renamed `\bheaders\b → cors` accidentally:
- Renamed `event.headers['authorization']` to `event.cors['authorization']` (broke auth)
- Renamed `headers: cors` (the corrected key) to JS-shorthand `cors,` (lost the `headers:` key entirely)
- Skipped 3 knowledge endpoints whose handler signature was `const handler: Handler =` (not `export const handler:`)

If you must do mass code rewrites: scope identifiers tightly, test EVERY changed file with vitest, and spot-check at least 3 files visually.

**6. The boltcall-write-guard hook blocks `Write`/`Edit` on `main` branch (Claude Code only)**
Codex does NOT have this guard. Use git worktrees anyway for clean isolation:
```bash
git worktree add -b <branch-name> ../Boltcall-<short-name> HEAD
cd ../Boltcall-<short-name>
# do work here
git add -u && git commit
cd ../Boltcall && git merge --no-ff <branch-name>
```

**7. Netlify env vars exist; CLI is authenticated**
Run `netlify env:list` to see all 42+. Currently set: `META_ACCESS_TOKEN`, `FOUNDER_UUID`, `AGENCY_AGENT_DAILY_USD_CAP=50`, `ALLOWED_ORIGINS`, `CRON_SECRET`, `SENTINEL_SHARED_SECRET`, `AGENCY_OS_SERVICE_TOKEN`, `INTERNAL_API_SECRET` + Supabase + Retell + Twilio.

## ACTIVE FOREIGN WORK — DO NOT TOUCH

`C:\Users\Asus\Desktop\Marketing\agentic-os` repo is in active divergent state:
- 67 commits ahead of `origin/main` (Atlas proof-targets work stream)
- 46 commits behind `origin/main` (lead enrichment, SEO metrics, AU medspa, Playwright)
- Dirty working tree (modified Dockerfile, large `agents/revenue-pipeline-agent/*` deletion)
- 35 untracked source files (new `speed-to-lead-night-agent`, `lib/*.js`, skills, tests)

This belongs to ANOTHER agent session. **Do not commit, push, or stage anything in `Marketing/agentic-os`.** The AIOS deploy is blocked until that session ends cleanly via `Marketing\scripts\end-aios-session.ps1`.

## Supabase production substrate (project `hbwogktdajorojljkjwg`)

- **Founder UUID:** `78a5f97e-8d11-4287-beeb-f26f3cebf57a` (noamyakoby6@gmail.com)
  - JWT stamped with `raw_app_meta_data.role='founder'`
  - `is_founder()` returns `true` for stamped JWTs
- **All migrations on disk are applied** to prod. Notable additions in v7/v8:
  - `agency_kernel` + `agency_kernel_fix` + `agency_rls` + `agency_client_portal_columns` (7 agency_* tables w/ RLS + 5 helper functions + secret-leakage trigger)
  - `v2_opt_in` (adds `workspaces.v2_enabled`)
  - `v2_setup_state` (adds 5 columns: v2_setup_state jsonb, v2_setup_status, v2_setup_started_at, v2_setup_completed_at, v2_setup_conversation_id)
  - `v2_setup_state_version` (adds bigint CAS counter)
  - `v2_qa_scores` (new `saas_v2_qa_scores` table with RLS on `workspaces.user_id`)
  - `enable_rls_internal_ops` (RLS enabled on 59 aios_*/atlas_*/ceo_*/retell_* internal-ops tables)
- **3 Storage buckets:** `agency-voices`, `agency-creatives`, `agency-reports` (all private, MIME-typed)
- **Founder workspace opted into V2:** `b03e0598-b492-4cfd-a689-515b251fd4ea`

## Meta Business integration (Flow A only)

- System User `Boltcall API` (id `122102466914588016`) under Meta BM `Boltcall`
- Token: live in `META_ACCESS_TOKEN`. Never-expires. Scopes: `ads_management`, `ads_read`, `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging`
- Ad account `act_2978812642479014` (Boltcall, USD, active) assigned to system user
- **DEFERRED:** Flow B (Meta Lead Ads webhooks → speed-to-lead) needs token regenerated with `pages_show_list` + `pages_manage_metadata` + `leads_retrieval` scopes. Add a Facebook Page to the system user first, then regenerate.
- **NOTE:** the other session (`HANDOFF.md`) built a separate **Google Ads** Lead Form webhook with full hardening (51-finding review). Don't conflate Meta and Google — they're separate adapters.

## Deferred / pending

| Item | Reason | When |
|---|---|---|
| AIOS deploy (Atlas/agentic-os) | Foreign session divergence | After foreign session ends cleanly |
| PayPal env vars + plan IDs | No paying SaaS customers on Starter/Pro/Ultimate tiers yet; agency offers are high-touch invoicing | When first self-serve subscriber signs up |
| Stripe products | Stripe doesn't support Israel | N/A — using PayPal |
| 2 lead-response-service test failures | Pre-existing; supabase test mock doesn't support `.eq().eq()` chained calls | Low priority |
| Setup.test.tsx flaky timeout | Passes 6/6 in isolation; times out under full-suite load (>5s render+userEvent) | Bump testTimeout to 10s for that test |
| Meta token regen with Page scopes | Lead Ads (Flow B) not needed for dogfood pilot | When wiring Lead Ads webhook to a Page |
| Founder-JWT real-boot smoke test | Requires user to log in via UI + copy access_token from localStorage | When user is at boltcall.org logged in |
| U1 / U2 user tasks | See HANDOFF.md (Facebook OAuth flip + Phase E re-test call) | When Noam returns to drive them |

## Critical files & patterns to know

**V2 shell (shared by all 13 pages):**
- `src/components/v2/DashboardLayoutV2.tsx` — wraps `<Outlet/>`, sidebar, topbar, AskBoltcallAIV2 strip
- `src/components/v2/SidebarV2.tsx` — 12 nav items + "Back to V1" link
- `src/components/v2/V2OptInGate.tsx` — queries `workspaces.v2_enabled` (uses `user_id` correctly)
- `src/components/v2/V2OptInToggle.tsx` — POSTs to `saas-v2-toggle`
- `src/components/v2/AskBoltcallAIV2.tsx` — POSTs to `saas-v2-ask-ai` with fallback to `agency-client-ask-ai`
- `src/components/v2/V2SetupChat.tsx` — streaming chat to `saas-v2-setup-conversation` with 5-min stall fallback to V1 `/setup`

**Reusable backend helpers (DO NOT REWRITE):**
- `netlify/functions/_shared/token-utils.ts` — `getServiceSupabase()`, JWT auth
- `netlify/functions/_shared/azure-ai.ts` — `chatCompletion(systemPrompt, userPrompt, {tier})` returns string. Tier = `'light' | 'heavy' | 'nano' | 'codex'`.
- `netlify/functions/_shared/cors-v2.ts` — `getV2CorsHeaders(origin, {methods})` returns `{headers, allowed, echoedOrigin}`
- `netlify/functions/_shared/emit-agency-event.ts` — `emitSaasV2Event({workspace_id, type, payload})`. Schemas + AgencyEventType union live here.
- `netlify/functions/_shared/redact-secrets.ts` — `redactSecrets(text)` strips `sk_live_`, `pk_live_`, `EAA…`, `secret_`, `Bearer `, 40+ hex tokens

**V2 endpoint canonical shape:**
```typescript
import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
import { emitSaasV2Event } from './_shared/emit-agency-event';

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' /* or POST or both */ },
  );
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  // ... auth, derive workspace_id from workspaces.user_id, ...
};
```

## How to verify changes (the right order)

1. **vitest** — `npx vitest run` from main checkout. GROUND TRUTH for backend. Allow 1-3 pre-existing fails.
2. **vite build** — `npm run build:fast` runs `tsc -b && vite build`. Catches frontend TS errors.
3. **Live curl** — `curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://boltcall.org/.netlify/functions/<fn>` should return 401 (not 404) once deployed.
4. **NOT `tsc --noEmit -p tsconfig.json`** — does not cover backend (see gotcha #2).

## Plan files & memory references

- **Active plan:** `C:\Users\Asus\.claude\plans\i-ahev-so-much-steady-frog.md` (v7 complete, v8 = pre-push verification + 8 fixes shipped)
- **Claude's session memory** (not auto-readable by Codex): `C:\Users\Asus\.claude\projects\c--Users-Asus-Desktop-Boltcall-website-Boltcall\memory\` — copy entries you need

Key references from memory:
- **Live domain:** `boltcall.org` (NOT `.com`)
- **Repo:** `NJ44/Boltcall`. Netlify project `boltcall` (id `8ec31e2a-c9cf-42e7-9b3d-7b7c04ed2613`). Auto-deploy via Netlify GitHub App may be flaky — fallback is `npm run build:prerender && netlify deploy --prod --dir=dist --no-build`.
- **Founder phone for QA tests:** `+972 54 574 4482`
- **User defaults:** never push without explicit ask; commit freely
- **Boltcall positioning:** Speed-to-lead platform, NOT "AI receptionist". Lead with instant response.
- **Canonical pricing:** Starter $549, Pro $897, Ultimate $4997, Enterprise $997 (monthly). `src/lib/stripe.ts` is stale; trust the memory entry.
- **Email marketing:** Brevo (not Beehiiv/Instantly)
- **Docs:** https://boltcall.mintlify.app/

## Recent V2/v8 commit history

```
40295ce4 chore(tests): replace realistic-looking test secrets with obvious-fake patterns
ef321a2c fix(v2-cors): repair 3 collateral bugs from v8-fixes CORS sweep
d9c09f39 merge: v8-fixes (8 pre-push fixes)
e0a7046d fix(v2,v1): workspaces.owner_id -> user_id in 3 remaining client-side queries (V2OptInGate critical)
fa334649 fix(v2-setup): replace workspace_id placeholder + assert at runTool entry
53be2405 fix(v2-qa): cap per invocation 20 -> 10 + return remaining_unscored_count
2a221f2b fix(v2-cors): strict allowlist on all 26 non-setup V2 endpoints
559c0d8a fix(v2-cors): saas-v2-settings-update uses cors-v2 fail-closed allowlist
ee844b0b fix(v2): remove redundant V2OptInGate wrap on Analytics + Reputation pages
d17c0955 feat(v2): saas-v2-ask-ai endpoint (Ask Boltcall AI strategist)
15f9f0c5 fix(v2): workspaces.owner_id -> user_id across all V2 endpoints
```

## What a fresh session can profitably do next (rough priority)

1. **Address U1 + U2** from `HANDOFF.md` (Facebook OAuth flip + Phase E re-test call) — user actions that unblock other work
2. **Fix the 3 pre-existing test failures** — known + isolated; would bring suite to 797/797
3. **Founder-JWT smoke test** — once user provides a real JWT, verify `agency-smoke-test-cleanup` actually works founder-gate end-to-end
4. **PayPal Sandbox env vars** — `PAYPAL_MODE=sandbox` + sandbox Client ID/Secret so the existing PayPal code at least authenticates
5. **Add a tsconfig that covers `netlify/functions/`** — so backend TS errors surface at `tsc --noEmit` (would have prevented v8 regex chain bugs)
6. **Wire `META_PAGE_ID` env var** (optional) — for ad campaigns that promote a Page
7. **Resolve workspace_id properly on V2 endpoints** — refactor the 18 endpoints that `.eq('user_id', userId)` directly to first resolve workspace_id from workspaces, then query data tables with `.eq('workspace_id', workspaceId)`. Future-proofs against multi-workspace-per-user.

---

# Boltcall – Original Project Context

Speed-to-lead platform for local service businesses. Every inbound lead gets responded to immediately and booked on the calendar.

## Brand / Positioning
- **Core promise**: Every lead responded to instantly, every opportunity booked
- **Category**: Speed-to-lead / lead engagement platform (NOT just "AI receptionist")
- **Audience**: Local service businesses (plumbers, dentists, lawyers, HVAC, med spas, etc.)
- **Differentiator**: Speed — the first business to respond wins the job. Boltcall makes that automatic.
- When writing copy, lead with speed-to-lead and instant response.

## Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v3, Radix UI primitives, class-variance-authority, clsx, tailwind-merge
- **Routing**: React Router DOM v7 — all routes in `src/routes/AppRoutes.tsx`
- **State**: Zustand stores in `src/stores/`
- **Auth/DB**: Supabase (`@supabase/supabase-js`) — client in `src/lib/`
- **AI Voice**: Retell SDK (`retell-sdk`) — API in `src/api/retell/`
- **Animations**: Framer Motion, GSAP, Lottie
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Deployment**: Netlify (serverless functions in `netlify/functions/`, config in `netlify.toml`)

## Project Structure
```
src/
  api/           # External API integrations (facebook/, retell/)
  components/
    dashboard/   # V1 dashboard components
    v2/          # V2 AI-native dashboard components (added 2026-06)
    pricing/     # Pricing section components
    setup/       # V1 onboarding wizard
    ui/          # Shadcn-style base UI components
    hooks/       # Component-level hooks
  contexts/      # React contexts (AuthContext)
  data/          # Static data/constants
  hooks/         # App-level hooks
  lib/           # Supabase client and utilities
  pages/
    dashboard/   # V1 authenticated dashboard pages
    v2/          # V2 AI-native pages (13 surfaces)
    features/    # Feature landing pages
    speed-test/  # Speed test funnel pages
    comparisons/ # Competitor comparison pages
  routes/        # AppRoutes.tsx — V1 + V2
  server/        # api.ts, mockApi.ts
  stores/        # Zustand stores
  styles/        # nav.css
  types/         # TypeScript types
  utils/         # chatkit.ts and other utilities
public/          # Static assets
netlify/
  functions/     # 30+ saas-v2-* + agency-* + V1 functions
dist/            # Build output
supabase/
  migrations/    # All migrations applied to production
```

## Conventions
- Components use `.tsx`, utilities use `.ts`
- Tailwind for all styling — no CSS modules
- V1 dashboard pages live in `src/pages/dashboard/`, V2 in `src/pages/v2/`
- Netlify functions handle server-side logic
- **Backend functions NOT type-checked by `tsc --noEmit`** — see gotcha #2

## MANDATORY: Page Creation & Deploy Protocol

After creating ANY new page and deploying:

1. **Add to sitemap** — add the route to `scripts/generate-sitemap.mjs` ROUTES array
2. **Commit** — `git add -A && git commit -m "feat: add [page-name]"`
3. **Merge to main** — push branch and merge (or push directly if on main)
4. **Deploy** — `npm run build:prerender && netlify deploy --prod --dir=dist --no-build`
5. **GSC submit** — `NEW_URLS="/blog/your-slug" npm run gsc-submit`

Never skip steps 4–5.

## Coding Behavior (Karpathy Guidelines)

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If something is unclear, stop. Name what's confusing. Ask.

### Goal-Driven Execution
For multi-step tasks, state a brief plan with verifiable success criteria:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```
