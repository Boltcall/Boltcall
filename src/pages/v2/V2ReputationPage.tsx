import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Send,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReviewSource = 'google' | 'yelp' | 'facebook' | 'trustpilot' | 'other';
type ReviewSentiment = 'positive' | 'neutral' | 'critical';
type ResponseTone = 'warm' | 'professional' | 'apologetic';

interface ReviewRow {
  id: string;
  source: ReviewSource;
  rating: number;
  body: string;
  author: string;
  dated: string;
  sentiment: ReviewSentiment;
  has_draft_response: boolean;
}

interface ReviewsResponse {
  sentiment_narrative: string;
  overall_score: number;
  total_reviews: number;
  reviews: ReviewRow[];
  total: number;
  reviews_unavailable?: boolean;
  cold_start?: boolean;
  reason?: string;
  generated_at?: string;
}

interface DraftResponseBody {
  draft: string;
  tone: ResponseTone;
  reasoning_oneliner: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_LABEL: Record<ReviewSource, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
  trustpilot: 'Trustpilot',
  other: 'Review',
};

const SOURCE_PILL: Record<ReviewSource, string> = {
  google: 'bg-blue-50 text-blue-700 border-blue-100',
  yelp: 'bg-rose-50 text-rose-700 border-rose-100',
  facebook: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  trustpilot: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  other: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const SENTIMENT_CHIP: Record<ReviewSentiment, { cls: string; label: string; Icon: typeof ThumbsUp }> = {
  positive: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Positive', Icon: ThumbsUp },
  neutral: { cls: 'bg-zinc-100 text-zinc-700 border-zinc-200', label: 'Neutral', Icon: Minus },
  critical: { cls: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Critical', Icon: ThumbsDown },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function scoreColor(score: number): string {
  if (score >= 4.5) return 'text-emerald-600';
  if (score >= 3.8) return 'text-blue-600';
  if (score >= 3.0) return 'text-amber-600';
  return 'text-rose-600';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const StarRow: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const px = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${px} ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`}
        />
      ))}
    </div>
  );
};

const SentimentCard: React.FC<{
  overallScore: number;
  totalReviews: number;
  narrative: string;
  loading: boolean;
}> = ({ overallScore, totalReviews, narrative, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col md:flex-row md:items-start gap-6"
  >
    <div className="flex-shrink-0 flex flex-col items-start md:items-center md:border-r md:border-zinc-100 md:pr-6 md:min-w-[140px]">
      <div className={`text-4xl font-semibold ${scoreColor(overallScore)} leading-none`}>
        {overallScore.toFixed(1)}
      </div>
      <div className="mt-2">
        <StarRow rating={Math.round(overallScore)} size="md" />
      </div>
      <div className="text-xs text-zinc-500 mt-1.5">
        {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-brand-blue" />
        <h2 className="text-sm font-semibold text-zinc-900">Reputation snapshot</h2>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-zinc-100 rounded w-11/12 animate-pulse" />
          <div className="h-3 bg-zinc-100 rounded w-9/12 animate-pulse" />
          <div className="h-3 bg-zinc-100 rounded w-10/12 animate-pulse" />
        </div>
      ) : (
        <p className="text-sm text-zinc-700 leading-relaxed">{narrative}</p>
      )}
    </div>
  </motion.div>
);

const ReviewRowCard: React.FC<{
  review: ReviewRow;
  onOpen: (review: ReviewRow) => void;
}> = ({ review, onOpen }) => {
  const chip = SENTIMENT_CHIP[review.sentiment];
  const SentimentIcon = chip.Icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(review)}
      className="w-full text-left rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${SOURCE_PILL[review.source]}`}
            >
              {SOURCE_LABEL[review.source]}
            </span>
            <StarRow rating={review.rating} />
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${chip.cls}`}
            >
              <SentimentIcon className="w-3 h-3" />
              {chip.label}
            </span>
            <span className="text-[11px] text-zinc-400 ml-auto">{formatDate(review.dated)}</span>
          </div>
          <p className="text-sm text-zinc-700 leading-relaxed line-clamp-2">{review.body}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 truncate">— {review.author}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue">
              {review.has_draft_response ? 'View draft' : 'Draft response'}
              <Send className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

const EmptyState: React.FC<{ unavailable?: boolean; reason?: string }> = ({
  unavailable,
  reason,
}) => (
  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
    <Star className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-zinc-900 mb-1">
      {unavailable ? 'Connect Google Business Profile' : 'No reviews yet'}
    </h3>
    <p className="text-sm text-zinc-600 max-w-md mx-auto mb-4">
      {reason ||
        (unavailable
          ? 'Reputation surfaces light up once Boltcall is connected to your Google Business Profile. We will pull recent reviews, score sentiment, and pre-draft responses you can send in one click.'
          : 'Reviews you receive on Google, Yelp, or Facebook will appear here. Boltcall will summarize sentiment and draft a reply you can send with one tap.')}
    </p>
    {unavailable && (
      <a
        href="https://www.google.com/business/"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue/80"
      >
        Open Google Business Profile
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Drawer                                                             */
/* ------------------------------------------------------------------ */

const ReviewDrawer: React.FC<{
  review: ReviewRow | null;
  onClose: () => void;
}> = ({ review, onClose }) => {
  const [tone, setTone] = useState<ResponseTone>('professional');
  const [draft, setDraft] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<boolean>(false);
  const [sentStub, setSentStub] = useState<boolean>(false);

  const reviewId = review?.id;

  const fetchDraft = useCallback(
    async (nextTone: ResponseTone) => {
      if (!reviewId) return;
      setLoading(true);
      setError(null);
      setEdited(false);
      setSentStub(false);
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-review-draft-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_id: reviewId, tone: nextTone }),
        });
        if (!res.ok) {
          setError(`Draft engine unavailable (${res.status}).`);
          setDraft('');
          setReasoning('');
          return;
        }
        const data = (await res.json()) as DraftResponseBody;
        setDraft(typeof data.draft === 'string' ? data.draft : '');
        setReasoning(typeof data.reasoning_oneliner === 'string' ? data.reasoning_oneliner : '');
      } catch {
        setError('Draft engine unavailable.');
        setDraft('');
        setReasoning('');
      } finally {
        setLoading(false);
      }
    },
    [reviewId],
  );

  useEffect(() => {
    if (!reviewId) return;
    setTone('professional');
    void fetchDraft('professional');
  }, [reviewId, fetchDraft]);

  const onToneChange = (nextTone: ResponseTone) => {
    if (nextTone === tone) return;
    setTone(nextTone);
    void fetchDraft(nextTone);
  };

  const handleSendStub = () => {
    setSentStub(true);
  };

  return (
    <AnimatePresence>
      {review && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-zinc-900/30 z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white border-l border-zinc-200 z-50 flex flex-col shadow-xl"
            role="dialog"
            aria-label="Review and draft response"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${SOURCE_PILL[review.source]}`}
                  >
                    {SOURCE_LABEL[review.source]}
                  </span>
                  <StarRow rating={review.rating} size="md" />
                </div>
                <div className="text-xs text-zinc-500">
                  {review.author} • {formatDate(review.dated)}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                  Full review
                </h3>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {review.body}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Tone
                  </h3>
                  {reasoning && !loading && !error && (
                    <span className="text-[11px] text-zinc-400 truncate max-w-[60%]">
                      {reasoning}
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center bg-zinc-100 rounded-lg p-0.5">
                  {(['warm', 'professional', 'apologetic'] as ResponseTone[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onToneChange(t)}
                      disabled={loading}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        tone === t
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-700'
                      } disabled:opacity-60`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                  AI-drafted response
                </h3>
                {loading && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Drafting a {tone} response…
                  </div>
                )}
                {!loading && error && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">{error}</div>
                  </div>
                )}
                {!loading && !error && (
                  <textarea
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setEdited(true);
                    }}
                    rows={8}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue resize-y"
                    placeholder="Your reply will appear here…"
                  />
                )}
                {edited && !loading && !error && (
                  <p className="text-[11px] text-zinc-400 mt-1">Edited from the AI draft.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 p-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-md"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendStub}
                disabled={loading || !draft.trim() || sentStub}
                className="inline-flex items-center gap-1.5 bg-brand-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {sentStub ? 'Queued (stub)' : 'Send reply'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const V2ReputationPageInner: React.FC = () => {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<ReviewRow | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-reviews`, { method: 'GET' });
        if (!res.ok) {
          if (!aborted) setError(`Reputation engine unavailable (${res.status}).`);
          return;
        }
        const json = (await res.json()) as ReviewsResponse;
        if (!aborted) setData(json);
      } catch {
        if (!aborted) setError('Reputation engine unavailable.');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const reviews = useMemo(() => data?.reviews ?? [], [data]);
  const showEmpty =
    !loading &&
    !error &&
    (data?.reviews_unavailable === true || data?.cold_start === true || reviews.length === 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Reputation</h1>
        <p className="text-sm text-zinc-600 mt-1">
          A live read on what people are saying — plus an AI draft reply for every review.
        </p>
      </div>

      {/* Sentiment summary card */}
      {!error && (
        <SentimentCard
          overallScore={data?.overall_score ?? 0}
          totalReviews={data?.total_reviews ?? 0}
          narrative={
            data?.sentiment_narrative ||
            (loading ? '' : 'Connect a review source to see your reputation snapshot here.')
          }
          loading={loading}
        />
      )}

      {/* Error banner */}
      {!loading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">{error}</div>
        </div>
      )}

      {/* Review list */}
      {!error && (
        <section className="flex flex-col gap-3">
          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 animate-pulse"
                >
                  <div className="h-3 w-1/2 bg-zinc-100 rounded mb-2" />
                  <div className="h-3 w-11/12 bg-zinc-100 rounded mb-1.5" />
                  <div className="h-3 w-9/12 bg-zinc-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {showEmpty && (
            <EmptyState
              unavailable={data?.reviews_unavailable === true}
              reason={data?.reason}
            />
          )}

          {!loading &&
            !showEmpty &&
            reviews.map((r) => (
              <ReviewRowCard key={r.id} review={r} onOpen={setActiveReview} />
            ))}
        </section>
      )}

      {/* Drawer */}
      <ReviewDrawer review={activeReview} onClose={() => setActiveReview(null)} />
    </div>
  );
};

// The V2OptInGate wrapper is applied by the parent /v2 route in AppRoutes.tsx —
// double-wrapping caused a nested loading flash. Export the inner component directly.
export default V2ReputationPageInner;
