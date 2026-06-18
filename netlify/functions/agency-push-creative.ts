import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-push-creative — POST. Founder-only.
 *
 * Ship handler for type='ad_creative' (and 'ad_copy') artifact approvals.
 *
 * Reads the artifact's content envelope (3 image_urls × 3 copy_variants by
 * convention from agency-creative-foundry.ts), resolves the client's bound
 * Meta adset_id from agency_clients.secrets.meta.adset_id, and pushes each
 * variant to Meta via meta-ads-adapter.pushCreative.
 *
 * The artifact may carry the variants as:
 *
 *   content.variants: [
 *     {
 *       image_url: string,
 *       headline: string,
 *       primary_text: string,
 *       cta?: 'LEARN_MORE'|'BOOK_NOW'|'GET_QUOTE',
 *       destination_type?: 'INSTANT_FORM'|'WEBSITE',
 *       lead_form_id?: string,
 *       link_url?: string,
 *     },
 *     ...
 *   ]
 *
 * For each variant, calls pushCreative and collects { creative_id, ad_id }.
 * Updates ship_result with only the whitelisted Meta ids — NEVER stringifies
 * the raw Graph response (security concern #6). Sets ship_window_ends_at to
 * now()+72h so the post-ship CPL watcher pages the founder if the variant
 * drops below the bottom-10% of the (ad_creative, vertical) baseline.
 *
 * Partial-failure policy: if some variants succeed and others fail, the
 * function returns 207 with per-variant detail. Successful creatives are
 * recorded in ship_result; failed ones are noted but the founder can re-run
 * the function (pushCreative is idempotent at the Meta side via
 * external_reference_id).
 */

import type { Handler } from '@netlify/functions';
import { type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';
import {
  pushCreative,
  type MetaCta,
  type MetaDestinationType,
} from './_shared/agency-adapters/meta-ads-adapter';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const CREATIVE_SHIP_WATCH_HOURS = 72;

interface PushBody {
  artifact_id?: unknown;
}

interface VariantInput {
  image_url?: unknown;
  headline?: unknown;
  primary_text?: unknown;
  cta?: unknown;
  destination_type?: unknown;
  lead_form_id?: unknown;
  link_url?: unknown;
}

interface VariantResult {
  index: number;
  ok: boolean;
  ad_id?: string;
  creative_id?: string;
  error?: string;
}

async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  return role === 'founder';
}

interface ArtifactRow {
  id: string;
  client_id: string;
  type: string;
  status: string;
  content: Record<string, unknown>;
  ship_result: Record<string, unknown> | null;
}

interface ClientRow {
  id: string;
  vertical: string | null;
  secrets: Record<string, unknown> | null;
}

function pickCta(v: unknown): MetaCta {
  if (v === 'BOOK_NOW' || v === 'GET_QUOTE' || v === 'LEARN_MORE') return v;
  return 'LEARN_MORE';
}

function pickDestination(v: unknown): MetaDestinationType {
  if (v === 'WEBSITE') return 'WEBSITE';
  return 'INSTANT_FORM';
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-push-creative] service supabase init failed', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!(await authFounder(authHeader, supabase))) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({ error: authHeader ? 'Founder only' : 'Authentication required' }),
    };
  }

  let body: PushBody;
  try {
    body = JSON.parse(event.body || '{}') as PushBody;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const artifact_id = typeof body.artifact_id === 'string' ? body.artifact_id : null;
  if (!artifact_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'artifact_id required' }) };
  }

  const { data: artifact, error: fetchErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content, ship_result')
    .eq('id', artifact_id)
    .single();
  if (fetchErr || !artifact) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'artifact not found' }) };
  }
  const row = artifact as ArtifactRow;
  if (!['ad_creative', 'ad_copy'].includes(row.type)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `wrong artifact type for this handler: ${row.type}` }),
    };
  }
  if (row.status === 'shipped' && row.ship_result) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'shipped', ship_result: row.ship_result, already: true }),
    };
  }
  if (!['draft', 'approved'].includes(row.status)) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: `cannot ship artifact in status ${row.status}` }),
    };
  }

  // ── Resolve adset_id from client secrets ────────────────────────────────
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, vertical, secrets')
    .eq('id', row.client_id)
    .single();
  if (clientErr || !client) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'client not found' }) };
  }
  const clientRow = client as ClientRow;
  const meta =
    ((clientRow.secrets as Record<string, unknown> | null)?.meta as Record<string, unknown> | null) ?? null;
  const content = row.content ?? {};
  const adset_id =
    typeof content.adset_id === 'string'
      ? content.adset_id
      : typeof meta?.adset_id === 'string'
      ? (meta.adset_id as string)
      : null;
  if (!adset_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'no adset_id resolvable — set agency_clients.secrets.meta.adset_id or artifact.content.adset_id',
      }),
    };
  }

  // ── Build variant list ──────────────────────────────────────────────────
  const variantsInput = Array.isArray(content.variants)
    ? (content.variants as VariantInput[])
    : [];
  if (variantsInput.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'artifact.content.variants must be a non-empty array' }),
    };
  }

  const lead_form_id_default =
    typeof content.lead_form_id === 'string'
      ? (content.lead_form_id as string)
      : typeof meta?.lead_form_id === 'string'
      ? (meta.lead_form_id as string)
      : undefined;
  const link_url_default =
    typeof content.link_url === 'string'
      ? (content.link_url as string)
      : typeof meta?.link_url === 'string'
      ? (meta.link_url as string)
      : undefined;
  const page_id =
    typeof meta?.page_id === 'string' ? (meta.page_id as string) : undefined;
  const client_ad_account_id =
    typeof meta?.ad_account_id === 'string' ? (meta.ad_account_id as string) : undefined;

  const results: VariantResult[] = [];
  for (let i = 0; i < variantsInput.length; i += 1) {
    const v = variantsInput[i];
    const image_url = typeof v.image_url === 'string' ? v.image_url : null;
    const headline = typeof v.headline === 'string' ? v.headline : null;
    const primary_text = typeof v.primary_text === 'string' ? v.primary_text : null;
    if (!image_url || !headline || !primary_text) {
      results.push({
        index: i,
        ok: false,
        error: 'variant missing required image_url / headline / primary_text',
      });
      continue;
    }
    const destination = pickDestination(v.destination_type);
    try {
      const pushed = await pushCreative({
        adset_id,
        image_url,
        primary_text,
        headline,
        cta: pickCta(v.cta),
        destination_type: destination,
        lead_form_id:
          typeof v.lead_form_id === 'string' ? v.lead_form_id : lead_form_id_default,
        link_url:
          typeof v.link_url === 'string' ? v.link_url : link_url_default,
        client_id: row.client_id,
        client_ad_account_id,
        page_id,
        external_reference_id: `${row.id}-v${i}`,
      });
      results.push({
        index: i,
        ok: true,
        ad_id: pushed.ad_id,
        creative_id: pushed.creative_id,
      });
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        error: err instanceof Error ? err.message : 'push failed',
      });
    }
  }

  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  // WHITELISTED ship_result — only Meta ids + our internal index.
  const ship_result = {
    adset_id,
    variants: results.map((r) => ({
      index: r.index,
      ok: r.ok,
      ad_id: r.ad_id,
      creative_id: r.creative_id,
      error: r.error,
    })),
    success_count: successes.length,
    failure_count: failures.length,
    pushed_at: new Date().toISOString(),
  };

  const ship_window_ends_at = new Date(
    Date.now() + CREATIVE_SHIP_WATCH_HOURS * 3_600_000,
  ).toISOString();

  // We only mark 'shipped' if at least one variant succeeded — otherwise the
  // artifact stays at 'approved' so the founder can investigate + retry.
  const targetStatus = successes.length > 0 ? 'shipped' : 'approved';

  const { error: updErr } = await supabase
    .from('agency_artifacts')
    .update({
      status: targetStatus,
      shipped_at: successes.length > 0 ? new Date().toISOString() : null,
      ship_target: 'meta_ads',
      ship_result,
      ship_window_ends_at: successes.length > 0 ? ship_window_ends_at : null,
    })
    .eq('id', row.id);
  if (updErr) {
    console.error('[agency-push-creative] post-ship update failed', updErr.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Creatives pushed but artifact row update failed',
        ship_result,
      }),
    };
  }

  const statusCode = failures.length === 0 ? 200 : successes.length === 0 ? 502 : 207;
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      status: targetStatus,
      ship_result,
      ship_window_ends_at: targetStatus === 'shipped' ? ship_window_ends_at : null,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
