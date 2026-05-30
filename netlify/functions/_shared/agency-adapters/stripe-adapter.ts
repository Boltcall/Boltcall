/**
 * Stripe Adapter — Agency OS Layer 4 (Drivers)
 *
 * Per plan i-ahev-so-much-steady-frog.md §6:
 *   - Stateless. All state lives in Supabase.
 *   - Idempotent where possible (Stripe IDs are the keys).
 *   - Emit `agency_events` on every call (debug success / error failure).
 *   - Single retry with backoff on transient errors. No silent retries.
 *
 * PII rule (plan §6 + Layer 4 adapter rules):
 *   Customer IDs and subscription IDs are PII-adjacent — never log them in
 *   plain text. Every event payload + log line goes through `maskId()` which
 *   keeps only the last 4 characters (e.g. `cus_***Lq3F`). The unmasked id is
 *   only ever sent to Stripe itself (which already knows it) and returned to
 *   the caller in the typed result.
 *
 * This is the ONLY place in the OS that talks to Stripe. Agents / Netlify
 * functions call these exports — never `new Stripe(...)` elsewhere in the
 * Agency OS code path.
 *
 * Pattern mirrors the live wire in netlify/functions/stripe-webhook.ts.
 */

import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ───────────────────────────── Config ─────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET =
  // Allow the Agency OS to use its own webhook secret if configured separately
  // from the main Boltcall SaaS webhook. Falls back to the existing secret so
  // the kernel works out-of-the-box.
  process.env.AGENCY_STRIPE_WEBHOOK_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  '';

// Match the API version used in netlify/functions/stripe-webhook.ts so the
// adapter and the existing SaaS webhook never disagree on event shapes. The
// `as any` cast is intentional: the installed Stripe SDK typings have moved
// to a newer API version, but the SaaS account is still pinned to this one
// (changing requires a coordinated Stripe Dashboard rotation). Once the
// platform pin is bumped, drop the cast.
const STRIPE_API_VERSION = '2025-04-30.basil' as Stripe.LatestApiVersion;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://hbwogktdajorojljkjwg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const RETRY_BACKOFF_MS = 750; // single retry, then give up
const STRIPE_TIMEOUT_MS = 15_000;

// ───────────────────────────── Types ──────────────────────────────

export interface GetSubscriptionStatusOpts {
  stripe_subscription_id: string;
}

export interface GetSubscriptionStatusResult {
  status: Stripe.Subscription.Status;
  current_period_end: string; // ISO-8601
  latest_invoice_status: Stripe.Invoice.Status | 'none';
  mrr_usd: number; // monthly recurring revenue normalized to USD
}

export interface CreatePortalLinkOpts {
  stripe_customer_id: string;
  return_url: string;
}

export interface CreatePortalLinkResult {
  portal_url: string;
}

export interface GetInvoicesOpts {
  stripe_customer_id: string;
  limit?: number;
}

export interface InvoiceRecord {
  invoice_id: string;
  amount_usd: number;
  status: Stripe.Invoice.Status | 'unknown';
  due_date: string | null; // ISO-8601 or null
  paid_at: string | null; // ISO-8601 or null
}

export interface HandleSubscriptionEventOpts {
  raw_body: string | Buffer;
  signature_header: string | undefined | null;
}

export type AgencyOsAction =
  | 'mark_churned'
  | 'mark_paused'
  | 'mark_live'
  | 'noop';

export interface HandleSubscriptionEventResult {
  event_type: string;
  customer_id?: string;
  subscription_id?: string;
  action_required: AgencyOsAction;
}

export interface SetMetadataOpts {
  customer_id: string;
  metadata: Record<string, string>;
}

export interface SetMetadataResult {
  updated_at: string;
}

// ─────────────────────────── PII masking ──────────────────────────
//
// Stripe IDs are PII-adjacent: with one ID + Stripe key, an attacker can pull
// the customer's email, name, payment method last4, billing address, etc.
// Logs ship to console (Netlify drains → 3rd-party log sinks) and to
// agency_events.payload (visible to anyone with Supabase access). Both are
// outside Stripe's PII boundary — so we mask.
//
// Format: <prefix>_***<last 4>. Preserves enough signal to debug ("oh that's
// a subscription, not a customer") without exposing the ID itself.
const MASK_TAIL_LEN = 4;

export function maskId(id: string | null | undefined): string {
  if (!id) return '<none>';
  if (typeof id !== 'string') return '<invalid>';
  if (id.length <= MASK_TAIL_LEN) return `***${id}`;
  // Stripe IDs look like `cus_NjK2…Lq3F` or `sub_1NX…Lq3F`. Keep the type
  // prefix (everything before the first `_`) so we can tell objects apart.
  const underscoreIdx = id.indexOf('_');
  if (underscoreIdx > 0 && underscoreIdx < id.length - MASK_TAIL_LEN) {
    const prefix = id.slice(0, underscoreIdx);
    const tail = id.slice(-MASK_TAIL_LEN);
    return `${prefix}_***${tail}`;
  }
  return `***${id.slice(-MASK_TAIL_LEN)}`;
}

// ─────────────────────── Supabase event sink ──────────────────────

let _serviceClient: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_KEY) return null;
  if (!_serviceClient) {
    _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

/**
 * Emit an `agency_events` row. Best-effort — adapter NEVER throws on telemetry
 * failure. Mirrors the shape from plan §3.
 *
 * Prefers the shared `emit-agency-event` helper (plan §12) if it ships;
 * otherwise writes directly to `agency_events` so this adapter is
 * self-contained and the rest of the OS can be built in any order.
 *
 * IMPORTANT: payload values are caller-controlled. The caller MUST pre-mask
 * any customer / subscription IDs via `maskId()` before passing them here.
 */
async function emitEvent(args: {
  client_id?: string;
  type: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  payload: Record<string, any>;
}): Promise<void> {
  try {
    // Try the shared helper first.
    try {
      const mod: any = await import('../emit-agency-event' as any).catch(
        () => null,
      );
      if (mod && typeof mod.emitAgencyEvent === 'function') {
        await mod.emitAgencyEvent({
          client_id: args.client_id,
          agent_name: 'stripe-adapter',
          type: args.type,
          severity: args.severity,
          payload: args.payload,
        });
        return;
      }
    } catch {
      // Fall through to direct insert.
    }

    const sb = getServiceClient();
    if (!sb) return;
    await sb.from('agency_events').insert({
      client_id: args.client_id ?? null,
      agent_name: 'stripe-adapter',
      type: args.type,
      severity: args.severity,
      payload: args.payload,
    });
  } catch (e) {
    // Telemetry must never break the operation.
    console.warn('[stripe-adapter] event emit failed:', e);
  }
}

// ───────────────────────── Stripe plumbing ────────────────────────

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('[stripe-adapter] STRIPE_SECRET_KEY is not set');
  }
  if (!_stripe) {
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      timeout: STRIPE_TIMEOUT_MS,
      // Stripe SDK has its own retry logic; we layer one additional retry on
      // top for our event emission accounting and consistent backoff.
      maxNetworkRetries: 0,
    });
  }
  return _stripe;
}

function isTransientStripeError(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) {
    // Generic network / fetch errors → transient.
    return true;
  }
  // Stripe SDK error type taxonomy: rate-limit and connection errors retry.
  // Auth / invalid-request / card errors do NOT retry — those are caller bugs.
  if (err instanceof Stripe.errors.StripeRateLimitError) return true;
  if (err instanceof Stripe.errors.StripeConnectionError) return true;
  if (err instanceof Stripe.errors.StripeAPIError) {
    const status = (err as any).statusCode as number | undefined;
    return typeof status === 'number' && status >= 500;
  }
  return false;
}

/**
 * Wrap a Stripe SDK call with one retry on transient errors, latency
 * instrumentation, and a sanitized event emission. The caller passes pre-
 * masked IDs in `event_payload` — this wrapper does NOT see raw customer IDs.
 */
async function stripeRequest<T>(opts: {
  op: string; // short label, e.g. 'subscriptions.retrieve'
  client_id?: string;
  /** Pre-masked payload — must NOT contain raw customer / subscription IDs. */
  event_payload: Record<string, any>;
  exec: () => Promise<T>;
}): Promise<T> {
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const startedAt = Date.now();
    try {
      const result = await opts.exec();
      const latency_ms = Date.now() - startedAt;
      await emitEvent({
        client_id: opts.client_id,
        type: `stripe.${opts.op}.ok`,
        severity: 'debug',
        payload: { ...opts.event_payload, latency_ms, attempt },
      });
      return result;
    } catch (err: any) {
      lastErr = err;
      const latency_ms = Date.now() - startedAt;
      const transient = isTransientStripeError(err);
      const status =
        (err instanceof Stripe.errors.StripeError && (err as any).statusCode) ||
        undefined;

      if (transient && attempt === 0) {
        await emitEvent({
          client_id: opts.client_id,
          type: `stripe.${opts.op}.retry`,
          severity: 'warn',
          payload: {
            ...opts.event_payload,
            latency_ms,
            status,
            error_type: err?.type ?? err?.name ?? 'unknown',
            // err.message from Stripe SDK is safe (no PII), but we still trim.
            error_message: String(err?.message ?? '').slice(0, 300),
          },
        });
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        continue;
      }

      await emitEvent({
        client_id: opts.client_id,
        type: `stripe.${opts.op}.error`,
        severity: 'error',
        payload: {
          ...opts.event_payload,
          latency_ms,
          status,
          error_type: err?.type ?? err?.name ?? 'unknown',
          error_message: String(err?.message ?? '').slice(0, 500),
        },
      });
      throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('[stripe-adapter] unknown error');
}

// ─────────────────────────── Helpers ──────────────────────────────

/**
 * Normalize any Stripe amount (in the smallest currency unit) to a USD float.
 * For non-USD subscriptions, we apply a simple FX rate so MRR is comparable
 * across all clients. Rates are env-overridable (STRIPE_FX_RATE_<CCY>) and
 * default to widely-stable ballparks suitable for portfolio-level reporting;
 * accounting-grade conversion happens in the finance pipeline, not here.
 */
function toUsd(amount_in_minor: number, currency: string): number {
  if (!Number.isFinite(amount_in_minor) || amount_in_minor === 0) return 0;
  const ccy = (currency || 'usd').toLowerCase();
  // Most currencies use 2 decimal places. The zero-decimal exceptions are rare
  // in subscription billing (JPY, KRW, etc.); list them explicitly.
  const ZERO_DECIMAL = new Set([
    'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw',
    'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
  ]);
  const divisor = ZERO_DECIMAL.has(ccy) ? 1 : 100;
  const amount_in_major = amount_in_minor / divisor;

  if (ccy === 'usd') return amount_in_major;

  const envOverride = parseFloat(
    process.env[`STRIPE_FX_RATE_${ccy.toUpperCase()}`] || '',
  );
  if (Number.isFinite(envOverride) && envOverride > 0) {
    return amount_in_major * envOverride;
  }

  // Conservative defaults — good enough for "is this client > $X MRR" decisions.
  // For tax / accounting, downstream pipelines should use a live FX feed.
  const DEFAULT_FX: Record<string, number> = {
    ils: 0.27, // ₪ → $
    eur: 1.08,
    gbp: 1.27,
    cad: 0.74,
    aud: 0.66,
  };
  const rate = DEFAULT_FX[ccy];
  if (typeof rate === 'number') return amount_in_major * rate;

  // Unknown currency → return as-is so the value is visible (and inspectable)
  // rather than silently zeroed out.
  return amount_in_major;
}

/**
 * Compute monthly recurring revenue (USD) from a Stripe Subscription.
 *
 * Sums each subscription item's recurring amount, normalizing the interval to
 * "1 month" (annual / unit_amount = monthly).
 */
function computeMrrUsd(sub: Stripe.Subscription): number {
  let total = 0;
  for (const item of sub.items?.data ?? []) {
    const price = item.price;
    if (!price || !price.recurring) continue;
    const unit = price.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    const amount = unit * qty;
    const interval = price.recurring.interval; // 'day' | 'week' | 'month' | 'year'
    const intervalCount = price.recurring.interval_count || 1;
    let monthlyMinor = 0;
    switch (interval) {
      case 'day':
        monthlyMinor = (amount / intervalCount) * 30;
        break;
      case 'week':
        monthlyMinor = (amount / intervalCount) * (52 / 12);
        break;
      case 'month':
        monthlyMinor = amount / intervalCount;
        break;
      case 'year':
        monthlyMinor = amount / intervalCount / 12;
        break;
      default:
        monthlyMinor = amount;
    }
    total += toUsd(monthlyMinor, price.currency);
  }
  // Round to cents.
  return Math.round(total * 100) / 100;
}

function tsToIso(ts: number | null | undefined): string | null {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

/**
 * Map a Stripe event to the Agency OS action that should be applied to
 * `agency_clients.status`. The webhook handler owns the write; this is purely
 * a recommendation derived from the event shape.
 *
 * Mapping (intentionally conservative — when in doubt, return 'noop' and let
 * the founder review):
 *   subscription.deleted                     → mark_churned
 *   subscription.updated (status=canceled)   → mark_churned
 *   subscription.updated (status=paused|
 *                         past_due|unpaid)   → mark_paused
 *   subscription.updated (status=active|
 *                         trialing)          → mark_live
 *   subscription.created (status=active|
 *                         trialing)          → mark_live
 *   checkout.session.completed (sub mode)    → mark_live
 *   invoice.payment_failed                   → mark_paused
 *   invoice.paid                             → noop (status follows the sub)
 *   anything else                            → noop
 */
function recommendAction(event: Stripe.Event): {
  action: AgencyOsAction;
  customer_id?: string;
  subscription_id?: string;
} {
  switch (event.type) {
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        action: 'mark_churned',
        customer_id:
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
        subscription_id: sub.id,
      };
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const customer_id =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      let action: AgencyOsAction = 'noop';
      switch (sub.status) {
        case 'canceled':
          action = 'mark_churned';
          break;
        case 'paused':
        case 'past_due':
        case 'unpaid':
        case 'incomplete_expired':
          action = 'mark_paused';
          break;
        case 'active':
        case 'trialing':
          action = 'mark_live';
          break;
        default:
          action = 'noop';
      }
      return { action, customer_id, subscription_id: sub.id };
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') {
        return {
          action: 'noop',
          customer_id:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id,
        };
      }
      return {
        action: 'mark_live',
        customer_id:
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id,
        subscription_id:
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id,
      };
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      return {
        action: 'mark_paused',
        customer_id:
          typeof inv.customer === 'string' ? inv.customer : inv.customer?.id,
        subscription_id:
          typeof (inv as any).subscription === 'string'
            ? ((inv as any).subscription as string)
            : (inv as any).subscription?.id,
      };
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      return {
        action: 'noop',
        customer_id:
          typeof inv.customer === 'string' ? inv.customer : inv.customer?.id,
        subscription_id:
          typeof (inv as any).subscription === 'string'
            ? ((inv as any).subscription as string)
            : (inv as any).subscription?.id,
      };
    }
    default:
      return { action: 'noop' };
  }
}

// ───────────────────────── Public API ─────────────────────────────

/**
 * Fetch the current status of a Stripe subscription plus MRR + the latest
 * invoice's status. Used by `churn-sentinel` and the per-client dashboard
 * (plan §5 #8, §9).
 */
export async function getSubscriptionStatus(
  opts: GetSubscriptionStatusOpts,
): Promise<GetSubscriptionStatusResult> {
  const stripe = getStripe();
  const masked = maskId(opts.stripe_subscription_id);

  const sub = await stripeRequest({
    op: 'subscriptions.retrieve',
    event_payload: { subscription: masked },
    exec: () =>
      stripe.subscriptions.retrieve(opts.stripe_subscription_id, {
        expand: ['latest_invoice'],
      }),
  });

  // `latest_invoice` is either expanded (Invoice object) or a string id; we
  // only need its `.status`.
  let latest_invoice_status: Stripe.Invoice.Status | 'none' = 'none';
  const latest = sub.latest_invoice;
  if (latest && typeof latest !== 'string') {
    latest_invoice_status =
      (latest.status as Stripe.Invoice.Status | null) ?? 'none';
  }

  const periodEndTs = (sub as any).current_period_end as number | undefined;
  const current_period_end = tsToIso(periodEndTs) ?? new Date(0).toISOString();
  const mrr_usd = computeMrrUsd(sub);

  await emitEvent({
    type: 'stripe.subscription.snapshot',
    severity: 'info',
    payload: {
      subscription: masked,
      status: sub.status,
      mrr_usd,
      latest_invoice_status,
    },
  });

  return {
    status: sub.status,
    current_period_end,
    latest_invoice_status,
    mrr_usd,
  };
}

/**
 * Create a Stripe Customer Portal link for self-service billing management.
 * Used by the per-client dashboard "Manage billing" button.
 *
 * `return_url` is passed straight through to Stripe — the caller is
 * responsible for validating it against an allowlist of Boltcall domains
 * (see `_shared/redirect-allowlist.ts`).
 */
export async function createPortalLink(
  opts: CreatePortalLinkOpts,
): Promise<CreatePortalLinkResult> {
  const stripe = getStripe();
  const masked = maskId(opts.stripe_customer_id);

  const session = await stripeRequest({
    op: 'billingPortal.sessions.create',
    event_payload: { customer: masked },
    exec: () =>
      stripe.billingPortal.sessions.create({
        customer: opts.stripe_customer_id,
        return_url: opts.return_url,
      }),
  });

  await emitEvent({
    type: 'stripe.portal_link.created',
    severity: 'info',
    payload: { customer: masked, return_url_host: safeHost(opts.return_url) },
  });

  return { portal_url: session.url };
}

/**
 * List recent invoices for a customer. Default limit = 12 (≈1 year of monthly
 * billing), max enforced at 100 by Stripe.
 */
export async function getInvoices(
  opts: GetInvoicesOpts,
): Promise<InvoiceRecord[]> {
  const stripe = getStripe();
  const masked = maskId(opts.stripe_customer_id);
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 100);

  const page = await stripeRequest({
    op: 'invoices.list',
    event_payload: { customer: masked, limit },
    exec: () =>
      stripe.invoices.list({ customer: opts.stripe_customer_id, limit }),
  });

  const invoices: InvoiceRecord[] = page.data.map((inv) => {
    const amount_minor =
      inv.amount_paid && inv.amount_paid > 0
        ? inv.amount_paid
        : inv.amount_due ?? 0;
    return {
      invoice_id: inv.id ?? '',
      amount_usd: toUsd(amount_minor, inv.currency || 'usd'),
      status: (inv.status as Stripe.Invoice.Status | null) ?? 'unknown',
      due_date: tsToIso(inv.due_date ?? null),
      paid_at:
        inv.status === 'paid'
          ? tsToIso(
              (inv as any).status_transitions?.paid_at ??
                (inv as any).effective_at ??
                inv.created,
            )
          : null,
    };
  });

  await emitEvent({
    type: 'stripe.invoices.listed',
    severity: 'debug',
    payload: { customer: masked, count: invoices.length, limit },
  });

  return invoices;
}

/**
 * Verify a Stripe webhook signature and recommend the Agency OS action the
 * caller should apply. Does NOT write to `agency_clients` — that's the
 * responsibility of `netlify/functions/agency-stripe-webhook.ts`, which lets
 * us keep the adapter stateless and the table-write logic in one place.
 *
 * On signature verification failure throws — the caller MUST return 400 (per
 * Stripe's webhook reliability guarantees).
 */
export async function handleSubscriptionEvent(
  opts: HandleSubscriptionEventOpts,
): Promise<HandleSubscriptionEventResult> {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      '[stripe-adapter] STRIPE_WEBHOOK_SECRET (or AGENCY_STRIPE_WEBHOOK_SECRET) is not set',
    );
  }
  if (!opts.signature_header) {
    throw new Error(
      '[stripe-adapter] handleSubscriptionEvent: missing stripe-signature header',
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      opts.raw_body,
      opts.signature_header,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    // SAFETY: do not log the raw body — could contain customer email, etc.
    await emitEvent({
      type: 'stripe.webhook.signature_invalid',
      severity: 'warn',
      payload: { error_message: String(err?.message ?? '').slice(0, 300) },
    });
    throw new Error(
      `[stripe-adapter] webhook signature verification failed: ${err?.message}`,
    );
  }

  const { action, customer_id, subscription_id } = recommendAction(event);

  await emitEvent({
    type: 'stripe.webhook.received',
    severity: action === 'noop' ? 'debug' : 'info',
    payload: {
      event_id: event.id,
      event_type: event.type,
      customer: maskId(customer_id),
      subscription: maskId(subscription_id),
      recommended_action: action,
      livemode: event.livemode,
    },
  });

  return {
    event_type: event.type,
    customer_id,
    subscription_id,
    action_required: action,
  };
}

/**
 * Merge metadata onto a Stripe Customer. Stripe metadata is upsert-semantic:
 * passing a key replaces it; passing `''` deletes it. We do NOT clear existing
 * keys not present in `opts.metadata` — agents own their own keyspace.
 *
 * Keys + values are bounded by Stripe (50 keys, 500 chars value, 40 chars key)
 * — we surface validation errors directly rather than truncating.
 */
export async function setMetadata(
  opts: SetMetadataOpts,
): Promise<SetMetadataResult> {
  const stripe = getStripe();
  const masked = maskId(opts.customer_id);

  // Defensive: Stripe rejects non-string values silently in some paths. Coerce.
  const coerced: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.metadata)) {
    coerced[k] = v == null ? '' : String(v);
  }

  await stripeRequest({
    op: 'customers.update.metadata',
    event_payload: { customer: masked, keys: Object.keys(coerced) },
    exec: () =>
      stripe.customers.update(opts.customer_id, { metadata: coerced }),
  });

  const updated_at = new Date().toISOString();
  await emitEvent({
    type: 'stripe.customer.metadata_updated',
    severity: 'info',
    payload: {
      customer: masked,
      keys: Object.keys(coerced),
      updated_at,
    },
  });

  return { updated_at };
}

// ───────────────────────── Internal utils ─────────────────────────

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid';
  }
}

// ─────────────────────────── Test hooks ──────────────────────────

export const __internal = {
  maskId,
  toUsd,
  computeMrrUsd,
  recommendAction,
  isTransientStripeError,
  STRIPE_API_VERSION,
  RETRY_BACKOFF_MS,
  STRIPE_TIMEOUT_MS,
};
