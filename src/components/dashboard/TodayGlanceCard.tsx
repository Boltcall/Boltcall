import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, TrendingUp, Users, PhoneMissed, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getRetellCallHistory } from '../../lib/retell';
import { fetchBookedRevenueMTD, type BookedRevenueMTD } from '../../lib/dashboardApi';
import OverviewMetricCard from './OverviewMetricCard';

// No historical series exists for these headline numbers, so the card is left to
// render its flat "no trend yet" fallback. Do not synthesize a fake slope from the
// single current value — that invents a trend the data never showed.

// Matches MissedCallsPage's bucket threshold: a connected call shorter than this
// reads as an abandoned/missed contact, not a handled one.
const MISSED_CALL_DURATION_THRESHOLD = 15000; // 15 seconds

interface TodayStats {
  missed: number;
  handled: number;
  leadsToday: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Same per-workspace scoping CallHistoryPage/MissedCallsPage use: this user's
// own retell_agent_id set, then retell-calls.ts intersects against Retell's
// call list server-side. No admin-only aggregate, no dead `callbacks` table.
async function fetchTodayStats(userId: string): Promise<TodayStats> {
  const todayStart = startOfToday();

  const [{ data: agents }, { count: leadsToday }] = await Promise.all([
    supabase
      .from('agents')
      .select('retell_agent_id')
      .eq('user_id', userId)
      .not('retell_agent_id', 'is', null),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString()),
  ]);

  const agentIds = (agents || []).map((a) => a.retell_agent_id).filter(Boolean);
  let missed = 0;
  let handled = 0;

  if (agentIds.length > 0) {
    const { calls } = await getRetellCallHistory({ agentIds, startDate: todayStart, limit: 100 });
    for (const call of calls) {
      if (call.call_status === 'not_connected' || call.call_status === 'error') {
        missed++;
      } else if (call.call_status === 'ended') {
        if (call.duration_ms != null && call.duration_ms < MISSED_CALL_DURATION_THRESHOLD) {
          missed++;
        } else {
          handled++;
        }
      }
    }
  }

  return { missed, handled, leadsToday: leadsToday ?? 0 };
}

const TodayGlanceCard: React.FC = () => {
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<BookedRevenueMTD | null>(null);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchBookedRevenueMTD(user.id)
      .then(setRevenue)
      .catch((err) => console.error('Booked revenue fetch failed:', err));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    fetchTodayStats(user.id)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err) => {
        console.error('Today overview fetch failed:', err);
        if (!cancelled) setStats({ missed: 0, handled: 0, leadsToday: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const missed = stats?.missed ?? 0;
  const handled = stats?.handled ?? 0;
  const leadsToday = stats?.leadsToday ?? 0;

  const total = handled + missed;
  // No calls yet today isn't a 100% win rate — it's no data. Don't fabricate one.
  const winRate = total > 0 ? Math.round((handled / total) * 100) : null;
  const needsAction = missed;

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
                  badge={leadsToday > 0 ? 'Captured' : 'None yet'}
                  badgeTone={leadsToday > 0 ? 'positive' : 'neutral'}
                  icon={Users}
                  accentColor="#2563eb"
                  caption="New leads created today"
                />
                <OverviewMetricCard
                  label="AI win rate"
                  period="Overview"
                  value={winRate === null ? '—' : `${winRate}%`}
                  badge={winRate === null ? 'No data' : winRate >= 80 ? 'Strong' : winRate >= 50 ? 'Stable' : 'Watch'}
                  badgeTone={winRate === null ? 'neutral' : winRate >= 80 ? 'positive' : winRate >= 50 ? 'neutral' : 'negative'}
                  icon={TrendingUp}
                  accentColor={winRate === null ? '#94a3b8' : winRate >= 80 ? '#10b981' : winRate >= 50 ? '#f59e0b' : '#ef4444'}
                  caption={winRate === null ? 'No calls yet today' : 'Share of handled calls versus misses'}
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
              {needsAction} call{needsAction !== 1 ? 's' : ''} need a callback right now →
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
