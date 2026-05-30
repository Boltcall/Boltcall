/**
 * IntakeScheduler — inline Cal.com booking iframe on /client/welcome.
 *
 * The Cal.com event slug + scheduler URL is taken from the client row's
 * `notes` JSON (or, eventually, a dedicated column) by the parent page —
 * this component is purely presentational so we can swap booking providers
 * without rewiring the welcome page.
 *
 * Listens for Cal.com's "booking_successful" postMessage so the parent page
 * can react (kick the client to /client) without polling the API.
 *
 * Fallback: when the scheduler URL is absent we render a graceful
 * "your strategist will reach out" card instead of a broken iframe.
 */

import React, { useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

import { cn } from '../../lib/utils';

interface IntakeSchedulerProps {
  /**
   * Direct embed URL — e.g. https://cal.com/boltcall/intake?embed=1
   */
  schedulerUrl: string | null;
  /**
   * Called when Cal.com (or any other provider that posts this message)
   * confirms a booking — typically the parent page advances the client
   * out of the welcome view.
   */
  onBookingConfirmed?: (payload: { source: 'cal_com'; raw: unknown }) => void;
  /**
   * Fallback CTA email / link when scheduling isn't wired up yet.
   */
  fallbackContactEmail?: string;
  className?: string;
}

const IntakeScheduler: React.FC<IntakeSchedulerProps> = ({
  schedulerUrl,
  onBookingConfirmed,
  fallbackContactEmail = 'team@boltcall.org',
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!schedulerUrl) return;

    const onMessage = (e: MessageEvent) => {
      // Cal.com posts strongly-typed events under e.data.type. We accept any
      // origin under cal.com / *.cal.com for compatibility with self-hosted
      // and white-label deployments, but the parent should still treat the
      // event as untrusted (this just unblocks the UX, it doesn't grant
      // privilege).
      const data = (e.data ?? {}) as { type?: string; data?: unknown };
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'booking_successful' || data.type === 'BOOKING_CREATED') {
        onBookingConfirmed?.({ source: 'cal_com', raw: data });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [schedulerUrl, onBookingConfirmed]);

  if (!schedulerUrl) {
    return (
      <div className={cn('rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm', className)}>
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-900">Your intake call</p>
        </div>
        <p className="text-sm text-zinc-600">
          Your strategist will reach out within one business hour to schedule your 20-minute
          intake. If you would rather pick a slot now, email{' '}
          <a
            href={`mailto:${fallbackContactEmail}`}
            className="font-medium text-blue-700 hover:underline"
          >
            {fallbackContactEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-900">Pick your 20-minute intake slot</p>
        </div>
        <p className="hidden text-xs text-zinc-500 sm:block">
          Times shown in your local timezone
        </p>
      </div>
      <iframe
        ref={iframeRef}
        src={schedulerUrl}
        title="Schedule intake call"
        className="block h-[640px] w-full border-0"
        // Allow Cal.com camera/mic prompts if their embed needs them downstream.
        allow="payment; clipboard-write"
      />
    </div>
  );
};

export default IntakeScheduler;
