import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, TrendingUp, Users, PhoneMissed, DollarSign } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useAuth } from '../../contexts/AuthContext';
import { fetchBookedRevenueMTD, type BookedRevenueMTD } from '../../lib/dashboardApi';
import OverviewMetricCard from './OverviewMetricCard';

// No historical series exists for these headline numbers, so the card is left to
// render its flat "no trend yet" fallback. Do not synthesize a fake slope from the
// single current value — that invents a trend the data never showed.

const TodayGlanceCard: React.FC = () => {
  const { liveStats, callbackStats, loading } = useDashboardStore();
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<BookedRevenueMTD | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchBookedRevenueMTD(user.id)
      .then(setRevenue)
      .catch((err) => console.error('Booked revenue fetch failed:', err));
  }, [user?.id]);

  const handled =
    liveStats?.retell?.successful_calls_today ??
    (callbackStats as { completed?: number } | null)?.completed ??
    0;
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading
          ? [0, 1, 2, 3, 4].map((index) => (
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
                  icon={TrendingUp}
                  accentColor={winRate >= 80 ? '#10b981' : winRate >= 50 ? '#f59e0b' : '#ef4444'}
                  caption="Share of handled calls versus misses"
                />
                {revenue && revenue.valuedBookings === 0 ? (
                  <Link to="/dashboard/settings/services" className="block">
                    <OverviewMetricCard
                      label="Booked this month"
                      period="Overview"
                      value="$0"
                      badge="Set up"
                      badgeTone="neutral"
                      icon={DollarSign}
                      accentColor="#10b981"
                      caption="Set your service prices to see booked revenue"
                    />
                  </Link>
                ) : (
                  <OverviewMetricCard
                    label="Booked this month"
                    period="Overview"
                    value={`$${Math.round((revenue?.totalCents ?? 0) / 100).toLocaleString()}`}
                    badge={revenue && revenue.bookings > 0 ? `${revenue.bookings} booking${revenue.bookings !== 1 ? 's' : ''}` : 'MTD'}
                    badgeTone={revenue && revenue.totalCents > 0 ? 'positive' : 'neutral'}
                    icon={DollarSign}
                    accentColor="#10b981"
                    caption="Estimated value of this month's bookings"
                  />
                )}
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
