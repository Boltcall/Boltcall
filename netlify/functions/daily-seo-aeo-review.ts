import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { fetchDailySeoReview } from './_shared/daily-seo-aeo';
import { findWorkspaceForUser } from './_shared/setup-workspace';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const DEFAULT_WORKSPACE_ID = '001dd963-d375-474c-9073-21c887771243';

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const v2cors = getV2CorsHeaders(origin, { methods: 'GET' });
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (origin && !v2cors.allowed) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Missing bearer token' }) };

  const supabase = getServiceSupabase();
  const { data: userRes, error } = await supabase.auth.getUser(token);
  if (error || !userRes?.user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const workspace = await findWorkspaceForUser<{ id: string }>(userRes.user.id, 'id');
  if (!workspace?.id || workspace.id !== (process.env.DAILY_SEO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Workspace not allowed' }) };
  }

  const date = event.queryStringParameters?.date || new Date().toISOString().slice(0, 10);
  const review = await fetchDailySeoReview(supabase, date);
  return { statusCode: 200, headers: cors, body: JSON.stringify(review) };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
