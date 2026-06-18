import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-ask-ai.ts — Boltcall Agency OS · Client Portal · Phase E
 * ──────────────────────────────────────────────────────────────────────
 *
 * POST endpoint for "Ask Boltcall AI" — the strategist surface on the
 * client portal. NOT a generic chatbot wrapper. Has full visibility into
 * the client's account: KB, last 30d of events, last 10 call transcripts.
 *
 * Auth model:
 *   - Caller MUST be a real Supabase user (JWT). API keys rejected (this
 *     is a UI surface; a bot asking strategy questions is an abuse vector).
 *   - JWT auth.uid() resolves to a single agency_clients row (defense-in-
 *     depth on top of RLS).
 *
 * Request body:
 *   {
 *     question: string,                     // required, 1..1000 chars
 *     conversation_id?: string,              // optional, uuid, scopes history
 *     prior_turns?: [                        // optional, last N turns from
 *       { role: 'user'|'assistant', content: string }   // the page's session
 *     ]                                      // (we don't persist conversations
 *                                            //  server-side in this phase —
 *                                            //  the page passes them back)
 *   }
 *
 * Response:
 *   {
 *     answer: string,                        // paragraph, not bubbles
 *     sources: [
 *       { type: 'transcript'|'event'|'kb',
 *         id: string,
 *         url: string|null,                  // deep link to artifact, may be null for events
 *         snippet: string },                 // 1-2 sentence excerpt
 *     ],
 *     confidence: number,                    // 0..1
 *     conversation_id: string,               // echo or generate
 *     cost_usd: number,                      // logged via cost_incurred
 *   }
 *
 * Routing:
 *   - Difficulty classifier (Haiku) inspects the question.
 *   - Simple lookups ("what is my agent's voice?") → Sonnet.
 *   - Strategic / multi-hop ("why did my CPL go up Wed?") → Opus.
 *
 * Receipts principle: every claim in `answer` must reference a source
 * by inline marker [^1], [^2], etc. that maps to `sources[i]`. The
 * frontend renders these as superscript citations. If the strategist
 * doesn't have the data, the prompt forces it to say so rather than
 * hallucinate. See system prompt below.
 */

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';

import { getServiceSupabase } from './_shared/token-utils';
import { callClaude } from './_shared/agency-agents/run-agent';
import { retrieve } from './_shared/agency-knowledge/retrieve';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import {
  classifyDifficulty,
  routeModel,
  type ModelTier,
} from './_shared/agency-agents/router-classifier';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_QUESTION_CHARS = 1000;
const MAX_PRIOR_TURNS = 10;
const EVENT_WINDOW_DAYS = 30;
const TRANSCRIPT_LIMIT = 10;
const KB_K = 8;

type Source = {
  type: 'transcript' | 'event' | 'kb';
  id: string;
  url: string | null;
  snippet: string;
};

// ─── Handler ────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized — missing bearer token' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
  const uid = userResult.user.id;

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: {
    question?: unknown;
    conversation_id?: unknown;
    prior_turns?: unknown;
    client_id?: unknown;
  };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad request — invalid JSON' }),
    };
  }

  const question =
    typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad request — question is required' }),
    };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `Bad request — question too long (max ${MAX_QUESTION_CHARS} chars)`,
      }),
    };
  }

  const conversation_id =
    typeof body.conversation_id === 'string' && UUID_RE.test(body.conversation_id)
      ? body.conversation_id
      : randomUUID();

  const explicitClientId =
    typeof body.client_id === 'string' && UUID_RE.test(body.client_id)
      ? body.client_id
      : null;

  const priorTurns = Array.isArray(body.prior_turns)
    ? (body.prior_turns as Array<unknown>)
        .filter((t): t is { role: string; content: string } => {
          if (!t || typeof t !== 'object') return false;
          const turn = t as Record<string, unknown>;
          return (
            (turn.role === 'user' || turn.role === 'assistant') &&
            typeof turn.content === 'string' &&
            turn.content.length > 0
          );
        })
        .slice(-MAX_PRIOR_TURNS)
    : [];

  // ── 3. Resolve client_id (defense-in-depth on RLS) ───────────────────
  let client_id: string;
  let client_vertical = 'other';
  let business_name = 'your business';
  {
    let query = supa
      .from('agency_clients')
      .select('id,user_id,vertical,status,business_name')
      .eq('user_id', uid)
      .not('status', 'in', '(churned,paused)');
    if (explicitClientId) query = query.eq('id', explicitClientId);
    const { data: clientRow, error: clientErr } = await query
      .order('signed_up_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientErr) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Failed to resolve client',
          detail: clientErr.message,
        }),
      };
    }
    if (!clientRow) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'No active agency client found for this account',
          code: 'no_client',
        }),
      };
    }
    client_id = clientRow.id as string;
    client_vertical = (clientRow.vertical as string) || 'other';
    business_name = (clientRow.business_name as string) || 'your business';
  }

  // ── 4. Route model tier ──────────────────────────────────────────────
  //
  // The strategist is the model that earns its keep on hard questions.
  // Default to sonnet; bump to opus on hard, drop to haiku on trivial.
  let tier: ModelTier = 'sonnet';
  try {
    const cls = await classifyDifficulty({
      agent_name: 'client-portal.ask-ai',
      summary: `client question (vertical=${client_vertical}): ${question.slice(0, 240)}`,
      payload_size_chars: question.length,
    });
    tier = routeModel({
      agent_name: 'client-portal.ask-ai',
      agent_default_tier: 'sonnet',
      difficulty: cls.difficulty,
    });
  } catch (err) {
    console.warn(
      '[agency-client-ask-ai] router-classifier failed, defaulting to sonnet:',
      (err as Error).message,
    );
  }

  // ── 5. Gather context — KB RAG, recent events, recent transcripts ────
  const eventWindowIso = new Date(
    Date.now() - EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [kbResult, eventsRes, transcriptsRes] = await Promise.all([
    retrieve({
      client_id,
      query_text: question,
      k: KB_K,
    }).catch((err) => {
      console.warn(
        '[agency-client-ask-ai] kb retrieve failed (non-fatal):',
        (err as Error).message,
      );
      return { chunks: [], cost_usd: 0 };
    }),
    supa
      .from('agency_events')
      .select('id,type,severity,payload,why_explanation,created_at')
      .eq('client_id', client_id)
      .gte('created_at', eventWindowIso)
      .order('created_at', { ascending: false })
      .limit(200),
    supa
      .from('agency_events')
      .select('id,payload,created_at')
      .eq('client_id', client_id)
      .eq('type', 'call_completed')
      .order('created_at', { ascending: false })
      .limit(TRANSCRIPT_LIMIT),
  ]);

  // Build the source list — every chunk gets a stable [^N] index the
  // strategist will cite. The model is instructed to ONLY cite sources
  // from this list.
  const sources: Source[] = [];

  // KB chunks
  for (const chunk of kbResult.chunks) {
    sources.push({
      type: 'kb',
      id: chunk.id,
      url: null, // KB chunks aren't user-navigable today
      snippet: extractKbSnippet(chunk.content),
    });
  }

  // Last 10 call transcripts
  for (const t of transcriptsRes.data || []) {
    const p = (t.payload ?? {}) as Record<string, unknown>;
    const call_id = (p['call_id'] as string) || (t.id as string);
    const excerpt = (p['transcript_excerpt'] as string) || '';
    const outcome = (p['outcome'] as string) || 'unknown';
    sources.push({
      type: 'transcript',
      id: call_id,
      url: `/dashboard/calls?call_id=${encodeURIComponent(call_id)}`,
      snippet: `[${outcome}] ${excerpt.slice(0, 240)}`.trim(),
    });
  }

  // Recent events that have a why_explanation — those are the human-
  // readable signal the strategist can cite. Cap at 20 to keep prompt
  // size sane.
  const eventRows = (eventsRes.data || [])
    .filter((e) => typeof e.why_explanation === 'string' && e.why_explanation.length > 0)
    .slice(0, 20);
  for (const e of eventRows) {
    sources.push({
      type: 'event',
      id: e.id as string,
      url: null,
      snippet: `[${e.type}] ${e.why_explanation as string}`.slice(0, 280),
    });
  }

  // ── 6. Build the strategist call ─────────────────────────────────────
  // System prompt is the load-bearing piece — it's what makes this feel
  // like a senior consultant, not a generic LLM wrapper. The KILLER UX
  // bar requires:
  //   - Cite every claim by [^N] marker.
  //   - Refuse to invent data — say "I don't have visibility into that"
  //     if the answer isn't in the sources.
  //   - Speak like a 20-person team. Use "our team", "your strategist",
  //     never "Noam", never "I am an AI".
  //   - No chatbot boilerplate. No "How can I help you today".
  //   - Narrative paragraph, not bullet list (unless the question is
  //     "list X" — then a short list is fine).
  //   - Numbers must be grounded in a cited event/transcript.

  const sourceBlock = sources
    .map(
      (s, i) =>
        `[^${i + 1}] (${s.type}:${s.id}) ${s.snippet}`,
    )
    .join('\n');

  const systemPrompt = [
    `You are the account strategist for ${business_name}, an agency client of Boltcall. You are a senior consultant — calm, specific, evidence-driven.`,
    '',
    'You have FULL VISIBILITY into the client\'s account through the SOURCES block below. Each source is numbered [^1], [^2], etc.',
    '',
    'STRICT operating rules:',
    '1. Every factual claim — every number, every pattern, every "I noticed" — MUST be followed by an inline citation in the form [^N] referencing a source. Multiple citations OK: [^1][^3].',
    '2. If the answer isn\'t in the sources, say so plainly: "I don\'t have visibility into that — but here\'s what I can tell from what I do see..." or recommend the client check the underlying system.',
    '3. NEVER invent calls, numbers, dates, or outcomes. NEVER cite a source number that isn\'t in the SOURCES block.',
    '4. Sound like a 20-person team. Use "we" and "our team". Refer to yourself as "your strategist". Never use "I am an AI", never name the founder.',
    '5. No chatbot boilerplate. No "How can I help you today". No "Great question!". Get to the answer.',
    '6. Write a paragraph (1-4 sentences usually). Use a short list only if the question explicitly asks "list X" or "what are the top N".',
    '7. End with one specific, decision-changing next step the client should take — phrased as a question or a one-tap suggestion, not a lecture.',
    '8. Keep the tone of a senior consultant who is happy to be brief. <120 words unless the question requires real analysis.',
    '',
    'Confidence calibration:',
    '- 0.9+: answer is directly supported by ≥2 specific sources.',
    '- 0.6-0.8: answer is supported but you had to pattern-match across sources.',
    '- 0.3-0.5: answer is informed guess; data is thin.',
    '- <0.3: you don\'t really have the data — say so in the answer.',
  ].join('\n');

  const userMessage = [
    '# SOURCES (you may ONLY cite these)',
    sourceBlock || '(no sources available)',
    '',
    '# CLIENT QUESTION',
    question,
    '',
    'Respond by calling emit_structured_output with: answer (string), cited_indices (array of 1-based integers you referenced), confidence (0..1).',
  ].join('\n\n');

  const conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  // Replay prior turns so multi-turn flows hold context.
  for (const t of priorTurns) {
    conversation.push({
      role: t.role as 'user' | 'assistant',
      content: t.content,
    });
  }
  conversation.push({ role: 'user', content: userMessage });

  // ── 7. Call Claude ───────────────────────────────────────────────────
  let answer = '';
  let cited_indices: number[] = [];
  let confidence = 0;
  let cost_usd = 0;
  try {
    const result = await callClaude<{
      answer: string;
      cited_indices: number[];
      confidence: number;
    }>({
      agent_name: 'client-portal.ask-ai',
      client_id,
      tier,
      system: systemPrompt,
      user_messages: conversation,
      output_schema: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
            description: 'The strategist\'s answer — paragraph form with [^N] citations.',
          },
          cited_indices: {
            type: 'array',
            items: { type: 'integer', minimum: 1 },
            description: '1-based indices of sources actually cited in the answer.',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },
        required: ['answer', 'cited_indices', 'confidence'],
        additionalProperties: false,
      },
      max_tokens: 1500,
    });
    answer = result.output.answer;
    cited_indices = Array.isArray(result.output.cited_indices)
      ? result.output.cited_indices
      : [];
    confidence =
      typeof result.output.confidence === 'number'
        ? Math.max(0, Math.min(1, result.output.confidence))
        : 0.5;
    cost_usd = result.cost_usd;
  } catch (err) {
    console.error(
      '[agency-client-ask-ai] strategist call failed:',
      (err as Error).message,
    );
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Strategist temporarily unavailable. Try again in a moment.',
      }),
    };
  }

  // Trim sources to only the ones actually cited — keeps the response
  // payload tight and matches what the frontend renders.
  const citedSet = new Set(cited_indices);
  const trimmedSources = sources
    .map((s, i) => ({ s, idx: i + 1 }))
    .filter(({ idx }) => citedSet.has(idx))
    .map(({ s }) => s);

  // ── 8. Log the query as a cost_incurred event (op='strategist_query') ─
  //
  // We checked emit-agency-event.ts: the kernel union does NOT yet have a
  // dedicated `client_strategist_query` type. cost_incurred is the right
  // bucket — the strategist call IS the cost — and it accepts `op` which
  // is the discriminator downstream consumers (loops, dashboards) need.
  // Fire-and-forget; never block the response on telemetry.
  void (async () => {
    try {
      await emitAgencyEvent({
        client_id,
        agent_name: 'client-portal.ask-ai',
        type: 'cost_incurred',
        severity: 'info',
        payload: {
          category: 'strategist_query',
          provider: 'anthropic',
          amount_usd: cost_usd,
          model: tier,
          op: 'strategist_query',
          source: 'client_portal_ask_ai',
        },
        why_explanation: `Client asked the strategist a question (${question.length} chars, tier=${tier}, ${trimmedSources.length} sources cited).`,
      });
    } catch (err) {
      console.warn(
        '[agency-client-ask-ai] failed to emit strategist_query event:',
        (err as Error).message,
      );
    }
  })();

  // ── 9. Return ────────────────────────────────────────────────────────
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      answer,
      sources: trimmedSources,
      confidence,
      conversation_id,
      cost_usd,
    }),
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractKbSnippet(content: unknown): string {
  if (typeof content === 'string') return content.slice(0, 240);
  if (!content || typeof content !== 'object') return '';
  const c = content as Record<string, unknown>;
  // KB chunks store various shapes — try the most common keys first.
  const candidates = [
    'text',
    'content',
    'answer',
    'q',
    'question',
    'description',
    'summary',
    'name',
  ];
  for (const key of candidates) {
    const v = c[key];
    if (typeof v === 'string' && v.length > 0) {
      return v.slice(0, 240);
    }
  }
  try {
    return JSON.stringify(c).slice(0, 240);
  } catch {
    return '';
  }
}

export default withLegacyHandler(handler);
