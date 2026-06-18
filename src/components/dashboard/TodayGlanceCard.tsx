import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, TrendingUp, Users, PhoneMissed } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import OverviewMetricCard from './OverviewMetricCard';

function buildMiniSeries(value: number, direction: 'up' | 'down' = 'up') {
  const step = Math.max(1, Math.ceil(Math.max(value, 1) * 0.18));
  return direction === 'up'
    ? [Math.max(value - step, 0), Math.max(value - Math.ceil(step / 2), 0), value]
    : [value + step, Math.max(value + Math.ceil(step / 2), 0), value];
}

const TodayGlanceCard: React.FC = () => {
  const { liveStats, callbackStats, loading } = useDashboardStore();

  const handled = liveStats?.retell?.successful_calls_today ?? 0;
  const missed = liveStats?.retell?.missed_calls_today ?? 0;
  const pending = (callbackStats as { pending?: number } | null)?.pending ?? 0;
  const totalToday = (callbackStats as { total?: number } | null)?.total ?? 0;
  const needsAction = missed + pending;

  const total = handled + missed;
  const winRate = total > 0 ? Math.round((handled / total) * 100) : 100;
  const leadsToday = totalToday || handled;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Today's activity summary"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-[152px] animate-pulse rounded-[24px] border border-slate-200/80 bg-white/70"
              />
            ))
          : (
              <>
                <OverviewMetricCard
                  label="Missed today"
                  period="Overview"
                  value={missed}
                  badge={missed > 0 ? 'Risk' : 'Clear'}
                  badgeTone={missed > 0 ? 'negative' : 'neutral'}
                  chartData={buildMiniSeries(missed, 'down')}
                  icon={PhoneMissed}
                  accentColor="#ef4444"
                  caption={missed > 0 ? 'Calls waiting on cleanup' : 'No calls slipped today'}
                />
                <OverviewMetricCard
                  label="Handled by AI"
                  period="Overview"
                  value={handled}
                  badge={handled > 0 ? 'Live' : 'Idle'}
                  badgeTone={handled > 0 ? 'positive' : 'neutral'}
                  chartData={buildMiniSeries(handled, 'up')}
                  icon={Bot}
                  accentColor="#10b981"
                  caption="Resolved without a human handoff"
                />
                <OverviewMetricCard
                  label="Leads today"
                  period="Overview"
                  value={leadsToday}
                  badge={pending > 0 ? `${pending} pending` : 'Captured'}
                  badgeTone={pending > 0 ? 'negative' : 'positive'}
                  chartData={buildMiniSeries(leadsToday, 'up')}
                  icon={Users}
                  accentColor="#2563eb"
                  caption="New callback opportunities created"
                />
                <OverviewMetricCard
                  label="AI win rate"
                  period="Overview"
                  value={`${winRate}%`}
                  badge={winRate >= 80 ? 'Strong' : winRate >= 50 ? 'Stable' : 'Watch'}
                  badgeTone={winRate >= 80 ? 'positive' : winRate >= 50 ? 'neutral' : 'negative'}
                  chartData={buildMiniSeries(winRate, 'up')}
                  icon={TrendingUp}
                  accentColor={winRate >= 80 ? '#10b981' : winRate >= 50 ? '#f59e0b' : '#ef4444'}
                  caption="Share of handled calls versus misses"
                />
              </>
            )}
      </div>

      {!loading && (
        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 px-5 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          {needsAction > 0 ? (
            <Link
              to="/dashboard/leads"
              className="inline-flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 hover:underline underline-offset-4"
            >
              {needsAction} lead{needsAction !== 1 ? 's' : ''} need a callback right now →
            </Link>
          ) : handled > 0 ? (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              All caught up. AI handled everything today.
            </p>
          ) : (
            <p className="text-sm font-medium text-slate-500">
              Your daily overview will light up as soon as activity starts coming in.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TodayGlanceCard;
