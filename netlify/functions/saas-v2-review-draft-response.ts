import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { withLegacyHandler } from './_shared/runtime-compat';

import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-review-draft-response — POST endpoint.
 *
 * Generates an AI-drafted response to a single review, tuned to one of three
 * tones. The drawer in V2 Reputation calls this when a user opens a review and
 * when they switch the tone toggle.
 *
 * Body: { review_id: string, tone?: 'warm' | 'professional' | 'apologetic' }
 *   - Defaults to 'professional' when omitted or invalid.
 *
 * Auth — `Authorization: Bearer <jwt>` (Supabase session). The function
 *   resolves the workspace via `workspaces.user_id = userId` and then verifies
 *   the requested review belongs to that workspace BEFORE drafting (so a
 *   stolen JWT can't fish replies for other workspaces' review ids).
 *
 * Workspace tone preferences — best-effort: we read
 *   `workspaces.default_language` and a free-form `tone_preferences` JSON
 *   column (if it exists) so the draft respects the business's voice.
 *
 * Event — emits `saas_v2_review_drafted` to `aios_event_log` + best-effort
 *   `agency_events` (matches the wave-1 analytics pattern).
 */

type ResponseTone = 'warm' | 'professional' | 'apologetic';

const VALID_TONES: readonly ResponseTone[] = ['warm', 'professional', 'apologetic'] as const;

interface DraftRequestBody {
  review_id?: unknown;
  tone?: unknown;
}

interface DraftResponseBody {
  draft: string;
  tone: ResponseTone;
  reasoning_oneliner: string;
}

interface DbReviewRow {
  id: string;
  workspace_id: string;
  platform?: string | null;
  rating?: number | null;
  review_text?: string | null;
  reviewer_name?: string | null;
  posted_at?: string | null;
  sentiment?: string | null;
}

interface WorkspaceRow {
  id: string;
  name?: string | null;
  default_language?: string | null;
  tone_preferences?: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function jsonError(status: number, message: string, cors: Record<string, string>) {
  return { statusCode: status, headers: cors, body: JSON.stringify({ error: message }) };
}

function normalizeTone(raw: unknown): ResponseTone {
  if (typeof raw !== 'string') return 'professional';
  const v = raw.toLowerCase().trim();
  return (VALID_TONES as readonly string[]).includes(v) ? (v as ResponseTone) : 'professional';
}

/* ------------------------------------------------------------------ */
/*  Auth                                                              */
/* ------------------------------------------------------------------ */

async function resolveWorkspace(
  authHeader: string | undefined,
): Promise<
  | { ok: true; userId: string; workspace: WorkspaceRow }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Missing Authorization header' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Missing bearer token' };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }
  const userId = userResult.user.id;

  // Try to pull tone_preferences if the column exists; fall back to the
  // baseline columns if PostgREST 42703 (column missing).
  let workspace: WorkspaceRow | null = null;
  const withTone = await supa
    .from('workspaces')
    .select('id, name, default_language, tone_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (withTone.error) {
    const fallback = await supa
      .from('workspaces')
      .select('id, name, default_language')
      .eq('user_id', userId)
      .maybeSingle();
    if (fallback.error || !fallback.data) {
      return { ok: false, status: 404, error: 'No workspace found for user' };
    }
    workspace = fallback.data as unknown as WorkspaceRow;
  } else if (!withTone.data) {
    return { ok: false, status: 404, error: 'No workspace found for user' };
  } else {
    workspace = withTone.data as unknown as WorkspaceRow;
  }

  return { ok: true, userId, workspace };
}

/* ------------------------------------------------------------------ */
/*  Review lookup (with workspace authorization)                      */
/* ------------------------------------------------------------------ */

async function fetchReviewForWorkspace(
  reviewId: string,
  workspaceId: string,
): Promise<
  | { ok: true; row: DbReviewRow }
  | { ok: false; status: number; error: string; tableMissing?: boolean }
> {
  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from('reviews')
    .select(
      'id, workspace_id, platform, rating, review_text, reviewer_name, posted_at, sentiment',
    )
    .eq('id', reviewId)
    .maybeSingle();

  if (error) {
    // PostgREST PGRST205 = relation does not exist (table missing in this env).
    const msg = error.message || '';
    const tableMissing = /does not exist|relation .* does not exist|PGRST205/i.test(msg);
    return {
      ok: false,
      status: tableMissing ? 404 : 500,
      error: tableMissing
        ? 'Reviews source is not connected yet.'
        : 'Could not load review.',
      tableMissing,
    };
  }
  if (!data) {
    return { ok: false, status: 404, error: 'Review not found' };
  }

  const row = data as unknown as DbReviewRow;
  if (row.workspace_id !== workspaceId) {
    // Explicit 404 (not 403) so we don't leak the existence of the review.
    return { ok: false, status: 404, error: 'Review not found' };
  }

  return { ok: true, row };
}

/* ------------------------------------------------------------------ */
/*  LLM draft generation                                              */
/* ------------------------------------------------------------------ */

const TONE_GUIDANCE: Record<ResponseTone, string> = {
  warm: 'Warm and personal. Use their name if available. Sound like a real person at the business — friendly, grateful, never corporate.',
  professional:
    'Professional and concise. Polite, confident, no fluff. Treat it like a public-facing reply that a future customer might read.',
  apologetic:
    'Apologetic and accountable. Acknowledge the specific issue, take ownership without excuses, and offer one clear next step (e.g. "please call us at the office so we can make this right").',
};

const DRAFT_SYSTEM_PROMPT = `You draft public replies to online reviews for local-service businesses (plumbers, dentists, law firms, HVAC, med spas).

RULES:
- Output ONE reply. 60-120 words. Plain text only — no markdown, no JSON, no labels.
- Address the reviewer by first name if provided; otherwise use a neutral greeting.
- Reference at least one concrete detail from the review (the service, the issue, the praise) so it doesn't read as a template.
- Never make up facts, prices, promises, or staff names.
- Never mention AI, models, prompts, or "this response was generated by".
- Never argue with the reviewer or get defensive — even on critical reviews.
- End with a short, natural closer ("Thanks again", "We appreciate you", "Talk soon"). No signatures, no "— The team at X" unless the workspace name is provided AND it fits naturally.

You will also output, on a single final line prefixed with WHY: a one-line (max 14 words) plain-English note about why this draft fits the tone. The WHY line is for the dashboard UI, not the reviewer.

Format:
<reply text, 60-120 words>
WHY: <one-line note>`;

interface DraftParts {
  draft: string;
  reasoning: string;
}

function splitDraftAndReasoning(raw: string): DraftParts {
  const cleaned = raw
    .trim()
    .replace(/^```(?:\w+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Look for "WHY:" on its own line.
  const whyMatch = cleaned.match(/(^|\n)\s*WHY\s*:\s*(.+?)\s*$/i);
  if (whyMatch) {
    const draft = cleaned.slice(0, whyMatch.index).trim();
    const reasoning = whyMatch[2].trim();
    return { draft, reasoning };
  }

  return { draft: cleaned, reasoning: '' };
}

async function generateDraft(
  review: DbReviewRow,
  tone: ResponseTone,
  workspace: WorkspaceRow,
): Promise<DraftParts> {
  const toneGuidance = TONE_GUIDANCE[tone];

  const userPrompt = JSON.stringify(
    {
      tone,
      tone_guidance: toneGuidance,
      workspace: {
        name: workspace.name || null,
        language: workspace.default_language || 'en',
        tone_preferences: workspace.tone_preferences || null,
      },
      review: {
        platform: review.platform || 'other',
        rating: review.rating || 0,
        sentiment: review.sentiment || null,
        author: review.reviewer_name || null,
        posted_at: review.posted_at || null,
        body: (review.review_text || '').slice(0, 1600),
      },
    },
    null,
    2,
  );

  try {
    const raw = await chatCompletion(DRAFT_SYSTEM_PROMPT, userPrompt, {
      tier: 'heavy',
      maxTokens: 500,
    });
    const parts = splitDraftAndReasoning(raw);
    if (parts.draft) {
      return {
        draft: parts.draft.slice(0, 1400),
        reasoning: parts.reasoning.slice(0, 140),
      };
    }
    throw new Error('Empty draft from LLM');
  } catch (err) {
    console.warn('[saas-v2-review-draft-response] LLM failed, using fallback:', err);
    return heuristicDraft(review, tone, workspace);
  }
}

/* ------------------------------------------------------------------ */
/*  Heuristic fallback (so the UI never blocks on LLM downtime)        */
/* ------------------------------------------------------------------ */

function heuristicDraft(
  review: DbReviewRow,
  tone: ResponseTone,
  workspace: WorkspaceRow,
): DraftParts {
  const name = (review.reviewer_name || '').trim().split(/\s+/)[0] || 'there';
  const biz = workspace.name?.trim() || 'our team';
  const rating = review.rating || 0;
  const isPositive = rating >= 4;
  const isCritical = rating <= 2;

  let draft = '';
  if (tone === 'warm') {
    draft = isPositive
      ? `Hi ${name}, thank you so much for the kind words — they made our day. We always want every visit to feel like this one did, so it means a lot to hear it. ${biz} appreciates you taking the time to share, and we hope to see you again soon.`
      : `Hi ${name}, thank you for taking the time to share this with us — feedback like yours is how we get better. I would love to make this right; please reach out to ${biz} directly so we can look into it together.`;
  } else if (tone === 'apologetic') {
    draft = `Hi ${name}, I'm sorry for the experience you described — that isn't the standard we hold ourselves to. Please contact ${biz} directly so we can look into what happened and make it right. We appreciate you giving us the chance to fix this.`;
  } else {
    draft = isPositive
      ? `Thank you for the review, ${name}. We're glad the visit went well, and we appreciate you taking the time to share your experience. We look forward to working with you again.`
      : isCritical
        ? `Thank you for the feedback, ${name}. We take concerns like this seriously. Please reach out to ${biz} directly so we can review what happened and make it right.`
        : `Thank you for the review, ${name}. We appreciate the feedback and are always working to improve. Please reach out to ${biz} directly if there is anything else we can help with.`;
  }

  const reasoning =
    tone === 'warm'
      ? 'Warm opener, personal thanks, leaves door open.'
      : tone === 'apologetic'
        ? 'Owns the issue, no excuses, one clear next step.'
        : 'Concise and confident, suitable for public view.';

  return { draft, reasoning };
}

/* ------------------------------------------------------------------ */
/*  Event emission (best-effort)                                      */
/* ------------------------------------------------------------------ */

async function emitReviewDrafted(
  workspaceId: string,
  reviewId: string,
  platform: string,
  rating: number,
  draftChars: number,
  tone: ResponseTone,
): Promise<void> {
  const supa = getServiceSupabase();
  const payload = {
    workspace_id: workspaceId,
    review_id: reviewId,
    platform,
    rating,
    draft_chars: draftChars,
    tone,
    tier: 'sonnet' as const,
  };

  try {
    await supa.from('aios_event_log').insert({
      event_type: 'saas_v2_review_drafted',
      workspace_id: workspaceId,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* table may not exist yet — silent */
  }

  try {
    await supa.from('agency_events').insert({
      client_id: workspaceId,
      agent_name: 'saas-v2-review-draft-response',
      type: 'saas_v2_review_drafted',
      severity: 'info',
      payload,
      why_explanation: `V2 Reputation drafted a ${tone} reply`,
    });
  } catch {
    /* table may not exist yet — silent */
  }
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (
    getRequestOrigin(event.headers as Record<string, string>) &&
    !v2cors.allowed
  ) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  if (event.httpMethod !== 'POST') {
    return jsonError(405, 'Method not allowed', cors);
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authResult = await resolveWorkspace(authHeader);
  if (authResult.ok !== true) {
    return jsonError(authResult.status, authResult.error, cors);
  }
  const { workspace } = authResult;

  let parsed: DraftRequestBody;
  try {
    parsed = JSON.parse(event.body || '{}') as DraftRequestBody;
  } catch {
    return jsonError(400, 'Invalid JSON body', cors);
  }

  const reviewId =
    typeof parsed.review_id === 'string' ? parsed.review_id.trim() : '';
  if (!reviewId) {
    return jsonError(400, 'Body must include { review_id: string }', cors);
  }

  const tone = normalizeTone(parsed.tone);

  const lookup = await fetchReviewForWorkspace(reviewId, workspace.id);
  if (lookup.ok !== true) {
    return jsonError(lookup.status, lookup.error, cors);
  }

  const review = lookup.row;
  const parts = await generateDraft(review, tone, workspace);

  await emitReviewDrafted(
    workspace.id,
    review.id,
    review.platform || 'other',
    Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))),
    parts.draft.length,
    tone,
  ).catch(() => {});

  const body: DraftResponseBody = {
    draft: parts.draft,
    tone,
    reasoning_oneliner: parts.reasoning,
  };

  return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
