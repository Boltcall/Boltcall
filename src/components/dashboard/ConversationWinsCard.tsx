import React, { useEffect, useState } from 'react';
import { Trophy, Phone, MessageSquare, Smartphone, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import OverviewMetricCard from './OverviewMetricCard';

interface ChannelCount {
  channel: string;
  count: number;
}

interface WinStats {
  totalToday: number;
  totalConversations: number;
  winRate: number;
  byChannel: ChannelCount[];
  healsToday: number;
  healSuccessRate: number;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  voice: <Phone className="w-3 h-3" />,
  chat:  <MessageSquare className="w-3 h-3" />,
  sms:   <Smartphone className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
  email: <Zap className="w-3 h-3" />,
  ads:   <Zap className="w-3 h-3" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  voice:    'Voice',
  chat:     'Chat',
  sms:      'SMS',
  whatsapp: 'WhatsApp',
  email:    'Email',
  ads:      'Ads',
};

function buildMiniSeries(value: number, direction: 'up' | 'down' = 'up') {
  const step = Math.max(1, Math.ceil(Math.max(value, 1) * 0.15));
  return direction === 'up'
    ? [Math.max(value - step, 0), Math.max(value - Math.ceil(step / 2), 0), value]
    : [value + step, Math.max(value + Math.ceil(step / 2), 0), value];
}

export const ConversationWinsCard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<WinStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchStats();
  }, [user?.id]);

  async function fetchStats() {
    if (!user?.id) return;
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    try {
      const [winsResult, healsResult] = await Promise.all([
        supabase
          .from('conversation_wins')
          .select('channel, outcome_type')
          .eq('user_id', user.id)
          .gte('created_at', todayIso),
        supabase
          .from('agent_self_heal_log')
          .select('status')
          .eq('user_id', user.id)
          .gte('created_at', todayIso),
      ]);

      const wins = winsResult.data || [];
      const heals = healsResult.data || [];

      // Channel breakdown
      const channelMap: Record<string, number> = {};
      for (const w of wins) {
        const ch = w.channel || 'unknown';
        channelMap[ch] = (channelMap[ch] || 0) + 1;
      }
      const byChannel: ChannelCount[] = Object.entries(channelMap)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count);

      // Total conversations = wins + heals (each heal = 1 failed conversation)
      const totalConversations = wins.length + heals.length;
      const winRate = totalConversations > 0
        ? Math.round((wins.length / totalConversations) * 100)
        : 0;

      const healsFixed = heals.filter(h => h.status === 'fixed').length;
      const healSuccessRate = heals.length > 0
        ? Math.round((healsFixed / heals.length) * 100)
        : 0;

      setStats({
        totalToday: wins.length,
        totalConversations,
        winRate,
        byChannel,
        healsToday: heals.length,
        healSuccessRate,
      });
    } catch (err) {
      console.error('[ConversationWinsCard] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
        <div className="mb-4 h-4 w-32 rounded bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-[24px] bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Today's Outcomes</span>
        </div>
        <button
          onClick={fetchStats}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <OverviewMetricCard
          compact
          label="Wins today"
          period="Conversation overview"
          value={stats.totalToday}
          badge={stats.totalToday > 0 ? 'Won' : 'Quiet'}
          badgeTone={stats.totalToday > 0 ? 'positive' : 'neutral'}
          chartData={buildMiniSeries(stats.totalToday, 'up')}
          icon={Trophy}
          accentColor="#059669"
          caption={`${stats.totalConversations} conversations evaluated`}
        />
        <OverviewMetricCard
          compact
          label="Win rate"
          period="Conversation overview"
          value={`${stats.winRate}%`}
          badge={stats.winRate >= 70 ? 'Strong' : stats.winRate >= 40 ? 'Mixed' : 'Risk'}
          badgeTone={stats.winRate >= 70 ? 'positive' : stats.winRate >= 40 ? 'neutral' : 'negative'}
          chartData={buildMiniSeries(stats.winRate, 'up')}
          icon={Trophy}
          accentColor={stats.winRate >= 70 ? '#2563eb' : stats.winRate >= 40 ? '#f59e0b' : '#ef4444'}
          caption="Successful conversations as a share of total"
        />
        <OverviewMetricCard
          compact
          label={stats.healsToday === 1 ? 'Self-heal' : 'Self-heals'}
          period="Conversation overview"
          value={stats.healsToday}
          badge={stats.healsToday > 0 ? `${stats.healSuccessRate}% fixed` : 'Idle'}
          badgeTone={stats.healsToday > 0 && stats.healSuccessRate < 60 ? 'negative' : stats.healsToday > 0 ? 'positive' : 'neutral'}
          chartData={buildMiniSeries(stats.healsToday, 'up')}
          icon={Zap}
          accentColor="#7c3aed"
          caption="Recovery loops triggered by the system"
        />
      </div>

      {/* Channel breakdown */}
      {stats.byChannel.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stats.byChannel.map(({ channel, count }) => (
            <span
              key={channel}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {CHANNEL_ICONS[channel] || <Zap className="w-3 h-3" />}
              {CHANNEL_LABELS[channel] || channel} {count}
            </span>
          ))}
        </div>
      )}

      {stats.totalToday === 0 && stats.healsToday === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No conversations evaluated yet today
        </p>
      )}
    </div>
  );
};

export default ConversationWinsCard;
