/**
 * QueuePage — the founder's daily 15-minute decision surface.
 *
 * Killer Feature #5 from the Agency OS plan: an opinionated decision queue,
 * not a list. Every artifact arrives pre-loaded with the full epistemic
 * envelope (confidence + reasoning_trace + retrieved_context +
 * alternatives_rejected + adversarial_review + predicted_impact + base_rate)
 * so the founder can approve in ~5s without opening the source.
 *
 * Sort formula:
 *   rank = (predicted_impact.value || 0)
 *          * (artifact.reversible ? 1 : 1.5)
 *          / hoursSinceCreated
 *
 * Critical escalations (type='escalation_action' + severity='critical') float
 * to the top regardless of rank. Formula is shown in a tooltip on the sort
 * header — transparency by default (Linear-style, not Jira-style).
 *
 * Keyboard:
 *   J / K       — nav down / up
 *   Shift+J/K   — extend range selection
 *   A           — approve current
 *   Shift+A     — bulk approve selection
 *   R           — reject current (prompts inline for reason)
 *   E           — edit content (opens JSON side panel)
 *   D           — defer 24h
 *   N           — add note (no status change)
 *   Esc         — clear selection / close edit panel
 *
 * Auth: founder-only. Non-founder accounts see a Forbidden screen — the page
 * exposes every artifact across every client, so the gate is non-negotiable.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  RefreshCw,
  RotateCcw,
  Shield,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { authedFetch } from '../../../lib/authedFetch';

// ─── Types (shape contract with /api/agency-queue-list) ──────────────────────

interface PredictedImpact {
  metric?: string;
  prediction?: number;
  value?: number; // sort key — either explicit `value` or `prediction`
  ci_low?: number;
  ci_high?: number;
  base_rate?: number;
  horizon_hours?: number;
}

interface AdversarialReview {
  critic_model?: string;
  findings?: Array<{ severity?: string; note?: string }>;
  rebuttals?: Array<{ note?: string }>;
  agent_response?: string;
}

interface RetrievedChunk {
  knowledge_id?: string;
  kind?: string;
  snippet?: string;
  score?: number;
}

interface RejectedAlternative {
  option?: string;
  why_rejected?: string;
}

interface ClientLite {
  id: string;
  business_name?: string | null;
  vertical?: string | null;
  sku?: string | null;
  status?: string | null;
  churn_risk?: 'green' | 'yellow' | 'red' | null;
}

interface QueueArtifact {
  id: string;
  client_id: string;
  type: string;
  status: 'draft' | 'deferred';
  generated_by: string;
  model: string | null;
  content: Record<string, unknown>;
  preview_url: string | null;
  ship_target: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  eval_score: number | null;
  confidence: number | null;
  reasoning_trace: string[] | null;
  retrieved_context: RetrievedChunk[] | null;
  alternatives_rejected: RejectedAlternative[] | null;
  adversarial_review: AdversarialReview | null;
  client_facing_note: string | null;
  parent_artifact_id: string | null;
  predicted_impact: PredictedImpact | null;
  ship_window_ends_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  shipped_at: string | null;
  reversible: boolean;
  severity?: string | null;
  // joined client info
  client: ClientLite;
  // computed rank score from the server (so client + server agree)
  rank_score: number;
  // historical base rate for (type, vertical)
  base_rate_value: number | null;
  base_rate_n: number;
  base_rate_metric: string | null;
}

interface QueueResponse {
  artifacts: QueueArtifact[];
  counts: { pending: number; today: number; week: number };
  base_rates: Record<string, { value: number; n: number; metric: string }>;
}

// ─── Local UI state reducer ──────────────────────────────────────────────────

interface UiState {
  cursor: number;
  selection: Set<string>;
  anchor: number | null;
  clientFilter: string | 'all';
  expandedContext: boolean;
  expandedAlternatives: boolean;
  editing: boolean;
  editDraft: string;
  noteDraft: string;
  rejectDraft: string;
  rejectingId: string | null;
  notingId: string | null;
  bannerMessage: string | null;
  bannerTone: 'success' | 'error' | null;
}

type UiAction =
  | { kind: 'SET_CURSOR'; index: number }
  | { kind: 'NUDGE_CURSOR'; delta: number; max: number; extend: boolean }
  | { kind: 'TOGGLE_SELECT'; id: string }
  | { kind: 'CLEAR_SELECTION' }
  | { kind: 'SET_CLIENT_FILTER'; clientId: string | 'all' }
  | { kind: 'TOGGLE_CONTEXT' }
  | { kind: 'TOGGLE_ALTERNATIVES' }
  | { kind: 'START_EDIT'; payload: string }
  | { kind: 'SET_EDIT_DRAFT'; payload: string }
  | { kind: 'CANCEL_EDIT' }
  | { kind: 'SET_REJECT_DRAFT'; id: string; payload: string }
  | { kind: 'CANCEL_REJECT' }
  | { kind: 'SET_NOTE_DRAFT'; id: string; payload: string }
  | { kind: 'CANCEL_NOTE' }
  | { kind: 'BANNER'; message: string; tone: 'success' | 'error' }
  | { kind: 'CLEAR_BANNER' };

const initialUi: UiState = {
  cursor: 0,
  selection: new Set(),
  anchor: null,
  clientFilter: 'all',
  expandedContext: false,
  expandedAlternatives: false,
  editing: false,
  editDraft: '',
  noteDraft: '',
  rejectDraft: '',
  rejectingId: null,
  notingId: null,
  bannerMessage: null,
  bannerTone: null,
};

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.kind) {
    case 'SET_CURSOR':
      return { ...state, cursor: action.index, editing: false };
    case 'NUDGE_CURSOR': {
      const next = Math.max(0, Math.min(action.max, state.cursor + action.delta));
      if (action.extend && state.anchor !== null) {
        // Build selection between anchor and next
        const lo = Math.min(state.anchor, next);
        const hi = Math.max(state.anchor, next);
        const selection = new Set<string>();
        for (let i = lo; i <= hi; i += 1) selection.add(String(i));
        return { ...state, cursor: next, selection, editing: false };
      }
      return {
        ...state,
        cursor: next,
        anchor: action.extend ? state.cursor : null,
        editing: false,
      };
    }
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selection);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selection: next };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selection: new Set(), anchor: null };
    case 'SET_CLIENT_FILTER':
      return { ...state, clientFilter: action.clientId, cursor: 0, selection: new Set(), anchor: null };
    case 'TOGGLE_CONTEXT':
      return { ...state, expandedContext: !state.expandedContext };
    case 'TOGGLE_ALTERNATIVES':
      return { ...state, expandedAlternatives: !state.expandedAlternatives };
    case 'START_EDIT':
      return { ...state, editing: true, editDraft: action.payload };
    case 'SET_EDIT_DRAFT':
      return { ...state, editDraft: action.payload };
    case 'CANCEL_EDIT':
      return { ...state, editing: false, editDraft: '' };
    case 'SET_REJECT_DRAFT':
      return { ...state, rejectingId: action.id, rejectDraft: action.payload };
    case 'CANCEL_REJECT':
      return { ...state, rejectingId: null, rejectDraft: '' };
    case 'SET_NOTE_DRAFT':
      return { ...state, notingId: action.id, noteDraft: action.payload };
    case 'CANCEL_NOTE':
      return { ...state, notingId: null, noteDraft: '' };
    case 'BANNER':
      return { ...state, bannerMessage: action.message, bannerTone: action.tone };
    case 'CLEAR_BANNER':
      return { ...state, bannerMessage: null, bannerTone: null };
    default:
      return state;
  }
}

// ─── Founder gate ─────────────────────────────────────────────────────────────

/**
 * Read the JWT app_metadata.role from the active Supabase session. The role is
 * stored in app_metadata (admin-set, immutable to clients), NOT user_metadata
 * (client-settable). The Supabase auth.users row carries it via the kernel's
 * is_founder() helper. We mirror the server-side check here to avoid rendering
 * any artifact data before the API call returns.
 */
function useIsFounder(): { loading: boolean; isFounder: boolean } {
  const { user, isLoading } = useAuth();
  const [resolved, setResolved] = useState<{ loading: boolean; isFounder: boolean }>({
    loading: true,
    isFounder: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isLoading) return;
      if (!user) {
        if (!cancelled) setResolved({ loading: false, isFounder: false });
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (!cancelled) setResolved({ loading: false, isFounder: false });
          return;
        }
        const role =
          (data.session.user.app_metadata as Record<string, unknown> | null)?.role;
        if (!cancelled) {
          setResolved({ loading: false, isFounder: role === 'founder' });
        }
      } catch {
        if (!cancelled) setResolved({ loading: false, isFounder: false });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user, isLoading]);

  return resolved;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursSince(iso: string): number {
  const now = Date.now();
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0.01, (now - then) / 3_600_000);
}

function formatAgo(iso: string): string {
  const h = hoursSince(iso);
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtConfidence(c: number | null): string {
  if (c == null) return '—';
  return c.toFixed(2);
}

function severityClass(sev: string | null | undefined): string {
  switch (sev) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'error':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'warn':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-zinc-50 text-zinc-600 border-zinc-200';
  }
}

function churnClass(risk: ClientLite['churn_risk']): string {
  switch (risk) {
    case 'red':
      return 'bg-red-500';
    case 'yellow':
      return 'bg-amber-400';
    default:
      return 'bg-emerald-500';
  }
}

// ─── Forbidden screen ────────────────────────────────────────────────────────

const Forbidden: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center px-6">
    <div className="max-w-md text-center">
      <Lock className="w-10 h-10 text-zinc-400 mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-zinc-900 mb-2">Founder access only</h1>
      <p className="text-zinc-500 text-sm">
        The approval queue exposes every artifact across every agency client and
        is gated to accounts with <code className="text-zinc-700 bg-zinc-100 px-1 rounded">app_metadata.role = founder</code>.
        Ask the workspace admin to grant the role if you need access.
      </p>
    </div>
  </div>
);

// ─── Main page ───────────────────────────────────────────────────────────────

const QueuePage: React.FC = () => {
  const gate = useIsFounder();
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ui, dispatch] = useReducer(uiReducer, initialUi);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await authedFetch('/.netlify/functions/agency-queue-list');
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`agency-queue-list ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as QueueResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!gate.isFounder) return;
    load(false);
    refreshTimer.current = setInterval(() => load(true), 30_000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [gate.isFounder, load]);

  // ── Filtered + sorted view ────────────────────────────────────────────────
  const visible: QueueArtifact[] = useMemo(() => {
    if (!data) return [];
    const filtered =
      ui.clientFilter === 'all'
        ? data.artifacts
        : data.artifacts.filter((a) => a.client_id === ui.clientFilter);
    // Server already sorts, but re-apply client-side so client-only filter
    // toggles don't surprise the user with stale ordering.
    return [...filtered].sort((a, b) => {
      // critical escalations float to top
      const aCrit = a.type === 'escalation_action' && a.severity === 'critical' ? 1 : 0;
      const bCrit = b.type === 'escalation_action' && b.severity === 'critical' ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;
      return b.rank_score - a.rank_score;
    });
  }, [data, ui.clientFilter]);

  const current: QueueArtifact | null = visible[ui.cursor] ?? null;

  // ── Clients list for left rail ────────────────────────────────────────────
  const clients = useMemo(() => {
    if (!data) return [] as ClientLite[];
    const map = new Map<string, ClientLite>();
    for (const a of data.artifacts) {
      if (!map.has(a.client_id)) map.set(a.client_id, a.client);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.business_name || '').localeCompare(b.business_name || ''),
    );
  }, [data]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const doAction = useCallback(
    async (
      ids: string[],
      action: 'approve' | 'reject' | 'defer' | 'edit',
      extras: { reason?: string; note?: string; edited_content?: unknown } = {},
    ) => {
      if (ids.length === 0) return;
      try {
        const results = await Promise.allSettled(
          ids.map((id) =>
            authedFetch('/.netlify/functions/agency-queue-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ artifact_id: id, action, ...extras }),
            }).then(async (r) => {
              if (!r.ok) {
                const text = await r.text();
                throw new Error(`${r.status}: ${text.slice(0, 160)}`);
              }
              return r.json();
            }),
          ),
        );
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          dispatch({
            kind: 'BANNER',
            message: `${results.length - failures.length}/${results.length} succeeded — ${
              (failures[0] as PromiseRejectedResult).reason
            }`,
            tone: 'error',
          });
        } else {
          dispatch({
            kind: 'BANNER',
            message: `${action} × ${ids.length} ok`,
            tone: 'success',
          });
        }
        dispatch({ kind: 'CLEAR_SELECTION' });
        dispatch({ kind: 'CANCEL_EDIT' });
        dispatch({ kind: 'CANCEL_REJECT' });
        dispatch({ kind: 'CANCEL_NOTE' });
        await load(true);
      } catch (err) {
        dispatch({
          kind: 'BANNER',
          message: err instanceof Error ? err.message : 'Action failed',
          tone: 'error',
        });
      }
    },
    [load],
  );

  const doRollback = useCallback(
    async (id: string) => {
      try {
        const r = await authedFetch('/.netlify/functions/agency-rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifact_id: id }),
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`${r.status}: ${text.slice(0, 160)}`);
        }
        dispatch({ kind: 'BANNER', message: 'rolled back', tone: 'success' });
        await load(true);
      } catch (err) {
        dispatch({
          kind: 'BANNER',
          message: err instanceof Error ? err.message : 'Rollback failed',
          tone: 'error',
        });
      }
    },
    [load],
  );

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gate.isFounder) return undefined;
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in inputs / textareas / contenteditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          if (e.key === 'Escape') {
            (target as HTMLInputElement | HTMLTextAreaElement).blur();
          }
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const max = Math.max(0, visible.length - 1);
      const cur = visible[ui.cursor];
      switch (e.key) {
        case 'j':
        case 'J':
          e.preventDefault();
          dispatch({ kind: 'NUDGE_CURSOR', delta: 1, max, extend: e.shiftKey });
          return;
        case 'k':
        case 'K':
          e.preventDefault();
          dispatch({ kind: 'NUDGE_CURSOR', delta: -1, max, extend: e.shiftKey });
          return;
        case 'a':
          if (!cur) return;
          e.preventDefault();
          void doAction([cur.id], 'approve');
          return;
        case 'A': {
          // Shift+A → bulk approve selection
          if (ui.selection.size === 0) return;
          e.preventDefault();
          const ids = Array.from(ui.selection)
            .map((s) => visible[Number(s)])
            .filter((a): a is QueueArtifact => Boolean(a))
            .map((a) => a.id);
          void doAction(ids, 'approve');
          return;
        }
        case 'r':
        case 'R':
          if (!cur) return;
          e.preventDefault();
          dispatch({ kind: 'SET_REJECT_DRAFT', id: cur.id, payload: '' });
          return;
        case 'e':
        case 'E':
          if (!cur) return;
          e.preventDefault();
          dispatch({
            kind: 'START_EDIT',
            payload: JSON.stringify(cur.content, null, 2),
          });
          return;
        case 'd':
        case 'D':
          if (!cur) return;
          e.preventDefault();
          void doAction([cur.id], 'defer');
          return;
        case 'n':
        case 'N':
          if (!cur) return;
          e.preventDefault();
          dispatch({ kind: 'SET_NOTE_DRAFT', id: cur.id, payload: '' });
          return;
        case 'Escape':
          dispatch({ kind: 'CLEAR_SELECTION' });
          dispatch({ kind: 'CANCEL_EDIT' });
          dispatch({ kind: 'CANCEL_REJECT' });
          dispatch({ kind: 'CANCEL_NOTE' });
          return;
        default:
          return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate.isFounder, visible, ui.cursor, ui.selection, doAction]);

  // ── Auto-dismiss banner ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ui.bannerMessage) return undefined;
    const t = setTimeout(() => dispatch({ kind: 'CLEAR_BANNER' }), 3500);
    return () => clearTimeout(t);
  }, [ui.bannerMessage]);

  // ── Render gate ───────────────────────────────────────────────────────────
  if (gate.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!gate.isFounder) return <Forbidden />;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-zinc-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-zinc-900">Approval Queue</h1>
          {data && (
            <span className="text-sm text-zinc-500">
              {data.counts.pending} pending · {data.counts.today} today · {data.counts.week} this week
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs text-zinc-400 cursor-help"
            title="rank = predicted_impact × (reversible ? 1 : 1.5) ÷ hours_since_created. Critical escalations float to top."
          >
            sorted by impact ÷ age
          </span>
          <button
            type="button"
            onClick={() => load(true)}
            className="p-1.5 hover:bg-zinc-100 rounded transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner */}
      {ui.bannerMessage && (
        <div
          className={`px-6 py-2 text-sm border-b ${
            ui.bannerTone === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {ui.bannerMessage}
        </div>
      )}

      <div className="flex-1 grid grid-cols-[260px_minmax(0,1fr)_420px] min-h-0">
        {/* ── Left rail: client filter ─────────────────────────────────────── */}
        <aside className="border-r border-zinc-200 bg-white overflow-y-auto">
          <div className="p-3 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Clients
          </div>
          <button
            type="button"
            onClick={() => dispatch({ kind: 'SET_CLIENT_FILTER', clientId: 'all' })}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 ${
              ui.clientFilter === 'all' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-700'
            }`}
          >
            <span>All clients</span>
            <span className="text-xs text-zinc-400">{data?.counts.pending ?? 0}</span>
          </button>
          {clients.map((c) => {
            const count = data?.artifacts.filter((a) => a.client_id === c.id).length ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => dispatch({ kind: 'SET_CLIENT_FILTER', clientId: c.id })}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 ${
                  ui.clientFilter === c.id ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${churnClass(c.churn_risk)}`} />
                  <span className="truncate">{c.business_name || c.id.slice(0, 8)}</span>
                </div>
                <span className="text-xs text-zinc-400">{count}</span>
              </button>
            );
          })}
        </aside>

        {/* ── Center: artifact list ────────────────────────────────────────── */}
        <main className="overflow-y-auto bg-zinc-50">
          {loading && (
            <div className="p-8 flex items-center justify-center text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="m-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
              {error}
            </div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <div className="text-base font-medium text-zinc-700">Inbox zero.</div>
              <div className="text-sm">All artifacts reviewed. Take 5 minutes back.</div>
            </div>
          )}
          <ul>
            {visible.map((a, i) => {
              const selected = ui.selection.has(String(i));
              const isCursor = i === ui.cursor;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => dispatch({ kind: 'SET_CURSOR', index: i })}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-200 transition-colors ${
                      isCursor ? 'bg-violet-50 border-l-2 border-l-violet-500' : 'bg-white hover:bg-zinc-50'
                    } ${selected ? 'ring-1 ring-inset ring-violet-300' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-900">
                            {a.client.business_name || a.client_id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-zinc-400">·</span>
                          <span className="text-xs text-zinc-500">{a.type}</span>
                          {a.type === 'escalation_action' && a.severity === 'critical' && (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3" /> critical
                            </span>
                          )}
                          {a.status === 'deferred' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              deferred
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                          <span>{a.generated_by}</span>
                          <span>·</span>
                          <span title="confidence">conf {fmtConfidence(a.confidence)}</span>
                          {a.predicted_impact?.prediction != null && (
                            <>
                              <span>·</span>
                              <span title="predicted impact">
                                Δ {(a.predicted_impact.prediction * 100).toFixed(1)}
                                {a.predicted_impact.metric ? ` ${a.predicted_impact.metric}` : ''}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatAgo(a.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono text-zinc-400" title="rank score">
                          {a.rank_score.toFixed(1)}
                        </span>
                        {!a.reversible && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <Shield className="w-3 h-3" /> irreversible
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </main>

        {/* ── Right side panel: reasoning + actions ────────────────────────── */}
        <aside className="border-l border-zinc-200 bg-white overflow-y-auto">
          {!current && (
            <div className="p-6 text-sm text-zinc-500">Select an artifact</div>
          )}
          {current && (
            <div className="p-5 space-y-5">
              {/* Header */}
              <div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  {current.type}
                </div>
                <div className="text-base font-semibold text-zinc-900">
                  {current.client.business_name || current.client_id.slice(0, 8)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {current.client.vertical || '—'} · {current.client.sku || '—'} · by {current.generated_by} · {current.model || 'no model'}
                </div>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-700">Confidence</span>
                  <span className="text-xs text-zinc-500">{fmtConfidence(current.confidence)}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500"
                    style={{ width: `${Math.round((current.confidence ?? 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Predicted impact + base rate */}
              {current.predicted_impact && (
                <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-700">
                      Δ {current.predicted_impact.metric || 'impact'}
                    </span>
                    <span className="text-zinc-900 font-mono">
                      {fmtPct(current.predicted_impact.prediction, 1)}
                    </span>
                  </div>
                  {current.predicted_impact.ci_low != null && current.predicted_impact.ci_high != null && (
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>80% CI</span>
                      <span className="font-mono">
                        [{fmtPct(current.predicted_impact.ci_low, 1)}, {fmtPct(current.predicted_impact.ci_high, 1)}]
                      </span>
                    </div>
                  )}
                  {current.base_rate_value != null && (
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>Base rate (n={current.base_rate_n})</span>
                      <span className="font-mono">{fmtPct(current.base_rate_value, 1)}</span>
                    </div>
                  )}
                  {current.predicted_impact.horizon_hours && (
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>Horizon</span>
                      <span className="font-mono">{current.predicted_impact.horizon_hours}h</span>
                    </div>
                  )}
                </div>
              )}

              {/* Reasoning trace */}
              {current.reasoning_trace && current.reasoning_trace.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-zinc-700 mb-2">Why this choice</div>
                  <ul className="space-y-1.5 text-sm text-zinc-700">
                    {current.reasoning_trace.map((b, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-violet-500 flex-shrink-0">›</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Retrieved context (collapsible) */}
              {current.retrieved_context && current.retrieved_context.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => dispatch({ kind: 'TOGGLE_CONTEXT' })}
                    className="w-full flex items-center justify-between text-xs font-semibold text-zinc-700 mb-2"
                  >
                    <span>Retrieved context ({current.retrieved_context.length})</span>
                    {ui.expandedContext ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {ui.expandedContext && (
                    <div className="space-y-2">
                      {current.retrieved_context.map((c, idx) => (
                        <div key={idx} className="text-xs bg-zinc-50 border border-zinc-200 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-500">{c.kind || 'chunk'}</span>
                            <span className="font-mono text-zinc-400">
                              {c.score != null ? c.score.toFixed(2) : ''}
                            </span>
                          </div>
                          <div className="text-zinc-700">{c.snippet || '(empty)'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternatives rejected (collapsible) */}
              {current.alternatives_rejected && current.alternatives_rejected.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => dispatch({ kind: 'TOGGLE_ALTERNATIVES' })}
                    className="w-full flex items-center justify-between text-xs font-semibold text-zinc-700 mb-2"
                  >
                    <span>Alternatives rejected ({current.alternatives_rejected.length})</span>
                    {ui.expandedAlternatives ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {ui.expandedAlternatives && (
                    <div className="space-y-2">
                      {current.alternatives_rejected.map((alt, idx) => (
                        <div key={idx} className="text-xs bg-zinc-50 border border-zinc-200 rounded p-2">
                          <div className="text-zinc-800 font-medium">{alt.option || '(no option)'}</div>
                          <div className="text-zinc-500 mt-0.5">{alt.why_rejected || ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Adversarial review */}
              {current.adversarial_review && (
                <div>
                  <div className="text-xs font-semibold text-zinc-700 mb-2">
                    Adversarial review
                    {current.adversarial_review.critic_model && (
                      <span className="ml-2 text-zinc-400 font-normal">
                        ({current.adversarial_review.critic_model})
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <div className="font-medium text-orange-700 mb-1">Findings</div>
                      <ul className="space-y-1 text-zinc-700">
                        {(current.adversarial_review.findings ?? []).map((f, idx) => (
                          <li key={idx}>
                            <span className={`inline-block px-1 mr-1 rounded text-[10px] border ${severityClass(f.severity)}`}>
                              {f.severity || 'note'}
                            </span>
                            {f.note}
                          </li>
                        ))}
                        {(current.adversarial_review.findings ?? []).length === 0 && (
                          <li className="text-zinc-400">none</li>
                        )}
                      </ul>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                      <div className="font-medium text-emerald-700 mb-1">Rebuttals</div>
                      <ul className="space-y-1 text-zinc-700">
                        {(current.adversarial_review.rebuttals ?? []).map((r, idx) => (
                          <li key={idx}>{r.note}</li>
                        ))}
                        {(current.adversarial_review.rebuttals ?? []).length === 0 && (
                          <li className="text-zinc-400">none</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit panel */}
              {ui.editing && (
                <div className="border border-violet-300 bg-violet-50/50 rounded p-3">
                  <div className="text-xs font-semibold text-violet-700 mb-2">Edit content</div>
                  <textarea
                    value={ui.editDraft}
                    onChange={(e) => dispatch({ kind: 'SET_EDIT_DRAFT', payload: e.target.value })}
                    className="w-full h-48 text-xs font-mono p-2 border border-zinc-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => dispatch({ kind: 'CANCEL_EDIT' })}
                      className="px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(ui.editDraft);
                          void doAction([current.id], 'edit', { edited_content: parsed });
                        } catch (err) {
                          dispatch({
                            kind: 'BANNER',
                            message: `Invalid JSON: ${(err as Error).message}`,
                            tone: 'error',
                          });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700"
                    >
                      Save & re-bench
                    </button>
                  </div>
                </div>
              )}

              {/* Reject prompt */}
              {ui.rejectingId === current.id && (
                <div className="border border-red-300 bg-red-50/50 rounded p-3">
                  <div className="text-xs font-semibold text-red-700 mb-2">Reject — why?</div>
                  <input
                    type="text"
                    autoFocus
                    value={ui.rejectDraft}
                    onChange={(e) => dispatch({ kind: 'SET_REJECT_DRAFT', id: current.id, payload: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && ui.rejectDraft.trim()) {
                        void doAction([current.id], 'reject', { reason: ui.rejectDraft.trim() });
                      } else if (e.key === 'Escape') {
                        dispatch({ kind: 'CANCEL_REJECT' });
                      }
                    }}
                    placeholder="prompt drifted from brand voice / etc"
                    className="w-full text-xs px-2 py-1.5 border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => dispatch({ kind: 'CANCEL_REJECT' })}
                      className="px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!ui.rejectDraft.trim()}
                      onClick={() => void doAction([current.id], 'reject', { reason: ui.rejectDraft.trim() })}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Note prompt */}
              {ui.notingId === current.id && (
                <div className="border border-zinc-300 bg-zinc-50 rounded p-3">
                  <div className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Note
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={ui.noteDraft}
                    onChange={(e) => dispatch({ kind: 'SET_NOTE_DRAFT', id: current.id, payload: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && ui.noteDraft.trim()) {
                        void doAction([current.id], 'edit', { note: ui.noteDraft.trim() });
                      } else if (e.key === 'Escape') {
                        dispatch({ kind: 'CANCEL_NOTE' });
                      }
                    }}
                    className="w-full text-xs px-2 py-1.5 border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => void doAction([current.id], 'approve')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" /> Approve <kbd className="opacity-70">A</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ kind: 'SET_REJECT_DRAFT', id: current.id, payload: '' })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-zinc-700 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  <X className="w-3.5 h-3.5" /> Reject <kbd className="opacity-70">R</kbd>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      kind: 'START_EDIT',
                      payload: JSON.stringify(current.content, null, 2),
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-zinc-700 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit <kbd className="opacity-70">E</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => void doAction([current.id], 'defer')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-zinc-700 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  <Clock className="w-3.5 h-3.5" /> Defer 24h <kbd className="opacity-70">D</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ kind: 'SET_NOTE_DRAFT', id: current.id, payload: '' })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-zinc-700 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Note <kbd className="opacity-70">N</kbd>
                </button>
                {current.parent_artifact_id && (
                  <button
                    type="button"
                    onClick={() => void doRollback(current.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300 rounded hover:bg-amber-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Rollback
                  </button>
                )}
              </div>

              {/* Bulk badge */}
              {ui.selection.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-violet-50 border border-violet-200 rounded text-xs">
                  <span className="text-violet-700">
                    <strong>{ui.selection.size}</strong> selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const ids = Array.from(ui.selection)
                          .map((s) => visible[Number(s)])
                          .filter((a): a is QueueArtifact => Boolean(a))
                          .map((a) => a.id);
                        void doAction(ids, 'approve');
                      }}
                      className="px-2 py-0.5 bg-violet-600 text-white rounded hover:bg-violet-700"
                    >
                      Shift+A approve
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ kind: 'CLEAR_SELECTION' })}
                      className="px-2 py-0.5 text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Footer keyboard hint */}
              <div className="text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 flex items-center gap-2 flex-wrap">
                <TimerReset className="w-3 h-3" />
                <span>J/K nav · A approve · R reject · E edit · D defer · N note · Shift+J/K select · Esc clear</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default QueuePage;
