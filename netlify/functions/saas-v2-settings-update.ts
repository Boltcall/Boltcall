import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';

/**
 * saas-v2-settings-update — Wave 3 Page 5.
 *
 * POST /.netlify/functions/saas-v2-settings-update
 *   Headers: Authorization: Bearer <supabase-jwt>
 *   Body:    { patch: { column: value, ... } }
 *
 * Returns: { workspace }
 * Emits:   saas_v2_settings_updated with { changed_keys } (best-effort).
 *
 * Auth pattern: JWT → user → workspaces.user_id. Patch keys are validated
 * against an allowlist — id, created_at, user_id, v2_enabled CANNOT be
 * edited here (V2 opt-in flips happen in saas-v2-toggle).
 */

// Whitelist of editable columns. Everything else is silently rejected.
const ALLOWED_KEYS = new Set([
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
  'logo_url',
  'data_retention_days',
]);

const RETURN_COLUMNS = [
  'id',
  'name',
  'v2_enabled',
].join(', ');

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

function sanitizeValue(key: string, value: unknown): unknown {
  // Defensive coercion / shape checks for free-form columns.
  if (value === null) return null;
  switch (key) {
    case 'notification_routing': {
      if (typeof value !== 'object') return null;
      const v = value as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const sev of ['critical', 'normal', 'digest']) {
        const ch = v[sev];
        if (typeof ch === 'string' && ['sms', 'email', 'push', 'none'].includes(ch)) {
          out[sev] = ch;
        }
      }
      return out;
    }
    case 'business_hours_start':
    case 'business_hours_end': {
      if (typeof value !== 'string') return null;
      // expect HH:MM or HH:MM:SS
      const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/);
      return m ? value : null;
    }
    case 'agent_paused_until': {
      if (typeof value !== 'string') return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    case 'data_retention_days': {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      return Math.max(1, Math.min(3650, Math.round(n)));
    }
    case 'default_language': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 8);
    }
    case 'default_timezone': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 64);
    }
    case 'vertical': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 64);
    }
    case 'name': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 120);
    }
    case 'logo_url': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 2048);
    }
    case 'agent_voice': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 120);
    }
    case 'agent_transfer_phone': {
      if (typeof value !== 'string') return null;
      return value.slice(0, 32);
    }
    default:
      return value;
  }
}

async function emitEvent(
  supa: ReturnType<typeof getServiceSupabase>,
  workspaceId: string,
  changedKeys: string[],
): Promise<void> {
  try {
    await supa.from('aios_event_log').insert({
      event_type: 'saas_v2_settings_updated',
      workspace_id: workspaceId,
      payload: { workspace_id: workspaceId, changed_keys: changedKeys },
      source: 'saas-v2-settings-update',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[saas-v2-settings-update] emitEvent failed:', err?.message || err);
  }
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  // Write endpoint: fail-closed on disallowed origin (defense in depth on top of JWT).
  if (
    getRequestOrigin(event.headers as Record<string, string>) &&
    !v2cors.allowed
  ) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ─── Body parse ────────────────────────────────────────────────────────
  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const patch = body?.patch;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing or malformed patch object' }) };
  }

  // ─── Auth ──────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }

  let supa: ReturnType<typeof getServiceSupabase>;
  try {
    supa = getServiceSupabase();
  } catch (err: any) {
    console.warn('[saas-v2-settings-update] service supabase init failed:', err?.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = userRes.user.id;

  // ─── Allowlist filter ──────────────────────────────────────────────────
  const filtered: Record<string, unknown> = {};
  const changedKeys: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!ALLOWED_KEYS.has(k)) {
      console.warn(`[saas-v2-settings-update] rejected non-allowlisted key: ${k}`);
      continue;
    }
    const clean = sanitizeValue(k, v);
    if (clean === null && v !== null) {
      // value failed validation
      console.warn(`[saas-v2-settings-update] rejected invalid value for ${k}`);
      continue;
    }
    filtered[k] = clean;
    changedKeys.push(k);
  }

  if (changedKeys.length === 0) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: 'No valid editable keys in patch' }),
    };
  }

  {
    const { data: workspace, error: wsErr } = await supa
      .from('workspaces')
      .select(RETURN_COLUMNS)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (wsErr) {
      console.warn('[saas-v2-settings-update] workspace fetch failed:', wsErr.message);
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ error: 'Failed to load workspace', supabase_error: wsErr.message }),
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
    const now = new Date().toISOString();
    const [{ data: profile }, { data: location }] = await Promise.all([
      supa
        .from('business_profiles')
        .select('id, business_name, main_category, opening_hours, languages, user_preferences')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle(),
      supa
        .from('locations')
        .select('id, timezone, phone')
        .eq('workspace_id', workspaceId)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle(),
    ]);

    const workspacePatch: Record<string, unknown> = {};
    const profilePatch: Record<string, unknown> = {};
    const locationPatch: Record<string, unknown> = {};
    const preferences = asRecord((profile as any)?.user_preferences);
    const v2Settings = { ...asRecord(preferences.v2_settings) };

    for (const key of changedKeys) {
      const value = filtered[key];
      if (key === 'name') {
        workspacePatch.name = value;
        continue;
      }
      if (key === 'vertical') profilePatch.main_category = value;
      if (key === 'default_language') profilePatch.languages = value ? [value] : [];
      if (key === 'default_timezone') locationPatch.timezone = value;
      if (key === 'agent_transfer_phone') locationPatch.phone = value;
      v2Settings[key] = value;
    }

    if (Object.keys(workspacePatch).length > 0) {
      workspacePatch.updated_at = now;
      const { error } = await supa.from('workspaces').update(workspacePatch).eq('id', workspaceId);
      if (error) {
        console.warn('[saas-v2-settings-update] workspace update failed:', error.message);
        return {
          statusCode: 500,
          headers: cors,
          body: JSON.stringify({ error: 'Failed to update workspace' }),
        };
      }
    }

    const profilePayload = {
      ...profilePatch,
      user_preferences: { ...preferences, v2_settings: v2Settings },
      updated_at: now,
    };
    if ((profile as any)?.id) {
      const { error } = await supa
        .from('business_profiles')
        .update(profilePayload)
        .eq('id', (profile as any).id);
      if (error) {
        console.warn('[saas-v2-settings-update] profile update failed:', error.message);
        return {
          statusCode: 500,
          headers: cors,
          body: JSON.stringify({ error: 'Failed to update business profile settings' }),
        };
      }
    } else {
      const { error } = await supa.from('business_profiles').insert({
        ...profilePayload,
        user_id: userId,
        workspace_id: workspaceId,
        business_name: (workspace as any).name || 'Workspace',
      });
      if (error) {
        console.warn('[saas-v2-settings-update] profile insert failed:', error.message);
        return {
          statusCode: 500,
          headers: cors,
          body: JSON.stringify({ error: 'Failed to create business profile settings' }),
        };
      }
    }

    if (Object.keys(locationPatch).length > 0) {
      if ((location as any)?.id) {
        const { error } = await supa
          .from('locations')
          .update({ ...locationPatch, updated_at: now })
          .eq('id', (location as any).id)
          .eq('workspace_id', workspaceId);
        if (error) console.warn('[saas-v2-settings-update] location update failed:', error.message);
      } else if ((profile as any)?.id) {
        const { error } = await supa.from('locations').insert({
          ...locationPatch,
          user_id: userId,
          workspace_id: workspaceId,
          business_profile_id: (profile as any).id,
          name: 'Main Office',
          slug: 'main-office',
          is_primary: true,
          is_active: true,
        });
        if (error) console.warn('[saas-v2-settings-update] location insert failed:', error.message);
      }
    }

    const [{ data: updatedWorkspace }, { data: updatedProfile }, { data: updatedLocation }] =
      await Promise.all([
        supa.from('workspaces').select(RETURN_COLUMNS).eq('id', workspaceId).maybeSingle(),
        supa
          .from('business_profiles')
          .select('business_name, main_category, opening_hours, languages, user_preferences')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .maybeSingle(),
        supa
          .from('locations')
          .select('timezone, phone')
          .eq('workspace_id', workspaceId)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle(),
      ]);

    const workspaceForClient = composeWorkspaceSettings({
      workspace: (updatedWorkspace as Record<string, any> | null) ?? (workspace as Record<string, any>),
      profile: (updatedProfile as Record<string, any> | null) ?? null,
      location: (updatedLocation as Record<string, any> | null) ?? null,
    });

    emitEvent(supa, workspaceId, changedKeys).catch(() => undefined);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ workspace: workspaceForClient }),
    };
  }

  // Always bump updated_at
  filtered.updated_at = new Date().toISOString();

  // ─── Update ────────────────────────────────────────────────────────────
  const { data: updatedRows, error: upErr } = await supa
    .from('workspaces')
    .update(filtered)
    .eq('user_id', userId)
    .select(RETURN_COLUMNS);

  const updateError = upErr;
  if (updateError !== null) {
    const updateErrorMessage = updateError!.message;
    console.warn('[saas-v2-settings-update] update failed:', updateErrorMessage);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'Failed to update workspace',
        detail:
          'update error — user owns no workspace OR column missing from workspaces table. Run the V2 settings migration.',
        supabase_error: updateErrorMessage,
      }),
    };
  }
  const rows = updatedRows ?? [];
  if (rows.length === 0) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({
        error: 'No workspace updated',
        detail: 'user owns no workspace OR column missing — run the V2 settings migration',
      }),
    };
  }

  const workspace = rows[0];
  emitEvent(supa, (workspace as any).id, changedKeys).catch(() => undefined);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ workspace }),
  };
};
