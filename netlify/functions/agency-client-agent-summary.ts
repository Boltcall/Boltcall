/**
 * agency-client-agent-summary.ts — Boltcall Agency OS · Layer 8 · Client-portal
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GET ?client_id=<uuid>
 *
 * Returns a PLAIN-LANGUAGE summary of the client's currently-shipped agent
 * prompt. Powers the "Your agent personality" card on /client/agent.
 *
 * Rule: the client never sees the raw system prompt. Sonnet translates the
 * production prompt into a short, conversational description of how the agent
 * behaves — vertical-aware, no engineering jargon. Generated fresh on each
 * page-load so it always reflects the current shipped prompt; we never cache
 * to avoid drift between what the prompt actually does and what the client
 * thinks it does.
 *
 * Auth: client JWT (owns_client check) or founder JWT.
 *
 * Output:
 *   {
 *     summary_markdown: string,        // ~120-180 words, vertical-aware
 *     greets_with: string,             // 1-sentence one-liner the agent opens with
 *     books_to: string | null,         // booking tool / hours window summary
 *     transfers_when: string | null,
 *     last_revised_at: string | null,  // ISO date of most recent prompt_revision
 *     agent_voice_name: string | null,
 *     model: string | null,
 *   }
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

interface ClientRow {
  id: string;
  user_id: string | null;
  business_name: string | null;
  vertical: string | null;
  status: string;
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function isUuid(s: string | undefined | null): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function ownsClient(
  supa: ReturnType<typeof getServiceSupabase>,
  jwtUserId: string,
  clientId: string,
  isFounder: boolean,
): Promise<ClientRow | null> {
  const { data } = await supa
    .from('agency_clients')
    .select('id,user_id,business_name,vertical,status')
    .eq('id', clientId)
    .maybeSingle();
  if (!data) return null;
  if (isFounder) return data as ClientRow;
  if (data.user_id !== jwtUserId) return null;
  if (data.status === 'churned') return null;
  return data as ClientRow;
}

/**
 * Load the most-recently-shipped agent_prompt or prompt_revision artifact for
 * the client. Same pattern as agency-deploy-agent.findExistingAgentId — we
 * walk shipped artifacts newest-first.
 */
async function loadProductionPrompt(
  supa: ReturnType<typeof getServiceSupabase>,
  clientId: string,
): Promise<{
  prompt: string | null;
  voice_id: string | null;
  language: string | null;
  shipped_at: string | null;
  model: string | null;
} | null> {
  const { data } = await supa
    .from('agency_artifacts')
    .select('content,ship_result,shipped_at,model')
    .eq('client_id', clientId)
    .in('type', ['agent_prompt', 'prompt_revision'])
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const content = (data.content ?? {}) as Record<string, unknown>;
  return {
    prompt: typeof content.prompt === 'string' ? content.prompt : null,
    voice_id: typeof content.voice_id === 'string' ? content.voice_id : null,
    language: typeof content.language === 'string' ? content.language : null,
    shipped_at: (data.shipped_at as string | null) ?? null,
    model: (data.model as string | null) ?? null,
  };
}

/**
 * Translate the raw production prompt into client-facing plain language.
 * Sonnet preferred; deterministic fallback if ANTHROPIC_API_KEY missing or
 * the API fails — fallback uses a heuristic keyword scan over the raw prompt
 * so the result still reflects the actual prompt content.
 */
async function translatePrompt(opts: {
  prompt: string;
  vertical: string | null;
  business_name: string | null;
}): Promise<{
  summary_markdown: string;
  greets_with: string;
  books_to: string | null;
  transfers_when: string | null;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Anthropic = require('@anthropic-ai/sdk').default;
      const claude = new Anthropic({ apiKey });
      const system = `You translate technical AI receptionist system prompts into plain-language descriptions for the small-business owner who will rely on the agent. Tone: warm, calm, no engineering jargon. The owner is busy — they read this card in 30 seconds.

Output JSON only, this exact shape:
{
  "summary_markdown": "string — 120-180 words, 2-3 short paragraphs in markdown. Describes what the agent actually does: how it greets callers, what info it captures, when it books, when it transfers, what it refuses to do. Speak to the owner directly ('your agent'). No bullet points unless absolutely necessary.",
  "greets_with": "string — one short sentence the agent opens with (paraphrase, no quotes around it).",
  "books_to": "string or null — concrete booking detail (e.g. 'your Tuesday and Thursday 9-5 slots') or null if the prompt doesn't specify.",
  "transfers_when": "string or null — when the agent escalates to you (e.g. 'on emergencies or complex pricing questions') or null."
}

Do NOT mention model names, token counts, prompt-engineering structure, JSON schemas, or system-prompt mechanics. The owner doesn't care that there's a prompt — they care what their agent DOES.`;

      const user = `Business: ${opts.business_name || 'this business'}
Vertical: ${opts.vertical || 'service business'}

--- raw production prompt below ---
${opts.prompt.slice(0, 12000)}`;

      const resp = await claude.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const block = resp.content?.find((b: { type?: string }) => b.type === 'text');
      const raw = (block as { text?: string } | undefined)?.text?.trim() || '';
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        return {
          summary_markdown: String(parsed.summary_markdown || '').slice(0, 4000),
          greets_with: String(parsed.greets_with || '').slice(0, 240),
          books_to: parsed.books_to ? String(parsed.books_to).slice(0, 240) : null,
          transfers_when: parsed.transfers_when ? String(parsed.transfers_when).slice(0, 240) : null,
        };
      }
    } catch (err) {
      console.warn('[client-agent-summary] Sonnet translation failed, using heuristic fallback:', (err as Error).message);
    }
  }

  // Heuristic fallback — scrape obvious cues from the raw prompt. Always
  // better than nothing in front of the client.
  const lower = opts.prompt.toLowerCase();
  const bookHint = lower.includes('book') || lower.includes('schedul') || lower.includes('appointment');
  const transferHint = lower.includes('transfer') || lower.includes('escalate') || lower.includes('emergency');
  const verticalNoun = opts.vertical || 'service business';
  return {
    summary_markdown:
      `Your agent answers your phone 24/7 with a warm, professional greeting. ` +
      `It identifies itself as part of your ${verticalNoun} team, collects the caller's name and contact info, and asks the qualifying questions you specified during intake. ` +
      `${bookHint ? "When a caller is ready, your agent books them onto your calendar directly. " : ''}` +
      `${transferHint ? "If something falls outside the agent's scope — an emergency, a complex pricing question, or a frustrated caller — it transfers the call to you. " : ''}` +
      `Your agent never invents pricing, never makes promises you didn't authorize, and never speaks over the caller.`,
    greets_with: `A warm greeting that identifies your business by name.`,
    books_to: bookHint ? 'your connected calendar' : null,
    transfers_when: transferHint ? 'on emergencies or anything outside its training' : null,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Unauthorized — missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) return jsonResponse(401, { error: 'Invalid token' });
  const jwtUserId = userRes.user.id;
  const isFounder = ((userRes.user.app_metadata as { role?: string } | undefined)?.role ?? null) === 'founder';

  const clientId = event.queryStringParameters?.client_id;
  if (!isUuid(clientId)) return jsonResponse(400, { error: 'client_id (uuid) is required' });

  const client = await ownsClient(supa, jwtUserId, clientId, isFounder);
  if (!client) return jsonResponse(403, { error: 'Forbidden — client not visible to this user' });

  const production = await loadProductionPrompt(supa, clientId);
  if (!production || !production.prompt) {
    // Agent not yet shipped — return a "still building" placeholder.
    return jsonResponse(200, {
      summary_markdown:
        "Your agent is still being built from your intake call. Once it ships, this card will show you exactly how it greets your callers, what it asks, and when it escalates to you.",
      greets_with: '',
      books_to: null,
      transfers_when: null,
      last_revised_at: null,
      agent_voice_name: null,
      model: null,
    });
  }

  const translated = await translatePrompt({
    prompt: production.prompt,
    vertical: client.vertical,
    business_name: client.business_name,
  });

  return jsonResponse(200, {
    summary_markdown: translated.summary_markdown,
    greets_with: translated.greets_with,
    books_to: translated.books_to,
    transfers_when: translated.transfers_when,
    last_revised_at: production.shipped_at,
    agent_voice_name: production.voice_id, // raw id; the UI can map to a friendly name later
    model: production.model,
  });
};
