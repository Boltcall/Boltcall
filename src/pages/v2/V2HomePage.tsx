import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AskBoltcallAIV2 from '../../components/v2/AskBoltcallAIV2';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

/**
 * V2HomePage — single-tenant SaaS V2 home.
 *
 * Layout (top → bottom, inside the existing /v2 outlet container):
 *   1. Hero strip: AskBoltcallAIV2 (input + suggested-prompt chips)
 *   2. Narrative daily-digest card (server-generated 2-3 sentence summary)
 *   3. Pending-attention card (renders only when pending_count > 0)
 *   4. Live call ticker — last 5 calls with status dots
 *
 * Layout shell (DashboardLayoutV2 + SidebarV2 + V2OptInGate) is provided
 * by the parent `/v2` Route in AppRoutes.tsx — this page renders content
 * only (no layout imports).
 *
 * Data: GET `/.netlify/functions/saas-v2-home`. Workspace_id is server-derived
 * from the JWT — we send no body, only the Authorization header (added by
 * `authedFetch`).
 */

interface KpiSnapshot {
  calls_answered: number;
  leads_booked: number;
  missed_calls: number;
  avg_response_seconds: number;
}

interface TickerRow {
  id: string;
  status: 'completed' | 'missed' | 'in_progress' | 'failed';
  label: string;
  timestamp: string;
}

interface PendingItem {
  id: string;
  type: 'urgent_lead' | 'prompt_suggestion' | 'kb_gap';
  title: string;
  detail: string;
  href?: string;
  created_at: string;
}

interface HomeResponse {
  narrative: string;
  pending_count: number;
  pending_items: PendingItem[];
  ticker: TickerRow[];
  kpi_today: KpiSnapshot;
  kpi_yesterday: KpiSnapshot;
  cold_start: boolean;
  lifetime_call_count: number;
}

const STARTER_QUESTIONS = [
  'What did my agent miss yesterday?',
  'Which leads still need a callback?',
  'Why did the last 3 calls disconnect early?',
  'What changed in my booking rate this week?',
];

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function statusDot(status: TickerRow['status']): { className: string; label: string } {
  switch (status) {
    case 'completed':
      return { className: 'bg-emerald-500', label: 'Completed' };
    case 'missed':
      return { className: 'bg-amber-500', label: 'Missed' };
    case 'in_progress':
      return { className: 'bg-blue-500 animate-pulse', label: 'In progress' };
    case 'failed':
    default:
      return { className: 'bg-red-500', label: 'Failed' };
  }
}

const SectionCard: React.FC<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, subtitle, children, action }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    {(title || action) && (
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

const NarrativeSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
  </div>
);

const V2HomePage: React.FC = () => {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-home`, { method: 'GET' });
        if (!res.ok) {
          if (!cancelled) {
            setError(`Failed to load (${res.status})`);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as HomeResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Network error');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const coldStart = !!data?.cold_start;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* 1 — Hero: Ask Boltcall AI strip */}
      <AskBoltcallAIV2
        starterQuestions={STARTER_QUESTIONS}
        placeholder="Ask anything about your calls, leads, or agent…"
      />

      {/* 2 — Narrative daily-digest card */}
      <SectionCard
        title="Today vs. yesterday"
        subtitle="A plain-English summary of how your agent is doing right now."
        action={
          data && !coldStart ? (
            <div className="flex gap-4 text-xs text-slate-500">
              <span>
                <strong className="font-semibold text-slate-900">
                  {data.kpi_today.calls_answered}
                </strong>{' '}
                answered
              </span>
              <span>
                <strong className="font-semibold text-slate-900">
                  {data.kpi_today.leads_booked}
                </strong>{' '}
                booked
              </span>
              <span>
                <strong className="font-semibold text-slate-900">
                  {data.kpi_today.missed_calls}
                </strong>{' '}
                missed
              </span>
            </div>
          ) : null
        }
      >
        {loading && <NarrativeSkeleton />}
        {!loading && error && (
          <p className="text-sm text-red-700">
            We couldn't load today's digest. {error}
          </p>
        )}
        {!loading && !error && data && coldStart && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              Insights unlock at 30 calls
            </p>
            <p className="mt-1 text-xs text-slate-600">
              You have {data.lifetime_call_count} call
              {data.lifetime_call_count === 1 ? '' : 's'} on file. We need a bit more
              data before the daily digest is meaningful — narratives are unlocked at 30
              calls or 14 days of activity.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/v2/agent"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Tune your agent
              </Link>
              <Link
                to="/v2/setup"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Finish setup
              </Link>
            </div>
          </div>
        )}
        {!loading && !error && data && !coldStart && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {data.narrative}
          </p>
        )}
      </SectionCard>

      {/* 3 — Pending-attention card (only when items exist) */}
      {!loading && !error && data && data.pending_count > 0 && (
        <SectionCard
          title={`Needs your attention (${data.pending_count})`}
          subtitle="Leads, prompts, and knowledge-base gaps that benefit from a quick human touch."
        >
          <ul className="divide-y divide-slate-100">
            {data.pending_items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    {item.type.replace('_', ' ')} · {timeAgo(item.created_at)}
                  </p>
                </div>
                {item.href && (
                  <Link
                    to={item.href}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* 4 — Live call ticker (last 5) */}
      <SectionCard
        title="Live call ticker"
        subtitle="Your five most recent calls."
        action={
          <Link
            to="/v2/calls"
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        }
      >
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        )}
        {!loading && !error && data && data.ticker.length === 0 && (
          <p className="text-sm text-slate-500">
            No calls yet today. As soon as your agent picks up, you'll see them here.
          </p>
        )}
        {!loading && !error && data && data.ticker.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {data.ticker.map((row) => {
              const dot = statusDot(row.status);
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot.className}`}
                      aria-label={dot.label}
                    />
                    <p className="truncate text-sm text-slate-800">{row.label}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {timeAgo(row.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default V2HomePage;
