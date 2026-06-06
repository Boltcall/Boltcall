import * as crypto from 'crypto';
import type { HandlerEvent } from '@netlify/functions';

/**
 * Constant-time HMAC-SHA256 signature verification.
 *
 * Returns:
 *   - 'valid'   — signature matches
 *   - 'invalid' — signature provided but mismatch (reject the request)
 *   - 'missing' — no secret configured OR no header present (caller decides)
 */
export type SigResult = 'valid' | 'invalid' | 'missing';

function timingSafeHexEqual(expectedHex: string, providedHex: string): boolean {
  if (expectedHex.length !== providedHex.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, 'hex'),
      Buffer.from(providedHex, 'hex'),
    );
  } catch {
    return false;
  }
}

function timingSafeBase64Equal(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

function header(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function eventUrlCandidates(event: HandlerEvent): string[] {
  const candidates = new Set<string>();
  const eventWithRaw = event as HandlerEvent & { rawUrl?: string; rawQuery?: string };
  const query = eventWithRaw.rawQuery ? `?${eventWithRaw.rawQuery}` : '';
  if (eventWithRaw.rawUrl) candidates.add(eventWithRaw.rawUrl);

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL || '';
  if (siteUrl && event.path) {
    candidates.add(`${siteUrl.replace(/\/$/, '')}${event.path}${query}`);
  }

  const proto = header(event.headers as Record<string, string | undefined>, 'x-forwarded-proto') || 'https';
  const host = header(event.headers as Record<string, string | undefined>, 'host');
  if (host && event.path) {
    candidates.add(`${proto}://${host}${event.path}${query}`);
  }

  return [...candidates];
}

/**
 * Verify a Retell webhook signature.
 *
 * Retell sends `x-retell-signature: <hex>` where the value is the HMAC-SHA256
 * of the raw event body using the API key as the secret.
 *
 * Returns 'missing' if no secret is configured (e.g. local dev without RETELL_API_KEY)
 * so the caller can choose to allow vs reject.
 */
export function verifyRetellSignature(
  rawBody: string,
  headers: Record<string, string | undefined>,
): SigResult {
  const secret = process.env.RETELL_API_KEY;
  if (!secret) return 'missing';

  const provided =
    headers['x-retell-signature'] ||
    headers['X-Retell-Signature'] ||
    headers['x-retell-signature-256'] ||
    '';

  if (!provided) return 'missing';

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // Some Retell versions prefix with `sha256=` — strip it.
  const cleaned = provided.startsWith('sha256=') ? provided.slice(7) : provided;
  return timingSafeHexEqual(expected, cleaned) ? 'valid' : 'invalid';
}

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio signs the exact public URL plus POST parameters with HMAC-SHA1 using
 * the account auth token, then base64-encodes the result in X-Twilio-Signature.
 */
export function verifyTwilioSignature(event: HandlerEvent): SigResult {
  const secret = process.env.TWILIO_AUTH_TOKEN;
  if (!secret) return 'missing';

  const headers = event.headers as Record<string, string | undefined>;
  const provided = header(headers, 'x-twilio-signature') || '';
  if (!provided) return 'missing';

  const params = new URLSearchParams(event.body || '');
  const sortedParams = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const suffix = sortedParams.map(([key, value]) => `${key}${value}`).join('');

  for (const url of eventUrlCandidates(event)) {
    const expected = crypto.createHmac('sha1', secret).update(`${url}${suffix}`).digest('base64');
    if (timingSafeBase64Equal(expected, provided)) return 'valid';
  }

  return 'invalid';
}

/**
 * Verify a Cal.com webhook signature.
 *
 * Cal.com sends `X-Cal-Signature-256: <hex>` (or sometimes `sha256=<hex>`).
 * The signature is HMAC-SHA256 of the raw event body using the webhook secret
 * configured when the subscription was created.
 */
export function verifyCalcomSignature(
  rawBody: string,
  headers: Record<string, string | undefined>,
): SigResult {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return 'missing';

  const provided =
    headers['x-cal-signature-256'] ||
    headers['X-Cal-Signature-256'] ||
    headers['x-cal-signature'] ||
    headers['X-Cal-Signature'] ||
    '';

  if (!provided) return 'missing';

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const cleaned = provided.startsWith('sha256=') ? provided.slice(7) : provided;
  return timingSafeHexEqual(expected, cleaned) ? 'valid' : 'invalid';
}

/**
 * Verify a Facebook webhook signature.
 *
 * Facebook sends `X-Hub-Signature-256: sha256=<hex>` where the value is the
 * HMAC-SHA256 of the raw event body using the App Secret.
 */
export function verifyFacebookSignature(
  rawBody: string,
  headers: Record<string, string | undefined>,
): SigResult {
  const secret = process.env.FB_APP_SECRET;
  if (!secret) return 'missing';

  const provided =
    headers['x-hub-signature-256'] ||
    headers['X-Hub-Signature-256'] ||
    '';

  if (!provided) return 'missing';
  if (!provided.startsWith('sha256=')) return 'invalid';

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeHexEqual(expected, provided.slice(7)) ? 'valid' : 'invalid';
}
