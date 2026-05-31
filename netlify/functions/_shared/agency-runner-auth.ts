/**
 * agency-runner-auth.ts — Shared authorization gate for cost-sensitive
 * agency-OS HTTP-callable runners.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The agency-* runners (creative-foundry, qa-auditor, optimization-strategist,
 * etc.) each burn real LLM dollars per invocation — some in the multi-dollar
 * range (Opus calls, Cekura simulation batches, image gen). Without
 * authorization they are public HTTP endpoints on Netlify; anyone discovering
 * the path can drain the LLM budget with a `curl` loop. This gate closes that
 * hole by requiring one of three acceptable auth modes BEFORE any expensive
 * work runs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE ACCEPTABLE AUTH METHODS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   (a) FOUNDER BEARER JWT
 *       Header: `Authorization: Bearer <SUPABASE_JWT>`
 *       The JWT is verified against Supabase. The user's
 *       `app_metadata.role` must equal `"founder"`. This is the same pattern
 *       used by `agency-deploy-agent.ts` so dashboard-driven ad-hoc runs work.
 *
 *   (b) NETLIFY SCHEDULED CRON
 *       Header: `x-netlify-event-source: schedule`
 *       OR the handler context's `clientContext.custom?.netlify` carries the
 *       scheduled-function marker. Netlify sets these automatically for
 *       functions wired via `netlify.toml [[functions.*]] schedule` — they
 *       cannot be forged by an external HTTP caller (Netlify's edge strips
 *       the header from inbound public traffic before it reaches the
 *       function, then re-injects it for internal cron invocations).
 *
 *   (c) SHARED CRON SECRET
 *       Header: `x-cron-secret: <CRON_SECRET>`
 *       Fallback for cases where an external scheduler (n8n, GitHub Actions,
 *       Azure Container Apps cron) needs to invoke a runner. The secret is
 *       constant-time compared to env `CRON_SECRET`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENV VARS REQUIRED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   SUPABASE_URL              — Supabase project URL (for JWT verification)
 *   SUPABASE_SERVICE_KEY      — service role key (for `auth.getUser(token)`)
 *   CRON_SECRET               — long random string; matched against
 *                               `x-cron-secret` header. If unset, method (c)
 *                               is disabled and only methods (a)+(b) work.
 *   SENTINEL_SHARED_SECRET    — separate secret for the intake-officer
 *                               `?mode=sentinel` path, which is invoked
 *                               mid-call from Retell tool-use (not founder,
 *                               not cron). Matched in `authorizeSentinel`.
 *
 * Note: `FOUNDER_UUID` is NOT required — we trust the JWT's `app_metadata.role`
 * claim populated server-side via Supabase admin API at user provision time.
 * If you ever need to lock down to a single UUID, add that check inside
 * `authorizeFounder` below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   import { authorizeRunner } from './_shared/agency-runner-auth';
 *
 *   export const handler: Handler = async (event) => {
 *     // Method/OPTIONS guards stay first.
 *     if (event.httpMethod === 'OPTIONS') return { statusCode: 200, ... };
 *     if (event.httpMethod !== 'POST')    return { statusCode: 405, ... };
 *
 *     // Auth gate — block before any work runs.
 *     const authz = await authorizeRunner(event);
 *     if (!authz.ok) {
 *       return {
 *         statusCode: authz.status,
 *         headers,
 *         body: JSON.stringify({ error: authz.message }),
 *       };
 *     }
 *
 *     // ...your expensive work here...
 *   };
 *
 * For `agency-intake-officer.ts ?mode=sentinel`, use `authorizeSentinel`
 * instead — the sentinel path is hit mid-call by Retell tool-use and uses a
 * dedicated header + secret.
 */

import type { HandlerEvent } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthzOk = {
  ok: true;
  source: 'founder' | 'cron-netlify' | 'cron-secret' | 'sentinel';
  user_id?: string;
};

export type AuthzFail = {
  ok: false;
  status: number;
  message: string;
};

export type AuthzResult = AuthzOk | AuthzFail;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Case-insensitive header lookup. Netlify normalizes to lowercase but be
 * defensive — handler callers and tests may pass mixed-case keys.
 */
function header(event: HandlerEvent, name: string): string | undefined {
  const headers = (event.headers ?? {}) as Record<string, string | undefined>;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

/**
 * Constant-time string compare. Avoids timing-side-channel leaks on the
 * shared-secret paths. Returns false on length mismatch.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Method (a) — Founder Bearer JWT ─────────────────────────────────────────

async function authorizeFounder(event: HandlerEvent): Promise<AuthzResult | null> {
  const authHeader = header(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      message: 'auth backend not configured (SUPABASE_SERVICE_KEY missing)',
    };
  }

  const token = authHeader.substring(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return { ok: false, status: 401, message: 'invalid or expired token' };
    }
    const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
    if (role !== 'founder') {
      return { ok: false, status: 403, message: 'founder role required' };
    }
    return { ok: true, source: 'founder', user_id: data.user.id };
  } catch (err) {
    console.error('[agency-runner-auth] founder token verify threw', err);
    return { ok: false, status: 500, message: 'token verification failed' };
  }
}

// ─── Method (b) — Netlify Scheduled Cron ─────────────────────────────────────

function authorizeNetlifyCron(event: HandlerEvent): AuthzOk | null {
  // Netlify injects `x-netlify-event-source: schedule` on scheduled-function
  // invocations. This header cannot be set by external HTTP callers — the
  // Netlify edge strips it from inbound public traffic.
  const src = header(event, 'x-netlify-event-source');
  if (src && src.toLowerCase() === 'schedule') {
    return { ok: true, source: 'cron-netlify' };
  }
  return null;
}

// ─── Method (c) — Shared Cron Secret ─────────────────────────────────────────

function authorizeCronSecret(event: HandlerEvent): AuthzResult | null {
  const provided = header(event, 'x-cron-secret');
  if (!provided) return null;

  const expected = process.env.CRON_SECRET || '';
  if (!expected) {
    // The caller supplied a secret but the server has none configured. Treat
    // as misconfiguration, not bypass.
    return {
      ok: false,
      status: 500,
      message: 'x-cron-secret presented but CRON_SECRET not configured server-side',
    };
  }
  if (!safeEqual(provided, expected)) {
    return { ok: false, status: 401, message: 'x-cron-secret mismatch' };
  }
  return { ok: true, source: 'cron-secret' };
}

// ─── Public — composite gate ─────────────────────────────────────────────────

/**
 * Authorize a request to a cost-sensitive agency runner. Accepts any of:
 *   (a) Authorization: Bearer <SUPABASE_JWT> with app_metadata.role=='founder'
 *   (b) Netlify scheduled-function context (x-netlify-event-source: schedule)
 *   (c) x-cron-secret header matching env CRON_SECRET
 *
 * Returns `{ ok: true, source }` on first match. On all-misses, returns
 * `{ ok: false, status: 401, message: 'authorization required' }`. On
 * server misconfiguration (e.g. Supabase key missing while a token is
 * presented), returns `{ ok: false, status: 500, ... }` so the failure is
 * loud rather than a silent 401.
 */
export async function authorizeRunner(event: HandlerEvent): Promise<AuthzResult> {
  // Check the cheap header-only methods first to avoid an unnecessary
  // Supabase round-trip on cron invocations.
  const netlifyOk = authorizeNetlifyCron(event);
  if (netlifyOk) return netlifyOk;

  const cronSecretResult = authorizeCronSecret(event);
  if (cronSecretResult) return cronSecretResult;

  const founderResult = await authorizeFounder(event);
  if (founderResult) return founderResult;

  return {
    ok: false,
    status: 401,
    message:
      'authorization required: provide Bearer founder JWT, x-cron-secret, or invoke via Netlify schedule',
  };
}

// ─── Public — sentinel gate ──────────────────────────────────────────────────

/**
 * Authorize a request to the `agency-intake-officer ?mode=sentinel` path.
 * The sentinel is invoked mid-call by Retell tool-use (not by the founder,
 * not by cron), so it gets its own dedicated header + secret rather than
 * piggybacking on `CRON_SECRET`.
 *
 * Header: `x-sentinel-secret: <SENTINEL_SHARED_SECRET>` (constant-time match).
 *
 * Returns `{ ok: true, source: 'sentinel' }` on match. If the env var is
 * unset, returns 500 — fail-closed so a misconfigured deploy can't accept
 * unauthenticated mid-call invocations.
 */
export function authorizeSentinel(event: HandlerEvent): AuthzResult {
  const provided = header(event, 'x-sentinel-secret');
  const expected = process.env.SENTINEL_SHARED_SECRET || '';

  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: 'SENTINEL_SHARED_SECRET not configured server-side',
    };
  }
  if (!provided) {
    return {
      ok: false,
      status: 401,
      message: 'x-sentinel-secret header required for sentinel mode',
    };
  }
  if (!safeEqual(provided, expected)) {
    return { ok: false, status: 401, message: 'x-sentinel-secret mismatch' };
  }
  return { ok: true, source: 'sentinel' };
}
