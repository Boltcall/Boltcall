/**
 * agency-client-report-share-link.ts — Generate a read-only share URL for a report.
 * ==================================================================================
 *
 * POST /.netlify/functions/agency-client-report-share-link
 * Body: { artifact_id: string }
 *
 * Auth: client JWT. Verifies ownership before generating a signed URL.
 *
 * Behavior:
 *   1. Resolve artifact and verify it belongs to the calling client.
 *   2. Pull the PDF storage path from ship_result.pdf_url. We parse the
 *      Supabase Storage path out of the URL (works whether the URL is a
 *      public URL or a previous signed URL).
 *   3. Generate a 30-day signed Storage URL via supabase.storage.from(bucket).createSignedUrl.
 *   4. Persist the share to agency_artifacts.content.payload.share_links[]
 *      so the client can audit who they sent it to. (No partner email yet —
 *      that's a v2 enhancement; today we just generate the URL.)
 *   5. Return { share_url, expires_at }.
 *
 * If the artifact was rendered to HTML rather than PDF (degraded path in
 * pdf-renderer), share_url points at the HTML file.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REPORT_BUCKET_CANDIDATES = ['client-reports', 'agency-reports', 'reports'];

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { artifact_id?: string };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const artifact_id = body.artifact_id;
  if (!artifact_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artifact_id)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'artifact_id (uuid) is required' }) };
  }

  const supabase = getServiceSupabase();

  // JWT → user_id
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized — bearer token required' }) };
  }
  const { data: userResult, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userResult?.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }
  const user_id = userResult.user.id;

  // Resolve artifact + ownership
  const { data: artifactRow, error: artErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, ship_result, preview_url, content')
    .eq('id', artifact_id)
    .maybeSingle();
  if (artErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lookup failed', detail: artErr.message }) };
  }
  if (!artifactRow) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Report not found' }) };
  }

  const { data: clientRow } = await supabase
    .from('agency_clients')
    .select('id, user_id')
    .eq('id', artifactRow.client_id)
    .maybeSingle();
  if (!clientRow || clientRow.user_id !== user_id) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Report not found' }) };
  }

  if (!['weekly_report', 'optimization_brief'].includes(artifactRow.type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Only weekly_report and optimization_brief artifacts can be shared' }) };
  }
  if (artifactRow.status !== 'shipped') {
    return { statusCode: 409, headers, body: JSON.stringify({ error: 'Report not yet shipped', current_status: artifactRow.status }) };
  }

  // Find PDF URL
  const shipResult = (artifactRow.ship_result ?? {}) as { pdf_url?: string; storage_path?: string; storage_bucket?: string };
  const sourceUrl = shipResult.pdf_url ?? artifactRow.preview_url ?? null;
  if (!sourceUrl) {
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'Report has no PDF URL on file' }) };
  }

  // Try to derive (bucket, path) from a Supabase Storage URL.
  // Public:  https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // Signed:  https://<proj>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=…
  let bucket = shipResult.storage_bucket ?? null;
  let storagePath = shipResult.storage_path ?? null;

  if (!bucket || !storagePath) {
    const parsed = parseSupabaseStorageUrl(sourceUrl);
    if (parsed) {
      bucket = bucket ?? parsed.bucket;
      storagePath = storagePath ?? parsed.path;
    }
  }

  let share_url: string;
  let expires_at: string;

  if (bucket && storagePath) {
    // Native signed URL via storage API.
    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(storagePath, SHARE_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) {
      // Fall back to one of the well-known buckets.
      const fallback = await tryFallbackBuckets(supabase, storagePath);
      if (!fallback) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to sign URL', detail: signErr?.message ?? 'unknown' }),
        };
      }
      share_url = fallback.signedUrl;
    } else {
      share_url = signed.signedUrl;
    }
    expires_at = new Date(Date.now() + SHARE_TTL_SECONDS * 1000).toISOString();
  } else {
    // Non-Storage URL (rare — e.g. external CDN). Hand back the existing URL
    // unchanged. The client can still share it; it just isn't TTL-bound.
    share_url = sourceUrl;
    expires_at = new Date(Date.now() + SHARE_TTL_SECONDS * 1000).toISOString();
  }

  // Persist the share into content.payload.share_links so the client can audit.
  const existingContent = (artifactRow.content ?? {}) as { payload?: { share_links?: Array<{ created_at: string; expires_at: string; created_by: string }> } };
  const existingPayload = existingContent.payload ?? {};
  const existingShares = Array.isArray(existingPayload.share_links) ? existingPayload.share_links : [];
  const updatedContent = {
    ...existingContent,
    payload: {
      ...existingPayload,
      share_links: [
        ...existingShares,
        { created_at: new Date().toISOString(), expires_at, created_by: user_id },
      ].slice(-10), // cap audit trail
    },
  };
  await supabase
    .from('agency_artifacts')
    .update({ content: updatedContent })
    .eq('id', artifact_id);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      share_url,
      expires_at,
      ttl_seconds: SHARE_TTL_SECONDS,
    }),
  };
};

function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    // Path forms:
    //   /storage/v1/object/public/<bucket>/<path>
    //   /storage/v1/object/sign/<bucket>/<path>
    const m = u.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

async function tryFallbackBuckets(
  supabase: ReturnType<typeof getServiceSupabase>,
  storagePath: string,
): Promise<{ signedUrl: string } | null> {
  for (const bucket of REPORT_BUCKET_CANDIDATES) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, SHARE_TTL_SECONDS);
    if (!error && data?.signedUrl) return { signedUrl: data.signedUrl };
  }
  return null;
}
