# Law Firm Pivot Plan

Decisions locked (2026-08-15):
- **Scope: Beachhead.** Law firms = primary ICP in all marketing/sales/copy now. Code stays multi-industry-capable (don't rip out plumber/dentist/HVAC templates) — just goes dark in messaging. Reactivatable later.
- **Practice area: General/solo practice.** Don't niche to PI/family/immigration yet.
- **Evidence: validated.** Already have law firm customer interest — use as case study / social proof, not cold thesis.
- **Depth: full rebuild.** Product + copy + pricing + sales move together, not messaging-only.

## What already exists (don't rebuild)

Codebase audit found the legal vertical is already substantially built:
- Voice AI prompt template for lawyers is deep and production-grade: `netlify/functions/generate-agent-prompt.ts:961-1078` (EN) / `:3144-3229` (ES) — emotional triage by practice area, urgency triage (custody emergency, ICE deportation, statute of limitations), absolute limits (never give legal advice, never assess case strength), objection handling. This is a strength, not a gap.
- `law_firm` already in setup wizard vertical dropdown: `src/lib/setup/onboarding.ts:3-29`.
- Avg job value for lawyer already set high in loss-aversion copy: `src/data/industryDefaults.ts` (`lawyer/legal: 2500` vs plumber `450`, hvac `550`).
- Vertical landing page: `/industries/lawyer-answering-service` (`LawyerAnsweringServicePage.tsx`).
- Trust/compliance page: `/law-firm-security` (`LawFirmSecurityPage.tsx`).
- Tool: `/tools/lawyer-intake-calculator`.
- 2 blog posts: `/blog/ai-receptionist-for-law-firms`, `/blog/speed-to-lead-for-law-firms`.
- FAQ page: `/blog/ai-receptionist-lawyer-faq`.

**Gap is emphasis, not existence.** Homepage hero/subtitle is generic ("Speed To Lead System for local businesses"), pricing page is generic, no dedicated sales motion, no legal case study live, nav doesn't lead with law firms.

## Phase 1 — Positioning & homepage (fast, do first)
- Update `src/i18n/locales/en/marketing.json` hero subtitle: "for local businesses" → "for law firms" (or keep dual: "for law firms and local service teams" during beachhead — recommend hard-swap to law firms only, since beachhead means *marketing* leads with the one ICP).
- `Home.tsx:27-37` `HOMEPAGE_AI_CONTEXT` + meta description — reorder so law firms/legal intake is first-named example, not buried in a list.
- Nav/footer: check for any "for [industries]" mega-menu — surface `/industries/lawyer-answering-service` prominently, consider it becomes the de facto second homepage for paid traffic.
- Check-gate: does `web-design-guidelines` skill pass on updated Home + Lawyer industry page after copy change.

## Phase 2 — Vertical landing page depth
- `LawyerAnsweringServicePage.tsx` — audit against current Searchable/AEO blog framework (`reference_searchable_blog_playbook`). Beachhead pages should be the most complete pages on the site, not equal-weighted with other verticals.
- Add real case study section once customer reference is usable (see Phase 5).
- Add practice-area sub-sections (PI, family, immigration, criminal, estate) even though outbound targeting stays "general" — searchers self-segment by practice area in SEO.

## Phase 3 — Pricing
- Current tiers (`src/lib/stripe.ts:64-68`): Starter $549 / Pro $897 / Ultimate $4997 / Enterprise $997 — flagged stale elsewhere (see `reference_canonical_pricing`).
- Law firm case value (~$2500 avg per `industryDefaults.ts`, often much higher for PI) supports anchoring higher than plumber/HVAC pricing. Decide: same tiers for all verticals (simpler) vs law-firm-specific tier/copy on the pricing page ("built for firms handling $X+ cases"). Recommend: same product tiers, but pricing-page copy/ROI math reframed around case value, not job value.

## Phase 4 — SEO/content expansion
- 2 blog posts exist; beachhead needs more volume. Candidate titles (via `boltcall-blog-writer` skill, mandatory before any Blog*.tsx): "How fast should a law firm call back a new lead", "Personal injury intake speed benchmarks", "What happens when a law firm misses an after-hours call".
- Comparison pages: no legal-specific "AI answering service for lawyers vs X" comparison exists yet in `src/pages/comparisons/` — consider one against legal-specific competitors (Smith.ai already covered generically at `CompareBoltcallVsSmithAi.tsx` — audit if it's law-firm-angled or generic).
- Every new page: sitemap + GSC submit per `CLAUDE.md` mandatory protocol.

## Phase 5 — Case study / social proof
- Convert existing law firm customer interest into a named or anonymized case study — this is the single highest-leverage asset for a beachhead push (real proof beats more landing pages).
- Needs: customer permission, a number (calls answered, leads booked, response time), placement on homepage + lawyer landing page + sales deck.

## Phase 6 — Sales/outbound
- Cold email + LinkedIn targeting shifts to law firm decision-makers (solo practitioners, small-firm managing partners). Use `sales-script-builder` / `ad-copy-writer` skills, existing cold-email skill dir.
- Ad copy (if running paid): law-firm-specific hooks, not generic "local business" copy.

## Phase 7 — Memory/docs housekeeping
- Update `project_boltcall_positioning.md` memory (done this session) — ICP now law firms (beachhead), other verticals dormant not deleted.
- `reference_canonical_pricing.md` — revisit once Phase 3 pricing decision is made.

## Order of execution
1 → 4 (SEO scales while case study is being lined up) → 5 → 2 → 3 → 6, with 7 updated incrementally as each phase lands. Nothing here is a hard product rebuild (no conflict-check, no matter-management feature was requested) — the "full rebuild" is copy + pricing + sales + content working together, not new backend systems.

## Open questions before executing
- Hard-swap homepage hero to "law firms" only, or keep it vertical-neutral and let `/industries/lawyer-answering-service` carry the ICP-specific pitch? (Affects Phase 1 scope.)
- Is the existing law firm customer referenceable by name, or anonymized only? (Blocks Phase 5.)
- New pricing tier/copy, or same tiers with reframed ROI math? (Phase 3.)
