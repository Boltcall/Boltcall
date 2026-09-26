import type { HandlerEvent } from '@netlify/functions';
import type { User } from '@supabase/supabase-js';
import * as crypto from 'crypto';

import { getServiceSupabase } from './token-utils';

export type JsonResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export type UserAuthResult =
  | { ok: true; user: User; userId: string }
  | { ok: false; response: JsonResponse };

function header(event: HandlerEvent, name: string): string | undefined {
  const headers = (event.headers || {}) as Record<string, string | undefined>;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function json(headers: Record<string, string>, statusCode: number, error: string): JsonResponse {
  return { statusCode, headers, body: JSON.stringify({ error }) };
}

export function getHeader(event: HandlerEvent, name: string): string | undefined {
  return header(event, name);
}

// Historical: two names for the same value shipped in parallel
// (INTERNAL_WEBHOOK_SECRET, INTERNAL_API_SECRET). Standardize on
// INTERNAL_API_SECRET going forward — leave the legacy fallback here
// so unrotated Netlify environments keep working, and drop it after
// Week 4 secret rotation. Callers that SEND the x-internal-secret header
// (not just verify it) should use this too, so a prod that only sets
// INTERNAL_API_SECRET doesn't silently break internal calls (F116).
export function internalSecretValue(): string {
  return process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
}

// Constant-time compare, same pattern as acs-inbound-sms.ts / agency-runner-auth.ts
// (F78 — this was the one secret check in the file still using `===`).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function hasSharedSecret(event: HandlerEvent): boolean {
  const internalSecret = internalSecretValue();
  const cronSecret = process.env.CRON_SECRET || '';

  const providedInternal = header(event, 'x-internal-secret') || '';
  if (internalSecret && providedInternal && safeEqual(providedInternal, internalSecret)) return true;

  const providedCron = header(event, 'x-cron-secret') || '';
  if (cronSecret && providedCron && safeEqual(providedCron, cronSecret)) return true;

  return false;
}

export async function requireMatchingUser(
  event: HandlerEvent,
  requestedUserId: string | null | undefined,
  headers: Record<string, string>,
): Promise<UserAuthResult> {
  if (!requestedUserId) {
    return { ok: false, response: json(headers, 400, 'userId is required') };
  }

  const authHeader = header(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json(headers, 401, 'Authentication required') };
  }

  const token = authHeader.slice('Bearer '.length);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, response: json(headers, 401, 'Invalid or expired token') };
  }

  if (data.user.id !== requestedUserId) {
    return { ok: false, response: json(headers, 403, 'userId does not match authenticated user') };
  }

  return { ok: true, user: data.user, userId: data.user.id };
}

export async function requireUser(
  event: HandlerEvent,
  headers: Record<string, string>,
): Promise<UserAuthResult> {
  const authHeader = header(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json(headers, 401, 'Authentication required') };
  }

  const token = authHeader.slice('Bearer '.length);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, response: json(headers, 401, 'Invalid or expired token') };
  }

  return { ok: true, user: data.user, userId: data.user.id };
}

export async function requireInternalOrMatchingUser(
  event: HandlerEvent,
  requestedUserId: string | null | undefined,
  headers: Record<string, string>,
): Promise<UserAuthResult | { ok: true; user: null; userId: string }> {
  if (hasSharedSecret(event)) {
    return { ok: true, user: null, userId: requestedUserId || 'internal' };
  }

  if (!requestedUserId) {
    return { ok: false, response: json(headers, 400, 'userId is required') };
  }

  return requireMatchingUser(event, requestedUserId, headers);
}
