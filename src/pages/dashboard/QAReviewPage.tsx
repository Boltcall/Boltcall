import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, Flag, RotateCcw, RefreshCw, Sparkles, TrendingDown, ThumbsUp,
  Lightbulb, AlertTriangle, AlertCircle, Loader2, PhoneCall, ClipboardCheck, Wrench, ShieldCheck,
  CalendarRange, FlaskConical, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';
import { useIndustry } from '../../hooks/useIndustry';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
type HealStatus = 'pending_approval' | 'fixed' | 'rejected' | 'reverted' | 'failed' | string;
type Tab = 'review' | 'applied' | 'history' | 'insights';

interface QAReview {
  id: string;
  agent_id: string;
  call_id: string | null;
  heal_log_id: string | null;
  call_type: 'success' | 'failure';
  status: ReviewStatus;
  friction_score: number | null;
  auto_summary: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// agent_self_heal_log row behind a suggestion (never select original_prompt: it is large).
interface HealLog {
  id: string;
  failure_type: string | null;
  failure_summary: string | null;
  root_cause: string | null;
  severity: string | null;
  prompt_fix_applied: string | null;
  fix_pass_count: number | null;
  fix_total_runs: number | null;
  status: HealStatus | null;
}

interface SuccessInsight {
  id: string;
  friction_points: string[];
  positive_patterns: string[];
  improvement_suggestions: string[];
  friction_score: number;
}

// Where a review lives: a suggestion waiting on the owner, a fix that is live on the agent,
// a past decision, or a note about a call that went fine.
function bucketOf(r: QAReview, h?: HealLog): Tab {
  if (r.call_type === 'success') return 'insights';
  if (h?.status === 'fixed') return 'applied';
  if (h?.status === 'pending_approval' && (r.status === 'pending' || r.status === 'flagged')) return 'review';
  return 'history';
}

const card = 'rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114]';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111114]';
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function selfHeal(body: Record<string, string>) {
  const res = await authedFetch(`${FUNCTIONS_BASE}/agent-self-heal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || 'Request failed', res.status);
  return json as { success: boolean; status?: string; applied?: boolean };
}

export default function QAReviewPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { words } = useIndustry();

  const [reviews, setReviews] = useState<QAReview[]>([]);
  const [heals, setHeals] = useState<Map<string, HealLog>>(new Map());
  const [agents, setAgents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>('review');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [{ data: agentRows }, { data: reviewRows, error }] = await Promise.all([
        supabase.from('agents').select('id, name, retell_agent_id').eq('user_id', user.id),
        supabase.from('qa_reviews').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
      ]);
      if (error) throw error;

      const names = new Map<string, string>();
      (agentRows || []).forEach((a: { id: string; name: string; retell_agent_id: string }) => {
        names.set(a.retell_agent_id, a.name);
        names.set(a.id, a.name);
      });
      setAgents(names);

      const rows = (reviewRows || []) as QAReview[];
      const healIds = [...new Set(rows.map((r) => r.heal_log_id).filter((id): id is string => !!id))];
      const healMap = new Map<string, HealLog>();
      if (healIds.length) {
        const { data: healRows, error: healErr } = await supabase
          .from('agent_self_heal_log')
          .select('id, failure_type, failure_summary, root_cause, severity, prompt_fix_applied, fix_pass_count, fix_total_runs, status')
          .in('id', healIds);
        if (healErr) throw healErr;
        (healRows || []).forEach((h) => healMap.set(h.id, h as HealLog));
      }
      setHeals(healMap);
      setReviews(rows);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const buckets = useMemo(() => {
    const out: Record<Tab, QAReview[]> = { review: [], applied: [], history: [], insights: [] };
    reviews.forEach((r) => out[bucketOf(r, r.heal_log_id ? heals.get(r.heal_log_id) : undefined)].push(r));
    return out;
  }, [reviews, heals]);

  const patch = (reviewId: string, review: Partial<QAReview>, healStatus?: HealStatus) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...review } : r)));
    const healId = reviews.find((r) => r.id === reviewId)?.heal_log_id;
    if (healStatus && healId) {
      setHeals((prev) => {
        const next = new Map(prev);
        const h = next.get(healId);
        if (h) next.set(healId, { ...h, status: healStatus });
        return next;
      });
    }
  };

  // One runner for every decision: busy state, 409 handling, toast.
  const run = async (reviewId: string, job: () => Promise<void>, failMessage: string) => {
    setBusyId(reviewId);
    try {
      await job();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast({ variant: 'error', message: 'This suggestion was already decided. Refreshing the list.' });
        void load();
      } else {
        showToast({ variant: 'error', message: err instanceof Error && err.message ? err.message : failMessage });
      }
    } finally {
      setBusyId(null);
    }
  };

  const approve = (r: QAReview) =>
    run(r.id, async () => {
      const res = await selfHeal({ action: 'approve-fix', reviewId: r.id, userId: user!.id });
      patch(r.id, { status: 'approved', reviewed_at: new Date().toISOString() }, res.applied ? 'fixed' : undefined);
      showToast({ variant: 'success', message: res.applied ? 'Applied. Your agent now uses this change.' : 'Approved.' });
    }, 'Could not apply this change. Nothing was changed on your agent.');

  const reject = (r: QAReview) =>
    run(r.id, async () => {
      await selfHeal({ action: 'reject-fix', reviewId: r.id, userId: user!.id });
      patch(r.id, { status: 'rejected', reviewed_at: new Date().toISOString() }, 'rejected');
      showToast({ variant: 'success', message: 'Rejected. Your agent was not changed.' });
    }, 'Could not reject this suggestion.');

  const revert = (r: QAReview) =>
    run(r.id, async () => {
      await selfHeal({ action: 'revert-fix', healLogId: r.heal_log_id!, userId: user!.id });
      patch(r.id, { status: 'rejected', reviewed_at: new Date().toISOString() }, 'reverted');
      showToast({ variant: 'success', message: 'Reverted. Your agent is back to its earlier instructions.' });
    }, 'Could not revert this change.');

  const flag = (r: QAReview, notes: string) =>
    run(r.id, async () => {
      const { error } = await supabase
        .from('qa_reviews')
        .update({ status: 'flagged', reviewer_notes: notes, reviewed_at: new Date().toISOString() })
        .eq('id', r.id)
        .eq('user_id', user!.id);
      if (error) throw error;
      patch(r.id, { status: 'flagged', reviewer_notes: notes });
      showToast({ variant: 'success', message: 'Flagged for follow-up. It stays in your list.' });
    }, 'Could not flag this suggestion.');

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'review', label: 'To review' },
    { id: 'applied', label: 'Applied' },
    { id: 'history', label: 'History' },
    { id: 'insights', label: 'Call insights' },
  ];
  const list = buckets[tab];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          We analyze your {words.calls} and suggest changes to your agent&rsquo;s instructions. Nothing changes on your live agent until you approve it.
        </p>
        <button
          onClick={() => void load()}
          disabled={loading}
          className={`shrink-0 inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-[#2a2a30] px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#17171b] disabled:opacity-50 transition-colors duration-200 ease-out ${focusRing}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div role="tablist" aria-label="Improvement categories" className="flex w-full sm:w-fit gap-1 overflow-x-auto rounded-xl bg-gray-100 dark:bg-[#17171b] p-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          const count = buckets[t.id].length;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls="improvements-panel"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ease-out ${focusRing} ${
                active
                  ? 'bg-white dark:bg-[#111114] text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              <span
                className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${
                  t.id === 'review' && count > 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200/70 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="improvements-panel" aria-labelledby={`tab-${tab}`} className="space-y-3">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading suggestions">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-gray-100 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className={`${card} p-6 flex items-start gap-3`} role="alert">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Couldn&rsquo;t load your suggestions</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Check your connection and try again.</p>
            </div>
            <button
              onClick={() => void load()}
              className={`rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 ease-out ${focusRing}`}
            >
              Try again
            </button>
          </div>
        ) : list.length === 0 ? (
          <EmptyPanel tab={tab} callWord={words.call} />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((r) => {
              const heal = r.heal_log_id ? heals.get(r.heal_log_id) : undefined;
              const agentName = agents.get(r.agent_id) || 'Your agent';
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === 'insights' ? (
                    <InsightRow review={r} agentName={agentName} />
                  ) : (
                    <SuggestionCard
                      review={r}
                      heal={heal}
                      agentName={agentName}
                      bucket={tab}
                      busy={busyId === r.id}
                      onApprove={() => approve(r)}
                      onReject={() => reject(r)}
                      onRevert={() => revert(r)}
                      onFlag={(notes) => flag(r, notes)}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

const SEVERITY: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
  low: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#17171b] dark:text-gray-400 dark:border-[#2a2a30]',
};

function historyChip(r: QAReview, h?: HealLog) {
  if (h?.status === 'reverted') return { label: 'Reverted', tone: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-white/10', icon: <RotateCcw className="w-3 h-3" aria-hidden="true" /> };
  if (h?.status === 'failed') return { label: 'Did not pass testing', tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30', icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" /> };
  if (r.status === 'rejected' || h?.status === 'rejected') return { label: 'Rejected', tone: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/30', icon: <XCircle className="w-3 h-3" aria-hidden="true" /> };
  if (r.status === 'approved') return { label: 'Approved', tone: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/30', icon: <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> };
  return { label: 'Reviewed', tone: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-white/10', icon: <Clock className="w-3 h-3" aria-hidden="true" /> };
}

function SuggestionCard({
  review, heal, agentName, bucket, busy, onApprove, onReject, onRevert, onFlag,
}: {
  review: QAReview;
  heal?: HealLog;
  agentName: string;
  bucket: Tab;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevert: () => void;
  onFlag: (notes: string) => void;
}) {
  const [flagging, setFlagging] = useState(false);
  const [notes, setNotes] = useState('');

  const wrong = heal?.failure_summary || review.auto_summary;
  const fixLines = (heal?.prompt_fix_applied || '').split('\n').filter((l) => l.trim());
  const tested = (heal?.fix_total_runs ?? 0) > 0 && heal?.failure_type !== 'recurring_pattern';
  const passed = heal?.fix_pass_count ?? 0;
  const total = heal?.fix_total_runs ?? 0;
  const severity = (heal?.severity || '').toLowerCase();
  const chip = bucket === 'history' ? historyChip(review, heal) : null;

  return (
    <article className={`${card} p-4 md:p-5`}>
      <div className="flex flex-wrap items-center gap-2">
        {severity && SEVERITY[severity] && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY[severity]}`}>
            {severity} priority
          </span>
        )}
        {bucket === 'applied' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Live on your agent
          </span>
        )}
        {review.status === 'flagged' && bucket === 'review' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
            <Flag className="w-3 h-3" aria-hidden="true" /> Flagged
          </span>
        )}
        {chip && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${chip.tone}`}>
            {chip.icon} {chip.label}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {agentName} &middot; {fmtDate(review.created_at)}
        </span>
      </div>

      {wrong && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">What went wrong</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{wrong}</p>
        </div>
      )}

      {heal?.root_cause && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {heal.failure_type === 'recurring_pattern' ? 'What the pattern looks like' : 'Why it happened'}
          </h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{heal.root_cause}</p>
        </div>
      )}

      {fixLines.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Proposed change to your agent&rsquo;s instructions
          </h3>
          <div className="mt-1.5 overflow-hidden rounded-lg border border-green-200 dark:border-green-900/60 bg-green-50/40 dark:bg-green-950/20">
            <p className="border-b border-green-200 dark:border-green-900/60 px-3 py-1.5 text-xs font-medium text-green-800 dark:text-green-300">
              Added as a new section. Your existing instructions stay as they are.
            </p>
            <div className="max-h-56 overflow-y-auto py-1.5 font-mono text-[13px] leading-relaxed">
              {fixLines.map((line, i) => (
                <div key={i} className="flex gap-2 px-3">
                  <span className="select-none text-green-600 dark:text-green-400" aria-hidden="true">+</span>
                  <span className="min-w-0 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {heal && (
        <p className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          {tested ? (
            <>
              <FlaskConical className={`mt-0.5 w-4 h-4 shrink-0 ${passed === total ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} aria-hidden="true" />
              <span>
                Test-run on simulated calls: passed <strong className="font-semibold text-gray-900 dark:text-gray-100">{passed} of {total}</strong>.
              </span>
            </>
          ) : (
            <>
              <CalendarRange className="mt-0.5 w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>
                From this week&rsquo;s pattern analysis across several calls. It was not test-run, so read it before you approve.
              </span>
            </>
          )}
        </p>
      )}

      {review.status === 'flagged' && review.reviewer_notes && (
        <p className="mt-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-orange-700 dark:text-orange-300">Your note: </span>
          {review.reviewer_notes}
        </p>
      )}

      {flagging && (
        <div className="mt-4 space-y-2">
          <label htmlFor={`flag-${review.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Note for follow-up
          </label>
          <textarea
            id={`flag-${review.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="What should be checked before this goes live?"
            className="w-full resize-none rounded-lg border border-gray-300 dark:border-[#2a2a30] bg-white dark:bg-[#17171b] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onFlag(notes.trim()); setFlagging(false); setNotes(''); }}
              disabled={busy}
              className={`rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-sm font-semibold text-white dark:text-gray-900 disabled:opacity-50 ${focusRing}`}
            >
              Save flag
            </button>
            <button
              onClick={() => { setFlagging(false); setNotes(''); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#17171b] ${focusRing}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bucket === 'review' && !flagging && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-[#1e1e24] pt-4">
          <button
            onClick={onApprove}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors duration-200 ease-out ${focusRing}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
            Approve and apply
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className={`rounded-lg border border-gray-300 dark:border-[#2a2a30] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#17171b] disabled:opacity-60 transition-colors duration-200 ease-out ${focusRing}`}
          >
            Reject
          </button>
          {review.status !== 'flagged' && (
            <button
              onClick={() => setFlagging(true)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-60 transition-colors duration-200 ease-out ${focusRing}`}
            >
              <Flag className="w-4 h-4" aria-hidden="true" /> Flag for later
            </button>
          )}
          <p className="w-full sm:w-auto sm:ml-auto text-xs text-gray-500 dark:text-gray-400">
            Applies to your live agent right away. You can revert it any time.
          </p>
        </div>
      )}

      {bucket === 'applied' && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-[#1e1e24] pt-4">
          <button
            onClick={onRevert}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-[#2a2a30] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#17171b] disabled:opacity-60 transition-colors duration-200 ease-out ${focusRing}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-4 h-4" aria-hidden="true" />}
            Revert this change
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Restores your agent&rsquo;s instructions to how they were before this change.</p>
        </div>
      )}
    </article>
  );
}

// ─── Call insights (calls that went fine, with friction notes) ────────────────

function InsightRow({ review, agentName }: { review: QAReview; agentName: string }) {
  const [open, setOpen] = useState(false);
  const [insight, setInsight] = useState<SuccessInsight | null | undefined>(undefined);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && insight === undefined) {
      setLoadingInsight(true);
      const { data } = await supabase
        .from('qa_success_insights')
        .select('id, friction_points, positive_patterns, improvement_suggestions, friction_score')
        .eq('qa_review_id', review.id)
        .maybeSingle();
      setInsight((data as SuccessInsight) || null);
      setLoadingInsight(false);
    }
  };

  const friction = insight?.friction_score ?? review.friction_score ?? 0;

  return (
    <div className={card}>
      <button
        onClick={() => void toggle()}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out ${focusRing}`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{review.auto_summary || 'Call completed'}</span>
        <span className="hidden sm:block shrink-0 text-xs text-gray-500 dark:text-gray-400">{agentName} &middot; {fmtDate(review.created_at)}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 dark:border-[#1e1e24] p-4">
          {loadingInsight ? (
            <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading analysis
            </p>
          ) : (
            <>
              {friction > 0 && (
                <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <TrendingDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  Friction score <strong className="font-semibold tabular-nums">{friction}/10</strong>
                </p>
              )}
              {insight ? (
                <>
                  <InsightList icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />} title="Friction points" items={insight.friction_points} />
                  <InsightList icon={<ThumbsUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />} title="What worked well" items={insight.positive_patterns} />
                  <InsightList icon={<Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />} title="Ideas to improve" items={insight.improvement_suggestions} />
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> No detailed analysis for this call.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InsightList({ icon, title, items }: { icon: React.ReactNode; title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
        <span aria-hidden="true">{icon}</span> {title}
      </p>
      <ul className="mt-1.5 space-y-1 pl-5 list-disc text-sm text-gray-700 dark:text-gray-300 marker:text-gray-400">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyPanel({ tab, callWord }: { tab: Tab; callWord: string }) {
  if (tab !== 'review') {
    const copy: Record<Exclude<Tab, 'review'>, { title: string; body: string }> = {
      applied: { title: 'Nothing applied yet', body: 'Changes you approve go live on your agent and show up here, each with a Revert button.' },
      history: { title: 'No past decisions yet', body: 'Suggestions you reject, revert, or that did not pass testing are kept here.' },
      insights: { title: 'No call insights yet', body: 'Notes on calls that went well, with small things to polish, appear here after calls are analyzed.' },
    };
    const c = copy[tab];
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2a2a30] px-6 py-12 text-center">
        <ShieldCheck className="mx-auto w-8 h-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{c.title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">{c.body}</p>
      </div>
    );
  }

  const steps = [
    { icon: PhoneCall, title: `A ${callWord} is answered`, body: 'Your agent handles it as usual.' },
    { icon: ClipboardCheck, title: 'The call is scored', body: 'You get a report on every answered call.' },
    { icon: Wrench, title: 'A fix is drafted', body: 'When a call goes wrong, or a problem repeats in a week.' },
    { icon: CheckCircle2, title: 'You decide', body: 'Approve to apply it, reject to discard it.' },
  ];

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2a2a30] px-5 py-10 md:px-8">
      <div className="text-center">
        <Sparkles className="mx-auto w-8 h-8 text-blue-600" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">No suggestions waiting</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-gray-600 dark:text-gray-400">
          Suggestions appear after real calls are analyzed. Once your agent has handled a few calls, anything worth fixing lands here for your approval.
        </p>
      </div>
      <ol className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 sm:block sm:text-center">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white dark:bg-[#17171b] shadow-sm ring-1 ring-gray-200 dark:ring-[#2a2a30] sm:mx-auto">
              <s.icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
            </span>
            <div className="sm:mt-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className="text-gray-400 tabular-nums">{i + 1}. </span>{s.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <Link
          to="/dashboard/conversations/calls"
          className={`inline-block rounded-lg border border-gray-300 dark:border-[#2a2a30] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out ${focusRing}`}
        >
          See call reports
        </Link>
      </div>
    </div>
  );
}
