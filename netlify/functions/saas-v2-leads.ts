/**
 * saas-v2-leads — V2 Leads list endpoint.
 *
 * GET /.netlify/functions/saas-v2-leads
 *   Query: status, date_from, date_to, source, page, limit
 *
 * Auth: Bearer JWT. workspace_id is derived server-side from the JWT (caller
 * MUST be the owner of the workspace). NEVER accept workspace_id from the
 * request body — that would be a horizontal-privilege bug.
 *
 * Returns:
 *   {
 *     hot_lead: { ...lead, why_hot: string } | null,
 *     leads: Array<{ id, name, source, captured_at, ai_summary, status, next_action }>,
 *     total: number
 *   }
 *
 * AI:
 *   - ai_summary: Haiku, batched single LLM call for the whole page of rows.
 *   - hot_lead.why_hot: Haiku, 1 sentence.
 *
 * Event: emits `saas_v2_leads_list_rendered` via the SaaS V2 mirror emitter
 *   (writes to aios_event_log only, bypasses agency_events — SaaS users
 *   don't have agency_clients rows).
 *
 * Cold-start:
 *   - Returns an empty leads array (the page renders the empty state).
 *   - We do NOT 5xx when there are no leads — empty is a valid first-day state.
 */

import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

import { getServiceSupabase } from './_shared/token-utils';
import { emitSaasV2Event } from './_shared/saas-v2-events';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost';

interface LeadRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  call_status: string | null;
  call_duration: number | null;
  sms_sent: boolean | null;
  created_at: string;
  raw_data: Record<string, unknown> | null;
}

interface LeadCard {
  id: string;
  name: string;
  source: string;
  captured_at: string;
  ai_summary: string;
  status: LeadStatus;
  next_action: string;
}

interface HotLeadCard extends LeadCard {
  why_hot: string;
}

interface LeadsResponse {
  hot_lead: HotLeadCard | null;
  leads: LeadCard[];
  total: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Highest-value verticals per Boltcall positioning. The first match in this
// ordered list wins when scoring "hot" leads.
const HIGH_VALUE_VERTICALS = new Set([
  'plumbing',
  'hvac',
  'roofing',
  'electrical',
  'water_damage',
  'restoration',
  'emergency',
  'medical_spa',
  'dental',
  'legal',
  'personal_injury',
]);

// Map free-form lead.status values onto the V2 4-state pipeline.
function normalizeStatus(raw: string | null): LeadStatus {
  if (!raw) return 'new';
  const s = String(raw).toLowerCase().trim();
  if (s === 'booked' || s === 'confirmed' || s === 'completed') return 'booked';
  if (s === 'lost' || s === 'dead' || s === 'rejected' || s === 'unqualified') return 'lost';
  if (s === 'contacted' || s === 'in_progress' || s === 'pending' || s === 'scheduled') {
    return 'contacted';
  }
  return 'new';
}

function leadName(l: LeadRow): string {
  const parts = [l.first_name, l.last_name].filter(Boolean).map((s) => String(s).trim());
  if (parts.length) return parts.join(' ');
  if (l.phone) return l.phone;
  if (l.email) return l.email;
  return 'Unknown';
}

function sourceLabel(raw: string | null): string {
  if (!raw) return 'unknown';
  // Keep snake_case → human casing; UI pill renders it raw.
  return String(raw).slice(0, 32);
}

function nextActionFor(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'Reply now';
    case 'contacted':
      return 'Follow up';
    case 'booked':
      return 'Confirm visit';
    case 'lost':
      return 'Archive';
  }
}

// ─── Response helpers ──────────────────────────────────────────────────────

function badRequest(message: string) {
  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: message }) };
}
function unauthorized(message: string) {
  return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: message }) };
}
function serverError(message: string) {
  return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: message }) };
}

// ─── AI: batch Haiku summarization ──────────────────────────────────────────

interface SummaryBatchItem {
  id: string;
  ai_summary: string;
}

/**
 * One Haiku call for the whole page. We send N compact lead blobs and ask for
 * a 1-line summary per id. If the call fails for any reason we fall back to a
 * deterministic non-AI summary so the page still renders.
 */
async function batchSummarize(
  leads: LeadRow[],
  vertical: string | null,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (leads.length === 0) return out;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    leads.forEach((l) => out.set(l.id, deterministicSummary(l)));
    return out;
  }

  try {
    const client = new Anthropic({ apiKey });
    const inputBlobs = leads.map((l) => ({
      id: l.id,
      name: leadName(l),
      source: l.source,
      status: l.status,
      call_status: l.call_status,
      call_duration: l.call_duration,
      sms_sent: l.sms_sent,
      created_at: l.created_at,
      // raw_data may contain transcript snippets, message bodies, intent, etc.
      raw: l.raw_data ? truncate(JSON.stringify(l.raw_data), 600) : null,
    }));

    const tool = {
      name: 'emit_lead_summaries',
      description: 'Emit one 1-line summary per lead id.',
      input_schema: {
        type: 'object',
        properties: {
          summaries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                ai_summary: { type: 'string', maxLength: 140 },
              },
              required: ['id', 'ai_summary'],
            },
          },
        },
        required: ['summaries'],
      },
    } as const;

    const verticalNote = vertical
      ? `The business vertical is "${vertical}". Use vertical-appropriate framing.`
      : '';

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [
        'You write a 1-line operational summary for each inbound lead, in plain prose, <= 18 words.',
        'Lead with the customer\'s job-to-be-done in concrete terms (e.g. "Burst pipe in basement, urgent — wants AM appointment Tue").',
        'No fluff, no marketing speak, no emojis, no quotes. Past tense. If data is thin, say what we know (e.g. "Called from 305 area, hung up at 0:11 — no message").',
        verticalNote,
      ]
        .filter(Boolean)
        .join('\n'),
      messages: [
        {
          role: 'user',
          content:
            'Summarize these leads. Return one summary per id.\n\n```json\n' +
            JSON.stringify(inputBlobs) +
            '\n```',
        },
      ],
      tools: [tool as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: 'emit_lead_summaries' },
    });

    const block = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_lead_summaries',
    );
    if (block) {
      const parsed = block.input as { summaries?: SummaryBatchItem[] };
      (parsed.summaries ?? []).forEach((s) => {
        if (s.id && typeof s.ai_summary === 'string') {
          out.set(s.id, s.ai_summary.slice(0, 200));
        }
      });
    }
  } catch (err) {
    console.warn(
      `[saas-v2-leads] batchSummarize failed (${
        err instanceof Error ? err.message : String(err)
      }); falling back to deterministic summaries`,
    );
  }

  // Any leads the model skipped get a deterministic fallback.
  leads.forEach((l) => {
    if (!out.has(l.id)) out.set(l.id, deterministicSummary(l));
  });

  return out;
}

function deterministicSummary(l: LeadRow): string {
  const bits: string[] = [];
  if (l.source) bits.push(`from ${l.source}`);
  if (l.call_status === 'completed' && l.call_duration) {
    bits.push(`${Math.round(l.call_duration / 60)}m call`);
  } else if (l.call_status) {
    bits.push(`call ${l.call_status}`);
  }
  if (l.sms_sent) bits.push('SMS sent');
  if (bits.length === 0) return 'New lead — no contact attempted yet.';
  return `New lead ${bits.join(', ')}.`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ─── AI: hot lead "why hot" ─────────────────────────────────────────────────

async function explainHotLead(
  hot: LeadRow,
  vertical: string | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return defaultWhyHot(hot, vertical);

  try {
    const client = new Anthropic({ apiKey });
    const tool = {
      name: 'emit_why_hot',
      description: 'Emit a 1-sentence explanation of why this lead is hot.',
      input_schema: {
        type: 'object',
        properties: {
          why_hot: { type: 'string', maxLength: 200 },
        },
        required: ['why_hot'],
      },
    } as const;

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: [
        'You explain in ONE sentence (<=22 words) why a single lead is the highest-priority one this week.',
        'Cite concrete evidence: vertical match, recency, contact attempts, urgency keywords. No fluff. No emojis. No quotes.',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content:
            'Lead:\n```json\n' +
            JSON.stringify({
              name: leadName(hot),
              vertical,
              source: hot.source,
              status: hot.status,
              call_status: hot.call_status,
              call_duration: hot.call_duration,
              sms_sent: hot.sms_sent,
              created_at: hot.created_at,
              raw: hot.raw_data ? truncate(JSON.stringify(hot.raw_data), 600) : null,
            }) +
            '\n```',
        },
      ],
      tools: [tool as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: 'emit_why_hot' },
    });

    const block = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_why_hot',
    );
    if (block) {
      const parsed = block.input as { why_hot?: string };
      if (typeof parsed.why_hot === 'string' && parsed.why_hot.trim()) {
        return parsed.why_hot.slice(0, 220);
      }
    }
  } catch (err) {
    console.warn(
      `[saas-v2-leads] explainHotLead failed (${
        err instanceof Error ? err.message : String(err)
      }); using fallback`,
    );
  }
  return defaultWhyHot(hot, vertical);
}

function defaultWhyHot(hot: LeadRow, vertical: string | null): string {
  const ageHours = (Date.now() - new Date(hot.created_at).getTime()) / 3_600_000;
  const ageBit = ageHours < 24 ? 'came in today' : `${Math.round(ageHours / 24)} days old`;
  const verticalBit = vertical ? `high-value ${vertical} lead` : 'high-value lead';
  return `${verticalBit}, ${ageBit}, not yet booked — likely to convert if contacted now.`;
}

// ─── Hot-lead heuristic ─────────────────────────────────────────────────────

function isHighValueVertical(vertical: string | null): boolean {
  if (!vertical) return false;
  const v = vertical.toLowerCase().replace(/[\s-]+/g, '_');
  return HIGH_VALUE_VERTICALS.has(v) ||
    Array.from(HIGH_VALUE_VERTICALS).some((hv) => v.includes(hv));
}

/**
 * Pick the single "hot" lead from a candidate pool.
 *   - Must NOT already be booked.
 *   - Prefer high-value vertical (+25).
 *   - Most recent (+1 per hour-of-freshness up to 168).
 *   - Bonus if it has a phone (+5) — actionable contact.
 *   - Bonus if it's "new" (untouched) (+10) — first-mover edge.
 */
function pickHotLead(
  leads: LeadRow[],
  vertical: string | null,
): LeadRow | null {
  const high = isHighValueVertical(vertical);
  let best: { row: LeadRow; score: number } | null = null;
  const now = Date.now();

  for (const l of leads) {
    const normStatus = normalizeStatus(l.status);
    if (normStatus === 'booked') continue;

    const ageHours = Math.max(0, (now - new Date(l.created_at).getTime()) / 3_600_000);
    if (ageHours > 168) continue; // older than 7 days isn't "this week"

    let score = 0;
    if (high) score += 25;
    score += Math.max(0, 168 - ageHours); // newer = higher
    if (l.phone) score += 5;
    if (normStatus === 'new') score += 10;

    if (!best || score > best.score) {
      best = { row: l, score };
    }
  }

  return best?.row ?? null;
}

// ─── Handler ────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // 1. JWT → user
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return unauthorized('Invalid or expired token');
  const userId = userResult.user.id;

  // 2. Resolve workspace + v2_enabled
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, v2_enabled')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (wsErr) {
    console.warn(`[saas-v2-leads] workspace lookup failed user=${userId} err=${wsErr.message}`);
    return serverError('Failed to resolve workspace');
  }
  if (!workspaceRow) {
    return {
      statusCode: 404,
      headers: CORS,
      body: JSON.stringify({ error: 'No workspace for this user' }),
    };
  }
  const workspaceId = (workspaceRow as { id: string }).id;
  if (!(workspaceRow as { v2_enabled?: boolean }).v2_enabled) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({ error: 'V2 is not enabled for this workspace' }),
    };
  }

  // 3. Parse query
  const q = event.queryStringParameters ?? {};
  const filterStatus = (q.status as string | undefined)?.trim().toLowerCase();
  const dateFrom = (q.date_from as string | undefined)?.trim();
  const dateTo = (q.date_to as string | undefined)?.trim();
  const filterSource = (q.source as string | undefined)?.trim();
  const page = Math.max(1, parseInt(q.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit || '25', 10) || 25));
  const offset = (page - 1) * limit;

  if (filterStatus && !['new', 'contacted', 'booked', 'lost'].includes(filterStatus)) {
    return badRequest('status must be one of new|contacted|booked|lost');
  }
  if (dateFrom && Number.isNaN(Date.parse(dateFrom))) {
    return badRequest('date_from must be an ISO date string');
  }
  if (dateTo && Number.isNaN(Date.parse(dateTo))) {
    return badRequest('date_to must be an ISO date string');
  }

  // 4. Fetch business vertical (for hot-lead scoring)
  let vertical: string | null = null;
  try {
    const { data: bp } = await supa
      .from('business_profiles')
      .select('industry')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (bp && (bp as { industry?: string }).industry) {
      vertical = String((bp as { industry?: string }).industry);
    }
  } catch {
    // Best-effort; not having a vertical just lowers the hot-lead signal.
  }

  // 5. Fetch leads page (with server-side defense-in-depth: user_id filter)
  let leadsQuery = supa
    .from('leads')
    .select(
      'id, user_id, first_name, last_name, email, phone, source, status, call_status, call_duration, sms_sent, created_at, raw_data',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) {
    // The DB's status column is free-form; match common values that fold into
    // the requested V2 status.
    const candidates = statusCandidates(filterStatus as LeadStatus);
    leadsQuery = leadsQuery.in('status', candidates);
  }
  if (filterSource) leadsQuery = leadsQuery.eq('source', filterSource);
  if (dateFrom) leadsQuery = leadsQuery.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) leadsQuery = leadsQuery.lte('created_at', new Date(dateTo).toISOString());

  const { data: leadRows, error: leadsErr, count } = await leadsQuery;

  if (leadsErr) {
    console.warn(`[saas-v2-leads] leads query failed user=${userId} err=${leadsErr.message}`);
    return serverError('Failed to fetch leads');
  }

  const leads = (leadRows ?? []) as LeadRow[];
  const total = typeof count === 'number' ? count : leads.length;

  // 6. Hot lead — pulled from a fresh week-window query (NOT filtered by the
  //    current UI filters; the hot card is global so toggling a filter doesn't
  //    hide it).
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { data: weekRows, error: weekErr } = await supa
    .from('leads')
    .select(
      'id, user_id, first_name, last_name, email, phone, source, status, call_status, call_duration, sms_sent, created_at, raw_data',
    )
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100);
  if (weekErr) {
    console.warn(`[saas-v2-leads] week-window query failed user=${userId} err=${weekErr.message}`);
  }
  const hotPoolBase = ((weekRows ?? []) as LeadRow[]);
  // Union the current page leads in case the page covers older rows the
  // week-window missed (edge case: very low volume + paginating).
  const seen = new Set(hotPoolBase.map((l) => l.id));
  for (const l of leads) {
    if (!seen.has(l.id)) {
      hotPoolBase.push(l);
      seen.add(l.id);
    }
  }
  const hot = pickHotLead(hotPoolBase, vertical);

  // 7. Batch-summarize the page (plus hot, if not already in the page).
  const toSummarize = [...leads];
  if (hot && !leads.find((l) => l.id === hot.id)) toSummarize.push(hot);

  const summaryMap = await batchSummarize(toSummarize, vertical);

  const cards: LeadCard[] = leads.map((l) => {
    const norm = normalizeStatus(l.status);
    return {
      id: l.id,
      name: leadName(l),
      source: sourceLabel(l.source),
      captured_at: l.created_at,
      ai_summary: summaryMap.get(l.id) ?? deterministicSummary(l),
      status: norm,
      next_action: nextActionFor(norm),
    };
  });

  let hotCard: HotLeadCard | null = null;
  if (hot) {
    const whyHot = await explainHotLead(hot, vertical);
    const norm = normalizeStatus(hot.status);
    hotCard = {
      id: hot.id,
      name: leadName(hot),
      source: sourceLabel(hot.source),
      captured_at: hot.created_at,
      ai_summary: summaryMap.get(hot.id) ?? deterministicSummary(hot),
      status: norm,
      next_action: nextActionFor(norm),
      why_hot: whyHot,
    };
  }

  const response: LeadsResponse = {
    hot_lead: hotCard,
    leads: cards,
    total,
  };

  // 8. Telemetry — never block the response on event emit
  void emitSaasV2Event({
    workspace_id: workspaceId,
    type: 'saas_v2_leads_list_rendered',
    payload: {
      workspace_id: workspaceId,
      count: cards.length,
      has_hot_lead: hotCard !== null,
      filter_applied: filterStatus || filterSource || dateFrom || dateTo ? true : false,
    },
  });

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify(response),
  };
};

function statusCandidates(v2Status: LeadStatus): string[] {
  switch (v2Status) {
    case 'new':
      return ['new', 'NEW', 'pending', 'open'];
    case 'contacted':
      return ['contacted', 'CONTACTED', 'in_progress', 'pending', 'scheduled'];
    case 'booked':
      return ['booked', 'BOOKED', 'confirmed', 'completed'];
    case 'lost':
      return ['lost', 'dead', 'rejected', 'unqualified'];
  }
}
