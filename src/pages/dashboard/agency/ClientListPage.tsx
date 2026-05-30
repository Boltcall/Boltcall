/**
 * ClientListPage — Boltcall Agency OS · Layer 7 · Per-client list
 * ────────────────────────────────────────────────────────────────
 *
 * Founder-only table of every agency_clients row. Sortable by any column,
 * filterable by status / vertical / churn_risk. Click a row to drill into
 * `/dashboard/agency/clients/:id`.
 *
 * Killer-UX intent (audit lines 176-180):
 *   This page is NOT just a CRUD list. Every row is a decision surface —
 *   churn_risk badge, MRR magnitude, time-since-last-event are
 *   visually ranked so the founder's eye lands on red-tier clients
 *   first. Sub-15-min/day at 10 clients only works if "which client
 *   needs me right now" answers itself in <2 seconds of scanning.
 *
 * Data source: GET /.netlify/functions/agency-clients-list
 *
 * Auth gate:
 *   We do not have a dedicated `useIsFounder()` hook yet (this is the
 *   first agency UI page). Gate is the API itself — it returns 403 if
 *   the caller is not founder, and we render a "Not authorized" state
 *   on that error. Adding a client-side hook is a future polish that
 *   would just save the round trip, not change the security posture.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Loader2 } from 'lucide-react';

import { authedFetch } from '../../../lib/authedFetch';

// ─── Types ────────────────────────────────────────────────────────────────

type ChurnRisk = 'green' | 'yellow' | 'red';

type ClientRow = {
  id: string;
  business_name: string | null;
  vertical: string | null;
  sku: string;
  mrr: number;
  status: string;
  churn_risk: ChurnRisk;
  churn_risk_drivers: string[];
  live_at: string | null;
  signed_up_at: string;
  created_at: string;
  last_event_at: string | null;
};

type SortKey =
  | 'business_name'
  | 'vertical'
  | 'sku'
  | 'mrr'
  | 'status'
  | 'churn_risk'
  | 'live_at'
  | 'last_event_at';

type SortDir = 'asc' | 'desc';

// Order matters — used to rank churn_risk in the default sort so red-tier
// clients always rise to the top.
const CHURN_RANK: Record<ChurnRisk, number> = { red: 0, yellow: 1, green: 2 };

// ─── Formatting helpers ───────────────────────────────────────────────────

function formatMrr(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Status + churn pills ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending_intake: 'bg-slate-100 text-slate-700 border-slate-200',
  intake_scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  intake_done: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  building: 'bg-amber-100 text-amber-700 border-amber-200',
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  churned: 'bg-rose-100 text-rose-700 border-rose-200',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function ChurnBadge({ risk, drivers }: { risk: ChurnRisk; drivers: string[] }) {
  const styles: Record<ChurnRisk, { box: string; dot: string; label: string }> = {
    green: { box: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Healthy' },
    yellow: { box: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'At risk' },
    red: { box: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', label: 'Save call' },
  };
  const s = styles[risk];
  const title = drivers.length ? drivers.join(' · ') : 'No churn drivers';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Sort + filter logic (pure functions for testability) ─────────────────

function sortRows(rows: ClientRow[], key: SortKey, dir: SortDir): ClientRow[] {
  const mult = dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((a, b) => {
    if (key === 'mrr') return (a.mrr - b.mrr) * mult;
    if (key === 'churn_risk') return (CHURN_RANK[a.churn_risk] - CHURN_RANK[b.churn_risk]) * mult;
    if (key === 'live_at' || key === 'last_event_at') {
      const av = a[key] ? new Date(a[key] as string).getTime() : 0;
      const bv = b[key] ? new Date(b[key] as string).getTime() : 0;
      return (av - bv) * mult;
    }
    const av = (a[key] ?? '').toString().toLowerCase();
    const bv = (b[key] ?? '').toString().toLowerCase();
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });
  return out;
}

// ─── SortHeader subcomponent ──────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = activeKey === sortKey;
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-${align} text-[11px] font-semibold uppercase tracking-wider text-gray-500`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? 'text-gray-900' : 'hover:text-gray-700'
        }`}
      >
        {label}
        {isActive ? (
          dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

const ClientListPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [churnFilter, setChurnFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Default sort: churn_risk asc → red-first. This is the killer-UX rank
  // — the founder should see save-call clients without lifting a finger.
  const [sortKey, setSortKey] = useState<SortKey>('churn_risk');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch('/.netlify/functions/agency-clients-list');
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) {
            setError(res.status === 403 ? 'Founder access required.' : 'Not signed in.');
            setRows([]);
          }
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { clients: ClientRow[] };
        if (!cancelled) setRows(json.clients || []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load clients.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive filter option sets from the data — single source of truth so
  // empty datasets do not leave dead options dangling in the selects.
  const verticalOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.vertical) set.add(r.vertical);
    return Array.from(set).sort();
  }, [rows]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.status);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (verticalFilter !== 'all' && r.vertical !== verticalFilter) return false;
      if (churnFilter !== 'all' && r.churn_risk !== churnFilter) return false;
      if (q) {
        const hay = `${r.business_name || ''} ${r.vertical || ''} ${r.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, verticalFilter, churnFilter, searchQuery]);

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // First-click direction is sensible per column: mrr/dates desc-first
      // (biggest/most-recent first), names asc-first.
      setSortDir(['mrr', 'live_at', 'last_event_at'].includes(key) ? 'desc' : 'asc');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agency clients</h1>
          <p className="text-sm text-gray-500">
            All clients running on the Boltcall Agency OS. Rank defaults to churn risk so save-call work surfaces first.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {loading ? 'Loading…' : `${sorted.length} of ${rows.length} clients`}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <input
          type="search"
          placeholder="Search business, vertical, SKU…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={verticalFilter}
          onChange={(e) => setVerticalFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All verticals</option>
          {verticalOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={churnFilter}
          onChange={(e) => setChurnFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All churn risk</option>
          <option value="red">Red — save call</option>
          <option value="yellow">Yellow — at risk</option>
          <option value="green">Green — healthy</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {error && (
          <div className="p-6 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">{error}</div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clients…
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="p-10 text-center text-sm text-gray-500">
            No clients match the current filters.
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader label="Business" sortKey="business_name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="Vertical" sortKey="vertical" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="SKU" sortKey="sku" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="MRR" sortKey="mrr" activeKey={sortKey} dir={sortDir} onSort={onSort} align="right" />
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="Churn" sortKey="churn_risk" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="Live since" sortKey="live_at" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHeader label="Last event" sortKey="last_event_at" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  <th aria-label="row chevron" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/dashboard/agency/clients/${row.id}`)}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                      {row.business_name || <span className="text-gray-400 italic">unnamed</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-700">
                      {row.vertical || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{row.sku}</td>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
                      {formatMrr(row.mrr)}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2.5">
                      <ChurnBadge risk={row.churn_risk} drivers={row.churn_risk_drivers} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(row.live_at)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{timeAgo(row.last_event_at)}</td>
                    <td className="px-2 py-2.5 text-gray-400">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientListPage;
