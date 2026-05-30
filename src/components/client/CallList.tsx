/**
 * CallList — filterable list of calls for /client/calls.
 *
 * Filters (all client-side after the initial fetch — the backend honors
 * outcome / min_qa / sideways query params for cursor-stable filtering,
 * but the list also supports local refinement):
 *   - Outcome chip row: All · Booked · Missed · No-show risk · Transferred
 *   - Date range: 7d / 30d / 90d / all
 *   - Duration range: Any / <2m / 2–5m / >5m
 *   - QA score range: Any / >=8 / 6–8 / <6
 *   - One-click "Calls that went sideways" prominent button
 *
 * Each row shows the per-call AI summary inline (design principle #4).
 * Clicking a row opens the CallDetailDrawer via onSelect.
 */
import React, { useMemo, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

import { Badge } from '../ui/badge';

export interface CallRow {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome: 'booked' | 'missed-opportunity' | 'no-show-risk' | 'transferred' | 'other';
  qa_score: number | null;
  qa_artifact_id: string | null;
  ai_summary: string;
  is_sideways: boolean;
}

interface CallListProps {
  calls: CallRow[];
  loading?: boolean;
  onSelect: (call_id: string) => void;
  sidewaysActive: boolean;
  onSidewaysToggle: () => void;
  outcomeFilter: CallRow['outcome'] | 'all';
  onOutcomeChange: (next: CallRow['outcome'] | 'all') => void;
}

type Duration = 'any' | 'lt2' | '2to5' | 'gt5';
type Qa = 'any' | 'high' | 'mid' | 'low';
type DateRange = '7d' | '30d' | '90d' | 'all';

const OUTCOME_LABELS: Record<CallRow['outcome'] | 'all', string> = {
  all: 'All',
  booked: 'Booked',
  'missed-opportunity': 'Missed',
  'no-show-risk': 'No-show risk',
  transferred: 'Transferred',
  other: 'Other',
};

const OUTCOME_TONE: Record<CallRow['outcome'], { dot: string; text: string }> = {
  booked: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  'missed-opportunity': { dot: 'bg-rose-500', text: 'text-rose-700' },
  'no-show-risk': { dot: 'bg-amber-500', text: 'text-amber-700' },
  transferred: { dot: 'bg-indigo-500', text: 'text-indigo-700' },
  other: { dot: 'bg-zinc-400', text: 'text-zinc-600' },
};

const CallList: React.FC<CallListProps> = ({
  calls,
  loading,
  onSelect,
  sidewaysActive,
  onSidewaysToggle,
  outcomeFilter,
  onOutcomeChange,
}) => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [duration, setDuration] = useState<Duration>('any');
  const [qa, setQa] = useState<Qa>('any');

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateRange, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      all: Number.POSITIVE_INFINITY,
    };
    const cutoff = now - ranges[dateRange];
    return calls.filter((c) => {
      const t = new Date(c.started_at).getTime();
      if (t < cutoff) return false;
      if (duration === 'lt2' && c.duration_sec >= 120) return false;
      if (duration === '2to5' && (c.duration_sec < 120 || c.duration_sec > 300)) return false;
      if (duration === 'gt5' && c.duration_sec <= 300) return false;
      if (qa === 'high' && (c.qa_score === null || c.qa_score < 8)) return false;
      if (qa === 'mid' && (c.qa_score === null || c.qa_score < 6 || c.qa_score >= 8)) return false;
      if (qa === 'low' && (c.qa_score === null || c.qa_score >= 6)) return false;
      return true;
    });
  }, [calls, dateRange, duration, qa]);

  return (
    <div className="space-y-4">
      {/* Sideways CTA + outcome chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSidewaysToggle}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            sidewaysActive
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
          }`}
        >
          <Sparkles size={14} />
          Calls that went sideways
        </button>
        <div className="h-5 w-px bg-zinc-200" aria-hidden />
        {(['all', 'booked', 'missed-opportunity', 'no-show-risk', 'transferred'] as const).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => onOutcomeChange(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                outcomeFilter === key
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
              }`}
            >
              {OUTCOME_LABELS[key]}
            </button>
          ),
        )}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <FilterGroup
          label="Date"
          value={dateRange}
          onChange={(v) => setDateRange(v as DateRange)}
          options={[
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
            { value: '90d', label: '90d' },
            { value: 'all', label: 'All' },
          ]}
        />
        <FilterGroup
          label="Duration"
          value={duration}
          onChange={(v) => setDuration(v as Duration)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'lt2', label: '<2m' },
            { value: '2to5', label: '2–5m' },
            { value: 'gt5', label: '>5m' },
          ]}
        />
        <FilterGroup
          label="QA"
          value={qa}
          onChange={(v) => setQa(v as Qa)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'high', label: '≥8' },
            { value: 'mid', label: '6–8' },
            { value: 'low', label: '<6' },
          ]}
        />
        <span className="ml-auto text-zinc-500">
          {filtered.length} call{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* List */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        {loading && (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Loading calls…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">
              {sidewaysActive
                ? 'No calls went sideways in this window. That\'s a good sign.'
                : 'No calls match these filters yet.'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Adjust filters above to widen the view.
            </p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {filtered.map((c) => (
              <li
                key={c.call_id}
                onClick={() => onSelect(c.call_id)}
                className="group flex cursor-pointer items-start gap-4 px-5 py-4 transition hover:bg-zinc-50"
              >
                <div className="w-20 shrink-0 pt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">
                  {fmtRelative(c.started_at)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                        OUTCOME_TONE[c.outcome].text
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${OUTCOME_TONE[c.outcome].dot}`} />
                      {OUTCOME_LABELS[c.outcome]}
                    </span>
                    <span className="text-[12px] text-zinc-400">·</span>
                    <span className="text-[12px] tabular-nums text-zinc-500">
                      {fmtDuration(c.duration_sec)}
                    </span>
                    {typeof c.qa_score === 'number' && (
                      <>
                        <span className="text-[12px] text-zinc-400">·</span>
                        <Badge
                          variant="outline"
                          className={`px-1.5 py-0 text-[11px] tabular-nums ${qaBadgeClass(c.qa_score)}`}
                        >
                          QA {c.qa_score.toFixed(1)}
                        </Badge>
                      </>
                    )}
                    {c.is_sideways && (
                      <Badge
                        variant="outline"
                        className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[11px] text-rose-700"
                      >
                        Sideways
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-snug text-zinc-700">
                    {c.ai_summary}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="mt-1 shrink-0 text-zinc-300 transition group-hover:text-zinc-500"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface FilterGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}
const FilterGroup: React.FC<FilterGroupProps> = ({ label, value, onChange, options }) => (
  <div className="inline-flex items-center gap-1.5">
    <span className="text-zinc-500">{label}</span>
    <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 transition ${
            value === opt.value
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

function qaBadgeClass(score: number): string {
  if (score >= 8) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 6) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default CallList;
