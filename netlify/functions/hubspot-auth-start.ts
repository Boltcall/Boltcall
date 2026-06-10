import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
].join(' ');

const DEFAULT_HUBSPOT_CLIENT_ID = '46c5edfe-64a1-4b6b-8f0d-e83faeca8124';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID || DEFAULT_HUBSPOT_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'HUBSPOT_CLIENT_ID not configured' }),
    };
  }

  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/hubspot-auth-callback`;
  const state = createOAuthState('hubspot', auth.userId);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: `https://app.hubspot.com/oauth/authorize?${params.toString()}` }),
  };
};
