import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { withLegacyHandler } from './_shared/runtime-compat';
import { getServiceSupabase } from './_shared/token-utils';

const source = 'black_friday_2026';
const input = z.object({
  submissionId: z.uuid(),
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  companyName: z.string().trim().min(2, 'Enter your business name.').max(150),
  email: z.string().trim().toLowerCase().max(190).pipe(z.email('Enter a valid email address.')),
  website: z.string().trim().max(500).default(''),
  fax: z.string().max(0).default(''),
});

export const testHandler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = { ...cors.headers, 'Cache-Control': 'no-store' };
  const json = (statusCode: number, body: { error: string } | { ok: true }) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
  });

  if (origin && !cors.allowed) return json(403, { error: 'Origin not allowed.' });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const raw = event.body ?? '';
  if (Buffer.byteLength(raw) > 4_096) return json(413, { error: 'Application is too large.' });

  let submitted: unknown;
  try {
    submitted = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Submit a valid application.' });
  }

  const parsed = input.safeParse(submitted);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue.path[0] === 'fax' ? 'Submit a valid application.' : issue.message;
    return json(400, { error: message });
  }

  const { submissionId, name, companyName, email, website } = parsed.data;
  let url: URL | null = null;
  if (website) {
    try {
      url = new URL(website.includes('://') ? website : 'https://' + website);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname.includes('.') ||
        url.username ||
        url.password
      ) {
        return json(400, { error: 'Enter a valid website address or leave it blank.' });
      }
    } catch {
      return json(400, { error: 'Enter a valid website address or leave it blank.' });
    }
  }

  const saveError = 'We couldn’t save your application. Please try again.';
  try {
    const db = getServiceSupabase();
    const limit = await consumePublicRateLimit(db, {
      bucket: 'black_friday_application_ip',
      key: hashRateLimitKey([getClientIp(event.headers)]),
      maxAttempts: 10,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      if (limit.retryAfterSeconds)
        Object.assign(headers, { 'Retry-After': String(limit.retryAfterSeconds) });
      return json(limit.statusCode, {
        error: limit.statusCode === 429 ? 'Too many attempts. Please try again later.' : saveError,
      });
    }

    // The existing queue allocates positive bigint IDs. A stable negative, safe-integer ID
    // lets retries use the same primary key without changing the queue’s sequence.
    const id =
      -1 -
      Number.parseInt(
        hashRateLimitKey([source, submissionId, name, companyName, email, url?.href]).slice(0, 13),
        16,
      );
    const { error } = await db
      .from('website_leads')
      .upsert(
        { id, name, company_name: companyName, email, url: url?.href ?? null, source },
        { onConflict: 'id', ignoreDuplicates: true },
      );

    if (error) {
      console.error('[black-friday-application] could not save', error.code);
      return json(503, { error: saveError });
    }

    return json(200, { ok: true });
  } catch {
    console.error('[black-friday-application] storage unavailable');
    return json(503, { error: saveError });
  }
};

export default withLegacyHandler(testHandler);
