import { withLegacyHandler } from './_shared/runtime-compat';
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
import { notifyInfo } from './_shared/notify';
import { redactSecrets } from './_shared/redact-secrets';
import { findWorkspaceForUser } from './_shared/setup-workspace';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
const DOCS_BASE = 'https://boltcall.mintlify.app';
const DEFAULT_HELP_LLM_TIMEOUT_MS = 9000;

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
      title: 'Phone numbers',
      url: `${DOCS_BASE}/dashboard/phone-numbers`,
      snippet: 'Manage connected numbers and route inbound calls to your AI agent.',
    },
  },
  {
    cues: ['agent', 'agents', 'voice', 'agent voice', 'voices', 'elevenlabs', 'tts', 'speech', 'accent'],
    source: {
      title: 'Agents',
      url: `${DOCS_BASE}/dashboard/agents`,
      snippet: 'Configure your AI agent, voice, routing, and lead-response behavior.',
    },
  },
  {
    cues: ['call failing', 'calls failing', 'failed call', 'no answer', 'silence', 'dropped', 'troubleshoot'],
    source: {
      title: 'Phone numbers',
      url: `${DOCS_BASE}/dashboard/phone-numbers`,
      snippet: 'Check number status, routing, and agent assignment when calls are not connecting.',
    },
  },
  {
    cues: ['billing', 'invoice', 'plan', 'price', 'pricing', 'usage', 'subscription', 'paypal', 'payment'],
    source: {
      title: 'Plans and billing',
      url: `${DOCS_BASE}/account/plans`,
      snippet: 'Review plan tiers, billing details, and account plan settings.',
    },
  },
  {
    cues: ['export', 'csv', 'data', 'download', 'leads export', 'calls export'],
    source: {
      title: 'Dashboard overview',
      url: `${DOCS_BASE}/dashboard/overview`,
      snippet: 'Download calls, leads, and messages as CSV.',
    },
  },
  {
    cues: ['invite', 'teammate', 'team', 'member', 'workspace member', 'seat', 'role'],
    source: {
      title: 'Team members',
      url: `${DOCS_BASE}/account/team-members`,
      snippet: 'Send invites and pick a role (admin, editor, viewer).',
    },
  },
  {
    cues: ['integration', 'integrations', 'zapier'],
    source: {
      title: 'Integrations overview',
      url: `${DOCS_BASE}/integrations/overview`,
      snippet: 'Connect Boltcall to your CRM, calendar, or automation tool.',
    },
  },
  {
    cues: ['crm', 'hubspot', 'salesforce', 'pipedrive', 'lead sync', 'sync lead'],
    source: {
      title: 'CRM integrations',
      url: `${DOCS_BASE}/integrations/crm`,
      snippet: 'Send new Boltcall leads and updates into your CRM.',
    },
  },
  {
    cues: ['webhook', 'webhooks', 'google ads', 'google lead', 'lead form', 'lead forms', 'facebook lead', 'meta lead'],
    source: {
      title: 'Webhooks',
      url: `${DOCS_BASE}/integrations/webhooks`,
      snippet: 'Forward external lead sources into Boltcall for instant response.',
    },
  },
  {
    cues: ['knowledge', 'kb', 'knowledge base', 'docs upload', 'faq', 'business info'],
    source: {
      title: 'Knowledge base',
      url: `${DOCS_BASE}/dashboard/knowledge-base`,
      snippet: 'Give your agent the answers customers will ask.',
    },
  },
  {
    cues: ['booking', 'calendar', 'calendly', 'cal.com', 'appointment', 'schedule'],
    source: {
      title: 'Calendar integrations',
      url: `${DOCS_BASE}/integrations/calendar`,
      snippet: 'Connect Cal.com / Calendly so the agent can book in real time.',
    },
  },
  {
    cues: ['sms', 'text', 'message', 'messages', 'whatsapp', 'follow up', 'followup'],
    source: {
      title: 'SMS and messaging',
      url: `${DOCS_BASE}/features/sms-booking`,
      snippet: 'Set up two-way SMS, WhatsApp, and follow-up sequences.',
    },
  },
  {
    cues: ['setup', 'onboarding', 'quickstart', 'start', 'go live', 'launch'],
    source: {
      title: 'Onboarding',
      url: `${DOCS_BASE}/onboarding`,
      snippet: 'Complete the setup steps required to launch your speed-to-lead system.',
    },
  },
  {
    cues: ['instant reply', 'instant response', 'speed to lead', 'lead response', 'lead replies', 'new lead'],
    source: {
      title: 'Instant lead reply',
      url: `${DOCS_BASE}/features/instant-lead-reply`,
      snippet: 'Respond to inbound leads immediately so the first business to reply wins.',
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
  const unique: HelpSource[] = [];
  const seenUrls = new Set<string>();
  for (const { source } of scored) {
    if (seenUrls.has(source.url)) continue;
    seenUrls.add(source.url);
    unique.push(source);
    if (unique.length >= 3) break;
  }
  return unique;
}

function clamp(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function helpLlmTimeoutMs(): number {
  const raw = Number(process.env.SAAS_V2_HELP_LLM_TIMEOUT_MS || DEFAULT_HELP_LLM_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_HELP_LLM_TIMEOUT_MS;
  return Math.min(raw, 20000);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function fallbackHelpAnswer(): string {
  return (
    "Here's what I can point you to from the Boltcall docs. " +
    'Check the linked source below first, then ask for support if you want a human to review your workspace context. ' +
    'If this is urgent, the support ticket includes your diagnostics so the team can investigate without asking you to repeat setup details.'
  );
}

function asksForHumanSupport(question: string): boolean {
  const q = question.toLowerCase();
  const humanIntent =
    /\b(human|person|support|agent|team|someone|call me|contact me|ticket|escalate)\b/.test(q);
  const urgentIntent =
    /\b(urgent|emergency|asap|now|critical|broken|down|not working|failing|failed|stuck|can't|cannot)\b/.test(q);
  const moneyOrGoLive =
    /\b(charged|billing|refund|payment|invoice|go live|customer live|production|lead stopped|calls stopped)\b/.test(q);
  const leadResponseSurface =
    /\b(call|calls|lead|leads|sms|text|whatsapp|phone)\b/.test(q);

  return humanIntent || (urgentIntent && moneyOrGoLive) || (urgentIntent && leadResponseSurface);
}

function notifyText(text: string, max = 320): string {
  return clamp(text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(), max);
}

function buildSupportEscalationMessage(args: {
  workspaceName: string;
  workspaceId: string;
  userId: string;
  userEmail?: string;
  question: string;
  currentPage?: string;
  ticketId?: string;
}): string {
  return [
    'Support escalation',
    args.ticketId ? `Ticket: ${args.ticketId}` : null,
    `Workspace: ${notifyText(args.workspaceName, 120)} (${args.workspaceId})`,
    `User: ${args.userEmail || args.userId}`,
    args.currentPage ? `Page: ${notifyText(args.currentPage, 160)}` : null,
    `Question: ${notifyText(args.question)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function supportPriority(question: string): 'normal' | 'high' | 'urgent' {
  const q = question.toLowerCase();
  if (/\b(urgent|emergency|critical|asap|production|customer live|calls stopped|lead stopped)\b/.test(q)) {
    return 'urgent';
  }
  if (/\b(broken|down|not working|failing|failed|stuck|can't|cannot|billing|refund|charged)\b/.test(q)) {
    return 'high';
  }
  return 'normal';
}

function redactedText(text: string): { text: string; hits: string[] } {
  const { redacted, hits } = redactSecrets(text || '');
  return { text: redacted, hits };
}

async function createSupportTicket(args: {
  supa: any;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userEmail?: string;
  question: string;
  answer: string;
  diagnosticsContext: string;
  currentPage?: string;
  recentAction?: string;
  sourceCount: number;
}): Promise<string | undefined> {
  const question = redactedText(args.question);
  const answer = redactedText(clamp(args.answer, 1200));
  const diagnostics = redactedText(clamp(args.diagnosticsContext, 6000));
  const currentPage = redactedText(args.currentPage || '');
  const recentAction = redactedText(args.recentAction || '');
  const redactionHits = Array.from(
    new Set([
      ...question.hits,
      ...answer.hits,
      ...diagnostics.hits,
      ...currentPage.hits,
      ...recentAction.hits,
    ]),
  );

  const { data, error } = await args.supa
    .from('saas_v2_support_tickets')
    .insert({
      workspace_id: args.workspaceId,
      workspace_name: args.workspaceName,
      user_id: args.userId,
      user_email: args.userEmail || null,
      status: 'open',
      priority: supportPriority(args.question),
      source: 'v2_help',
      current_page: currentPage.text || null,
      recent_action: recentAction.text || null,
      question: question.text,
      answer_preview: answer.text,
      diagnostics_snapshot: diagnostics.text,
      metadata: {
        source_count: args.sourceCount,
        redaction_hits: redactionHits,
      },
    })
    .select('id')
    .single();

  if (error) {
    console.warn(
      `[saas-v2-help-ask] support ticket insert failed user=${args.userId} workspace=${args.workspaceId} err=${error.message}`,
    );
    return undefined;
  }
  return data?.id ? String(data.id) : undefined;
}

function rowValue(row: Record<string, any> | null | undefined, keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function settledData<T>(result: PromiseSettledResult<any>, fallback: T): T {
  if (result.status !== 'fulfilled') return fallback;
  if (result.value?.error) return fallback;
  return (result.value?.data ?? fallback) as T;
}

function fmtDate(value: unknown): string {
  if (!value) return 'unknown time';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function loadWorkspaceDiagnostics(supa: any, userId: string, workspaceId: string): Promise<string> {
  try {
    const [
      profileResult,
      agentsResult,
      phoneNumbersResult,
      leadsResult,
      messagesResult,
      facebookResult,
    ] = await Promise.allSettled([
      supa
        .from('business_profiles')
        .select('business_name, main_category, website_url, owner_name')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supa
        .from('agents')
        .select('id, name, status, agent_type, retell_agent_id, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supa
        .from('phone_numbers')
        .select('phone_number, status, phone_type, assigned_agent_id, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supa
        .from('leads')
        .select('id, source, status, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supa
        .from('scheduled_messages')
        .select('channel, type, status, scheduled_for, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supa
        .from('facebook_page_connections')
        .select('page_id, page_name, created_at')
        .eq('workspace_id', workspaceId)
        .limit(3),
    ]);

    const profile = settledData<Record<string, any> | null>(profileResult, null);
    const agents = settledData<Record<string, any>[]>(agentsResult, []);
    const phoneNumbers = settledData<Record<string, any>[]>(phoneNumbersResult, []);
    const leads = settledData<Record<string, any>[]>(leadsResult, []);
    const messages = settledData<Record<string, any>[]>(messagesResult, []);
    const facebookPages = settledData<Record<string, any>[]>(facebookResult, []);

    const lines: string[] = [];
    if (profile) {
      lines.push(
        `Business: ${rowValue(profile, ['business_name']) || 'unknown'} | ` +
          `industry=${rowValue(profile, ['main_category']) || 'unknown'} | ` +
          `owner=${rowValue(profile, ['owner_name']) || 'unknown'} | ` +
          `website=${rowValue(profile, ['website_url']) || 'unknown'}`,
      );
    } else {
      lines.push('Business: no business profile found');
    }

    lines.push(`Agents: ${agents.length}`);
    for (const agent of agents.slice(0, 5)) {
      lines.push(
        `- ${rowValue(agent, ['name']) || agent.id || 'agent'} | ` +
          `type=${rowValue(agent, ['agent_type']) || 'unknown'} | ` +
          `status=${rowValue(agent, ['status']) || 'unknown'} | ` +
          `retell=${rowValue(agent, ['retell_agent_id']) ? 'configured' : 'missing'} | ` +
          `updated=${fmtDate(agent.updated_at)}`,
      );
    }

    lines.push(`Phone numbers: ${phoneNumbers.length}`);
    for (const phone of phoneNumbers.slice(0, 5)) {
      lines.push(
        `- ${rowValue(phone, ['phone_number']) || 'unknown'} | ` +
          `status=${rowValue(phone, ['status']) || 'unknown'} | ` +
          `type=${rowValue(phone, ['phone_type']) || 'unknown'} | ` +
          `assigned_agent=${rowValue(phone, ['assigned_agent_id']) || 'none'}`,
      );
    }

    lines.push(`Recent leads: ${leads.length}`);
    for (const lead of leads.slice(0, 5)) {
      lines.push(
        `- source=${rowValue(lead, ['source']) || 'unknown'} | ` +
          `status=${rowValue(lead, ['status']) || 'unknown'} | ` +
          `created=${fmtDate(lead.created_at)}`,
      );
    }

    lines.push(`Scheduled messages: ${messages.length}`);
    for (const msg of messages.slice(0, 5)) {
      lines.push(
        `- channel=${rowValue(msg, ['channel']) || 'unknown'} | ` +
          `type=${rowValue(msg, ['type']) || 'unknown'} | ` +
          `status=${rowValue(msg, ['status']) || 'unknown'} | ` +
          `scheduled=${fmtDate(msg.scheduled_for || msg.created_at)}`,
      );
    }

    lines.push(`Facebook pages connected: ${facebookPages.length}`);
    for (const page of facebookPages.slice(0, 3)) {
      lines.push(`- ${rowValue(page, ['page_name']) || rowValue(page, ['page_id']) || 'connected page'}`);
    }

    return lines.join('\n');
  } catch (err) {
    console.warn(
      `[saas-v2-help-ask] diagnostics failed user=${userId} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return 'Diagnostics unavailable.';
  }
}

const handler: Handler = async (event) => {
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
  const userEmail = userResult.user.email;

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
  let wsRow: { id: string; name?: string | null } | null;
  try {
    wsRow = await findWorkspaceForUser(userId, 'id, name');
  } catch (error: any) {
    console.warn(`[saas-v2-help-ask] workspace lookup failed user=${userId} err=${error?.message || error}`);
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
  const workspaceLanguage =
    typeof (wsRow as Record<string, unknown>).default_language === 'string'
      ? String((wsRow as Record<string, unknown>).default_language)
      : 'en';

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

  const diagnosticsContext = await loadWorkspaceDiagnostics(supa, userId, workspaceId);

  const systemPrompt = [
    'You are the Boltcall help assistant inside the V2 dashboard.',
    'Boltcall is a speed-to-lead platform for local service businesses — every inbound lead gets responded to instantly and booked.',
    'Answer the user\'s question in 2-3 short paragraphs (4-8 sentences total).',
    'Ground your answer in the provided BOLTCALL DOCS, WORKSPACE KNOWLEDGE BASE, and WORKSPACE DIAGNOSTICS. Do not invent features, prices, or settings.',
    'Use WORKSPACE DIAGNOSTICS for practical troubleshooting: agent status, phone numbers, recent leads, scheduled messages, and connected pages.',
    'When you use a fact from BOLTCALL DOCS or WORKSPACE KB, mention the source naturally (e.g., "see the billing docs").',
    'Never refer to source labels like DOC 1, DOC 2, KB 1, or KB 2. Use the source title instead.',
    'If the question is outside scope (general programming, weather, etc.), say so briefly and suggest emailing support@boltcall.org.',
    'Never mention model names, tokens, retrieval mechanics, or "context provided to you".',
    'Address the user as "you" — they own the workspace.',
    'Write plain prose. No markdown headings, no bullet lists unless the answer is genuinely a list.',
  ].join(' ');

  const userPrompt = [
    `WORKSPACE: ${wsRow.name || 'My Workspace'} (lang=${workspaceLanguage})`,
    ctx.current_page ? `CURRENT PAGE: ${ctx.current_page}` : null,
    ctx.recent_action ? `RECENT ACTION: ${ctx.recent_action}` : null,
    '',
    'BOLTCALL DOCS:',
    docContext,
    '',
    'WORKSPACE KNOWLEDGE BASE:',
    kbContext,
    '',
    'WORKSPACE DIAGNOSTICS:',
    diagnosticsContext,
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
    answer = await withTimeout(
      chatCompletion(systemPrompt, userPrompt, {
        tier: 'light',
        maxTokens: 650,
      }),
      helpLlmTimeoutMs(),
      'V2 help assistant LLM',
    );
    usedModel = process.env.AZURE_OPENAI_FOUNDRY_KEY
      ? 'foundry-light'
      : process.env.AZURE_OPENAI_API_KEY
        ? 'azure-legacy-light'
        : process.env.OPENAI_API_KEY
          ? 'openai-light'
          : 'anthropic-sonnet';
  } catch (llmErr) {
    console.warn(
      `[saas-v2-help-ask] LLM failed user=${userId} err=${
        llmErr instanceof Error ? llmErr.message : String(llmErr)
      }`,
    );
    // Heuristic fallback so the user still sees a useful answer + sources
    // even when no AI provider is configured (preview / disaster mode).
    answer = fallbackHelpAnswer();
    usedModel = 'fallback-heuristic';
  }

  const finalAnswer = clamp(answer.trim(), 2400) || 'No answer available.';
  const needsSupport = asksForHumanSupport(question);
  const ticketId = needsSupport
    ? await createSupportTicket({
        supa,
        workspaceId,
        workspaceName: String(wsRow.name || 'Workspace'),
        userId,
        userEmail,
        question,
        answer: finalAnswer,
        diagnosticsContext,
        currentPage: ctx.current_page,
        recentAction: ctx.recent_action,
        sourceCount: docSources.length + kbChunks.length,
      })
    : undefined;
  const support = needsSupport
    ? {
        escalated: true,
        channel: 'internal_support',
        ticket_id: ticketId,
        message:
          ticketId
            ? `I flagged this for Boltcall support. Ticket ${ticketId} includes your workspace context and question.`
            : 'I flagged this for Boltcall support. A human can use your workspace context and question to follow up.',
      }
    : {
        escalated: false,
        channel: 'self_serve',
        message:
          'No human escalation was created. Ask for support, a human, or urgent help if you want us to jump in.',
      };

  if (needsSupport) {
    try {
      await notifyInfo(
        buildSupportEscalationMessage({
          workspaceName: String(wsRow.name || 'Workspace'),
          workspaceId,
          userId,
          userEmail,
          question,
          currentPage: ctx.current_page,
          ticketId,
        }),
      );
    } catch (supportNotifyErr) {
      console.warn(
        `[saas-v2-help-ask] support notification failed user=${userId} err=${
          supportNotifyErr instanceof Error ? supportNotifyErr.message : String(supportNotifyErr)
        }`,
      );
    }
  }

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
      support,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
