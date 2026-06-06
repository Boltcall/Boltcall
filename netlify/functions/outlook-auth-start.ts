import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';

/**
 * Outlook OAuth — Step 1: Generate the Microsoft OAuth authorization URL.
 *
 * The frontend calls this function to get the Outlook OAuth URL.
 * After authorization, Microsoft redirects to the callback function.
 *
 * Environment variables:
 *   - MICROSOFT_CLIENT_ID — Microsoft App Registration Client ID
 *   - URL or DEPLOY_URL — Netlify site URL (auto-set by Netlify)
 *
 * Query parameters:
 *   - user_id — Supabase auth user ID to associate with the connection
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const SCOPES = [
  'Mail.Read',
  'Mail.Send',
  'User.Read',
  'offline_access',
].join(' ');

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'MICROSOFT_CLIENT_ID not configured' }),
    };
  }

  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/outlook-auth-callback`;

  const state = createOAuthState('outlook', auth.userId);

  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    response_mode: 'query',
    state,
  });

  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url }),
  };
};
