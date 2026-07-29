import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Zap,
  Phone,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Users,
  Database,
  Loader2,
  Gift,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useUsageTracking } from '../../../hooks/useUsageTracking';
import UsageBar from '../../../components/dashboard/UsageBar';
import UsageLimitModal from '../../../components/dashboard/UsageLimitModal';
import {
  PLAN_LIMITS,
  STRUCTURAL_LIMIT_RESOURCES,
  formatLimit,
  getNextPlan,
  isStructuralLimitResource,
  type ResourceType,
  type PlanTier,
} from '../../../lib/plan-limits';
import {
  TOKEN_REWARDS,
  tokensToMessages,
  tokensToMinutes,
  tokensToSms,
} from '../../../lib/tokens';
import { useTokens } from '../../../contexts/TokenContext';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { PageSkeleton } from '../../../components/ui/loading-skeleton';

// Icon map for summary cards
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Users,
  Database,
};

interface TokenTransaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

const UsagePage: React.FC = () => {
  const { user } = useAuth();
  const {
    trend,
    isLoading,
    planTier,
    periodStart,
    periodEnd,
    getAllResourceUsages,
    refresh,
  } = useUsageTracking();
  const { bonusBalance, totalAvailable, monthlyAllocation, tokensUsed } = useTokens();

  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);

  // Fetch recent transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) return;
      setTxLoading(true);
      try {
        const { data, error } = await supabase
          .from('token_transactions')
          .select('id, amount, category, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error('Error fetching token transactions:', err);
      } finally {
        setTxLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id]);

  // Fetch claimed rewards
  useEffect(() => {
    const fetchClaimedRewards = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('token_rewards_claimed')
          .select('reward_type')
          .eq('user_id', user.id);

        if (!error && data) {
          setClaimedRewards(data.map((r: { reward_type: string }) => r.reward_type));
        }
      } catch (err) {
        console.error('Error fetching claimed rewards:', err);
      }
    };

    fetchClaimedRewards();
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const resourceUsages = getAllResourceUsages();
  const structuralUsages = resourceUsages.filter((r) => isStructuralLimitResource(r.resource));
  const atLimitResources = structuralUsages.filter((r) => r.isAtLimit);
  const approachingResources = structuralUsages.filter((r) => r.isApproaching && !r.isAtLimit);
  const planConfig = PLAN_LIMITS[planTier];
  const nextPlan = getNextPlan(planTier);
  const nextPlanConfig = nextPlan ? PLAN_LIMITS[nextPlan] : null;

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Days remaining in period
  const daysRemaining = periodEnd
    ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Token usage percent
  const tokenUsagePercent = monthlyAllocation > 0
    ? Math.min((tokensUsed / monthlyAllocation) * 100, 100)
    : 0;
  const remainingCredits = Math.max(totalAvailable, 0);
  const monthlyCredits = Math.max(monthlyAllocation, 0);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Usage Limit Modal */}
      <UsageLimitModal />

      {/* Overage warnings */}
      {atLimitResources.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                {atLimitResources.length === 1
                  ? `${PLAN_LIMITS[planTier].limits[atLimitResources[0].resource].label} limit reached`
                  : `${atLimitResources.length} workspace limits reached`}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {atLimitResources
                  .map((r) => PLAN_LIMITS[planTier].limits[r.resource].label)
                  .join(', ')}{' '}
                {atLimitResources.length === 1 ? 'has' : 'have'} reached the{' '}
                {planConfig.name} plan limit. Upgrade to continue using{' '}
                {atLimitResources.length === 1 ? 'this feature' : 'these features'}.
              </p>
            </div>
            {nextPlan && (
              <Link
                to="/dashboard/settings/plan-billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 ease-out whitespace-nowrap"
              >
                Upgrade to {nextPlanConfig?.name} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {approachingResources.length > 0 && atLimitResources.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">Approaching limits:</span>{' '}
              {approachingResources
                .map((r) => `${PLAN_LIMITS[planTier].limits[r.resource].label} (${Math.round(r.percentage)}%)`)
                .join(', ')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Billing Period & Plan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-5"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/15 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Plan</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{planConfig.name}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${planConfig.monthlyPrice}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500">/mo</span>
          </p>
          {nextPlan && (
            <Link
              to="/dashboard/settings/plan-billing"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 ease-out"
            >
              Upgrade to {nextPlanConfig?.name} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </motion.div>

        {/* Billing Period */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-5"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-[#17171b] rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Billing Period</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDate(periodStart)} - {formatDate(periodEnd)}
              </p>
            </div>
          </div>
          {daysRemaining !== null && (
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {daysRemaining}
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> days left</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usage resets {formatDate(periodEnd)}</p>
            </div>
          )}
          {daysRemaining === null && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No active billing period</p>
          )}
        </motion.div>

        {/* Shared Credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-5"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-500/15 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Shared Credits</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {remainingCredits.toLocaleString()} available
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Used this period</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {tokensUsed.toLocaleString()} / {monthlyCredits.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#17171b] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-200 ease-out ${
                  tokenUsagePercent >= 90 ? 'bg-red-500' : tokenUsagePercent >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${tokenUsagePercent}%` }}
              />
            </div>
            {bonusBalance > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400">+{bonusBalance.toLocaleString()} bonus credits</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
              Phone, SMS, website chat, and other metered actions all use this same pool.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Shared Pool Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/15 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">One Shared Pool</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Phone, SMS, website chat, and the rest pull from the same credits.</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#17171b] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors duration-200 ease-out disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-gray-50 dark:bg-[#17171b] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Voice Minutes Left</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{tokensToMinutes(remainingCredits).toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tokensToMinutes(monthlyCredits).toLocaleString()} if you spent the full pool on phone.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-gray-50 dark:bg-[#17171b] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">SMS Left</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{tokensToSms(remainingCredits).toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tokensToSms(monthlyCredits).toLocaleString()} if you spent the full pool on SMS.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-gray-50 dark:bg-[#17171b] px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Chat Messages Left</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{tokensToMessages(remainingCredits).toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tokensToMessages(monthlyCredits).toLocaleString()} if you spent the full pool on chat.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-blue-100 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">No separate phone / SMS / website bucket</p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            If you use the whole pool on phone, there&apos;s nothing left for SMS or website chat until the next billing reset.
          </p>
        </div>

        {/* Plan comparison row */}
        {nextPlan && nextPlanConfig && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#17171b]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Need more capacity?
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {nextPlanConfig.name} gives you {nextPlanConfig.monthlyTokens.toLocaleString()} shared monthly credits.
                </p>
              </div>
              <Link
                to="/dashboard/settings/plan-billing"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 ease-out whitespace-nowrap flex-shrink-0"
              >
                Upgrade <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </motion.div>

      {/* Structural Limits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-gray-100 dark:bg-[#17171b] rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Workspace Limits</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Separate caps that still apply outside the shared credit pool.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {structuralUsages.map((ru) => (
            <UsageBar
              key={ru.resource}
              resource={ru.resource}
              current={ru.current}
              limit={ru.limit}
              percentage={ru.percentage}
              showIcon
              size="md"
            />
          ))}
        </div>
      </motion.div>

      {/* Usage Trend Chart (Last 30 Days) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Usage Trend</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
          </div>
        </div>

        {trend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradVoice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  labelFormatter={(val) =>
                    new Date(val).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="ai_voice_minutes"
                  name="Voice Minutes"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#gradVoice)"
                />
                <Area
                  type="monotone"
                  dataKey="ai_chat_messages"
                  name="Chat Messages"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#gradChat)"
                />
                <Area
                  type="monotone"
                  dataKey="sms_sent"
                  name="SMS Sent"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#gradSms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No usage data yet</p>
            <p className="text-xs mt-1">Usage trends will appear as you use features</p>
          </div>
        )}
      </motion.div>

      {/* Plan Limits Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Plan Credits Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#1e1e24]">
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Included
                </th>
                {(['starter', 'pro', 'ultimate', 'enterprise'] as PlanTier[]).map((tier) => (
                  <th
                    key={tier}
                    className={`text-center py-3 px-3 text-xs font-medium uppercase tracking-wider ${
                      tier === planTier ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {PLAN_LIMITS[tier].name}
                    {tier === planTier && (
                      <span className="block text-[10px] normal-case font-normal text-blue-500 dark:text-blue-400">
                        Current
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 dark:border-[#17171b]">
                <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 font-medium">Shared monthly credits</td>
                {(['starter', 'pro', 'ultimate', 'enterprise'] as PlanTier[]).map((tier) => (
                  <td
                    key={tier}
                    className={`text-center py-3 px-3 text-sm font-medium ${
                      tier === planTier ? 'text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-500/10' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {PLAN_LIMITS[tier].monthlyTokens.toLocaleString()}
                  </td>
                ))}
              </tr>
              {(
                STRUCTURAL_LIMIT_RESOURCES as readonly ResourceType[]
              ).map((resource) => {
                const config = PLAN_LIMITS.starter.limits[resource];
                const Icon = ICON_MAP[config.icon] || Phone;
                return (
                  <tr key={resource} className="border-b border-gray-50 dark:border-[#17171b]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{config.label}</span>
                      </div>
                    </td>
                    {(['starter', 'pro', 'ultimate', 'enterprise'] as PlanTier[]).map((tier) => {
                      const lim = PLAN_LIMITS[tier].limits[resource];
                      return (
                        <td
                          key={tier}
                          className={`text-center py-3 px-3 text-sm font-medium ${
                            tier === planTier ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'
                          }`}
                        >
                          {formatLimit(lim.limit, lim.unit)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 font-medium">Price</td>
                {(['starter', 'pro', 'ultimate', 'enterprise'] as PlanTier[]).map((tier) => (
                  <td
                    key={tier}
                    className={`text-center py-3 px-3 text-sm font-semibold ${
                      tier === planTier ? 'text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-500/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    ${PLAN_LIMITS[tier].monthlyPrice}/mo
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Bonus Credits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/15 rounded-lg flex items-center justify-center">
            <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bonus Credits</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete actions to earn bonus credits</p>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-[#17171b] pt-4 space-y-2.5">
          {Object.entries(TOKEN_REWARDS).map(([key, reward]) => {
            const isClaimed = claimedRewards.includes(key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  isClaimed ? 'bg-green-50 dark:bg-green-500/10' : 'bg-gray-50 dark:bg-[#17171b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isClaimed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${isClaimed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {reward.label}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${isClaimed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                >
                  {isClaimed ? 'Claimed' : `+${reward.tokens} credits`}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Usage History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-100 dark:bg-[#17171b] rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Usage History</h3>
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 border-t border-gray-100 dark:border-[#17171b]">
            <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No usage history yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Credit transactions will appear here as you use features
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-gray-100 dark:border-[#17171b]">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1e1e24]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 dark:border-[#17171b] hover:bg-gray-50/50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-[#17171b] text-gray-700 dark:text-gray-300 capitalize">
                        {tx.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{tx.description}</td>
                    <td
                      className={`py-3 px-4 text-sm font-semibold text-right ${
                        tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UsagePage;
