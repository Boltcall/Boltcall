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
    ['Call source', valueOf(body, ['source_name', 'source', 'referrer', 'referring_source'])],
    ['Campaign', valueOf(body, ['campaign', 'campaign_name', 'utm_campaign'])],
    ['Keywords', valueOf(body, ['keywords', 'keyword', 'utm_term'])],
    ['Tracking number', valueOf(body, ['tracking_number', 'tracking_phone_number'])],
    ['Landing page', valueOf(body, ['landing_page_url', 'landing_page', 'referring_url'])],
    ['Form', valueOf(body, ['form_name', 'form', 'form_url'])],
    ['Location', [valueOf(body, ['customer_city', 'city']), valueOf(body, ['customer_state', 'state'])].filter(Boolean).join(', ')],
    ['Message', valueOf(body, ['message', 'note', 'notes', 'comments', 'call_summary', 'transcription'])],
  ].filter(([, value]) => value);

  return details.length ? details.map(([label, value]) => `${label}: ${value}`).join('\n') : null;
}

function normalizeCallRailLead(body: Record<string, any>, userId: string): Record<string, any> {
  const externalId = valueOf(body, [
    'id',
    'call_id',
    'callrail_id',
    'lead_id',
    'form_submission_id',
    'form_id',
    'conversation_id',
  ]);
  const fullName = valueOf(body, ['customer_name', 'name', 'caller_name', 'full_name', 'lead_name']);

  return {
    user_id: userId,
    source: 'callrail',
    external_id: externalId || undefined,
    idempotency_key: externalId ? `callrail:${externalId}` : undefined,
    first_name: valueOf(body, ['first_name', 'firstName']) || undefined,
    last_name: valueOf(body, ['last_name', 'lastName']) || undefined,
    name: fullName || undefined,
    email: valueOf(body, ['email', 'customer_email', 'lead_email']) || undefined,
    phone: valueOf(body, ['customer_phone_number', 'phone_number', 'caller_phone_number', 'phone', 'lead_phone']) || undefined,
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

  const lead = normalizeCallRailLead(body, auth.userId);
  if (!lead.email && !lead.phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'At least one of email or phone is required' }) };
  }

  try {
    const outcome = await handleInboundLead({ body: lead, source: 'callrail' }, leadResponseDeps(getSupabase()));
    if (outcome.status === 'rejected') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: outcome.warnings.join(', ') || 'Lead rejected', outcome }) };
    }
    if (outcome.status === 'failed') {
      await notifyError('callrail-lead-webhook: Lead processing failed', new Error(outcome.warnings.join(', ') || 'lead processing failed'));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process CallRail lead', outcome }) };
    }

    return { statusCode: 201, headers, body: JSON.stringify({ success: true, outcome, lead: outcome.lead }) };
  } catch (error) {
    console.error('CallRail lead webhook error:', error);
    await notifyError('callrail-lead-webhook: Unhandled exception', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'CallRail lead processing failed' }) };
  }
};

export default withLegacyHandler(handler);
