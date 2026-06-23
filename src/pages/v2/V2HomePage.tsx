import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUpRight, AlertCircle, Lightbulb, BookOpen, Activity, PhoneCall, CalendarDays, Clock3 } from 'lucide-react';
import AskBoltcallAIV2 from '../../components/v2/AskBoltcallAIV2';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import OverviewMetricCard from '../../components/dashboard/OverviewMetricCard';

/**
 * V2HomePage — single-tenant SaaS V2 home.
 *
 * Layout (top → bottom, inside the existing /v2 outlet container):
 *   1. Personal greeting + live status pill
 *   2. KPI strip (today's bold numbers vs yesterday delta)
 *   3. Hero strip: AskBoltcallAIV2 (input + suggested-prompt chips)
 *   4. Narrative daily-digest card (server-generated 2-3 sentence summary)
 *   5. Pending-attention card (renders only when pending_count > 0) — colored
 *      category badges per item type (urgent_lead/prompt_suggestion/kb_gap)
 *   6. Live call ticker — last 5 calls with status dots
 *
 * Layout shell (DashboardLayoutV2 + SidebarV2 + V2OptInGate) is provided
 * by the parent `/v2` Route in AppRoutes.tsx — this page renders content
 * only (no layout imports).
 *
 * Data: GET `/.netlify/functions/saas-v2-home`. Workspace_id is server-derived
 * from the JWT — we send no body, only the Authorization header (added by
 * `authedFetch`).
 *
 * Polish layer (2026-06-03): greeting + KPI strip added; AI-generated badge
 * on narrative card; pending items get colored category pills; ticker rows
 * have hover affordance.
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

function deltaPill(today: number, yesterday: number, suffix = ''): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (yesterday === 0 && today === 0) return { text: '—', tone: 'flat' };
  if (yesterday === 0) return { text: `+${today}${suffix}`, tone: 'up' };
  const diff = today - yesterday;
  if (diff === 0) return { text: 'flat', tone: 'flat' };
  return {
    text: `${diff > 0 ? '+' : ''}${diff}${suffix}`,
    tone: diff > 0 ? 'up' : 'down',
  };
}

const PENDING_ITEM_STYLES: Record<
  PendingItem['type'],
  { icon: React.ReactNode; tone: string; label: string }
> = {
  urgent_lead: {
    icon: <AlertCircle className="w-3 h-3" />,
    tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    label: 'Urgent lead',
  },
  prompt_suggestion: {
    icon: <Lightbulb className="w-3 h-3" />,
    tone: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    label: 'Prompt suggestion',
  },
  kb_gap: {
    icon: <BookOpen className="w-3 h-3" />,
    tone: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    label: 'Knowledge gap',
  },
};

const SectionCard: React.FC<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  aiGenerated?: boolean;
}> = ({ title, subtitle, children, action, aiGenerated }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] md:p-6">
    {(title || action) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {title}
              {aiGenerated && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200/60"
                  title="Generated by the Boltcall AI strategist"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </span>
              )}
            </h2>
          )}
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

function deltaTone(delta: { text: string; tone: 'up' | 'down' | 'flat' } | undefined, goodDirection: 'up' | 'down') {
  if (!delta || delta.tone === 'flat') return 'neutral' as const;
  const isGood =
    (delta.tone === 'up' && goodDirection === 'up') ||
    (delta.tone === 'down' && goodDirection === 'down');
  return isGood ? 'positive' as const : 'negative' as const;
}

const KpiTile: React.FC<{
  label: string;
  value: number | string;
  currentValue?: number;
  comparisonValue?: number;
  delta?: { text: string; tone: 'up' | 'down' | 'flat' };
  goodDirection?: 'up' | 'down';
}> = ({ label, value, currentValue, comparisonValue, delta, goodDirection = 'up' }) => {
  const chartData =
    typeof currentValue === 'number' && typeof comparisonValue === 'number'
      ? [comparisonValue, currentValue]
      : typeof value === 'number' && delta && delta.text !== 'flat'
        ? [Math.max(value - Math.abs(value * 0.18), 0), value]
      : [];

  const icon =
    label === 'Calls answered'
      ? PhoneCall
      : label === 'Leads booked'
        ? CalendarDays
        : label === 'Missed'
          ? AlertCircle
          : Clock3;

  const accentColor =
    label === 'Calls answered'
      ? '#2563eb'
      : label === 'Leads booked'
        ? '#059669'
        : label === 'Missed'
          ? '#ef4444'
          : '#f59e0b';

  const caption =
    label === 'Calls answered'
      ? 'Answered by your AI agent today'
      : label === 'Leads booked'
        ? 'Appointments moved onto the calendar'
        : label === 'Missed'
          ? 'Calls that still need cleanup'
          : 'Time to first response';

  return (
    <OverviewMetricCard
      compact
      label={label}
      period="Vs yesterday"
      value={value}
      comparisonValue={comparisonValue}
      badge={delta?.text ?? '-'}
      badgeTone={deltaTone(delta, goodDirection)}
      chartData={chartData}
      icon={icon}
      accentColor={accentColor}
      caption={caption}
    />
  );
};

const V2HomePage: React.FC = () => {
  const { user } = useAuth();
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
  const firstName = (user?.name || user?.email || 'there').split(/[\s@]/)[0];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Working late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  // Live status pill: green when any in_progress, otherwise white
  const liveActive = !!data?.ticker.find((t) => t.status === 'in_progress');

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* 1 — Greeting + live status pill */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            {greeting}, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Here's what your AI agent has been up to.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
            liveActive
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-white text-slate-600 ring-slate-200'
          }`}
          title={liveActive ? 'A call is in progress right now' : 'Idle — no calls in flight'}
        >
          <Activity
            className={`w-3 h-3 ${liveActive ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
          {liveActive ? 'Live' : 'Idle'}
        </span>
      </div>

      {/* 2 — KPI strip (today + delta vs yesterday). Hidden in cold-start. */}
      {!loading && !error && data && !coldStart && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            label="Calls answered"
            value={data.kpi_today.calls_answered}
            currentValue={data.kpi_today.calls_answered}
            comparisonValue={data.kpi_yesterday.calls_answered}
            delta={deltaPill(data.kpi_today.calls_answered, data.kpi_yesterday.calls_answered)}
            goodDirection="up"
          />
          <KpiTile
            label="Leads booked"
            value={data.kpi_today.leads_booked}
            currentValue={data.kpi_today.leads_booked}
            comparisonValue={data.kpi_yesterday.leads_booked}
            delta={deltaPill(data.kpi_today.leads_booked, data.kpi_yesterday.leads_booked)}
            goodDirection="up"
          />
          <KpiTile
            label="Missed"
            value={data.kpi_today.missed_calls}
            currentValue={data.kpi_today.missed_calls}
            comparisonValue={data.kpi_yesterday.missed_calls}
            delta={deltaPill(data.kpi_today.missed_calls, data.kpi_yesterday.missed_calls)}
            goodDirection="down"
          />
          <KpiTile
            label="Avg response"
            value={
              data.kpi_today.avg_response_seconds > 0
                ? `${data.kpi_today.avg_response_seconds}s`
                : '—'
            }
            currentValue={data.kpi_today.avg_response_seconds}
            comparisonValue={data.kpi_yesterday.avg_response_seconds}
            delta={
              data.kpi_today.avg_response_seconds > 0 && data.kpi_yesterday.avg_response_seconds > 0
                ? deltaPill(
                    data.kpi_today.avg_response_seconds,
                    data.kpi_yesterday.avg_response_seconds,
                    's',
                  )
                : undefined
            }
            goodDirection="down"
          />
        </div>
      )}

      {/* 3 — Hero: Ask Boltcall AI strip */}
      <AskBoltcallAIV2
        starterQuestions={STARTER_QUESTIONS}
        placeholder="Ask anything about your calls, leads, or agent…"
      />

      {/* 4 — Narrative daily-digest card */}
      <SectionCard
        title="Today vs. yesterday"
        subtitle="A plain-English summary of how your agent is doing right now."
        aiGenerated={!coldStart && !loading && !error}
      >
        {loading && <NarrativeSkeleton />}
        {!loading && error && (
          <p className="text-sm text-rose-700">
            We couldn't load today's digest. {error}
          </p>
        )}
        {!loading && !error && data && coldStart && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="text-sm font-semibold text-slate-900">
              Insights unlock at 30 calls
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              You have {data.lifetime_call_count} call
              {data.lifetime_call_count === 1 ? '' : 's'} on file. We need a bit more
              data before the daily digest is meaningful — narratives unlock at 30 calls
              or 14 days of activity.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/v2/agent"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Tune your agent
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              <Link
                to="/setup"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Finish setup
                <ArrowUpRight className="w-3 h-3" />
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

      {/* 5 — Pending-attention card (only when items exist) */}
      {!loading && !error && data && data.pending_count > 0 && (
        <SectionCard
          title={`Needs your attention`}
          subtitle="Leads, prompts, and knowledge-base gaps that benefit from a quick human touch."
          action={
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[11px] font-semibold tabular-nums px-1.5">
              {data.pending_count}
            </span>
          }
        >
          <ul className="-mx-1 space-y-1.5">
            {data.pending_items.map((item) => {
              const style = PENDING_ITEM_STYLES[item.type];
              return (
                <li
                  key={item.id}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.tone}`}
                      >
                        {style.icon}
                        {style.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p>
                  </div>
                  {item.href && (
                    <Link
                      to={item.href}
                      className="shrink-0 self-center inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 group-hover:shadow-sm"
                    >
                      Open
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {/* 6 — Live call ticker (last 5) */}
      <SectionCard
        title="Live call ticker"
        subtitle="Your five most recent calls."
        action={
          <Link
            to="/v2/calls"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all
            <ArrowUpRight className="w-3 h-3" />
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
          <ul className="-mx-2 space-y-0.5">
            {data.ticker.map((row) => {
              const dot = statusDot(row.status);
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot.className}`}
                      aria-label={dot.label}
                      title={dot.label}
                    />
                    <p className="truncate text-sm text-slate-800">{row.label}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">
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
