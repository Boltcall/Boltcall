import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getCorsHeaders } from './_shared/cors';
import { chatCompletion } from './_shared/azure-ai';

/**
 * saas-v2-reviews — GET endpoint.
 *
 * Returns the V2 Reputation page payload for the calling workspace owner:
 *   • A short Sonnet-tier (heavy) "reputation snapshot" narrative.
 *   • Overall rating + total review count.
 *   • Up to 25 recent reviews (newest first) with source / rating / snippet /
 *     date / sentiment / has_draft_response.
 *
 * Auth — `Authorization: Bearer <jwt>` (Supabase session). The function derives
 *   `user_id` via `auth.getUser(token)` and resolves the workspace by
 *   `owner_id = userId`. workspace_id is NEVER taken from the request.
 *
 * Data source — reads from the `reviews` table (per recon: not yet created in
 *   migrations). If the table doesn't exist OR returns no rows, the endpoint
 *   responds 200 with `{ reviews_unavailable: true }` so the UI can render the
 *   "Connect Google Business Profile" empty state. Cold-start: <14 days of
 *   history surfaces the "Unlock at 30 calls" placeholder cue via cold_start.
 *
 * Event — emits `saas_v2_reputation_rendered` to `aios_event_log` and
 *   best-effort to `agency_events` (matches the wave-1 analytics pattern).
 */

const LOOKBACK_DAYS = 60;
const COLD_START_MIN_CALLS = 30;
const COLD_START_MIN_DAYS = 14;
const MAX_REVIEWS_RETURNED = 25;

type ReviewSource = 'google' | 'yelp' | 'facebook' | 'trustpilot' | 'other';
type ReviewSentiment = 'positive' | 'neutral' | 'critical';

interface ReviewRowOut {
  id: string;
  source: ReviewSource;
  rating: number;
  body: string;
  author: string;
  dated: string;
  sentiment: ReviewSentiment;
  has_draft_response: boolean;
}

interface ReviewsResponseBody {
  sentiment_narrative: string;
  overall_score: number;
  total_reviews: number;
  reviews: ReviewRowOut[];
  total: number;
  reviews_unavailable?: boolean;
  cold_start?: boolean;
  reason?: string;
  generated_at: string;
}

interface DbReviewRow {
  id: string;
  platform?: string | null;
  source?: string | null;
  rating?: number | null;
  review_text?: string | null;
  body?: string | null;
  reviewer_name?: string | null;
  author?: string | null;
  posted_at?: string | null;
  created_at?: string | null;
  dated?: string | null;
  sentiment?: string | null;
  draft_response?: string | null;
  response_text?: string | null;
  responded_at?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                              */
/* ------------------------------------------------------------------ */

async function resolveWorkspace(
  authHeader: string | undefined,
): Promise<
  | { ok: true; userId: string; workspaceId: string }
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

  const { data: workspace, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (wsErr || !workspace?.id) {
    return { ok: false, status: 404, error: 'No workspace found for user' };
  }

  return { ok: true, userId, workspaceId: workspace.id as string };
}

/* ------------------------------------------------------------------ */
/*  Normalization                                                     */
/* ------------------------------------------------------------------ */

function normalizeSource(raw: string | null | undefined): ReviewSource {
  const v = (raw || '').toLowerCase();
  if (v.includes('google')) return 'google';
  if (v.includes('yelp')) return 'yelp';
  if (v.includes('facebook') || v === 'fb') return 'facebook';
  if (v.includes('trustpilot')) return 'trustpilot';
  return 'other';
}

function classifySentiment(
  raw: string | null | undefined,
  rating: number,
): ReviewSentiment {
  const v = (raw || '').toLowerCase();
  if (v === 'positive' || v === 'pos') return 'positive';
  if (v === 'critical' || v === 'negative' || v === 'neg') return 'critical';
  if (v === 'neutral') return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'critical';
  return 'neutral';
}

function normalizeRow(row: DbReviewRow): ReviewRowOut {
  const rating = Math.max(0, Math.min(5, Math.round(Number(row.rating) || 0)));
  const body = (row.review_text || row.body || '').trim();
  const dated = row.posted_at || row.created_at || row.dated || new Date().toISOString();
  const draft = (row.draft_response || row.response_text || '').trim();
  return {
    id: String(row.id),
    source: normalizeSource(row.platform || row.source),
    rating,
    body,
    author: (row.reviewer_name || row.author || 'Anonymous').slice(0, 80),
    dated,
    sentiment: classifySentiment(row.sentiment, rating),
    has_draft_response: draft.length > 0 || Boolean(row.responded_at),
  };
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                     */
/* ------------------------------------------------------------------ */

interface ReviewsSnapshot {
  rows: ReviewRowOut[];
  totalReviews: number;
  overallScore: number;
  unavailable: boolean;
}

async function fetchReviewsSnapshot(workspaceId: string): Promise<ReviewsSnapshot> {
  const supa = getServiceSupabase();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - LOOKBACK_DAYS);
  const startIso = start.toISOString();

  // The `reviews` table is proposed in the recon and may not exist yet. We use
  // `.from('reviews')` and treat any error (PostgREST PGRST205 = undefined
  // table, or otherwise) as "unavailable" so the UI surfaces the connect-GBP
  // empty state instead of a 500.
  const { data, error } = await supa
    .from('reviews')
    .select(
      'id, platform, rating, review_text, reviewer_name, posted_at, sentiment, draft_response, response_text, responded_at, created_at, workspace_id',
    )
    .eq('workspace_id', workspaceId)
    .gte('posted_at', startIso)
    .order('posted_at', { ascending: false })
    .limit(MAX_REVIEWS_RETURNED);

  if (error) {
    console.warn(
      `[saas-v2-reviews] reviews query failed (likely table missing): ${error.message}`,
    );
    return { rows: [], totalReviews: 0, overallScore: 0, unavailable: true };
  }

  const rows = (data || []).map((r) => normalizeRow(r as unknown as DbReviewRow));
  if (rows.length === 0) {
    return { rows: [], totalReviews: 0, overallScore: 0, unavailable: false };
  }

  // Compute overall score across the returned window (newest 25). This is the
  // intentional definition for the V2 surface — "your recent reputation".
  const sum = rows.reduce((s, r) => s + r.rating, 0);
  const overallScore = Math.round((sum / rows.length) * 10) / 10;

  return {
    rows,
    totalReviews: rows.length,
    overallScore,
    unavailable: false,
  };
}

interface CallActivitySnapshot {
  callsTotal: number;
  daysOfData: number;
}

async function fetchCallActivity(userId: string): Promise<CallActivitySnapshot> {
  const supa = getServiceSupabase();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - COLD_START_MIN_DAYS);
  const startIso = start.toISOString();

  const [{ data: metrics }, { data: callLogs }] = await Promise.all([
    supa
      .from('daily_metrics')
      .select('date, calls')
      .eq('user_id', userId)
      .gte('date', start.toISOString().split('T')[0]),
    supa
      .from('call_logs')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso),
  ]);

  const metricCalls = (metrics || []).reduce(
    (s, r) => s + (Number((r as { calls?: number }).calls) || 0),
    0,
  );
  const logCalls = (callLogs || []).length;
  const callsTotal = metricCalls || logCalls;
  const daysOfData = (metrics || []).length || (logCalls > 0 ? 1 : 0);

  return { callsTotal, daysOfData };
}

/* ------------------------------------------------------------------ */
/*  LLM narrative generation                                          */
/* ------------------------------------------------------------------ */

const NARRATIVE_SYSTEM_PROMPT = `You write a one-paragraph reputation snapshot for a local-service business owner (plumbers, dentists, law firms, HVAC, med spas).

Input: the workspace's recent reviews (source, rating, body, sentiment, date).
Output: ONE short paragraph (2-3 sentences, ~45 words max).

RULES:
- Lead with the overall vibe and the period ("Mostly 5-star this month", "Steady 4s across Google and Yelp").
- If there are any critical reviews, name the most common complaint pattern in plain English ("two reviews mentioned slow response time").
- No jargon ("sentiment score", "NPS"), no hedges ("appears to", "may indicate"), no passive voice.
- Use the second person ("your reviews", "your customers"). Address the owner.
- Never mention models, prompts, tokens, or AI mechanics.
- Return ONLY the paragraph as plain text — no JSON, no code fences, no labels.`;

async function generateSentimentNarrative(
  rows: ReviewRowOut[],
  overallScore: number,
): Promise<string> {
  if (rows.length === 0) return '';

  const positiveCount = rows.filter((r) => r.sentiment === 'positive').length;
  const criticalCount = rows.filter((r) => r.sentiment === 'critical').length;
  const neutralCount = rows.length - positiveCount - criticalCount;

  // Keep the prompt compact — only the fields the model needs.
  const userPrompt = JSON.stringify(
    {
      overall_score: overallScore,
      total_reviews: rows.length,
      counts: {
        positive: positiveCount,
        neutral: neutralCount,
        critical: criticalCount,
      },
      reviews: rows.slice(0, 15).map((r) => ({
        source: r.source,
        rating: r.rating,
        sentiment: r.sentiment,
        dated: r.dated,
        body: r.body.slice(0, 280),
      })),
    },
    null,
    2,
  );

  try {
    const raw = await chatCompletion(NARRATIVE_SYSTEM_PROMPT, userPrompt, {
      tier: 'heavy',
      maxTokens: 220,
    });
    const cleaned = raw
      .trim()
      .replace(/^```(?:\w+)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return cleaned.slice(0, 600);
  } catch (err) {
    console.warn('[saas-v2-reviews] narrative LLM failed:', err);
    // Deterministic fallback so the page never goes silent.
    if (criticalCount > 0) {
      return `${rows.length} recent reviews averaging ${overallScore.toFixed(
        1,
      )} stars. ${criticalCount} need a thoughtful reply — open them below to draft a response in one click.`;
    }
    return `${rows.length} recent reviews averaging ${overallScore.toFixed(
      1,
    )} stars — momentum looks healthy. Tap any review to draft a quick reply.`;
  }
}

/* ------------------------------------------------------------------ */
/*  Event emission (best-effort)                                      */
/* ------------------------------------------------------------------ */

async function emitReputationRendered(
  workspaceId: string,
  reviewsReturned: number,
  reviewsUnavailable: boolean,
  coldStart: boolean,
): Promise<void> {
  const supa = getServiceSupabase();
  const payload = {
    workspace_id: workspaceId,
    page: 'reputation',
    reviews_returned: reviewsReturned,
    reviews_unavailable: reviewsUnavailable,
    cold_start: coldStart,
    tier: 'sonnet' as const,
  };

  try {
    await supa.from('aios_event_log').insert({
      event_type: 'saas_v2_reputation_rendered',
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
      agent_name: 'saas-v2-reviews',
      type: 'saas_v2_reputation_rendered',
      severity: 'info',
      payload,
      why_explanation: 'V2 Reputation page rendered',
    });
  } catch {
    /* table may not exist yet — silent */
  }
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export const handler: Handler = async (event) => {
  const cors = {
    ...getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authResult = await resolveWorkspace(authHeader);
  if (authResult.ok !== true) {
    return {
      statusCode: authResult.status,
      headers: cors,
      body: JSON.stringify({ error: authResult.error }),
    };
  }

  const { userId, workspaceId } = authResult;
  const generatedAt = new Date().toISOString();

  let snapshot: ReviewsSnapshot;
  try {
    snapshot = await fetchReviewsSnapshot(workspaceId);
  } catch (err) {
    console.error('[saas-v2-reviews] snapshot fetch failed:', err);
    await emitReputationRendered(workspaceId, 0, true, false).catch(() => {});
    const body: ReviewsResponseBody = {
      sentiment_narrative: '',
      overall_score: 0,
      total_reviews: 0,
      reviews: [],
      total: 0,
      reviews_unavailable: true,
      reason: 'Reviews are not connected yet — link your Google Business Profile to begin.',
      generated_at: generatedAt,
    };
    return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
  }

  // Reviews source unavailable → "Connect Google Business Profile" empty state.
  if (snapshot.unavailable) {
    await emitReputationRendered(workspaceId, 0, true, false).catch(() => {});
    const body: ReviewsResponseBody = {
      sentiment_narrative: '',
      overall_score: 0,
      total_reviews: 0,
      reviews: [],
      total: 0,
      reviews_unavailable: true,
      reason:
        'Connect your Google Business Profile to start surfacing reviews here. Boltcall will summarize sentiment and draft replies you can send in one click.',
      generated_at: generatedAt,
    };
    return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
  }

  // Cold-start: if the workspace is brand new (no real call activity yet)
  // AND has no reviews, soft-gate with the unlock copy.
  if (snapshot.rows.length === 0) {
    let activity: CallActivitySnapshot = { callsTotal: 0, daysOfData: 0 };
    try {
      activity = await fetchCallActivity(userId);
    } catch {
      /* tolerate — already fall through to cold-start branch */
    }
    const cold =
      activity.callsTotal < COLD_START_MIN_CALLS || activity.daysOfData < COLD_START_MIN_DAYS;
    await emitReputationRendered(workspaceId, 0, false, cold).catch(() => {});
    const body: ReviewsResponseBody = {
      sentiment_narrative: '',
      overall_score: 0,
      total_reviews: 0,
      reviews: [],
      total: 0,
      cold_start: cold,
      reason: cold
        ? 'Reputation unlocks once Boltcall sees ~30 calls or 14 days of activity. Keep your agent running — new reviews appear here automatically.'
        : 'No reviews in the last 60 days yet. Once one comes in we will summarize it and pre-draft your reply.',
      generated_at: generatedAt,
    };
    return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
  }

  const sentimentNarrative = await generateSentimentNarrative(
    snapshot.rows,
    snapshot.overallScore,
  );

  await emitReputationRendered(workspaceId, snapshot.rows.length, false, false).catch(() => {});

  const body: ReviewsResponseBody = {
    sentiment_narrative: sentimentNarrative,
    overall_score: snapshot.overallScore,
    total_reviews: snapshot.totalReviews,
    reviews: snapshot.rows,
    total: snapshot.totalReviews,
    generated_at: generatedAt,
  };

  return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
};
