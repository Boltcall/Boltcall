import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';

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
 * against an allowlist — id, created_at, owner_id, v2_enabled CANNOT be
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
  'v2_enabled',
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
].join(', ');

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
  const cors = {
    ...getCorsHeaders(event.headers.origin || event.headers.Origin),
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
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

  // Always bump updated_at
  filtered.updated_at = new Date().toISOString();

  // ─── Update ────────────────────────────────────────────────────────────
  const { data: updatedRows, error: upErr } = await supa
    .from('workspaces')
    .update(filtered)
    .eq('user_id', userId)
    .select(RETURN_COLUMNS);

  if (upErr) {
    console.warn('[saas-v2-settings-update] update failed:', upErr.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'Failed to update workspace',
        detail:
          'update error — user owns no workspace OR column missing from workspaces table. Run the V2 settings migration.',
        supabase_error: upErr.message,
      }),
    };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({
        error: 'No workspace updated',
        detail: 'user owns no workspace OR column missing — run the V2 settings migration',
      }),
    };
  }

  const workspace = updatedRows[0];
  emitEvent(supa, (workspace as any).id, changedKeys).catch(() => undefined);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ workspace }),
  };
};
