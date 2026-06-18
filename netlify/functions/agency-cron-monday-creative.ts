import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-cron-monday-creative — Weekly creative-foundry kickoff (Layer 2)
 * =======================================================================
 *
 * The Netlify-scheduled backbone for the n8n `monday-creative-refresh`
 * workflow. n8n is the orchestration ergonomic; this cron is the
 * load-bearing backup (per plan §4 "Failure mode: if n8n goes down, the OS
 * degrades gracefully — Netlify scheduled functions are the backup for the
 * time-critical workflows"). Either trigger reaches the same
 * `/api/agency-creative-foundry` endpoint per client.
 *
 * Schedule:
 *   '0 6 * * 1'  — Mondays at 06:00 UTC (every live Bolt System client).
 *   That's intentionally a single global tick; the per-client variant
 *   (client-timezone Friday) is the report cron, not this one. Mondays
 *   06:00 UTC is the "fresh ads in everyone's account before US morning"
 *   slot. Bolt System clients in PT see ads queued by 23:00 Sunday local —
 *   ahead of their week.
 *
 * What it does:
 *   1. Query agency_clients for sku='bolt_system' AND status='live'.
 *   2. For each, POST to `/api/agency-creative-foundry` with `{ client_id }`.
 *   3. Emit a `cost_incurred` summary event per call (provider=anthropic,
 *      amount_usd=0, category='cron_trigger') so the dashboard sees the tick.
 *
 * What it does NOT do:
 *   - Run the agent in-process. The agent itself is invoked over HTTP so the
 *     same code path is used by n8n, the manual founder "regenerate" button,
 *     and this cron. Single source of truth for the creative-foundry runner.
 *   - Block on failures. One bad client should not kill the rest of the
 *     Monday batch — errors are logged + emitted as adapter_error events.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'cron-monday-creative';
const TARGET_FN = 'agency-creative-foundry';
const TARGET_SKU = 'bolt_system';
const PER_CLIENT_TIMEOUT_MS = 60_000; // creative-foundry latency budget is ~120s; we abort our
                                       // forwarder before that so the runner can stand on its own.

interface LiveBoltClient {
  id: string;
  business_name: string | null;
  vertical: string | null;
}

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  // Manual smoke-test path: ?client_id=<uuid> bypasses the live-client scan
  // and POSTs the single client through, useful for verifying the chain end-to-end.
  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyClientId = url.searchParams.get('client_id');

  let clients: LiveBoltClient[];
  try {
    clients = await loadLiveBoltClients(onlyClientId);
  } catch (err) {
    console.error('[agency-cron-monday-creative] failed to load clients:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'failed to load clients' }),
    };
  }

  if (clients.length === 0) {
    console.log('[agency-cron-monday-creative] no live bolt_system clients — exiting');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients_fanned: 0, ok: true }),
    };
  }

  const results: Array<{ client_id: string; ok: boolean; status?: number; reason?: string }> = [];
  for (const c of clients) {
    try {
      const r = await postToCreativeFoundry(c.id);
      results.push({ client_id: c.id, ok: r.ok, status: r.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agency-cron-monday-creative] client ${c.id} failed: ${msg}`);
      results.push({ client_id: c.id, ok: false, reason: msg });
      // Telemetry: surface in the dashboard. Best-effort — never throw.
      try {
        await emitAgencyEvent({
          client_id: c.id,
          agent_name: AGENT_NAME,
          type: 'adapter_error',
          severity: 'warn',
          payload: {
            adapter: AGENT_NAME,
            operation: `POST /${TARGET_FN}`,
            error_message: msg.slice(0, 500),
            retryable: true,
          },
          why_explanation:
            `Monday creative-refresh fan-out to ${TARGET_FN} failed for this client; ` +
            `next Monday's cron will retry. n8n workflow may have already covered it.`,
        });
      } catch {
        /* swallow telemetry failures */
      }
      continue;
    }
    // Heartbeat event: zero-cost, lets the dashboard tick show "Monday creative
    // queued for X" without scraping HTTP logs.
    try {
      await emitAgencyEvent({
        client_id: c.id,
        agent_name: AGENT_NAME,
        type: 'cost_incurred',
        severity: 'debug',
        payload: {
          category: 'cron_trigger',
          provider: 'other',
          amount_usd: 0,
          source: 'monday-creative-refresh',
          op: `fan_out_to_${TARGET_FN}`,
          vertical: c.vertical ?? undefined,
        },
      });
    } catch {
      /* telemetry only */
    }
  }

  const latency_ms = Date.now() - t0;
  const okCount = results.filter((r) => r.ok).length;
  console.log(
    `[agency-cron-monday-creative] fanned ${results.length} clients (${okCount} ok) in ${latency_ms}ms`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clients_fanned: results.length,
      ok_count: okCount,
      latency_ms,
      per_client: results,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-cron-monday-creative', inner);

// ───────────────────────────────────────────────────────────────────────────
//   Helpers
// ───────────────────────────────────────────────────────────────────────────

async function loadLiveBoltClients(onlyId: string | null): Promise<LiveBoltClient[]> {
  const supabase = getServiceSupabase();
  let q = supabase
    .from('agency_clients')
    .select('id, business_name, vertical')
    .eq('status', 'live')
    .eq('sku', TARGET_SKU);
  if (onlyId) q = q.eq('id', onlyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LiveBoltClient[];
}

async function postToCreativeFoundry(client_id: string): Promise<{ ok: boolean; status: number }> {
  const base = (process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org').replace(/\/+$/, '');
  const target = `${base}/.netlify/functions/${TARGET_FN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Trigger': 'monday-creative-refresh',
        ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({ client_id }),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

export default withLegacyHandler(handler);
