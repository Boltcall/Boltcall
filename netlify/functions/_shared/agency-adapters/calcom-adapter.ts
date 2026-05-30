/**
 * Cal.com Adapter — Agency OS Layer 4 (Drivers)
 *
 * Per plan i-ahev-so-much-steady-frog.md §6:
 *   - Stateless. All state lives in Supabase.
 *   - Idempotent where possible (external IDs as keys).
 *   - Emit `agency_events` on every call (debug success / error failure).
 *   - Single retry with backoff on transient errors. No silent retries.
 *   - Field-whitelist all outbound payloads (no leaking caller data into Cal.com).
 *
 * This is the ONLY place in the OS that talks to Cal.com's API.
 * Agents (intake-officer, agent-architect, etc.) call these functions —
 * never `fetch('https://api.cal.com/...')` from anywhere else.
 *
 * Wire mirrors the live pattern in netlify/functions/calcom-webhook.ts.
 */

import {
  emitAgencyEvent,
  type AgencyEventType,
  type AgencyEventSeverity,
} from '../emit-agency-event';

// ───────────────────────────── Config ─────────────────────────────

const CAL_API_BASE = 'https://api.cal.com/v1';
const CAL_API_KEY =
  process.env.CALCOM_API_KEY || process.env.CAL_API_KEY || '';

const RETRY_BACKOFF_MS = 750; // single retry, then give up
const FETCH_TIMEOUT_MS = 15_000;

// ───────────────────────────── Types ──────────────────────────────

export type BookingStatus = 'accepted' | 'cancelled' | 'no_show';

export interface CreateEventTypeOpts {
  client_id: string;
  name: string;
  duration_min: number;
  slug: string;
  /** Cal.com username (e.g. 'noam') OR team slug whose calendar owns the event. */
  scheduling_url_owner: string;
}

export interface CreateEventTypeResult {
  event_type_id: number;
  public_url: string;
}

export interface GetBookingsOpts {
  client_id: string;
  event_type_id?: number;
  /** ISO 8601 */
  since: string;
  /** ISO 8601 */
  until: string;
}

export interface BookingRecord {
  booking_id: number;
  started_at: string;
  attendee_email: string;
  attendee_name: string;
  status: BookingStatus;
}

export interface CancelBookingOpts {
  booking_id: number;
  reason: string;
}

export interface PauseEventTypeOpts {
  event_type_id: number;
}

export interface GetAvailabilityOpts {
  event_type_id: number;
  /** ISO 8601 date (YYYY-MM-DD or full datetime) */
  date_from: string;
  date_to: string;
}

export interface AvailabilitySlot {
  slot_start: string;
  slot_end: string;
}

export interface SetupClientIntakeBookingOpts {
  client_id: string;
  /** Email on the founder's Cal.com account (calendar owner for intake calls). */
  founder_calendar_email: string;
}

// ────────────────── Field whitelists (outbound) ──────────────────
//
// Rule: nothing flows to Cal.com that isn't named here. Prevents accidental
// leakage of internal IDs, PII, or unrelated agent payload into a 3rd-party.

const EVENT_TYPE_CREATE_WHITELIST = [
  'title',
  'slug',
  'length',
  'description',
  'hidden',
  'requiresConfirmation',
  'disableGuests',
  'schedulingType',
] as const;

const BOOKING_CANCEL_WHITELIST = ['cancellationReason'] as const;

const EVENT_TYPE_UPDATE_WHITELIST = ['hidden', 'length', 'title'] as const;

function pick(
  source: Record<string, any>,
  allowed: readonly string[],
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of allowed) {
    if (source[k] !== undefined) out[k] = source[k];
  }
  return out;
}

// ─────────────────────── Event sink ───────────────────────────────

/**
 * Emit a kernel agency_events row via the shared helper. Best-effort — adapter
 * never throws on telemetry failure.
 *
 * Spec §7 (calcom-adapter rules): dotted op strings are NOT valid event types.
 * Map to allowed AgencyEventType with the original op moved into payload.op.
 * `.ok` and `.retry` for any op drop to console.debug / console.warn —
 * only `.error` paths emit a kernel `adapter_error`.
 */
async function emitEvent(args: {
  client_id?: string;
  type: AgencyEventType;
  severity: AgencyEventSeverity;
  payload: Record<string, any>;
}): Promise<void> {
  try {
    await emitAgencyEvent({
      client_id: args.client_id ?? '',
      agent_name: 'calcom-adapter',
      type: args.type,
      severity: args.severity,
      payload: args.payload,
    });
  } catch (e) {
    // Telemetry must never break the operation.
    console.warn('[calcom-adapter] event emit failed:', e);
  }
}

/** Spec §7: success telemetry drops to console.debug — no kernel event. */
function debugLog(op: string, payload: Record<string, unknown>): void {
  console.debug(`[calcom-adapter] ${op}.ok`, payload);
}

/** Spec §7: retry telemetry drops to console.warn — no kernel event. */
function warnRetry(op: string, payload: Record<string, unknown>): void {
  console.warn(`[calcom-adapter] ${op}.retry`, payload);
}

/** Spec §7: emit a kernel adapter_error event for .error paths. */
async function emitCalcomError(args: {
  client_id?: string;
  op: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const description =
    typeof args.payload.error === 'string'
      ? args.payload.error
      : `${String(args.payload.method ?? '')} ${String(args.payload.path ?? '')} failed`;
  await emitEvent({
    client_id: args.client_id,
    type: 'adapter_error',
    severity: 'error',
    payload: {
      adapter: 'calcom-adapter',
      operation: args.op,
      op: args.op,
      error_message: description,
      ...args.payload,
    },
  });
}

// ───────────────────────── HTTP plumbing ──────────────────────────

class CalcomError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message || `Cal.com API error ${status}: ${body.slice(0, 200)}`);
    this.name = 'CalcomError';
    this.status = status;
    this.body = body;
  }
}

function requireApiKey(): string {
  if (!CAL_API_KEY) {
    throw new Error(
      '[calcom-adapter] CALCOM_API_KEY (or CAL_API_KEY) is not set',
    );
  }
  return CAL_API_KEY;
}

function withApiKey(path: string, qs: Record<string, string> = {}): string {
  const url = new URL(`${CAL_API_BASE}${path}`);
  url.searchParams.set('apiKey', requireApiKey());
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * One retry with linear backoff on transient errors (network failure, 429,
 * 5xx). 4xx (other than 429) are caller errors — fail fast, do not retry.
 */
async function calRequest<T = any>(opts: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string>;
  body?: Record<string, any>;
  context: string; // for event payload
  client_id?: string;
}): Promise<T> {
  const url = withApiKey(opts.path, opts.query);
  const init: RequestInit = {
    method: opts.method,
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  };

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const startedAt = Date.now();
    try {
      const res = await fetchWithTimeout(url, init);
      const latency_ms = Date.now() - startedAt;
      const text = await res.text();

      if (res.ok) {
        // Spec §7: success drops to console.debug — no kernel event.
        debugLog(opts.context, {
          method: opts.method,
          path: opts.path,
          status: res.status,
          latency_ms,
          attempt,
        });
        return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
      }

      // Retry only on 429 / 5xx
      const transient = res.status === 429 || res.status >= 500;
      if (transient && attempt === 0) {
        warnRetry(opts.context, {
          method: opts.method,
          path: opts.path,
          status: res.status,
          latency_ms,
          body_snippet: text.slice(0, 300),
        });
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        continue;
      }

      await emitCalcomError({
        client_id: opts.client_id,
        op: opts.context,
        payload: {
          method: opts.method,
          path: opts.path,
          status: res.status,
          duration_ms: latency_ms,
          error: text.slice(0, 500),
        },
      });
      throw new CalcomError(res.status, text);
    } catch (err: any) {
      lastErr = err;
      const isAbort = err?.name === 'AbortError';
      const isNetwork = !(err instanceof CalcomError);
      if (isNetwork && attempt === 0) {
        warnRetry(opts.context, {
          method: opts.method,
          path: opts.path,
          error: String(err?.message || err),
          timed_out: isAbort,
        });
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        continue;
      }
      if (!(err instanceof CalcomError)) {
        await emitCalcomError({
          client_id: opts.client_id,
          op: opts.context,
          payload: {
            method: opts.method,
            path: opts.path,
            error: String(err?.message || err),
            timed_out: isAbort,
          },
        });
      }
      throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('[calcom-adapter] unknown error');
}

// ───────────────────────── Public API ─────────────────────────────

/**
 * Create a Cal.com event type for a client.
 *
 * @returns the Cal.com numeric event_type_id and the public scheduling URL
 *          (https://cal.com/<owner>/<slug>) the client / leads can book on.
 */
export async function createEventType(
  opts: CreateEventTypeOpts,
): Promise<CreateEventTypeResult> {
  const payload = pick(
    {
      title: opts.name,
      slug: opts.slug,
      length: opts.duration_min,
      hidden: false,
      requiresConfirmation: false,
      disableGuests: false,
    },
    EVENT_TYPE_CREATE_WHITELIST,
  );

  const result = await calRequest<{
    event_type?: { id: number };
    id?: number;
  }>({
    method: 'POST',
    path: '/event-types',
    body: payload,
    context: 'createEventType',
    client_id: opts.client_id,
  });

  const event_type_id =
    (result as any)?.event_type?.id ?? (result as any)?.id;
  if (!event_type_id || typeof event_type_id !== 'number') {
    await emitEvent({
      client_id: opts.client_id,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: 'calcom-adapter',
        operation: 'createEventType.malformed_response',
        op: 'createEventType.malformed_response',
        error_message: 'Cal.com did not return an event_type id',
        description: JSON.stringify(result).slice(0, 500),
      },
    });
    throw new Error(
      '[calcom-adapter] createEventType: Cal.com did not return an event_type id',
    );
  }

  const public_url = `https://cal.com/${encodeURIComponent(
    opts.scheduling_url_owner,
  )}/${encodeURIComponent(opts.slug)}`;

  await emitEvent({
    client_id: opts.client_id,
    type: 'calendar_event_created',
    severity: 'info',
    payload: {
      event_type_id,
      slug: opts.slug,
      duration_min: opts.duration_min,
      owner: opts.scheduling_url_owner,
      public_url,
      op: 'event_type.created',
    },
  });

  return { event_type_id, public_url };
}

/**
 * Fetch bookings for a client. Optionally scoped to a single event_type_id.
 *
 * Maps Cal.com's status taxonomy to the OS's 3-state model:
 *   ACCEPTED | PENDING                -> 'accepted'
 *   CANCELLED | REJECTED              -> 'cancelled'
 *   no_show flag set on attendee row  -> 'no_show'
 */
export async function getBookings(
  opts: GetBookingsOpts,
): Promise<BookingRecord[]> {
  const query: Record<string, string> = {
    dateFrom: opts.since,
    dateTo: opts.until,
  };
  if (opts.event_type_id) query.eventTypeId = String(opts.event_type_id);

  const raw = await calRequest<{ bookings?: any[] }>({
    method: 'GET',
    path: '/bookings',
    query,
    context: 'getBookings',
    client_id: opts.client_id,
  });

  const items = Array.isArray(raw?.bookings) ? raw.bookings : [];
  const bookings: BookingRecord[] = items.map((b: any) => {
    const attendee = Array.isArray(b?.attendees) ? b.attendees[0] : null;
    const noShow = attendee?.noShow === true || b?.noShow === true;
    const rawStatus = String(b?.status || '').toUpperCase();
    let status: BookingStatus = 'accepted';
    if (noShow) status = 'no_show';
    else if (rawStatus === 'CANCELLED' || rawStatus === 'REJECTED')
      status = 'cancelled';

    return {
      booking_id: Number(b?.id),
      started_at: String(b?.startTime || b?.start_time || ''),
      attendee_email: String(attendee?.email || ''),
      attendee_name: String(attendee?.name || ''),
      status,
    };
  });

  await emitEvent({
    client_id: opts.client_id,
    type: 'booking_fetched',
    severity: 'debug',
    payload: {
      count: bookings.length,
      event_type_id: opts.event_type_id ?? null,
      since: opts.since,
      until: opts.until,
      op: 'bookings.fetched',
    },
  });

  return bookings;
}

/**
 * Cancel a booking. Reason is whitelisted into `cancellationReason`.
 */
export async function cancelBooking(
  opts: CancelBookingOpts,
): Promise<{ cancelled_at: string }> {
  const body = pick(
    { cancellationReason: opts.reason },
    BOOKING_CANCEL_WHITELIST,
  );

  await calRequest<unknown>({
    method: 'DELETE',
    path: `/bookings/${encodeURIComponent(String(opts.booking_id))}/cancel`,
    body,
    context: 'cancelBooking',
  });

  const cancelled_at = new Date().toISOString();
  await emitEvent({
    type: 'booking_cancelled',
    severity: 'info',
    payload: {
      booking_id: opts.booking_id,
      reason: opts.reason,
      cancelled_at,
      op: 'booking.cancelled',
    },
  });
  return { cancelled_at };
}

/**
 * Pause an event type — Cal.com models "paused" as `hidden: true` on the
 * event type. Bookings already on the calendar are preserved; no new ones
 * can be created until it is un-hidden.
 */
export async function pauseEventType(
  opts: PauseEventTypeOpts,
): Promise<{ paused_at: string }> {
  const body = pick({ hidden: true }, EVENT_TYPE_UPDATE_WHITELIST);

  await calRequest<unknown>({
    method: 'PATCH',
    path: `/event-types/${encodeURIComponent(String(opts.event_type_id))}`,
    body,
    context: 'pauseEventType',
  });

  const paused_at = new Date().toISOString();
  await emitEvent({
    type: 'calendar_event_created',
    severity: 'info',
    payload: {
      event_type_id: opts.event_type_id,
      paused_at,
      op: 'event_type.paused',
    },
  });
  return { paused_at };
}

/**
 * Fetch available slots for an event type over a date range.
 */
export async function getAvailability(
  opts: GetAvailabilityOpts,
): Promise<AvailabilitySlot[]> {
  const raw = await calRequest<{ slots?: Record<string, any[]> }>({
    method: 'GET',
    path: '/availability',
    query: {
      eventTypeId: String(opts.event_type_id),
      dateFrom: opts.date_from,
      dateTo: opts.date_to,
    },
    context: 'getAvailability',
  });

  // Cal.com returns { slots: { 'YYYY-MM-DD': [{ time: ISO }, ...] } }
  const out: AvailabilitySlot[] = [];
  const slotsByDay = raw?.slots ?? {};
  for (const day of Object.keys(slotsByDay)) {
    const arr = slotsByDay[day];
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      const slot_start = String(s?.time || s?.start || '');
      if (!slot_start) continue;
      // Cal.com's /availability does not always include slot length; derive
      // from the start by adding `length` if present on the slot, otherwise
      // leave end == start so consumers can re-derive from event type.
      const slot_end = s?.end
        ? String(s.end)
        : s?.length
        ? new Date(
            new Date(slot_start).getTime() + Number(s.length) * 60_000,
          ).toISOString()
        : slot_start;
      out.push({ slot_start, slot_end });
    }
  }

  // Spec §7: availability.fetched is too noisy for the kernel — debug only.
  debugLog('availability.fetched', {
    event_type_id: opts.event_type_id,
    date_from: opts.date_from,
    date_to: opts.date_to,
    slot_count: out.length,
  });

  return out;
}

/**
 * Provision the 20-min intake event type used by `intake-officer`
 * (plan §5, Agent #1). Deterministic slug = `intake-<client_id_short>` so
 * repeated calls for the same client are idempotent on Cal.com's side.
 *
 * Returns the public scheduling URL that gets pasted into the welcome email
 * (see `client-onboarded` n8n workflow, plan §4).
 */
export async function setupClientIntakeBooking(
  opts: SetupClientIntakeBookingOpts,
): Promise<{ scheduling_url: string }> {
  const slug = `intake-${opts.client_id.slice(0, 8)}`;
  // Derive the Cal.com username from the founder email's local part. Cal.com
  // public URLs are `cal.com/<username>/<slug>` — the founder's username is
  // assumed to match the local part of the email they registered with. If
  // your setup differs, set CAL_FOUNDER_USERNAME and we'll prefer that.
  const owner =
    process.env.CAL_FOUNDER_USERNAME ||
    opts.founder_calendar_email.split('@')[0];

  try {
    const { public_url } = await createEventType({
      client_id: opts.client_id,
      name: 'Boltcall Intake Call (20 min)',
      duration_min: 20,
      slug,
      scheduling_url_owner: owner,
    });

    await emitEvent({
      client_id: opts.client_id,
      type: 'calendar_event_created',
      severity: 'info',
      payload: {
        slug,
        owner,
        scheduling_url: public_url,
        op: 'intake_booking.ready',
      },
    });

    return { scheduling_url: public_url };
  } catch (err: any) {
    // If the event type already exists (HTTP 409 / "slug already taken"),
    // treat as success and return the deterministic URL — keeps the
    // boot-sequence idempotent if Stripe re-fires the webhook.
    const isConflict =
      err instanceof CalcomError &&
      (err.status === 409 ||
        /already.*exist|slug.*taken|duplicate/i.test(err.body));
    if (isConflict) {
      const scheduling_url = `https://cal.com/${encodeURIComponent(
        owner,
      )}/${encodeURIComponent(slug)}`;
      await emitEvent({
        client_id: opts.client_id,
        type: 'calendar_event_created',
        severity: 'info',
        payload: {
          slug,
          owner,
          scheduling_url,
          op: 'intake_booking.idempotent_hit',
        },
      });
      return { scheduling_url };
    }
    throw err;
  }
}

// ─────────────────────────── Test hooks ──────────────────────────

export const __internal = {
  pick,
  CAL_API_BASE,
  RETRY_BACKOFF_MS,
  FETCH_TIMEOUT_MS,
};
