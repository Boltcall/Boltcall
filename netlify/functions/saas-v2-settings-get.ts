import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-settings-get — Wave 3 Page 5.
 *
 * GET /.netlify/functions/saas-v2-settings-get
 *   Headers: Authorization: Bearer <supabase-jwt>
 *
 * Returns: { workspace, current_user_role, team, cold_start, signals }
 * Emits:   saas_v2_settings_rendered (best-effort, soft-fail)
 *
 * Auth pattern: JWT → user → workspaces.user_id (no body-supplied workspace_id).
 */

const RETURN_COLUMNS = ['id', 'name', 'v2_enabled'].join(', ');

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

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function firstBusinessHoursWindow(openingHours: unknown) {
  const hours = asRecord(openingHours);
  for (const value of Object.values(hours)) {
    if (typeof value !== 'string') continue;
    const match = value.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    if (match) return { start: match[1], end: match[2] };
  }
  return { start: null, end: null };
}

function composeWorkspaceSettings(args: {
  workspace: Record<string, any>;
  profile: Record<string, any> | null;
  location: Record<string, any> | null;
}) {
  const profile = args.profile ?? {};
  const location = args.location ?? {};
  const preferences = asRecord(profile.user_preferences);
  const v2Settings = asRecord(preferences.v2_settings);
  const hours = firstBusinessHoursWindow(profile.opening_hours);
  const languages = Array.isArray(profile.languages) ? profile.languages : [];

  return {
    id: args.workspace.id,
    name: args.workspace.name || profile.business_name || 'Workspace',
    v2_enabled: Boolean(args.workspace.v2_enabled),
    vertical: v2Settings.vertical ?? profile.main_category ?? null,
    default_timezone:
      v2Settings.default_timezone ?? location.timezone ?? 'America/New_York',
    default_language:
      v2Settings.default_language ??
      (typeof languages[0] === 'string' ? languages[0] : 'en'),
    business_hours_start: v2Settings.business_hours_start ?? hours.start ?? '09:00',
    business_hours_end: v2Settings.business_hours_end ?? hours.end ?? '17:00',
    notification_routing: v2Settings.notification_routing ?? null,
    agent_voice: v2Settings.agent_voice ?? null,
    agent_transfer_phone: v2Settings.agent_transfer_phone ?? location.phone ?? null,
    agent_paused_until: v2Settings.agent_paused_until ?? null,
  };
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ─── Auth: bearer JWT → user → workspaces.user_id ─────────────────────
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
    .eq('user_id', userId)
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
  const workspaceId = (workspace as any).id as string;

  const [{ data: profile }, { data: location }] = await Promise.all([
    supa
      .from('business_profiles')
      .select('business_name, main_category, opening_hours, languages, user_preferences')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supa
      .from('locations')
      .select('timezone, phone')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const workspaceForClient = composeWorkspaceSettings({
    workspace: workspace as Record<string, any>,
    profile: (profile as Record<string, any> | null) ?? null,
    location: (location as Record<string, any> | null) ?? null,
  });

  // ─── Role (current user is owner here; future: check workspace_members) ─
  const currentUserRole = 'owner';

  // ─── Team (best-effort) ────────────────────────────────────────────────
  let team: any[] = [];
  try {
    const { data: members } = await supa
      .from('workspace_members')
      .select('id, email, name, role, status')
      .eq('workspace_id', workspaceId)
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
    workspace_id: workspaceId,
    payload: {
      workspace_id: workspaceId,
      cold_start: coldStart,
      calls_total: callsTotal,
      team_size: team.length,
    },
  }).catch(() => undefined);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      workspace: workspaceForClient,
      current_user_role: currentUserRole,
      team,
      cold_start: coldStart,
      signals: { calls_total: callsTotal, days_active: daysActive },
    }),
  };
};
