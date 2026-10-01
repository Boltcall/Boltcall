import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useIndustry } from '../../hooks/useIndustry';
import type { Wording } from '../../lib/industryWording';

dayjs.extend(relativeTime);

interface FeedEvent {
  id: string;
  label: (w: Wording) => string;
  dot: string;
  created_at: string;
  channel?: string;
}

const CHANNEL_BADGE: Record<string, string> = {
  voice:    '📞',
  chat:     '💬',
  sms:      '📱',
  whatsapp: '💬',
  email:    '✉️',
  ads:      '📣',
};

const WinFeed: React.FC = () => {
  const { user } = useAuth();
  const { words } = useIndustry();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const uid = user.id;

    Promise.all([
      // Legacy callbacks table
      supabase
        .from('callbacks')
        .select('id, client_name, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(5),
      // AI-evaluated wins
      supabase
        .from('conversation_wins')
        .select('id, channel, outcome_type, summary, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([callbacksResult, winsResult]) => {
      const callbackEvents: FeedEvent[] = (callbacksResult.data || []).map((c: any) => ({
        id: `cb-${c.id}`,
        label: (w) => buildCallbackLabel(c, w),
        dot: callbackDot(c.status),
        created_at: c.created_at,
      }));

      const winEvents: FeedEvent[] = (winsResult.data || []).map((w: any) => ({
        id: `win-${w.id}`,
        label: (words) => buildWinLabel(w, words),
        dot: 'bg-emerald-400',
        created_at: w.created_at,
        channel: w.channel,
      }));

      // Merge, sort by time, take top 8
      const merged = [...callbackEvents, ...winEvents]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);

      setEvents(merged);
      setLoading(false);
    });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/30 bg-background/40 px-5 py-4 backdrop-blur-sm space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/10 animate-pulse shrink-0" />
            <span className="h-3 rounded bg-foreground/10 animate-pulse" style={{ width: `${55 + i * 10}%` }} />
            <span className="h-3 w-12 rounded bg-foreground/10 animate-pulse ml-auto shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="rounded-lg border border-border/30 bg-background/40 px-5 py-4 backdrop-blur-sm"
    >
      <ul className="space-y-3" aria-label="Recent AI activity">
        {events.map((event) => (
          <li key={event.id} className="flex items-center gap-3">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${event.dot}`} aria-hidden="true" />
            <span className="text-sm text-foreground/75 truncate">
              {event.channel && CHANNEL_BADGE[event.channel] ? (
                <span className="mr-1">{CHANNEL_BADGE[event.channel]}</span>
              ) : null}
              {event.label(words)}
            </span>
            <span className="ml-auto text-[10px] text-foreground/40 shrink-0 tabular-nums">
              {dayjs(event.created_at).fromNow()}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

function buildCallbackLabel(c: { client_name?: string; status: string }, w: Wording): string {
  const name = c.client_name || `A ${w.lead}`;
  switch (c.status) {
    case 'completed': return `Booking confirmed with ${name}`;
    case 'scheduled': return `AI booked ${name} for ${w.appointment === 'appointment' ? 'an appointment' : `a ${w.appointment}`}`;
    case 'pending':   return `New ${w.lead} captured: ${name} waiting for callback`;
    default:          return `${w.lead.charAt(0).toUpperCase()}${w.lead.slice(1)} captured: ${name}`;
  }
}

function buildWinLabel(w: { channel?: string; outcome_type?: string; summary?: string }, words: Wording): string {
  const channel = w.channel || 'unknown';
  if (w.outcome_type === 'booked') {
    return `AI booked ${words.appointment} via ${channel}`;
  }
  if (w.outcome_type === 'answered') {
    return `${words.lead.charAt(0).toUpperCase()}${words.lead.slice(1)} question resolved via ${channel}`;
  }
  return w.summary || `Conversation resolved via ${channel}`;
}

function callbackDot(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-400';
    case 'scheduled': return 'bg-blue-400';
    case 'pending':   return 'bg-amber-400';
    default:          return 'bg-foreground/20';
  }
}

export default WinFeed;
