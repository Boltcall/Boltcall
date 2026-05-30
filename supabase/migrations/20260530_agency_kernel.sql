-- ═══════════════════════════════════════════════════════════════════════════
-- Agency OS Kernel Migration — Layer 1 substrate
-- ═══════════════════════════════════════════════════════════════════════════
--
-- What this migration does:
--   Creates the kernel tables for the Boltcall Agency OS (per plan
--   `i-ahev-so-much-steady-frog.md`, Layer 1 — Kernel). Every other layer of
--   the OS (orchestration, agents, adapters, knowledge, HITL queue,
--   observability, self-improvement loops) operates on this state.
--
--   Tables created (7 total):
--     1. agency_clients               — one row per agency engagement
--     2. agency_artifacts             — every AI-generated artifact, pending or shipped
--     3. agency_events                — internal event bus (mirror of aios_event_log)
--     4. agency_intake_calls          — Retell intake recordings + extracted profiles
--     5. agency_knowledge             — per-client vector-embedded KB chunks
--     6. agency_artifact_baselines    — per (type, vertical) perf baselines for the
--                                       post-ship critic + auto-revert workflow
--     7. agency_digital_twin_personas — per-client Cekura persona library powering
--                                       the killer "simulated-client digital twin"
--                                       feature (rehearses prompt changes against
--                                       50–200 personas distilled from real calls)
--
-- AI-native columns (cross-cutting features from the audit):
--   - confidence + reasoning_trace + retrieved_context + alternatives_rejected
--     + adversarial_review + client_facing_note + predicted_impact on artifacts
--   - parent_artifact_id (self-ref) for revert audit trail
--   - ship_window_ends_at for the post-ship watcher cron
--   - why_explanation on events (async backfill, warn+ severities only)
--   - churn_risk + churn_risk_drivers on clients
--   - source_artifact_id on knowledge (provenance back to the artifact)
--
-- When applied:
--   2026-05-30 — first migration in the Agency OS series.
--
-- Paired RLS migration:
--   `supabase/migrations/20260530_agency_kernel_rls.sql` (separate file)
--   defines the founder/client RLS policies, the `is_founder()` helper, the
--   `force row level security` enforcement, and the supporting indexes for
--   RLS performance. Apply IMMEDIATELY after this file — these tables are
--   created RLS-disabled and the data model is unsafe until the RLS migration
--   has run.
--
-- RLS isolation test:
--   `supabase/tests/agency_rls_test.sql` (run via `supabase db test`) — two
--   simulated tenants, asserts client A can never read client B's rows.
--
-- Conventions match `20260325_team_rbac_workspace.sql` (snake_case tables,
-- `id uuid primary key default gen_random_uuid()`, `timestamptz default now()`,
-- `create index if not exists`, foreign keys with `on delete cascade` where
-- the child row is meaningless without the parent).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 0. Extensions ─────────────────────────────────────────────────────────
-- pgvector is required for agency_knowledge.embedding and the digital-twin
-- persona embeddings. Idempotent — no-op if already enabled.

CREATE EXTENSION IF NOT EXISTS vector;


-- ─── 1. agency_clients ─────────────────────────────────────────────────────
-- One row per agency engagement. `user_id` is the client's Boltcall auth
-- account; `founder_id` is the operator account that owns the engagement
-- (forward-compat for first hire — see RLS migration for how is_founder()
-- handles the multi-founder path).

CREATE TABLE IF NOT EXISTS agency_clients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  founder_id          uuid NOT NULL,
  status              text NOT NULL CHECK (status IN (
                        'pending_intake','intake_scheduled','intake_done',
                        'building','live','paused','churned'
                      )),
  sku                 text NOT NULL,
  mrr                 integer NOT NULL,
  ad_spend_min        integer,
  vertical            text,
  business_name       text,
  business_phone      text,
  business_website    text,
  region              text,
  timezone            text,

  -- Churn-sentinel signal. Updated daily by the `daily-churn-scan` workflow.
  -- 'green' = healthy, 'yellow' = degraded signal, 'red' = save-call needed.
  -- Surfaced in Atlas morning briefing and the per-client dashboard header.
  churn_risk          text NOT NULL DEFAULT 'green'
                        CHECK (churn_risk IN ('green','yellow','red')),

  -- Free-form list of why churn_risk is non-green (e.g. ARRAY['booking_rate_-22%','login_gap_14d']).
  -- Empty array when churn_risk = 'green'. Feeds the save-call draft prompt.
  churn_risk_drivers  text[] NOT NULL DEFAULT ARRAY[]::text[],

  signed_up_at        timestamptz NOT NULL DEFAULT now(),
  intake_done_at      timestamptz,
  live_at             timestamptz,
  churned_at          timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN agency_clients.founder_id IS
  'Operator (Boltcall founder/staff) who owns this engagement. Indexed for RLS lookup; required NOT NULL so is_founder() check is unambiguous.';
COMMENT ON COLUMN agency_clients.mrr IS
  'Monthly recurring revenue in CENTS (integer). Stored cents, not dollars, to match Stripe convention and avoid float drift.';
COMMENT ON COLUMN agency_clients.ad_spend_min IS
  'Minimum monthly ad spend (cents) required by the SKU. NULL for SKUs without an ad-spend floor (e.g. SaaS-only).';
COMMENT ON COLUMN agency_clients.churn_risk IS
  'Daily-updated three-tier risk signal. Driven by churn-sentinel agent. NULL not allowed — defaults to green for newly-onboarded clients.';
COMMENT ON COLUMN agency_clients.churn_risk_drivers IS
  'Human-readable reason codes explaining the current churn_risk. Replaced (not appended) on each daily scan to avoid stale drivers.';


-- ─── 2. agency_artifacts ───────────────────────────────────────────────────
-- The kernel's central work table. Every AI-generated artifact lands here
-- with status='draft' (post-adversarial-critic), is reviewed via the HITL
-- queue, and progresses through approved → shipped → (optionally) reverted.
--
-- Every artifact carries its epistemic context (confidence, reasoning,
-- retrieved chunks, rejected alternatives, adversarial review) so the
-- founder can approve in ~5s without opening the source.

CREATE TABLE IF NOT EXISTS agency_artifacts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,

  -- Artifact type. Extended beyond plan v5 to cover the AI-native artifacts:
  --   'digital_twin_seed'  — a persona-pack proposal for the twin fleet
  --   'experiment_plan'    — a causal optimization brief A/B-test plan
  --   'expansion_pitch'    — per-prospect simulated-value outreach package
  type                    text NOT NULL CHECK (type IN (
                            'agent_prompt','knowledge_base','ad_creative','ad_copy',
                            'weekly_report','optimization_brief','prompt_revision',
                            'client_outreach','escalation_action',
                            'digital_twin_seed','experiment_plan','expansion_pitch'
                          )),

  -- Lifecycle. 'reverted' is new vs plan v5 — set by the post-ship critic
  -- when an auto-revert fires. The reverting artifact uses parent_artifact_id
  -- to point at what it replaced, preserving the audit trail.
  status                  text NOT NULL DEFAULT 'draft' CHECK (status IN (
                            'draft','approved','shipped','rejected','deferred','reverted'
                          )),

  generated_by            text NOT NULL,                  -- agent name, e.g. 'creative-foundry'
  model                   text,                            -- e.g. 'claude-sonnet-4-6', 'claude-opus-4-7'
  content                 jsonb NOT NULL,                  -- type-specific payload (validated by output-schema.json)
  preview_url             text,                            -- e.g. signed URL to rendered PDF/image
  ship_target             text,                            -- 'retell_agent' | 'meta_ads' | 'client_email' | 'slack' | ...

  -- Result of shipping. SECURITY: adapters MUST whitelist fields written here
  -- — never JSON.stringify(apiResponse). Meta access_token echoes and Stripe
  -- secrets have leaked through error paths historically. See the paired RLS
  -- migration for the trigger that rejects ship_result containing secret-token
  -- prefixes (sk_, pk_, EAA, secret_).
  ship_result             jsonb,

  cost_usd                numeric(10,4),                   -- token + image-gen cost for this artifact
  latency_ms              integer,                         -- total generation time
  eval_score              numeric(3,2),                    -- 0-10 BENCHMARK score, NULL until benchmarked

  -- ── AI-native columns (cross-cutting features) ────────────────────────

  -- 0.0–1.0. Self-reported confidence from the generating agent. Used by
  -- the queue's predicted-impact ranking and by auto-apply thresholds.
  confidence              numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Exactly 3 short bullets, in the agent's own words, explaining WHY this
  -- choice was made. Surfaced as the queue's "reasoning" drawer. Constraint
  -- enforces the 3-item shape so the UI never has to handle other lengths.
  reasoning_trace         text[] CHECK (reasoning_trace IS NULL OR array_length(reasoning_trace, 1) = 3),

  -- Top-k (typically 3) knowledge chunks the agent used. Shape:
  --   [{"knowledge_id":"...", "kind":"service", "snippet":"...", "score":0.87}, ...]
  -- Renderable in the queue so the founder sees what the agent actually read.
  retrieved_context       jsonb,

  -- Alternatives the agent considered and rejected. Shape:
  --   [{"option":"...", "why_rejected":"..."}, ...]
  -- Often the cheapest review signal — if rejected options look better than
  -- the chosen one, the prompt is broken.
  alternatives_rejected   jsonb,

  -- Output of the adversarial-critic stage (mandatory pre-queue). Shape:
  --   {"critic_model":"...","findings":[{"severity":"...","note":"..."}],"agent_response":"..."}
  -- Founder sees agent + critic side-by-side in the queue.
  adversarial_review      jsonb,

  -- 2-sentence "what changed and why" in the client's brand voice. Set only
  -- for artifacts that ship to the client (report, creative, optimization
  -- brief, save-call outreach). NULL for internal-only artifacts.
  client_facing_note      text,

  -- Self-reference for revert audit trail. When the post-ship critic
  -- auto-reverts a shipped artifact, the reverting artifact's parent_artifact_id
  -- points at what it replaced. Enables walking the full lineage of a single
  -- prompt across N revisions and reverts.
  parent_artifact_id      uuid REFERENCES agency_artifacts(id) ON DELETE SET NULL,

  -- Predicted real-world impact + confidence interval + base rate. Shape:
  --   {"metric":"booking_rate", "prediction":0.34, "ci_low":0.28, "ci_high":0.40,
  --    "base_rate":0.27, "horizon_hours":72}
  -- Drives the queue's predicted-impact-first ranking. Compared against
  -- realized outcome by the post-ship critic for calibration tracking.
  predicted_impact        jsonb,

  -- When the post-ship critic stops watching this artifact. Set when status
  -- transitions to 'shipped'. The `shipped_artifact_watcher` cron polls
  -- WHERE shipped_at IS NOT NULL AND ship_window_ends_at > now().
  -- Typical: creatives 72h, prompts ~50 calls, reports 7d.
  ship_window_ends_at     timestamptz,

  created_at              timestamptz NOT NULL DEFAULT now(),
  reviewed_at             timestamptz,
  shipped_at              timestamptz
);

COMMENT ON COLUMN agency_artifacts.content IS
  'Type-specific payload. Shape is enforced upstream by output-schema.json validated in the run-agent.ts harness; this column trusts that contract.';
COMMENT ON COLUMN agency_artifacts.ship_result IS
  'WHITELISTED fields only — never raw API response. Adapter is responsible for scrubbing. Paired RLS migration adds a trigger that rejects rows where ship_result text contains secret-token prefixes.';
COMMENT ON COLUMN agency_artifacts.confidence IS
  'Agent self-reported 0–1. Used by HITL queue auto-apply threshold and predicted-impact ranking. Calibration is tracked over time vs eval_score and realized outcomes.';
COMMENT ON COLUMN agency_artifacts.reasoning_trace IS
  'Exactly 3 bullets, no more, no less. The 3-item constraint is the contract the queue UI depends on — if you need more nuance, expand a bullet, do not add a fourth.';
COMMENT ON COLUMN agency_artifacts.parent_artifact_id IS
  'Self-FK for revert audit trail. NOT for revisions of the same prompt (use a new row with same client_id+type) — only for explicit replacements made by the post-ship critic or a loop-monitor revert.';
COMMENT ON COLUMN agency_artifacts.predicted_impact IS
  'Prediction + 80% CI + base_rate. Compared against measured outcome by the post-ship critic. Persistent miscalibration in either direction triggers an agent-prompt rewrite proposal.';
COMMENT ON COLUMN agency_artifacts.ship_window_ends_at IS
  'After this timestamp the post-ship watcher stops polling this artifact. Set ONLY on transition to shipped. NULL on draft/approved/rejected/reverted rows.';


-- ─── 3. agency_events ──────────────────────────────────────────────────────
-- The OS's syslog. Every agent + adapter call emits a row here via the
-- `emit-agency-event` helper, which also mirrors warn+ rows to
-- `aios_event_log` so the global loop-monitor can see agency activity.

CREATE TABLE IF NOT EXISTS agency_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES agency_clients(id) ON DELETE CASCADE,
  agent_name      text,                                      -- e.g. 'creative-foundry', 'retell', 'meta-ads'
  type            text NOT NULL,                             -- 'call_completed','lead_captured','ad_spend','anomaly_detected', ...
  severity        text NOT NULL DEFAULT 'info' CHECK (severity IN (
                    'debug','info','warn','error','critical'
                  )),

  -- IMPORTANT: emit-agency-event helper enforces a per-type Zod schema and
  -- rejects unknown fields — never pass `{...rawApiResponse}` here. For the
  -- client-facing surface, read from the SECURITY DEFINER view
  -- `agency_events_client_view` (defined in the RLS migration) rather than
  -- this table directly; the view projects only allowlisted fields per type.
  payload         jsonb,

  -- Plain-English "why this happened" sentence, generated asynchronously
  -- by a Haiku call that RAGs over the last 50 related events. ONLY
  -- populated for severity in ('warn','error','critical') — info/debug
  -- rows leave this NULL to contain cost. Rendered as the headline in the
  -- Atlas morning briefing and per-client dashboard; the raw `payload`
  -- shows below it for the curious.
  why_explanation text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN agency_events.payload IS
  'Allowlisted, per-type schema. NEVER spread raw API responses into this column — see emit-agency-event.ts enforcement. Use the agency_events_client_view for any client-facing query.';
COMMENT ON COLUMN agency_events.why_explanation IS
  'Async backfilled by Netlify post-insert function, warn/error/critical only. Cached so re-reads do not re-generate. NULL is the normal state for info/debug rows — UI should not regenerate on read.';


-- ─── 4. agency_intake_calls ────────────────────────────────────────────────
-- Retell intake recordings + structured business profiles extracted from
-- the transcript.
--
-- SECURITY: This table contains regulated PII (caller names, phone numbers
-- spoken aloud, addresses, medical/legal disclosures, possibly PCI readback).
-- HIPAA-adjacent for med-spa clients, GLBA-adjacent for legal/HVAC.
--
-- Required hardening (handled outside this migration):
--   (a) `transcript` column encrypted via pgsodium / Supabase Vault
--   (b) `recording_url` points to a Supabase Storage bucket with object-level
--       RLS; only signed URLs (5-min expiry) ever leave the backend
--   (c) Daily cron HARD-deletes transcripts older than retention policy
--   (d) `extracted_profile` JSON MUST NOT contain raw caller phone numbers
--       — the extraction prompt strips them
--   (e) Boltcall ToS includes a DPA before the first agency client signs

CREATE TABLE IF NOT EXISTS agency_intake_calls (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  recording_url       text,                                 -- Storage path, NOT a public URL
  transcript          text,                                 -- ENCRYPT at rest via pgsodium (see migration notes)
  duration_sec        integer,
  extracted_profile   jsonb,                                -- structured business data (no raw PII)
  extraction_score    numeric(3,2),                         -- agent confidence in the extraction (0–1)
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN agency_intake_calls.transcript IS
  'PII-bearing. Enable pgsodium column encryption before first agency client lands. The RLS migration denies all client SELECT on this table (founder-only); even so, defense in depth via encryption is required for backup/PITR safety.';
COMMENT ON COLUMN agency_intake_calls.recording_url IS
  'Supabase Storage path. NEVER a public URL — clients should only ever see a short-lived signed URL generated server-side. Do not embed in artifact JSON.';
COMMENT ON COLUMN agency_intake_calls.extracted_profile IS
  'Structured business data: services, hours, pricing, qualifying questions. The extraction prompt is responsible for stripping raw phone numbers and addresses — this JSON is treated as non-PII downstream.';


-- ─── 5. agency_knowledge ───────────────────────────────────────────────────
-- Per-client knowledge base — vector-embedded for semantic retrieval by
-- every agent that generates client-specific output.
--
-- SECURITY (vector cross-tenant leak — highest priority concern):
--   pgvector similarity (`embedding <-> $1 ORDER BY 1 LIMIT k`) interacts
--   badly with RLS. The HNSW index can traverse rows from other tenants
--   before the RLS USING clause filters them — even though those rows are
--   not returned, the ORDER BY ranking sees them (timing side channel) AND
--   if a developer ever bypasses RLS for retrieval performance, cross-tenant
--   leakage is possible. Mitigations:
--     (a) NEVER expose vector similarity to a client JWT — only founder /
--         service-role calls `retrieve()`.
--     (b) Always include `WHERE client_id = $tenant_id` BEFORE the ORDER BY
--         in the retrieval SQL — even though RLS would also enforce it.
--         Belt + suspenders, and the planner will use the partial-index
--         path. This is enforced in netlify/lib/knowledge/retrieve.ts.
--     (c) Once any client crosses ~10k chunks, migrate to PARTIAL HNSW
--         indexes per high-volume client (see commented-out index pattern
--         below). At N>50 clients or any client crossing 100k chunks,
--         partition this table BY LIST(client_id) — the schema is designed
--         to allow that conversion without rewriting consumers.
--     (d) A regression test asserts a similarity query under a non-founder
--         JWT returns zero cross-tenant rows.

CREATE TABLE IF NOT EXISTS agency_knowledge (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  kind                text NOT NULL,                        -- 'service' | 'faq' | 'policy' | 'case_study' | 'call_pattern'
  content             jsonb NOT NULL,
  embedding           vector(1536),                          -- OpenAI text-embedding-3-small or compatible

  -- Provenance — optional pointer to the artifact that contributed this
  -- knowledge chunk (e.g. a 'knowledge_base' artifact generated by
  -- agent-architect, or a 'call_pattern' surfaced by qa-auditor). Enables
  -- "where did this come from?" walks from any retrieved chunk.
  source_artifact_id  uuid REFERENCES agency_artifacts(id) ON DELETE SET NULL,

  version             integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN agency_knowledge.embedding IS
  '1536-dim vector. Retrieval MUST pre-filter on client_id before ORDER BY — see file header. HNSW index below; switch to per-client partial indexes once any tenant crosses 10k chunks.';
COMMENT ON COLUMN agency_knowledge.source_artifact_id IS
  'Provenance link. NULL for chunks seeded directly from intake. ON DELETE SET NULL — losing the source artifact does not invalidate the knowledge itself.';
COMMENT ON COLUMN agency_knowledge.version IS
  'Monotonic per-client. New version of an existing chunk = new row with version+1, NOT an UPDATE. Old versions retained for audit until retention policy prunes.';


-- ─── 6. agency_artifact_baselines ──────────────────────────────────────────
-- Per (type, vertical) performance baselines for the post-ship critic.
-- When a shipped artifact's realized outcome falls into the bottom 10% of
-- the baseline distribution for its type+vertical, the post-ship critic
-- agent fires and proposes (auto-revert | hold | iterate).
--
-- One row per (type, vertical, metric). Updated nightly by a rollup job
-- from realized outcomes captured on agency_artifacts and agency_events.

CREATE TABLE IF NOT EXISTS agency_artifact_baselines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type       text NOT NULL,                        -- mirrors agency_artifacts.type domain
  vertical            text NOT NULL,                        -- mirrors agency_clients.vertical domain
  metric              text NOT NULL,                        -- 'cpl_usd' | 'booking_rate' | 'qa_score' | 'open_rate' | ...

  -- Distribution snapshot. Recomputed on a rolling window (typically 90d).
  sample_size         integer NOT NULL,
  median              numeric(12,4) NOT NULL,
  p10                 numeric(12,4) NOT NULL,                -- bottom-10% threshold — the revert trigger
  p25                 numeric(12,4) NOT NULL,
  p75                 numeric(12,4) NOT NULL,
  p90                 numeric(12,4) NOT NULL,

  -- Direction of "better". 'higher' for booking_rate/qa_score, 'lower' for cpl_usd/latency.
  better_when         text NOT NULL CHECK (better_when IN ('higher','lower')),

  -- Window the baseline was computed over.
  computed_over_start timestamptz NOT NULL,
  computed_over_end   timestamptz NOT NULL,

  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (artifact_type, vertical, metric)
);

COMMENT ON COLUMN agency_artifact_baselines.p10 IS
  'Bottom-10% threshold. The post-ship critic fires when a shipped artifact''s realized metric crosses this (in the wrong direction per better_when). This column is load-bearing — do not rename without updating the critic.';
COMMENT ON COLUMN agency_artifact_baselines.better_when IS
  'Resolves the direction ambiguity per metric. higher = bigger numbers are good (booking_rate, qa_score). lower = smaller numbers are good (cpl_usd, latency_ms). The critic uses this to know which tail counts as bottom-10%.';


-- ─── 7. agency_digital_twin_personas ───────────────────────────────────────
-- Per-client Cekura persona library. Powers killer feature #1: every prompt
-- change, KB edit, voice change, or transfer rule is rehearsed against the
-- twin fleet BEFORE it touches a real caller.
--
-- Personas are auto-generated from the client's last 90 days of actual call
-- transcripts (preserving objection patterns, accent profiles, demographic
-- mix, time-of-day distribution) and continuously refreshed as new
-- transcripts come in. Typical fleet size: 50–200 personas per client.

CREATE TABLE IF NOT EXISTS agency_digital_twin_personas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,

  -- Stable handle within the fleet (e.g. 'persona_med_spa_skeptical_43'). Used in
  -- simulation result reports + the client-facing twin browser. Unique per client
  -- so simulation logs can dedupe.
  persona_key         text NOT NULL,

  -- The Cekura persona definition. Shape (indicative):
  --   { "demographic": {...}, "voice_profile": {...}, "objection_patterns": [...],
  --     "questions_asked": [...], "scenario": "...", "speech_quirks": [...] }
  persona             jsonb NOT NULL,

  -- Demographic / objection / accent dimensions exposed as queryable scalars
  -- so the simulation harness can stratify-sample a representative subset
  -- without pulling the full JSONB.
  demographic_tag     text,                                  -- 'urban-female-30s' | 'rural-male-50s' | ...
  objection_tag       text,                                  -- 'price-sensitive' | 'compares-competitors' | 'time-pressured' | ...
  difficulty          text NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy','normal','hard','adversarial')),

  -- Provenance — which transcripts seeded this persona. Array of intake call
  -- IDs or event IDs. Used for "show me the real calls behind this persona"
  -- drill-down in the founder UI.
  seeded_from         jsonb,

  -- Voice signature embedding for "is this a near-duplicate of an existing
  -- persona?" dedup at generation time. NULL until the embedding step runs.
  voice_embedding     vector(1536),

  -- Lifecycle. Personas are refreshed periodically; old ones marked retired
  -- rather than deleted so historical simulation results remain reproducible.
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired','draft')),

  -- Refresh tracking.
  generated_at        timestamptz NOT NULL DEFAULT now(),
  retired_at          timestamptz,

  -- Rolling simulation stats updated by the simulation harness.
  last_simulated_at   timestamptz,
  simulation_count    integer NOT NULL DEFAULT 0,

  UNIQUE (client_id, persona_key)
);

COMMENT ON TABLE agency_digital_twin_personas IS
  'Per-client Cekura persona library — rehearsal substrate for every prompt change. Also exposed in the client external dashboard as proof-of-quality: "this is what your agent would do for these 200 scenarios from your business."';
COMMENT ON COLUMN agency_digital_twin_personas.persona_key IS
  'Stable per-client handle. Reuse the same key when refreshing a persona conceptually (same demographic + objection) so simulation history stays connected; mint a new key for genuinely new personas.';
COMMENT ON COLUMN agency_digital_twin_personas.voice_embedding IS
  'Used at persona-generation time to dedup against existing personas in the same fleet. NOT used for retrieval — there is no semantic-search workflow on personas, so no HNSW index is created on this column.';
COMMENT ON COLUMN agency_digital_twin_personas.status IS
  'retired personas are kept for reproducibility of past simulation results. Never DELETE — set retired_at + status=''retired''.';


-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════
-- These are MANDATORY for both query performance and RLS performance. Every
-- child-table RLS policy joins back to agency_clients via EXISTS; without
-- the user_id index, a 10k-event dashboard query becomes O(10k * N).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── RLS supporting indexes (per audit lines 605–610) ─────────────────────

CREATE INDEX IF NOT EXISTS idx_agency_clients_user_id
  ON agency_clients(user_id);

CREATE INDEX IF NOT EXISTS idx_agency_clients_founder_id
  ON agency_clients(founder_id);

CREATE INDEX IF NOT EXISTS idx_agency_artifacts_client_status
  ON agency_artifacts(client_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_events_client_type
  ON agency_events(client_id, type, severity);

CREATE INDEX IF NOT EXISTS idx_agency_intake_calls_client
  ON agency_intake_calls(client_id);

CREATE INDEX IF NOT EXISTS idx_agency_knowledge_client
  ON agency_knowledge(client_id);

-- ─── Vector index ─────────────────────────────────────────────────────────
-- Single global HNSW index for now. Retrieval code is REQUIRED to include
-- `WHERE client_id = $tenant_id` BEFORE the ORDER BY (see netlify/lib/
-- knowledge/retrieve.ts) — the planner uses an index-then-filter plan which
-- contains cross-tenant exposure to the timing side channel only.
--
-- MIGRATION STRATEGY when scale demands it:
--   Stage 1 (now, <50 clients, any client <10k chunks): single global HNSW.
--   Stage 2 (any client crosses 10k chunks): add a PARTIAL HNSW for that
--     specific high-volume client:
--       CREATE INDEX idx_agency_knowledge_embedding_client_XXX
--         ON agency_knowledge USING hnsw (embedding vector_cosine_ops)
--         WHERE client_id = '<uuid>';
--     The planner picks the partial index for that client's queries and the
--     global index for everyone else. Repeat per high-volume client.
--   Stage 3 (N > 50 clients OR any client > 100k chunks): partition
--     agency_knowledge BY LIST (client_id). Each partition gets its own
--     HNSW. RLS policies remain unchanged. The retrieve.ts contract
--     (pre-filter on client_id) means consumers do not change.

CREATE INDEX IF NOT EXISTS idx_agency_knowledge_embedding
  ON agency_knowledge
  USING hnsw (embedding vector_cosine_ops);

-- ─── Operational indexes for the HITL queue + dashboards ──────────────────

-- Queue page: pending artifacts sorted oldest-first within each client.
CREATE INDEX IF NOT EXISTS idx_agency_artifacts_pending
  ON agency_artifacts(client_id, created_at)
  WHERE status = 'draft';

-- Post-ship watcher cron: shipped artifacts still inside their watch window.
CREATE INDEX IF NOT EXISTS idx_agency_artifacts_shipped_watch
  ON agency_artifacts(ship_window_ends_at)
  WHERE status = 'shipped' AND ship_window_ends_at IS NOT NULL;

-- Revert audit walks (parent_artifact_id chains).
CREATE INDEX IF NOT EXISTS idx_agency_artifacts_parent
  ON agency_artifacts(parent_artifact_id)
  WHERE parent_artifact_id IS NOT NULL;

-- Per-client dashboard: most-recent events first.
CREATE INDEX IF NOT EXISTS idx_agency_events_client_created
  ON agency_events(client_id, created_at DESC);

-- Atlas morning briefing + alert routing: warn+ events for the day.
CREATE INDEX IF NOT EXISTS idx_agency_events_severity_created
  ON agency_events(severity, created_at DESC)
  WHERE severity IN ('warn','error','critical');

-- Churn-sentinel daily scan + briefing red-tier surfacing.
CREATE INDEX IF NOT EXISTS idx_agency_clients_churn_risk
  ON agency_clients(churn_risk)
  WHERE churn_risk IN ('yellow','red');

-- Baseline lookup by the post-ship critic.
CREATE INDEX IF NOT EXISTS idx_agency_artifact_baselines_lookup
  ON agency_artifact_baselines(artifact_type, vertical, metric);

-- Digital-twin simulation harness: active personas per client, stratified
-- sampling by difficulty/demographic.
CREATE INDEX IF NOT EXISTS idx_agency_digital_twin_personas_active
  ON agency_digital_twin_personas(client_id, difficulty, demographic_tag)
  WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════
-- END Agency OS Kernel Migration
--
-- Next step: apply the paired RLS migration
--   `supabase/migrations/20260530_agency_kernel_rls.sql`
-- which enables RLS, defines the founder/client policies, sets up the
-- is_founder() helper, forces RLS on all tables, and adds the
-- agency_events_client_view + ship_result secret-token guard trigger.
-- ═══════════════════════════════════════════════════════════════════════════
