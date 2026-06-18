import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function hasCreateSecret(headers: Record<string, string | undefined>): boolean {
  const configured = process.env.DEMO_SESSION_CREATE_SECRET || process.env.INTERNAL_API_SECRET;
  if (!configured) return false;
  const provided = headers['x-demo-session-secret'] || headers['x-internal-secret'];
  return provided === configured;
}

export const handler: Handler = async (event) => {
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
  if (!hasCreateSecret(event.headers as Record<string, string>)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const businessName = clean(body.business_name ?? body.businessName, 160);
  if (!businessName) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'business_name is required' }) };
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('demo_sessions')
    .insert({
      business_name: businessName,
      niche: clean(body.niche, 120),
      services: clean(body.services, 1000),
      location: clean(body.location, 160),
      website_url: clean(body.website_url ?? body.websiteUrl, 300),
      prospect_name: clean(body.prospect_name ?? body.prospectName, 160),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('demo-session-create insert failed:', error);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not create demo session' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: data.id,
      url: `https://boltcall.org/receptionist-demo?id=${data.id}`,
    }),
  };
};

export default withLegacyHandler(handler);
