// Mode-aware PayPal REST client for Netlify functions.
//
// PAYPAL_MODE=sandbox  → reads PAYPAL_SANDBOX_* env vars, hits api-m.sandbox.paypal.com
// PAYPAL_MODE=live (or unset) → reads PAYPAL_* env vars, hits api-m.paypal.com
//
// Set PAYPAL_MODE=sandbox during development so the same code path serves
// both environments — the only thing that changes is which env vars get read.

import PAYPAL_IDS from './paypal-ids.json';

const isSandbox = process.env.PAYPAL_MODE === 'sandbox';
// ponytail: plan/webhook/product IDs are public identifiers, so they live in
// paypal-ids.json (written by scripts/paypal-create-plans.mjs), not in the
// 4KB-capped Lambda env. A same-named env var still overrides.
const IDS = PAYPAL_IDS[isSandbox ? 'sandbox' : 'live'];

export const PAYPAL_API_BASE = isSandbox
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

export const PAYPAL_CLIENT_ID = isSandbox
  ? (process.env.PAYPAL_SANDBOX_CLIENT_ID || '')
  : (process.env.PAYPAL_CLIENT_ID || '');

export const PAYPAL_CLIENT_SECRET = isSandbox
  ? (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || '')
  : (process.env.PAYPAL_CLIENT_SECRET || '');

export const PAYPAL_WEBHOOK_ID = (isSandbox
  ? process.env.PAYPAL_SANDBOX_WEBHOOK_ID
  : process.env.PAYPAL_WEBHOOK_ID) || IDS.webhook_id;

export const PAYPAL_TIERS = ['starter', 'pro', 'ultimate', 'enterprise'] as const;
export const PAYPAL_INTERVALS = ['monthly', 'yearly'] as const;

/** Plan ID for tier+interval: env PAYPAL_PLAN_<TIER>_<INTERVAL>[_SANDBOX] wins, else paypal-ids.json. */
export function paypalPlanId(tier: string, interval: string): string | undefined {
  const envKey = `PAYPAL_PLAN_${tier.toUpperCase()}_${interval.toUpperCase()}${isSandbox ? '_SANDBOX' : ''}`;
  return process.env[envKey] || (IDS.plans as Record<string, string>)[`${tier}_${interval}`] || undefined;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  // Tokens last ~9 hours; cache within a single function invocation.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error(
      `PayPal credentials missing for mode=${isSandbox ? 'sandbox' : 'live'}. ` +
      `Set ${isSandbox ? 'PAYPAL_SANDBOX_CLIENT_ID/SECRET' : 'PAYPAL_CLIENT_ID/SECRET'}.`
    );
  }

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return data.access_token;
}

export async function paypalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getPayPalAccessToken();
  return fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
