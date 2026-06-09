/**
 * agency-cron-monthly-optimization — Monthly optimization-strategist trigger
 * ==========================================================================
 *
 * Backbone for the n8n `monthly-optimization` workflow.
 *
 * Schedule:
 *   '0 9 1 * *'  — 1st of every month at 09:00 UTC.
 *   Single global tick, not per-client. The strategist isn't time-of-day
 *   sensitive (the artifact lands in the queue for the founder to approve in
 *   their normal 08:00 ritual), so no tz spread is needed.
 *
 * What it does:
 *   1. Load all live clients (every sku — every live client gets a monthly
 *      strategic review).
 *   2. Skip any client that doesn't have at least 14 days of history; the
 *      counterfactual simulator + cross-client pattern miner needs data.
 *   3. POST `/api/agency-optimization-strategist` per client with `{ client_id }`.
 *   4. Emit telemetry events as we go.
 *
 * Failure handling: per-client try/catch, never block others.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'cron-monthly-optimization';
const TARGET_FN = 'agency-optimization-strategist';
const MIN_DAYS_LIVE = 14; // Need ~2w of data before the counterfactual replay is meaningful
const PER_CLIENT_TIMEOUT_MS = 90_000; // strategist budget is ~60s; pad for cold start
const MAX_PARALLEL = 3; // Opus 4.7 is expensive — throttle the burst

interface LiveClient {
  id: string;
  business_name: string | null;
  vertical: string | null;
  live_at: string | null;
}

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  const now = new Date();

  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyClientId = url.searchParams.get('client_id');
  const force = url.searchParams.get('force') === '1';

  let clients: LiveClient[];
  try {
    clients = await loadLiveClients(onlyClientId);
  } catch (err) {
    console.error('[agency-cron-monthly-optimization] failed to load clients:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'failed to load clients' }),
    };
  }

  // Split eligible vs. too-new clients
  const eligible: LiveClient[] = [];
  const tooNew: Array<{ client_id: string; days_live: number }> = [];
  for (const c of clients) {
    const daysLive = c.live_at
      ? (now.getTime() - new Date(c.live_at).getTime()) / 86_400_000
      : 0;
    if (!force && daysLive < MIN_DAYS_LIVE) {
      tooNew.push({ client_id: c.id, days_live: Math.round(daysLive * 10) / 10 });
      continue;
    }
    eligible.push(c);
  }

  const results: Array<{ client_id: string; ok: boolean; status?: number; reason?: string }> = [];

  // Throttle in batches of MAX_PARALLEL to keep us under Anthropic's RPM cap.
  for (let i = 0; i < eligible.length; i += MAX_PARALLEL) {
    const batch = eligible.slice(i, i + MAX_PARALLEL);
    const batchResults = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await postToOptimizationStrategist(c.id);
          // Heartbeat event — zero-cost trigger record.
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
                source: 'monthly-optimization',
                op: `fan_out_to_${TARGET_FN}`,
                vertical: c.vertical ?? undefined,
              },
            });
          } catch {
            /* telemetry only */
          }
          return { client_id: c.id, ok: r.ok, status: r.status };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[agency-cron-monthly-optimization] client ${c.id} failed: ${msg}`);
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
                retryable: false, // monthly cron — manual re-run if it fails, don't auto-retry
              },
              why_explanation:
                `Monthly optimization brief generation failed for this client. Re-run manually ` +
                `with ?client_id=${c.id} once the underlying issue is resolved.`,
            });
          } catch {
            /* swallow */
          }
          return { client_id: c.id, ok: false, reason: msg };
        }
      }),
    );
    results.push(...batchResults);
  }

  const latency_ms = Date.now() - t0;
  const okCount = results.filter((r) => r.ok).length;
  console.log(
    `[agency-cron-monthly-optimization] fanned ${results.length} clients (${okCount} ok), ` +
      `${tooNew.length} too-new in ${latency_ms}ms`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eligible_count: eligible.length,
      ok_count: okCount,
      too_new_count: tooNew.length,
      too_new: tooNew,
      latency_ms,
      per_client: results,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-cron-monthly-optimization', inner);

// ───────────────────────────────────────────────────────────────────────────
//   Helpers
// ───────────────────────────────────────────────────────────────────────────

async function loadLiveClients(onlyId: string | null): Promise<LiveClient[]> {
  const supabase = getServiceSupabase();
  let q = supabase
    .from('agency_clients')
    .select('id, business_name, vertical, live_at')
    .eq('status', 'live');
  if (onlyId) q = q.eq('id', onlyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LiveClient[];
}

async function postToOptimizationStrategist(
  client_id: string,
): Promise<{ ok: boolean; status: number }> {
  const base = (process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org').replace(/\/+$/, '');
  const target = `${base}/.netlify/functions/${TARGET_FN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Trigger': 'monthly-optimization',
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
