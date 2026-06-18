import { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getStrongEnvSecret, signJsonToken } from './_shared/signed-token';
import { withLegacyHandler } from './_shared/runtime-compat';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const secretWord = process.env.CHALLENGE_SECRET_WORD?.toLowerCase().trim();
  if (!secretWord) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Challenge is not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { word, name, email } = body;

    if (!word?.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'word is required' }) };
    }
    if (!name?.trim() || !email?.trim() || !EMAIL_RE.test(email.trim())) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'valid name and email are required' }) };
    }

    const submitted = String(word).toLowerCase().trim().slice(0, 80);
    const isWinner = submitted === secretWord;
    const responseBody: Record<string, unknown> = {
      winner: isWinner,
      message: isWinner
        ? 'You cracked it! You win a free smart website from Boltcall.'
        : 'Not quite - the AI held strong this time.',
    };

    if (isWinner) {
      const claimSecret = getStrongEnvSecret('CHALLENGE_CLAIM_SECRET', 'INTERNAL_API_SECRET');
      if (!claimSecret) {
        return { statusCode: 503, headers, body: JSON.stringify({ error: 'Prize claim is not configured' }) };
      }
      responseBody.claim_token = signJsonToken({
        name: String(name).trim().slice(0, 120),
        email: String(email).trim().toLowerCase().slice(0, 254),
        challenge: 'break-our-ai',
      }, claimSecret, 30 * 60);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };
  } catch (err: any) {
    console.error('Challenge submit error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong' }) };
  }
};

export { handler };

export default withLegacyHandler(handler);
