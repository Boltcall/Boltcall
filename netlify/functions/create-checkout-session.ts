import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

// Map plan levels + intervals to Stripe Price IDs (USD)
const PRICE_MAP_USD: Record<string, string | undefined> = {
  'starter_monthly': process.env.STRIPE_PRICE_STARTER_MONTHLY,
  'starter_yearly': process.env.STRIPE_PRICE_STARTER_YEARLY,
  'pro_monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro_yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
  'ultimate_monthly': process.env.STRIPE_PRICE_ULTIMATE_MONTHLY,
  'ultimate_yearly': process.env.STRIPE_PRICE_ULTIMATE_YEARLY,
  'enterprise_monthly': process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  'enterprise_yearly': process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
};

// ILS (Israeli Shekel) Price IDs — separate Stripe Prices for ₪ billing
const PRICE_MAP_ILS: Record<string, string | undefined> = {
  'starter_monthly': process.env.STRIPE_PRICE_ILS_STARTER_MONTHLY,
  'starter_yearly': process.env.STRIPE_PRICE_ILS_STARTER_YEARLY,
  'pro_monthly': process.env.STRIPE_PRICE_ILS_PRO_MONTHLY,
  'pro_yearly': process.env.STRIPE_PRICE_ILS_PRO_YEARLY,
  'ultimate_monthly': process.env.STRIPE_PRICE_ILS_ULTIMATE_MONTHLY,
  'ultimate_yearly': process.env.STRIPE_PRICE_ILS_ULTIMATE_YEARLY,
};

// Allowlist of origins/hosts for caller-supplied success_url / cancel_url.
// Any URL that doesn't match one of these is rejected — prevents post-payment
// open redirects to attacker-controlled domains.
const ALLOWED_REDIRECT_HOSTS = new Set([
  'boltcall.org',
  'www.boltcall.org',
  'boltcall.netlify.app',
  'localhost',
]);

function isAllowedRedirect(url: string | undefined): boolean {
  if (!url) return true; // empty/undefined is fine — server falls back to a default
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

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

  // Verify caller's JWT — never trust userId from request body.
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
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  try {
    const { plan, interval, currency, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

    if (!plan || !interval) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing plan or interval' }),
      };
    }

    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'successUrl/cancelUrl must point to an allowed Boltcall host' }),
      };
    }

    const priceKey = `${plan}_${interval}`;
    const useILS = currency === 'ILS';
    const priceMap = useILS ? PRICE_MAP_ILS : PRICE_MAP_USD;
    const priceId = priceMap[priceKey] ?? PRICE_MAP_USD[priceKey];

    if (!priceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Invalid plan/interval: ${priceKey}` }),
      };
    }

    // userId and email come from the authenticated session, never from the body.
    const userId = authUser.id;
    const email = authUser.email || undefined;

    const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
    const fallbackOrigin = requestOrigin && isAllowedRedirect(requestOrigin)
      ? requestOrigin
      : 'https://boltcall.org';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${fallbackOrigin}/dashboard/settings/plan-billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: cancelUrl || `${fallbackOrigin}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
        interval,
        currency: useILS ? 'ILS' : 'USD',
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
          interval,
          currency: useILS ? 'ILS' : 'USD',
        },
      },
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
    };
  }
};

export { handler };
