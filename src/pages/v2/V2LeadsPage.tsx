/**
 * V2LeadsPage — /v2/leads
 *
 * Layout (top → bottom, narrative-first per the V2 shell brief):
 *   1. Page header (Leads + 1-line subtitle).
 *   2. "Hot lead this week" auto-pinned card (server-picked, AI explains why).
 *   3. Filter bar: status, date range, source.
 *   4. Table of leads — name, source pill, captured_at, AI 1-line summary,
 *      status badge, next-action chip. Row click opens a right-side drawer.
 *   5. Drawer: full lead detail + AI-suggested next action with optional draft.
 *   6. Empty state: friendly nudge to install the lead-capture widget.
 *
 * This page assumes it is rendered as a child route of /v2 inside
 * DashboardLayoutV2 (the merge agent wires this up in AppRoutes), so it emits
 * plain content — no shell, no max-width container, and V2OptInGate is the
 * parent route's responsibility.
 *
 * Backend:
 *   GET /.netlify/functions/saas-v2-leads
 *   GET /.netlify/functions/saas-v2-lead-detail?lead_id=<uuid>
 *
 * Cold-start: if the API returns 0 leads we render the friendly empty state
 * with a one-click link to the lead-capture install flow.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Zap,
  Sparkles,
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  AlertCircle,
  Filter,
  ChevronRight,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { Badge } from '../../components/ui/badge';

// ─── Types (mirror the server contract) ─────────────────────────────────────

type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost';

interface LeadCard {
  id: string;
  name: string;
  source: string;
  captured_at: string;
  ai_summary: string;
  status: LeadStatus;
  next_action: string;
}

interface HotLeadCard extends LeadCard {
  why_hot: string;
}

interface LeadsResponse {
  hot_lead: HotLeadCard | null;
  leads: LeadCard[];
  total: number;
}

interface Touchpoint {
  at: string;
  kind: 'lead_captured' | 'call' | 'sms' | 'email' | 'chat' | 'callback';
  channel: string;
  summary: string;
}

interface LeadDetailResponse {
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    status: string | null;
    captured_at: string;
    call_status: string | null;
    call_duration_seconds: number | null;
    sms_sent: boolean;
    transcript_snippet: string | null;
  };
  touchpoints: Touchpoint[];
  suggested_next_action: {
    label: string;
    reasoning: string;
    draft_message?: string;
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'contacted':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'booked':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'lost':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

interface FilterState {
  status: LeadStatus | '';
  date_from: string;
  date_to: string;
  source: string;
}

const DEFAULT_FILTERS: FilterState = {
  status: '',
  date_from: '',
  date_to: '',
  source: '',
};

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  knownSources: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({ value, onChange, knownSources }) => {
  const update = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const anyActive =
    value.status !== '' || value.date_from || value.date_to || value.source;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-1">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      <select
        value={value.status}
        onChange={(e) => update('status', e.target.value as LeadStatus | '')}
        className="h-8 rounded-md border border-zinc-200 bg-white text-xs px-2 text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="booked">Booked</option>
        <option value="lost">Lost</option>
      </select>

      <input
        type="date"
        value={value.date_from}
        onChange={(e) => update('date_from', e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white text-xs px-2 text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        aria-label="From date"
      />
      <span className="text-xs text-zinc-400">→</span>
      <input
        type="date"
        value={value.date_to}
        onChange={(e) => update('date_to', e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white text-xs px-2 text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        aria-label="To date"
      />

      <select
        value={value.source}
        onChange={(e) => update('source', e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white text-xs px-2 text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        aria-label="Filter by source"
      >
        <option value="">All sources</option>
        {knownSources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {anyActive && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="h-8 inline-flex items-center gap-1 px-2 text-xs text-zinc-500 hover:text-zinc-800"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};

// ─── Hot lead card ──────────────────────────────────────────────────────────

interface HotLeadCardProps {
  hot: HotLeadCard;
  onOpen: (id: string) => void;
}

const HotLeadCardView: React.FC<HotLeadCardProps> = ({ hot, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(hot.id)}
    className="group w-full text-left mb-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 text-amber-700 inline-flex items-center justify-center">
        <Zap className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Hot lead this week
          </span>
          <span className="text-[10px] text-zinc-400">•</span>
          <span className="text-[10px] text-zinc-500">{formatRelative(hot.captured_at)}</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-base font-semibold text-text-main truncate">{hot.name}</h3>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 font-medium">
            {hot.source}
          </Badge>
          <span
            className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full border ${statusBadgeClass(
              hot.status,
            )}`}
          >
            {hot.status}
          </span>
        </div>
        <p className="text-sm text-zinc-700 leading-snug mb-2">{hot.ai_summary}</p>
        <div className="flex items-start gap-1.5 text-xs text-amber-800/90 italic">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
          <span>{hot.why_hot}</span>
        </div>
      </div>
      <div className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
        Open
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </button>
);

// ─── Empty state ────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
    <div className="mx-auto w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue inline-flex items-center justify-center mb-4">
      <Zap className="w-6 h-6" />
    </div>
    <h3 className="text-base font-semibold text-text-main mb-1">No leads yet</h3>
    <p className="text-sm text-zinc-600 max-w-md mx-auto mb-5">
      Once a lead comes in, you&apos;ll see it here — captured, summarized, and ready to act on
      in one place. Install the lead-capture widget on your site to start receiving leads
      instantly.
    </p>
    <div className="flex items-center justify-center gap-2">
      <a
        href="/v2/integrations"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90"
      >
        Install lead-capture widget
      </a>
      <a
        href="/v2/setup"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:border-zinc-300"
      >
        Finish setup
      </a>
    </div>
  </div>
);

// ─── Drawer ─────────────────────────────────────────────────────────────────

interface DrawerProps {
  leadId: string | null;
  onClose: () => void;
}

const LeadDrawer: React.FC<DrawerProps> = ({ leadId, onClose }) => {
  const [detail, setDetail] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    (async () => {
      try {
        const res = await authedFetch(
          `${FUNCTIONS_BASE}/saas-v2-lead-detail?lead_id=${encodeURIComponent(leadId)}`,
        );
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Failed to load lead (${res.status}) ${body.slice(0, 120)}`);
        }
        const data = (await res.json()) as LeadDetailResponse;
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  // ESC closes the drawer
  useEffect(() => {
    if (!leadId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leadId, onClose]);

  if (!leadId) return null;

  const copyDraft = async () => {
    const msg = detail?.suggested_next_action?.draft_message;
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — silent */
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white border-l border-border shadow-xl flex flex-col"
        role="dialog"
        aria-label="Lead detail"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-main">Lead detail</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-md text-zinc-500 hover:text-text-main hover:bg-zinc-100"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading lead…
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 inline-flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {/* Identity */}
              <div>
                <h3 className="text-lg font-semibold text-text-main mb-1">
                  {detail.lead.name}
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  Captured {formatRelative(detail.lead.captured_at)}
                </p>
                <div className="space-y-1.5 text-sm">
                  {detail.lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <a
                        href={`tel:${detail.lead.phone}`}
                        className="text-text-main hover:text-brand-blue"
                      >
                        {detail.lead.phone}
                      </a>
                    </div>
                  )}
                  {detail.lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <a
                        href={`mailto:${detail.lead.email}`}
                        className="text-text-main hover:text-brand-blue"
                      >
                        {detail.lead.email}
                      </a>
                    </div>
                  )}
                  {detail.lead.source && (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-zinc-400">
                        @
                      </span>
                      <span className="text-zinc-600">{detail.lead.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI suggested next action */}
              <div className="rounded-lg border border-brand-blue/30 bg-brand-blue/[0.03] p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                    AI-suggested next action
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-text-main mb-1.5">
                  {detail.suggested_next_action.label}
                </h4>
                <p className="text-xs text-zinc-700 leading-snug mb-3">
                  {detail.suggested_next_action.reasoning}
                </p>
                {detail.suggested_next_action.draft_message && (
                  <div className="rounded-md border border-zinc-200 bg-white p-3 mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Draft message
                      </span>
                      <button
                        type="button"
                        onClick={copyDraft}
                        className="text-[11px] inline-flex items-center gap-1 text-zinc-600 hover:text-text-main"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-text-main whitespace-pre-wrap leading-snug">
                      {detail.suggested_next_action.draft_message}
                    </p>
                  </div>
                )}
              </div>

              {/* Transcript snippet (if call-sourced) */}
              {detail.lead.transcript_snippet && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Call transcript snippet
                  </h4>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 leading-snug whitespace-pre-wrap">
                    {detail.lead.transcript_snippet}
                  </div>
                </div>
              )}

              {/* Touchpoints */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  All touchpoints
                </h4>
                <ol className="space-y-2.5">
                  {detail.touchpoints.map((tp, i) => (
                    <li key={`${tp.at}-${i}`} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-zinc-100 text-zinc-500 inline-flex items-center justify-center">
                        {tp.kind === 'call' ? (
                          <Phone className="w-3 h-3" />
                        ) : tp.kind === 'sms' ? (
                          <MessageSquare className="w-3 h-3" />
                        ) : tp.kind === 'email' ? (
                          <Mail className="w-3 h-3" />
                        ) : tp.kind === 'callback' ? (
                          <Calendar className="w-3 h-3" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium text-text-main capitalize">
                            {tp.kind.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatRelative(tp.at)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-snug">{tp.summary}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const V2LeadsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.status) qs.set('status', filters.status);
      if (filters.date_from) qs.set('date_from', filters.date_from);
      if (filters.date_to) qs.set('date_to', filters.date_to);
      if (filters.source) qs.set('source', filters.source);
      qs.set('limit', '50');
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-leads?${qs.toString()}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to load leads (${res.status}) ${body.slice(0, 120)}`);
      }
      const json = (await res.json()) as LeadsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const knownSources = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.leads.forEach((l) => l.source && set.add(l.source));
    if (data.hot_lead?.source) set.add(data.hot_lead.source);
    return Array.from(set).sort();
  }, [data]);

  return (
    <>
      {/* Header — narrative-first per the V2 shell brief */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-main mb-1">Leads</h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Every inbound lead, captured the moment it arrives. We summarize each one and
          tell you the single next thing to do — so the fastest hand on the phone wins.
        </p>
      </div>

      {/* Hot lead */}
      {!loading && data?.hot_lead && (
        <HotLeadCardView hot={data.hot_lead} onOpen={setOpenLeadId} />
      )}

      {/* Filters */}
      <FilterBar value={filters} onChange={setFilters} knownSources={knownSources} />

      {/* Body */}
      {loading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 inline-flex items-center gap-2 justify-center w-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading leads…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 inline-flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-0.5">Couldn&apos;t load leads.</p>
            <p className="text-xs">{error}</p>
            <button
              type="button"
              onClick={() => void fetchLeads()}
              className="mt-2 text-xs underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && data.leads.length === 0 && <EmptyState />}

      {!loading && !error && data && data.leads.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {/* Header row (desktop) */}
          <div className="hidden md:grid grid-cols-[1.4fr_0.9fr_0.8fr_2.2fr_0.7fr_0.9fr] gap-3 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>Name</span>
            <span>Source</span>
            <span>Captured</span>
            <span>Summary</span>
            <span>Status</span>
            <span>Next action</span>
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.leads.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setOpenLeadId(l.id)}
                  className="w-full text-left md:grid md:grid-cols-[1.4fr_0.9fr_0.8fr_2.2fr_0.7fr_0.9fr] md:gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
                >
                  <div className="font-medium text-sm text-text-main truncate">{l.name}</div>
                  <div className="md:block hidden">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 font-normal">
                      {l.source}
                    </Badge>
                  </div>
                  <div className="hidden md:block text-xs text-zinc-500">
                    {formatRelative(l.captured_at)}
                  </div>
                  <div className="hidden md:block text-xs text-zinc-700 leading-snug truncate">
                    {l.ai_summary}
                  </div>
                  <div className="hidden md:block">
                    <span
                      className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full border ${statusBadgeClass(
                        l.status,
                      )}`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center justify-between">
                    <span className="text-xs text-brand-blue font-medium">{l.next_action}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500" />
                  </div>

                  {/* Mobile compact layout */}
                  <div className="md:hidden mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 font-normal">
                      {l.source}
                    </Badge>
                    <span>•</span>
                    <span>{formatRelative(l.captured_at)}</span>
                    <span>•</span>
                    <span
                      className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full border ${statusBadgeClass(
                        l.status,
                      )}`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="md:hidden mt-1 text-xs text-zinc-700 leading-snug">
                    {l.ai_summary}
                  </div>
                  <div className="md:hidden mt-1.5 text-xs text-brand-blue font-medium">
                    {l.next_action} →
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {data.total > data.leads.length && (
            <div className="px-4 py-2.5 border-t border-zinc-100 text-[11px] text-zinc-500 text-center">
              Showing {data.leads.length} of {data.total} leads. Adjust filters to narrow.
            </div>
          )}
        </div>
      )}

      <LeadDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </>
  );
};

export default V2LeadsPage;
