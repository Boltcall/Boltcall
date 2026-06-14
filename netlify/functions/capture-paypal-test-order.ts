import type { Handler } from '@netlify/functions';

import { paypalFetch } from './_shared/paypal-client';
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

function firstPurchaseUnit(order: Record<string, any>) {
  return Array.isArray(order.purchase_units) ? order.purchase_units[0] : null;
}

function firstCapture(capture: Record<string, any>) {
  const unit = firstPurchaseUnit(capture);
  const captures = unit?.payments?.captures;
  return Array.isArray(captures) ? captures[0] : null;
}

async function persistPayment(
  userId: string,
  captureResponse: Record<string, any>,
) {
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

  let orderId = '';
  try {
    const body = JSON.parse(event.body || '{}') as { orderId?: unknown };
    orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  } catch {
    return json(headers, 400, { error: 'Invalid JSON body' });
  }
  if (!orderId) return json(headers, 400, { error: 'Body must include orderId' });

  try {
    const orderRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    const order = await orderRes.json();
    if (!orderRes.ok) {
      return json(headers, 502, { error: 'Failed to load PayPal order', details: order });
    }

    const unit = firstPurchaseUnit(order);
    const amount = unit?.amount || {};
    if (unit?.custom_id !== founder.id) {
      return json(headers, 403, { error: 'PayPal order does not belong to this founder session' });
    }
    if (amount.value !== TEST_AMOUNT || amount.currency_code !== TEST_CURRENCY) {
      return json(headers, 400, { error: 'PayPal order is not the Boltcall $2 test payment' });
    }

    const captureRes = await paypalFetch(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          'PayPal-Request-Id': `boltcall-test-capture-${orderId}`,
        },
        body: '{}',
      },
    );
    const captureResponse = await captureRes.json();
    if (!captureRes.ok) {
      return json(headers, 502, { error: 'PayPal rejected capture', details: captureResponse });
    }

    const payment = await persistPayment(founder.id, captureResponse);
    return json(headers, 200, {
      orderId,
      ...payment,
      paypalMode: process.env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown PayPal error';
    return json(headers, 500, { error: message });
  }
};
