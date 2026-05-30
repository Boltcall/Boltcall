/**
 * ClientDetailPage — Boltcall Agency OS · Layer 7 · Per-client drill-down
 * ───────────────────────────────────────────────────────────────────────
 *
 * Founder-only. Routed at `/dashboard/agency/clients/:id`. One-screen
 * answer to "what is this client's OS actually doing for them?"
 *
 * Five tabs:
 *   - Overview   — 30-day KPI sparklines (calls, leads, bookings) +
 *                  headline counts + last_event_at timeline
 *   - Artifacts  — last 30 days of agency_artifacts. Each row is
 *                  click-to-expand with the full epistemic context the
 *                  agent emitted: reasoning_trace, retrieved_context,
 *                  alternatives_rejected, adversarial_review,
 *                  predicted_impact, confidence, client_facing_note.
 *                  This is the killer-UX surface: the founder reviews
 *                  per-client artifact decisions without leaving the
 *                  page.
 *   - Events     — last 100 agency_events with severity-colored
 *                  why_explanation headline + a payload drawer for
 *                  curiosity drilldown.
 *   - Knowledge  — counts-by-kind summary + the 50 most recent
 *                  agency_knowledge chunks. embedding_age (created_at
 *                  delta) flags stale chunks; source_artifact_id is
 *                  shown so you can walk lineage upstream.
 *   - Settings   — external links to the Retell agent dashboard, Meta
 *                  Ads Manager (matching account_id), Cal.com event
 *                  type. These URLs are derived from the client row;
 *                  if the relevant ID is missing the link is muted.
 *
 * Data source: GET /.netlify/functions/agency-client-detail?id=<uuid>
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';

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
  business_phone: string | null;
  business_website: string | null;
  region: string | null;
  timezone: string | null;
  notes: string | null;
  // External-system IDs are loosely typed because the kernel does not
  // expose them as first-class columns yet — they may live in
  // `notes` json or future columns. We render conservatively.
  [key: string]: unknown;
};

type EventRow = {
  id: string;
  agent_name: string | null;
  type: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  payload: unknown;
  why_explanation: string | null;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  type: string;
  status: string;
  generated_by: string;
  model: string | null;
  confidence: number | null;
  reasoning_trace: string[] | null;
  alternatives_rejected: unknown;
  adversarial_review: unknown;
  predicted_impact: unknown;
  client_facing_note: string | null;
  preview_url: string | null;
  ship_target: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  eval_score: number | null;
  parent_artifact_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  shipped_at: string | null;
};

type KnowledgeChunk = {
  id: string;
  kind: string;
  version: number;
  source_artifact_id: string | null;
  created_at: string;
};

type DetailPayload = {
  client: ClientRow;
  events: EventRow[];
  artifacts: ArtifactRow[];
  knowledge: {
    counts_by_kind: Record<string, number>;
    chunks: KnowledgeChunk[];
  };
  kpi_series: {
    days: number;
    day_keys: string[];
    series: {
      call_completed: number[];
      lead_captured: number[];
      booking_made: number[];
    };
  };
};

type TabKey = 'overview' | 'artifacts' | 'events' | 'knowledge' | 'settings';

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
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ─── ChurnBadge ───────────────────────────────────────────────────────────

function ChurnBadge({ risk, drivers }: { risk: ChurnRisk; drivers: string[] }) {
  const styles: Record<ChurnRisk, { box: string; dot: string; label: string }> = {
    green: { box: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Healthy' },
    yellow: { box: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'At risk' },
    red: { box: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', label: 'Save call' },
  };
  const s = styles[risk];
  return (
    <span
      title={drivers.length ? drivers.join(' · ') : 'No churn drivers'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
      {drivers.length > 0 && <span className="opacity-70">· {drivers.length}</span>}
    </span>
  );
}

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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

// ─── Sparkline (zero-dep inline SVG) ──────────────────────────────────────
// Lightweight on purpose — we avoid pulling in recharts/chart libs for a
// small inline visualization that only needs 30 datapoints. Reusing this
// across Overview tab cards keeps the bundle cost negligible.

function Sparkline({
  values,
  color,
  height = 36,
  width = 200,
}: {
  values: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  const max = Math.max(1, ...values);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = i * stepX;
        const y = height - (v / max) * (height - 4) - 2;
        return v > 0 ? <circle key={i} cx={x} cy={y} r={1.5} fill={color} /> : null;
      })}
    </svg>
  );
}

function KpiCard({
  label,
  values,
  color,
}: {
  label: string;
  values: number[];
  color: string;
}) {
  const total = sum(values);
  const recent7 = sum(values.slice(-7));
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold tabular-nums text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">last 30d · {recent7} in 7d</div>
        </div>
        <Sparkline values={values} color={color} />
      </div>
    </div>
  );
}

// ─── Severity styling for events ──────────────────────────────────────────

const SEVERITY_STYLE: Record<EventRow['severity'], string> = {
  debug: 'text-gray-500 bg-gray-50 border-gray-200',
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  warn: 'text-amber-700 bg-amber-50 border-amber-200',
  error: 'text-rose-700 bg-rose-50 border-rose-200',
  critical: 'text-white bg-rose-600 border-rose-700',
};

// ─── Tab components ───────────────────────────────────────────────────────

function OverviewTab({ payload }: { payload: DetailPayload }) {
  const series = payload.kpi_series.series;
  const lastEvent = payload.events[0]?.created_at ?? null;
  return (
    <div className="space-y-4">
      {/* KPI sparkline grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Calls answered" values={series.call_completed} color="#2563eb" />
        <KpiCard label="Leads captured" values={series.lead_captured} color="#10b981" />
        <KpiCard label="Bookings made" values={series.booking_made} color="#8b5cf6" />
      </div>

      {/* Quick facts row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FactCell label="Last event" value={timeAgo(lastEvent)} />
        <FactCell label="Recent artifacts" value={`${payload.artifacts.length}`} sub="last 30d" />
        <FactCell label="Knowledge chunks" value={`${payload.knowledge.chunks.length}+`} sub="see Knowledge tab" />
        <FactCell label="Recent events" value={`${payload.events.length}`} sub="see Events tab" />
      </div>

      {payload.client.churn_risk_drivers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Churn risk drivers
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {payload.client.churn_risk_drivers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FactCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function ArtifactsTab({ payload }: { payload: DetailPayload }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const a of payload.artifacts) s.add(a.type);
    return Array.from(s).sort();
  }, [payload.artifacts]);

  const filtered = useMemo(
    () => payload.artifacts.filter((a) => typeFilter === 'all' || a.type === typeFilter),
    [payload.artifacts, typeFilter],
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (payload.artifacts.length === 0) {
    return <EmptyState title="No recent artifacts" body="Nothing has been generated for this client in the last 30 days." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Type</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All ({payload.artifacts.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {filtered.map((a) => {
            const isOpen = expanded.has(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <span className="font-mono text-xs text-gray-700">{a.type}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs text-gray-600">{a.generated_by}</span>
                  {typeof a.confidence === 'number' && (
                    <>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-600">conf {(a.confidence * 100).toFixed(0)}%</span>
                    </>
                  )}
                  <span className="ml-auto text-xs text-gray-500">{timeAgo(a.created_at)}</span>
                </button>
                {isOpen && <ArtifactDrawer a={a} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ArtifactDrawer({ a }: { a: ArtifactRow }) {
  return (
    <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
      {a.client_facing_note && (
        <DrawerBlock title="Client-facing note">
          <p className="text-sm italic text-gray-700">"{a.client_facing_note}"</p>
        </DrawerBlock>
      )}

      {a.reasoning_trace && a.reasoning_trace.length > 0 && (
        <DrawerBlock title="Reasoning (3 bullets)">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
            {a.reasoning_trace.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </DrawerBlock>
      )}

      {a.alternatives_rejected != null && (
        <DrawerBlock title="Alternatives rejected">
          <JsonView value={a.alternatives_rejected} />
        </DrawerBlock>
      )}

      {a.adversarial_review != null && (
        <DrawerBlock title="Adversarial review">
          <JsonView value={a.adversarial_review} />
        </DrawerBlock>
      )}

      {a.predicted_impact != null && (
        <DrawerBlock title="Predicted impact">
          <JsonView value={a.predicted_impact} />
        </DrawerBlock>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
        {a.model && <Meta label="model" value={a.model} />}
        {a.ship_target && <Meta label="ship target" value={a.ship_target} />}
        {typeof a.cost_usd === 'number' && <Meta label="cost" value={`$${a.cost_usd.toFixed(4)}`} />}
        {typeof a.latency_ms === 'number' && <Meta label="latency" value={`${a.latency_ms}ms`} />}
        {typeof a.eval_score === 'number' && <Meta label="eval" value={a.eval_score.toFixed(2)} />}
        {a.parent_artifact_id && <Meta label="replaces" value={a.parent_artifact_id.slice(0, 8)} />}
      </div>

      {a.preview_url && (
        <a
          href={a.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Preview <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function DrawerBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="font-mono text-gray-700">{value}</span>
    </div>
  );
}

function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EventsTab({ payload }: { payload: DetailPayload }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const e of payload.events) s.add(e.type);
    return Array.from(s).sort();
  }, [payload.events]);

  const filtered = useMemo(
    () =>
      payload.events.filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
        return true;
      }),
    [payload.events, typeFilter, severityFilter],
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (payload.events.length === 0) {
    return <EmptyState title="No recent events" body="This client has not emitted any events yet." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All severities</option>
          <option value="debug">debug</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="critical">critical</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">When</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Severity</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Agent</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Why</th>
              <th aria-label="expand" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((e) => {
              const isOpen = expanded.has(e.id);
              return (
                <React.Fragment key={e.id}>
                  <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggle(e.id)}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{timeAgo(e.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[e.severity]}`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{e.agent_name || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-800">{e.type}</td>
                    <td className="px-3 py-2 text-sm text-gray-800">
                      {e.why_explanation || <span className="italic text-gray-400">no explanation generated</span>}
                    </td>
                    <td className="px-2 py-2 text-gray-400">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-3">
                        <JsonView value={e.payload} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnowledgeTab({ payload }: { payload: DetailPayload }) {
  const kindCounts = Object.entries(payload.knowledge.counts_by_kind).sort((a, b) => b[1] - a[1]);
  if (kindCounts.length === 0 && payload.knowledge.chunks.length === 0) {
    return <EmptyState title="No knowledge yet" body="This client has no knowledge-base chunks indexed." />;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {kindCounts.map(([kind, count]) => (
          <span key={kind} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs">
            <span className="font-medium text-gray-700">{kind}</span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">{count}</span>
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Kind</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Version</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Source artifact</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Embedding age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payload.knowledge.chunks.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-sm text-gray-800">{c.kind}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">v{c.version}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">
                  {c.source_artifact_id ? c.source_artifact_id.slice(0, 8) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{timeAgo(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ client }: { client: ClientRow }) {
  // External-system IDs aren't first-class columns yet — we accept that
  // some links may be unavailable. Render conservatively: live link if we
  // can build a URL, muted placeholder otherwise.
  const retellAgentId = (client.retell_agent_id as string | undefined) || null;
  const metaCampaignId = (client.meta_campaign_id as string | undefined) || null;
  const calcomEventSlug = (client.calcom_event_slug as string | undefined) || null;

  return (
    <div className="space-y-3">
      <ExternalLinkCard
        label="Retell agent dashboard"
        url={retellAgentId ? `https://dashboard.retellai.com/agents/${retellAgentId}` : null}
        hint={retellAgentId ? `agent ${retellAgentId.slice(0, 12)}…` : 'no agent linked yet'}
      />
      <ExternalLinkCard
        label="Meta Ads Manager"
        url={metaCampaignId ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${metaCampaignId}` : null}
        hint={metaCampaignId ? `campaign ${metaCampaignId}` : 'no campaign linked yet'}
      />
      <ExternalLinkCard
        label="Cal.com event type"
        url={calcomEventSlug ? `https://cal.com/${calcomEventSlug}` : null}
        hint={calcomEventSlug ? calcomEventSlug : 'no event type linked yet'}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Business</div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Field label="Phone" value={client.business_phone} />
          <Field
            label="Website"
            value={
              client.business_website ? (
                <a href={client.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.business_website}
                </a>
              ) : null
            }
          />
          <Field label="Region" value={client.region} />
          <Field label="Timezone" value={client.timezone} />
          <Field label="SKU" value={<span className="font-mono">{client.sku}</span>} />
          <Field label="MRR" value={formatMrr(client.mrr)} />
        </dl>
        {client.notes && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalLinkCard({ label, url, hint }: { label: string; url: string | null; hint: string }) {
  const inner = (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{hint}</div>
      </div>
      {url ? (
        <ExternalLink className="h-4 w-4 text-blue-600" />
      ) : (
        <span className="text-xs text-gray-400">unavailable</span>
      )}
    </div>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:bg-blue-50/40">
      {inner}
    </a>
  ) : (
    <div className="opacity-60">{inner}</div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      <div className="mt-1 text-xs text-gray-500">{body}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'artifacts', label: 'Artifacts' },
  { key: 'events', label: 'Events' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'settings', label: 'Settings' },
];

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`/.netlify/functions/agency-client-detail?id=${encodeURIComponent(id)}`);
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) {
            setError(res.status === 403 ? 'Founder access required.' : 'Not signed in.');
            setPayload(null);
          }
          return;
        }
        if (res.status === 404) {
          if (!cancelled) {
            setError('Client not found.');
            setPayload(null);
          }
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as DetailPayload;
        if (!cancelled) setPayload(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load client.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading client…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error || 'Client not found.'}
        </div>
      </div>
    );
  }

  const { client } = payload;

  return (
    <div className="space-y-4">
      <BackLink />

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {client.business_name || <span className="italic text-gray-400">Unnamed business</span>}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {client.vertical && <span>{client.vertical}</span>}
              {client.vertical && client.region && <span className="text-gray-300">·</span>}
              {client.region && <span>{client.region}</span>}
              {client.live_at && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>live since {new Date(client.live_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={client.status} />
            <ChurnBadge risk={client.churn_risk} drivers={client.churn_risk_drivers} />
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-mono text-gray-700">
              {client.sku}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {formatMrr(client.mrr)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-2 sm:gap-6" aria-label="Tabs">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab body */}
      {tab === 'overview' && <OverviewTab payload={payload} />}
      {tab === 'artifacts' && <ArtifactsTab payload={payload} />}
      {tab === 'events' && <EventsTab payload={payload} />}
      {tab === 'knowledge' && <KnowledgeTab payload={payload} />}
      {tab === 'settings' && <SettingsTab client={client} />}
    </div>
  );

  function BackLink() {
    return (
      <button
        type="button"
        onClick={() => navigate('/dashboard/agency/clients')}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-3 w-3" /> All clients
      </button>
    );
  }
};

export default ClientDetailPage;
