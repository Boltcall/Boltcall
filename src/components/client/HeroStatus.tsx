/**
 * HeroStatus — Boltcall Client Portal · Phase E
 *
 * The calm hero on /client. Shows:
 *   - Live agent status (one pulsing dot, no chrome).
 *   - Today's pipeline value created so far.
 *
 * Strict design contract:
 *   - One screen, one action. Hero is read-only — no buttons, no CTAs.
 *   - Every number paired with a narrative. The narrative lives in
 *     DailyDigestCard underneath; we just expose the number cleanly here.
 *   - Founder invisible. Strings say "your AI agent", "our team".
 */

import React from 'react';
import { PhoneCall } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface HeroStatusProps {
  agentOnline: boolean;
  agentPhoneNumber: string | null;
  todayPipelineValueUsd: number;
  todayBookings: number;
  todayCalls: number;
}

const formatUsd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const formatPhone = (raw: string | null) => {
  if (!raw) return '';
  // Light formatting — accept E.164 +1XXXXXXXXXX → (XXX) XXX-XXXX
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
};

const HeroStatus: React.FC<HeroStatusProps> = ({
  agentOnline,
  agentPhoneNumber,
  todayPipelineValueUsd,
  todayBookings,
  todayCalls,
}) => {
  return (
    <section
      aria-labelledby="hero-status-heading"
      className="rounded-2xl border border-zinc-200 bg-white px-6 py-5 sm:px-8 sm:py-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left — agent status */}
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'relative mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
              agentOnline ? 'bg-emerald-500' : 'bg-zinc-300',
            )}
            aria-hidden="true"
          >
            {agentOnline ? (
              <span className="absolute inset-0 -m-1 inline-flex animate-ping rounded-full bg-emerald-400 opacity-60" />
            ) : null}
          </span>
          <div>
            <h1
              id="hero-status-heading"
              className="text-base font-medium text-zinc-900 sm:text-lg"
            >
              {agentOnline ? 'Your AI agent is live' : 'Your AI agent is offline'}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {agentOnline
                ? 'Answering calls, capturing leads, booking on the calendar.'
                : 'Our team is restoring the line — we will alert you when it is back.'}
            </p>
            {agentPhoneNumber ? (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-zinc-700">
                <PhoneCall className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <a
                  href={`tel:${agentPhoneNumber}`}
                  className="font-medium tabular-nums tracking-tight hover:text-zinc-900"
                >
                  {formatPhone(agentPhoneNumber)}
                </a>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-500">tap to test</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right — today pipeline value (the only headline number) */}
        <div className="flex flex-col items-start sm:items-end">
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            Today&apos;s pipeline value
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-4xl">
            {formatUsd(todayPipelineValueUsd)}
          </div>
          <div className="mt-1 text-xs text-zinc-500 tabular-nums">
            {todayBookings} booked · {todayCalls} call{todayCalls === 1 ? '' : 's'} handled
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroStatus;
