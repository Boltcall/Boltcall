/**
 * LiveCallTicker — Boltcall Client Portal · Phase E
 *
 * Subtle indicator of currently-active calls. Lives in the corner, never
 * shouts. Empty state is whisper-quiet, not silent — clients want to know
 * the system is breathing.
 *
 * NOT a chatbot UI. NOT a notification stream. Just a one-line indicator.
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LiveCallTickerProps {
  activeCount: number;
  lastCallStartedAt: string | null;
}

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diffMs = Date.now() - t;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return 'a while ago';
};

const LiveCallTicker: React.FC<LiveCallTickerProps> = ({
  activeCount,
  lastCallStartedAt,
}) => {
  const live = activeCount > 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
        live
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-zinc-200 bg-zinc-50 text-zinc-500',
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span
          className={cn(
            'inline-flex h-1.5 w-1.5 rounded-full',
            live ? 'bg-emerald-500' : 'bg-zinc-300',
          )}
        />
        {live ? (
          <span className="absolute inset-0 -m-0.5 inline-flex animate-ping rounded-full bg-emerald-400 opacity-60" />
        ) : null}
      </span>
      <Activity className="h-3 w-3" aria-hidden="true" />
      {live ? (
        <span className="tabular-nums">
          {activeCount} call{activeCount === 1 ? '' : 's'} in progress
        </span>
      ) : (
        <span>
          No active calls
          {lastCallStartedAt ? ` · last ${formatRelativeTime(lastCallStartedAt)}` : ''}
        </span>
      )}
    </div>
  );
};

export default LiveCallTicker;
