import { Handler } from '@netlify/functions';
import { extractApiKey, validateApiKey } from './_shared/validate-api-key';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * GET /.netlify/functions/api-me
 *
 * Zapier authentication test endpoint.
 * Validates the user's API key and returns account info.
 *
 * Auth: API key via Authorization header (Bearer bc_...) or ?api_key=bc_...
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

  const apiKey = extractApiKey(
    event.headers as Record<string, string>,
    event.queryStringParameters
  );

  if (!apiKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing API key. Send as Authorization: Bearer bc_... or ?api_key=bc_...' }),
    };
  }

  const validation = await validateApiKey(apiKey);

  if (!validation.valid || !validation.userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: validation.error || 'Invalid API key' }),
    };
  }

  const supabase = getSupabase();

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('business_name, industry, phone, website')
    .eq('user_id', validation.userId)
    .single();

  const { data: authUser } = await supabase.auth.admin.getUserById(validation.userId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: validation.userId,
      email: authUser?.user?.email || null,
      business_name: profile?.business_name || null,
      industry: profile?.industry || null,
      phone: profile?.phone || null,
      website: profile?.website || null,
      api_key_name: validation.keyName,
      permissions: validation.permissions,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
