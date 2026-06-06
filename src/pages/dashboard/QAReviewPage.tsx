import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Check, Flag, RotateCcw, RefreshCw, Sparkles, TrendingDown,
  ThumbsUp, Lightbulb, AlertCircle, ShieldCheck, Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
type CallType = 'success' | 'failure';
type FilterTab = 'all' | 'pending' | 'failures' | 'successes';

interface RubricScore {
  label: string;
  passed: boolean;
  notes?: string;
}

interface QAReview {
  id: string;
  agent_id: string;
  call_id: string | null;
  heal_log_id: string | null;
  call_type: CallType;
  status: ReviewStatus;
  rubric_scores: Record<string, RubricScore> | null;
  overall_score: number | null;
  friction_score: number | null;
  auto_summary: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface SuccessInsight {
  id: string;
  friction_points: string[];
  positive_patterns: string[];
  improvement_suggestions: string[];
  friction_score: number;
}

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
}

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',  icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-300 border-green-500/30',    icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Reverted', color: 'bg-red-500/20 text-red-300 border-red-500/30',          icon: <XCircle className="w-3 h-3" /> },
  flagged:  { label: 'Flagged',  color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: <Flag className="w-3 h-3" /> },
};

export default function QAReviewPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<QAReview[]>([]);
  const [agents, setAgents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [insightCache, setInsightCache] = useState<Record<string, SuccessInsight | null>>({});
  const [insightLoading, setInsightLoading] = useState<Record<string, boolean>>({});

  // Flag action state
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagNotes, setFlagNotes] = useState('');

  // Action loading state
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadAgents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('agents')
      .select('id, name, retell_agent_id')
      .eq('user_id', user.id);
    if (data) {
      const map = new Map<string, string>();
      (data as Agent[]).forEach(a => {
        map.set(a.retell_agent_id, a.name);
        map.set(a.id, a.name);
      });
      setAgents(map);
    }
  }, [user]);

  const loadReviews = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qa_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setReviews((data || []) as QAReview[]);
    } catch (err) {
      showToast({ variant: 'error', message: 'Failed to load review queue' });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadAgents();
    loadReviews();
  }, [loadAgents, loadReviews]);

  const loadInsight = useCallback(async (reviewId: string) => {
    if (insightCache[reviewId] !== undefined || insightLoading[reviewId]) return;
    setInsightLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const { data } = await supabase
        .from('qa_success_insights')
        .select('id, friction_points, positive_patterns, improvement_suggestions, friction_score')
        .eq('qa_review_id', reviewId)
        .single();
      setInsightCache(prev => ({ ...prev, [reviewId]: (data as SuccessInsight) || null }));
    } catch {
      setInsightCache(prev => ({ ...prev, [reviewId]: null }));
    } finally {
      setInsightLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  }, [insightCache, insightLoading]);

  const toggleExpand = (review: QAReview) => {
    if (expandedId === review.id) {
      setExpandedId(null);
    } else {
      setExpandedId(review.id);
      if (review.call_type === 'success') loadInsight(review.id);
    }
  };

  const handleApprove = async (reviewId: string) => {
    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const { error } = await supabase
        .from('qa_reviews')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', reviewId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() } : r));
      showToast({ variant: 'success', message: 'Review approved' });
    } catch {
      showToast({ variant: 'error', message: 'Failed to approve review' });
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleRevert = async (review: QAReview) => {
    if (!review.heal_log_id) {
      showToast({ variant: 'error', message: 'No heal log linked to this review' });
      return;
    }
    setActionLoading(prev => ({ ...prev, [review.id]: true }));
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/agent-self-heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert-fix', healLogId: review.heal_log_id, userId: user!.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Revert failed');
      }
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'rejected', reviewed_at: new Date().toISOString() } : r));
      showToast({ variant: 'success', message: 'Fix reverted ג€” agent restored to original prompt' });
    } catch (err) {
      showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Revert failed' });
    } finally {
      setActionLoading(prev => ({ ...prev, [review.id]: false }));
    }
  };

  const handleFlag = async (reviewId: string) => {
    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const { error } = await supabase
        .from('qa_reviews')
        .update({ status: 'flagged', reviewer_notes: flagNotes, reviewed_at: new Date().toISOString() })
        .eq('id', reviewId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, status: 'flagged', reviewer_notes: flagNotes, reviewed_at: new Date().toISOString() }
        : r
      ));
      setFlaggingId(null);
      setFlagNotes('');
      showToast({ variant: 'success', message: 'Review flagged for follow-up' });
    } catch {
      showToast({ variant: 'error', message: 'Failed to flag review' });
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'pending')   return r.status === 'pending';
    if (filter === 'failures')  return r.call_type === 'failure';
    if (filter === 'successes') return r.call_type === 'success';
    return true;
  });

  const counts = {
    all:       reviews.length,
    pending:   reviews.filter(r => r.status === 'pending').length,
    failures:  reviews.filter(r => r.call_type === 'failure').length,
    successes: reviews.filter(r => r.call_type === 'success').length,
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: 'Pending' },
    { id: 'failures',  label: 'Failures' },
    { id: 'successes', label: 'Successes' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Queue</h1>
          <p className="text-sm text-gray-400 mt-1">
            Approve AI fixes, revert bad changes, or flag calls for follow-up
          </p>
        </div>
        <button
          onClick={loadReviews}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.id ? 'bg-white/20' : 'bg-white/10'
            }`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">No reviews in this category</p>
          <p className="text-gray-600 text-sm mt-1">
            Reviews are created automatically after each conversation
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map(review => {
              const agentName = agents.get(review.agent_id) || review.agent_id.slice(0, 12) + 'ג€¦';
              const isExpanded = expandedId === review.id;
              const isFlagging = flaggingId === review.id;
              const isActing = actionLoading[review.id];
              const isDone = review.status !== 'pending';
              const statusCfg = STATUS_CONFIG[review.status];

              return (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleExpand(review)}
                  >
                    {/* Type badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                      review.call_type === 'success'
                        ? 'bg-green-500/15 text-green-300 border-green-500/25'
                        : 'bg-red-500/15 text-red-300 border-red-500/25'
                    }`}>
                      {review.call_type === 'success'
                        ? <><CheckCircle2 className="w-3 h-3" /> Success</>
                        : <><XCircle className="w-3 h-3" /> Failure</>
                      }
                    </div>

                    {/* Agent */}
                    <span className="text-sm font-medium text-white truncate w-36 shrink-0">
                      {agentName}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-gray-500 shrink-0 w-28">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>

                    {/* Auto summary */}
                    <span className="text-sm text-gray-400 flex-1 truncate">
                      {review.auto_summary || 'ג€”'}
                    </span>

                    {/* Score */}
                    <div className="shrink-0 text-center w-16">
                      {review.call_type === 'failure' && review.overall_score != null && (
                        <span className={`text-sm font-semibold ${
                          review.overall_score >= 70 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {review.overall_score}%
                        </span>
                      )}
                      {review.call_type === 'success' && review.friction_score != null && (
                        <span className={`text-sm font-semibold ${
                          review.friction_score >= 6 ? 'text-orange-400' : 'text-gray-400'
                        }`}>
                          F{review.friction_score}/10
                        </span>
                      )}
                    </div>

                    {/* Status chip */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shrink-0 ${statusCfg.color}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </div>

                    {/* Expand icon */}
                    <div className="shrink-0 text-gray-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/10 p-4 bg-black/20 space-y-4">
                          {review.call_type === 'failure' ? (
                            <FailureDetail review={review} />
                          ) : (
                            <SuccessDetail
                              review={review}
                              insight={insightCache[review.id]}
                              insightLoading={insightLoading[review.id]}
                            />
                          )}

                          {/* Reviewer notes (flagged) */}
                          {review.status === 'flagged' && review.reviewer_notes && (
                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <p className="text-xs text-orange-400 font-medium mb-1">Flag note</p>
                              <p className="text-sm text-gray-300">{review.reviewer_notes}</p>
                            </div>
                          )}

                          {/* Flag input */}
                          {isFlagging && (
                            <div className="space-y-2">
                              <textarea
                                value={flagNotes}
                                onChange={e => setFlagNotes(e.target.value)}
                                placeholder="Add a note explaining why this is flaggedג€¦"
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFlag(review.id)}
                                  disabled={isActing}
                                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium disabled:opacity-50"
                                >
                                  Confirm Flag
                                </button>
                                <button
                                  onClick={() => { setFlaggingId(null); setFlagNotes(''); }}
                                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {!isDone && !isFlagging && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleApprove(review.id)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              {review.call_type === 'failure' && (
                                <button
                                  onClick={() => handleRevert(review)}
                                  disabled={isActing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Reject & Revert Fix
                                </button>
                              )}
                              <button
                                onClick={() => setFlaggingId(review.id)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/80 hover:bg-orange-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Flag
                              </button>
                              {isActing && (
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Sub-components for expanded rows

function FailureDetail({ review }: { review: QAReview }) {
  const rubricEntries = review.rubric_scores ? Object.entries(review.rubric_scores) : [];

  return (
    <div className="space-y-3">
      {review.auto_summary && (
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 mb-1">Summary</p>
            <p className="text-sm text-gray-300">{review.auto_summary}</p>
          </div>
        </div>
      )}

      {review.overall_score != null && (
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Heal pass rate</p>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    review.overall_score >= 70 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${review.overall_score}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${
                review.overall_score >= 70 ? 'text-green-400' : 'text-red-400'
              }`}>
                {review.overall_score}%
              </span>
            </div>
          </div>
        </div>
      )}

      {rubricEntries.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Rubric scores</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rubricEntries.map(([id, score]) => (
              <div key={id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                score.passed
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                {score.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                }
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{score.label}</p>
                  {score.notes && <p className="text-xs text-gray-500 mt-0.5">{score.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {review.call_id && (
        <p className="text-xs text-gray-600">Call ID: {review.call_id}</p>
      )}
    </div>
  );
}

function SuccessDetail({
  review,
  insight,
  insightLoading,
}: {
  review: QAReview;
  insight: SuccessInsight | null | undefined;
  insightLoading: boolean;
}) {
  if (insightLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
        Loading analysisג€¦
      </div>
    );
  }

  const frictionScore = insight?.friction_score ?? review.friction_score ?? 0;

  return (
    <div className="space-y-4">
      {frictionScore > 0 && (
        <div className="flex items-center gap-3">
          <TrendingDown className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Friction score</p>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    frictionScore >= 6 ? 'bg-orange-500' :
                    frictionScore >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${frictionScore * 10}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${
                frictionScore >= 6 ? 'text-orange-400' :
                frictionScore >= 3 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {frictionScore}/10
              </span>
            </div>
          </div>
        </div>
      )}

      {review.auto_summary && (
        <p className="text-sm text-gray-400">{review.auto_summary}</p>
      )}

      {insight ? (
        <>
          {insight.friction_points?.length > 0 && (
            <InsightSection
              icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
              title="Friction points"
              items={insight.friction_points}
              itemColor="text-orange-300"
            />
          )}
          {insight.positive_patterns?.length > 0 && (
            <InsightSection
              icon={<ThumbsUp className="w-3.5 h-3.5 text-green-400" />}
              title="What worked well"
              items={insight.positive_patterns}
              itemColor="text-green-300"
            />
          )}
          {insight.improvement_suggestions?.length > 0 && (
            <InsightSection
              icon={<Lightbulb className="w-3.5 h-3.5 text-indigo-400" />}
              title="Improvement suggestions"
              items={insight.improvement_suggestions}
              itemColor="text-indigo-300"
            />
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Sparkles className="w-4 h-4" />
          No detailed insight available for this call
        </div>
      )}
    </div>
  );
}

function InsightSection({
  icon, title, items, itemColor,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  itemColor: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-xs font-medium text-gray-400">{title}</p>
      </div>
      <ul className="space-y-1 pl-2">
        {items.map((item, i) => (
          <li key={i} className={`text-sm flex items-start gap-1.5 ${itemColor}`}>
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
