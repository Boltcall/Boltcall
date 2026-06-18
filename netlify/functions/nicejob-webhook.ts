import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Handler } from '@netlify/functions';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function json(statusCode: number, body: Record<string, any>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function signatureFor(payload: Record<string, any>, timestamp: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${JSON.stringify(payload)}${timestamp}`)
    .digest('hex');
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function verifyNiceJobSignature(body: Record<string, any>, secret: string): { ok: true } | { ok: false; error: string } {
  const payload = body.payload;
  const timestamp = Number(body.signature?.timestamp);
  const signedPayload = String(body.signature?.signed_payload || '');

  if (!payload || typeof payload !== 'object' || !timestamp || !signedPayload) {
    return { ok: false, error: 'NiceJob signature required' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
    return { ok: false, error: 'NiceJob signature timestamp expired' };
  }

  const expected = signatureFor(payload, timestamp, secret);
  if (!signaturesMatch(expected, signedPayload)) {
    return { ok: false, error: 'Invalid NiceJob signature' };
  }

  return { ok: true };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const secret = process.env.NICEJOB_WEBHOOK_SECRET;
  if (!secret) {
    return json(503, { error: 'NICEJOB_WEBHOOK_SECRET not configured' });
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const signature = verifyNiceJobSignature(body, secret);
  if (!signature.ok) {
    return json(401, { error: signature.error });
  }

  const payload = body.payload || {};
  console.log('[nicejob-webhook] accepted event', {
    company_id: payload.company_id,
    entity_id: payload.entity_id,
    event_code: payload.event_code,
  });

  return json(202, {
    success: true,
    source: 'nicejob',
    event_code: payload.event_code || null,
    entity_id: payload.entity_id || null,
  });
};

export default withLegacyHandler(handler);
