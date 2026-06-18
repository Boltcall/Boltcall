import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-detail.ts — Boltcall Agency OS · Layer 7 · Observability
 * ──────────────────────────────────────────────────────────────────────
 *
 * GET ?id=<uuid> endpoint backing the per-client detail page
 * (`/dashboard/agency/clients/:id`). Single round-trip payload that
 * populates all five tabs of the detail UI: Overview (KPI timeline),
 * Artifacts (last 30d), Events (last 100), Knowledge (counts by kind),
 * Settings (external links).
 *
 * Auth model:
 *   - Bearer token (Supabase JWT) required.
 *   - Founder-only. Caller must have `app_metadata.role = 'founder'`.
 *   - Service-role Supabase client used for reads. Founder gate enforced
 *     in TS before any DB call.
 *
 * Output shape:
 *   {
 *     client: { ...agency_clients row + display fields },
 *     events: [...last 100 agency_events, newest first],
 *     artifacts: [...last 30 agency_artifacts, newest first, summary
 *                 fields only — full content fetched lazily by the UI],
 *     knowledge: { counts_by_kind: {service: N, faq: N, ...},
 *                  chunks: [...most recent 50 with kind + age + source] },
 *     kpi_series: { days: 30, series: { call_completed: number[],
 *                   lead_captured: number[], booking_made: number[] } }
 *   }
 *
 * KPI windowing:
 *   30 days of UTC-day buckets, oldest-first. A day with no events
 *   becomes a 0. The shipping UI plots these as a sparkline; the array
 *   shape is what the Overview tab expects directly (no further
 *   transformation).
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const KPI_DAYS = 30;
const RECENT_EVENT_LIMIT = 100;
const RECENT_ARTIFACT_LIMIT = 30;
const RECENT_KNOWLEDGE_LIMIT = 50;

const KPI_EVENT_TYPES = ['call_completed', 'lead_captured', 'booking_made'] as const;
type KpiEventType = (typeof KPI_EVENT_TYPES)[number];

function isoDayUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const id = event.queryStringParameters?.id;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad request — id query param must be a uuid' }),
    };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized — missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
  const appMeta = (userResult.user.app_metadata || {}) as { role?: string };
  const role = appMeta.role || (userResult.user as unknown as { role?: string }).role;
  if (role !== 'founder') {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Forbidden — founder role required' }),
    };
  }

  // Bound the KPI window. Aligned to UTC day starts so buckets are
  // stable across page loads.
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCHours(0, 0, 0, 0);
  windowStart.setUTCDate(windowStart.getUTCDate() - (KPI_DAYS - 1));
  const windowStartIso = windowStart.toISOString();

  const recentArtifactWindow = new Date(now);
  recentArtifactWindow.setUTCDate(recentArtifactWindow.getUTCDate() - 30);
  const recentArtifactWindowIso = recentArtifactWindow.toISOString();

  // Run all reads in parallel — they're independent and each hits a
  // dedicated index (see kernel migration). The 5-way Promise.all keeps
  // p95 well under the 2s observability budget called out in the plan.
  const [clientRes, eventsRes, artifactsRes, knowledgeCountsRes, knowledgeRes, kpiEventsRes] =
    await Promise.all([
      supa.from('agency_clients').select('*').eq('id', id).maybeSingle(),
      supa
        .from('agency_events')
        .select('id,agent_name,type,severity,payload,why_explanation,created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(RECENT_EVENT_LIMIT),
      supa
        .from('agency_artifacts')
        .select(
          'id,type,status,generated_by,model,confidence,reasoning_trace,alternatives_rejected,adversarial_review,predicted_impact,client_facing_note,preview_url,ship_target,cost_usd,latency_ms,eval_score,created_at,reviewed_at,shipped_at,parent_artifact_id',
        )
        .eq('client_id', id)
        .gte('created_at', recentArtifactWindowIso)
        .order('created_at', { ascending: false })
        .limit(RECENT_ARTIFACT_LIMIT),
      supa
        .from('agency_knowledge')
        .select('kind')
        .eq('client_id', id),
      supa
        .from('agency_knowledge')
        .select('id,kind,version,source_artifact_id,created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(RECENT_KNOWLEDGE_LIMIT),
      supa
        .from('agency_events')
        .select('type,created_at')
        .eq('client_id', id)
        .in('type', KPI_EVENT_TYPES as unknown as string[])
        .gte('created_at', windowStartIso),
    ]);

  if (clientRes.error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch client', detail: clientRes.error.message }),
    };
  }
  if (!clientRes.data) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Client not found' }),
    };
  }

  // Build the KPI day buckets. UTC-aligned, oldest-first. The UI plots
  // these directly — no client-side bucketing.
  const dayKeys: string[] = [];
  for (let i = 0; i < KPI_DAYS; i++) {
    const d = new Date(windowStart);
    d.setUTCDate(windowStart.getUTCDate() + i);
    dayKeys.push(isoDayUtc(d));
  }

  const series: Record<KpiEventType, number[]> = {
    call_completed: Array(KPI_DAYS).fill(0),
    lead_captured: Array(KPI_DAYS).fill(0),
    booking_made: Array(KPI_DAYS).fill(0),
  };
  for (const ev of kpiEventsRes.data || []) {
    const day = isoDayUtc(new Date(ev.created_at));
    const idx = dayKeys.indexOf(day);
    if (idx === -1) continue;
    const type = ev.type as KpiEventType;
    if (type in series) series[type][idx] += 1;
  }

  // Knowledge: aggregate counts by kind in TS so the UI can render a
  // small badge group without a second round-trip.
  const knowledgeCounts: Record<string, number> = {};
  for (const row of knowledgeCountsRes.data || []) {
    if (!row.kind) continue;
    knowledgeCounts[row.kind] = (knowledgeCounts[row.kind] || 0) + 1;
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      client: clientRes.data,
      events: eventsRes.data || [],
      artifacts: artifactsRes.data || [],
      knowledge: {
        counts_by_kind: knowledgeCounts,
        chunks: knowledgeRes.data || [],
      },
      kpi_series: {
        days: KPI_DAYS,
        day_keys: dayKeys,
        series,
      },
    }),
  };
};

export default withLegacyHandler(handler);
