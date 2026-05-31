/**
 * DailyDigestCard — Boltcall Client Portal · Phase E
 *
 * The narrative-first digest of the last 24 hours. NOT a chart dump.
 *
 * Strict design contract:
 *   - Narrative-first. Two sentences of prose, then receipts.
 *   - Every number paired with a story (provided by the server narrative).
 *   - Call evidence chips link directly to the underlying transcript —
 *     the "client can audit any claim" principle.
 *   - Calm typography — looks like a strategist's note, not a chatbot bubble.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';

export interface DigestCallEvidence {
  call_id: string;
  summary: string;
  started_at: string;
  outcome: string;
}

export interface DailyDigestCardProps {
  narrative: string;
  generatedAt: string;
  callEvidence: DigestCallEvidence[];
  confidence: number;
}

const formatRelativeTime = (iso: string): string => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const formatClockTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const DailyDigestCard: React.FC<DailyDigestCardProps> = ({
  narrative,
  generatedAt,
  callEvidence,
  confidence,
}) => {
  return (
    <section
      aria-labelledby="digest-heading"
      className="rounded-2xl border border-zinc-200 bg-white px-6 py-5 sm:px-8 sm:py-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="digest-heading"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Your strategist&apos;s note
        </h2>
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{formatRelativeTime(generatedAt)}</span>
        </span>
      </div>

      {/* The narrative — typographic, calm. Serif-leaning weight is fine
          since this is the strategist's voice, not UI copy. */}
      <p className="mt-3 text-[15px] leading-relaxed text-zinc-800 sm:text-base">
        {narrative}
      </p>

      {/* Receipts — inline chips for each cited call. Each is a deep link
          to the transcript page. Receipts principle from the design spec. */}
      {callEvidence.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {callEvidence.map((c) => (
            <Link
              key={c.call_id}
              to={`/dashboard/calls?call_id=${encodeURIComponent(c.call_id)}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
              title={c.summary}
            >
              <span className="font-medium tabular-nums">
                {formatClockTime(c.started_at)}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="max-w-[180px] truncate">{c.summary}</span>
              <ArrowUpRight
                className="h-3 w-3 text-zinc-400 transition group-hover:text-zinc-600"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : null}

      {confidence < 0.6 ? (
        <p className="mt-3 text-xs text-zinc-400">
          Lower-confidence read — your strategist had limited call detail to ground this.
        </p>
      ) : null}
    </section>
  );
};

export default DailyDigestCard;
