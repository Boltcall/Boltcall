import { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { withLegacyHandler } from './_shared/runtime-compat';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (origin && !cors.allowed) return json(headers, 403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') return json(headers, 405, { error: 'Method not allowed' });

  let name = '';
  let email = '';
  let companyName: string | null = null;
  let website: string | null = null;
  let whyChoose: string | null = null;
  let allowNotifications = false;
  let referredByCode: string | null = null;
  try {
    const body = JSON.parse(event.body || '{}');
    name = String(body.name || '').trim().slice(0, 200);
    email = String(body.email || '').trim().toLowerCase().slice(0, 320);
    companyName = body.companyName ? String(body.companyName).trim().slice(0, 200) : null;
    website = body.website ? String(body.website).trim().slice(0, 500) : null;
    whyChoose = body.whyChoose ? String(body.whyChoose).trim().slice(0, 2000) : null;
    allowNotifications = Boolean(body.allowNotifications);
    const ref = String(body.referralId || '').trim();
    if (ref && ref !== '0') referredByCode = ref.slice(0, 100);
  } catch {
    return json(headers, 400, { error: 'Invalid JSON' });
  }

  if (!name) return json(headers, 400, { error: 'Name required' });
  if (!email || !EMAIL_RX.test(email)) return json(headers, 400, { error: 'Valid email required' });

  const supabase = getServiceSupabase();

  let limit;
  try {
    limit = await consumePublicRateLimit(supabase, {
      bucket: 'giveaway_entry',
      key: hashRateLimitKey([getClientIp(event.headers as Record<string, string | undefined>), email]),
      maxAttempts: 5,
      windowSeconds: 60 * 60,
    });
  } catch (err) {
    console.error('giveaway-entry rate limit error:', err);
    return json(headers, 503, { error: 'Rate limit unavailable' });
  }
  if (!limit.allowed) {
    return {
      statusCode: limit.statusCode,
      headers: {
        ...headers,
        ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({ error: limit.statusCode === 429 ? 'Too many entries, try again later' : 'Rate limit unavailable' }),
    };
  }

  try {
    // Same email re-entering gets their existing referral code back, not a second entry
    const { data: existing, error: selectError } = await supabase
      .from('giveaway_entries')
      .select('referral_code')
      .eq('contact_email', email)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing?.referral_code) {
      return json(headers, 200, { id: existing.referral_code, alreadyEntered: true });
    }

    const referralCode = randomUUID();
    const { error: insertError } = await supabase.from('giveaway_entries').insert({
      contact_name: name,
      contact_email: email,
      company_name: companyName,
      website,
      why_choose: whyChoose,
      allow_notifications: allowNotifications,
      report_type: 'giveaway',
      referral_code: referralCode,
      referred_by_code: referredByCode,
      source_ip_hash: hashRateLimitKey([getClientIp(event.headers as Record<string, string | undefined>)]),
      user_agent: (event.headers['user-agent'] || '').slice(0, 500) || null,
    });
    if (insertError) throw insertError;

    return json(headers, 200, { id: referralCode });
  } catch (err) {
    console.error('giveaway-entry error:', err);
    return json(headers, 500, { error: 'Something went wrong' });
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
