import { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (origin && !cors.allowed) return json(headers, 403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') {
    return json(headers, 405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listIdRaw = process.env.BREVO_LIST_ID;

  if (!apiKey || !listIdRaw) {
    console.error('brevo-subscribe: missing BREVO_API_KEY or BREVO_LIST_ID');
    return json(headers, 500, { error: 'Server not configured' });
  }

  const listId = parseInt(listIdRaw, 10);
  if (Number.isNaN(listId)) {
    return json(headers, 500, { error: 'Invalid list id' });
  }

  let email = '';
  let firstName: string | undefined;
  try {
    const body = JSON.parse(event.body || '{}');
    email = String(body.email || '').trim().toLowerCase();
    if (body.firstName) firstName = String(body.firstName).trim();
  } catch {
    return json(headers, 400, { error: 'Invalid JSON' });
  }

  if (!email || !EMAIL_RX.test(email)) {
    return json(headers, 400, { error: 'Valid email required' });
  }

  let limit;
  try {
    const supabase = getServiceSupabase();
    limit = await consumePublicRateLimit(supabase, {
      bucket: 'brevo_subscribe',
      key: hashRateLimitKey([getClientIp(event.headers as Record<string, string | undefined>), email]),
      maxAttempts: 5,
      windowSeconds: 60 * 60,
    });
  } catch (err) {
    console.error('brevo-subscribe rate limit error:', err);
    return json(headers, 503, { error: 'Rate limit unavailable' });
  }
  if (!limit.allowed) {
    return {
      statusCode: limit.statusCode,
      headers: {
        ...headers,
        ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({ error: limit.statusCode === 429 ? 'Too many subscribe attempts' : 'Rate limit unavailable' }),
    };
  }

  const payload: Record<string, unknown> = {
    email,
    listIds: [listId],
    updateEnabled: true,
  };
  if (firstName) payload.attributes = { FIRSTNAME: firstName };

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 204) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const text = await res.text();
    let parsed: { code?: string } | null = null;
    try { parsed = JSON.parse(text); } catch {}
    if (parsed?.code === 'duplicate_parameter') {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, alreadySubscribed: true }) };
    }

    console.error('Brevo error:', res.status, text);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Subscription failed' }) };
  } catch (err: unknown) {
    console.error('brevo-subscribe error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong' }) };
  }
};

export { handler };
