import { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const WORKFLOW_ID = 'wf_68e9fd4d3bc08190ba32c0dd1efa36d107c2b86288c10974';
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{8,96}$/;

export const handler: Handler = async (event) => {
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

  if (process.env.CHATKIT_PUBLIC_ENABLED !== 'true') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Chat is disabled' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'OpenAI API key not configured on server' }),
    };
  }

  try {
    const { deviceId } = JSON.parse(event.body || '{}');
    if (typeof deviceId !== 'string' || !DEVICE_ID_RE.test(deviceId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'valid deviceId is required' }),
      };
    }

    const supabase = getServiceSupabase();
    const ip = getClientIp(event.headers as Record<string, string>);
    const rateLimit = await consumePublicRateLimit(supabase, {
      bucket: 'chatkit_session',
      key: hashRateLimitKey([ip, deviceId]),
      maxAttempts: 20,
      windowSeconds: 60 * 60,
    });

    if (!rateLimit.allowed) {
      return {
        statusCode: rateLimit.statusCode,
        headers: {
          ...headers,
          ...(rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : {}),
        },
        body: JSON.stringify({
          error: rateLimit.statusCode === 429
            ? 'Chat session limit reached'
            : 'Chat rate limit unavailable',
        }),
      };
    }

    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        user: deviceId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI ChatKit error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to create ChatKit session' }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ client_secret: data.client_secret }),
    };
  } catch (error) {
    console.error('chatkit-session error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export default withLegacyHandler(handler);
