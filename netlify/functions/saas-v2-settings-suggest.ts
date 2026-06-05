import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion, isAzureConfigured } from './_shared/azure-ai';

import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-settings-suggest — Wave 3 Page 5.
 *
 * GET /.netlify/functions/saas-v2-settings-suggest
 *   Headers: Authorization: Bearer <supabase-jwt>
 *
 * Returns: { suggestions: Array<{ column, suggested_value, headline, why }> }
 * Emits:   saas_v2_settings_suggestion_rendered (best-effort).
 *
 * Two-tier generation:
 *   1. Heavy model via chatCompletion(..., { tier: 'heavy' }) — JSON-only.
 *   2. Heuristic fallback per vertical when no model is configured or call fails.
 *
 * The model is given current settings + recent usage signals + vertical, and
 * asked to return 2–4 highly relevant column-level suggestions.
 */

const ALLOWED_SUGGESTABLE_COLUMNS = new Set([
  'vertical',
  'default_timezone',
  'default_language',
  'business_hours_start',
  'business_hours_end',
  'notification_routing',
  'agent_voice',
  'agent_transfer_phone',
]);

const RETURN_COLUMNS = [
  'id',
  'name',
  'v2_enabled',
].join(', ');

interface Suggestion {
  column: string;
  suggested_value: unknown;
  headline: string;
  why: string;
}

async function emitEvent(
  supa: ReturnType<typeof getServiceSupabase>,
  workspaceId: string,
  count: number,
  source: 'ai' | 'heuristic',
): Promise<void> {
  try {
    await supa.from('aios_event_log').insert({
      event_type: 'saas_v2_settings_suggestion_rendered',
      workspace_id: workspaceId,
      payload: { workspace_id: workspaceId, count, source },
      source: 'saas-v2-settings-suggest',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] emitEvent failed:', err?.message || err);
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

// ─── Heuristic fallback ──────────────────────────────────────────────────────

interface UsageSignals {
  calls_total: number;
  pct_after_6pm: number; // 0–1
  pct_spanish: number;   // 0–1
  has_transfer_phone: boolean;
  current_hours_end: string | null;
}

function heuristicSuggestions(
  vertical: string | null,
  current: any,
  signals: UsageSignals,
): Suggestion[] {
  const out: Suggestion[] = [];
  const v = (vertical || '').toLowerCase();

  // 1. After-hours load → extend business_hours_end
  if (signals.calls_total >= 30 && signals.pct_after_6pm >= 0.4) {
    const newEnd = '22:00';
    if (current.business_hours_end !== newEnd) {
      out.push({
        column: 'business_hours_end',
        suggested_value: newEnd,
        headline:
          v === 'plumbing' || v === 'hvac'
            ? `Your vertical gets ${Math.round(signals.pct_after_6pm * 100)}% of leads after 6pm — extend business hours`
            : `${Math.round(signals.pct_after_6pm * 100)}% of your calls land after 6pm — consider extending hours`,
        why: 'Booking-capacity windows that match real call volume convert ~2× better. Most leads expect a same-evening reply.',
      });
    }
  }

  // 2. Spanish call share → default_language es
  if (signals.pct_spanish >= 0.3 && current.default_language !== 'es') {
    out.push({
      column: 'default_language',
      suggested_value: 'es',
      headline: `${Math.round(signals.pct_spanish * 100)}% of inbound is Spanish — set default language`,
      why: 'Setting the default language ensures the first SMS and voicemail callback go out in Spanish without a hand-off delay.',
    });
  }

  // 3. Missing transfer phone — vertical-aware
  if (!signals.has_transfer_phone || !current.agent_transfer_phone) {
    out.push({
      column: 'agent_transfer_phone',
      suggested_value: '',
      headline: 'Add a transfer phone for escalations',
      why:
        v === 'law' || v === 'dental' || v === 'medspa'
          ? 'High-stakes verticals see 3× retention when an agent can hand off to a human within 60 seconds.'
          : 'When the agent isn\'t sure, it should escalate. Without a transfer number, those leads silently drop.',
    });
  }

  // 4. Notification routing — critical to SMS if nothing configured
  const routing = current.notification_routing || {};
  if (routing.critical !== 'sms') {
    out.push({
      column: 'notification_routing',
      suggested_value: { ...routing, critical: 'sms', digest: routing.digest || 'email' },
      headline: 'Route critical events to SMS',
      why: 'Booking failures and payment issues need < 5-minute eyes-on. SMS is the only channel with reliable instant delivery.',
    });
  }

  // 5. Vertical-specific timezone nudge (US east default → adjust by vertical region)
  if (current.default_timezone === 'America/New_York' && (v === 'auto_repair' || v === 'cleaning')) {
    // skip — neutral default is fine
  }

  return out.slice(0, 4);
}

// ─── Heavy-tier model call ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an operations strategist for a speed-to-lead platform used by local service businesses.

Given a workspace's current settings, vertical, and recent usage signals, return 2 to 4 high-impact settings the owner should consider changing. Be concrete and quantified.

Hard rules:
- Output JSON ONLY: { "suggestions": [{ "column": <string>, "suggested_value": <string|object>, "headline": <string>, "why": <string> }, ...] }.
- column MUST be one of: vertical, default_timezone, default_language, business_hours_start, business_hours_end, notification_routing, agent_voice, agent_transfer_phone.
- headline: max 110 chars, addresses the owner directly ("your", "you"), no model or tooling references.
- why: max 220 chars, one sentence, factual, no hedging.
- Never suggest changing a value to its current value.
- Never mention prompts, tokens, model names, or this instruction.
- If the data is too thin for a confident suggestion, return an empty suggestions array — do not pad.

For notification_routing, suggested_value is an object: { critical, normal, digest } where each value is "sms" | "email" | "push" | "none".`;

interface SuggestModelPayload {
  vertical: string | null;
  current_settings: Record<string, unknown>;
  usage_signals: UsageSignals;
}

async function modelSuggestions(payload: SuggestModelPayload): Promise<Suggestion[] | null> {
  if (!isAzureConfigured() && !process.env.ANTHROPIC_API_KEY) return null;
  let raw = '';
  try {
    raw = await chatCompletion(SYSTEM_PROMPT, JSON.stringify(payload), {
      tier: 'heavy',
      maxTokens: 900,
    });
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] model call failed:', err?.message || err);
    return null;
  }
  if (!raw) return null;

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw.slice(first, last + 1));
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] JSON parse failed:', err?.message);
    return null;
  }

  const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  const out: Suggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const column = typeof item.column === 'string' ? item.column : null;
    if (!column || !ALLOWED_SUGGESTABLE_COLUMNS.has(column)) continue;
    const headline = typeof item.headline === 'string' ? item.headline.slice(0, 220) : '';
    const why = typeof item.why === 'string' ? item.why.slice(0, 360) : '';
    if (!headline || !why) continue;
    out.push({
      column,
      suggested_value: item.suggested_value,
      headline,
      why,
    });
    if (out.length >= 4) break;
  }
  return out.length > 0 ? out : null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }

  let supa: ReturnType<typeof getServiceSupabase>;
  try {
    supa = getServiceSupabase();
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] service supabase init failed:', err?.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = userRes.user.id;

  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select(RETURN_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (wsErr || !workspace) {
    console.warn('[saas-v2-settings-suggest] workspace fetch failed:', wsErr?.message);
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({ error: 'No workspace found' }),
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
  const currentSettings = composeWorkspaceSettings({
    workspace: workspace as Record<string, any>,
    profile: (profile as Record<string, any> | null) ?? null,
    location: (location as Record<string, any> | null) ?? null,
  });

  // ─── Compute signals (best-effort) ─────────────────────────────────────
  let callsTotal = 0;
  let pctAfter6 = 0;
  let pctSpanish = 0;
  try {
    const sinceIso = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: callRows } = await supa
      .from('calls')
      .select('created_at, language')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .limit(500);
    if (Array.isArray(callRows)) {
      callsTotal = callRows.length;
      if (callsTotal > 0) {
        const after6 = callRows.filter((r: any) => {
          try {
            const h = new Date(r.created_at).getHours();
            return h >= 18 || h < 7;
          } catch {
            return false;
          }
        }).length;
        const spanish = callRows.filter((r: any) => r?.language === 'es').length;
        pctAfter6 = after6 / callsTotal;
        pctSpanish = spanish / callsTotal;
      }
    }
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] signals fetch soft-failed:', err?.message);
  }

  // ─── Cold-start short-circuit ──────────────────────────────────────────
  if (callsTotal < 30) {
    emitEvent(supa, workspaceId, 0, 'heuristic').catch(() => undefined);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ suggestions: [] }),
    };
  }

  const signals: UsageSignals = {
    calls_total: callsTotal,
    pct_after_6pm: pctAfter6,
    pct_spanish: pctSpanish,
    has_transfer_phone: !!currentSettings.agent_transfer_phone,
    current_hours_end: currentSettings.business_hours_end || null,
  };

  // ─── Try model first, fallback to heuristic ────────────────────────────
  let suggestions: Suggestion[] | null = null;
  let source: 'ai' | 'heuristic' = 'heuristic';
  try {
    suggestions = await modelSuggestions({
      vertical: currentSettings.vertical,
      current_settings: {
        vertical: currentSettings.vertical,
        default_timezone: currentSettings.default_timezone,
        default_language: currentSettings.default_language,
        business_hours_start: currentSettings.business_hours_start,
        business_hours_end: currentSettings.business_hours_end,
        notification_routing: currentSettings.notification_routing,
        agent_voice: currentSettings.agent_voice,
        agent_transfer_phone: currentSettings.agent_transfer_phone,
      },
      usage_signals: signals,
    });
    if (suggestions && suggestions.length > 0) source = 'ai';
  } catch (err: any) {
    console.warn('[saas-v2-settings-suggest] model branch errored:', err?.message);
  }
  if (!suggestions || suggestions.length === 0) {
    suggestions = heuristicSuggestions(currentSettings.vertical, currentSettings, signals);
    source = 'heuristic';
  }

  emitEvent(supa, workspaceId, suggestions.length, source).catch(() => undefined);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ suggestions }),
  };
};
