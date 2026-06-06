import { Handler } from '@netlify/functions';
import { extractApiKey, validateApiKey } from './_shared/validate-api-key';
import { getSupabase } from './_shared/token-utils';

/**
 * GET /.netlify/functions/api-lead-search
 *
 * Zapier/Make search endpoint. Authenticates with a Boltcall API key and
 * searches only the authenticated workspace's leads by email, phone,
 * external_id, or idempotency_key.
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

type SearchParam = {
  column?: 'email' | 'phone';
  rawField?: 'external_id' | 'idempotency_key';
  value: string;
};

function textParam(params: Record<string, string | undefined> | null, ...keys: string[]) {
  for (const key of keys) {
    const value = params?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseLimit(params: Record<string, string | undefined> | null) {
  const n = Number(params?.limit || 10);
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function searchParams(params: Record<string, string | undefined> | null): SearchParam[] {
  const out: SearchParam[] = [];
  const email = textParam(params, 'email');
  const phone = textParam(params, 'phone', 'phone_number');
  const externalId = textParam(params, 'external_id', 'externalId');
  const idempotencyKey = textParam(params, 'idempotency_key', 'idempotencyKey');

  if (email) out.push({ column: 'email', value: email });
  if (phone) out.push({ column: 'phone', value: phone });
  if (externalId) out.push({ rawField: 'external_id', value: externalId });
  if (idempotencyKey) out.push({ rawField: 'idempotency_key', value: idempotencyKey });

  return out;
}

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
    created_at: row.created_at || '',
    first_touch_status: row.raw_data?.first_touch_status || null,
    retell_call_started: Boolean(row.raw_data?.retell_call_started),
    external_id: row.raw_data?.external_id || null,
    idempotency_key: row.raw_data?.idempotency_key || null,
  };
}

async function runSearch(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  param: SearchParam,
  limit: number,
) {
  let query = supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, source, status, created_at, raw_data')
    .eq('user_id', userId);

  if (param.column) {
    query = query.eq(param.column, param.value);
  } else if (param.rawField) {
    query = query.filter(`raw_data->>${param.rawField}`, 'eq', param.value);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = extractApiKey(
    event.headers as Record<string, string>,
    event.queryStringParameters,
  );

  if (!apiKey) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: validation.error || 'Invalid API key' }) };
  }

  const params = searchParams(event.queryStringParameters);
  if (params.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Provide email, phone, external_id, or idempotency_key' }),
    };
  }

  const supabase = getSupabase();
  const limit = parseLimit(event.queryStringParameters);

  try {
    const rows = (await Promise.all(params.map((param) => runSearch(supabase, validation.userId!, param, limit))))
      .flat();
    const seen = new Set<string>();
    const unique = rows
      .filter((row) => {
        if (!row?.id || seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, limit)
      .map(formatLead);

    return { statusCode: 200, headers, body: JSON.stringify(unique) };
  } catch (error) {
    console.error('api-lead-search query error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to search leads' }) };
  }
};
