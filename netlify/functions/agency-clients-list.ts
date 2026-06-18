import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-clients-list.ts — Boltcall Agency OS · Layer 7 · Observability
 * ─────────────────────────────────────────────────────────────────────
 *
 * GET endpoint backing the founder's per-client list page
 * (`/dashboard/agency/clients`). Returns one row per `agency_clients`
 * record plus a `last_event_at` denormalization computed from
 * `agency_events`.
 *
 * Auth model:
 *   - Bearer token (Supabase JWT) required.
 *   - Founder-only. Caller must have `app_metadata.role = 'founder'` on
 *     their JWT (set via Supabase Admin API; not forgeable from a client
 *     SDK).
 *   - Service-role Supabase client used for the read so we never depend
 *     on the caller's RLS context — the founder check is performed
 *     explicitly in TS before reading.
 *
 * Output shape:
 *   {
 *     clients: Array<{
 *       id, business_name, vertical, sku, mrr, status, churn_risk,
 *       churn_risk_drivers, live_at, signed_up_at, created_at,
 *       last_event_at  // ISO timestamp or null
 *     }>
 *   }
 *
 * Performance note:
 *   We fetch all client rows in one query and compute `last_event_at`
 *   per-client via a single grouped read on `agency_events`. At <100
 *   clients this is well under the 1s budget. Migrate to a SQL view if
 *   the client count exceeds ~500 — the per-tenant aggregate query
 *   stays cheap thanks to `idx_agency_events_client_created`.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

type ClientRow = {
  id: string;
  business_name: string | null;
  vertical: string | null;
  sku: string;
  mrr: number;
  status: string;
  churn_risk: string;
  churn_risk_drivers: string[];
  live_at: string | null;
  signed_up_at: string;
  created_at: string;
  last_event_at: string | null;
};

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

  // Validate the JWT and pull the user (service-role bypasses RLS, so we
  // must do this auth check explicitly).
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }

  // Founder gate. `app_metadata.role === 'founder'` is set server-side via
  // the Admin API and cannot be modified from a client SDK. We accept both
  // the modern `app_metadata.role` and the legacy top-level `role` claim
  // for symmetry with the `is_founder()` Postgres function.
  const appMeta = (userResult.user.app_metadata || {}) as { role?: string };
  const role = appMeta.role || (userResult.user as unknown as { role?: string }).role;
  if (role !== 'founder') {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Forbidden — founder role required' }),
    };
  }

  // 1) Pull every client row. Caps at 1000 — well above any realistic
  //    agency client count for the foreseeable future. Order by signed-up
  //    desc so the list opens with the most-recently-onboarded clients.
  const { data: clients, error: clientsErr } = await supa
    .from('agency_clients')
    .select(
      'id,business_name,vertical,sku,mrr,status,churn_risk,churn_risk_drivers,live_at,signed_up_at,created_at',
    )
    .order('signed_up_at', { ascending: false })
    .limit(1000);

  if (clientsErr) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch clients', detail: clientsErr.message }),
    };
  }

  const clientIds = (clients || []).map((c) => c.id);

  // 2) Compute last_event_at per client. We do this as a single read of
  //    (client_id, created_at) and reduce in TS. With <100 clients this
  //    is cheaper than N grouped queries and uses the
  //    idx_agency_events_client_created index.
  const lastEventAt = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: events, error: eventsErr } = await supa
      .from('agency_events')
      .select('client_id,created_at')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false });

    if (eventsErr) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to fetch events', detail: eventsErr.message }),
      };
    }

    for (const ev of events || []) {
      if (!ev.client_id || lastEventAt.has(ev.client_id)) continue;
      lastEventAt.set(ev.client_id, ev.created_at);
    }
  }

  const rows: ClientRow[] = (clients || []).map((c) => ({
    id: c.id,
    business_name: c.business_name ?? null,
    vertical: c.vertical ?? null,
    sku: c.sku,
    mrr: c.mrr,
    status: c.status,
    churn_risk: c.churn_risk,
    churn_risk_drivers: c.churn_risk_drivers || [],
    live_at: c.live_at ?? null,
    signed_up_at: c.signed_up_at,
    created_at: c.created_at,
    last_event_at: lastEventAt.get(c.id) ?? null,
  }));

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ clients: rows }),
  };
};

export default withLegacyHandler(handler);
