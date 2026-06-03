import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';

import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-knowledge-draft-faq.ts
 *
 * Drafts a 2-3 sentence FAQ answer for a caller question using the
 * workspace's KB + business profile as context. Does NOT persist — the user
 * accepts/edits the draft via a separate write endpoint (out of scope here).
 *
 * Auth: JWT → user_id → workspace_id.
 * Method: POST.
 * Body: { question: string, workspace_context?: string }
 *
 * Response shape:
 *   { draft_title, draft_body, suggested_category }
 *
 * Telemetry: emits `saas_v2_kb_draft_generated` (and the brief's adjacent
 * `saas_v2_message_reply_drafted` is not relevant here — this is a KB draft,
 * not an outbound message reply).
 */


function unauthorized(msg: string) {
  return { statusCode: 401, cors, body: JSON.stringify({ error: msg }) };
}

interface DraftResult {
  draft_title: string;
  draft_body: string;
  suggested_category: string;
}

async function emitDraft(workspaceId: string, question: string) {
  try {
    const mod = await import('./_shared/emit-agency-event').catch(() => null);
    if (!mod) return;
    const emitter = (mod as any).emitSaasV2Event || (mod as any).emitAgencyEvent;
    if (typeof emitter !== 'function') return;
    await emitter({
      workspace_id: workspaceId,
      type: 'saas_v2_kb_draft_generated',
      payload: {
        workspace_id: workspaceId,
        query_text: question.slice(0, 200),
        source: 'conversation',
        top_score: 0,
      },
    });
  } catch (err) {
    console.warn('[saas-v2-knowledge-draft-faq] emit failed (non-fatal):', err);
  }
}

function sanitize(s: unknown, max = 500): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function buildKbContext(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
): Promise<{ businessName: string; vertical: string; existingFaqs: string }> {
  // Pull the user's business profile (most-recent-first) for tone/vertical context.
  const { data: profileRow } = await supa
    .from('business_profiles')
    .select('business_name, business_type, services_offered, hours, location')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Grab up to 12 existing KB entries so the draft matches voice/format.
  const { data: kbRows } = await supa
    .from('knowledge_base')
    .select('title, content, category')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(12);

  const businessName = profileRow?.business_name || 'this business';
  const vertical = profileRow?.business_type || 'local service business';

  const existingFaqs = (kbRows || [])
    .map((row: any) => {
      const title = (row.title || '').trim();
      const content = (row.content || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 240);
      if (!title && !content) return null;
      return `Q: ${title}\nA: ${content}`;
    })
    .filter((s): s is string => s !== null)
    .join('\n\n');

  return { businessName, vertical, existingFaqs };
}

async function generateDraft(
  question: string,
  workspaceContext: string,
  ctx: { businessName: string; vertical: string; existingFaqs: string },
): Promise<DraftResult> {
  const system = [
    'You are drafting a knowledge-base FAQ answer for a Boltcall AI receptionist.',
    'The answer will be served to future callers when the question comes up again.',
    '',
    'Voice & format rules:',
    '- 2-3 sentences. Plain English. No marketing fluff, no exclamation marks.',
    '- Match the voice of the existing FAQs (samples below).',
    '- Speak as the business ("we"/"our team"), never "Boltcall" or "the AI".',
    '- If the question can\'t be safely answered from the context, say so plainly and route to a callback.',
    '',
    'Return STRICT JSON only — no markdown, no commentary. Shape:',
    '{',
    '  "draft_title": "Short caller-facing question (<= 80 chars, ends with ?)",',
    '  "draft_body": "2-3 sentence answer",',
    '  "suggested_category": "One short Title-Case label (max 3 words)"',
    '}',
  ].join('\n');

  const userBlocks: string[] = [
    `# Business`,
    `Name: ${ctx.businessName}`,
    `Vertical: ${ctx.vertical}`,
  ];

  if (workspaceContext) {
    userBlocks.push('', '# Additional workspace context', workspaceContext.slice(0, 600));
  }

  if (ctx.existingFaqs) {
    userBlocks.push('', '# Existing FAQs (for voice matching)', ctx.existingFaqs.slice(0, 2400));
  }

  userBlocks.push('', '# New caller question to answer', question);

  let raw: string;
  try {
    raw = await chatCompletion(system, userBlocks.join('\n'), { maxTokens: 500, tier: 'heavy' });
  } catch (err) {
    console.error('[saas-v2-knowledge-draft-faq] LLM call failed:', err);
    throw new Error('Draft generation failed');
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    // Graceful fallback so the user sees something editable.
    return {
      draft_title: sanitize(question, 80),
      draft_body:
        'Thanks for asking — we don\'t have a saved answer for that yet. Our team will follow up shortly.',
      suggested_category: 'General',
    };
  }

  try {
    const parsed = JSON.parse(match[0]);
    return {
      draft_title: sanitize(parsed.draft_title, 80) || sanitize(question, 80),
      draft_body:
        sanitize(parsed.draft_body, 600) ||
        'Thanks for asking — we don\'t have a saved answer for that yet. Our team will follow up shortly.',
      suggested_category: sanitize(parsed.suggested_category, 40) || 'General',
    };
  } catch (err) {
    console.warn('[saas-v2-knowledge-draft-faq] JSON parse failed:', err);
    return {
      draft_title: sanitize(question, 80),
      draft_body:
        'Thanks for asking — we don\'t have a saved answer for that yet. Our team will follow up shortly.',
      suggested_category: 'General',
    };
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.cors['authorization'] || event.cors['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return unauthorized('Invalid or expired token');
  const userId = userResult.user.id;

  const { data: ws } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const workspaceId = ws?.id || userId;

  let body: { question?: string; workspace_context?: string } = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, cors, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const question = sanitize(body.question, 400);
  if (!question) {
    return {
      statusCode: 400,
      cors,
      body: JSON.stringify({ error: 'question is required' }),
    };
  }

  const workspaceContext = sanitize(body.workspace_context, 1200);

  try {
    const ctx = await buildKbContext(supa, userId);
    const draft = await generateDraft(question, workspaceContext, ctx);

    await emitDraft(workspaceId, question);

    return {
      statusCode: 200,
      cors,
      body: JSON.stringify(draft),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[saas-v2-knowledge-draft-faq] handler error:', msg);
    return { statusCode: 500, cors, body: JSON.stringify({ error: msg }) };
  }
};

export { handler };
