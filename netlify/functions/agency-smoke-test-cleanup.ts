import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-smoke-test-cleanup — POST. Founder-only.
 *
 * Manual ops utility: cascade-deletes SmokeTest clients (rows whose
 * business_name starts with 'SmokeTest' or '__test__') from every
 * agency_* table in the correct FK order so no constraint violations occur.
 *
 * Security model: founder JWT required (app_metadata.role === 'founder').
 * getServiceSupabase bypasses RLS — the JWT gate is the only boundary here,
 * which is correct for a destructive ops tool that must ignore RLS policies.
 *
 * Dry-run mode (dry_run: true) returns counts of what WOULD be deleted
 * without performing any deletes. Safe to call repeatedly.
 *
 * After a live run, emits a single adapter_error/info event to agency_events
 * under client_id='__system__' summarising the cleanup for the audit trail.
 * The event type is adapter_error/info because it is the only schema with
 * the free-form `description` + `op` fields that fit a system-level audit
 * entry. The severity 'info' distinguishes it from actual errors.
 *
 * NOT a scheduled function — invoked manually by the founder during smoke
 * testing to reset the DB between test runs. No netlify.toml schedule entry.
 */

import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';

// ── CORS headers ─────────────────────────────────────────────────────────────

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Auth helper — mirrors agency-deploy-agent pattern exactly ─────────────────

async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  return role === 'founder';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CleanupBody {
  confirm?: unknown;
  dry_run?: unknown;
  client_id_filter?: unknown;
}

interface ClientMatch {
  id: string;
  business_name: string;
}

interface ClientCounts {
  client_id: string;
  business_name: string;
  counts: {
    agency_events: number;
    agency_artifacts: number;
    agency_intake_calls: number;
    agency_knowledge: number;
    agency_digital_twin_personas: number;
    agency_artifact_baselines: number;
    agency_clients: number;
  };
}

// ── Child-table deletion order (FK-safe, most-dependent first) ────────────────
//
// agency_clients is always last. All other tables reference agency_clients.id
// via client_id FK. Within child tables, order matters where one references
// another (e.g. agency_artifact_baselines references agency_artifacts.id).
// The safe sequence is:
//   1. agency_events              (references client_id only)
//   2. agency_artifact_baselines  (references artifact_id → agency_artifacts)
//   3. agency_artifacts           (references client_id only after baselines gone)
//   4. agency_intake_calls        (references client_id only)
//   5. agency_knowledge           (references client_id only)
//   6. agency_digital_twin_personas (references client_id only)
//   7. agency_clients             (parent, deleted last)

const CHILD_TABLES = [
  'agency_events',
  'agency_artifact_baselines',
  'agency_artifacts',
  'agency_intake_calls',
  'agency_knowledge',
  'agency_digital_twin_personas',
] as const;

type ChildTable = (typeof CHILD_TABLES)[number];
type CountsRecord = Record<ChildTable | 'agency_clients', number>;

// ── Count rows per table per client ──────────────────────────────────────────

async function countForClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<CountsRecord> {
  const counts: Partial<CountsRecord> = {};

  for (const table of CHILD_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (error) {
      console.warn(
        `[agency-smoke-test-cleanup] count failed table=${table} client=${clientId} err=${error.message}`,
      );
    }
    counts[table] = count ?? 0;
  }
  counts['agency_clients'] = 1; // the client row itself
  return counts as CountsRecord;
}

// ── Cascade delete for a single client ───────────────────────────────────────

async function deleteClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<CountsRecord> {
  const counts = await countForClient(supabase, clientId);

  for (const table of CHILD_TABLES) {
    if ((counts[table] ?? 0) === 0) continue;
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('client_id', clientId);

    if (error) {
      throw new Error(
        `[agency-smoke-test-cleanup] delete failed table=${table} client=${clientId}: ${error.message}`,
      );
    }
  }

  // Finally delete the client row itself.
  const { error: clientErr } = await supabase
    .from('agency_clients')
    .delete()
    .eq('id', clientId);

  if (clientErr) {
    throw new Error(
      `[agency-smoke-test-cleanup] delete failed table=agency_clients client=${clientId}: ${clientErr.message}`,
    );
  }

  return counts;
}

// ── Handler ───────────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Service client init ───────────────────────────────────────────────────

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-smoke-test-cleanup] service supabase init failed', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfigured' }),
    };
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!(await authFounder(authHeader, supabase))) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({
        error: authHeader ? 'Founder only' : 'Authentication required',
      }),
    };
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let body: CleanupBody;
  try {
    body = JSON.parse(event.body || '{}') as CleanupBody;
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  if (body.confirm !== true) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'must pass confirm:true — this operation permanently deletes data',
        hint: 'Pass dry_run:true first to preview what would be deleted',
      }),
    };
  }

  const isDryRun = body.dry_run === true;
  const clientIdFilter =
    typeof body.client_id_filter === 'string' && body.client_id_filter.length > 0
      ? body.client_id_filter
      : null;

  // ── Discover matching clients ─────────────────────────────────────────────

  let matchQuery = supabase
    .from('agency_clients')
    .select('id, business_name');

  if (clientIdFilter) {
    // Exact single-client override — useful when the founder knows the id.
    matchQuery = matchQuery.eq('id', clientIdFilter);
  } else {
    // Default: business_name starts with 'SmokeTest' or '__test__'
    matchQuery = matchQuery.or(
      "business_name.ilike.SmokeTest%,business_name.ilike.__test__%",
    );
  }

  const { data: clients, error: listErr } = await matchQuery;

  if (listErr) {
    console.error('[agency-smoke-test-cleanup] client list query failed', listErr.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to list matching clients', details: listErr.message }),
    };
  }

  const matched = (clients ?? []) as ClientMatch[];

  if (matched.length === 0) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dry_run: isDryRun,
        deleted: [],
        total_clients: 0,
        message: 'No SmokeTest clients found — nothing to delete',
      }),
    };
  }

  // ── Dry-run path: count only, no deletes ─────────────────────────────────

  if (isDryRun) {
    const preview: ClientCounts[] = [];

    for (const client of matched) {
      const counts = await countForClient(supabase, client.id);
      preview.push({
        client_id: client.id,
        business_name: client.business_name,
        counts: {
          agency_events:                counts.agency_events,
          agency_artifacts:             counts.agency_artifacts,
          agency_intake_calls:          counts.agency_intake_calls,
          agency_knowledge:             counts.agency_knowledge,
          agency_digital_twin_personas: counts.agency_digital_twin_personas,
          agency_artifact_baselines:    counts.agency_artifact_baselines,
          agency_clients:               counts.agency_clients,
        },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dry_run: true,
        would_delete: preview,
        total_clients: preview.length,
        message: 'Dry run complete — pass dry_run:false (or omit) to execute',
      }),
    };
  }

  // ── Live delete path ──────────────────────────────────────────────────────

  const deleted: ClientCounts[] = [];
  const errors: Array<{ client_id: string; business_name: string; error: string }> = [];

  for (const client of matched) {
    try {
      const counts = await deleteClient(supabase, client.id);
      deleted.push({
        client_id: client.id,
        business_name: client.business_name,
        counts: {
          agency_events:                counts.agency_events,
          agency_artifacts:             counts.agency_artifacts,
          agency_intake_calls:          counts.agency_intake_calls,
          agency_knowledge:             counts.agency_knowledge,
          agency_digital_twin_personas: counts.agency_digital_twin_personas,
          agency_artifact_baselines:    counts.agency_artifact_baselines,
          agency_clients:               counts.agency_clients,
        },
      });
      console.info(
        `[agency-smoke-test-cleanup] deleted client ${client.id} (${client.business_name})`,
        counts,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[agency-smoke-test-cleanup] delete error', msg);
      errors.push({ client_id: client.id, business_name: client.business_name, error: msg });
    }
  }

  // ── Audit event — best-effort, never blocks the response ─────────────────
  //
  // Uses adapter_error / severity='info' because it is the only registered
  // schema with a free-form `description` field suitable for a system-level
  // audit entry. client_id='__system__' marks it as cross-client infra telemetry.

  const totalRows = deleted.reduce(
    (sum, c) =>
      sum +
      c.counts.agency_events +
      c.counts.agency_artifacts +
      c.counts.agency_intake_calls +
      c.counts.agency_knowledge +
      c.counts.agency_digital_twin_personas +
      c.counts.agency_artifact_baselines +
      c.counts.agency_clients,
    0,
  );

  try {
    await emitAgencyEvent({
      client_id: '__system__',
      agent_name: 'smoke-test-cleanup',
      type: 'adapter_error',
      severity: 'info',
      payload: {
        adapter: 'smoke-test-cleanup',
        operation: 'cascade_delete',
        error_message: `Deleted ${deleted.length} SmokeTest client(s), ${totalRows} total rows`,
        op: 'smoke_test_cleanup',
        description: `clients_deleted=${deleted.length} errors=${errors.length} names=${deleted.map((c) => c.business_name).join(',')}`,
        retryable: false,
      },
      why_explanation: `Founder-initiated SmokeTest cascade delete: ${deleted.length} client(s) purged, ${errors.length} error(s).`,
    });
  } catch (auditErr) {
    // Non-fatal: the deletes already happened. Log and continue.
    console.warn(
      '[agency-smoke-test-cleanup] audit event emit failed',
      auditErr instanceof Error ? auditErr.message : String(auditErr),
    );
  }

  // ── Response ──────────────────────────────────────────────────────────────

  const statusCode = errors.length > 0 && deleted.length === 0 ? 500 : 200;

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      dry_run: false,
      deleted,
      total_clients: deleted.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
