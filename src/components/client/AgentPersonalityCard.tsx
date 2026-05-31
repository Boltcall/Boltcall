/**
 * AgentPersonalityCard — plain-language description of the production prompt.
 *
 * UX contract:
 *   - The client never sees the raw prompt. The card reads like a profile
 *     ("greets warmly", "books to your Tuesday/Thursday slots") — not like
 *     a config dump.
 *   - Loading state is a strategist's note skeleton, NOT a chatbot ellipsis.
 *   - Data comes from /api/agency-client-agent-summary which calls Sonnet
 *     fresh on every load — we trust the parent page to manage caching/refetch.
 */

import React from 'react';
import { Loader2, MessageCircle, ArrowRightCircle, Calendar } from 'lucide-react';

import { cn } from '../../lib/utils';

export interface AgentPersonality {
  summary_markdown: string;
  greets_with: string;
  books_to: string | null;
  transfers_when: string | null;
  last_revised_at: string | null;
  agent_voice_name: string | null;
  model: string | null;
}

interface AgentPersonalityCardProps {
  /** null = still loading; non-null = ready. */
  personality: AgentPersonality | null;
  /** Optional error string — when set, render a polite failure card. */
  error?: string | null;
  className?: string;
}

function relativeDate(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.round((Date.now() - then) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Tiny markdown renderer — handles paragraphs and bold only. We deliberately
 * do NOT pull in a full markdown lib for one card; Sonnet's output here is
 * always plain prose with at most a few bold phrases. If we ever need lists
 * or links here, swap to react-markdown.
 */
function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

const AgentPersonalityCard: React.FC<AgentPersonalityCardProps> = ({
  personality,
  error,
  className,
}) => {
  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">Your agent</h2>
          {personality?.last_revised_at && (
            <p className="text-xs text-zinc-500">
              Last revised {relativeDate(personality.last_revised_at)}
            </p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : !personality ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Reading your agent's current setup…
            </div>
            <div className="space-y-2">
              <div className="h-3 w-11/12 rounded-full bg-zinc-100" />
              <div className="h-3 w-10/12 rounded-full bg-zinc-100" />
              <div className="h-3 w-8/12 rounded-full bg-zinc-100" />
            </div>
          </div>
        ) : (
          <>
            {/* Headline cards */}
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {personality.greets_with && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    <MessageCircle className="h-3 w-3" />
                    Greets with
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-800">{personality.greets_with}</p>
                </div>
              )}
              {personality.books_to && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    <Calendar className="h-3 w-3" />
                    Books to
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-800">{personality.books_to}</p>
                </div>
              )}
              {personality.transfers_when && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    <ArrowRightCircle className="h-3 w-3" />
                    Transfers when
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-800">{personality.transfers_when}</p>
                </div>
              )}
            </div>

            {/* Narrative */}
            <div className="space-y-3 text-sm leading-relaxed text-zinc-700">
              {personality.summary_markdown.split(/\n\n+/).map((para, idx) => (
                <p key={idx}>{renderInlineBold(para.trim())}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentPersonalityCard;
