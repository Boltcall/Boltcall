import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

/**
 * Server-side rotation of the Google Ads webhook key.
 *
 * Why this exists instead of doing it client-side:
 *   1. The key authorizes Retell outbound calls billed to the workspace.
 *      Client-side generation via Math.random fallback is a security risk
 *      (V8 xorshift128+ is recoverable from observed outputs).
 *   2. We need crypto.randomBytes(32) — only available server-side in Node.
 *   3. Centralizing the write also lets us emit an audit-log entry that's
 *      consistent regardless of which client triggered it.
 *
 * Auth: Supabase JWT in the Authorization header — same auth model as
 * every other authenticated SaaS endpoint.
 *
 * POST /.netlify/functions/google-leads-rotate-key
 *   → 200 { google_lead_form_key: "<64-hex chars>" }
 */

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';

function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Authentication required' }) };
  }
  const token = authHeader.substring(7);

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !authUser?.id) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = authUser.id;

  // Try up to 3 times if a generated key happens to collide with the unique
  // index. With 256 bits of entropy the probability is negligible, but it's
  // cheap to retry and avoids an opaque user-facing failure.
  for (let attempt = 0; attempt < 3; attempt++) {
    const fresh = generateKey();

    // Upsert covers the "row doesn't exist yet" case that the client-side
    // UPDATE silently no-ops in. The previous reviewer found that bug on
    // the original implementation; this is the fix.
    const { data, error } = await supabase
      .from('business_features')
      .upsert(
        { user_id: userId, google_lead_form_key: fresh, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select('google_lead_form_key')
      .single();

    if (error) {
      // 23505 = unique_violation. With a 256-bit random key this is effectively
      // impossible, but if it happens we just retry.
      if ((error as any).code === '23505' && attempt < 2) continue;
      console.error('[google-leads-rotate-key] upsert failed:', error);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Failed to rotate key' }),
      };
    }

    console.log('[google-leads-rotate-key] rotated key for user', userId);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ google_lead_form_key: data?.google_lead_form_key || fresh }),
    };
  }

  return {
    statusCode: 500,
    headers: HEADERS,
    body: JSON.stringify({ error: 'Failed to generate unique key after retries' }),
  };
};
