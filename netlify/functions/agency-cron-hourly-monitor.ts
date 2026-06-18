import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-cron-hourly-monitor — Hourly delivery-monitor heartbeat (Layer 2)
 * =========================================================================
 *
 * Backbone for the n8n `hourly-delivery-monitor` workflow.
 *
 * Schedule:
 *   '@hourly'  — top of every hour, UTC.
 *
 * What it does:
 *   Single POST to `/api/agency-delivery-monitor`. The monitor itself loops
 *   all live clients internally (see netlify/functions/agency-delivery-monitor.ts);
 *   we don't fan per-client here because:
 *     (a) the EWMA + seasonal baseline math benefits from being computed in
 *         one process pass so shared cache lookups stay warm; and
 *     (b) one HTTP self-invocation is enough — Netlify scheduled functions
 *         have a 10-second execution budget, and we only need to KICK the
 *         monitor, not wait for it.
 *
 * The monitor returns its per-client summary in the response body; we log it
 * for the Atlas morning briefing to consume.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'cron-hourly-monitor';
const TARGET_FN = 'agency-delivery-monitor';
const HEARTBEAT_TIMEOUT_MS = 9_000; // stay under scheduled-function budget

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();
  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyClientId = url.searchParams.get('client_id');

  const base = (process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org').replace(/\/+$/, '');
  // Honor ?client_id passthrough for manual single-client invocations during dev.
  const target = `${base}/.netlify/functions/${TARGET_FN}${
    onlyClientId ? `?client_id=${encodeURIComponent(onlyClientId)}` : ''
  }`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

  let status = 0;
  let bodyHead = '';
  try {
    const res = await fetch(target, {
      method: 'GET',
      headers: {
        'X-Cron-Trigger': 'hourly-delivery-monitor',
        ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
      },
      signal: controller.signal,
    });
    status = res.status;
    // Best-effort: read a tiny preview of the body for logs. Never block waiting
    // for the full payload — the monitor may keep working past our scheduled
    // budget (and that's fine, it has its own per-request timeout).
    try {
      const txt = await res.text();
      bodyHead = txt.slice(0, 400);
    } catch {
      bodyHead = '(body read failed)';
    }
  } catch (err) {
    // AbortError is the normal case for "monitor is still working past our
    // budget" — log without alarm.
    const msg = err instanceof Error ? err.message : String(err);
    if (controller.signal.aborted) {
      console.log(
        `[agency-cron-hourly-monitor] kicked ${TARGET_FN} (still running at ${HEARTBEAT_TIMEOUT_MS}ms)`,
      );
      return {
        statusCode: 202,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kicked: true,
          note: 'monitor still running past cron budget — that is expected',
          latency_ms: Date.now() - t0,
        }),
      };
    }
    console.error(`[agency-cron-hourly-monitor] kick failed: ${msg}`);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'monitor kick failed', detail: msg }),
    };
  } finally {
    clearTimeout(timer);
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-cron-hourly-monitor] kicked ${TARGET_FN} status=${status} latency=${latency_ms}ms head=${bodyHead.slice(0, 120)}`,
  );
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kicked: true,
      target_status: status,
      latency_ms,
      monitor_response_preview: bodyHead,
      agent_name: AGENT_NAME,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-cron-hourly-monitor', inner);

export default withLegacyHandler(handler);
