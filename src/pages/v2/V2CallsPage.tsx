/**
 * V2 Calls Page — /v2/calls
 *
 * Renders inside the /v2 shell (DashboardLayoutV2 + V2OptInGate are provided
 * by the parent Route in AppRoutes.tsx). This file owns ONLY the page content:
 *
 *   - Filter bar (status, date range, vertical, "went sideways" toggle)
 *   - Calls table with caller, status pill, started_at, duration, AI one-liner, QA badge
 *   - Right-side Drawer on row click: collapsible transcript, QA breakdown,
 *     "Why this went sideways" narrative
 *
 * All data flows through the JWT-scoped Netlify functions:
 *   GET /.netlify/functions/saas-v2-calls         (list)
 *   GET /.netlify/functions/saas-v2-call-detail   (drawer)
 *
 * Cold-start guard: if the workspace has fewer than 30 calls OR less than
 * 14 days of call history, we render the "Insights unlock at 30 calls"
 * placeholder per plan v7. The smart "sideways" filter and AI summaries
 * stay enabled — the cold-start banner is informational.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter as FilterIcon,
  Loader2,
  Phone,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

// ── Types ────────────────────────────────────────────────────────────────
type CallRow = {
  id: string;
  caller: string;
  status: string;
  started_at: string;
  duration_sec: number;
  ai_summary: string;
  qa_score?: number | null;
  sideways_flag: boolean;
  sideways_reason?: string | null;
};

type ListResponse = {
  calls: CallRow[];
  total: number;
  page: number;
  limit: number;
  sideways_count?: number;
};

type TranscriptTurn = { role: string; content: string; ts?: string | null };

type QaBreakdown = {
  score: number;
  rubric_name?: string;
  criteria: Array<{
    name: string;
    score: number;
    weight?: number;
    passed?: boolean;
    notes?: string;
  }>;
};

type DetailResponse = {
  call: CallRow;
  transcript: TranscriptTurn[];
  qa_breakdown?: QaBreakdown | null;
  sideways_narrative?: string | null;
};

// ── Verticals (mirrors industry presets used elsewhere in the app) ───────
const VERTICALS = [
  { value: 'all', label: 'All verticals' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'dental', label: 'Dental' },
  { value: 'medspa', label: 'Med spa' },
  { value: 'legal', label: 'Legal' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'booked', label: 'Booked' },
  { value: 'ended', label: 'Ended' },
  { value: 'error', label: 'Error' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
];

// ── Helpers ──────────────────────────────────────────────────────────────
function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatStarted(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function statusPillClasses(status: string): string {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  switch (status) {
    case 'booked':
      return `${base} bg-emerald-100 text-emerald-800`;
    case 'ended':
      return `${base} bg-slate-100 text-slate-700`;
    case 'error':
      return `${base} bg-rose-100 text-rose-800`;
    case 'no_answer':
    case 'voicemail':
      return `${base} bg-amber-100 text-amber-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function qaScoreBadgeClasses(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

// ── Filter bar ───────────────────────────────────────────────────────────
type Filters = {
  status: string;
  date_from: string;
  date_to: string;
  vertical: string;
  sideways: boolean;
  search: string;
};

const INITIAL_FILTERS: Filters = {
  status: 'all',
  date_from: '',
  date_to: '',
  vertical: 'all',
  sideways: false,
  search: '',
};

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  sidewaysCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, sidewaysCount }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
        <FilterIcon size={16} />
        Filters
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search caller or summary"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Vertical */}
        <select
          value={filters.vertical}
          onChange={(e) => onChange({ ...filters, vertical: e.target.value })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {VERTICALS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>

        {/* Date from */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sideways smart filter */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onChange({ ...filters, sideways: !filters.sideways })}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            filters.sideways
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle size={14} />
          Calls that went sideways
          {sidewaysCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-semibold">
              {sidewaysCount}
            </span>
          )}
        </button>

        {(filters.status !== 'all' ||
          filters.vertical !== 'all' ||
          filters.date_from ||
          filters.date_to ||
          filters.search ||
          filters.sideways) && (
          <button
            type="button"
            onClick={() => onChange(INITIAL_FILTERS)}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

// ── Transcript viewer (collapsible by turn group) ────────────────────────
interface TranscriptViewerProps {
  turns: TranscriptTurn[];
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ turns }) => {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!turns || turns.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic py-4">No transcript available for this call.</div>
    );
  }

  // Group consecutive turns by speaker for cleaner collapsing
  const groups: Array<{ role: string; turns: TranscriptTurn[] }> = [];
  for (const t of turns) {
    const last = groups[groups.length - 1];
    if (last && last.role === t.role) {
      last.turns.push(t);
    } else {
      groups.push({ role: t.role, turns: [t] });
    }
  }

  return (
    <div className="space-y-2">
      {groups.map((g, i) => {
        const isCollapsed = !!collapsed[i];
        const isAgent = g.role === 'agent' || g.role === 'assistant';
        return (
          <div
            key={i}
            className={`rounded-lg border ${
              isAgent ? 'border-blue-100 bg-blue-50/40' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setCollapsed({ ...collapsed, [i]: !isCollapsed })}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {isAgent ? 'Agent' : g.role === 'user' ? 'Caller' : g.role}
                <span className="text-slate-400 font-normal normal-case">
                  · {g.turns.length} turn{g.turns.length === 1 ? '' : 's'}
                </span>
              </div>
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2 text-sm text-slate-800">
                {g.turns.map((t, j) => (
                  <p key={j} className="leading-relaxed whitespace-pre-wrap">
                    {t.content}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── QA breakdown ─────────────────────────────────────────────────────────
interface QAScoreBreakdownProps {
  breakdown: QaBreakdown;
}

const QAScoreBreakdown: React.FC<QAScoreBreakdownProps> = ({ breakdown }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{Math.round(breakdown.score)}</span>
        <span className="text-sm text-slate-500">
          {breakdown.rubric_name ? `${breakdown.rubric_name} score` : 'QA score'}
        </span>
      </div>
      <div className="space-y-2">
        {breakdown.criteria.map((c, i) => (
          <div key={i} className="border border-slate-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-800">{c.name}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${qaScoreBadgeClasses(c.score)}`}
              >
                {Math.round(c.score)}
                {typeof c.weight === 'number' && (
                  <span className="ml-1 font-normal text-[10px] opacity-70">
                    · w{c.weight}
                  </span>
                )}
              </span>
            </div>
            {c.notes && <p className="text-xs text-slate-600 mt-1">{c.notes}</p>}
          </div>
        ))}
        {breakdown.criteria.length === 0 && (
          <p className="text-sm text-slate-500 italic">No criteria breakdown recorded.</p>
        )}
      </div>
    </div>
  );
};

// ── Call detail drawer ───────────────────────────────────────────────────
interface CallDetailDrawerProps {
  callId: string | null;
  onClose: () => void;
}

const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({ callId, onClose }) => {
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await authedFetch(
          `${FUNCTIONS_BASE}/saas-v2-call-detail?call_id=${encodeURIComponent(callId)}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as DetailResponse;
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load call');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callId]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (callId) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [callId]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && callId) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [callId, onClose]);

  if (!callId) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full md:w-[640px] bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Call detail</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading transcript and QA...
            </div>
          )}

          {error && !loading && (
            <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {detail && !loading && !error && (
            <>
              {/* Header card */}
              <div className="border border-slate-200 rounded-lg p-4 mb-5 bg-slate-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Phone size={14} className="text-slate-500" />
                    {detail.call.caller}
                  </div>
                  <span className={statusPillClasses(detail.call.status)}>
                    {detail.call.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {formatStarted(detail.call.started_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {formatDuration(detail.call.duration_sec)}
                  </span>
                  {typeof detail.call.qa_score === 'number' && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${qaScoreBadgeClasses(detail.call.qa_score)}`}
                    >
                      QA {Math.round(detail.call.qa_score)}
                    </span>
                  )}
                </div>
              </div>

              {/* Sideways narrative */}
              {detail.call.sideways_flag && detail.sideways_narrative && (
                <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 mb-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-800 mb-2">
                    <AlertTriangle size={14} />
                    Why this went sideways
                  </div>
                  <p className="text-sm text-rose-900 leading-relaxed whitespace-pre-wrap">
                    {detail.sideways_narrative}
                  </p>
                </div>
              )}

              {/* QA breakdown */}
              {detail.qa_breakdown && (
                <section className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 inline-flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-500" />
                    QA rubric breakdown
                  </h3>
                  <QAScoreBreakdown breakdown={detail.qa_breakdown} />
                </section>
              )}

              {/* Transcript */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Transcript</h3>
                <TranscriptViewer turns={detail.transcript} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Cold-start placeholder ───────────────────────────────────────────────
const ColdStartBanner: React.FC = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
    <div className="flex items-start gap-3">
      <Sparkles size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="text-sm font-semibold text-blue-900 mb-1">
          Insights unlock at 30 calls
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Your call history is still warming up. Once you have at least 30 calls or 14 days of
          activity, we'll start surfacing patterns, sideways flags, and weekly narratives
          tailored to your workspace. Calls are still being recorded and the table below is live.
        </p>
      </div>
    </div>
  </div>
);

// ── Calls table ──────────────────────────────────────────────────────────
interface CallListProps {
  calls: CallRow[];
  loading: boolean;
  onSelect: (callId: string) => void;
}

const CallList: React.FC<CallListProps> = ({ calls, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center text-slate-500">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading calls...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Phone size={28} className="text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No calls match these filters</h3>
        <p className="text-sm text-slate-500">
          Try clearing your filters or widening the date range.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Caller
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Status
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Started
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Duration
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Summary
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              QA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {calls.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                c.sideways_flag ? 'bg-rose-50/40' : ''
              }`}
            >
              <td className="px-4 py-3 text-sm text-slate-900">
                <div className="flex items-center gap-2">
                  {c.sideways_flag && (
                    <span title={c.sideways_reason || 'Sideways'} className="text-rose-500">
                      <AlertTriangle size={14} />
                    </span>
                  )}
                  <span className="font-medium">{c.caller}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={statusPillClasses(c.status)}>{c.status}</span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatStarted(c.started_at)}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatDuration(c.duration_sec)}</td>
              <td className="px-4 py-3 text-sm text-slate-700 max-w-md">
                <span className="line-clamp-2">{c.ai_summary}</span>
              </td>
              <td className="px-4 py-3">
                {typeof c.qa_score === 'number' ? (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${qaScoreBadgeClasses(c.qa_score)}`}
                  >
                    {Math.round(c.qa_score)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────
const V2CallsPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [sidewaysCount, setSidewaysCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Stable fetcher
  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.sideways) params.set('sideways', 'true');
      params.set('page', '1');
      params.set('limit', '50');

      const url = `${FUNCTIONS_BASE}/saas-v2-calls${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      const res = await authedFetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ListResponse;
      setCalls(data.calls || []);
      setTotal(data.total ?? data.calls?.length ?? 0);
      setSidewaysCount(
        data.sideways_count ?? (data.calls || []).filter((c) => c.sideways_flag).length,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calls');
      setCalls([]);
      setTotal(0);
      setSidewaysCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.date_from, filters.date_to, filters.sideways]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Client-side filtering for vertical + search (server doesn't have these yet)
  const visibleCalls = useMemo(() => {
    let list = calls;
    if (filters.vertical !== 'all') {
      // Best-effort filter by summary content — verticals aren't a column on
      // retell_calls yet. This is a stub the server will replace once the
      // workspace.vertical column is wired in.
      const needle = filters.vertical.replace(/_/g, ' ');
      list = list.filter((c) => c.ai_summary?.toLowerCase().includes(needle));
    }
    if (filters.search.trim()) {
      const needle = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.caller?.toLowerCase().includes(needle) ||
          c.ai_summary?.toLowerCase().includes(needle) ||
          c.status?.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [calls, filters.vertical, filters.search]);

  // Cold-start: <30 total calls OR <14 days of history
  const isColdStart = useMemo(() => {
    if (total > 0 && total < 30) return true;
    if (calls.length === 0) return false;
    const oldest = calls.reduce<Date | null>((acc, c) => {
      const d = new Date(c.started_at);
      if (Number.isNaN(d.getTime())) return acc;
      if (!acc || d < acc) return d;
      return acc;
    }, null);
    if (!oldest) return false;
    const ageDays = (Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays < 14;
  }, [total, calls]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calls</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every inbound call your agent handled, with AI one-liners and sideways flags.
          </p>
        </div>
        {total > 0 && !loading && (
          <div className="text-sm text-slate-500">
            {visibleCalls.length} of {total} call{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Cold-start banner */}
      {isColdStart && <ColdStartBanner />}

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} sidewaysCount={sidewaysCount} />

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-md p-3 mb-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* List */}
      <CallList
        calls={visibleCalls}
        loading={loading}
        onSelect={(id) => setSelectedCallId(id)}
      />

      {/* Drawer */}
      <CallDetailDrawer
        callId={selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </div>
  );
};

export default V2CallsPage;
