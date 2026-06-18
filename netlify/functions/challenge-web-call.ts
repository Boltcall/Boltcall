import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { withLegacyHandler } from './_shared/runtime-compat';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const retellApiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.CHALLENGE_AGENT_ID;
  const secretWord = process.env.CHALLENGE_SECRET_WORD;

  if (!retellApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Retell API key not configured' }) };
  }
  if (!agentId) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'CHALLENGE_AGENT_ID env var not set' }) };
  }
  if (!secretWord) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Challenge is not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const name = clean(body.name, 120);
    const email = clean(body.email, 254).toLowerCase();
    if (!name || !EMAIL_RE.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'valid name and email are required' }) };
    }

    const supabase = getServiceSupabase();
    const ip = getClientIp(event.headers as Record<string, string>);
    const rateLimit = await consumePublicRateLimit(supabase, {
      bucket: 'challenge_web_call',
      key: hashRateLimitKey([ip, email]),
      maxAttempts: 3,
      windowSeconds: 24 * 60 * 60,
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
            ? 'Challenge call limit reached for today'
            : 'Challenge rate limit unavailable',
        }),
      };
    }

    const client = new Retell({ apiKey: retellApiKey });
    const webCall = await (client.call as any).createWebCall({
      agent_id: agentId,
      retell_llm_dynamic_variables: {
        secret_word: secretWord,
      },
      metadata: {
        name,
        email,
        source: 'break-our-ai-challenge',
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: webCall.access_token,
        call_id: webCall.call_id,
      }),
    };
  } catch (err: any) {
    console.error('Failed to create challenge web call:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create call' }),
    };
  }
};


export const testHandler = handler;
export default withLegacyHandler(handler);
