import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-queue-list — GET. Founder-only.
 *
 * Returns every pending (status IN ('draft','deferred')) artifact across every
 * agency_clients row, joined with client business_name / vertical / sku /
 * churn_risk, plus a precomputed rank_score and per-(type,vertical) historical
 * base rate so the UI can render a fully populated decision surface without
 * any follow-up queries.
 *
 * Sort formula (mirrored in the UI for transparency):
 *
 *   rank_score = (predicted_impact.value || prediction || 0)
 *                * (reversible ? 1 : 1.5)
 *                / hours_since_created
 *
 * Reversibility heuristic: an artifact is treated as reversible iff its type
 * has a defined reverse path (agent_prompt, ad_creative, knowledge_base) AND
 * it has not been shipped yet. The 1.5× weight on irreversible items biases
 * the queue to review them first — the cost of a wrong call is higher.
 *
 * Critical escalations (type='escalation_action' + severity='critical' in the
 * artifact content) bypass the rank and are surfaced as such in the UI.
 *
 * Base rates: per (artifact.type, agency_clients.vertical), median of
 *   post_ship_outcome_recorded events' payload.observed_value
 * over the last 90 days. Computed once per request; cheap enough at our scale
 * (the index on agency_events(severity, created_at) makes this an index scan).
 *
 * Auth: requires Authorization: Bearer <jwt> AND app_metadata.role='founder'.
 * Returns 401 if missing/invalid, 403 if non-founder.
 */

import type { Handler } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  // Disable caching — the queue is real-time and shows what the founder must
  // act on right now.
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const REVERSIBLE_TYPES = new Set([
  'agent_prompt',
  'ad_creative',
  'ad_copy',
  'knowledge_base',
  'prompt_revision',
  'optimization_brief',
  'client_outreach',
  'expansion_pitch',
  'digital_twin_seed',
  'experiment_plan',
]);

interface ArtifactRow {
  id: string;
  client_id: string;
  type: string;
  status: string;
  generated_by: string;
  model: string | null;
  content: Record<string, unknown>;
  preview_url: string | null;
  ship_target: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  eval_score: number | null;
  confidence: number | null;
  reasoning_trace: string[] | null;
  retrieved_context: unknown;
  alternatives_rejected: unknown;
  adversarial_review: unknown;
  client_facing_note: string | null;
  parent_artifact_id: string | null;
  predicted_impact: unknown;
  ship_window_ends_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  shipped_at: string | null;
}

interface ClientRow {
  id: string;
  business_name: string | null;
  vertical: string | null;
  sku: string | null;
  status: string | null;
  churn_risk: string | null;
}

/**
 * Resolve the JWT to a Supabase user and verify the founder role lives in
 * app_metadata (server-controlled), NOT user_metadata (client-controlled).
 *
 * Returns null on any failure — caller maps that to 401/403.
 */
async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<{ userId: string; email: string | null } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'founder') return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

function safeNum(x: unknown): number {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  return 0;
}

function rankScore(
  predicted_impact: unknown,
  reversible: boolean,
  created_at: string,
): number {
  const pi = (predicted_impact ?? {}) as Record<string, unknown>;
  const impact = safeNum(pi.value) || safeNum(pi.prediction);
  const reversibility = reversible ? 1 : 1.5;
  const hours = Math.max(0.5, (Date.now() - Date.parse(created_at)) / 3_600_000);
  return (impact * reversibility) / hours;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface BaseRateEntry {
  value: number;
  n: number;
  metric: string;
}

/**
 * Build a (type+vertical) → median observed_value map from the last 90 days
 * of post_ship_outcome_recorded events. We have to join through
 * agency_artifacts → agency_clients to attach a vertical, because the event
 * itself only carries artifact_id.
 *
 * Bounded at 5_000 events to protect the function — at scale this should
 * become a materialized rollup, but at 10 clients we're nowhere near that.
 */
async function computeBaseRates(
  supabase: SupabaseClient,
): Promise<Record<string, BaseRateEntry>> {
  const since = new Date(Date.now() - 90 * 24 * 3_600_000).toISOString();
  const { data: events, error } = await supabase
    .from('agency_events')
    .select('payload, created_at')
    .eq('type', 'post_ship_outcome_recorded')
    .gte('created_at', since)
    .limit(5_000);
  if (error || !events || events.length === 0) return {};

  // Collect all artifact_ids we need to resolve to (type, vertical)
  const artifactIds = new Set<string>();
  for (const e of events) {
    const payload = (e.payload ?? {}) as Record<string, unknown>;
    const aid = typeof payload.artifact_id === 'string' ? payload.artifact_id : null;
    if (aid) artifactIds.add(aid);
  }
  if (artifactIds.size === 0) return {};

  const { data: artifacts } = await supabase
    .from('agency_artifacts')
    .select('id, type, client_id')
    .in('id', Array.from(artifactIds));
  const artifactMap = new Map<string, { type: string; client_id: string }>();
  for (const a of artifacts ?? []) {
    artifactMap.set(a.id as string, { type: a.type as string, client_id: a.client_id as string });
  }

  const clientIds = Array.from(
    new Set(Array.from(artifactMap.values()).map((a) => a.client_id)),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from('agency_clients')
        .select('id, vertical')
        .in('id', clientIds)
    : { data: [] as Array<{ id: string; vertical: string | null }> };
  const verticalMap = new Map<string, string>();
  for (const c of clients ?? []) {
    verticalMap.set(c.id as string, ((c.vertical as string | null) ?? 'unknown'));
  }

  const buckets = new Map<string, { values: number[]; metric: string }>();
  for (const e of events) {
    const payload = (e.payload ?? {}) as Record<string, unknown>;
    const aid = typeof payload.artifact_id === 'string' ? payload.artifact_id : null;
    if (!aid) continue;
    const art = artifactMap.get(aid);
    if (!art) continue;
    const vertical = verticalMap.get(art.client_id) ?? 'unknown';
    const observed = typeof payload.observed_value === 'number' ? payload.observed_value : null;
    const metric = typeof payload.observed_metric === 'string' ? payload.observed_metric : '';
    if (observed === null) continue;
    const key = `${art.type}::${vertical}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.values.push(observed);
      // keep most recent metric label (events are not sorted, doesn't matter)
      bucket.metric = bucket.metric || metric;
    } else {
      buckets.set(key, { values: [observed], metric });
    }
  }

  const out: Record<string, BaseRateEntry> = {};
  for (const [key, { values, metric }] of buckets) {
    const m = median(values);
    if (m === null) continue;
    out[key] = { value: m, n: values.length, metric };
  }
  return out;
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-queue-list] service supabase init failed', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const auth = await authFounder(authHeader, supabase);
  if (!auth) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({ error: authHeader ? 'Founder only' : 'Authentication required' }),
    };
  }

  try {
    // ── 1. Pull every pending artifact ─────────────────────────────────────
    const { data: artifacts, error: artErr } = await supabase
      .from('agency_artifacts')
      .select(
        'id, client_id, type, status, generated_by, model, content, preview_url, ship_target, cost_usd, latency_ms, eval_score, confidence, reasoning_trace, retrieved_context, alternatives_rejected, adversarial_review, client_facing_note, parent_artifact_id, predicted_impact, ship_window_ends_at, created_at, reviewed_at, shipped_at',
      )
      .in('status', ['draft', 'deferred'])
      .order('created_at', { ascending: false })
      .limit(500);
    if (artErr) {
      console.error('[agency-queue-list] artifact query failed', artErr.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Query failed' }) };
    }
    const artifactRows = (artifacts ?? []) as ArtifactRow[];

    // ── 2. Join client data ────────────────────────────────────────────────
    const clientIds = Array.from(new Set(artifactRows.map((a) => a.client_id)));
    const { data: clients } = clientIds.length
      ? await supabase
          .from('agency_clients')
          .select('id, business_name, vertical, sku, status, churn_risk')
          .in('id', clientIds)
      : { data: [] as ClientRow[] };
    const clientMap = new Map<string, ClientRow>();
    for (const c of (clients ?? []) as ClientRow[]) {
      clientMap.set(c.id, c);
    }

    // ── 3. Counts ──────────────────────────────────────────────────────────
    const now = Date.now();
    const dayAgo = now - 24 * 3_600_000;
    const weekAgo = now - 7 * 24 * 3_600_000;
    let today = 0;
    let week = 0;
    for (const a of artifactRows) {
      const created = Date.parse(a.created_at);
      if (created >= dayAgo) today += 1;
      if (created >= weekAgo) week += 1;
    }

    // ── 4. Base rates per (type, vertical) ────────────────────────────────
    const baseRates = await computeBaseRates(supabase);

    // ── 5. Compose response with rank score + reversibility + base rate ──
    const enriched = artifactRows.map((a) => {
      const reversible =
        REVERSIBLE_TYPES.has(a.type) && a.status !== 'shipped';
      const rank_score = rankScore(a.predicted_impact, reversible, a.created_at);
      const client = clientMap.get(a.client_id) ?? {
        id: a.client_id,
        business_name: null,
        vertical: null,
        sku: null,
        status: null,
        churn_risk: null,
      };
      const vertical = client.vertical ?? 'unknown';
      const baseRate = baseRates[`${a.type}::${vertical}`] ?? null;
      const severity =
        (a.content as Record<string, unknown> | null)?.severity ?? null;
      return {
        ...a,
        reversible,
        rank_score,
        severity,
        client: {
          id: client.id,
          business_name: client.business_name,
          vertical: client.vertical,
          sku: client.sku,
          status: client.status,
          churn_risk: client.churn_risk,
        },
        base_rate_value: baseRate?.value ?? null,
        base_rate_n: baseRate?.n ?? 0,
        base_rate_metric: baseRate?.metric ?? null,
      };
    });

    // Sort by rank_score desc with critical escalations floating to top.
    enriched.sort((a, b) => {
      const aCrit = a.type === 'escalation_action' && a.severity === 'critical' ? 1 : 0;
      const bCrit = b.type === 'escalation_action' && b.severity === 'critical' ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;
      return b.rank_score - a.rank_score;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        artifacts: enriched,
        counts: { pending: artifactRows.length, today, week },
        base_rates: baseRates,
      }),
    };
  } catch (err) {
    console.error('[agency-queue-list] error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal error',
        details: err instanceof Error ? err.message : 'unknown',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
