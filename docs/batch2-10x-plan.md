# Batch 2 — 10x Product Plan

**Date:** 2026-07-11
**Scope:** Compounding tier: (4) industry prompt library, (6) agent A/B testing, (10) objection-mining loop.
**Basis:** Codebase exploration 2026-07-11 (three parallel deep-dives + `boltcall-industry-prompt` skill). Companion doc: `docs/batch1-10x-plan.md`.

**Key corrections to the original brief:**
- 17 industry templates already exist with **full EN/ES parity** (not 12 as the skill doc says) — pest control, electrical, cleaning, moving are done. The work is enriching 8 thin templates, adding missing verticals, and fixing the picker↔template mismatch.
- A "shadow rollout" prompt-versioning system already exists (`retell_prompt_versions` FSM + promote + monitor). A/B testing = productizing and hardening it, not greenfield.
- Objection mining is ~80% wired: full transcripts stored, per-call objection scores already produced, approval queue UI already built. One net-new scheduled function closes the loop.

---

## Execution order

| Order | Item | Why | Effort |
|---|---|---|---|
| 1 | Task 10 — objection-mining loop | Smallest lift (1 new function), highest moat-per-hour, everything downstream wired | S (1–2 sessions) |
| 2 | Task 4 — industry prompt library | Pure content + one picker fix; parallelizable across verticals with subagents | M (2–3 sessions) |
| 3 | Task 6 — A/B testing | Depends on attribution fix; shadow infra needs hardening first | M–L (3 sessions) |

Shared prerequisite (do first, ~30 min): **schema reconciliation** — `retell_prompt_versions` DDL is not in `supabase/migrations/` (applied via MCP out-of-band). Dump live schema, add an idempotent migration defining it. Same drift risk noted in batch 1 for `appointments`.

---

## Task 10 — Objection-Mining Loop

### Current state (verified)

Nearly everything exists:

- **Transcripts:** `retell_calls.transcript` (full text) + `retell_payload` jsonb, written by `netlify/functions/retell-call-scorer.ts:161–171` on every ended call.
- **Pre-labeled objection data:** `retell_call_scores` has one row per dimension per call; `dim = 'objection_handling'` with 0–1 score + one-sentence LLM `notes` rationale. Produced automatically (scorer fires from `retell-webhook.ts:271`).
- **Lost-call filter:** `retell_calls.outcome IN ('no_outcome', 'hung_up')` (taxonomy from `inferOutcome`, `retell-call-scorer.ts:33–54`).
- **LLM analysis pattern:** `_shared/azure-ai.ts` `chatCompletion(system, user, { tier })` — same stack as scorer and `agent-self-heal.ts` (whose `analyzeFailure` structure is the classifier+patch-proposer template).
- **Approval queue (zero new UI):** `agency_artifacts` table (`20260530000001_agency_kernel.sql:126+`) with type `prompt_revision`, lifecycle `draft → approved → shipped → reverted`, server-rendered plain-language diff (`content.client_diff = { before, after, why }`). API: `agency-client-approvals.ts`. UI: `src/pages/dashboard/client/ClientApprovalsPage.tsx` — one-tap approve/reject/defer.
- **Apply path with automatic safety net:** approved patch → `retell_prompt_versions` row → `retell-shadow-promote.ts` (backs up per-agent prompts into `rollback_data`, patches Retell LLM) → `retell-shadow-monitor.ts` evaluates book rate over 48h (min 15 calls, 5% relative-drop threshold) → auto-promote to `live` or auto-revert.
- **Owner notification:** Brevo email pattern in `daily-lead-summary.ts:17,142–148`; weekly cron pattern `agency-cron-benchmark-curation` (`0 4 * * 0` in `netlify.toml`).
- **Prompt update mechanics:** Retell LLM `general_prompt` patch + Supabase mirror to `agents.system_prompt` (`retell-agents.ts:1093–1155` `update_llm` action).

### Step 1 — `objection-miner.ts` (the one net-new file)

New scheduled function `netlify/functions/objection-miner.ts`, `schedule = "0 8 * * 1"` (Mondays) in `netlify.toml`. Auth via `authorizeRunner` (`_shared/agency-runner-auth`). Per user/workspace with ≥ N lost calls in the last 7 days:

1. Query `retell_calls` where `outcome IN ('no_outcome','hung_up')` and `started_at > now() - interval '7 days'`, join `retell_call_scores` (`dim = 'objection_handling'`, score < 0.6) for the pre-written notes.
2. One `chatCompletion({ tier: 'heavy' })` call per user: transcript snippets + objection notes in → JSON out: `[{ objection_pattern, frequency, example_quote, proposed_prompt_patch }]`. Structure copied from `agent-self-heal.ts` `analyzeFailure`.
3. Skip clusters below frequency threshold (≥2 occurrences). Skip users with an already-pending `prompt_revision` artifact (no queue spam).

**Verify:** seed 5 lost calls with a repeated price objection → run miner manually → exactly one cluster proposed with sane patch text.

### Step 2 — Persist proposals into the approval queue

Per cluster: insert `agency_artifacts` row, `type = 'prompt_revision'`, `status = 'draft'`, `content.client_diff = { before: <current prompt section>, after: <patched section>, why: "<N> callers this week objected: '<example_quote>'" }`, `predicted_impact`, `confidence`. Reuse existing insert shape from `agency-promote-experiment.ts`.

**Verify:** proposal appears in `ClientApprovalsPage` with readable before/after diff.

### Step 3 — Wire approve → shadow → auto-promote/revert

On approve (`agency-client-approvals.ts` POST): create `retell_prompt_versions` row with patched prompt, status `cekura_passed`, then call `retell-shadow-promote`. Monitor handles the rest (promote or revert) — zero new rollback code.

**Also fix while here:** `retell-shadow-monitor` has NO cron entry in `netlify.toml` (comment says "intended every 4h"). Add `schedule = "0 */4 * * *"`. Without this the whole shadow FSM silently never evaluates.

**Verify:** approve a proposal → Retell LLM `general_prompt` updated (check via API) → `rollback_data` populated → monitor run flips status after window.

### Step 4 — Weekly digest email

Extend the miner (or piggyback `daily-lead-summary` Monday run): Brevo email "Your agent hit these objections this week — 1 fix awaiting your approval" linking to the approvals page.

**Verify:** email delivered with correct counts and link.

### Files touched

`netlify/functions/objection-miner.ts` (new), `netlify/functions/agency-client-approvals.ts` (approve hook), `netlify.toml` (2 cron entries), 1 migration (idempotent `retell_prompt_versions` DDL). Zero new UI.

---

## Task 4 — Industry Prompt Library

### Current state (verified)

- `INDUSTRY_TEMPLATES` (EN, `generate-agent-prompt.ts:586+`) and `INDUSTRY_TEMPLATES_ES` (`:1811+`) — **17/17 templates with full ES parity** (paired by array index, `findIndustryTemplate` at `:2782`).
- **Rich (production-ready):** plumbing, HVAC, law, med spa, solar, roofing, pest control, electrical, cleaning, moving.
- **Thin (~15–20 lines, no objection handling):** dental, restaurant, real estate, medical(+vet), auto, fitness, accounting.
- **Missing entirely:** landscaping — despite being a UI picker option (falls back to generic receptionist).
- **Picker↔template mismatch:** `INDUSTRY_OPTIONS` (`src/lib/setup/onboarding.ts:3–17`) has 13 values; 7 rich templates (restaurant, medical, fitness, accounting, pest, electrical, moving) are **unreachable from the picker** — only match if users free-type a category.
- Language selection: `detectLanguage()` (`generate-agent-prompt.ts:80–95`) — explicit `req.language`, else country whitelist (19 ES countries), else `languages` field substring.
- `ServicesTable.tsx` / Quick Add presets **do not exist in the main tree** (skill doc stale — worktree-only file). `/start` gets services from website scraping; no preset UI to wire. **Preset work is out of scope for this batch.**

### Step 1 — Fix picker↔template alignment (30 min, do first)

1. Extend `INDUSTRY_OPTIONS` in `src/lib/setup/onboarding.ts` to include the 7 orphaned rich verticals: pest_control, electrical, cleaning, moving, restaurant, fitness, accounting (medical already reachable via vet).
2. Verify each new option value matches at least one `matchCategories` entry (e.g. `pest_control` → template matches `pest`; normalize underscores in the match check if needed).

**Verify:** unit check — for every `INDUSTRY_OPTIONS` value, `findIndustryTemplate(value)` returns a non-generic template (this check also catches step 2/3 regressions).

### Step 2 — Write landscaping template (UI option with no template = live bug)

Full EN + ES per the `boltcall-industry-prompt` skill checklist (worked example already exists in the skill, section 9). `matchCategories: ['landscap', 'lawn', 'garden', 'tree service', 'sod', 'irrigation', 'hardscap']`.

**Verify:** `mainCategory: 'landscaping'` → landscaping agentRole in generated prompt, both languages.

### Step 3 — Enrich the 7 thin templates

Bring dental, restaurant, real estate, medical, auto, fitness, accounting up to roofing-level quality (the reference rich template, `:1278–1382`). Per skill section 4 anatomy, each gets:
- Emergency/urgency triage first (where applicable: dental pain, medical, auto breakdown)
- 5–8 verbatim objection scripts
- Seasonal/situational awareness
- Compliance rules (HIPAA for dental/medical, fiduciary for accounting)
- Progressive data-collection checklist
- Matching ES rewrite (translated, not word-for-word; usted for formal verticals)

Parallelize: one subagent per vertical, each producing EN+ES pair; review against skill section 12 quality checklist before merge.

**Verify:** each enriched template passes the skill's 14-point checklist; array index parity EN↔ES preserved (parity test comparing array lengths + matchCategories equality).

### Step 4 — New verticals from the original 20-target list

Not yet covered anywhere: **locksmith, garage door, chiropractor, painter, pool service, towing** (plus childcare, insurance from skill priority list — defer). Six new EN+ES template pairs, same subagent-per-vertical pattern. Add each to `INDUSTRY_OPTIONS`.

Priority order (emergency-driven verticals first — speed-to-lead value highest): towing → locksmith → garage door → pool → painter → chiro.

**Verify:** same parity + matching tests; total 24 verticals reachable from picker.

### Step 5 — Regression guard

One test file: for each template — matchCategories non-colliding (no earlier template shadows a later one), EN/ES array parity, every `INDUSTRY_OPTIONS` value resolves to a template. Prevents the landscaping-style silent fallback from recurring.

### Files touched

`netlify/functions/generate-agent-prompt.ts` (large content additions), `src/lib/setup/onboarding.ts`, 1 test file. No schema changes.

---

## Task 6 — Agent A/B Testing

### Current state (verified)

**Time-split testing already exists** (shadow rollout), concurrent traffic-split does not:

- `retell_prompt_versions` FSM: `benchmark_passed → cekura_passed → shadowing → live | reverted | superseded`. Columns include `prompt_text`, `shadow_agent_ids`, `shadow_book_rate`, `rollback_data` (per-agent prompt backups).
- `retell-shadow-promote.ts` — patches every Retell agent for a vertical, stores rollback.
- `retell-shadow-monitor.ts` — book-rate evaluation: `booked / (booked + no_outcome + hung_up)`, threshold baseline×0.95, min 15 calls, 48h window; auto-promote/revert. **Not scheduled** (fixed in Task 10 step 3).
- Per-call version stamping: `retell_calls.prompt_version_id` (`retell-call-scorer.ts:198–214`).
- Retell `metadata` passthrough works end-to-end (`createWebCall` at `retell-agents.ts:955–958`; webhook reads `call.metadata` at `retell-webhook.ts:164`; scorer honors it).
- `shadow_split_pct` stored in `agency-promote-experiment.ts:362–370` but **enforced nowhere** — promote always swaps 100%.

**Gaps:**
1. Booking attribution is a heuristic — `retell_calls.outcome = 'booked'` is Retell's LLM guess from transcript, not a confirmed Cal.com booking. `appointments` has no `call_id` (only `agent-tools.ts:572–584` stashes it in `raw_webhook` jsonb).
2. No per-call variant assignment (Retell has no per-call prompt override — needs two agent IDs + routing).
3. No self-serve UI — the whole FSM is agency/founder-side.

### Step 1 — Confirmed-booking attribution (foundation, also improves shadow monitor)

1. Migration: add `call_id text` (nullable) to `appointments`. (Batch 1 Task 3 migration already touches this table — coordinate: one migration if batches run together.)
2. Populate: `agent-tools.ts` booking path promotes `call_id` from jsonb to the column; Cal.com path (`appointment-handler.ts`) back-fills by joining `retell_calls` on `client_phone` + time window (booking within 24h of a call from same number) — best-effort, nullable.
3. Upgrade `retell-shadow-monitor` book-rate to prefer confirmed bookings (`appointments.call_id join`) with transcript-heuristic fallback when sparse.

**Verify:** agent-tool booking → `appointments.call_id` set; Cal.com booking after a call from same phone → back-filled; monitor query returns both.

### Step 2 — Per-call traffic split (true A/B)

Lazy path — variant = second Retell agent, split at entry points:

1. `variants` concept on `retell_prompt_versions`: new status `ab_testing`; `rollback_data.experiment.shadow_split_pct` finally enforced.
2. Create variant agent: clone via existing `create_full`/`client.agent.create` machinery with variant prompt, tag `metadata.variant_of = <base_agent_id>`, `metadata.prompt_version_id = <version>`. Excluded from user's agent list UI (filter on metadata).
3. Routing:
   - **Web calls:** in `create_web_call` (`retell-agents.ts:948–967`) — hash or random split by `shadow_split_pct`, pass `prompt_version_id` in call metadata.
   - **Phone calls:** Retell number routes to one `inbound_agent_id` — per-call split on the same number requires Retell inbound webhook agent-override if supported (check Retell docs at build time); fallback: keep time-split (shadow) for phone, true split for web. `// ponytail: phone = time-split, web = true split; revisit if Retell adds per-call agent override`.
4. Scorer persists `metadata.prompt_version_id` → `retell_calls.prompt_version_id` per call (one-line addition at `retell-call-scorer.ts:198`).

**Verify:** 20 simulated web calls at 50/50 split → both version IDs appear on `retell_calls` roughly evenly; booking attribution per version correct.

### Step 3 — Promote-winner job

Extend `retell-shadow-monitor.ts` (or sibling `ab-monitor`): for `ab_testing` versions past window with min-call threshold per arm, compare confirmed book rates; winner → `live` (loser agent deleted via existing rollback pattern from `retell-shadow-monitor.ts:150–162`), inconclusive → extend window once, then retire. Weekly cadence.

**Verify:** seeded outcomes where variant B books 2x → B promoted, A's variant agent deleted, base agent patched to B's prompt.

### Step 4 — Owner-facing surface (minimal)

One card on `AgentDetailPage.tsx`: current experiment status — "Testing new script: 54 calls, variant booking 31% vs 24%" + history of past experiments (query `retell_prompt_versions` by agent). No experiment-creation UI — experiments come from the objection-mining loop (Task 10) and founder-side. `// ponytail: read-only card; creation UI when users ask for it`.

**Verify:** card renders live experiment numbers; empty state hidden.

### Files touched

`netlify/functions/retell-shadow-monitor.ts`, `retell-shadow-promote.ts`, `retell-agents.ts`, `retell-call-scorer.ts`, `appointment-handler.ts`, `agent-tools.ts`, `src/pages/dashboard/AgentDetailPage.tsx`, `netlify.toml`, 1–2 migrations.

---

## Dependencies & sequencing

```
Schema reconciliation (retell_prompt_versions DDL)
  → Task 10 (objection miner)         [independent after schema]
  → Task 4  (prompt library)          [fully independent — pure content]
  → Task 6 step 1 (attribution)       [shares appointments migration with batch-1 task 3]
      → Task 6 steps 2–4
Task 10 step 3 fixes shadow-monitor cron → prerequisite for Task 6 step 3.
```

Task 4 can run entirely in parallel with 10/6 (different files, subagent-friendly).

## Cross-cutting rules

- Every item: own worktree branch, auto-commit, merge on command, deploy only when asked.
- All prompt-content work (Task 4) goes through the `boltcall-industry-prompt` skill checklist — no template ships without the 14-point pass.
- Migrations: verify against live schema first (`retell_prompt_versions` and `appointments` both have drift risk).
- LLM analysis jobs use `_shared/azure-ai.ts` `chatCompletion` — no new AI SDK dependencies.
