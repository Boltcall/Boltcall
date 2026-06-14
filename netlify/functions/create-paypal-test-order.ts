import type { Handler } from '@netlify/functions';

import { paypalFetch } from './_shared/paypal-client';
import { isAllowedRedirect } from './_shared/redirect-allowlist';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';

const TEST_AMOUNT = '2.00';
const TEST_CURRENCY = 'USD';

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function requireFounder(event: Parameters<Handler>[0]) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const supabase = getServiceSupabase();
  const token = authHeader.slice('Bearer '.length).trim();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'founder') return null;

  return {
    id: data.user.id as string,
    email: data.user.email as string | undefined,
  };
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string>), {
    methods: 'POST',
  });
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return json(headers, 403, { error: 'Origin not allowed' });
  }
  if (event.httpMethod !== 'POST') return json(headers, 405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const founder = await requireFounder(event);
  if (!founder) {
    return json(headers, authHeader ? 403 : 401, {
      error: authHeader ? 'Founder only' : 'Authentication required',
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return json(headers, 400, { error: 'Invalid JSON body' });
  }

  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  const origin = requestOrigin && isAllowedRedirect(requestOrigin) ? requestOrigin : 'https://boltcall.org';
  const successUrl =
    typeof body.successUrl === 'string' && isAllowedRedirect(body.successUrl)
      ? body.successUrl
      : `${origin}/dashboard/settings/plan-billing?paypal_test=success`;
  const cancelUrl =
    typeof body.cancelUrl === 'string' && isAllowedRedirect(body.cancelUrl)
      ? body.cancelUrl
      : `${origin}/dashboard/settings/plan-billing?paypal_test=cancelled`;

  try {
    const res = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'PayPal-Request-Id': `boltcall-test-order-${founder.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `boltcall-live-test-${Date.now()}`,
            description: 'Boltcall live $2 payment test',
            custom_id: founder.id,
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
              return_url: successUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json(headers, 502, { error: 'PayPal rejected the test order', details: data });
    }

    const approvalLink = (data.links || []).find((link: { rel: string }) =>
      link.rel === 'payer-action' || link.rel === 'approve',
    );
    if (!approvalLink?.href) {
      return json(headers, 502, { error: 'PayPal response missing approval link', data });
    }

    return json(headers, 200, {
      orderId: data.id,
      approvalUrl: approvalLink.href,
      amount: TEST_AMOUNT,
      currency: TEST_CURRENCY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown PayPal error';
    return json(headers, 500, { error: message });
  }
};
