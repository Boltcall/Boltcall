import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useIndustry } from '../../hooks/useIndustry';
import { countOf } from '../../lib/industryWording';

dayjs.extend(relativeTime);

const STORAGE_KEY = 'boltcall_last_dashboard_visit';

interface Summary {
  newLeads: number;
  aiHandled: number;
  booked: number;
  goneMs: number;
}

const WhileYouWereGone: React.FC = () => {
  const { user } = useAuth();
  const { words } = useIndustry();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const lastVisit = raw ? dayjs(raw) : null;
    // Update last visit now so next time we compare from this moment
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());

    // Only show if user was gone for more than 30 minutes
    if (!lastVisit || dayjs().diff(lastVisit, 'minute') < 30) return;

    const since = lastVisit.toISOString();
    const goneMs = dayjs().diff(lastVisit, 'millisecond');

    supabase
      .from('callbacks')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const newLeads = data.length;
        const booked = data.filter(d => d.status === 'scheduled' || d.status === 'completed').length;
        const aiHandled = data.filter(d => d.status !== 'pending').length;
        setSummary({ newLeads, aiHandled, booked, goneMs });
      });
  }, [user?.id]);

  if (!summary || dismissed) return null;

  const hoursGone = Math.round(summary.goneMs / 3600000);
  const timeLabel = hoursGone >= 1 ? `${hoursGone}h` : `${Math.round(summary.goneMs / 60000)}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border/30 bg-background/40 px-5 py-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
            While you were away ({timeLabel})
          </p>
          <div className="flex flex-wrap gap-5">
            {summary.newLeads > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {countOf(summary.newLeads, `new ${words.lead}`, `new ${words.leads}`)} captured
                </span>
              </div>
            )}
            {summary.aiHandled > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  AI handled {summary.aiHandled} — you didn't lift a finger
                </span>
              </div>
            )}
            {summary.booked > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {countOf(summary.booked, words.appointment, words.appointments)} booked automatically
                </span>
              </div>
            )}
            {summary.aiHandled === 0 && summary.newLeads === 0 && (
              <span className="text-sm text-foreground/60">No new activity while you were away.</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-foreground/30 hover:text-foreground/60 transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

export default WhileYouWereGone;
