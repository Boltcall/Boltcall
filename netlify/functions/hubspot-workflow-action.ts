import crypto from 'crypto';
import type { Handler, HandlerEvent } from '@netlify/functions';
import Retell from 'retell-sdk';
import { withLegacyHandler } from './_shared/runtime-compat';

import { getAppSecret } from './_shared/app-secrets';
import { fireWebhooks } from './_shared/fire-webhooks';
import { handleInboundLead } from './_shared/lead-response-service';
import { getServiceSupabase } from './_shared/token-utils';

const headers = {
  'Content-Type': 'application/json',
};

function getHeader(event: HandlerEvent, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function json(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function failContinue(status: string, detail?: string) {
  return json(200, {
    outputFields: {
      hs_execution_state: 'FAIL_CONTINUE',
      boltcall_status: status,
      ...(detail ? { detail } : {}),
    },
  });
}

function rawUrl(event: HandlerEvent): string {
  const maybeRaw = (event as HandlerEvent & { rawUrl?: string }).rawUrl;
  if (maybeRaw) return maybeRaw;

  const proto = getHeader(event, 'x-forwarded-proto') || 'https';
  const host = getHeader(event, 'host') || new URL(process.env.URL || 'https://boltcall.org').host;
  return `${proto}://${host}${event.path}`;
}

async function verifyHubSpotSignature(event: HandlerEvent): Promise<boolean> {
  const secret = process.env.HUBSPOT_CLIENT_SECRET || await getAppSecret('hubspot_client_secret') || '';
  const signature = getHeader(event, 'x-hubspot-signature-v3') || '';
  const timestamp = getHeader(event, 'x-hubspot-request-timestamp') || '';

  if (!secret || !signature || !timestamp) return false;

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  const source = `${event.httpMethod}${decodeURIComponent(rawUrl(event))}${event.body || ''}${timestamp}`;
  const expected = crypto.createHmac('sha256', secret).update(source).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);

  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function portalIdFrom(body: Record<string, any>): string | null {
  const portalId = body.origin?.portalId || body.portalId;
  return portalId == null ? null : String(portalId);
}

function portalMatches(config: Record<string, any> | null | undefined, portalId: string): boolean {
  const account = config?.account || {};
  const candidates = [
    account.hub_id,
    account.hubId,
    account.portalId,
    account.portal_id,
    config?.hub_id,
    config?.portalId,
  ];
  return candidates.some((candidate) => candidate != null && String(candidate) === portalId);
}

function inputValue(inputFields: Record<string, any>, key: string): string {
  const value = inputFields?.[key];
  if (value && typeof value === 'object' && 'value' in value) return String(value.value || '').trim();
  return String(value || '').trim();
}

function leadFromWorkflow(body: Record<string, any>, userId: string, portalId: string): Record<string, any> {
  const inputFields = body.inputFields || {};
  const properties = body.object?.properties || {};
  const objectId = body.object?.objectId || properties.hs_object_id || null;
  const email = inputValue(inputFields, 'email') || properties.email || null;
  const phone = inputValue(inputFields, 'phone') || properties.phone || properties.mobilephone || null;
  const firstName = inputValue(inputFields, 'first_name') || properties.firstname || null;
  const lastName = inputValue(inputFields, 'last_name') || properties.lastname || null;
  const leadSource = inputValue(inputFields, 'leadSource') || 'hubspot_workflow';

  return {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    source: 'hubspot_workflow',
    status: 'pending',
    external_id: objectId ? `hubspot-contact:${portalId}:${objectId}` : undefined,
    notes: leadSource,
    raw_data: {
      provider: 'hubspot',
      portal_id: portalId,
      object_id: objectId,
      callback_id: body.callbackId || null,
      workflow_id: body.context?.workflowId || null,
      lead_source: leadSource,
    },
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!(await verifyHubSpotSignature(event))) {
    return json(401, { error: 'Invalid HubSpot signature' });
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const portalId = portalIdFrom(body);
  if (!portalId) {
    return failContinue('missing_portal_id');
  }

  const supabase = getServiceSupabase();
  const { data: integrations, error } = await supabase
    .from('user_integrations')
    .select('user_id, config')
    .eq('provider', 'hubspot')
    .eq('is_connected', true);

  if (error) {
    console.error('HubSpot workflow integration lookup failed:', error);
    return json(500, { error: 'Integration lookup failed' });
  }

  const integration = (integrations || []).find((row: any) => portalMatches(row.config, portalId));
  if (!integration?.user_id) {
    return failContinue('integration_not_found');
  }

  const lead = leadFromWorkflow(body, integration.user_id, portalId);
  if (!lead.email && !lead.phone) {
    return failContinue('missing_contact');
  }

  const retellApiKey = process.env.RETELL_API_KEY;
  const outcome = await handleInboundLead(
    { body: lead, source: 'hubspot_workflow' },
    {
      supabase,
      retellApiKey,
      retellFactory: retellApiKey ? () => new Retell({ apiKey: retellApiKey }) : undefined,
      fireWebhooks,
    },
  );

  if (outcome.status === 'failed') {
    return json(500, {
      error: 'Boltcall lead processing failed',
      outputFields: {
        hs_execution_state: 'FAIL_CONTINUE',
        boltcall_status: outcome.status,
      },
    });
  }

  if (outcome.status === 'rejected') {
    return failContinue('rejected', outcome.warnings.join(', '));
  }

  return json(200, {
    outputFields: {
      hs_execution_state: 'SUCCESS',
      boltcall_status: outcome.deduped ? 'deduped' : outcome.status,
      boltcall_lead_id: outcome.lead_id || '',
      first_touch_status: outcome.first_touch_status,
    },
  });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
