import crypto from 'crypto';
import type { Handler } from '@netlify/functions';
import { withLegacyHandler } from './_shared/runtime-compat';

import { getPayPalAccessToken, PAYPAL_API_BASE } from './_shared/paypal-client';

const WEBHOOK_URL = 'https://boltcall.org/.netlify/functions/paypal-webhook';
const EVENT_TYPES = [
  'CHECKOUT.ORDER.APPROVED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.SALE.COMPLETED',
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
];

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

async function paypalJson(path: string, init: RequestInit = {}) {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(async () => ({ error: await res.text().catch(() => '') }));
  if (!res.ok) throw new Error(`PayPal ${init.method || 'GET'} ${path} failed (${res.status}): ${JSON.stringify(body)}`);
  return body;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireInternalSecret(event);
  if (!auth.ok) return json(auth.statusCode || 403, { error: auth.error || 'Forbidden' });

  try {
    const existing = await paypalJson('/v1/notifications/webhooks');
    const webhooks = Array.isArray(existing.webhooks) ? existing.webhooks : [];
    const match = webhooks.find((webhook: Record<string, unknown>) => webhook.url === WEBHOOK_URL);
    if (match?.id) {
      return json(200, {
        status: 'passed',
        check: 'paypal_webhook_sync',
        action: 'found_existing',
        mode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
        webhookId: match.id,
        webhookUrl: WEBHOOK_URL,
      });
    }

    const created = await paypalJson('/v1/notifications/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: WEBHOOK_URL,
        event_types: EVENT_TYPES.map((name) => ({ name })),
      }),
    });

    return json(200, {
      status: 'passed',
      check: 'paypal_webhook_sync',
      action: 'created',
      mode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
      webhookId: created.id || null,
      webhookUrl: created.url || WEBHOOK_URL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PayPal error';
    return json(502, {
      status: 'failed',
      check: 'paypal_webhook_sync',
      mode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
      error: message,
    });
  }
};

export default withLegacyHandler(handler);
