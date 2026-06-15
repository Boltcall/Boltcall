import crypto from 'node:crypto';

import type { Handler } from '@netlify/functions';

import { paypalFetch } from './_shared/paypal-client';
import { signPayPalTestState } from './capture-paypal-test-return';

const TEST_AMOUNT = '2.00';
const TEST_CURRENCY = 'USD';
const DEFAULT_SITE_URL = 'https://boltcall.org';

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function requireInternalSecret(event: Parameters<Handler>[0]) {
  const expected = process.env.INTERNAL_API_SECRET || '';
  const actual = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'] || '';
  return Boolean(expected && actual && actual === expected);
}

export function buildPayPalReturnUrl(siteUrl: string, state: string) {
  const url = new URL('/.netlify/functions/capture-paypal-test-return', siteUrl);
  url.searchParams.set('state', state);
  return url.toString();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!requireInternalSecret(event)) {
    return json(403, { error: 'Forbidden' });
  }

  const founderUserId = process.env.FOUNDER_UUID || '';
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
  if (!founderUserId) {
    return json(500, { error: 'FOUNDER_UUID is required' });
  }

  const state = signPayPalTestState({
    founderUserId,
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(16).toString('base64url'),
  });
  const returnUrl = buildPayPalReturnUrl(siteUrl, state);
  const cancelUrl = `${siteUrl}/dashboard/settings/plan-billing?paypal_test=cancelled`;

  try {
    const res = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'PayPal-Request-Id': `boltcall-internal-test-order-${founderUserId}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `boltcall-live-test-${Date.now()}`,
            description: 'Boltcall live $2 payment test',
            custom_id: founderUserId,
            amount: {
              currency_code: TEST_CURRENCY,
              value: TEST_AMOUNT,
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Boltcall',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: returnUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json(502, { error: 'PayPal rejected the test order', details: data });
    }

    const approvalLink = (data.links || []).find((link: { rel: string }) =>
      link.rel === 'payer-action' || link.rel === 'approve',
    );
    if (!approvalLink?.href) {
      return json(502, { error: 'PayPal response missing approval link', data });
    }

    return json(200, {
      status: 'passed',
      check: 'paypal_test_approval_link',
      orderId: data.id,
      amount: TEST_AMOUNT,
      currency: TEST_CURRENCY,
      approvalUrl: approvalLink.href,
      returnUrl,
    });
  } catch (error) {
    return json(500, {
      status: 'failed',
      check: 'paypal_test_approval_link',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
