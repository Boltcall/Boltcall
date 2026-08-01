import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * response-time-demo-call
 *
 * "See how fast Boltcall answers" proof widget (Task 9, batch3-10x-plan —
 * reframed safe version). Near-fork of homepage-demo-call.ts: same
 * public/rate-limited/E.164-validated shape, calls only the SUBMITTER'S OWN
 * number (never a third party), but additionally persists call_id + email +
 * dialed_at so retell-webhook.ts can compute answer latency and email a
 * report once the call ends.
 */

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_IP_WINDOW_SECONDS = 60 * 60;
const DEMO_IP_MAX_ATTEMPTS = 5;
const DEMO_PHONE_WINDOW_SECONDS = 60 * 60;
const DEMO_PHONE_MAX_ATTEMPTS = 3;

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePhone(value: unknown): string {
  const raw = clean(value, 40);
  if (!raw) return '';

  const normalized = raw.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+')) return normalized;
  if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
  if (/^\d+$/.test(normalized)) return `+${normalized}`;
  return normalized;
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const retellApiKey = process.env.RETELL_API_KEY;
  const fromNumber = clean(
    process.env.RETELL_DEMO_FROM_NUMBER || process.env.RETELL_PHONE_NUMBER,
    30,
  );
  const agentId = clean(process.env.RETELL_DEMO_AGENT_ID, 160);

  if (!retellApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Retell API key not configured' }) };
  }
  if (!fromNumber || !agentId) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Response-time demo is not configured' }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const phone = normalizePhone(body.phone);
  const email = clean(body.email, 200).toLowerCase();

  if (!PHONE_RE.test(phone)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter a valid phone number in international format' }) };
  }
  if (!EMAIL_RE.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter a valid email address' }) };
  }

  const supabase = getServiceSupabase();
  const ip = getClientIp(event.headers as Record<string, string>);

  const ipLimit = await consumePublicRateLimit(supabase as any, {
    bucket: 'response_time_demo_ip',
    key: hashRateLimitKey([ip]),
    maxAttempts: DEMO_IP_MAX_ATTEMPTS,
    windowSeconds: DEMO_IP_WINDOW_SECONDS,
  });
  if (!ipLimit.allowed) {
    return {
      statusCode: ipLimit.statusCode,
      headers: {
        ...headers,
        ...(ipLimit.retryAfterSeconds ? { 'Retry-After': String(ipLimit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({
        error: 'Too many test calls from this connection. Try again later.',
        code: 'demo_ip_rate_limited',
      }),
    };
  }

  const phoneLimit = await consumePublicRateLimit(supabase as any, {
    bucket: 'response_time_demo_phone',
    key: hashRateLimitKey([phone]),
    maxAttempts: DEMO_PHONE_MAX_ATTEMPTS,
    windowSeconds: DEMO_PHONE_WINDOW_SECONDS,
  });
  if (!phoneLimit.allowed) {
    return {
      statusCode: phoneLimit.statusCode,
      headers: {
        ...headers,
        ...(phoneLimit.retryAfterSeconds ? { 'Retry-After': String(phoneLimit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({
        error: 'That number already requested a test call recently. Try again later.',
        code: 'demo_phone_rate_limited',
      }),
    };
  }

  try {
    const client = new Retell({ apiKey: retellApiKey });
    const dialedAt = new Date().toISOString();
    const call = await client.call.createPhoneCall({
      from_number: fromNumber,
      to_number: phone,
      agent_id: agentId,
      metadata: {
        source: 'response_time_demo',
      },
    } as any);

    const callId = (call as any)?.call_id ?? null;
    if (callId) {
      const { error: insertError } = await supabase.from('response_time_demos').insert({
        call_id: callId,
        phone,
        email,
        dialed_at: dialedAt,
        status: 'dialed',
        ip_hash: hashRateLimitKey([ip]),
      });
      if (insertError) {
        console.error('[response-time-demo-call] Failed to persist demo row:', insertError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, phone, call_id: callId }),
    };
  } catch (error: any) {
    console.error('[response-time-demo-call] Failed to start call:', error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Could not start the test call right now' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
