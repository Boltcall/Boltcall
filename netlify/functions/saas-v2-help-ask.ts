/**
 * saas-v2-help-ask — V2 Help page AI Q&A endpoint.
 *
 * Pattern: hybrid RAG over (a) the user's workspace knowledge_base via pgvector
 * cosine similarity and (b) Boltcall public docs at boltcall.mintlify.app. The
 * docs corpus is small enough (~30-50 pages) that we don't yet maintain a
 * pgvector index for it — instead we use a static link map so the answer can
 * always cite at least one canonical doc URL even when the doc body isn't
 * locally indexed yet. Future: ingest Mintlify docs into a `boltcall_help_docs`
 * table with embeddings + nightly cron.
 *
 * Auth: Bearer JWT only. workspace_id is derived strictly from user_id; the
 * client never supplies it. This matches the saas-v2-toggle template.
 *
 * Body:    { question: string, context?: { current_page?: string, recent_action?: string } }
 * Returns: { answer, sources: [{title, url, snippet?}], suggested_followups? }
 *
 * Event:   emits `saas_v2_help_answer_rendered` (best-effort) with
 *          { workspace_id, question_preview, source_count, model?, latency_ms? }.
 *          Skips silently when the user has no agency_clients row.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion, generateEmbedding } from './_shared/azure-ai';
import { emitAgencyEvent } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
const DOCS_BASE = 'https://boltcall.mintlify.app';

interface AskBody {
  question: string;
  context?: {
    current_page?: string;
    recent_action?: string;
  };
}

interface HelpSource {
  title: string;
  url: string;
  snippet?: string;
}

interface KbChunk {
  id: string;
  title: string;
  content: string;
  category?: string;
  similarity?: number;
}

// ── Canonical Boltcall docs map ────────────────────────────────────────────
// Until we ingest the full Mintlify corpus into pgvector, this static map
// gives the LLM a stable set of doc URLs to cite by topic. Keys are lower-case
// keyword cues; values are { title, url, snippet }. The retrieval below picks
// the top 1-3 by how many of the question's tokens match the key cues.
interface DocEntry {
  cues: string[];
  source: HelpSource;
}

const DOCS_INDEX: DocEntry[] = [
  {
    cues: ['phone', 'number', 'twilio', 'sip', 'forward', 'forwarding', 'call routing'],
    source: {
      title: 'Add a phone number',
      url: `${DOCS_BASE}/phone-numbers/add-number`,
      snippet: 'Provision a Twilio or ACS number and route inbound calls to your AI agent.',
    },
  },
  {
    cues: ['voice', 'agent voice', 'voices', 'elevenlabs', 'tts', 'speech', 'accent'],
    source: {
      title: 'Change your agent voice',
      url: `${DOCS_BASE}/agents/voice`,
      snippet: 'Browse ElevenLabs voices and assign one to your agent.',
    },
  },
  {
    cues: ['call failing', 'calls failing', 'failed call', 'no answer', 'silence', 'dropped', 'troubleshoot'],
    source: {
      title: 'Troubleshooting failed calls',
      url: `${DOCS_BASE}/troubleshooting/failed-calls`,
      snippet: 'Common reasons calls fail and how to diagnose each one.',
    },
  },
  {
    cues: ['billing', 'invoice', 'plan', 'price', 'pricing', 'usage', 'subscription', 'stripe'],
    source: {
      title: 'How billing works',
      url: `${DOCS_BASE}/billing/overview`,
      snippet: 'Plan tiers, usage metering, and where to find your invoices.',
    },
  },
  {
    cues: ['export', 'csv', 'data', 'download', 'leads export', 'calls export'],
    source: {
      title: 'Export your data',
      url: `${DOCS_BASE}/data/export`,
      snippet: 'Download calls, leads, and messages as CSV.',
    },
  },
  {
    cues: ['invite', 'teammate', 'team', 'member', 'workspace member', 'seat', 'role'],
    source: {
      title: 'Invite a teammate',
      url: `${DOCS_BASE}/workspace/members`,
      snippet: 'Send invites and pick a role (admin, editor, viewer).',
    },
  },
  {
    cues: ['integration', 'integrations', 'crm', 'webhook', 'zapier', 'hubspot', 'salesforce'],
    source: {
      title: 'Integrations overview',
      url: `${DOCS_BASE}/integrations/overview`,
      snippet: 'Connect Boltcall to your CRM, calendar, or automation tool.',
    },
  },
  {
    cues: ['knowledge', 'kb', 'knowledge base', 'docs upload', 'faq', 'business info'],
    source: {
      title: 'Knowledge base',
      url: `${DOCS_BASE}/knowledge-base/overview`,
      snippet: 'Give your agent the answers customers will ask.',
    },
  },
  {
    cues: ['booking', 'calendar', 'calendly', 'cal.com', 'appointment', 'schedule'],
    source: {
      title: 'Booking + calendar',
      url: `${DOCS_BASE}/booking/calendar`,
      snippet: 'Connect Cal.com / Calendly so the agent can book in real time.',
    },
  },
  {
    cues: ['sms', 'text', 'message', 'messages', 'whatsapp', 'follow up', 'followup'],
    source: {
      title: 'SMS and messaging',
      url: `${DOCS_BASE}/messaging/overview`,
      snippet: 'Set up two-way SMS, WhatsApp, and follow-up sequences.',
    },
  },
];

const FALLBACK_DOC: HelpSource = {
  title: 'Boltcall documentation',
  url: DOCS_BASE,
  snippet: 'Full product documentation.',
};


function pickDocs(question: string): HelpSource[] {
  const q = question.toLowerCase();
  const scored = DOCS_INDEX.map((entry) => {
    let hits = 0;
    for (const cue of entry.cues) {
      if (q.includes(cue)) hits += cue.length > 6 ? 2 : 1;
    }
    return { hits, source: entry.source };
  })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) return [FALLBACK_DOC];
  return scored.slice(0, 3).map((s) => s.source);
}

function clamp(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  function badRequest(message: string) {

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function unauthorized(message: string) {

    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: message }) };

  }

  function serverError(message: string) {

    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: message }) };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const startedAt = Date.now();

  // ── 1. JWT extract → getUser ─────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return unauthorized('Invalid or expired token');
  const userId = userResult.user.id;

  // ── 2. Body parse ────────────────────────────────────────────────────────
  let parsed: AskBody;
  try {
    parsed = JSON.parse(event.body || '{}') as AskBody;
  } catch {
    return badRequest('Invalid JSON body');
  }
  const question = (parsed.question || '').trim();
  if (!question) return badRequest('Body must include a non-empty { question: string }');
  if (question.length > 2000) {
    return badRequest('Question is too long (max 2000 characters).');
  }
  const ctx = parsed.context || {};

  // ── 3. Resolve workspace_id (owner-only, server-derived) ────────────────
  const { data: wsRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, name, default_language, default_timezone')
    .eq('user_id', userId)
    .maybeSingle();
  if (wsErr) {
    console.warn(`[saas-v2-help-ask] workspace lookup failed user=${userId} err=${wsErr.message}`);
    return serverError('Failed to resolve workspace');
  }
  if (!wsRow) {
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({
        error:
          'No workspace owned by this user. Sign up creates one automatically — ' +
          'if this persists, contact support.',
      }),
    };
  }
  const workspaceId = wsRow.id as string;

  // ── 4. Pull candidate docs (static map) + workspace KB chunks (pgvector) ─
  // Docs map is deterministic and cheap; KB search is best-effort. Either may
  // return zero results — we hand both to the LLM and let it ground in what's
  // present.
  const docSources = pickDocs(question);

  const kbChunks: KbChunk[] = [];
  try {
    const embedding = await generateEmbedding(question);
    if (embedding) {
      const { data: matches, error: rpcErr } = await supa.rpc('search_kb', {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_count: 3,
        match_threshold: 0.6,
      });
      if (!rpcErr && Array.isArray(matches)) {
        for (const m of matches) {
          if (m && typeof m.content === 'string') {
            kbChunks.push({
              id: String(m.id || ''),
              title: String(m.title || 'Workspace note'),
              content: String(m.content || ''),
              category: m.category,
              similarity: typeof m.similarity === 'number' ? m.similarity : undefined,
            });
          }
        }
      }
    }
  } catch (kbErr) {
    // KB retrieval is best-effort; the static doc map keeps the answer grounded
    // even if pgvector RPC isn't deployed in this env.
    console.warn(
      `[saas-v2-help-ask] KB retrieval failed user=${userId} err=${
        kbErr instanceof Error ? kbErr.message : String(kbErr)
      }`,
    );
  }

  // ── 5. Compose the system + user prompt ─────────────────────────────────
  const docContext = docSources
    .map(
      (s, i) =>
        `[DOC ${i + 1}] ${s.title} — ${s.url}\n${s.snippet || ''}`.trim(),
    )
    .join('\n\n');

  const kbContext =
    kbChunks.length > 0
      ? kbChunks
          .map(
            (c, i) =>
              `[KB ${i + 1}] ${c.title}${c.category ? ` (${c.category})` : ''}\n${clamp(
                c.content,
                700,
              )}`,
          )
          .join('\n\n')
      : '(no workspace knowledge base matches)';

  const systemPrompt = [
    'You are the Boltcall help assistant inside the V2 dashboard.',
    'Boltcall is a speed-to-lead platform for local service businesses — every inbound lead gets responded to instantly and booked.',
    'Answer the user\'s question in 2-3 short paragraphs (4-8 sentences total).',
    'Ground your answer in the provided BOLTCALL DOCS and WORKSPACE KNOWLEDGE BASE. Do not invent features, prices, or settings.',
    'When you use a fact from BOLTCALL DOCS or WORKSPACE KB, mention the source naturally (e.g., "see the billing docs").',
    'If the question is outside scope (general programming, weather, etc.), say so briefly and suggest emailing support@boltcall.org.',
    'Never mention model names, tokens, retrieval mechanics, or "context provided to you".',
    'Address the user as "you" — they own the workspace.',
    'Write plain prose. No markdown headings, no bullet lists unless the answer is genuinely a list.',
  ].join(' ');

  const userPrompt = [
    `WORKSPACE: ${wsRow.name || 'My Workspace'} (lang=${wsRow.default_language || 'en'})`,
    ctx.current_page ? `CURRENT PAGE: ${ctx.current_page}` : null,
    ctx.recent_action ? `RECENT ACTION: ${ctx.recent_action}` : null,
    '',
    'BOLTCALL DOCS:',
    docContext,
    '',
    'WORKSPACE KNOWLEDGE BASE:',
    kbContext,
    '',
    'QUESTION:',
    question,
  ]
    .filter((line) => line !== null)
    .join('\n');

  // ── 6. Call the LLM ──────────────────────────────────────────────────────
  let answer = '';
  let usedModel: string | undefined;
  try {
    answer = await chatCompletion(systemPrompt, userPrompt, {
      tier: 'heavy',
      maxTokens: 800,
    });
    usedModel = process.env.AZURE_OPENAI_FOUNDRY_KEY
      ? 'foundry-heavy'
      : process.env.AZURE_OPENAI_API_KEY
        ? 'azure-legacy-heavy'
        : 'anthropic-sonnet';
  } catch (llmErr) {
    console.warn(
      `[saas-v2-help-ask] LLM failed user=${userId} err=${
        llmErr instanceof Error ? llmErr.message : String(llmErr)
      }`,
    );
    // Heuristic fallback so the user still sees a useful answer + sources
    // even when no AI provider is configured (preview / disaster mode).
    answer =
      "Here\'s what I can point you to from the Boltcall docs — open the linked source below for the full walkthrough. If you need a hand applying it to your workspace, email support@boltcall.org and a human will jump in.";
    usedModel = 'fallback-heuristic';
  }

  const finalAnswer = clamp(answer.trim(), 2400) || 'No answer available.';

  // Suggested followups: derive from the docs that were cited so the user has
  // one or two next-steps without us inventing topics. Cheap + deterministic.
  const suggestedFollowups: string[] = [];
  for (const s of docSources.slice(0, 2)) {
    if (s === FALLBACK_DOC) continue;
    suggestedFollowups.push(`Show me more about: ${s.title.toLowerCase()}`);
  }

  // ── 7. Best-effort event emit ────────────────────────────────────────────
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
        agent_name: 'saas-v2-help-ask',
        type: 'saas_v2_help_answer_rendered',
        severity: 'info',
        payload: {
          workspace_id: workspaceId,
          query_chars: question.length,
          sources_cited: docSources.length + kbChunks.length,
          source_kinds: [
            ...(docSources.length > 0 ? ['docs'] : []),
            ...(kbChunks.length > 0 ? ['workspace_kb'] : []),
          ],
          model: usedModel,
          latency_ms: Date.now() - startedAt,
        },
        why_explanation: 'User asked the V2 help assistant a question; answer rendered with citations.',
      });
    } else {
      console.log(
        `[saas-v2-help-ask] user=${userId} workspace=${workspaceId} answered ` +
          `(self-serve, no agency_clients row — event emit skipped)`,
      );
    }
  } catch (emitErr) {
    console.warn(
      `[saas-v2-help-ask] event emit failed user=${userId} err=${
        emitErr instanceof Error ? emitErr.message : String(emitErr)
      }`,
    );
  }

  // ── 8. Assemble response ────────────────────────────────────────────────
  // Combine doc sources (always cited) with up to 1 KB chunk converted to a
  // source. Cap at 3 total per the brief.
  const sources: HelpSource[] = [...docSources];
  if (kbChunks.length > 0 && sources.length < 3) {
    const c = kbChunks[0];
    sources.push({
      title: c.title,
      url: `/v2/knowledge#${c.id}`,
      snippet: clamp(c.content.replace(/\s+/g, ' '), 160),
    });
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      answer: finalAnswer,
      sources: sources.slice(0, 3),
      suggested_followups: suggestedFollowups,
    }),
  };
};
