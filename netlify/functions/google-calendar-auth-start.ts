import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Google Calendar OAuth — Step 1: Generate the OAuth authorization URL.
 *
 * The frontend calls this function to get the Google OAuth URL.
 * After authorization, Google redirects to the callback function.
 *
 * Environment variables:
 *   - GOOGLE_CLIENT_ID — Google OAuth Client ID
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
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured' }),
    };
  }

  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/google-calendar-auth-callback`;

  const state = createOAuthState('google_calendar', auth.userId);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',      // Get refresh_token
    prompt: 'consent',           // Always show consent to get refresh_token
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url }),
  };
};

export default withLegacyHandler(handler);
