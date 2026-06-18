import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Facebook OAuth — Step 1: Generate the OAuth authorization URL.
 *
 * The frontend redirects the user to the returned URL to start the Facebook login flow.
 * After authorization, Facebook redirects to the callback function.
 *
 * Environment variables:
 *   - FB_APP_ID — Facebook App ID
 *   - URL or DEPLOY_URL — Netlify site URL (auto-set by Netlify)
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const SCOPES = [
  'pages_manage_metadata',
  'pages_manage_ads',
  'pages_read_engagement',
  'leads_retrieval',
  'pages_show_list',
  'public_profile',
].join(',');

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.FB_APP_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'FB_APP_ID not configured' }),
    };
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = encodeURIComponent(`${baseUrl}/.netlify/functions/facebook-auth-callback`);

  // Embed user_id in the state param so the callback can associate the connection
  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;
  const state = createOAuthState('facebook', auth.userId);

  const url =
    `https://www.facebook.com/v20.0/dialog/oauth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=${SCOPES}`;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url }),
  };
};

export default withLegacyHandler(handler);
