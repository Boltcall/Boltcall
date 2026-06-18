import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_PIPEDRIVE_CLIENT_ID = '3d4d09a12afd8493';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.PIPEDRIVE_CLIENT_ID || DEFAULT_PIPEDRIVE_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'PIPEDRIVE_CLIENT_ID not configured' }),
    };
  }

  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/pipedrive-auth-callback`;
  const state = createOAuthState('pipedrive', auth.userId);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: `https://oauth.pipedrive.com/oauth/authorize?${params.toString()}` }),
  };
};

export default withLegacyHandler(handler);
