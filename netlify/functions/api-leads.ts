import { Handler } from '@netlify/functions';
import { extractApiKey, validateApiKey } from './_shared/validate-api-key';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * GET /.netlify/functions/api-leads
 *
 * Zapier polling trigger endpoint.
 * Returns an array of leads for the authenticated user, sorted newest-first.
 * Zapier deduplicates by `id` so it only triggers on truly new leads.
 *
 * Auth: API key via Authorization header (Bearer bc_...) or ?api_key=bc_...
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function formatLead(row: Record<string, any>) {
  const first = row.first_name || '';
  const last = row.last_name || '';
  const name = [first, last].filter(Boolean).join(' ') || row.raw_data?.name || row.raw_data?.full_name || '';

  return {
    id: row.id,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    name,
    email: row.email || '',
    phone: row.phone || '',
    source: row.source || '',
    status: row.status || '',
    call_status: row.call_status || null,
    call_duration: row.call_duration || null,
    sms_sent: Boolean(row.sms_sent),
    created_at: row.created_at || '',
    first_touch_status: row.raw_data?.first_touch_status || null,
    retell_call_started: Boolean(row.raw_data?.retell_call_started),
    external_id: row.raw_data?.external_id || null,
    idempotency_key: row.raw_data?.idempotency_key || null,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = extractApiKey(
    event.headers as Record<string, string>,
    event.queryStringParameters
  );

  if (!apiKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing API key' }),
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

  const { data: leads, error } = await supabase
    .from('leads')
    .select(
      'id, first_name, last_name, email, phone, source, status, call_status, call_duration, sms_sent, created_at, raw_data'
    )
    .eq('user_id', validation.userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('api-leads query error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch leads' }),
    };
  }

  // Zapier expects a top-level array
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify((leads || []).map(formatLead)),
  };
};

export default withLegacyHandler(handler);
