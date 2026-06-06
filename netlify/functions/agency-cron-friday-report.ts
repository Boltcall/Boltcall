/**
 * agency-cron-friday-report — Per-client Friday auto-report fan-out (Layer 2)
 * ============================================================================
 *
 * Backbone for the n8n `friday-auto-report` workflow. The cron fires once per
 * hour on Fridays; each tick filters the live-client set down to those whose
 * LOCAL hour (per `agency_clients.timezone`) falls in the 06:00–07:59 send
 * window. This matches the plan's "Fri 07:00 client-local" requirement
 * without needing a per-client schedule.
 *
 * Why hourly + per-client filter rather than 24× per-tz cron entries:
 *   - Netlify scheduled functions are global, not per-region.
 *   - The world has ~38 distinct active offsets (incl. 30/45-min ones); a
 *     base-rate cron + in-function tz filter scales to any timezone set
 *     without netlify.toml churn.
 *
 * Schedule:
 *   '0 6-15 * * 5'  — every hour from 06:00 UTC through 15:00 UTC on Fridays.
 *   06:00 UTC covers UTC+0 to +1 morning slots; 15:00 UTC covers UTC-9 (Alaska)
 *   morning slot. Anything outside that horizon would be unusual for our
 *   target verticals (US + EU local-service businesses).
 *
 * What it does per tick:
 *   1. Load live clients (any sku — Friday report ships for ALL live clients).
 *   2. For each, compute current local hour-of-day from agency_clients.timezone.
 *   3. If local hour ∈ [SEND_LOCAL_HOUR_MIN, SEND_LOCAL_HOUR_MAX), POST
 *      `/api/agency-reporting-scribe` with `{ client_id }`.
 *   4. Dedupe via a kernel check: skip if a `report_sent` event was already
 *      emitted for this client today (UTC date). This is the SAFETY NET for
 *      the case where two ticks both happen to fall inside the same client's
 *      send window (timezone boundaries, DST transitions, etc.).
 *
 * Failure handling: matches monday-creative — each client wrapped, errors
 * logged + telemetry, never block other clients.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'cron-friday-report';
const TARGET_FN = 'agency-reporting-scribe';
const SEND_LOCAL_HOUR_MIN = 6;  // inclusive — 06:00 client-local
const SEND_LOCAL_HOUR_MAX = 8;  // exclusive — 07:59 client-local; 8-hour wide hit window
const PER_CLIENT_TIMEOUT_MS = 90_000; // reporting-scribe latency budget is ~30s; pad for cold start
const REPORT_SEND_DOW_UTC = 5; // Friday, in case the cron fires due to DST shift

interface LiveClient {
  id: string;
  business_name: string | null;
  timezone: string | null;
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
    console.error('[agency-cron-friday-report] failed to load clients:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'failed to load clients' }),
    };
  }

  const fanned: Array<{ client_id: string; local_hour: number | null; status?: number }> = [];
  const skipped: Array<{ client_id: string; reason: string; local_hour?: number | null }> = [];

  for (const c of clients) {
    const localHour = computeLocalHour(now, c.timezone);
    // Manual single-client invocations always send; cron invocations honor the window.
    const inWindow =
      force || onlyClientId !== null
        ? true
        : isInSendWindow(now, localHour);
    if (!inWindow) {
      skipped.push({ client_id: c.id, reason: 'outside-local-window', local_hour: localHour });
      continue;
    }

    // Dedupe: did we already send a report for this client today?
    const alreadySent = await alreadySentToday(c.id, now);
    if (alreadySent && !force) {
      skipped.push({ client_id: c.id, reason: 'already-sent-today', local_hour: localHour });
      continue;
    }

    try {
      const r = await postToReportingScribe(c.id);
      fanned.push({ client_id: c.id, local_hour: localHour, status: r.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agency-cron-friday-report] client ${c.id} failed: ${msg}`);
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
            `Friday report fan-out failed. The hourly tick will re-attempt for the next ` +
            `eligible window today; dedupe gate prevents double-send if it succeeds later.`,
        });
      } catch {
        /* swallow */
      }
    }
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-cron-friday-report] tick utc=${now.toISOString()} dow=${now.getUTCDay()} ` +
      `fanned=${fanned.length} skipped=${skipped.length} latency=${latency_ms}ms`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tick_utc: now.toISOString(),
      utc_day_of_week: now.getUTCDay(),
      expected_day_of_week: REPORT_SEND_DOW_UTC,
      fanned_count: fanned.length,
      skipped_count: skipped.length,
      latency_ms,
      fanned,
      skipped,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-cron-friday-report', inner);

// ───────────────────────────────────────────────────────────────────────────
//   Helpers
// ───────────────────────────────────────────────────────────────────────────

async function loadLiveClients(onlyId: string | null): Promise<LiveClient[]> {
  const supabase = getServiceSupabase();
  let q = supabase
    .from('agency_clients')
    .select('id, business_name, timezone')
    .eq('status', 'live');
  if (onlyId) q = q.eq('id', onlyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LiveClient[];
}

/**
 * Compute the client's current hour-of-day in their local timezone. Uses
 * Intl.DateTimeFormat which is the only timezone-aware option in the Node
 * Netlify runtime without adding a tz library. Returns null if the tz string
 * is unparseable (in which case we default to "out of window" — safer than
 * sending at an unknown hour).
 */
function computeLocalHour(now: Date, tz: string | null): number | null {
  if (!tz) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: tz,
    });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    if (!hourPart) return null;
    const n = Number(hourPart);
    // Intl can emit '24' for midnight in some runtimes; normalize.
    return Number.isFinite(n) ? n % 24 : null;
  } catch {
    return null;
  }
}

function isInSendWindow(now: Date, localHour: number | null): boolean {
  if (localHour === null) return false;
  if (now.getUTCDay() !== REPORT_SEND_DOW_UTC) return false;
  return localHour >= SEND_LOCAL_HOUR_MIN && localHour < SEND_LOCAL_HOUR_MAX;
}

/**
 * Dedupe gate: prevents two-ticks-in-the-same-window from sending two reports.
 * Uses `report_sent` event presence (not a separate locks table) so the audit
 * trail is the source of truth. The reporting-scribe runner emits this event
 * as soon as the PDF ships.
 */
async function alreadySentToday(client_id: string, now: Date): Promise<boolean> {
  const supabase = getServiceSupabase();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const { count, error } = await supabase
    .from('agency_events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client_id)
    .eq('type', 'report_sent')
    .gte('created_at', dayStart);
  if (error) {
    console.warn(`[agency-cron-friday-report] dedupe check failed: ${error.message}`);
    // Fail open — better to risk a duplicate Friday report than to miss one.
    return false;
  }
  return (count ?? 0) > 0;
}

async function postToReportingScribe(client_id: string): Promise<{ ok: boolean; status: number }> {
  const base = (process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org').replace(/\/+$/, '');
  const target = `${base}/.netlify/functions/${TARGET_FN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Trigger': 'friday-auto-report',
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
