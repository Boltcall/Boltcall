import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const NAME_RE = /^[\p{L}\p{N} .,'-]{2,120}$/u;
const INDUSTRIES = new Set([
  'law-firm',
  'roofers',
  'hvac',
  'plumbers',
  'dental',
  'med-spa',
]);
const DEMO_IP_WINDOW_SECONDS = 60 * 60;
const DEMO_IP_MAX_ATTEMPTS = 5;
const DEMO_PHONE_WINDOW_SECONDS = 60 * 60;
const DEMO_PHONE_MAX_ATTEMPTS = 3;

const DEMO_PROFILES: Record<string, {
  businessName: string;
  niche: string;
  location: string;
  services: string;
}> = {
  'law-firm': {
    businessName: 'Harrison & Cole Law',
    niche: 'law firm',
    location: 'Austin, Texas',
    services: 'personal injury consultations, family law, estate planning, and case evaluations',
  },
  roofers: {
    businessName: 'Apex Roofing Co.',
    niche: 'roofing company',
    location: 'Austin, Texas',
    services: 'roof inspections, storm damage repair, roof replacement, and emergency tarping',
  },
  hvac: {
    businessName: 'Comfort First HVAC',
    niche: 'HVAC company',
    location: 'Austin, Texas',
    services: 'AC repair and replacement, heating service, tune-ups, and emergency no-cooling calls',
  },
  plumbers: {
    businessName: 'Precision Plumbing',
    niche: 'plumbing company',
    location: 'Austin, Texas',
    services: 'emergency leak repair, drain cleaning, water heaters, and fixture repairs',
  },
  dental: {
    businessName: 'Bright Smile Dental',
    niche: 'dental practice',
    location: 'Austin, Texas',
    services: 'new patient exams, cleanings, emergency dental visits, and cosmetic dentistry consultations',
  },
  'med-spa': {
    businessName: 'Luma Med Spa',
    niche: 'medical spa',
    location: 'Austin, Texas',
    services: 'Botox and fillers, laser treatments, facials, body contouring, and skincare consultations',
  },
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePhone(value: unknown): string {
  const raw = clean(value, 40);
  if (!raw) return '';

  const normalized = raw.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+')) return normalized;
  if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
  if (/^\d+$/.test(normalized)) return `+${normalized}`;
  return normalized;
}

function parseAgentMap(value: string | undefined): Record<string, string> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, agentId]) => typeof key === 'string' && typeof agentId === 'string' && key && agentId,
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

async function resolveDemoFromNumber(client: Retell): Promise<string> {
  try {
    const { items = [] } = await client.phoneNumber.list();
    const retellNumbers = items.filter((item) => item.phone_number_type === 'retell-twilio');
    const demoNumber = retellNumbers.find((item) => /demo/i.test(item.nickname || ''));

    return demoNumber?.phone_number || retellNumbers[0]?.phone_number || '';
  } catch {
    return '';
  }
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const retellApiKey = process.env.RETELL_API_KEY;
  let fromNumber = clean(
    process.env.RETELL_DEMO_FROM_NUMBER || process.env.RETELL_PHONE_NUMBER,
    30,
  );
  const agentMap = parseAgentMap(process.env.RETELL_DEMO_AGENT_MAP);
  const fallbackAgentId = clean(process.env.RETELL_DEMO_AGENT_ID, 160);

  if (!retellApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Retell API key not configured' }) };
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const industry = clean(body.industry, 40).toLowerCase();
  const name = clean(body.name, 120);
  const phone = normalizePhone(body.phone);
  const demoProfile = DEMO_PROFILES[industry];

  if (!INDUSTRIES.has(industry) || !demoProfile) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Choose a valid industry' }) };
  }
  if (!NAME_RE.test(name)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter a valid name' }) };
  }
  if (!PHONE_RE.test(phone)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Enter a valid phone number in international format' }) };
  }

  const agentId = clean(agentMap[industry], 160) || fallbackAgentId;
  if (!agentId) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: `No demo agent configured for ${industry}` }),
    };
  }

  const client = new Retell({ apiKey: retellApiKey });
  if (!fromNumber) {
    fromNumber = await resolveDemoFromNumber(client);
  }
  if (!fromNumber) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Demo calls are temporarily unavailable' }),
    };
  }

  const supabase = getServiceSupabase();
  const ip = getClientIp(event.headers as Record<string, string>);

  const ipLimit = await consumePublicRateLimit(supabase as any, {
    bucket: 'homepage_demo_ip',
    key: hashRateLimitKey([ip]),
    maxAttempts: DEMO_IP_MAX_ATTEMPTS,
    windowSeconds: DEMO_IP_WINDOW_SECONDS,
  });
  if (!ipLimit.allowed) {
    return {
      statusCode: ipLimit.statusCode,
      headers: {
        ...headers,
        ...(ipLimit.retryAfterSeconds ? { 'Retry-After': String(ipLimit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({
        error: 'Too many demo call attempts from this connection. Try again later.',
        code: 'demo_ip_rate_limited',
      }),
    };
  }

  const phoneLimit = await consumePublicRateLimit(supabase as any, {
    bucket: 'homepage_demo_phone',
    key: hashRateLimitKey([phone]),
    maxAttempts: DEMO_PHONE_MAX_ATTEMPTS,
    windowSeconds: DEMO_PHONE_WINDOW_SECONDS,
  });
  if (!phoneLimit.allowed) {
    return {
      statusCode: phoneLimit.statusCode,
      headers: {
        ...headers,
        ...(phoneLimit.retryAfterSeconds ? { 'Retry-After': String(phoneLimit.retryAfterSeconds) } : {}),
      },
      body: JSON.stringify({
        error: 'That number already requested a few demo calls recently. Try again later.',
        code: 'demo_phone_rate_limited',
      }),
    };
  }

  try {
    const call = await client.call.createPhoneCall({
      from_number: fromNumber,
      to_number: phone,
      agent_id: agentId,
      retell_llm_dynamic_variables: {
        customer_name: name,
        demo_industry: industry,
        business_name: demoProfile.businessName,
        niche: demoProfile.niche,
        location: demoProfile.location,
        services_list: demoProfile.services,
      },
      metadata: {
        source: 'homepage_demo',
        industry,
        customer_name: name,
      },
    } as any);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        phone,
        industry,
        call_id: (call as any)?.call_id ?? null,
      }),
    };
  } catch (error: any) {
    console.error('[homepage-demo-call] Failed to start call:', error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Could not start the demo call right now' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
