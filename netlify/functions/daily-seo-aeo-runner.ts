import type { Handler } from '@netlify/functions';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';
import { runDailySeoAeo } from './_shared/daily-seo-aeo';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function parseBody(body: string | null) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, headers: JSON_HEADERS, body: JSON.stringify({ error: authz.message }) };
  }

  const body = parseBody(event.body || null);
  if (!body) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  try {
    const result = await runDailySeoAeo({
      supabase: getServiceSupabase(),
      date: typeof body.date === 'string' ? body.date : undefined,
    });

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: message }) };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
