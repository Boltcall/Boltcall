import { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (origin && !cors.allowed) {
    return json(headers, 403, { error: 'Origin not allowed' });
  }

  if (event.httpMethod !== 'POST') {
    return json(headers, 405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return json(headers, 500, { error: 'PageSpeed API key not configured on server' });
  }

  try {
    const { url, strategy } = JSON.parse(event.body || '{}');
    if (!url) {
      return json(headers, 400, { error: 'url is required' });
    }

    let target: URL;
    try {
      target = new URL(String(url));
    } catch {
      return json(headers, 400, { error: 'Valid URL required' });
    }

    if (!['http:', 'https:'].includes(target.protocol)) {
      return json(headers, 400, { error: 'Only http and https URLs are supported' });
    }

    const supabase = getServiceSupabase();
    const limit = await consumePublicRateLimit(supabase, {
      bucket: 'pagespeed_proxy',
      key: hashRateLimitKey([getClientIp(event.headers as Record<string, string | undefined>), target.hostname]),
      maxAttempts: 20,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return {
        statusCode: limit.statusCode,
        headers: {
          ...headers,
          ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}),
        },
        body: JSON.stringify({ error: limit.statusCode === 429 ? 'Too many PageSpeed checks' : 'Rate limit unavailable' }),
      };
    }

    const validStrategy = strategy === 'desktop' ? 'desktop' : 'mobile';
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target.toString())}&strategy=${validStrategy}&key=${apiKey}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errorMsg }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('pagespeed error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
