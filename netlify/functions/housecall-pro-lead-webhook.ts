import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { fireWebhooks } from './_shared/fire-webhooks';
import { handleInboundLead } from './_shared/lead-response-service';
import { notifyError } from './_shared/notify';
import { getSupabase } from './_shared/token-utils';
import { authenticateApiKey } from './_shared/validate-api-key';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function readPath(body: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, body);
}

function valueOf(body: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = key.includes('.') ? readPath(body, key) : body[key];
    if (Array.isArray(value) && value.length) return value.map((item) => String(item).trim()).filter(Boolean).join(', ');
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function buildNotes(body: Record<string, any>): string | null {
  const details = [
    ['Job', valueOf(body, ['job.description', 'description', 'job_name', 'work_order.description'])],
    ['Job status', valueOf(body, ['job.work_status', 'work_status', 'status'])],
    ['Lead source', valueOf(body, ['lead_source', 'lead_source.name', 'source', 'source_name'])],
    ['Location', [
      valueOf(body, ['customer.address.city', 'address.city', 'city']),
      valueOf(body, ['customer.address.state', 'address.state', 'state']),
      valueOf(body, ['customer.address.zip', 'address.zip', 'zip', 'postal_code']),
    ].filter(Boolean).join(', ')],
    ['Tags', valueOf(body, ['tags', 'customer.tags'])],
    ['Message', valueOf(body, ['message', 'notes', 'note', 'comments'])],
  ].filter(([, value]) => value);

  return details.length ? details.map(([label, value]) => `${label}: ${value}`).join('\n') : null;
}

function normalizeHousecallProLead(body: Record<string, any>, userId: string): Record<string, any> {
  const externalId = valueOf(body, [
    'id',
    'lead_id',
    'lead.id',
    'job.id',
    'work_order.id',
    'customer.id',
  ]);
  const fullName = valueOf(body, [
    'customer.name',
    'name',
    'customer.full_name',
    'full_name',
    'contact_name',
  ]);

  return {
    user_id: userId,
    source: 'housecall_pro',
    external_id: externalId || undefined,
    idempotency_key: externalId ? `housecall_pro:${externalId}` : undefined,
    first_name: valueOf(body, ['customer.first_name', 'first_name', 'firstName']) || undefined,
    last_name: valueOf(body, ['customer.last_name', 'last_name', 'lastName']) || undefined,
    name: fullName || undefined,
    email: valueOf(body, ['customer.email', 'email', 'customer.email_address', 'email_address']) || undefined,
    phone: valueOf(body, [
      'customer.mobile_number',
      'customer.phone_number',
      'phone',
      'phone_number',
      'mobile_number',
      'customer.phone',
    ]) || undefined,
    status: 'pending',
    notes: buildNotes(body),
    raw_source: body,
  };
}

function leadResponseDeps(supabase: any) {
  const retellApiKey = process.env.RETELL_API_KEY;
  return {
    supabase,
    retellApiKey,
    retellFactory: retellApiKey ? () => new Retell({ apiKey: retellApiKey }) : undefined,
    fireWebhooks,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await authenticateApiKey(event.headers as Record<string, string>, event.queryStringParameters);
  if (!auth.hasKey || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Valid Boltcall API key required' }) };
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const lead = normalizeHousecallProLead(body, auth.userId);
  if (!lead.email && !lead.phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'At least one of email or phone is required' }) };
  }

  try {
    const outcome = await handleInboundLead({ body: lead, source: 'housecall_pro' }, leadResponseDeps(getSupabase()));
    if (outcome.status === 'rejected') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: outcome.warnings.join(', ') || 'Lead rejected', outcome }) };
    }
    if (outcome.status === 'failed') {
      await notifyError('housecall-pro-lead-webhook: Lead processing failed', new Error(outcome.warnings.join(', ') || 'lead processing failed'));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process Housecall Pro lead', outcome }) };
    }

    return { statusCode: 201, headers, body: JSON.stringify({ success: true, outcome, lead: outcome.lead }) };
  } catch (error) {
    console.error('Housecall Pro lead webhook error:', error);
    await notifyError('housecall-pro-lead-webhook: Unhandled exception', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Housecall Pro lead processing failed' }) };
  }
};
