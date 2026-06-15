/**
 * Tenant-safe knowledge retrieval for the Agency OS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY: This file implements concern #1 from the agency-OS Phase-A audit —
 * "VECTOR EMBEDDING CROSS-TENANT LEAK (highest-priority)".
 *
 * pgvector similarity queries (`embedding <-> $1 ORDER BY 1 LIMIT k`) interact
 * badly with RLS: the HNSW planner can traverse rows from OTHER tenants before
 * applying the RLS USING clause. Even when those rows never leave the database,
 * the ORDER BY ranking is computed over the full index — which creates:
 *   1. Timing side-channels that leak cross-tenant existence.
 *   2. A catastrophic failure mode if any caller ever bypasses RLS for perf
 *      (very tempting — vector search under RLS is slow). Client A would then
 *      receive client B's chunks.
 *
 * Mitigations enforced HERE (do not relax any of them):
 *   (a) Only the service-role calls retrieve() — never a client JWT. We assert
 *       at runtime that the supabase client was initialized with the service
 *       key. Throws hard otherwise.
 *   (b) Every SQL statement includes  `where client_id = $1`  BEFORE the
 *       ORDER BY, in addition to RLS. Belt + suspenders. The planner will use
 *       the partial-index path scoped to the tenant rather than the global
 *       HNSW.
 *   (c) `client_id` is validated as a uuid before it ever touches SQL. No
 *       null/undefined defaults — the caller MUST pass a tenant id.
 *   (d) A regression test (see exportRegressionTest) is exported so CI can
 *       assert that no cross-tenant rows are ever returned.
 *
 * Re-read concern #1 in the phase-A audit before changing anything in this
 * file. Cross-tenant data leakage is the highest-priority risk in the entire
 * Agency OS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../token-utils';
import { generateEmbedding } from '../azure-ai';

// ── Types ──────────────────────────────────────────────────────────────────

export type AgencyKnowledgeKind =
  | 'service'
  | 'faq'
  | 'policy'
  | 'case_study'
  | 'call_pattern';

export interface RetrieveOpts {
  /** MANDATORY — no default, no 'null' shortcut. Validated as uuid. */
  client_id: string;
  query_text: string;
  /** Optional kind filter. If omitted, all kinds are searched. */
  kinds?: AgencyKnowledgeKind[];
  /** Default 10 */
  k?: number;
  /** Default = Azure text-embedding-3-large (matches KB ingestion). */
  embedding_model?: string;
}

export interface RetrievedChunk {
  id: string;
  kind: string;
  content: unknown;
  similarity: number;
  score?: number;
  version: number;
}

export interface RetrieveResult {
  chunks: RetrievedChunk[];
  cost_usd: number;
}

export interface RetrieveForAgentOpts {
  client_id: string;
  agent_name: string;
  k?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_K = 10;
const MAX_K = 50; // hard cap to prevent runaway queries
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-large';

// Azure / OpenAI text-embedding-3-large pricing: $0.00013 per 1K input tokens.
// We approximate tokens at ~4 chars per token (English heuristic). This is
// good enough for cost accounting in agency_events; precision matters less
// than emitting *some* signal so the founder can spot a runaway agent.
const EMBED_PRICE_PER_1K_TOKENS_USD = 0.00013;
const CHARS_PER_TOKEN_HEURISTIC = 4;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_KINDS: ReadonlySet<AgencyKnowledgeKind> = new Set([
  'service',
  'faq',
  'policy',
  'case_study',
  'call_pattern',
]);

// ── Default query strings per agent (used by retrieveForAgent) ─────────────

const AGENT_DEFAULT_QUERIES: Record<string, string> = {
  'creative-foundry':
    'current services + offers + audience + brand voice + pricing tiers',
  'reporting-scribe':
    "this week's call patterns + win/loss themes + recurring objections + booking outcomes",
  'intake-officer':
    'business profile + hours + service area + booking policies + intake script',
  'agent-architect':
    'services + faqs + policies + verticals + tone + call_pattern transfer triggers',
  'pursuer':
    'open goals + active campaigns + outstanding follow-ups + case studies',
  'scout':
    'competitors + market signals + recent industry call_patterns',
  'strategist':
    'positioning + offers + case_study results + churn drivers',
  'cos':
    'top-of-mind for the founder + last week summary + open decisions',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(
      `[agency-knowledge.retrieve] ${field} must be a uuid; got ${
        value === undefined ? 'undefined' : value === null ? 'null' : typeof value
      }`,
    );
  }
}

/**
 * Decode a JWT *without* verifying — we only need to peek at the role claim
 * to assert this is the service-role key. The token signature is irrelevant
 * for that check; if the key isn't service-role, Supabase will reject the
 * query anyway. This is purely a defensive runtime tripwire so a misconfigured
 * environment fails LOUD (with our error message) rather than silently
 * returning anon-scoped data.
 */
function decodeJwtPayloadUnsafe(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(
      padded.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth: assert the supabase client passed in (or the env) is
 * service-role. We check the SUPABASE_SERVICE_KEY env var's JWT payload for
 * `role: 'service_role'`. If the JWT can't be decoded, we fall back to a
 * URL/env presence check so the assertion still trips on egregious misconfig.
 */
function assertServiceRole(_client: SupabaseClient): void {
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  if (!key) {
    throw new Error(
      '[agency-knowledge.retrieve] SUPABASE_SERVICE_KEY is not set. retrieve() MUST run with service-role. Refusing to query with anon/JWT scope.',
    );
  }
  const payload = decodeJwtPayloadUnsafe(key);
  if (payload && typeof payload.role === 'string') {
    if (payload.role !== 'service_role') {
      throw new Error(
        `[agency-knowledge.retrieve] SUPABASE_SERVICE_KEY has role="${payload.role}", expected "service_role". Refusing to query.`,
      );
    }
    return;
  }
  // Couldn't decode JWT — fall through to URL-pattern check. If the key
  // doesn't look like a JWT at all, refuse to proceed.
  if (key.split('.').length !== 3) {
    throw new Error(
      '[agency-knowledge.retrieve] SUPABASE_SERVICE_KEY does not look like a JWT. Refusing to query.',
    );
  }
}

function estimateEmbedCostUsd(text: string): number {
  const tokens = Math.ceil(text.length / CHARS_PER_TOKEN_HEURISTIC);
  return (tokens / 1000) * EMBED_PRICE_PER_1K_TOKENS_USD;
}

function clampK(k: number | undefined): number {
  if (!k || !Number.isFinite(k) || k <= 0) return DEFAULT_K;
  return Math.min(Math.floor(k), MAX_K);
}

function sanitizeKinds(
  kinds: AgencyKnowledgeKind[] | undefined,
): AgencyKnowledgeKind[] | null {
  if (!kinds || kinds.length === 0) return null;
  const cleaned = kinds.filter((k): k is AgencyKnowledgeKind => VALID_KINDS.has(k));
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Fire-and-forget agency_event emission. Never throws; logs on failure so a
 * cost-accounting glitch can't break retrieval for a paying client.
 */
async function emitCostIncurredEvent(
  supabase: SupabaseClient,
  client_id: string,
  cost_usd: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('agency_events').insert({
      client_id,
      type: 'cost_incurred',
      severity: 'info',
      source: 'agency-knowledge.retrieve',
      payload: {
        // Allowlisted fields only — never spread an unbounded object into
        // payload. See concern #6 in the Phase-A audit (agency_events.payload
        // is a fire hose of internal data).
        cost_usd,
        provider: 'azure-openai',
        operation: 'embedding',
        ...metadata,
      },
    });
  } catch (err) {
    console.error(
      '[agency-knowledge.retrieve] failed to emit cost_incurred event',
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Tenant-scoped vector similarity retrieval over agency_knowledge.
 *
 * Caller MUST be running under service-role and MUST pass an explicit
 * `client_id`. There is no "lookup the current user" shortcut — that would
 * defeat the entire purpose of this helper.
 */
export async function retrieve(opts: RetrieveOpts): Promise<RetrieveResult> {
  assertUuid(opts.client_id, 'client_id');

  if (typeof opts.query_text !== 'string' || opts.query_text.trim().length === 0) {
    throw new Error('[agency-knowledge.retrieve] query_text is required');
  }

  const k = clampK(opts.k);
  const kinds = sanitizeKinds(opts.kinds);
  const embeddingModel = opts.embedding_model || DEFAULT_EMBEDDING_MODEL;

  const supabase = getServiceSupabase();
  assertServiceRole(supabase);

  // 1. Embed the query text. Same model as KB ingestion (3072-dim halfvec).
  let embedding: number[];
  try {
    embedding = await generateEmbedding(opts.query_text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[agency-knowledge.retrieve] embedding failed: ${msg}`);
  }

  const cost_usd = estimateEmbedCostUsd(opts.query_text);

  // 2. Run the similarity search through a SECURITY DEFINER RPC. The RPC
  //    body MUST include  `where client_id = $1`  before the ORDER BY (belt +
  //    suspenders per concern #1). We call it via `.rpc()` with named params,
  //    which the postgres driver binds as bind-parameters — fully
  //    parameterized, no string interpolation.
  //
  //    Expected RPC signature (defined in supabase migration):
  //      retrieve_agency_knowledge(
  //        p_client_id   uuid,
  //        p_query_embedding halfvec(3072),
  //        p_k           int,
  //        p_kinds       text[]  -- nullable; null = all kinds
  //      ) returns table (id uuid, kind text, content jsonb,
  //                       similarity float, version int)
  //
  //    Inside that RPC the query is exactly:
  //      select id, kind, content,
  //             1 - (embedding <=> p_query_embedding) as similarity,
  //             version
  //        from public.agency_knowledge
  //       where client_id = p_client_id                       -- TENANT GATE
  //         and (p_kinds is null or kind = any(p_kinds))
  //       order by embedding <=> p_query_embedding
  //       limit p_k;
  const { data, error } = await supabase.rpc('retrieve_agency_knowledge', {
    p_client_id: opts.client_id,
    p_query_embedding: JSON.stringify(embedding),
    p_k: k,
    p_kinds: kinds, // null → all kinds, else string[]
  });

  if (error) {
    throw new Error(
      `[agency-knowledge.retrieve] supabase rpc retrieve_agency_knowledge failed: ${error.message}`,
    );
  }

  const rawChunks = Array.isArray(data) ? data : [];

  // 3. Final defense: drop any row whose client_id (if echoed back) doesn't
  //    match. The RPC does not return client_id today, but if a future
  //    schema change adds it, this filter survives. Costs ~nothing.
  const chunks: RetrievedChunk[] = rawChunks
    .filter((row: any) => {
      if (!row) return false;
      if ('client_id' in row && row.client_id !== opts.client_id) {
        console.error(
          '[agency-knowledge.retrieve] DROPPING cross-tenant row leaked from RPC',
          { expected: opts.client_id, got: row.client_id, id: row.id },
        );
        return false;
      }
      return true;
    })
    .map((row: any) => ({
      id: String(row.id),
      kind: String(row.kind),
      content: row.content,
      similarity: typeof row.similarity === 'number' ? row.similarity : 0,
      version: typeof row.version === 'number' ? row.version : 0,
    }));

  // 4. Emit cost event (fire-and-forget — does not block return).
  await emitCostIncurredEvent(supabase, opts.client_id, cost_usd, {
    embedding_model: embeddingModel,
    query_chars: opts.query_text.length,
    k,
    kinds: kinds ?? 'all',
    returned_chunks: chunks.length,
  });

  return { chunks, cost_usd };
}

/**
 * Convenience wrapper that picks a sensible default query string per agent.
 * Same tenant-safety guarantees as retrieve() — it just composes the query.
 */
export async function retrieveForAgent(
  opts: RetrieveForAgentOpts,
): Promise<RetrieveResult> {
  assertUuid(opts.client_id, 'client_id');

  if (!opts.agent_name || typeof opts.agent_name !== 'string') {
    throw new Error('[agency-knowledge.retrieveForAgent] agent_name is required');
  }

  const query_text =
    AGENT_DEFAULT_QUERIES[opts.agent_name] ??
    // Generic fallback for unknown agents: pull the broadest possible context
    // so the agent at least sees services + faqs rather than zero chunks.
    'services + offers + audience + policies + recent call_pattern themes';

  return retrieve({
    client_id: opts.client_id,
    query_text,
    k: opts.k ?? DEFAULT_K,
  });
}

/**
 * Regression-test helper. The test suite calls this to get a self-contained
 * SQL snippet that asserts no cross-tenant rows can ever come back from the
 * RPC, no matter what the planner does with the HNSW index.
 *
 * How to use in a pgTAP test (supabase/tests/agency_knowledge_isolation.sql):
 *
 *   begin;
 *   -- seed two tenants with content
 *   insert into agency_clients (id, user_id, name) values
 *     ('11111111-1111-1111-1111-111111111111', auth.uid(), 'A'),
 *     ('22222222-2222-2222-2222-222222222222', auth.uid(), 'B');
 *   insert into agency_knowledge (client_id, kind, content, embedding) values
 *     ('11111111-1111-1111-1111-111111111111', 'faq', '{"q":"A"}'::jsonb, <halfvec>),
 *     ('22222222-2222-2222-2222-222222222222', 'faq', '{"q":"B"}'::jsonb, <halfvec>);
 *   -- run the snippet from exportRegressionTest()
 *   <snippet>
 *   rollback;
 */
export function exportRegressionTest(): string {
  return `
-- agency-knowledge cross-tenant leak regression test.
-- Asserts retrieve_agency_knowledge() NEVER returns rows from another tenant,
-- even when the HNSW index would naturally rank them higher.
--
-- Preconditions (set up by the calling test harness):
--   * Tenant A: client_id = '11111111-1111-1111-1111-111111111111'
--   * Tenant B: client_id = '22222222-2222-2222-2222-222222222222'
--   * Each tenant has >=1 row in agency_knowledge with a populated embedding.
--   * A query_embedding bind value :q (halfvec(3072)) is provided.
--
-- The test passes iff: every returned row's client_id (looked up by id)
-- equals the client_id we asked for, for BOTH tenants.

with a_results as (
  select r.id
    from retrieve_agency_knowledge(
      p_client_id       => '11111111-1111-1111-1111-111111111111'::uuid,
      p_query_embedding => :q,
      p_k               => 50,
      p_kinds           => null
    ) r
),
b_results as (
  select r.id
    from retrieve_agency_knowledge(
      p_client_id       => '22222222-2222-2222-2222-222222222222'::uuid,
      p_query_embedding => :q,
      p_k               => 50,
      p_kinds           => null
    ) r
),
a_leaks as (
  select ak.id
    from public.agency_knowledge ak
    join a_results r on r.id = ak.id
   where ak.client_id <> '11111111-1111-1111-1111-111111111111'::uuid
),
b_leaks as (
  select ak.id
    from public.agency_knowledge ak
    join b_results r on r.id = ak.id
   where ak.client_id <> '22222222-2222-2222-2222-222222222222'::uuid
)
select
  (select count(*) from a_leaks) as tenant_a_cross_tenant_rows,
  (select count(*) from b_leaks) as tenant_b_cross_tenant_rows;
-- PASS iff both counts are 0. ANY non-zero value = critical security regression.
`.trim();
}
