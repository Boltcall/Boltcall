import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { chatCompletion } from './_shared/azure-ai';

/**
 * saas-v2-home
 *
 * GET endpoint. Server-side derives workspace_id from JWT (owner_id lookup).
 * Returns: { narrative, pending_count, pending_items, ticker, kpi_today, kpi_yesterday, cold_start }
 *
 * Narrative is generated with a Sonnet-style pass + plain-English polish (Haiku-style).
 * Cold-start guard: if the workspace has < 30 calls OR < 14 days of data we skip the LLM
 * narrative and return cold_start: true so the UI can show the unlock placeholder.
 *
 * Emits `saas_v2_home_rendered` on every successful render.
 */

interface CallRow {
  id: string;
  user_id: string | null;
  status: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  caller_phone: string | null;
  outcome: string | null;
  created_at: string;
}

interface CallbackRow {
  id: string;
  user_id: string;
  status: string | null;
  priority: string | null;
  first_reply_seconds: number | null;
  created_at: string;
  customer_name: string | null;
  phone: string | null;
}

interface KpiSnapshot {
  calls_answered: number;
  leads_booked: number;
  missed_calls: number;
  avg_response_seconds: number;
}

interface TickerRow {
  id: string;
  status: 'completed' | 'missed' | 'in_progress' | 'failed';
  label: string;
  timestamp: string;
}

interface PendingItem {
  id: string;
  type: 'urgent_lead' | 'prompt_suggestion' | 'kb_gap';
  title: string;
  detail: string;
  href?: string;
  created_at: string;
}

const COLD_START_MIN_CALLS = 30;
const COLD_START_MIN_DAYS = 14;

function todayBounds() {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setUTCHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setUTCDate(startYesterday.getUTCDate() - 1);
  return {
    todayStart: startToday.toISOString(),
    yesterdayStart: startYesterday.toISOString(),
    todayEnd: now.toISOString(),
  };
}

function statusOf(call: CallRow): TickerRow['status'] {
  const s = (call.status || '').toLowerCase();
  if (s === 'completed' || s === 'ended' || s === 'success') return 'completed';
  if (s === 'missed' || s === 'no_answer' || s === 'not_connected') return 'missed';
  if (s === 'in_progress' || s === 'ringing' || s === 'in-progress') return 'in_progress';
  if (s === 'failed' || s === 'error') return 'failed';
  // Heuristic fallback by duration
  if ((call.duration_seconds || 0) >= 10) return 'completed';
  return 'missed';
}

function summariseKpis(calls: CallRow[], callbacks: CallbackRow[]): KpiSnapshot {
  const answered = calls.filter((c) => statusOf(c) === 'completed').length;
  const missed = calls.filter((c) => statusOf(c) === 'missed' || statusOf(c) === 'failed').length;
  const booked = callbacks.filter((cb) => {
    const s = (cb.status || '').toLowerCase();
    return s === 'completed' || s === 'scheduled' || s === 'booked';
  }).length;
  const responseSeconds = callbacks
    .map((cb) => cb.first_reply_seconds)
    .filter((s): s is number => typeof s === 'number' && s >= 0);
  const avgResponseSeconds = responseSeconds.length
    ? Math.round(responseSeconds.reduce((acc, n) => acc + n, 0) / responseSeconds.length)
    : 0;
  return {
    calls_answered: answered,
    leads_booked: booked,
    missed_calls: missed,
    avg_response_seconds: avgResponseSeconds,
  };
}

function biggestMiss(calls: CallRow[], callbacks: CallbackRow[]): string | null {
  // 1. Urgent callback unhandled longest = highest priority loss
  const urgentUnhandled = callbacks
    .filter((cb) => {
      const p = (cb.priority || '').toLowerCase();
      const s = (cb.status || '').toLowerCase();
      return (p === 'urgent' || p === 'high') && s !== 'completed' && s !== 'booked';
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (urgentUnhandled[0]) {
    const name = urgentUnhandled[0].customer_name || urgentUnhandled[0].phone || 'a lead';
    return `${name} flagged urgent and is still waiting`;
  }

  // 2. Missed-call cluster
  const missedToday = calls.filter((c) => statusOf(c) === 'missed').length;
  if (missedToday >= 3) {
    return `${missedToday} calls were missed today — biggest cluster between business hours`;
  }
  if (missedToday >= 1) {
    return `${missedToday} missed call${missedToday === 1 ? '' : 's'} today`;
  }
  return null;
}

function fallbackNarrative(today: KpiSnapshot, yesterday: KpiSnapshot): string {
  const callsDelta = today.calls_answered - yesterday.calls_answered;
  const callsDir = callsDelta > 0 ? 'up' : callsDelta < 0 ? 'down' : 'flat';
  const bookedDelta = today.leads_booked - yesterday.leads_booked;
  const bookedDir = bookedDelta > 0 ? 'up' : bookedDelta < 0 ? 'down' : 'flat';
  return (
    `Today your agent answered ${today.calls_answered} call${today.calls_answered === 1 ? '' : 's'} ` +
    `(${callsDir} from ${yesterday.calls_answered} yesterday) and booked ${today.leads_booked} lead${today.leads_booked === 1 ? '' : 's'} ` +
    `(${bookedDir} from ${yesterday.leads_booked}). ${today.missed_calls} call${today.missed_calls === 1 ? ' was' : 's were'} missed.`
  );
}

async function generateNarrative(
  today: KpiSnapshot,
  yesterday: KpiSnapshot,
  miss: string | null,
): Promise<string> {
  // Pass 1: Sonnet-style structured draft
  const systemDraft =
    'You are the Boltcall daily digest writer. Write 2-3 sentences describing today vs. yesterday for a local-service business owner. ' +
    'Cover: (1) calls answered today vs. yesterday, (2) leads booked today vs. yesterday, (3) the biggest miss if any. ' +
    'Concrete numbers, no hedging, no agency jargon. Plain English.';
  const userDraft = JSON.stringify({ today, yesterday, biggest_miss: miss });

  let draft = '';
  try {
    draft = await chatCompletion(systemDraft, userDraft, { tier: 'heavy', maxTokens: 220 });
  } catch (err) {
    console.warn('[saas-v2-home] draft generation failed:', err instanceof Error ? err.message : err);
    return fallbackNarrative(today, yesterday);
  }
  draft = (draft || '').trim();
  if (!draft) return fallbackNarrative(today, yesterday);

  // Pass 2: Haiku-style plain-English polish (best-effort)
  const systemPolish =
    'You are a plain-English editor. Your one job: take the supplied daily-digest draft and rewrite ANY sentence that contains:\n' +
    '- JARGON (CTR, CPL, conversion rate, funnel)\n' +
    '- HEDGES (appears to, tends to, may indicate)\n' +
    '- PASSIVE VOICE (was missed, were lost)\n' +
    '- AGENCY VOCABULARY (leveraging, synergies, robust, scalable)\n' +
    '- PERCENTAGE WITHOUT ABSOLUTE\n' +
    'Return only the rewritten text. Keep concrete numbers. 2-3 sentences max.';
  try {
    const polished = await chatCompletion(systemPolish, draft, { tier: 'light', maxTokens: 220 });
    const cleaned = (polished || '').trim();
    return cleaned || draft;
  } catch (err) {
    console.warn('[saas-v2-home] polish failed, shipping unpolished draft:', err instanceof Error ? err.message : err);
    return draft;
  }
}

function buildTicker(calls: CallRow[]): TickerRow[] {
  return [...calls]
    .sort((a, b) => {
      const at = new Date(a.started_at || a.created_at).getTime();
      const bt = new Date(b.started_at || b.created_at).getTime();
      return bt - at;
    })
    .slice(0, 5)
    .map((c) => {
      const label = c.caller_phone
        ? `Caller ${c.caller_phone}`
        : c.outcome
          ? c.outcome
          : `Call ${c.id.slice(0, 6)}`;
      return {
        id: c.id,
        status: statusOf(c),
        label,
        timestamp: c.started_at || c.created_at,
      };
    });
}

function buildPendingItems(callbacks: CallbackRow[]): PendingItem[] {
  const items: PendingItem[] = [];

  // Urgent unanswered leads
  for (const cb of callbacks) {
    const p = (cb.priority || '').toLowerCase();
    const s = (cb.status || '').toLowerCase();
    if ((p === 'urgent' || p === 'high') && s !== 'completed' && s !== 'booked') {
      items.push({
        id: `lead:${cb.id}`,
        type: 'urgent_lead',
        title: `Urgent lead waiting: ${cb.customer_name || cb.phone || 'unknown'}`,
        detail: cb.phone ? `Phone ${cb.phone}` : 'No phone on file',
        href: `/v2/leads`,
        created_at: cb.created_at,
      });
    }
  }

  return items.slice(0, 10);
}

export const handler: Handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  // ── Auth: derive user_id -> workspace_id from JWT ───────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'unauthorized' }),
    };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'unauthorized' }),
    };
  }

  let supa;
  try {
    supa = getServiceSupabase();
  } catch (err) {
    console.error('[saas-v2-home] supabase init failed:', err instanceof Error ? err.message : err);
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'server_misconfigured' }),
    };
  }

  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'invalid_token' }),
    };
  }
  const userId = userResult.user.id;

  // ── Resolve workspace_id via owner_id (server-derived only) ─────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, v2_enabled, created_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (wsErr) {
    console.error('[saas-v2-home] workspace lookup failed:', wsErr.message);
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'workspace_lookup_failed' }),
    };
  }

  // Some V2 environments don't yet have a workspaces row — fall back to user_id
  // as workspace identity (matches saas-v2-toggle.ts behavior on first install).
  const workspaceId: string = workspaceRow?.id || userId;
  const workspaceCreatedAt: string = workspaceRow?.created_at || new Date().toISOString();

  const { todayStart, yesterdayStart, todayEnd } = todayBounds();
  const startedAt = Date.now();

  // ── Pull calls + callbacks in parallel (yesterday→now window) ───────────
  const [callsRes, yCallsRes, callbacksRes, yCallbacksRes, lifetimeCallsRes] = await Promise.all([
    supa
      .from('call_logs')
      .select('id, user_id, status, duration_seconds, started_at, caller_phone, outcome, created_at')
      .eq('user_id', userId)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false })
      .limit(200),
    supa
      .from('call_logs')
      .select('id, user_id, status, duration_seconds, started_at, caller_phone, outcome, created_at')
      .eq('user_id', userId)
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart)
      .limit(200),
    supa
      .from('callbacks')
      .select('id, user_id, status, priority, first_reply_seconds, created_at, customer_name, phone')
      .eq('user_id', userId)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false })
      .limit(200),
    supa
      .from('callbacks')
      .select('id, user_id, status, priority, first_reply_seconds, created_at, customer_name, phone')
      .eq('user_id', userId)
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart)
      .limit(200),
    supa
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const todayCalls = (callsRes.data || []) as CallRow[];
  const yesterdayCalls = (yCallsRes.data || []) as CallRow[];
  const todayCallbacks = (callbacksRes.data || []) as CallbackRow[];
  const yesterdayCallbacks = (yCallbacksRes.data || []) as CallbackRow[];
  const lifetimeCallCount = lifetimeCallsRes.count ?? 0;

  const kpiToday = summariseKpis(todayCalls, todayCallbacks);
  const kpiYesterday = summariseKpis(yesterdayCalls, yesterdayCallbacks);

  // ── Cold-start guard (per plan v7): < 30 calls or < 14 days of data ─────
  const ageDays =
    (Date.now() - new Date(workspaceCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  const coldStart =
    lifetimeCallCount < COLD_START_MIN_CALLS || ageDays < COLD_START_MIN_DAYS;

  const pendingItems = buildPendingItems(todayCallbacks);
  const ticker = buildTicker(todayCalls);

  let narrative = '';
  if (coldStart) {
    narrative = `Insights unlock at ${COLD_START_MIN_CALLS} calls. So far you have ${lifetimeCallCount} call${lifetimeCallCount === 1 ? '' : 's'} on file.`;
  } else {
    try {
      narrative = await generateNarrative(kpiToday, kpiYesterday, biggestMiss(todayCalls, todayCallbacks));
    } catch (err) {
      console.error('[saas-v2-home] narrative generation threw:', err instanceof Error ? err.message : err);
      // Safe fallback so the page still renders.
      narrative = fallbackNarrative(kpiToday, kpiYesterday);
      // Return 500 only if everything (including fallback) failed — fallback is purely string concat,
      // so we ship 200 with the deterministic narrative.
    }
  }

  const loadMs = Date.now() - startedAt;

  // ── Fire-and-forget event emission ──────────────────────────────────────
  emitAgencyEvent({
    client_id: workspaceId,
    agent_name: 'saas-v2-home',
    type: 'saas_v2_home_rendered',
    severity: 'info',
    payload: {
      workspace_id: workspaceId,
      widgets_rendered: [
        'narrative',
        ...(pendingItems.length ? ['pending'] : []),
        ...(ticker.length ? ['ticker'] : []),
      ],
      load_ms: loadMs,
    },
    why_explanation: 'V2 home page rendered for owner',
  }).catch((err) => {
    console.warn('[saas-v2-home] emit failed:', err instanceof Error ? err.message : err);
  });

  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      narrative,
      pending_count: pendingItems.length,
      pending_items: pendingItems,
      ticker,
      kpi_today: kpiToday,
      kpi_yesterday: kpiYesterday,
      cold_start: coldStart,
      lifetime_call_count: lifetimeCallCount,
    }),
  };
};
