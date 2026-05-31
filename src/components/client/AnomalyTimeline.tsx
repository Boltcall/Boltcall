/**
 * AnomalyTimeline — last 30 days of anomalies + their resolution status.
 *
 * Design principle #5 anchor: "anomalies arrive before the client notices."
 * This component is the receipts for that promise — the client can scroll
 * back and see every anomaly the system caught, what it was, and what
 * we did about it.
 *
 * Resolution states (each gets its own affordance):
 *   - fixed       — emerald checkmark + link to the artifact that fixed it
 *   - monitoring  — sky dot + "watching this for the next few days"
 *   - ignored     — zinc dash + "noise — no action needed"
 *   - pending     — amber dot + "drafting a fix now"
 */
import React from 'react';
import { Check, Eye, Minus, Clock } from 'lucide-react';

export interface AnomalyEntry {
  event_id: string;
  detected_at: string;
  kind: string;
  severity: string;
  summary: string;
  resolution_status: 'fixed' | 'monitoring' | 'ignored' | 'pending';
  resolution_at: string | null;
  resolution_artifact_id: string | null;
}

interface AnomalyTimelineProps {
  entries: AnomalyEntry[];
  reading: string;
}

const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({ entries, reading }) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Anomaly timeline
          </h3>
          <span className="text-xs text-zinc-400">last 30 days</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">
          {reading || 'Quiet month — no anomalies detected in the last 30 days.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Anomaly timeline
        </h3>
        <span className="text-xs text-zinc-400">last 30 days</span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{reading}</p>

      <ol className="mt-5 space-y-0">
        {entries.map((e, i) => (
          <li key={e.event_id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* connector */}
            {i < entries.length - 1 && (
              <div
                aria-hidden
                className="absolute left-[11px] top-7 h-full w-px bg-zinc-200"
              />
            )}

            <ResolutionDot status={e.resolution_status} />

            <div className="min-w-0 flex-1 -mt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                  {fmtDate(e.detected_at)}
                </span>
                <span className="text-[12px] font-medium text-zinc-900">
                  {humanizeKind(e.kind)}
                </span>
                <span className="text-[11px] text-zinc-400">·</span>
                <StatusLabel status={e.resolution_status} when={e.resolution_at} />
              </div>
              <p className="mt-1 text-sm leading-snug text-zinc-700">{e.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

const ResolutionDot: React.FC<{ status: AnomalyEntry['resolution_status'] }> = ({
  status,
}) => {
  const base = 'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full';
  if (status === 'fixed') {
    return (
      <div className={`${base} bg-emerald-100 text-emerald-700`}>
        <Check size={12} strokeWidth={3} />
      </div>
    );
  }
  if (status === 'monitoring') {
    return (
      <div className={`${base} bg-sky-100 text-sky-700`}>
        <Eye size={12} />
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className={`${base} bg-amber-100 text-amber-700`}>
        <Clock size={12} />
      </div>
    );
  }
  return (
    <div className={`${base} bg-zinc-100 text-zinc-500`}>
      <Minus size={12} />
    </div>
  );
};

const StatusLabel: React.FC<{
  status: AnomalyEntry['resolution_status'];
  when: string | null;
}> = ({ status, when }) => {
  const label =
    status === 'fixed'
      ? `fixed${when ? ` ${fmtDate(when)}` : ''}`
      : status === 'monitoring'
        ? 'monitoring'
        : status === 'pending'
          ? 'drafting fix'
          : 'no action needed';
  const tone =
    status === 'fixed'
      ? 'text-emerald-700'
      : status === 'monitoring'
        ? 'text-sky-700'
        : status === 'pending'
          ? 'text-amber-700'
          : 'text-zinc-500';
  return <span className={`text-[11px] italic ${tone}`}>{label}</span>;
};

function humanizeKind(k: string): string {
  return k
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default AnomalyTimeline;
