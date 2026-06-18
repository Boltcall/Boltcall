import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-ask-ai.ts — V2 SaaS · Ask Boltcall AI strategist (single-tenant)
 * ──────────────────────────────────────────────────────────────────────
 *
 * POST endpoint backing <AskBoltcallAIV2 /> on the V2 home page and the
 * "Ask the data" inputs on V2 analytics. Single-tenant adaptation of
 * `agency-client-ask-ai.ts` — same evidence-citation contract, simpler
 * because there's only one workspace per user (no agency_clients lookup,
 * no router-classifier, no agency knowledge RAG).
 *
 * Hard rules baked in:
 *   - workspace_id is ALWAYS derived from JWT (workspaces.user_id = uid).
 *     The endpoint NEVER trusts any workspace_id in the request body.
 *   - CORS uses the strict cors-v2 allowlist (fail-closed, never wildcard).
 *   - Every factual claim in the answer must cite a [^N] source.
 *   - Cost telemetry is fire-and-forget; never blocks the user's reply.
 *
 * Request body (accepts both V2 `text` and agency `content` field shapes):
 *   {
 *     question: string,                                // 1..1000 chars
 *     prior_turns?: [{ role: 'user'|'assistant', text|content: string }],
 *     conversation_id?: string,                        // echoed back; generated if absent
 *   }
 *
 * Response:
 *   {
 *     answer: string,                                  // paragraph with [^N] markers
 *     sources: [{ type: 'call'|'lead'|'kb', id, url?, snippet }],
 *     confidence: number,                              // 0..1
 *     conversation_id: string,
 *   }
 */

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';

import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion, type Tier } from './_shared/azure-ai';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
import { emitSaasV2Event } from './_shared/emit-agency-event';

const MAX_QUESTION_CHARS = 1000;
const MAX_PRIOR_TURNS = 8;
const RECENT_CALLS_LIMIT = 10;
const RECENT_LEADS_LIMIT = 10;
const ANSWER_MAX_TOKENS = 1200;

type Source = {
  type: 'call' | 'lead' | 'kb';
  id: string;
  url?: string;
  snippet: string;
};

interface AskAnswer {
  answer: string;
  cited_indices: number[];
  confidence: number;
}

function pickTier(question: string, priorTurnsCount: number): Tier {
  if (priorTurnsCount >= 3) return 'heavy';
  if (question.length > 200) return 'heavy';
  const heavyMarkers =
    /\b(why|compare|trend|drop|spike|predict|recommend|strategy|optimi[sz]e|forecast)\b/i;
  if (heavyMarkers.test(question)) return 'heavy';
  return 'light';
}

function tierToSchemaTier(t: Tier): 'haiku' | 'sonnet' {
  // saasV2AskAiQuerySchema accepts haiku|sonnet|opus; Azure tiers map closest as:
  return t === 'heavy' ? 'sonnet' : 'haiku';
}

function tryParseJson<T = unknown>(raw: string): T | null {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export const handler: Handler = async (event) => {
  const cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (
    getRequestOrigin(event.headers as Record<string, string>) &&
    !cors.allowed
  ) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized — missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
  const userId = userResult.user.id;

  // ── Parse body ───────────────────────────────────────────────────────
  let body: {
    question?: unknown;
    prior_turns?: unknown;
    conversation_id?: unknown;
  };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const question =
    typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'question is required' }),
    };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `question too long (max ${MAX_QUESTION_CHARS} chars)`,
      }),
    };
  }

  const conversationId =
    typeof body.conversation_id === 'string' && body.conversation_id
      ? body.conversation_id
      : randomUUID();

  // Accept both {role, text} (V2 shape) and {role, content} (agency-compat)
  const priorTurns = Array.isArray(body.prior_turns)
    ? (body.prior_turns as unknown[])
        .map((t) => {
          if (!t || typeof t !== 'object') return null;
          const o = t as Record<string, unknown>;
          const role =
            o.role === 'user' || o.role === 'assistant' ? (o.role as 'user' | 'assistant') : null;
          const text =
            typeof o.text === 'string'
              ? o.text
              : typeof o.content === 'string'
                ? o.content
                : null;
          if (!role || !text) return null;
          return { role, text };
        })
        .filter(
          (t): t is { role: 'user' | 'assistant'; text: string } => t !== null,
        )
        .slice(-MAX_PRIOR_TURNS)
    : [];

  // ── Resolve workspace_id (server-derived; body's workspace_id is ignored) ─
  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select('id, business_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (wsErr || !workspace?.id) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No workspace found for user' }),
    };
  }
  const workspaceId = workspace.id as string;
  const businessName =
    (workspace.business_name as string) || 'your business';

  // ── Gather sources (parallel, best-effort) ───────────────────────────
  const sources: Source[] = [];
  try {
    const [callsRes, callbacksRes] = await Promise.all([
      supa
        .from('retell_calls')
        .select('id, started_at, duration_seconds, outcome, summary')
        .eq('workspace_id', workspaceId)
        .order('started_at', { ascending: false })
        .limit(RECENT_CALLS_LIMIT),
      supa
        .from('callbacks')
        .select('id, customer_name, phone, status, priority, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(RECENT_LEADS_LIMIT),
    ]);

    for (const c of callsRes.data || []) {
      const dur = (c.duration_seconds as number) || 0;
      const outcome = (c.outcome as string) || 'unknown';
      const summary = (c.summary as string) || '';
      const startedDate = (c.started_at as string)?.slice(0, 10) || '';
      sources.push({
        type: 'call',
        id: c.id as string,
        url: `/v2/calls?call_id=${encodeURIComponent(c.id as string)}`,
        snippet:
          `[${outcome}, ${dur}s, ${startedDate}] ${summary.slice(0, 200)}`.trim(),
      });
    }

    for (const lead of callbacksRes.data || []) {
      const name = (lead.customer_name as string) || 'unknown';
      const phone = (lead.phone as string) || '';
      const status = (lead.status as string) || 'new';
      const priority = (lead.priority as string) || 'normal';
      const createdDate = (lead.created_at as string)?.slice(0, 10) || '';
      sources.push({
        type: 'lead',
        id: lead.id as string,
        url: `/v2/leads?lead_id=${encodeURIComponent(lead.id as string)}`,
        snippet: `[${status}, ${priority}] ${name} (${phone}) - ${createdDate}`,
      });
    }
  } catch (err) {
    console.warn(
      '[saas-v2-ask-ai] source gather failed (non-fatal):',
      (err as Error).message,
    );
  }

  const tier = pickTier(question, priorTurns.length);

  // ── Build prompt ─────────────────────────────────────────────────────
  const sourceBlock =
    sources.length === 0
      ? '(no data sources available yet — workspace is new or empty)'
      : sources
          .map((s, i) => `[^${i + 1}] (${s.type}:${s.id}) ${s.snippet}`)
          .join('\n');

  const systemPrompt = [
    `You are the AI strategist for ${businessName}. You are a calm, specific, evidence-driven consultant — never a generic chatbot.`,
    '',
    'You have visibility into the workspace through the SOURCES block below. Each source is numbered [^1], [^2], etc.',
    '',
    'STRICT operating rules:',
    '1. Every factual claim — every number, every pattern — MUST be followed by an inline [^N] citation referencing a source.',
    '2. If the answer is not in the sources, say so plainly. NEVER invent calls, numbers, dates, or outcomes.',
    '3. NEVER cite a [^N] index that is not in SOURCES.',
    '4. Speak as "your strategist". Use "we" and "our team". No "I am an AI", no "How can I help you today".',
    '5. Write a tight paragraph (1-4 sentences). Use a short list only if the question literally asks "list X" or "top N".',
    '6. End with one concrete, decision-changing next step the user can take — a one-tap suggestion, not a lecture.',
    '7. Keep it under 120 words unless the question needs real analysis.',
    '',
    'Return ONLY a JSON object with this exact shape (no markdown, no preamble):',
    '{ "answer": "<paragraph with [^N] markers>", "cited_indices": [<1-based ints actually referenced>], "confidence": <0..1> }',
    '',
    'Confidence calibration: 0.9+ = >=2 directly supporting sources. 0.6-0.8 = pattern-matched across sources. 0.3-0.5 = informed guess. <0.3 = data is thin (say so).',
  ].join('\n');

  const conversationContext =
    priorTurns.length > 0
      ? '\n\n# CONVERSATION SO FAR\n' +
        priorTurns
          .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
          .join('\n\n') +
        '\n'
      : '';

  const userPrompt = [
    '# SOURCES (you may ONLY cite these)',
    sourceBlock,
    conversationContext,
    '# CURRENT QUESTION',
    question,
    '',
    'Respond with the JSON object only.',
  ].join('\n\n');

  // ── Call the model ───────────────────────────────────────────────────
  let raw = '';
  try {
    raw = await chatCompletion(systemPrompt, userPrompt, {
      tier,
      maxTokens: ANSWER_MAX_TOKENS,
    });
  } catch (err) {
    console.error(
      '[saas-v2-ask-ai] LLM call failed:',
      (err as Error).message,
    );
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Strategist temporarily unavailable. Try again in a moment.',
      }),
    };
  }

  const parsed = tryParseJson<AskAnswer>(raw);
  let answer = '';
  let citedIndices: number[] = [];
  let confidence = 0.5;

  if (parsed && typeof parsed.answer === 'string') {
    answer = parsed.answer;
    citedIndices = Array.isArray(parsed.cited_indices)
      ? parsed.cited_indices.filter(
          (n): n is number =>
            typeof n === 'number' && n >= 1 && n <= sources.length,
        )
      : [];
    confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
  } else {
    // Graceful fallback if the model didn't return JSON — use raw text.
    answer =
      raw.trim() ||
      'I could not generate a clear answer. Try rephrasing your question.';
    confidence = 0.3;
  }

  // Trim sources to only those actually cited.
  const citedSet = new Set(citedIndices);
  const trimmedSources = sources
    .map((s, i) => ({ s, idx: i + 1 }))
    .filter(({ idx }) => citedSet.has(idx))
    .map(({ s }) => s);

  // ── Fire-and-forget telemetry (never blocks) ─────────────────────────
  void (async () => {
    try {
      await emitSaasV2Event({
        workspace_id: workspaceId,
        type: 'saas_v2_ask_ai_query',
        severity: 'info',
        payload: {
          workspace_id: workspaceId,
          question_chars: question.length,
          tier: tierToSchemaTier(tier),
          sources_cited: trimmedSources.length,
          confidence,
          conversation_id: conversationId,
        },
      });
    } catch (err) {
      console.warn(
        '[saas-v2-ask-ai] failed to emit saas_v2_ask_ai_query event:',
        (err as Error).message,
      );
    }
  })();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      answer,
      sources: trimmedSources,
      confidence,
      conversation_id: conversationId,
    }),
  };
};

export default withLegacyHandler(handler);
