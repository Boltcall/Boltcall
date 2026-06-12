import type { Handler } from '@netlify/functions';
import { createHash } from 'node:crypto';

import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { notifyInfo } from './_shared/notify';
import { getServiceSupabase } from './_shared/token-utils';

type OfferSlug = 'after-hours-lead-rescue' | 'automatic-reviews-agent' | 'reminders-agent';

interface OfferSpec {
  path: string;
  required: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 24_000;

const offerSpecs: Record<OfferSlug, OfferSpec> = {
  'after-hours-lead-rescue': {
    path: '/after-hours-lead-rescue',
    required: [
      'businessName',
      'contactName',
      'email',
      'phone',
      'businessPhone',
      'industry',
      'currentPhoneSystem',
      'timezone',
      'afterHoursStart',
      'afterHoursEnd',
      'estimatedMissedCalls',
      'missedCallSource',
    ],
  },
  'automatic-reviews-agent': {
    path: '/automatic-reviews-agent',
    required: [
      'businessName',
      'contactName',
      'email',
      'phone',
      'businessPhone',
      'industry',
      'googleReviewLink',
      'contactSource',
      'estimatedContacts',
    ],
  },
  'reminders-agent': {
    path: '/reminders-agent',
    required: [
      'businessName',
      'contactName',
      'email',
      'phone',
      'businessPhone',
      'industry',
      'reminderType',
      'bookingLink',
      'contactSource',
      'estimatedContacts',
    ],
  },
};

function json(statusCode: number, headers: Record<string, string>, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function clean(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanFields(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    fields[key] = clean(value, key.toLowerCase().includes('link') || key === 'website' ? 1000 : 500);
  }
  return fields;
}

function isOfferSlug(value: unknown): value is OfferSlug {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(offerSpecs, value);
}

function validateBody(body: Record<string, unknown>) {
  const offerSlug = body.offerSlug;
  if (!isOfferSlug(offerSlug)) return { error: 'Unknown setup offer.' };

  const spec = offerSpecs[offerSlug];
  const fields = cleanFields(body.fields);
  const pagePath = clean(body.pagePath, 120) || spec.path;

  for (const field of spec.required) {
    if (!fields[field]) return { error: `${field} is required.` };
  }

  if (!EMAIL_RE.test(fields.email)) return { error: 'A valid email is required.' };
  if (body.smsConsent !== true) return { error: 'SMS consent is required.' };

  return { offerSlug, spec, fields, pagePath };
}

function getHeader(headers: Record<string, string | undefined>, name: string) {
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function hashIp(headers: Record<string, string | undefined>) {
  const forwarded = getHeader(headers, 'x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || getHeader(headers, 'client-ip') || 'unknown';
  return createHash('sha256')
    .update(`${ip}:${process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || 'boltcall'}`)
    .digest('hex');
}

async function forwardToFulfillment(args: {
  requestId: string;
  offerSlug: OfferSlug;
  pagePath: string;
  fields: Record<string, string>;
  smsConsent: boolean;
}) {
  const webhookUrl =
    process.env.SETUP_REQUEST_FULFILLMENT_WEBHOOK_URL ||
    process.env.LEAD_MAGNET_SETUP_WEBHOOK_URL ||
    '';

  if (!webhookUrl) {
    await notifyInfo(
      [
        'New Boltcall setup request',
        `Offer: ${args.offerSlug}`,
        `Request ID: ${args.requestId}`,
        'Next: open lead_magnet_setup_requests, run one test message, then import the first 100 contacts.',
      ].join('\n'),
    );
    return { status: 'sent' as const };
  }

  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-internal-secret': secret } : {}),
    },
    body: JSON.stringify({
      request_id: args.requestId,
      offer_slug: args.offerSlug,
      page_path: args.pagePath,
      fields: args.fields,
      sms_consent: args.smsConsent,
      source: 'boltcall_public_setup_offer',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Fulfillment webhook failed: ${response.status} ${text.slice(0, 200)}`);
  }

  return { status: 'sent' as const };
}

export const handler: Handler = async (event) => {
  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  const cors = getV2CorsHeaders(requestOrigin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (requestOrigin && !cors.allowed) {
    return json(403, headers, { error: 'Origin not allowed' });
  }
  if (event.httpMethod !== 'POST') {
    return json(405, headers, { error: 'Method not allowed' });
  }
  if ((event.body || '').length > MAX_BODY_BYTES) {
    return json(413, headers, { error: 'Setup request is too large.' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return json(400, headers, { error: 'Invalid JSON body.' });
  }

  const validated = validateBody(parsed);
  if ('error' in validated) {
    return json(400, headers, { error: validated.error });
  }

  try {
    const supabase = getServiceSupabase();
    const row = {
      offer_slug: validated.offerSlug,
      page_path: validated.pagePath,
      business_name: validated.fields.businessName,
      contact_name: validated.fields.contactName,
      contact_email: validated.fields.email.toLowerCase(),
      contact_phone: validated.fields.phone,
      business_phone: validated.fields.businessPhone,
      website: validated.fields.website || null,
      industry: validated.fields.industry,
      sms_consent: true,
      form_data: validated.fields,
      automation_status: 'queued',
      fulfillment_webhook_configured: Boolean(
        process.env.SETUP_REQUEST_FULFILLMENT_WEBHOOK_URL || process.env.LEAD_MAGNET_SETUP_WEBHOOK_URL,
      ),
      source_ip_hash: hashIp(event.headers as Record<string, string | undefined>),
      user_agent: clean(getHeader(event.headers as Record<string, string | undefined>, 'user-agent'), 500) || null,
    };

    const { data, error } = await supabase
      .from('lead_magnet_setup_requests')
      .insert(row)
      .select('id, offer_slug')
      .single();

    if (error || !data) {
      console.error('[setup-request] insert failed:', error?.message);
      return json(502, headers, { error: 'Could not create setup request.' });
    }

    let automationStatus: 'sent' | 'not_configured' | 'failed' = 'not_configured';
    let automationError: string | null = null;
    try {
      const handoff = await forwardToFulfillment({
        requestId: data.id as string,
        offerSlug: validated.offerSlug,
        pagePath: validated.pagePath,
        fields: validated.fields,
        smsConsent: true,
      });
      automationStatus = handoff.status;
    } catch (handoffError) {
      automationStatus = 'failed';
      automationError = handoffError instanceof Error ? handoffError.message : String(handoffError);
      console.error('[setup-request] fulfillment handoff failed:', handoffError);
    }

    const { error: updateError } = await supabase
      .from('lead_magnet_setup_requests')
      .update({
        automation_status: automationStatus,
        automation_error: automationError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      console.warn('[setup-request] automation status update failed:', updateError.message);
    }

    return json(201, headers, {
      ok: true,
      requestId: data.id,
      automationStatus,
      message: "Setup created. Next: we'll run one test message before importing the first 100 contacts.",
    });
  } catch (error) {
    console.error('[setup-request] unhandled error:', error);
    return json(500, headers, { error: 'Setup request failed.' });
  }
};

export const __internals = {
  validateBody,
  offerSpecs,
};
