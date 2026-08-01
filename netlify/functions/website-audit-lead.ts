import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { notifyInfo } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

const COMPANY_RE = /^[\p{L}\p{N} .,'&-]{2,150}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizeUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (origin && !cors.allowed) return json(headers, 403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') return json(headers, 405, { error: 'Method not allowed' });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(headers, 400, { error: 'Invalid JSON' });
  }

  const companyName = clean(body.companyName, 150);
  const email = clean(body.email, 190).toLowerCase();
  const url = normalizeUrl(clean(body.url, 500));

  if (!COMPANY_RE.test(companyName)) return json(headers, 400, { error: 'Enter a valid company name' });
  if (!EMAIL_RE.test(email)) return json(headers, 400, { error: 'Enter a valid email' });
  if (!url) return json(headers, 400, { error: 'Enter a valid website URL' });

  const supabase = getServiceSupabase();
  const ip = getClientIp(event.headers as Record<string, string | undefined>);

  const limit = await consumePublicRateLimit(supabase, {
    bucket: 'website_audit_lead_ip',
    key: hashRateLimitKey([ip, email]),
    maxAttempts: IP_MAX_ATTEMPTS,
    windowSeconds: IP_WINDOW_SECONDS,
  });
  if (!limit.allowed) {
    return {
      statusCode: limit.statusCode,
      headers: {
        ...headers,
        ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({ error: 'Too many attempts. Try again later.' }),
    };
  }

  const { error: insertError } = await supabase.from('website_leads').insert({
    company_name: companyName,
    email,
    url,
    source: 'website_audit',
  });

  if (insertError) {
    console.error('[website-audit-lead] insert failed:', insertError);
    return json(headers, 500, { error: 'Could not save your details right now' });
  }

  notifyInfo(`🔍 Website audit lead: ${companyName} · ${email} · ${url}`).catch(
    (e) => console.error('[website-audit-lead] notify failed:', e),
  );

  const modalUrl = process.env.WEBSITE_AUDIT_MODAL_URL;
  if (modalUrl) {
    fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, url, email }),
    }).catch((e) => console.error('[website-audit-lead] report generation trigger failed:', e));
  }

  return json(headers, 200, { ok: true });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
