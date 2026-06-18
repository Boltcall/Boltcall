import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getStrongEnvSecret, verifyJsonToken } from './_shared/signed-token';
import { withLegacyHandler } from './_shared/runtime-compat';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
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

  const path = event.path
    .replace('/.netlify/functions/break-our-ai', '')
    .replace(/^\//, '');

  if (event.httpMethod === 'POST' && path === 'winner') {
    try {
      const body = JSON.parse(event.body || '{}');
      const name = clean(body.name, 120);
      const email = clean(body.email, 254)?.toLowerCase();
      const businessName = clean(body.businessName, 160);
      const businessType = clean(body.businessType, 80);
      const websiteUrl = clean(body.websiteUrl, 300);
      const phone = clean(body.phone, 40);
      const city = clean(body.city, 120);
      const biggestChallenge = clean(body.biggestChallenge, 1000);
      const claimToken = clean(body.claimToken, 2048);

      if (!name || !email || !EMAIL_RE.test(email) || !businessName || !businessType || !claimToken) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'valid claim token, name, email, businessName, and businessType are required' }),
        };
      }

      const claimSecret = getStrongEnvSecret('CHALLENGE_CLAIM_SECRET', 'INTERNAL_API_SECRET');
      if (!claimSecret) {
        return { statusCode: 503, headers, body: JSON.stringify({ error: 'Prize claim is not configured' }) };
      }

      const claim = verifyJsonToken<{ name: string; email: string; challenge: string }>(claimToken, claimSecret);
      if (!claim || claim.challenge !== 'break-our-ai' || claim.email !== email) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Invalid or expired prize claim' }) };
      }

      const supabase = getServiceSupabase();
      const { error } = await supabase.from('challenge_winners').insert({
        name,
        email,
        business_name: businessName,
        business_type: businessType,
        website_url: websiteUrl,
        phone,
        city,
        biggest_challenge: biggestChallenge,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Winner submission insert error:', error);
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not save prize claim' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (err: any) {
      console.error('Winner submission error:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Something went wrong' }),
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' }),
  };
};


export const testHandler = handler;
export default withLegacyHandler(handler);
