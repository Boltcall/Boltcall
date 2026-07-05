import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { notifyInfo } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

const NAME_RE = /^[\p{L}\p{N} .,'-]{2,120}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]{7,25}$/;
const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (origin && !cors.allowed) return json(headers, 403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') return json(headers, 405, { error: 'Method not allowed' });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(headers, 400, { error: 'Invalid JSON' });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 190).toLowerCase();
  const phone = clean(body.phone, 40);
  const url = clean(body.url, 500);

  if (!NAME_RE.test(name))   return json(headers, 400, { error: 'Enter a valid name' });
  if (!EMAIL_RE.test(email)) return json(headers, 400, { error: 'Enter a valid email' });
  if (!PHONE_RE.test(phone)) return json(headers, 400, { error: 'Enter a valid phone number' });

  const supabase = getServiceSupabase();
  const ip = getClientIp(event.headers as Record<string, string | undefined>);

  const limit = await consumePublicRateLimit(supabase, {
    bucket: 'speed_test_offer_ip',
    key: hashRateLimitKey([ip, email]),
    maxAttempts: IP_MAX_ATTEMPTS,
    windowSeconds: IP_WINDOW_SECONDS,
  });
  if (!limit.allowed) {
    return {
      statusCode: limit.statusCode,
      headers: {
        ...headers,
        ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({ error: 'Too many attempts. Try again later.' }),
    };
  }

  const { error: insertError } = await supabase.from('website_leads').insert({
    name,
    email,
    phone,
    url: url || null,
    source: 'speed_test_offer',
  });

  if (insertError) {
    console.error('[speed-test-offer] insert failed:', insertError);
    return json(headers, 500, { error: 'Could not save your details right now' });
  }

  // Fire-and-forget notify; never block the response on Telegram.
  notifyInfo(`🚀 Speed-test lead: ${name} · ${email} · ${phone}${url ? ` · ${url}` : ''}`).catch(
    (e) => console.error('[speed-test-offer] notify failed:', e),
  );

  return json(headers, 200, { ok: true });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
