import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { normalizeVerticalSlug } from './_shared/vertical-knowledge/retrieve';

interface WorkspaceRow {
  id: string;
  name: string | null;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function resolveProfileVertical(profile: Record<string, any> | null): string | null {
  const preferences = asRecord(profile?.user_preferences);
  const v2Settings = asRecord(preferences.v2_settings);
  return typeof v2Settings.vertical === 'string' && v2Settings.vertical.trim()
    ? v2Settings.vertical.trim()
    : typeof profile?.main_category === 'string' && profile.main_category.trim()
      ? profile.main_category.trim()
      : null;
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  const json = (statusCode: number, body: Record<string, unknown>) => ({
    statusCode,
    headers: cors,
    body: JSON.stringify(body),
  });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return json(403, { error: 'Origin not allowed' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'Missing bearer token' });

  let supabase: ReturnType<typeof getServiceSupabase>;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[saas-v2-vertical-guardrails] service supabase init failed', err);
    return json(500, { error: 'Server misconfigured' });
  }

  const { data: userResult, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return json(401, { error: 'Invalid or expired token' });
  }
  const userId = userResult.user.id;

  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (wsErr) {
    console.error('[saas-v2-vertical-guardrails] workspace lookup failed', wsErr);
    return json(500, { error: 'Workspace lookup failed' });
  }
  if (!workspace) return json(404, { error: 'No workspace found for this user' });
  const workspaceId = (workspace as { id: string }).id;

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('main_category, user_preferences')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  const rawVertical = resolveProfileVertical((profile as Record<string, any> | null) ?? null);
  const packSlug = normalizeVerticalSlug(rawVertical);
  if (!packSlug) {
    return json(200, {
      workspace: workspace as WorkspaceRow,
      vertical: rawVertical,
      pack_slug: null,
      guardrails: [],
      cold_start: true,
    });
  }

  const { data: rows, error: rowsErr } = await supabase
    .from('vertical_knowledge')
    .select('id, pack_slug, kind, section, content, jurisdiction, confidence, pack_version, effective_date, expires_at')
    .eq('pack_slug', packSlug)
    .eq('status', 'approved')
    .in('kind', ['guardrail', 'intake_flow', 'escalation_rule', 'disallowed_claim', 'qualification_field'])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('kind', { ascending: true })
    .order('section', { ascending: true });

  if (rowsErr) {
    console.error('[saas-v2-vertical-guardrails] guardrail lookup failed', rowsErr);
    return json(500, { error: 'Guardrail lookup failed' });
  }

  return json(200, {
    workspace: workspace as WorkspaceRow,
    vertical: rawVertical,
    pack_slug: packSlug,
    guardrails: Array.isArray(rows) ? rows : [],
    cold_start: false,
  });
};
