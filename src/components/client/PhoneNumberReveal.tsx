/**
 * PhoneNumberReveal — the "your number is already reserved" card on /client/welcome.
 *
 * Surfaces the auto-provisioned Retell phone number with a tap-to-call
 * affordance. On mobile, the tap initiates a real call via `tel:`. On
 * desktop, we copy the number to the clipboard with a brief inline
 * acknowledgment ("copied — call it on your phone").
 *
 * The big idea (per the customer-UX design): the client sees their dedicated
 * number BEFORE they've done anything, which sells the "system is already
 * moving" feeling.
 */

import React, { useState } from 'react';
import { Phone, Copy, Check } from 'lucide-react';

import { cn } from '../../lib/utils';

interface PhoneNumberRevealProps {
  /** E.164 phone number, e.g. "+14155551234". */
  phoneNumber: string | null;
  /** Optional area-code hint shown while provisioning ("(415) reserved for you"). */
  reservingMessage?: string;
  className?: string;
}

function formatE164(num: string): string {
  // Cheap E.164 → "(415) 555-1234" for US/CA. Falls back to the raw string
  // for non-NANP numbers — clients in other countries can still tap to call.
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return num;
}

const PhoneNumberReveal: React.FC<PhoneNumberRevealProps> = ({
  phoneNumber,
  reservingMessage,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in insecure contexts — silently degrade,
      // the tap-to-call link still works.
    }
  };

  // Pending state — number not yet reserved.
  if (!phoneNumber) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center',
          className,
        )}
      >
        <Phone className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-800">Reserving your phone number…</p>
        <p className="mt-1 text-xs text-zinc-500">
          {reservingMessage || 'Usually under 60 seconds. Refresh in a moment.'}
        </p>
      </div>
    );
  }

  const pretty = formatE164(phoneNumber);

  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Your dedicated number — already reserved
          </p>
          <a
            href={`tel:${phoneNumber}`}
            className="mt-2 block text-2xl font-semibold tracking-tight text-zinc-900 hover:text-blue-700 sm:text-3xl"
          >
            {pretty}
          </a>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Tap the number to call it from this device. You'll hear voicemail until your agent goes live — that's expected.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy phone number"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white transition',
            'hover:border-zinc-300 hover:bg-zinc-50',
            copied && 'border-emerald-300 bg-emerald-50 text-emerald-700',
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 text-zinc-600" />}
        </button>
      </div>

      <a
        href={`tel:${phoneNumber}`}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        <Phone className="h-4 w-4" />
        Call this number now
      </a>
    </div>
  );
};

export default PhoneNumberReveal;
