import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-settings — GET (read) + PATCH (update). Client-authenticated.
 *
 * Backs /client/settings. Single endpoint covers:
 *   - business_hours  (jsonb, per-weekday open/close)
 *   - notifications   (jsonb, severity → channels[])
 *   - auto_approve_low_risk (bool — governs /client/approvals auto-expire)
 *   - preferred_voice_id    (text — ElevenLabs voice_id)
 *   - paused_until    (timestamptz — smart pause auto-resume)
 *
 * Auth: Bearer JWT → caller's agency_clients row. All reads + writes scoped
 * to that single row. We never accept a client_id in the request; the JWT
 * is the only valid identity binding.
 *
 * PATCH semantics: partial — only fields present in the body are written.
 * Defensive validation per field; unknown keys are rejected with 400 so the
 * UI catches typos early instead of writing them to a jsonb black hole.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const VALID_DAYS = new Set([
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
]);
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const SEVERITIES = new Set(['critical', 'digest', 'weekly_report']);
const CHANNELS = new Set(['sms', 'push', 'email', 'slack']);

interface ResolvedClient {
  user_id: string;
  client_id: string;
}

async function resolveClient(
  authHeader: string | undefined,
): Promise<ResolvedClient | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabase = getServiceSupabase();
  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult?.user) return null;
  const user_id = userResult.user.id;

  const { data: rows } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('user_id', user_id)
    .not('status', 'in', '("churned","paused")')
    .order('signed_up_at', { ascending: true })
    .limit(1);
  const client = rows?.[0];
  if (!client) return null;
  return { user_id, client_id: client.id as string };
}

// ─── Validators ───────────────────────────────────────────────────────────

interface ValidationError {
  field: string;
  message: string;
}

function validateBusinessHours(value: unknown, errors: ValidationError[]): unknown {
  if (value === null) return null; // explicit clear
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push({
      field: 'business_hours',
      message: 'must be an object keyed by weekday (mon..sun)',
    });
    return undefined;
  }
  const out: Record<string, { open: string; close: string; closed: boolean }> = {};
  for (const [day, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!VALID_DAYS.has(day)) {
      errors.push({
        field: `business_hours.${day}`,
        message: 'unknown weekday (use mon/tue/wed/thu/fri/sat/sun)',
      });
      continue;
    }
    if (typeof raw !== 'object' || raw === null) {
      errors.push({
        field: `business_hours.${day}`,
        message: 'must be { open, close, closed }',
      });
      continue;
    }
    const r = raw as Record<string, unknown>;
    const closed = !!r.closed;
    const open = closed ? '09:00' : String(r.open ?? '');
    const close = closed ? '17:00' : String(r.close ?? '');
    if (!closed && !TIME_RE.test(open)) {
      errors.push({
        field: `business_hours.${day}.open`,
        message: 'must be HH:MM (24h)',
      });
      continue;
    }
    if (!closed && !TIME_RE.test(close)) {
      errors.push({
        field: `business_hours.${day}.close`,
        message: 'must be HH:MM (24h)',
      });
      continue;
    }
    out[day] = { open, close, closed };
  }
  return out;
}

function validateNotifications(value: unknown, errors: ValidationError[]): unknown {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push({
      field: 'notifications',
      message: 'must be an object keyed by severity',
    });
    return undefined;
  }
  const out: Record<string, string[]> = {};
  for (const [severity, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SEVERITIES.has(severity)) {
      errors.push({
        field: `notifications.${severity}`,
        message: 'unknown severity (use critical/digest/weekly_report)',
      });
      continue;
    }
    if (!Array.isArray(raw)) {
      errors.push({
        field: `notifications.${severity}`,
        message: 'must be an array of channel names',
      });
      continue;
    }
    const channels: string[] = [];
    for (const c of raw) {
      if (typeof c !== 'string' || !CHANNELS.has(c)) {
        errors.push({
          field: `notifications.${severity}[]`,
          message: `unknown channel "${String(c)}" (use sms/push/email/slack)`,
        });
        continue;
      }
      if (!channels.includes(c)) channels.push(c);
    }
    out[severity] = channels;
  }
  return out;
}

function validatePausedUntil(value: unknown, errors: ValidationError[]): unknown {
  if (value === null) return null;
  if (typeof value !== 'string') {
    errors.push({
      field: 'paused_until',
      message: 'must be ISO-8601 string or null',
    });
    return undefined;
  }
  const t = Date.parse(value);
  if (Number.isNaN(t)) {
    errors.push({
      field: 'paused_until',
      message: 'unparseable date',
    });
    return undefined;
  }
  // Bounded: max 30 days out so a buggy UI doesn't pause the agent forever.
  const maxPause = Date.now() + 30 * 86_400_000;
  if (t > maxPause) {
    errors.push({
      field: 'paused_until',
      message: 'cannot pause more than 30 days into the future',
    });
    return undefined;
  }
  return new Date(t).toISOString();
}

// ─── GET ──────────────────────────────────────────────────────────────────

async function handleRead(
  authHeader: string | undefined,
): Promise<{ statusCode: number; body: string }> {
  const me = await resolveClient(authHeader);
  if (!me) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_clients')
    .select(
      'id, business_name, vertical, region, timezone, business_hours, notifications, auto_approve_low_risk, preferred_voice_id, paused_until, status',
    )
    .eq('id', me.client_id)
    .maybeSingle();

  if (error || !data) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Client row not found' }),
    };
  }

  // Compute the AI-suggested defaults the UI surfaces alongside the real
  // values. These are static-by-vertical; if a richer policy lands later it
  // can hydrate from a peer-rollup query.
  const vertical = (data.vertical as string | null) || 'unknown';
  const suggestedNotifications: Record<string, string[]> = {
    critical:
      vertical === 'med_spa' || vertical === 'hvac' || vertical === 'plumbing'
        ? ['sms', 'push']
        : ['push'],
    digest: ['email'],
    weekly_report: ['email'],
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      client: {
        id: data.id,
        business_name: data.business_name,
        vertical: data.vertical,
        region: data.region,
        timezone: data.timezone,
        status: data.status,
      },
      business_hours: data.business_hours,
      notifications: data.notifications,
      auto_approve_low_risk: !!data.auto_approve_low_risk,
      preferred_voice_id: data.preferred_voice_id,
      paused_until: data.paused_until,
      ai_suggested: {
        notifications: suggestedNotifications,
        // A reasonable "default Mon-Fri 9-5, weekends off" template the UI
        // pre-fills when the client opens the editor for the first time.
        business_hours: {
          mon: { open: '09:00', close: '17:00', closed: false },
          tue: { open: '09:00', close: '17:00', closed: false },
          wed: { open: '09:00', close: '17:00', closed: false },
          thu: { open: '09:00', close: '17:00', closed: false },
          fri: { open: '09:00', close: '17:00', closed: false },
          sat: { open: '10:00', close: '14:00', closed: true },
          sun: { open: '10:00', close: '14:00', closed: true },
        },
      },
    }),
  };
}

// ─── PATCH ────────────────────────────────────────────────────────────────

const ALLOWED_PATCH_FIELDS = new Set([
  'business_hours',
  'notifications',
  'auto_approve_low_risk',
  'preferred_voice_id',
  'paused_until',
]);

async function handlePatch(
  authHeader: string | undefined,
  rawBody: string,
): Promise<{ statusCode: number; body: string }> {
  const me = await resolveClient(authHeader);
  if (!me) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Body must be a JSON object' }),
    };
  }

  // Reject any unknown keys early — the UI is the only legitimate caller.
  const unknownKeys = Object.keys(body).filter(
    (k) => !ALLOWED_PATCH_FIELDS.has(k),
  );
  if (unknownKeys.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Unknown fields: ${unknownKeys.join(', ')}`,
        allowed: [...ALLOWED_PATCH_FIELDS],
      }),
    };
  }

  const errors: ValidationError[] = [];
  const patch: Record<string, unknown> = {};

  if ('business_hours' in body) {
    const v = validateBusinessHours(body.business_hours, errors);
    if (v !== undefined) patch.business_hours = v;
  }
  if ('notifications' in body) {
    const v = validateNotifications(body.notifications, errors);
    if (v !== undefined) patch.notifications = v;
  }
  if ('auto_approve_low_risk' in body) {
    if (typeof body.auto_approve_low_risk !== 'boolean') {
      errors.push({
        field: 'auto_approve_low_risk',
        message: 'must be boolean',
      });
    } else {
      patch.auto_approve_low_risk = body.auto_approve_low_risk;
    }
  }
  if ('preferred_voice_id' in body) {
    const v = body.preferred_voice_id;
    if (v !== null && (typeof v !== 'string' || v.length === 0 || v.length > 80)) {
      errors.push({
        field: 'preferred_voice_id',
        message: 'must be string (1..80 chars) or null',
      });
    } else {
      patch.preferred_voice_id = v;
    }
  }
  if ('paused_until' in body) {
    const v = validatePausedUntil(body.paused_until, errors);
    if (v !== undefined) patch.paused_until = v;
  }

  if (errors.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Validation failed', details: errors }),
    };
  }
  if (Object.keys(patch).length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'No valid fields to update',
        allowed: [...ALLOWED_PATCH_FIELDS],
      }),
    };
  }

  patch.updated_at = new Date().toISOString();

  const supabase = getServiceSupabase();
  const { error: updErr, data: updated } = await supabase
    .from('agency_clients')
    .update(patch)
    .eq('id', me.client_id)
    .select(
      'business_hours, notifications, auto_approve_low_risk, preferred_voice_id, paused_until',
    )
    .single();

  if (updErr) {
    console.error('[agency-client-settings] update failed', updErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Update failed' }),
    };
  }

  console.log('[agency-client-settings] updated', {
    client_id: me.client_id,
    fields: Object.keys(patch).filter((k) => k !== 'updated_at'),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      updated: true,
      values: updated,
    }),
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'];

  try {
    if (event.httpMethod === 'GET') {
      const r = await handleRead(authHeader);
      return { ...r, headers: CORS };
    }
    if (event.httpMethod === 'PATCH') {
      const r = await handlePatch(authHeader, event.body || '');
      return { ...r, headers: CORS };
    }
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err) {
    console.error('[agency-client-settings] uncaught', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
