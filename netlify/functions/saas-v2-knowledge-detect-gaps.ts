import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';

/**
 * saas-v2-knowledge-detect-gaps.ts
 *
 * Reads the last 30 days of call transcripts for the authenticated workspace
 * and asks Sonnet-tier model to extract caller questions the agent FAILED to
 * answer well. Returns deduplicated/clustered gaps so the V2 Knowledge page
 * can render them as "Missing FAQs from your calls" cards.
 *
 * Auth: JWT → user_id → workspace_id.
 * Method: GET.
 *
 * Response shape:
 *   {
 *     gaps: Array<{ question, frequency, sample_call_id, sample_snippet }>,
 *     cold_start: boolean,
 *     window_days: number,
 *     calls_analyzed: number,
 *   }
 *
 * Cold-start: if the workspace has < 5 calls in the window, return an empty
 * array with cold_start=true so the page renders the "Unlock at 5 calls"
 * placeholder.
 *
 * Telemetry: emits one `saas_v2_knowledge_gap_detected` event per gap (batched
 * via a single insert when the shared emitter exposes a batch method).
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function unauthorized(msg: string) {
  return { statusCode: 401, headers, body: JSON.stringify({ error: msg }) };
}

interface Gap {
  question: string;
  frequency: number;
  sample_call_id: string;
  sample_snippet: string;
}

interface CallRow {
  id: string;
  call_id?: string | null;
  transcript?: string | null;
  transcript_text?: string | null;
  summary?: string | null;
  created_at?: string | null;
}

async function emitGaps(workspaceId: string, gaps: Gap[]) {
  if (gaps.length === 0) return;
  try {
    const mod = await import('./_shared/emit-agency-event').catch(() => null);
    if (!mod) return;
    const emitter = (mod as any).emitSaasV2Event || (mod as any).emitAgencyEvent;
    if (typeof emitter !== 'function') return;
    await Promise.all(
      gaps.map(g =>
        emitter({
          workspace_id: workspaceId,
          type: 'saas_v2_knowledge_gap_detected',
          payload: {
            workspace_id: workspaceId,
            query_text: g.question.slice(0, 200),
            top_score: 0,
            source: 'conversation',
          },
        }).catch(() => {}),
      ),
    );
  } catch (err) {
    console.warn('[saas-v2-knowledge-detect-gaps] emit failed (non-fatal):', err);
  }
}

/**
 * Try a few likely table names for stored transcripts. Boltcall has rotated
 * names across migrations (call_logs, conversation_outcomes, retell_calls).
 * The first one that returns rows wins; if none do we return [].
 */
async function loadRecentCalls(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
  sinceIso: string,
): Promise<CallRow[]> {
  const tableCandidates: Array<{ table: string; cols: string }> = [
    { table: 'call_logs', cols: 'id, call_id, transcript, summary, created_at' },
    { table: 'conversation_outcomes', cols: 'id, call_id, transcript, summary, created_at' },
    { table: 'retell_calls', cols: 'id, call_id, transcript, summary, created_at' },
  ];

  for (const { table, cols } of tableCandidates) {
    const { data, error } = await supa
      .from(table)
      .select(cols)
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(60);

    if (!error && Array.isArray(data) && data.length > 0) {
      // Cast through unknown — column-set varies per candidate table.
      return data as unknown as CallRow[];
    }
  }

  return [];
}

function transcriptText(call: CallRow): string {
  const raw = call.transcript_text || call.transcript || call.summary || '';
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

async function extractGaps(
  calls: CallRow[],
): Promise<Gap[]> {
  // Build a compact corpus — one block per call, capped at 800 chars each.
  const blocks = calls
    .map((c, i) => {
      const text = transcriptText(c).slice(0, 800);
      if (!text) return null;
      const id = c.call_id || c.id;
      return `--- CALL ${i + 1} (id: ${id}) ---\n${text}`;
    })
    .filter((b): b is string => b !== null)
    .slice(0, 30);

  if (blocks.length === 0) return [];

  const system = [
    'You are a senior account strategist reviewing call transcripts for a Boltcall customer.',
    'Your job: surface caller questions that the AI agent FAILED to answer well.',
    'Failure modes to look for:',
    '- Agent said "I don\'t have that information" / "let me transfer you" / "I\'m not sure".',
    '- Agent gave a vague non-answer when the caller asked something specific.',
    '- Caller had to repeat or rephrase the question.',
    '',
    'Cluster similar questions (e.g. three callers asking about cancellation policy → one gap, frequency: 3).',
    'Return STRICT JSON only — no markdown, no commentary. Shape:',
    '{',
    '  "gaps": [',
    '    {',
    '      "question": "Do you accept walk-ins?",',
    '      "frequency": 3,',
    '      "sample_call_id": "<one of the IDs above>",',
    '      "sample_snippet": "Caller: do you accept walk-ins? Agent: I don\'t have that information."',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Max 8 gaps, ordered by frequency desc.',
    '- Each question phrased as the user would ask it (Title Case, ends in "?").',
    '- sample_snippet: 1-2 sentence quote from the transcript, <= 200 chars.',
    '- If no gaps detected, return { "gaps": [] }.',
  ].join('\n');

  const user = `Last ${calls.length} calls:\n\n${blocks.join('\n\n')}`;

  let raw: string;
  try {
    raw = await chatCompletion(system, user, { maxTokens: 1500, tier: 'heavy' });
  } catch (err) {
    console.warn('[saas-v2-knowledge-detect-gaps] LLM call failed:', err);
    return [];
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    const rawGaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
    return rawGaps
      .filter((g: any) => g && typeof g.question === 'string')
      .slice(0, 8)
      .map((g: any) => ({
        question: String(g.question).slice(0, 240).trim(),
        frequency: Math.max(1, Math.min(99, Number(g.frequency) || 1)),
        sample_call_id: String(g.sample_call_id || '').slice(0, 100),
        sample_snippet: String(g.sample_snippet || '').slice(0, 240).trim(),
      }))
      .filter((g: Gap) => g.question.length > 0);
  } catch (err) {
    console.warn('[saas-v2-knowledge-detect-gaps] JSON parse failed:', err);
    return [];
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return unauthorized('Invalid or expired token');
  const userId = userResult.user.id;

  const { data: ws } = await supa
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  const workspaceId = ws?.id || userId;

  const WINDOW_DAYS = 30;
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const calls = await loadRecentCalls(supa, userId, sinceIso);

    // Cold-start guard.
    if (calls.length < 5) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          gaps: [],
          cold_start: true,
          window_days: WINDOW_DAYS,
          calls_analyzed: calls.length,
        }),
      };
    }

    const gaps = await extractGaps(calls);
    await emitGaps(workspaceId, gaps);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        gaps,
        cold_start: false,
        window_days: WINDOW_DAYS,
        calls_analyzed: calls.length,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[saas-v2-knowledge-detect-gaps] handler error:', msg);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }
};

export { handler };
