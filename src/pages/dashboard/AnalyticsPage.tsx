import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { AlertCircle, RefreshCw, Loader2, Coins, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import KpiTile from '../../components/dashboard/KpiTile';
import Card from '../../components/ui/Card';
import {
  fetchUserCallStats,
  fetchUserLeadsCount,
  type UserCallStats,
} from '../../lib/analyticsApi';
import { useTokens } from '../../contexts/TokenContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

type DateRange = '7d' | '30d' | '90d' | 'custom';

function getDateRange(range: DateRange, customStart?: string, customEnd?: string) {
  if (range === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

const AnalyticsPage: React.FC = () => {
  const [callStats, setCallStats] = useState<UserCallStats | null>(null);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLastRefresh] = useState<Date | null>(null);
  const [tokensToday, setTokensToday] = useState(0);
  const [tokensThisWeek, setTokensThisWeek] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const { totalAvailable, tokensUsed, monthlyAllocation, isLoading: tokensLoading } = useTokens();
  const { user } = useAuth();

  // Real per-workspace data only — same agents->retell-calls scoping as
  // CallHistoryPage/TodayGlanceCard, plus a leads-table count. No admin-only
  // dashboard-stats aggregate, no daily_metrics (service_role-only RLS).
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange(dateRange, customStart, customEnd);
      const [stats, leads] = await Promise.all([
        fetchUserCallStats(user.id, range),
        fetchUserLeadsCount(user.id, range),
      ]);
      setCallStats(stats);
      setLeadsCount(leads);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd, user?.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Fetch token consumption for today and this week
  useEffect(() => {
    if (!user?.id) return;

    const fetchTokenUsage = async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      // Tokens consumed today
      const { data: todayData } = await supabase
        .from('token_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .gte('created_at', todayStart);

      const todayTotal = (todayData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setTokensToday(todayTotal);

      // Tokens consumed this week
      const { data: weekData } = await supabase
        .from('token_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .gte('created_at', weekStart);

      const weekTotal = (weekData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setTokensThisWeek(weekTotal);
    };

    fetchTokenUsage();
  }, [user?.id]);

  /* ----- Loading state ----- */
  if (loading && !callStats) {
    return <PageSkeleton />;
  }

  /* ----- Error state ----- */
  if (error && !callStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-main mb-2">Unable to load analytics</h3>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blueDark transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </Card>
      </div>
    );
  }

  // No per-day history source exists for these headline numbers (daily_metrics
  // is service_role-only), so tiles render without a sparkline rather than a
  // fabricated trend line.
  const emptySparkline: number[] = [];

  return (
    <div className="space-y-8">

      {/* Deep Analytics banner */}
      <Link
        to="/dashboard/deep-analytics"
        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue/10 rounded-lg">
            <BarChart3 className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-main">Deep Analytics</p>
            <p className="text-xs text-text-muted">Conversion funnels, ROI metrics, agent performance, and more</p>
          </div>
        </div>
        <span className="text-sm font-medium text-brand-blue group-hover:underline">
          Open &rarr;
        </span>
      </Link>

      {/* Header with date range picker and refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#17171b] rounded-lg p-1 overflow-x-auto scrollbar-hide">
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === r && !showCustomPicker
                  ? 'bg-white dark:bg-[#111114] text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
          <button
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
              dateRange === 'custom'
                ? 'bg-white dark:bg-[#111114] text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
        <div className="flex items-center gap-3">
          {showCustomPicker && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 text-sm rounded-lg border border-border w-full sm:w-auto"
              />
              <span className="text-text-muted text-sm hidden sm:inline">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 text-sm rounded-lg border border-border w-full sm:w-auto"
              />
              <button
                onClick={() => { if (customStart && customEnd) setDateRange('custom'); }}
                disabled={!customStart || !customEnd}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-blue text-white hover:bg-brand-blueDark transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                Apply
              </button>
            </div>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner (when we have stale data but refresh failed) */}
      {error && callStats && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Refresh failed: {error}. Showing last known data.
        </div>
      )}

      {/* KPI Cards - Primary metrics, real per-workspace call + lead data
          for the selected date range */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiTile
          title="Total Calls"
          value={callStats?.callsTotal ?? 0}
          delta={0}
          sparkline={emptySparkline}
          format="number"
        />
        <KpiTile
          title="Success Rate"
          value={callStats ? `${callStats.successRate}%` : '0%'}
          delta={0}
          sparkline={emptySparkline}
        />
        <KpiTile
          title="Avg Duration"
          value={fmtDuration(callStats?.avgDurationSeconds ?? 0)}
          delta={0}
          sparkline={emptySparkline}
          format="time"
        />
        <KpiTile
          title="Total Leads"
          value={leadsCount}
          delta={0}
          sparkline={emptySparkline}
          format="number"
        />
        <KpiTile
          title="Missed Calls"
          value={callStats?.callsMissed ?? 0}
          delta={0}
          sparkline={emptySparkline}
          format="number"
        />
      </div>

      {/* Token Usage Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-text-main">Token Usage</h3>
          </div>
          {tokensLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-main">{fmtNumber(tokensToday)}</p>
                <p className="text-xs text-text-muted mt-1">Consumed Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-main">{fmtNumber(tokensThisWeek)}</p>
                <p className="text-xs text-text-muted mt-1">Consumed This Week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-blue">{fmtNumber(totalAvailable)}</p>
                <p className="text-xs text-text-muted mt-1">Remaining Balance</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-main">
                  {monthlyAllocation > 0 ? `${Math.round((tokensUsed / monthlyAllocation) * 100)}%` : '0%'}
                </p>
                <p className="text-xs text-text-muted mt-1">Monthly Used</p>
                {monthlyAllocation > 0 && (
                  <div className="mt-2 w-full bg-gray-200 dark:bg-[#17171b] rounded-full h-1.5">
                    <div
                      className="bg-brand-blue h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((tokensUsed / monthlyAllocation) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ponytail: secondary KPI row, trend chart, callbacks/chats card, and
          latest-snapshot card deleted — all read the admin-only dashboard-stats
          aggregate or service_role-only daily_metrics, so every value was 0 for
          a real customer. Re-add per-widget once each has a real per-workspace
          source. */}
    </div>
  );
};

export default AnalyticsPage;
