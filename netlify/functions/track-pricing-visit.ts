import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': 'https://boltcall.org',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function lookupCompany(ip: string): Promise<{ org?: string; city?: string; country?: string } | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === '127.0.0.1' || ip.startsWith('::')) return null;
  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return { org: data.org, city: data.city, country: data.country };
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body: Record<string, any> = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { sessionDuration, converted, referrer, fingerprint } = body;

  // Skip tracking for converted visitors — they're already in the funnel
  if (converted) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'converted' }) };
  }

  if (!fingerprint) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fingerprint' }) };
  }

  const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || event.headers['client-ip']
    || '';

  const company = await lookupCompany(ip);
  const supabase = getSupabase();

  // Dedup: one row per fingerprint per UTC day
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('pricing_visitors')
    .select('id')
    .eq('fingerprint', fingerprint)
    .gte('created_at', today)
    .maybeSingle();

  if (existing) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'deduped' }) };
  }

  await supabase.from('pricing_visitors').insert({
    ip,
    fingerprint,
    session_duration: sessionDuration ?? 0,
    org: company?.org ?? null,
    city: company?.city ?? null,
    country: company?.country ?? null,
    referrer: referrer || null,
  });

  // Fire n8n webhook if org identified — this triggers the warm sequence
  const webhookUrl = process.env.PRICING_VISITOR_N8N_WEBHOOK;
  if (webhookUrl && company?.org) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'pricing_page_warm_visitor',
        ip,
        org: company.org,
        city: company.city,
        country: company.country,
        session_duration: sessionDuration,
        referrer: referrer || null,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, action: 'tracked', identified: !!company?.org }),
  };
};

export default withLegacyHandler(handler);
