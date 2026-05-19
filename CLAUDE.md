# Boltcall – Claude Project Context

Speed-to-lead platform for local service businesses. Every inbound lead gets responded to immediately and booked on the calendar — no lead left waiting, no opportunity missed.

## Brand / Positioning
- **Core promise**: Every lead responded to instantly, every opportunity booked
- **Category**: Speed-to-lead / lead engagement platform (NOT just "AI receptionist")
- **Audience**: Local service businesses (plumbers, dentists, lawyers, HVAC, med spas, etc.)
- **Differentiator**: Speed — the first business to respond wins the job. Boltcall makes that automatic.
- When writing copy, lead with speed-to-lead and instant response. The AI receptionist is one feature, not the headline.

## Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v3, Radix UI primitives, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Routing**: React Router DOM v7 — all routes defined in `src/routes/AppRoutes.tsx`
- **State**: Zustand stores in `src/stores/`
- **Auth/DB**: Supabase (`@supabase/supabase-js`) — client in `src/lib/`
- **AI Voice**: Retell SDK (`retell-sdk`) — API in `src/api/retell/`
- **Animations**: Framer Motion, GSAP, Lottie (`.lottie` files in `public/`)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Deployment**: Netlify (serverless functions in `netlify/functions/`, config in `netlify.toml`)

## Project Structure
```
src/
  api/           # External API integrations (facebook/, retell/)
  components/    # Reusable UI components
    dashboard/   # Dashboard-specific components (Sidebar, Topbar, etc.)
    pricing/     # Pricing section components
    setup/       # Onboarding wizard (WizardShell, steps/, forms/)
    ui/          # Shadcn-style base UI components
    hooks/       # Component-level hooks
  contexts/      # React contexts (AuthContext)
  data/          # Static data/constants
  hooks/         # App-level hooks (useLenis, etc.)
  lib/           # Supabase client and utilities
  pages/
    dashboard/   # Authenticated dashboard pages
      settings/  # Settings sub-pages (General, Members, Billing, etc.)
    features/    # Feature landing pages
    speed-test/  # Speed test funnel pages
    comparisons/ # Competitor comparison pages
  routes/        # AppRoutes.tsx — single routing file
  server/        # api.ts, mockApi.ts
  stores/        # Zustand: dashboardStore, setupStore, speedTestStore
  styles/        # nav.css
  types/         # TypeScript types (dashboard, callbacks, chats, retell)
  utils/         # chatkit.ts and other utilities
public/          # Static assets, Lottie animations, images
netlify/
  functions/     # Netlify serverless functions
dist/            # Build output (do not edit)
```

## Key Pages
| Route area | Entry point |
|---|---|
| Home/marketing | `src/pages/Home.tsx` |
| Auth | `src/pages/Login.tsx`, `src/pages/Signup.tsx` |
| Dashboard shell | `src/components/dashboard/DashboardLayout.tsx` |
| Main dashboard | `src/pages/dashboard/DashboardPage.tsx` |
| Settings | `src/pages/dashboard/settings/` |
| Onboarding wizard | `src/pages/Setup.tsx` + `src/components/setup/` |
| Pricing | `src/pages/PricingPage.tsx` |
| Speed-to-lead funnel | `src/pages/speed-test/` |

## Important Files
- `src/routes/AppRoutes.tsx` — all route definitions
- `src/contexts/AuthContext.tsx` — auth state
- `src/components/dashboard/DashboardLayout.tsx` — dashboard layout wrapper
- `src/components/dashboard/Sidebar.tsx` — sidebar nav
- `netlify.toml` — deployment + redirect config
- `.env` — environment variables (Supabase URL/key, Retell key, etc.)

## Conventions
- Components use `.tsx`, utilities use `.ts`
- Tailwind for all styling — no CSS modules
- Lottie animations served from `public/` as `.lottie` files
- Dashboard pages live in `src/pages/dashboard/`, their sub-components in `src/components/dashboard/`
- Netlify functions handle server-side logic (webhooks, proxied API calls)

## MANDATORY: Page Creation & Deploy Protocol

After creating ANY new page (blog post, landing page, tool, comparison, etc.) and deploying:

1. **Add to sitemap** — add the route to `scripts/generate-sitemap.mjs` ROUTES array
2. **Commit** — `git add -A && git commit -m "feat: add [page-name]"`
3. **Merge to main** — push branch and merge PR (or push directly if on main)
4. **Deploy** — `npm run build:prerender && netlify deploy --prod --dir=dist --no-build`
5. **GSC submit** — `NEW_URLS="/blog/your-slug" npm run gsc-submit`

Run step 5 with all new page paths comma-separated: `NEW_URLS="/blog/slug-1,/tools/calculator" npm run gsc-submit`
Never skip steps 4–5. Run them immediately after merge, not later.

## MANDATORY: Blog Page Creation Rule

**BEFORE writing any blog page** (any file matching `Blog*.tsx` in `src/pages/` or any new `/blog/*` route), you MUST first invoke the Skill tool with `skill: "boltcall-blog-writer"`. This loads the full Searchable 10-section framework, title patterns, visual components, and boilerplate requirements.

No blog page may be written without this skill active. This applies to every new blog post — no exceptions.

## Skill routing

When the user's request matches an available gstack skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

- Bugs, errors, "why is this broken", unexpected behavior → invoke gstack:debug
- "Does this work?", "test this page", verify a deploy → invoke gstack:qa-only
- Ship, deploy, push, create PR → invoke gstack:ship
- Code review, check my diff → invoke gstack:review
- Security questions, auth review, API exposure → invoke gstack:cso
- Architecture or refactor decisions → invoke gstack:plan-eng-review
- Design polish, visual audit → invoke gstack:design-review
- Save progress, checkpoint session → invoke gstack:context-save
- Post-deploy verification → invoke gstack:post-deploy

## Coding Behavior (Karpathy Guidelines)

### Think Before Coding
- State assumptions explicitly before implementing. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If something is unclear, stop. Name what's confusing. Ask.

### Goal-Driven Execution
For multi-step tasks, state a brief plan with verifiable success criteria before starting:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```
Transform vague tasks: "fix the bug" → "write a test that reproduces it, then make it pass".
