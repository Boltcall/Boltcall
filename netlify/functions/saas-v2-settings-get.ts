import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';

/**
 * saas-v2-settings-get — Wave 3 Page 5.
 *
 * GET /.netlify/functions/saas-v2-settings-get
 *   Headers: Authorization: Bearer <supabase-jwt>
 *
 * Returns: { workspace, current_user_role, team, cold_start, signals }
 * Emits:   saas_v2_settings_rendered (best-effort, soft-fail)
 *
 * Auth pattern: JWT → user → workspaces.owner_id (no body-supplied workspace_id).
 */

const EDITABLE_COLUMNS = [
  'name',
  'vertical',
  'default_timezone',
  'default_language',
  'business_hours_start',
  'business_hours_end',
  'notification_routing',
  'agent_voice',
  'agent_transfer_phone',
  'agent_paused_until',
] as const;

const RETURN_COLUMNS = ['id', 'v2_enabled', ...EDITABLE_COLUMNS].join(', ');

interface EventPayload {
  event_type: string;
  workspace_id: string;
  payload: Record<string, unknown>;
}

async function emitEvent(supa: ReturnType<typeof getServiceSupabase>, p: EventPayload): Promise<void> {
  try {
    await supa.from('aios_event_log').insert({
      event_type: p.event_type,
      workspace_id: p.workspace_id,
      payload: p.payload,
      source: 'saas-v2-settings-get',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[saas-v2-settings-get] emitEvent failed:', err?.message || err);
  }
}

export const handler: Handler = async (event) => {
  const cors = {
    ...getCorsHeaders(event.headers.origin || event.headers.Origin),
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ─── Auth: bearer JWT → user → owner_id ────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }

  let supa: ReturnType<typeof getServiceSupabase>;
  try {
    supa = getServiceSupabase();
  } catch (err: any) {
    console.warn('[saas-v2-settings-get] service supabase init failed:', err?.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = userRes.user.id;

  // ─── Workspace ─────────────────────────────────────────────────────────
  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select(RETURN_COLUMNS)
    .eq('owner_id', userId)
    .maybeSingle();

  if (wsErr) {
    console.warn('[saas-v2-settings-get] workspace fetch failed:', wsErr.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'Failed to load workspace',
        detail:
          'workspace fetch error — likely a column missing from workspaces table. Run the V2 settings migration.',
      }),
    };
  }
  if (!workspace) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({ error: 'No workspace found for this user' }),
    };
  }

  // ─── Role (current user is owner here; future: check workspace_members) ─
  const currentUserRole = 'owner';

  // ─── Team (best-effort) ────────────────────────────────────────────────
  let team: any[] = [];
  try {
    const { data: members } = await supa
      .from('workspace_members')
      .select('id, email, name, role, status')
      .eq('workspace_id', (workspace as any).id)
      .neq('status', 'removed')
      .limit(20);
    if (Array.isArray(members)) team = members;
  } catch (err: any) {
    console.warn('[saas-v2-settings-get] team fetch soft-failed:', err?.message);
  }

  // ─── Cold-start signal ─────────────────────────────────────────────────
  let callsTotal = 0;
  let daysActive = 0;
  try {
    const { count } = await supa
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    callsTotal = count || 0;
  } catch {
    // table may not exist in some envs — treat as zero
  }
  try {
    const sinceIso = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { count } = await supa
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sinceIso);
    daysActive = (count || 0) > 0 ? 14 : 0; // coarse proxy
  } catch {
    // ignore
  }
  const coldStart = callsTotal < 30 && daysActive < 14;

  // ─── Emit ──────────────────────────────────────────────────────────────
  emitEvent(supa, {
    event_type: 'saas_v2_settings_rendered',
    workspace_id: (workspace as any).id,
    payload: {
      workspace_id: (workspace as any).id,
      cold_start: coldStart,
      calls_total: callsTotal,
      team_size: team.length,
    },
  }).catch(() => undefined);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      workspace,
      current_user_role: currentUserRole,
      team,
      cold_start: coldStart,
      signals: { calls_total: callsTotal, days_active: daysActive },
    }),
  };
};
