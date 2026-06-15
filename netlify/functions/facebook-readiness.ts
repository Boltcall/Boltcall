import crypto from 'crypto';
import type { Handler } from '@netlify/functions';

const GRAPH_VERSION = 'v20.0';

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

async function getAppAccessToken(appId: string, appSecret: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('grant_type', 'client_credentials');

  const res = await fetch(url);
  const body = await res.json().catch(async () => ({ error: await res.text().catch(() => '') }));
  if (!res.ok || !body.access_token) {
    throw new Error(`Facebook app token request failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return String(body.access_token);
}

async function debugAppToken(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/debug_token`);
  url.searchParams.set('input_token', accessToken);
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url);
  const body = await res.json().catch(async () => ({ error: await res.text().catch(() => '') }));
  if (!res.ok) {
    throw new Error(`Facebook app token debug failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body?.data || {};
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireInternalSecret(event);
  if (!auth.ok) return json(auth.statusCode || 403, { error: auth.error || 'Forbidden' });

  const appId = process.env.FB_APP_ID || '';
  const appSecret = process.env.FB_APP_SECRET || '';
  const webhookVerifyToken = process.env.FB_WEBHOOK_VERIFY_TOKEN || '';

  if (!appId || !appSecret || !webhookVerifyToken) {
    return json(500, {
      status: 'failed',
      check: 'facebook_api_readiness',
      hasAppId: Boolean(appId),
      hasAppSecret: Boolean(appSecret),
      hasWebhookVerifyToken: Boolean(webhookVerifyToken),
      error: 'Missing Facebook OAuth or webhook configuration',
    });
  }

  try {
    const appAccessToken = await getAppAccessToken(appId, appSecret);
    const debug = await debugAppToken(appAccessToken);
    return json(200, {
      status: 'passed',
      check: 'facebook_api_readiness',
      graphVersion: GRAPH_VERSION,
      hasAppId: true,
      hasAppSecret: true,
      hasWebhookVerifyToken: true,
      hasAppAccessToken: Boolean(appAccessToken),
      tokenValid: debug.is_valid === true,
      appIdMatches: String(debug.app_id || '') === String(appId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Facebook readiness error';
    return json(502, {
      status: 'failed',
      check: 'facebook_api_readiness',
      graphVersion: GRAPH_VERSION,
      hasAppId: true,
      hasAppSecret: true,
      hasWebhookVerifyToken: true,
      error: message,
    });
  }
};
