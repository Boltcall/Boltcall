import { withLegacyHandler } from './_shared/runtime-compat';
// Create a PayPal subscription for the authenticated user.
//
// Flow:
//   1. Verify caller's Supabase JWT — never trust userId from request body.
//   2. Look up the PayPal Plan ID for the requested tier+interval from env
//      (mode-aware: PAYPAL_MODE=sandbox uses *_SANDBOX vars).
//   3. Call PayPal /v1/billing/subscriptions to create a subscription.
//      Attach the user's UUID via `custom_id` so the webhook can match the
//      activation back to a Supabase user without an email lookup.
//   4. Return the PayPal approval URL — the frontend redirects the user there.
//
// On approval the user comes back to /dashboard/settings/plan-billing and
// the BILLING.SUBSCRIPTION.ACTIVATED webhook persists the subscription row.

import type { Handler } from '@netlify/functions';
import { paypalFetch } from './_shared/paypal-client';
import { isAllowedRedirect } from './_shared/redirect-allowlist';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';

const isSandbox = process.env.PAYPAL_MODE === 'sandbox';

const PLAN_MAP: Record<string, string | undefined> = {
  starter_monthly: isSandbox
    ? process.env.PAYPAL_PLAN_STARTER_MONTHLY_SANDBOX
    : process.env.PAYPAL_PLAN_STARTER_MONTHLY,
  starter_yearly: isSandbox
    ? process.env.PAYPAL_PLAN_STARTER_YEARLY_SANDBOX
    : process.env.PAYPAL_PLAN_STARTER_YEARLY,
  pro_monthly: isSandbox
    ? process.env.PAYPAL_PLAN_PRO_MONTHLY_SANDBOX
    : process.env.PAYPAL_PLAN_PRO_MONTHLY,
  pro_yearly: isSandbox
    ? process.env.PAYPAL_PLAN_PRO_YEARLY_SANDBOX
    : process.env.PAYPAL_PLAN_PRO_YEARLY,
  ultimate_monthly: isSandbox
    ? process.env.PAYPAL_PLAN_ULTIMATE_MONTHLY_SANDBOX
    : process.env.PAYPAL_PLAN_ULTIMATE_MONTHLY,
  ultimate_yearly: isSandbox
    ? process.env.PAYPAL_PLAN_ULTIMATE_YEARLY_SANDBOX
    : process.env.PAYPAL_PLAN_ULTIMATE_YEARLY,
};

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  let plan: string, interval: string, successUrl: string | undefined, cancelUrl: string | undefined;
  try {
    const body = JSON.parse(event.body || '{}');
    ({ plan, interval, successUrl, cancelUrl } = body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!plan || !interval) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing plan or interval' }) };
  }
  if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'successUrl/cancelUrl must point to an allowed Boltcall host' }),
    };
  }

  const planKey = `${plan}_${interval}`;
  const planId = PLAN_MAP[planKey];
  if (!planId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `No PayPal plan configured for ${planKey}`,
        hint: `Set PAYPAL_PLAN_${plan.toUpperCase()}_${interval.toUpperCase()}${isSandbox ? '_SANDBOX' : ''} in env`,
      }),
    };
  }

  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  const origin = requestOrigin && isAllowedRedirect(requestOrigin) ? requestOrigin : 'https://boltcall.org';
  const returnUrl = successUrl || `${origin}/dashboard/settings/plan-billing?paypal=success`;
  const cancelReturnUrl = cancelUrl || `${origin}/dashboard/settings/plan-billing?paypal=cancelled`;

  try {
    const res = await paypalFetch('/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id, // critical: webhook uses this to match user without email lookup
        subscriber: {
          email_address: user.email,
        },
        application_context: {
          brand_name: 'Boltcall',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: returnUrl,
          cancel_url: cancelReturnUrl,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('PayPal create-subscription failed:', res.status, errBody);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'PayPal rejected the subscription request', details: errBody }),
      };
    }

    const data = await res.json();
    const approvalLink = (data.links || []).find((l: { rel: string }) => l.rel === 'approve');
    if (!approvalLink?.href) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'PayPal response missing approval link', data }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subscriptionId: data.id,
        approvalUrl: approvalLink.href,
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-paypal-subscription error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: message }) };
  }
};


export const testHandler = handler;
export default withLegacyHandler(handler);
