import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { fireWebhooks } from './_shared/fire-webhooks';
import { handleInboundLead } from './_shared/lead-response-service';
import { notifyError } from './_shared/notify';
import { getSupabase } from './_shared/token-utils';
import { authenticateApiKey } from './_shared/validate-api-key';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function valueOf(body: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function buildNotes(body: Record<string, any>): string | null {
  const details = [
    ['Project', valueOf(body, ['projectType', 'project_type', 'task', 'category', 'service'])],
    ['Location', [valueOf(body, ['city']), valueOf(body, ['state']), valueOf(body, ['zipCode', 'zip', 'postalCode'])].filter(Boolean).join(', ')],
    ['Message', valueOf(body, ['message', 'comments', 'description', 'notes'])],
  ].filter(([, value]) => value);

  return details.length ? details.map(([label, value]) => `${label}: ${value}`).join('\n') : null;
}

function normalizeAngiLead(body: Record<string, any>, userId: string): Record<string, any> {
  const externalId = valueOf(body, ['leadId', 'lead_id', 'id', 'requestId', 'request_id', 'opportunityId']);
  const fullName = valueOf(body, ['name', 'fullName', 'customerName', 'contactName']);

  return {
    user_id: userId,
    source: 'angi',
    external_id: externalId || undefined,
    idempotency_key: externalId ? `angi:${externalId}` : undefined,
    first_name: valueOf(body, ['firstName', 'first_name']) || undefined,
    last_name: valueOf(body, ['lastName', 'last_name']) || undefined,
    name: fullName || undefined,
    email: valueOf(body, ['email', 'emailAddress', 'contactEmail']) || undefined,
    phone: valueOf(body, ['phone', 'phoneNumber', 'phone_number', 'contactPhone']) || undefined,
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

  const lead = normalizeAngiLead(body, auth.userId);
  if (!lead.email && !lead.phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'At least one of email or phone is required' }) };
  }

  try {
    const outcome = await handleInboundLead({ body: lead, source: 'angi' }, leadResponseDeps(getSupabase()));
    if (outcome.status === 'rejected') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: outcome.warnings.join(', ') || 'Lead rejected', outcome }) };
    }
    if (outcome.status === 'failed') {
      await notifyError('angi-lead-webhook: Lead processing failed', new Error(outcome.warnings.join(', ') || 'lead processing failed'));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process Angi lead', outcome }) };
    }

    return { statusCode: 201, headers, body: JSON.stringify({ success: true, outcome, lead: outcome.lead }) };
  } catch (error) {
    console.error('Angi lead webhook error:', error);
    await notifyError('angi-lead-webhook: Unhandled exception', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Angi lead processing failed' }) };
  }
};

export default withLegacyHandler(handler);
