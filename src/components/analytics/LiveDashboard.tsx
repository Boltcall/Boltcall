import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  Users,
  Calendar,
  Mail,
  Zap,
  PhoneMissed,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import Card from '../ui/Card';
import OverviewMetricCard from '../dashboard/OverviewMetricCard';
import { supabase } from '../../lib/supabase';
import type { LiveCounters, ActivityEvent } from '../../lib/analyticsApi';
import { fetchLiveCounters, fetchActivityFeed } from '../../lib/analyticsApi';

const EVENT_ICONS: Record<string, React.ElementType> = {
  new_lead: Users,
  call_completed: CheckCircle2,
  appointment_booked: Calendar,
  chat_started: MessageCircle,
  sms_sent: Mail,
  missed_call: PhoneMissed,
};

const EVENT_COLORS: Record<string, string> = {
  new_lead: 'bg-blue-100 text-blue-600',
  call_completed: 'bg-green-100 text-green-600',
  appointment_booked: 'bg-purple-100 text-purple-600',
  chat_started: 'bg-cyan-100 text-cyan-600',
  sms_sent: 'bg-amber-100 text-amber-600',
  missed_call: 'bg-red-100 text-red-600',
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function buildMiniSeries(value: number, pulse = false) {
  if (value <= 0 && !pulse) return [];
  const prior = Math.max(value - Math.max(1, Math.ceil(value * 0.15)), 0);
  return [prior, value];
}

const LiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const [counters, setCounters] = useState<LiveCounters>({
    activeCalls: 0,
    activeChats: 0,
    leadsToday: 0,
    callsToday: 0,
    bookingsToday: 0,
    smsSentToday: 0,
  });
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        fetchLiveCounters(user?.id),
        fetchActivityFeed(20, user?.id),
      ]);
      setCounters(c);
      setEvents(e);
    } catch (err) {
      console.error('Failed to load live data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Real-time subscription for callbacks
  useEffect(() => {
    const channel = supabase
      .channel('live-analytics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'callbacks' },
        (payload) => {
          const record = payload.new as any;
          const newEvent: ActivityEvent = {
            id: `rt-${record.id}`,
            type: 'new_lead',
            description: `${record.caller_name || 'New lead'} — ${record.source || 'phone'}`,
            timestamp: record.created_at,
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 20));
          setCounters(prev => ({
            ...prev,
            leadsToday: prev.leadsToday + 1,
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        (payload) => {
          const record = payload.new as any;
          const newEvent: ActivityEvent = {
            id: `rt-chat-${record.id}`,
            type: 'chat_started',
            description: `${record.customer_name || 'Visitor'} started a chat`,
            timestamp: record.created_at,
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 20));
          setCounters(prev => ({
            ...prev,
            activeChats: prev.activeChats + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const liveCards = [
    {
      label: 'Active Calls',
      value: counters.activeCalls,
      icon: Phone,
      accentColor: '#059669',
      pulse: counters.activeCalls > 0,
      caption: counters.activeCalls > 0 ? 'Calls are happening right now' : 'No active calls in flight',
    },
    {
      label: 'Active Chats',
      value: counters.activeChats,
      icon: MessageSquare,
      accentColor: '#0891b2',
      pulse: counters.activeChats > 0,
      caption: counters.activeChats > 0 ? 'Visitors are chatting live' : 'No active chats right now',
    },
    {
      label: 'Leads Today',
      value: counters.leadsToday,
      icon: Users,
      accentColor: '#2563eb',
      pulse: false,
      caption: 'New leads captured today',
    },
    {
      label: 'Calls Today',
      value: counters.callsToday,
      icon: Phone,
      accentColor: '#7c3aed',
      pulse: false,
      caption: 'Total calls logged today',
    },
    {
      label: 'Bookings Today',
      value: counters.bookingsToday,
      icon: Calendar,
      accentColor: '#d97706',
      pulse: false,
      caption: 'Appointments booked today',
    },
    {
      label: 'SMS Today',
      value: counters.smsSentToday,
      icon: Mail,
      accentColor: '#4f46e5',
      pulse: false,
      caption: 'Messages sent from Boltcall',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <Card className="p-6">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="live-dashboard">
      {/* Live counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {liveCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <OverviewMetricCard
              compact
              label={card.label}
              period="Live overview"
              value={card.value}
              badge={card.pulse ? 'Active' : 'Live'}
              badgeTone={card.pulse ? 'positive' : 'neutral'}
              chartData={buildMiniSeries(card.value, card.pulse)}
              icon={card.icon}
              accentColor={card.accentColor}
              caption={card.caption}
            />
          </motion.div>
        ))}
      </div>

      {/* Activity feed */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-text-main">Live Activity Feed</h3>
          <span className="flex h-2 w-2 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          <AnimatePresence>
            {events.map((event, i) => {
              const Icon = EVENT_ICONS[event.type] || Zap;
              const colorClass = EVENT_COLORS[event.type] || 'bg-gray-100 text-gray-600';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-main truncate">{event.description}</p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{timeAgo(event.timestamp)}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {events.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-text-muted">
              No activity recorded yet. Events will appear here in real-time.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LiveDashboard;
