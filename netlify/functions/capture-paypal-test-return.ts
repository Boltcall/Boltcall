import crypto from 'node:crypto';

import type { Handler } from '@netlify/functions';

import { paypalFetch } from './_shared/paypal-client';
import { getServiceSupabase } from './_shared/token-utils';

const TEST_AMOUNT = '2.00';
const TEST_CURRENCY = 'USD';
const STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type PayPalTestState = {
  founderUserId: string;
  issuedAt: number;
  nonce: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hmac(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function timingSafeEqualString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function signPayPalTestState(
  state: PayPalTestState,
  secret = process.env.INTERNAL_API_SECRET || '',
) {
  if (!secret) throw new Error('INTERNAL_API_SECRET is required to sign PayPal test state');
  if (!state.founderUserId) throw new Error('founderUserId is required');
  if (!Number.isFinite(state.issuedAt)) throw new Error('issuedAt is required');
  if (!state.nonce) throw new Error('nonce is required');

  const payload = base64UrlEncode(JSON.stringify(state));
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyPayPalTestState(
  signedState: string,
  secret = process.env.INTERNAL_API_SECRET || '',
  now = Date.now(),
) {
  if (!secret) return { ok: false as const, reason: 'missing_secret' };
  const [payload, signature, ...extra] = String(signedState || '').split('.');
  if (!payload || !signature || extra.length > 0) {
    return { ok: false as const, reason: 'malformed_state' };
  }

  const expected = hmac(payload, secret);
  if (!timingSafeEqualString(signature, expected)) {
    return { ok: false as const, reason: 'bad_signature' };
  }

  let state: PayPalTestState;
  try {
    state = JSON.parse(base64UrlDecode(payload)) as PayPalTestState;
  } catch {
    return { ok: false as const, reason: 'bad_payload' };
  }

  if (!state.founderUserId || !Number.isFinite(state.issuedAt) || !state.nonce) {
    return { ok: false as const, reason: 'bad_payload' };
  }
  if (now - state.issuedAt > STATE_MAX_AGE_MS || state.issuedAt - now > 5 * 60 * 1000) {
    return { ok: false as const, reason: 'expired_state' };
  }

  return { ok: true as const, state };
}

function firstPurchaseUnit(order: Record<string, any>) {
  return Array.isArray(order.purchase_units) ? order.purchase_units[0] : null;
}

function firstCapture(capture: Record<string, any>) {
  const unit = firstPurchaseUnit(capture);
  const captures = unit?.payments?.captures;
  return Array.isArray(captures) ? captures[0] : null;
}

async function persistPayment(userId: string, captureResponse: Record<string, any>) {
  const supabase = getServiceSupabase();
  const unit = firstPurchaseUnit(captureResponse) || {};
  const capture = firstCapture(captureResponse) || {};
  const amount = capture.amount || unit.amount || {};
  const payer = captureResponse.payer || {};

  const { error } = await supabase
    .from('paypal_payments')
    .upsert(
      {
        order_id: captureResponse.id,
        payer_email: payer.email_address || null,
        payer_id: payer.payer_id || null,
        user_id: userId,
        amount: Number.parseFloat(String(amount.value || TEST_AMOUNT)),
        currency: amount.currency_code || TEST_CURRENCY,
        status: String(capture.status || captureResponse.status || 'COMPLETED').toLowerCase(),
        raw_event: captureResponse,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' },
    );

  if (error) throw new Error(`Payment captured but failed to log: ${error.message}`);

  return {
    captureId: capture.id || null,
    amount: amount.value || TEST_AMOUNT,
    currency: amount.currency_code || TEST_CURRENCY,
    status: capture.status || captureResponse.status || 'COMPLETED',
  };
}

function html(statusCode: number, title: string, body: string) {
  return {
    statusCode,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
    main { width: min(560px, calc(100vw - 32px)); background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); }
    h1 { margin: 0 0 10px; font-size: 22px; line-height: 1.2; }
    p { margin: 0 0 18px; color: #475569; line-height: 1.55; }
    a { color: #1d4ed8; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
  };
}

function failure(reason: string, statusCode = 400) {
  return html(
    statusCode,
    'PayPal test payment needs attention',
    `<h1>PayPal test payment needs attention</h1><p>${reason}</p><p><a href="/dashboard/settings/plan-billing">Return to billing</a></p>`,
  );
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return failure('This return endpoint only accepts PayPal browser redirects.', 405);
  }

  const orderId = String(event.queryStringParameters?.token || '').trim();
  const signedState = String(event.queryStringParameters?.state || '').trim();
  if (!orderId || !signedState) {
    return failure('Missing PayPal order token or signed state.');
  }

  const stateCheck = verifyPayPalTestState(signedState);
  if (!stateCheck.ok) {
    return failure(`Invalid PayPal test state: ${stateCheck.reason}`, 403);
  }

  try {
    const orderRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    const order = await orderRes.json();
    if (!orderRes.ok) {
      return failure('Could not load the approved PayPal order from PayPal.', 502);
    }

    const unit = firstPurchaseUnit(order);
    const amount = unit?.amount || {};
    if (unit?.custom_id !== stateCheck.state.founderUserId) {
      return failure('This PayPal order does not belong to the signed founder test state.', 403);
    }
    if (amount.value !== TEST_AMOUNT || amount.currency_code !== TEST_CURRENCY) {
      return failure('This PayPal order is not the Boltcall $2 test payment.', 400);
    }

    const captureRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: {
        'PayPal-Request-Id': `boltcall-test-return-capture-${orderId}`,
      },
      body: '{}',
    });
    const captureResponse = await captureRes.json();
    if (!captureRes.ok) {
      return failure('PayPal approved the order but rejected the capture.', 502);
    }

    const payment = await persistPayment(stateCheck.state.founderUserId, captureResponse);
    return html(
      200,
      'PayPal test payment captured',
      `<h1>PayPal test payment captured</h1><p>Order ${orderId} was captured for $${payment.amount} ${payment.currency}. Boltcall logged the payment for readiness verification.</p><p><a href="/dashboard/settings/plan-billing?paypal_test=success">Return to billing</a></p>`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PayPal capture error';
    return failure(message, 500);
  }
};
