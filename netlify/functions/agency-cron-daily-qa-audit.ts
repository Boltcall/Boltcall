/**
 * agency-cron-daily-qa-audit — Daily QA-auditor trigger (Layer 2)
 * ================================================================
 *
 * Backbone for the n8n `daily-qa-audit` workflow.
 *
 * Schedule:
 *   '0 2 * * *'  — every day at 02:00 UTC.
 *   02:00 UTC is the "global trough" — late-evening in the Americas,
 *   pre-dawn in EU, before the EU morning call wave. Best time to score
 *   yesterday's tape without competing with live traffic.
 *
 * What it does:
 *   1. Load every live client (every sku — QA scoring is foundational).
 *   2. For each, POST `/api/agency-qa-auditor` with `{ client_id }`. The
 *      runner picks its sample (active-learning + random fill per the agent's
 *      design) from yesterday's calls.
 *   3. Telemetry per client.
 *
 * Burst control: QA-auditor uses Haiku 4.5; cheap enough that we can fan all
 * clients in a single tick without throttling.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'cron-daily-qa-audit';
const TARGET_FN = 'agency-qa-auditor';
const PER_CLIENT_TIMEOUT_MS = 180_000; // QA-auditor is per-transcript Haiku × N — pad generously

interface LiveClient {
  id: string;
  business_name: string | null;
  vertical: string | null;
}

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyClientId = url.searchParams.get('client_id');

  let clients: LiveClient[];
  try {
    clients = await loadLiveClients(onlyClientId);
  } catch (err) {
    console.error('[agency-cron-daily-qa-audit] failed to load clients:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'failed to load clients' }),
    };
  }

  const results: Array<{ client_id: string; ok: boolean; status?: number; reason?: string }> = [];
  for (const c of clients) {
    try {
      const r = await postToQaAuditor(c.id);
      results.push({ client_id: c.id, ok: r.ok, status: r.status });
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
            source: 'daily-qa-audit',
            op: `fan_out_to_${TARGET_FN}`,
            vertical: c.vertical ?? undefined,
          },
        });
      } catch {
        /* telemetry only */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agency-cron-daily-qa-audit] client ${c.id} failed: ${msg}`);
      results.push({ client_id: c.id, ok: false, reason: msg });
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
            `Daily QA audit fan-out failed; tomorrow's tick will retry. The Haiku layer is ` +
            `cheap enough that one missed day is non-load-bearing for the quality signal.`,
        });
      } catch {
        /* swallow */
      }
    }
  }

  const latency_ms = Date.now() - t0;
  const okCount = results.filter((r) => r.ok).length;
  console.log(
    `[agency-cron-daily-qa-audit] fanned ${results.length} clients (${okCount} ok) in ${latency_ms}ms`,
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
export const handler = wrapCronWithAlert('agency-cron-daily-qa-audit', inner);

// ───────────────────────────────────────────────────────────────────────────
//   Helpers
// ───────────────────────────────────────────────────────────────────────────

async function loadLiveClients(onlyId: string | null): Promise<LiveClient[]> {
  const supabase = getServiceSupabase();
  let q = supabase
    .from('agency_clients')
    .select('id, business_name, vertical')
    .eq('status', 'live');
  if (onlyId) q = q.eq('id', onlyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LiveClient[];
}

async function postToQaAuditor(client_id: string): Promise<{ ok: boolean; status: number }> {
  const base = (process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org').replace(/\/+$/, '');
  const target = `${base}/.netlify/functions/${TARGET_FN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Trigger': 'daily-qa-audit',
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
