import crypto from 'crypto';
import type { Handler } from '@netlify/functions';
import { withLegacyHandler } from './_shared/runtime-compat';

import { getPayPalAccessToken, PAYPAL_API_BASE, PAYPAL_WEBHOOK_ID } from './_shared/paypal-client';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://boltcall.org',
  'Access-Control-Allow-Headers': 'Content-Type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function requireInternalSecret(event: Parameters<Handler>[0]) {
  const expected = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
  if (!expected) return { ok: false, statusCode: 500, error: 'Internal secret is not configured' };

  const provided =
    event.headers['x-internal-secret'] ||
    event.headers['X-Internal-Secret'] ||
    '';
  if (!provided || !safeEqual(String(provided), expected)) {
    return { ok: false, statusCode: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireInternalSecret(event);
  if (!auth.ok) return json(auth.statusCode || 403, { error: auth.error || 'Forbidden' });

  try {
    const token = await getPayPalAccessToken();
    return json(200, {
      status: 'passed',
      check: 'paypal_api_readiness',
      mode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
      apiBase: PAYPAL_API_BASE,
      hasAccessToken: Boolean(token),
      hasWebhookId: Boolean(PAYPAL_WEBHOOK_ID),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PayPal error';
    return json(502, {
      status: 'failed',
      check: 'paypal_api_readiness',
      mode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
      apiBase: PAYPAL_API_BASE,
      hasWebhookId: Boolean(PAYPAL_WEBHOOK_ID),
      error: message,
    });
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
