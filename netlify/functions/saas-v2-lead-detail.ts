import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-lead-detail — V2 single-lead drawer endpoint.
 *
 * GET /.netlify/functions/saas-v2-lead-detail?lead_id=<uuid>
 *
 * Auth: Bearer JWT. workspace_id derived server-side.
 * Authorization: verify the lead's user_id matches the resolved workspace
 *   user_id. Otherwise return 404 (not 403 — never confirm a row exists).
 *
 * Returns:
 *   {
 *     lead: { ...full lead row sanitized },
 *     touchpoints: Array<{ at, kind, channel, summary, raw? }>,
 *     suggested_next_action: { label, reasoning, draft_message? }
 *   }
 *
 * AI:
 *   suggested_next_action via Sonnet — the V2 narrative tier. We feed it the
 *   lead + touchpoint history + business vertical, and ask for one specific
 *   action + reasoning + optional drafted message.
 *
 * Event: emits `saas_v2_lead_drawer_opened` (mirror to aios_event_log only).
 */

import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

import { getServiceSupabase } from './_shared/token-utils';
import { emitSaasV2Event } from './_shared/saas-v2-events';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
// ─── Types ──────────────────────────────────────────────────────────────────

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

interface Touchpoint {
  at: string;
  kind: 'lead_captured' | 'call' | 'sms' | 'email' | 'chat' | 'callback';
  channel: string;
  summary: string;
  raw?: Record<string, unknown>;
}

interface SuggestedAction {
  label: string;
  reasoning: string;
  draft_message?: string;
}

interface LeadDetailResponse {
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    status: string | null;
    captured_at: string;
    call_status: string | null;
    call_duration_seconds: number | null;
    sms_sent: boolean;
    transcript_snippet: string | null;
  };
  touchpoints: Touchpoint[];
  suggested_next_action: SuggestedAction;
}

// ─── Response helpers ──────────────────────────────────────────────────────


function leadName(l: LeadRow): string {
  const parts = [l.first_name, l.last_name].filter(Boolean).map((s) => String(s).trim());
  if (parts.length) return parts.join(' ');
  if (l.phone) return l.phone;
  if (l.email) return l.email;
  return 'Unknown';
}

function extractTranscriptSnippet(raw: Record<string, unknown> | null): string | null {
  if (!raw) return null;
  // Common keys we've seen across the codebase: transcript, transcript_text,
  // summary, message, body, conversation.
  const candidates = ['transcript', 'transcript_text', 'summary', 'message', 'body', 'conversation'];
  for (const k of candidates) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.length > 600 ? v.slice(0, 600 - 1) + '…' : v;
    }
  }
  return null;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ─── Build touchpoints from lead + callbacks ────────────────────────────────

interface CallbackRow {
  id: string;
  source: string | null;
  status: string | null;
  user_id: string;
  created_at: string;
}

async function buildTouchpoints(
  supa: ReturnType<typeof getServiceSupabase>,
  lead: LeadRow,
  workspaceId: string,
): Promise<Touchpoint[]> {
  const tps: Touchpoint[] = [];

  // The lead capture itself is always touchpoint #1.
  tps.push({
    at: lead.created_at,
    kind: 'lead_captured',
    channel: lead.source || 'unknown',
    summary: `Captured from ${lead.source || 'unknown source'}.`,
  });

  // The call (if any).
  if (lead.call_status) {
    tps.push({
      at: lead.created_at,
      kind: 'call',
      channel: 'voice',
      summary: `Call ${lead.call_status}${
        lead.call_duration ? ` — ${Math.round(lead.call_duration / 60)}m ${lead.call_duration % 60}s` : ''
      }.`,
    });
  }

  // SMS attempt (if any). The leads.sms_sent column is a boolean only — we
  // don't know the body, just that something was sent.
  if (lead.sms_sent) {
    tps.push({
      at: lead.created_at,
      kind: 'sms',
      channel: 'sms',
      summary: 'Outbound SMS sent.',
    });
  }

  // Pull related callbacks by the same user in a +/- 24h window so we surface
  // any scheduled-callback events around this lead. We can't reliably join by
  // lead_id (no FK on callbacks today), so we use a time-window heuristic.
  try {
    const captured = new Date(lead.created_at).getTime();
    const since = new Date(captured - 24 * 3_600_000).toISOString();
    const until = new Date(captured + 24 * 3_600_000).toISOString();
    const { data } = await supa
      .from('callbacks')
      .select('id, source, status, user_id, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since)
      .lte('created_at', until)
      .order('created_at', { ascending: true })
      .limit(20);
    for (const cb of ((data ?? []) as CallbackRow[])) {
      tps.push({
        at: cb.created_at,
        kind: 'callback',
        channel: cb.source || 'callback',
        summary: `Callback scheduled — ${cb.status || 'pending'}.`,
      });
    }
  } catch {
    // soft dependency
  }

  // Sort chronologically.
  tps.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  return tps;
}

// ─── AI: Sonnet-suggested next action ───────────────────────────────────────

async function suggestNextAction(
  lead: LeadRow,
  touchpoints: Touchpoint[],
  vertical: string | null,
): Promise<SuggestedAction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAction(lead);

  try {
    const client = new Anthropic({ apiKey });
    const tool = {
      name: 'emit_next_action',
      description:
        'Emit the recommended next action: a short label, the reasoning, and an optional drafted message.',
      input_schema: {
        type: 'object',
        properties: {
          label: { type: 'string', maxLength: 60 },
          reasoning: { type: 'string', maxLength: 280 },
          draft_message: { type: 'string', maxLength: 600 },
        },
        required: ['label', 'reasoning'],
      },
    } as const;

    const transcript = extractTranscriptSnippet(lead.raw_data);

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6-20251015',
      max_tokens: 1024,
      system: [
        'You are this workspace\'s lead-engagement strategist for Boltcall — a calm, specific senior consultant.',
        'Given ONE lead\'s full history, recommend the single next action to take in the next 15 minutes.',
        'STRICT rules:',
        '- Narrative-first. No markdown, no bullets in the reasoning. Plain prose.',
        '- Cite specific evidence from the touchpoints (e.g. "they called at 9:14 and hung up at 0:11" not "they tried to reach you").',
        '- Sound like a 20-person team. Use "we"/"our team", never "I".',
        '- Keep reasoning under 50 words.',
        '- label is an imperative verb phrase: "Call back now", "Send SMS confirming Tue 10am", "Email pricing PDF".',
        '- If a text/email is the right move AND we have a phone or email, draft the message (<=120 words, sounds human, no emojis, no marketing speak).',
        vertical ? `- Business vertical: ${vertical}. Use vertical-appropriate framing.` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      messages: [
        {
          role: 'user',
          content: [
            '# Lead',
            JSON.stringify(
              {
                name: leadName(lead),
                email: lead.email,
                phone: lead.phone,
                source: lead.source,
                status: lead.status,
                call_status: lead.call_status,
                call_duration_seconds: lead.call_duration,
                sms_sent: !!lead.sms_sent,
                captured_at: lead.created_at,
                transcript_snippet: transcript,
              },
              null,
              2,
            ),
            '',
            '# Touchpoint history',
            JSON.stringify(touchpoints, null, 2),
            '',
            '# Raw lead metadata (may contain intent / message body)',
            lead.raw_data ? truncate(JSON.stringify(lead.raw_data, null, 2), 1500) : '(none)',
            '',
            'Return your recommendation via emit_next_action.',
          ].join('\n'),
        },
      ],
      tools: [tool as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: 'emit_next_action' },
    });

    const block = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_next_action',
    );
    if (block) {
      const parsed = block.input as SuggestedAction;
      if (parsed.label && parsed.reasoning) {
        return {
          label: String(parsed.label).slice(0, 80),
          reasoning: String(parsed.reasoning).slice(0, 320),
          draft_message: parsed.draft_message
            ? String(parsed.draft_message).slice(0, 700)
            : undefined,
        };
      }
    }
  } catch (err) {
    console.warn(
      `[saas-v2-lead-detail] suggestNextAction failed (${
        err instanceof Error ? err.message : String(err)
      }); using fallback`,
    );
  }
  return fallbackAction(lead);
}

function fallbackAction(lead: LeadRow): SuggestedAction {
  if (!lead.call_status && lead.phone) {
    return {
      label: 'Call this lead now',
      reasoning:
        'No call attempt is on file yet and we have a phone number. The first response wins — try a live call before SMS.',
    };
  }
  if (lead.call_status && lead.call_status !== 'completed' && lead.phone) {
    return {
      label: 'Retry the call',
      reasoning: `Last call ${lead.call_status}. A second attempt within 5 minutes lifts connect rates ~30%.`,
    };
  }
  if (!lead.sms_sent && (lead.phone || lead.email)) {
    return {
      label: 'Send a quick SMS',
      reasoning: 'No SMS on file. A short text within 5 minutes of capture lifts reply rates.',
      draft_message: `Hi${lead.first_name ? ' ' + lead.first_name : ''}, thanks for reaching out — can we hop on a quick call? Reply with a time that works.`,
    };
  }
  return {
    label: 'Follow up',
    reasoning: 'A short, specific follow-up keeps the lead warm.',
  };
}

// ─── Handler ────────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  function badRequest(message: string) {

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function unauthorized(message: string) {

    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function notFound() {

    return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Lead not found' }) };

  }

  function serverError(message: string) {

    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: message }) };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: cors,
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

  // 2. Resolve workspace + v2 gate
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, v2_enabled')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (wsErr) {
    console.warn(`[saas-v2-lead-detail] workspace lookup failed user=${userId} err=${wsErr.message}`);
    return serverError('Failed to resolve workspace');
  }
  if (!workspaceRow) return notFound();
  const workspaceId = (workspaceRow as { id: string }).id;
  if (!(workspaceRow as { v2_enabled?: boolean }).v2_enabled) {
    return {
      statusCode: 403,
      headers: cors,
      body: JSON.stringify({ error: 'V2 is not enabled for this workspace' }),
    };
  }

  // 3. lead_id param
  const q = event.queryStringParameters ?? {};
  const leadId = (q.lead_id as string | undefined)?.trim();
  if (!leadId) return badRequest('lead_id query parameter is required');
  if (!/^[0-9a-fA-F-]{16,64}$/.test(leadId)) return badRequest('lead_id must be a uuid');

  // 4. Fetch the lead — scope the query to workspace_id so cross-tenant lookups
  //    return 404, not 403 (don't leak existence).
  const { data: leadRow, error: leadErr } = await supa
    .from('leads')
    .select(
      'id, user_id, first_name, last_name, email, phone, source, status, call_status, call_duration, sms_sent, created_at, raw_data',
    )
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (leadErr) {
    console.warn(`[saas-v2-lead-detail] lead query failed lead=${leadId} err=${leadErr.message}`);
    return serverError('Failed to fetch lead');
  }
  if (!leadRow) return notFound();
  const lead = leadRow as LeadRow;

  // 5. Vertical
  let vertical: string | null = null;
  try {
    const { data: bp } = await supa
      .from('business_profiles')
      .select('industry')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();
    if (bp && (bp as { industry?: string }).industry) {
      vertical = String((bp as { industry?: string }).industry);
    }
  } catch {
    /* best-effort */
  }

  // 6. Touchpoints + AI action
  const touchpoints = await buildTouchpoints(supa, lead, workspaceId);
  const suggested = await suggestNextAction(lead, touchpoints, vertical);

  const response: LeadDetailResponse = {
    lead: {
      id: lead.id,
      name: leadName(lead),
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      captured_at: lead.created_at,
      call_status: lead.call_status,
      call_duration_seconds: lead.call_duration,
      sms_sent: !!lead.sms_sent,
      transcript_snippet: extractTranscriptSnippet(lead.raw_data),
    },
    touchpoints,
    suggested_next_action: suggested,
  };

  // 7. Telemetry — never block
  void emitSaasV2Event({
    workspace_id: workspaceId,
    type: 'saas_v2_lead_drawer_opened',
    payload: { workspace_id: workspaceId, lead_id: lead.id },
  });

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify(response),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
