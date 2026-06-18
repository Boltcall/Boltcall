import type { Handler } from '@netlify/functions';
import { withLegacyHandler } from './_shared/runtime-compat';

import { notifyInfo } from './_shared/notify';

type OfferSlug = 'after-hours-lead-rescue' | 'automatic-reviews-agent' | 'reminders-agent';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const offerNames: Record<OfferSlug, string> = {
  'after-hours-lead-rescue': 'After-Hours Lead Rescue Setup',
  'automatic-reviews-agent': 'Automatic Reviews Agent Setup',
  'reminders-agent': 'Reminders Agent Setup',
};

function json(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function getHeader(input: Record<string, string | undefined>, name: string) {
  return input[name] || input[name.toLowerCase()] || input[name.toUpperCase()];
}

function clean(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isOfferSlug(value: unknown): value is OfferSlug {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(offerNames, value);
}

function formatField(fields: Record<string, string>, key: string, label: string) {
  const value = fields[key];
  return value ? `${label}: ${value}` : `${label}: not provided`;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const expectedSecret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
  if (!expectedSecret) {
    return json(500, { error: 'Internal secret is not configured.' });
  }

  const providedSecret = getHeader(event.headers as Record<string, string | undefined>, 'x-internal-secret') || '';
  if (providedSecret !== expectedSecret) {
    return json(401, { error: 'Unauthorized' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const requestId = clean(parsed.request_id, 120);
  const offerSlug = parsed.offer_slug;
  const pagePath = clean(parsed.page_path, 120);
  const rawFields = parsed.fields;
  const fields = rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)
    ? Object.fromEntries(
      Object.entries(rawFields as Record<string, unknown>).map(([key, value]) => [key, clean(value)]),
    )
    : {};

  if (!requestId) return json(400, { error: 'request_id is required.' });
  if (!isOfferSlug(offerSlug)) return json(400, { error: 'Unknown setup offer.' });
  if (parsed.sms_consent !== true) return json(400, { error: 'SMS consent is required.' });

  await notifyInfo(
    [
      'New Boltcall setup request - fulfillment automation',
      `Offer: ${offerNames[offerSlug]} (${offerSlug})`,
      `Request ID: ${requestId}`,
      `Page: ${pagePath || 'not provided'}`,
      formatField(fields, 'businessName', 'Business'),
      formatField(fields, 'contactName', 'Contact'),
      formatField(fields, 'email', 'Email'),
      formatField(fields, 'phone', 'Mobile'),
      formatField(fields, 'businessPhone', 'Business phone'),
      'Status: accepted by setup-request-fulfillment',
      'Next: Run one test message before importing the first 100 contacts.',
    ].join('\n'),
  );

  return json(200, { ok: true, status: 'accepted' });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
