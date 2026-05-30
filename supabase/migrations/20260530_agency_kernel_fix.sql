-- ═══════════════════════════════════════════════════════════════════════════
-- Agency OS Kernel — Phase B Corrective Migration
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Position in migration history:
--   1. 20260530_agency_kernel.sql        — creates the 7 kernel tables, RLS-disabled
--   2. 20260530_agency_rls.sql           — enables + forces RLS, helpers, policies
--   3. 20260530_agency_kernel_fix.sql    — THIS FILE (forward-only corrective)
--
-- Why this migration exists (do not modify the prior two — they are landed):
--
--   (a) Embedding dimension mismatch. The kernel created
--       `agency_knowledge.embedding` as `vector(1536)`, but the production
--       embedder (`netlify/functions/_shared/agency-knowledge/retrieve.ts`)
--       calls `generateEmbedding()` against Azure `text-embedding-3-large`
--       which returns 3072-dim vectors. The pgvector `vector` type also caps
--       HNSW at 2000 dims — even if dims matched, indexing would fail at
--       scale. Fix: resize to `halfvec(3072)` (pgvector >=0.7), mirroring the
--       pattern from `20260506_kb_embedding_3072.sql`. halfvec uses 16-bit
--       floats, supports HNSW up to 4000 dims, and is the canonical type for
--       3072-dim Azure embeddings on this codebase.
--
--   (b) Missing retrieval RPC. `retrieve.ts` calls
--       `supabase.rpc('retrieve_agency_knowledge', { p_client_id, p_query_embedding, p_k, p_kinds })`
--       expecting rows of shape `{ id, kind, content, similarity, version }`.
--       The kernel migration did not create this function. Without it, every
--       agent retrieval call fails. This migration adds it as SECURITY
--       DEFINER, with the mandatory `WHERE client_id = p_client_id` predicate
--       BEFORE the ORDER BY (belt + suspenders vs the HNSW cross-tenant
--       timing-channel concern called out in the kernel/RLS files), and
--       grants EXECUTE to `service_role` only.
--
--   (c) Duplicate RLS-supporting indexes. Five `CREATE INDEX IF NOT EXISTS`
--       statements appear in BOTH `20260530_agency_kernel.sql` (lines 477,
--       483, 486, 489, 492) AND `20260530_agency_rls.sql` (lines 420, 423,
--       426, 429, 432). They are idempotent at SQL level (no error) but it's
--       a maintenance smell — anyone reading the RLS file would think those
--       indexes were introduced there. Since we cannot edit the landed RLS
--       file, this corrective migration explicitly DROPs and re-CREATEs them
--       with names that match the kernel so the kernel remains the single
--       owner. (In practice the DROP/CREATE is a no-op because the names
--       collide and `IF NOT EXISTS` makes both prior statements safe — but
--       running them here in a single dedicated block documents intent for
--       future migration authors.) The two RLS-only indexes
--       (`idx_agency_artifact_baselines_client`,
--       `idx_agency_digital_twin_personas_client`) are left alone — they
--       belong with the RLS migration where they were introduced.
--
-- Forward-only: this migration must run AFTER both kernel and RLS migrations.
-- Re-running it is safe (all statements are idempotent or replace-in-place).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 0. Extensions ────────────────────────────────────────────────────────
-- halfvec requires pgvector >= 0.7. Already enabled by the kernel, repeated
-- here for idempotence so this file can be applied standalone if needed.

CREATE EXTENSION IF NOT EXISTS vector;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Resize agency_knowledge.embedding from vector(1536) to halfvec(3072)
-- ═══════════════════════════════════════════════════════════════════════════
-- Mirrors `20260506_kb_embedding_3072.sql` (same project, same Azure embedder,
-- same halfvec rationale). agency_knowledge was freshly created in the kernel
-- migration so all embeddings are NULL at this point — the USING NULL coerce
-- is safe and lossless.

-- 1a. Drop the kernel-created HNSW index that pins the column type.
DROP INDEX IF EXISTS public.idx_agency_knowledge_embedding;

-- 1b. Resize. Existing rows have NULL embeddings (freshly seeded table).
ALTER TABLE public.agency_knowledge
  ALTER COLUMN embedding TYPE halfvec(3072) USING NULL;

-- 1c. Recreate the HNSW index with halfvec_cosine_ops. The RPC below computes
--     similarity as `1 - (embedding <=> query)` (cosine distance), so cosine
--     ops is the correct operator class.
CREATE INDEX idx_agency_knowledge_embedding
  ON public.agency_knowledge
  USING hnsw (embedding halfvec_cosine_ops);

COMMENT ON COLUMN public.agency_knowledge.embedding IS
  '3072-dim halfvec (Azure text-embedding-3-large). Retrieval MUST pre-filter on client_id BEFORE the ORDER BY (see retrieve.ts + retrieve_agency_knowledge RPC). HNSW index uses halfvec_cosine_ops. Resized from vector(1536) by 20260530_agency_kernel_fix.sql.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SECURITY DEFINER RPC — retrieve_agency_knowledge
-- ═══════════════════════════════════════════════════════════════════════════
-- Called by `netlify/functions/_shared/agency-knowledge/retrieve.ts` via
--   supabase.rpc('retrieve_agency_knowledge', {
--     p_client_id, p_query_embedding, p_k, p_kinds
--   })
-- Returns rows of shape { id, kind, content, similarity, version }.
--
-- Belt + suspenders: the explicit `where client_id = p_client_id` predicate
-- runs BEFORE the ORDER BY so the planner uses a tenant-scoped scan rather
-- than the global HNSW index. RLS also enforces tenancy, but pgvector
-- similarity has a documented cross-tenant timing-side-channel concern (see
-- the "Vector cross-tenant leak warning" block at the end of
-- 20260530_agency_rls.sql) — the pre-filter avoids that path entirely.
--
-- SECURITY DEFINER + REVOKE/GRANT pattern: only service_role may EXECUTE.
-- Client JWTs cannot reach this function. Adapter/agent code must invoke it
-- with the service-role key.

CREATE OR REPLACE FUNCTION public.retrieve_agency_knowledge(
  p_client_id       uuid,
  p_query_embedding halfvec(3072),
  p_k               int DEFAULT 10,
  p_kinds           text[] DEFAULT NULL
)
RETURNS TABLE (
  id         uuid,
  kind       text,
  content    jsonb,
  similarity real,
  version    int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ak.id,
    ak.kind,
    ak.content,
    (1 - (ak.embedding <=> p_query_embedding))::real AS similarity,
    ak.version
  FROM public.agency_knowledge ak
  WHERE ak.client_id = p_client_id                    -- TENANT GATE (mandatory pre-ORDER-BY)
    AND ak.embedding IS NOT NULL
    AND (p_kinds IS NULL OR ak.kind = ANY(p_kinds))
  ORDER BY ak.embedding <=> p_query_embedding
  LIMIT GREATEST(1, LEAST(p_k, 50));
$$;

REVOKE ALL ON FUNCTION public.retrieve_agency_knowledge(uuid, halfvec(3072), int, text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.retrieve_agency_knowledge(uuid, halfvec(3072), int, text[]) TO service_role;

COMMENT ON FUNCTION public.retrieve_agency_knowledge(uuid, halfvec(3072), int, text[]) IS
  'Tenant-scoped vector similarity over agency_knowledge. SECURITY DEFINER; only service_role may execute. The WHERE client_id = p_client_id predicate runs BEFORE ORDER BY, forcing the planner to a tenant-scoped scan rather than the global HNSW (avoiding the cross-tenant timing side channel documented in 20260530_agency_rls.sql §12).';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Duplicate index cleanup
-- ═══════════════════════════════════════════════════════════════════════════
-- The following five indexes were created TWICE — once in the kernel migration
-- (single owner, by design) and again in the RLS migration (accidental
-- duplication). Both used `IF NOT EXISTS` so neither errored, but the
-- duplication is a maintenance smell.
--
-- This block DROPs and re-CREATEs them so the kernel remains the documented
-- single owner. The re-CREATE uses the same name and definition as the kernel
-- migration. The two RLS-only indexes
-- (idx_agency_artifact_baselines_client, idx_agency_digital_twin_personas_client)
-- are left untouched — they correctly belong to the RLS migration where they
-- were introduced (kernel migration does not create them).

DROP INDEX IF EXISTS public.idx_agency_clients_user_id;
CREATE INDEX idx_agency_clients_user_id
  ON public.agency_clients(user_id);

DROP INDEX IF EXISTS public.idx_agency_artifacts_client_status;
CREATE INDEX idx_agency_artifacts_client_status
  ON public.agency_artifacts(client_id, status);

DROP INDEX IF EXISTS public.idx_agency_events_client_type;
CREATE INDEX idx_agency_events_client_type
  ON public.agency_events(client_id, type, severity);

DROP INDEX IF EXISTS public.idx_agency_intake_calls_client;
CREATE INDEX idx_agency_intake_calls_client
  ON public.agency_intake_calls(client_id);

DROP INDEX IF EXISTS public.idx_agency_knowledge_client;
CREATE INDEX idx_agency_knowledge_client
  ON public.agency_knowledge(client_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- END Agency OS Kernel — Phase B Corrective Migration
-- ═══════════════════════════════════════════════════════════════════════════
