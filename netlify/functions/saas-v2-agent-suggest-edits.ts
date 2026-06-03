/**
 * GET /.netlify/functions/saas-v2-agent-suggest-edits
 *
 * Returns 3-5 Sonnet-suggested improvements to the workspace's current Retell
 * agent prompt, grounded in (a) the prompt itself and (b) up to 30 days of
 * QA-flagged failed calls (when available). Powers the "Show suggested prompt
 * edits" drawer on /v2/agent.
 *
 * Suggestions are PROPOSED only — this endpoint never writes the prompt back.
 * The Apply button in the drawer is a stub today; a follow-up PR will add
 * an /apply endpoint that revisits the prompt + emits prompt_revised.
 *
 * Auth: Bearer JWT only. Workspace derived server-side from JWT.
 *
 * Returns:
 *   {
 *     suggestions: Array<{
 *       title: string,             // short headline ("Ask for callback number")
 *       body: string,              // 1-2 sentence prompt patch description
 *       why: string,               // why this would help (grounded in calls if available)
 *       severity: 'low'|'medium'|'high',
 *     }>,
 *     used_qa_failures: boolean,   // true iff we had real call data to ground
 *     failed_call_count: number,
 *     cold_start: boolean,         // true when no prompt configured
 *   }
 *
 * Emits: saas_v2_agent_suggest_edits with { workspace_id, suggestion_count, ... }.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { callClaude } from './_shared/agency-agents/run-agent';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

interface SuggestionsOutput {
  suggestions: Array<{
    title: string;
    body: string;
    why: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
}

const SUGGESTIONS_SCHEMA = {
  type: 'object' as const,
  properties: {
    suggestions: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description:
              'Short imperative headline ≤ 60 chars. E.g. "Ask for callback number when caller cannot talk now".',
          },
          body: {
            type: 'string',
            description:
              '1-2 sentence description of the prompt patch to apply. Should read like a line you could paste straight into the prompt.',
          },
          why: {
            type: 'string',
            description:
              'Justification grounded in concrete evidence — either a behavior the current prompt fails to specify, or a recurring pattern in the recent failed calls supplied below. No generic advice.',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description:
              'high = lost bookings or compliance risk. medium = caller experience or attribution. low = polish.',
          },
        },
        required: ['title', 'body', 'why', 'severity'],
        additionalProperties: false,
      },
      description: 'Exactly 3-5 actionable suggestions, most-impactful first.',
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
};

interface FailedCallRow {
  id: string;
  outcome: string | null;
  qa_score: number | null;
  sideways_reason: string | null;
  started_at: string | null;
  duration_sec: number | null;
}

async function loadAgentPrompt(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
): Promise<{ prompt: string; agent_id: string | null }> {
  try {
    const { data } = await supa
      .from('agents')
      .select('id, system_prompt')
      .eq('user_id', userId)
      .order('system_prompt_synced_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data && typeof data.system_prompt === 'string' && data.system_prompt.trim()) {
      return { prompt: data.system_prompt.trim(), agent_id: (data.id as string) || null };
    }
  } catch (err) {
    console.warn('[saas-v2-agent-suggest-edits] agents lookup failed', err);
  }
  return { prompt: '', agent_id: null };
}

async function loadFailedCalls(
  supa: ReturnType<typeof getServiceSupabase>,
  workspaceId: string,
): Promise<FailedCallRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supa
      .from('retell_calls')
      .select('id, outcome, qa_score, sideways_reason, started_at, duration_sec')
      .eq('workspace_id', workspaceId)
      .gte('started_at', since)
      .or('qa_score.lt.60,sideways_flag.eq.true')
      .order('started_at', { ascending: false })
      .limit(20);
    if (error || !Array.isArray(data)) return [];
    return data as FailedCallRow[];
  } catch (err) {
    console.warn('[saas-v2-agent-suggest-edits] failed-calls query soft-failed', err);
    return [];
  }
}

function summarizeFailures(rows: FailedCallRow[]): string {
  if (rows.length === 0) return '(no recent failed calls available)';
  const lines: string[] = [];
  for (const r of rows.slice(0, 20)) {
    const when = r.started_at ? new Date(r.started_at).toISOString().slice(0, 10) : '----';
    const score = typeof r.qa_score === 'number' ? `qa=${r.qa_score}` : 'qa=?';
    const out = r.outcome || 'unknown';
    const reason = (r.sideways_reason || '').slice(0, 120);
    lines.push(`- ${when} · ${score} · outcome=${out}${reason ? ` · ${reason}` : ''}`);
  }
  return lines.join('\n');
}

async function suggestEditsViaSonnet(
  workspaceId: string,
  agentPrompt: string,
  failuresSummary: string,
  hasFailures: boolean,
): Promise<SuggestionsOutput | null> {
  try {
    const result = await callClaude<SuggestionsOutput>({
      agent_name: 'saas-v2.agent-suggest-edits',
      client_id: workspaceId,
      tier: 'sonnet',
      max_tokens: 2048,
      system: [
        "You are a senior voice-AI agent coach embedded in the V2 dashboard.",
        'You read a Retell agent prompt and propose 3-5 concrete improvements.',
        'STRICT rules:',
        '- Every suggestion must be ACTIONABLE — a line the owner could paste straight into the prompt.',
        '- Ground each suggestion in evidence: either (a) something the current prompt does not specify, or (b) a recurring pattern in the recent failed-calls summary.',
        '- Never propose generic best-practice. "Be more empathetic" is rejected. "Add: when caller mentions cost, restate the value of the included consult before quoting" is good.',
        '- severity=high only when a bookings, compliance, or after-hours risk is at stake. medium for caller experience or attribution gaps. low for polish.',
        '- Order by impact, highest-first.',
        '- Never invent failed calls that were not supplied.',
      ].join('\n'),
      user_messages: [
        {
          role: 'user',
          content: [
            '# Your task',
            'Propose 3-5 specific prompt edits the owner should consider applying.',
            '',
            '# Current Retell agent prompt',
            '```',
            agentPrompt.slice(0, 10000),
            '```',
            '',
            '# Recent failed / sideways calls (last 30 days)',
            hasFailures
              ? failuresSummary
              : '(none — base your suggestions on prompt gaps only)',
            '',
            '# Return',
            '3-5 suggestions via the emit_structured_output tool, ordered by impact.',
          ].join('\n'),
        },
      ],
      output_schema: SUGGESTIONS_SCHEMA,
    });
    return result.output;
  } catch (err) {
    console.error('[saas-v2-agent-suggest-edits] Sonnet call failed', err);
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return jsonResponse(401, { error: 'Invalid or expired token' });
  }
  const userId = userResult.user.id;

  // ── 2. Workspace resolution ─────────────────────────────────────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (wsErr) {
    return jsonResponse(500, { error: 'Workspace lookup failed' });
  }
  if (!workspaceRow) {
    return jsonResponse(404, { error: 'No workspace found for this user' });
  }
  const workspaceId = (workspaceRow as { id: string }).id;

  // ── 3. Load prompt + failures ───────────────────────────────────────────
  const { prompt: agentPrompt } = await loadAgentPrompt(supa, userId);
  if (!agentPrompt) {
    return jsonResponse(200, {
      suggestions: [],
      used_qa_failures: false,
      failed_call_count: 0,
      cold_start: true,
    });
  }

  const failedRows = await loadFailedCalls(supa, workspaceId);
  const failuresSummary = summarizeFailures(failedRows);
  const hasFailures = failedRows.length > 0;

  // ── 4. Sonnet call ──────────────────────────────────────────────────────
  const judged = await suggestEditsViaSonnet(
    workspaceId,
    agentPrompt,
    failuresSummary,
    hasFailures,
  );

  if (!judged || !Array.isArray(judged.suggestions)) {
    return jsonResponse(502, {
      error: 'Suggestion generation failed — please retry.',
      suggestions: [],
      used_qa_failures: hasFailures,
      failed_call_count: failedRows.length,
      cold_start: false,
    });
  }

  // Defensive sanitization — clip to 5 items, clamp string lengths.
  const cleanSuggestions = judged.suggestions.slice(0, 5).map((s) => ({
    title: (s.title || '').slice(0, 120),
    body: (s.body || '').slice(0, 600),
    why: (s.why || '').slice(0, 600),
    severity:
      s.severity === 'high' || s.severity === 'medium' || s.severity === 'low'
        ? s.severity
        : 'medium',
  }));

  const highSeverityCount = cleanSuggestions.filter(
    (s) => s.severity === 'high',
  ).length;

  // ── 5. Emit telemetry ───────────────────────────────────────────────────
  try {
    await emitAgencyEvent({
      client_id: workspaceId,
      agent_name: 'saas-v2-agent-suggest-edits',
      type: 'saas_v2_agent_suggest_edits',
      severity: highSeverityCount > 0 ? 'warn' : 'info',
      payload: {
        workspace_id: workspaceId,
        suggestion_count: cleanSuggestions.length,
        high_severity_count: highSeverityCount,
        used_qa_failures: hasFailures,
      },
      why_explanation: hasFailures
        ? `User opened suggested edits drawer; ${cleanSuggestions.length} suggestions grounded in ${failedRows.length} recent failed calls.`
        : `User opened suggested edits drawer; ${cleanSuggestions.length} suggestions based on prompt gaps (no recent failure data).`,
    });
  } catch (emitErr) {
    console.warn('[saas-v2-agent-suggest-edits] event emit failed (non-fatal)', emitErr);
  }

  return jsonResponse(200, {
    suggestions: cleanSuggestions,
    used_qa_failures: hasFailures,
    failed_call_count: failedRows.length,
    cold_start: false,
  });
};
