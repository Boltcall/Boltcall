import { Handler } from '@netlify/functions';
import { createOAuthState } from './_shared/oauth-state';
import { requireMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';
import { clioManageBase, clioOAuthCredentials, normalizeRegion } from './_shared/clio';

/**
 * Start the Clio Manage OAuth 2.0 authorization code flow.
 *
 * Redirect URI to register in the Clio developer portal (per region):
 *   https://boltcall.org/.netlify/functions/clio-auth-callback
 *
 * Required environment variables:
 *   - CLIO_CLIENT_ID / CLIO_CLIENT_SECRET            (US app)
 *   - CLIO_CLIENT_ID_EU / CLIO_CLIENT_SECRET_EU      (optional, per extra region)
 *
 * Docs: https://docs.developers.clio.com/api-docs/clio-manage/authorization/
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const region = normalizeRegion(event.queryStringParameters?.region);
  const { clientId } = clioOAuthCredentials(region);
  if (!clientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `No Clio developer application configured for region "${region}"` }),
    };
  }

  const userId = event.queryStringParameters?.user_id || '';
  const auth = await requireMatchingUser(event, userId, headers);
  if (!auth.ok) return auth.response;

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/clio-auth-callback`;
  const state = createOAuthState('clio', auth.userId, { region });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    redirect_on_decline: 'true',
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: `${clioManageBase(region)}/oauth/authorize?${params.toString()}` }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler, { strictCors: true });
