/**
 * POST /.netlify/functions/saas-v2-qa-run
 *
 * Single-tenant V2 QA runner. Scores unscored calls in the last N days for
 * the caller's workspace and writes to saas_v2_qa_scores.
 *
 * Auth (mirrors saas-v2-toggle.ts):
 *   1. Bearer JWT.
 *   2. getUser(token) -> userId.
 *   3. SELECT workspaces WHERE owner_id = userId (security barrier).
 *
 * Body: { window_days?: number }   default 7
 * Cap: at most CAP_PER_INVOCATION calls scored per request (default 20) so
 *      the function stays within Netlify's 26s wall clock.
 *
 * Returns:
 *   {
 *     scored_count: number,
 *     skipped_count: number,
 *     failures: Array<{ call_id, reason }>,
 *     average_score: number | null,
 *     low_score_count: number
 *   }
 *
 * Rubric: 4 dimensions per the brief — empathy, accuracy, intent_capture,
 *   transfer_handled, each 0-10 integer. Overall = mean of the four.
 *
 * Scoring uses the shared chatCompletion (Foundry heavy → legacy → Anthropic
 * fallback) per the wave-3 routing policy. The system prompt forces JSON-only
 * output with the exact 4-dim shape.
 *
 * Emits saas_v2_qa_run { workspace_id, scored_count, window_days, ... }.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { emitAgencyEvent } from './_shared/emit-agency-event';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const CAP_PER_INVOCATION = 20;
const DEFAULT_WINDOW_DAYS = 7;
const FAIL_THRESHOLD = 6.0;
const MIN_TRANSCRIPT_CHARS = 50;
const TRANSCRIPT_CHAR_CAP = 8000;

type Rubric = {
  empathy: number | null;
  accuracy: number | null;
  intent_capture: number | null;
  transfer_handled: number | null;
};

type JudgeOutput = {
  rubric: Rubric;
  verdict_oneliner: string;
};

type RetellCall = {
  call_id: string;
  transcript: string | null;
  duration_s: number | null;
  outcome: string | null;
  started_at: string | null;
};

const SCORING_SYSTEM_PROMPT =
  'You are a senior call-center QA reviewer for a local-services voice AI agent. ' +
  'Read the transcript and score the call on FOUR dimensions, each 0-10 integer:\n' +
  '  - empathy: Did the agent acknowledge concerns, mirror emotion, sound human?\n' +
  '  - accuracy: Were the agent\'s answers factually correct and free of hallucinated promises?\n' +
  '  - intent_capture: Did the agent identify what the caller actually wanted and capture the key details?\n' +
  '  - transfer_handled: If a transfer or escalation was needed, was it offered cleanly with context handoff? (Score 10 if no transfer was needed.)\n\n' +
  'Then write ONE sentence (max 22 words, past tense, plain English) summarizing what happened ' +
  'and what (if anything) the agent missed.\n\n' +
  'Return STRICT JSON only, no prose, no markdown, no code fences. Exact shape:\n' +
  '{"empathy": int, "accuracy": int, "intent_capture": int, "transfer_handled": int, "verdict_oneliner": "..."}\n\n' +
  'Never mention model names, tokens, prompt mechanics, or that you are an AI. Address the call neutrally.';

function clamp01to10(n: unknown): number | null {
  const v = Number.parseInt(String(n), 10);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(10, v));
}

function meanOfNonNull(nums: Array<number | null>): number {
  const present = nums.filter((n): n is number => typeof n === 'number');
  if (present.length === 0) return 0;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 100) / 100;
}

/**
 * Best-effort extract the first JSON object from raw model output. Tolerates
 * leading/trailing prose or stray ```json fences.
 */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function scoreOne(call: RetellCall): Promise<JudgeOutput | { error: string }> {
  if (!call.transcript || call.transcript.length < MIN_TRANSCRIPT_CHARS) {
    return { error: 'no_transcript' };
  }

  const userMsg = JSON.stringify({
    call_id: call.call_id,
    duration_sec: call.duration_s ?? 0,
    outcome: call.outcome ?? 'unknown',
    started_at: call.started_at ?? null,
    transcript: call.transcript.slice(0, TRANSCRIPT_CHAR_CAP),
  });

  let raw: string;
  try {
    raw = await chatCompletion(SCORING_SYSTEM_PROMPT, userMsg, {
      tier: 'heavy',
      maxTokens: 400,
    });
  } catch (err) {
    return { error: `chat_completion_failed: ${(err as Error).message?.slice(0, 200) ?? 'unknown'}` };
  }

  const parsed = extractJsonObject(raw);
  if (!parsed) return { error: 'invalid_json' };

  const rubric: Rubric = {
    empathy: clamp01to10(parsed.empathy),
    accuracy: clamp01to10(parsed.accuracy),
    intent_capture: clamp01to10(parsed.intent_capture),
    transfer_handled: clamp01to10(parsed.transfer_handled),
  };

  // Require at least 2 of 4 dims scored, else mark as failed parse.
  const present = Object.values(rubric).filter((v) => typeof v === 'number').length;
  if (present < 2) return { error: 'insufficient_dim_scores' };

  const verdict =
    typeof parsed.verdict_oneliner === 'string'
      ? parsed.verdict_oneliner.trim().slice(0, 300)
      : '';

  return { rubric, verdict_oneliner: verdict };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }
  const userId = userResult.user.id;

  // ── Resolve workspace ───────────────────────────────────────────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (wsErr) {
    console.warn(`[saas-v2-qa-run] workspace lookup failed user=${userId}: ${wsErr.message}`);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Workspace lookup failed' }),
    };
  }
  if (!workspaceRow) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ error: 'No workspace owned by this user' }),
    };
  }
  const workspaceId = workspaceRow.id as string;

  // ── Body ────────────────────────────────────────────────────────────────
  let windowDays = DEFAULT_WINDOW_DAYS;
  try {
    const parsed = JSON.parse(event.body || '{}') as { window_days?: unknown };
    if (typeof parsed.window_days === 'number' && parsed.window_days > 0) {
      windowDays = Math.min(30, Math.floor(parsed.window_days));
    }
  } catch {
    // Empty/invalid body — use defaults.
  }

  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // ── Pull candidate calls: workspace-scoped, in window, with a transcript.
  //    Then filter out already-scored ones via a left-join-like check on
  //    saas_v2_qa_scores.
  const { data: candidateRows, error: candidatesErr } = await supa
    .from('retell_calls')
    .select('call_id, transcript, duration_s, outcome, started_at')
    .eq('workspace_id', workspaceId)
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: false })
    .limit(CAP_PER_INVOCATION * 5); // overfetch — we'll filter scored ones out below

  if (candidatesErr) {
    console.warn(`[saas-v2-qa-run] candidate query failed: ${candidatesErr.message}`);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Failed to load candidate calls' }),
    };
  }

  const candidates = (candidateRows ?? []) as RetellCall[];
  if (candidates.length === 0) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        scored_count: 0,
        skipped_count: 0,
        failures: [],
        average_score: null,
        low_score_count: 0,
      }),
    };
  }

  // Pull existing scores for these call_ids in one query so we don't double-score.
  const candidateIds = candidates.map((c) => c.call_id);
  const { data: alreadyScored } = await supa
    .from('saas_v2_qa_scores')
    .select('call_id')
    .eq('workspace_id', workspaceId)
    .in('call_id', candidateIds);
  const scoredSet = new Set((alreadyScored ?? []).map((r: { call_id: string }) => r.call_id));

  const unscored = candidates.filter((c) => !scoredSet.has(c.call_id));
  const toScore = unscored.slice(0, CAP_PER_INVOCATION);
  const skipped_count = candidates.length - toScore.length;

  // ── Score each call. Sequential to avoid burst rate-limiting the model
  //    backend; the cap of 20 keeps this well within Netlify's 26s budget.
  const failures: Array<{ call_id: string; reason: string }> = [];
  const insertRows: Array<{
    workspace_id: string;
    call_id: string;
    rubric_empathy: number | null;
    rubric_accuracy: number | null;
    rubric_intent_capture: number | null;
    rubric_transfer_handled: number | null;
    overall: number;
    verdict_oneliner: string;
    model: string;
  }> = [];

  // Best-effort model id for observability — we don't have it exposed from
  // chatCompletion, so we use the routing-derived hint.
  const modelHint = process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT
    ? process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT_HEAVY || 'gpt-5.5'
    : process.env.AZURE_OPENAI_ENDPOINT
      ? process.env.AZURE_OPENAI_DEPLOYMENT_HEAVY || 'gpt-4o'
      : 'claude-sonnet-4-5';

  for (const call of toScore) {
    const result = await scoreOne(call);
    if ('error' in result) {
      failures.push({ call_id: call.call_id, reason: result.error });
      continue;
    }
    const overall = meanOfNonNull([
      result.rubric.empathy,
      result.rubric.accuracy,
      result.rubric.intent_capture,
      result.rubric.transfer_handled,
    ]);
    insertRows.push({
      workspace_id: workspaceId,
      call_id: call.call_id,
      rubric_empathy: result.rubric.empathy,
      rubric_accuracy: result.rubric.accuracy,
      rubric_intent_capture: result.rubric.intent_capture,
      rubric_transfer_handled: result.rubric.transfer_handled,
      overall,
      verdict_oneliner: result.verdict_oneliner,
      model: modelHint,
    });
  }

  // ── Persist all scored rows in one upsert (idempotent on (workspace_id, call_id)).
  if (insertRows.length > 0) {
    const { error: upsertErr } = await supa
      .from('saas_v2_qa_scores')
      .upsert(insertRows, { onConflict: 'workspace_id,call_id' });
    if (upsertErr) {
      console.warn(`[saas-v2-qa-run] upsert failed: ${upsertErr.message}`);
      // Don't fail the whole call — return what we attempted with the error in failures.
      for (const r of insertRows) {
        failures.push({ call_id: r.call_id, reason: `db_upsert_failed: ${upsertErr.message.slice(0, 120)}` });
      }
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          scored_count: 0,
          skipped_count,
          failures,
          average_score: null,
          low_score_count: 0,
        }),
      };
    }
  }

  const overalls = insertRows.map((r) => r.overall);
  const average_score = overalls.length === 0
    ? null
    : Math.round((overalls.reduce((a, b) => a + b, 0) / overalls.length) * 100) / 100;
  const low_score_count = overalls.filter((s) => s < FAIL_THRESHOLD).length;

  // Also stamp retell_calls.qa_score (best-effort, on a 0-100 scale to match
  // the legacy column convention used by saas-v2-calls.ts).
  if (insertRows.length > 0) {
    for (const r of insertRows) {
      const qa100 = Math.round(r.overall * 10);
      // Fire-and-forget — log on failure, never block.
      supa
        .from('retell_calls')
        .update({ qa_score: qa100 })
        .eq('workspace_id', workspaceId)
        .eq('call_id', r.call_id)
        .then(({ error }) => {
          if (error) {
            console.warn(`[saas-v2-qa-run] qa_score stamp failed call=${r.call_id}: ${error.message}`);
          }
        });
    }
  }

  // ── Best-effort event emit ──────────────────────────────────────────────
  try {
    const { data: clientRow } = await supa
      .from('agency_clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (clientRow?.id) {
      await emitAgencyEvent({
        client_id: clientRow.id as string,
        agent_name: 'saas-v2-qa-run',
        type: 'saas_v2_qa_run',
        severity: 'info',
        payload: {
          workspace_id: workspaceId,
          scored_count: insertRows.length,
          window_days: windowDays,
          skipped_count,
          failures_count: failures.length,
          average_score,
          low_score_count,
        },
      });
    } else {
      console.log(
        `[saas-v2-qa-run] user=${userId} workspace=${workspaceId} scored=${insertRows.length} ` +
          `skipped=${skipped_count} failures=${failures.length} (self-serve, event emit skipped)`,
      );
    }
  } catch (err) {
    console.warn('[saas-v2-qa-run] event emit failed', err);
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      scored_count: insertRows.length,
      skipped_count,
      failures,
      average_score,
      low_score_count,
    }),
  };
};
