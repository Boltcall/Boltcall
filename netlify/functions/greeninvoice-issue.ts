import type { Handler } from '@netlify/functions';
import { hasSharedSecret } from './_shared/user-auth';

/**
 * Greeninvoice integration — issues Israeli tax invoices (חשבונית מס) for ILS payments.
 *
 * Prerequisites (set in Netlify env):
 *   GREENINVOICE_API_KEY  — from https://app.greeninvoice.co.il/settings/api
 *   GREENINVOICE_SECRET   — same page
 *   GREENINVOICE_SANDBOX  — set to 'true' for testing; remove for production
 *
 * Docs: https://api.greeninvoice.co.il/
 *
 * This is a scaffold — wire up real customer VAT ID / business number
 * lookup from Supabase workspaces table once that column exists.
 */

const GREENINVOICE_BASE = process.env.GREENINVOICE_SANDBOX === 'true'
  ? 'https://sandbox.d.greeninvoice.co.il/api/v1'
  : 'https://api.greeninvoice.co.il/api/v1';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Secret, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${GREENINVOICE_BASE}/account/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: process.env.GREENINVOICE_API_KEY,
      secret: process.env.GREENINVOICE_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`Greeninvoice auth failed: ${res.status}`);
  }
  const data = await res.json();
  return data.token as string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const hasSecretConfigured = Boolean(
    process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || process.env.CRON_SECRET,
  );
  if (!hasSecretConfigured) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal API secret not configured' }) };
  }
  if (!hasSharedSecret(event)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (!process.env.GREENINVOICE_API_KEY || !process.env.GREENINVOICE_SECRET) {
    console.warn('[greeninvoice-issue] Credentials not configured — skipping');
    return { statusCode: 200, headers, body: JSON.stringify({ skipped: true, reason: 'not_configured' }) };
  }

  try {
    const { stripeInvoiceId, userId, amountILS, customerEmail, customerName } = JSON.parse(event.body || '{}');

    if (!stripeInvoiceId || !amountILS) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing stripeInvoiceId or amountILS' }) };
    }

    const token = await getAuthToken();

    // Greeninvoice document type 320 = tax invoice (חשבונית מס)
    // type 305 = receipt + invoice (חשבונית קבלה) — valid for B2C
    const documentType = 305;

    const payload = {
      description: `Boltcall subscription — ${stripeInvoiceId}`,
      type: documentType,
      lang: 'he',
      currency: 'ILS',
      vatType: 0, // 0 = regular (18%)
      discount: 0,
      roundingType: 0,
      signed: true,
      client: {
        name: customerName || customerEmail || 'Boltcall Customer',
        emails: customerEmail ? [customerEmail] : [],
      },
      income: [
        {
          description: 'Boltcall AI Platform — Monthly Subscription',
          quantity: 1,
          price: Math.round(amountILS / 100), // Stripe stores in agorot (1/100 ₪)
          currency: 'ILS',
          vatType: 0,
        },
      ],
      payment: [
        {
          type: 4, // Credit card
          price: Math.round(amountILS / 100),
          currency: 'ILS',
          date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
        },
      ],
    };

    const res = await fetch(`${GREENINVOICE_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[greeninvoice-issue] API error:', result);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Greeninvoice API error', detail: result }) };
    }

    console.log(`[greeninvoice-issue] Invoice issued: id=${result.id}, number=${result.number}, userId=${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        greeninvoiceId: result.id,
        invoiceNumber: result.number,
        pdfUrl: result.url,
      }),
    };
  } catch (err: any) {
    console.error('[greeninvoice-issue] Unhandled error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
