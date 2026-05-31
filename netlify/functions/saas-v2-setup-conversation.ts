/**
 * V2 conversational setup wizard — turn endpoint.
 *
 * POST { conversation_id?, user_message } → { conversation_id, assistant_message,
 *   tool_results: [...], extracted, wizard_step, suggested_actions? }
 *
 * Behavior:
 *   - Loads/creates a conversation persisted in workspaces.v2_setup_state.
 *   - Calls the LLM (Sonnet via chatCompletion → Foundry/legacy/Anthropic fallback).
 *   - LLM is system-prompted to act as a conversational onboarding agent that
 *     can emit "tool calls" as inline JSON markers (we keep this transport-agnostic
 *     so it works against Foundry/Anthropic/legacy without provider-specific tool APIs).
 *   - Runs scan_website + draft_kb tools server-side; updates wizard_state with
 *     drafts the user can then confirm.
 *   - Emits SaaS V2 setup events into aios_event_log (best-effort, never blocks).
 *
 * NOT streaming — the brief recommends client-side typewriter animation over
 * Lambda response streaming (Netlify Lambda buffers; edge-functions don't exist
 * in this repo yet). Pair this with V2SetupChat's typewriter effect.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type Role = 'user' | 'assistant' | 'system';
interface ConversationTurn {
  role: Role;
  content: string;
  ts: string;
  tool?: { name: string; result_summary?: string };
}

type WizardStep = 'intake' | 'kb_extract' | 'review' | 'deploying';

interface ExtractedDraft {
  businessName?: string;
  websiteUrl?: string;
  industry?: string;
  country?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  postalCode?: string;
  businessPhone?: string;
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  languages?: string[];
  serviceAreas?: string[];
  services?: Array<{ name: string; duration: number; price: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  policies?: { cancellation?: string; reschedule?: string; deposit?: string } | null;
  agentConfig?: {
    agentName?: string;
    voiceId?: string;
    tone?: string;
    transferNumber?: string;
  };
  callFlow?: Record<string, unknown>;
  agentPromptDraft?: string;
}

interface WizardState {
  conversation: ConversationTurn[];
  extracted: ExtractedDraft;
  wizard_step: WizardStep;
  scrape_source?: 'firecrawl' | 'n8n_fallback' | 'basic' | 'conversation_only';
  scrape_chars?: number;
}

const SYSTEM_PROMPT = `You are Boltcall's onboarding agent. Your single goal: in 15 minutes of friendly conversation, gather enough about the user's business to deploy a Retell voice AI receptionist that handles their inbound calls and instant lead replies.

Pacing rules (NEVER violate):
- Ask ONE question at a time. Two short ones max if tightly related (e.g. "city + state").
- Never list more than 3 sub-bullets in a reply. Keep replies under 80 words.
- Be warm, concise, plain-language. Speed-to-lead is the product promise — match that energy.
- Never restate what the user just told you back to them.
- If the user gives you a website URL, IMMEDIATELY emit a scan_website tool call instead of asking more questions. The scan will fill in services/FAQs/policies for you so you don't have to ask.

You can emit at most ONE tool call per assistant turn. To emit a tool call, end your message with a fenced block:

\`\`\`tool
{"name": "scan_website", "args": {"url": "https://..."}}
\`\`\`

Available tools:
- scan_website(url) — crawls the site, extracts services/FAQs/policies/business info. Use as SOON as you have a URL.
- draft_kb(services?, faqs?, policies?) — saves user-confirmed KB drafts.
- draft_agent_prompt(agentName, tone) — generates a draft agent voice prompt for review.
- draft_voice_choice(voiceId) — records selected Retell voice (default 11labs-Adrian).
- draft_transfer_number(number?) — records optional transfer-to-human number.

Required info to deploy (gather in roughly this order):
1. Business name + website URL (run scan_website immediately if URL given)
2. Industry / what they do (only if scan didn't infer it)
3. Country + city (1 turn)
4. Top services (if scan didn't find them — 3-5 services with duration estimate)
5. 2-3 FAQs callers ask (if scan didn't find them)
6. Transfer-to-human phone number (optional — "leave blank to skip")
7. Confirmation — propose deploy.

When you have ENOUGH info to deploy (business name + industry + at least 2 services or any scanned KB), end your turn with EXACTLY this confirmation message: "I've got everything I need. Ready to deploy your agent — say 'deploy' to launch."

Important: NEVER invent services, FAQs, or business details. Only use what the user told you or what scan_website returned.`;

// ── Tool execution ──────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

function extractToolCall(text: string): { stripped: string; tool: ToolCall | null } {
  const re = /```tool\s*\n([\s\S]*?)\n```/i;
  const m = text.match(re);
  if (!m) return { stripped: text, tool: null };
  try {
    const parsed = JSON.parse(m[1].trim());
    if (parsed && typeof parsed.name === 'string') {
      return {
        stripped: text.replace(re, '').trim(),
        tool: { name: parsed.name, args: parsed.args || {} },
      };
    }
  } catch {
    /* fall through */
  }
  return { stripped: text.replace(re, '').trim(), tool: null };
}

async function callScrapeUrl(url: string): Promise<{
  ok: boolean;
  content?: string;
  charCount?: number;
  source?: string;
  title?: string;
}> {
  // Functions calling functions: hit the deployed scrape-url endpoint via FUNCTIONS_URL
  // (server-to-server). In Netlify Functions, prefer URL("/.netlify/functions/scrape-url", process.env.URL).
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    'http://localhost:8888';

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
  if (internalSecret) hdrs['x-internal-secret'] = internalSecret;

  try {
    const res = await fetch(`${base}/.netlify/functions/scrape-url`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: !!data.content,
      content: data.content || data.markdown || '',
      charCount: data.charCount || (data.content || '').length,
      source: data.source,
      title: data.title,
    };
  } catch (e) {
    console.error('[saas-v2-setup-conversation] scrape-url failed:', e);
    return { ok: false };
  }
}

async function callAiExtractKb(opts: {
  content: string;
  businessName?: string;
  category?: string;
  userId?: string;
}): Promise<{
  services: Array<{ name: string; duration: number; price: number }>;
  faqs: Array<{ question: string; answer: string }>;
  policies: { cancellation: string; reschedule: string; deposit: string } | null;
}> {
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    'http://localhost:8888';
  try {
    const res = await fetch(`${base}/.netlify/functions/ai-extract-kb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) return { services: [], faqs: [], policies: null };
    return await res.json();
  } catch (e) {
    console.error('[saas-v2-setup-conversation] ai-extract-kb failed:', e);
    return { services: [], faqs: [], policies: null };
  }
}

async function runTool(
  tool: ToolCall,
  state: WizardState,
  userId: string,
): Promise<{ summary: string; mutations: Partial<WizardState> }> {
  const mutations: Partial<WizardState> = {};

  switch (tool.name) {
    case 'scan_website': {
      const url = String(tool.args.url || '').trim();
      if (!url) return { summary: 'no_url_provided', mutations };

      const scrape = await callScrapeUrl(url);
      if (!scrape.ok || !scrape.content) {
        return { summary: `scan_failed: could not fetch ${url}`, mutations };
      }

      const kb = await callAiExtractKb({
        content: scrape.content,
        businessName: state.extracted.businessName,
        category: state.extracted.industry,
        userId,
      });

      const newExtracted: ExtractedDraft = {
        ...state.extracted,
        websiteUrl: url,
        services: kb.services?.length ? kb.services : state.extracted.services,
        faqs: kb.faqs?.length ? kb.faqs : state.extracted.faqs,
        policies: kb.policies || state.extracted.policies || null,
      };
      mutations.extracted = newExtracted;
      mutations.scrape_source =
        (scrape.source as WizardState['scrape_source']) || 'basic';
      mutations.scrape_chars = scrape.charCount || 0;
      mutations.wizard_step = 'kb_extract';

      const servicesCount = kb.services?.length || 0;
      const faqsCount = kb.faqs?.length || 0;
      const hasPolicies = !!(kb.policies && (kb.policies.cancellation || kb.policies.reschedule || kb.policies.deposit));

      // Emit telemetry (best-effort, never blocks)
      emitEvent('saas_v2_setup_kb_extracted', {
        workspace_id: '__filled_by_caller__',
        source: scrape.source || 'basic',
        scrape_chars: scrape.charCount || 0,
        services_count: servicesCount,
        faqs_count: faqsCount,
        has_policies: hasPolicies,
      }).catch(() => {});

      return {
        summary: `scan_ok: ${servicesCount} services, ${faqsCount} FAQs, ${hasPolicies ? 'policies found' : 'no policies'}, source=${scrape.source}`,
        mutations,
      };
    }

    case 'draft_kb': {
      const { services, faqs, policies } = tool.args as Partial<ExtractedDraft>;
      const newExtracted = { ...state.extracted };
      if (Array.isArray(services)) newExtracted.services = services;
      if (Array.isArray(faqs)) newExtracted.faqs = faqs;
      if (policies) newExtracted.policies = policies;
      mutations.extracted = newExtracted;
      return { summary: 'kb_draft_saved', mutations };
    }

    case 'draft_agent_prompt': {
      const agentName = String(tool.args.agentName || `${state.extracted.businessName || 'My Business'} AI Receptionist`);
      const tone = String(tool.args.tone || 'friendly_concise');
      const newExtracted = {
        ...state.extracted,
        agentConfig: {
          ...(state.extracted.agentConfig || {}),
          agentName,
          tone,
          voiceId: state.extracted.agentConfig?.voiceId || '11labs-Adrian',
        },
      };
      mutations.extracted = newExtracted;
      mutations.wizard_step = 'review';

      emitEvent('saas_v2_setup_agent_drafted', {
        workspace_id: '__filled_by_caller__',
        industry: state.extracted.industry || 'unknown',
        prompt_chars: 0,
        voice_id: newExtracted.agentConfig?.voiceId || '11labs-Adrian',
        agent_type: 'inbound',
      }).catch(() => {});

      return { summary: `agent_drafted: ${agentName} (${tone})`, mutations };
    }

    case 'draft_voice_choice': {
      const voiceId = String(tool.args.voiceId || '11labs-Adrian');
      mutations.extracted = {
        ...state.extracted,
        agentConfig: {
          ...(state.extracted.agentConfig || {}),
          voiceId,
        },
      };
      return { summary: `voice=${voiceId}`, mutations };
    }

    case 'draft_transfer_number': {
      const transferNumber = String(tool.args.number || '').trim();
      mutations.extracted = {
        ...state.extracted,
        agentConfig: {
          ...(state.extracted.agentConfig || {}),
          transferNumber: transferNumber || undefined,
        },
      };
      return { summary: transferNumber ? `transfer=${transferNumber}` : 'transfer=none', mutations };
    }

    default:
      return { summary: `unknown_tool:${tool.name}`, mutations };
  }
}

// ── Event bus (best-effort, fire-and-forget) ────────────────────────────────

async function emitEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Lightweight: write directly to aios_event_log if it exists. Never throw.
  try {
    const supa = getServiceSupabase();
    await supa
      .from('aios_event_log')
      .insert({ event_type: type, payload, source: 'saas-v2-setup' });
  } catch {
    /* swallow — event log is optional */
  }
}

// ── Workspace state load/save (using user_id OR owner_id for compat) ────────

async function loadWorkspaceState(userId: string): Promise<{
  workspaceId: string | null;
  state: WizardState;
  conversationId: string | null;
}> {
  const supa = getServiceSupabase();
  // Try user_id (live database.ts pattern), fall back to owner_id (rbac migration).
  let { data: ws } = await supa
    .from('workspaces')
    .select('id, v2_setup_state, v2_setup_conversation_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (!ws) {
    const r = await supa
      .from('workspaces')
      .select('id, v2_setup_state, v2_setup_conversation_id')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle();
    ws = r.data || null;
  }
  if (!ws) {
    return {
      workspaceId: null,
      state: emptyState(),
      conversationId: null,
    };
  }
  const state: WizardState = (ws.v2_setup_state as WizardState) || emptyState();
  return {
    workspaceId: ws.id as string,
    state,
    conversationId: (ws.v2_setup_conversation_id as string | null) || null,
  };
}

async function saveWorkspaceState(opts: {
  workspaceId: string;
  state: WizardState;
  conversationId: string;
  startedAt?: boolean;
}): Promise<void> {
  const supa = getServiceSupabase();
  const patch: Record<string, unknown> = {
    v2_setup_state: opts.state,
    v2_setup_conversation_id: opts.conversationId,
    v2_setup_status: 'in_progress',
    updated_at: new Date().toISOString(),
  };
  if (opts.startedAt) patch.v2_setup_started_at = new Date().toISOString();
  await supa.from('workspaces').update(patch).eq('id', opts.workspaceId);
}

function emptyState(): WizardState {
  return {
    conversation: [],
    extracted: {},
    wizard_step: 'intake',
  };
}

function generateConversationId(): string {
  // RFC4122-ish — no dep on uuid lib (which may not be available everywhere)
  return 'conv_' + Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Auth ────────────────────────────────────────────────────────────────────

async function resolveUser(authHeader: string | undefined): Promise<{
  ok: boolean;
  userId?: string;
  error?: string;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing bearer token' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, error: 'Missing bearer token' };
  const supa = getServiceSupabase();
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user) return { ok: false, error: 'Invalid or expired token' };
  return { ok: true, userId: data.user.id };
}

// ── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const auth = await resolveUser(authHeader);
  if (!auth.ok || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };
  }
  const userId = auth.userId;

  let body: { user_message?: string; conversation_id?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const userMessage = String(body.user_message || '').trim();
  if (!userMessage) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_message is required' }) };
  }
  if (userMessage.length > 4000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_message too long (max 4000 chars)' }) };
  }

  // Load (or create) the workspace + state
  const { workspaceId, state: loadedState, conversationId: existingConvoId } = await loadWorkspaceState(userId);
  if (!workspaceId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'No workspace found for user. Sign up may not have completed.',
      }),
    };
  }

  const isNewConversation = !existingConvoId || existingConvoId !== body.conversation_id;
  const conversationId = body.conversation_id || existingConvoId || generateConversationId();
  let state: WizardState = isNewConversation && state_isEmpty(loadedState) ? emptyState() : loadedState;

  // First call ever: emit started
  if (state.conversation.length === 0) {
    emitEvent('saas_v2_setup_started', {
      workspace_id: workspaceId,
      entry_point: 'direct_url',
    }).catch(() => {});
  }

  // Append the user turn
  state.conversation.push({
    role: 'user',
    content: userMessage,
    ts: new Date().toISOString(),
  });
  emitEvent('saas_v2_setup_message_sent', {
    workspace_id: workspaceId,
    turn_index: state.conversation.length - 1,
    role: 'user',
    char_count: userMessage.length,
  }).catch(() => {});

  // Build the LLM input. We compress prior conversation into a serialized transcript
  // (instructions/input format compatible with both Foundry Responses + Anthropic via chatCompletion).
  const transcript = state.conversation
    .map((t) => {
      const tag = t.role === 'user' ? 'User' : 'Assistant';
      const toolNote = t.tool ? ` [ran ${t.tool.name}: ${t.tool.result_summary || 'ok'}]` : '';
      return `${tag}${toolNote}: ${t.content}`;
    })
    .join('\n\n');

  const stateSummary = `\n\n---\nCurrent extracted state (use this to avoid re-asking):\n${JSON.stringify(state.extracted, null, 2)}\nWizard step: ${state.wizard_step}`;

  // ── Call the LLM ────────────────────────────────────────────────────────
  let rawAssistant = '';
  const startTs = Date.now();
  try {
    rawAssistant = await chatCompletion(
      SYSTEM_PROMPT + stateSummary,
      transcript + '\n\nReply now with your next turn. Remember: one question at a time, under 80 words.',
      { maxTokens: 600, tier: 'heavy' },
    );
  } catch (e) {
    console.error('[saas-v2-setup-conversation] LLM error:', e);
    emitEvent('saas_v2_setup_abandoned', {
      workspace_id: workspaceId,
      last_step: state.wizard_step,
      turns_completed: state.conversation.length,
      reason: 'error',
    }).catch(() => {});
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'AI provider error',
        recovery: 'Retry or switch to V1 setup at /setup',
        conversation_id: conversationId,
      }),
    };
  }
  const latencyMs = Date.now() - startTs;

  // Parse out any tool call from the assistant message
  const { stripped: visibleText, tool } = extractToolCall(rawAssistant);
  const cleanText = (visibleText || '').trim() || "Got it, let me think for a sec.";

  // Execute the tool if present (server-side)
  let toolSummary: string | undefined;
  if (tool) {
    const { summary, mutations } = await runTool(tool, state, userId);
    state = { ...state, ...mutations } as WizardState;
    toolSummary = summary;
  }

  // Push the assistant turn (with any tool notation)
  state.conversation.push({
    role: 'assistant',
    content: cleanText,
    ts: new Date().toISOString(),
    tool: tool ? { name: tool.name, result_summary: toolSummary } : undefined,
  });
  emitEvent('saas_v2_setup_message_sent', {
    workspace_id: workspaceId,
    turn_index: state.conversation.length - 1,
    role: 'assistant',
    char_count: cleanText.length,
    model_tier: 'heavy',
    latency_ms: latencyMs,
  }).catch(() => {});

  // Heuristic — once we have agentConfig + (any services or scanned KB) + business name,
  // surface a "ready to deploy" flag so the client can render the deploy button.
  const hasServices = !!(state.extracted.services && state.extracted.services.length > 0);
  const readyToDeploy =
    !!state.extracted.businessName &&
    (hasServices || !!state.extracted.websiteUrl) &&
    !!state.extracted.agentConfig?.agentName;

  if (readyToDeploy && state.wizard_step !== 'review') {
    state.wizard_step = 'review';
  }

  // Persist
  await saveWorkspaceState({
    workspaceId,
    state,
    conversationId,
    startedAt: state.conversation.length <= 2,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      conversation_id: conversationId,
      assistant_message: cleanText,
      tool: tool ? { name: tool.name, summary: toolSummary } : null,
      extracted: state.extracted,
      wizard_step: state.wizard_step,
      ready_to_deploy: readyToDeploy,
      latency_ms: latencyMs,
    }),
  };
};

function state_isEmpty(s: WizardState): boolean {
  return s.conversation.length === 0 && Object.keys(s.extracted).length === 0;
}
