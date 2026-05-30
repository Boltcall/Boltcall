/**
 * AskBoltcallAI — Boltcall Client Portal · Phase E
 *
 * The strategist surface. NOT a chatbot.
 *
 * Visual contract:
 *   - Looks like a strategist's note. Single input. Answers below in
 *     clean typography. No chat bubbles. No animated ellipsis (we use a
 *     subtle "thinking…" line in the strategist's voice). No robot icon.
 *   - Threaded session — prior turns persist in memory and round-trip
 *     to the server so the model has continuity, but UI stays one-column.
 *   - Inline source citations as superscript numbers that scroll/link
 *     to the receipts panel below.
 *   - Empty state shows 4 server-generated starter questions tied to the
 *     client's actual data — NEVER hardcoded.
 *
 * Receipts: every claim renders with [^N] citations. The frontend parses
 * them, replaces with anchor links to a Sources panel below the answer.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Loader2 } from 'lucide-react';

import { authedFetch } from '../../lib/authedFetch';
import { cn } from '../../lib/utils';

export interface AskAiSource {
  type: 'transcript' | 'event' | 'kb';
  id: string;
  url: string | null;
  snippet: string;
}

export interface AskBoltcallAIProps {
  starterQuestions: string[];
  /**
   * Optional placeholder. The portal's home page rotates this based on
   * what's interesting in the client's data this week.
   */
  placeholder?: string;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  sources?: AskAiSource[];
  confidence?: number;
}

const DEFAULT_PLACEHOLDER = 'Ask anything about your account';

const AskBoltcallAI: React.FC<AskBoltcallAIProps> = ({
  starterQuestions,
  placeholder = DEFAULT_PLACEHOLDER,
}) => {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const showEmptyState = turns.length === 0 && !submitting;

  const submit = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || submitting) return;

      setError(null);
      setSubmitting(true);

      // Optimistic push of the user turn so the conversation feels
      // immediate. We do NOT add a placeholder assistant turn — empty
      // bubbles would violate the "no chatbot" contract.
      const prior_turns: Array<{ role: 'user' | 'assistant'; content: string }> =
        turns.map((t) => ({ role: t.role, content: t.content }));

      setTurns((prev) => [...prev, { role: 'user', content: q }]);
      setDraft('');

      try {
        const res = await authedFetch('/.netlify/functions/agency-client-ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            conversation_id: conversationIdRef.current ?? undefined,
            prior_turns,
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(body || `Request failed (${res.status})`);
        }

        const data = (await res.json()) as {
          answer: string;
          sources: AskAiSource[];
          confidence: number;
          conversation_id: string;
        };

        conversationIdRef.current = data.conversation_id;

        setTurns((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources || [],
            confidence: data.confidence,
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.';
        setError(msg);
        // Roll back the user turn so they can retry — the strategist
        // never silently swallows a question.
        setTurns((prev) => prev.slice(0, -1));
        setDraft(q);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, turns],
  );

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void submit(draft);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit(draft);
    }
  };

  return (
    <section
      aria-labelledby="ask-ai-heading"
      className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 sm:px-8 sm:py-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="ask-ai-heading"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Ask Boltcall AI
        </h2>
        <span className="text-xs text-zinc-400">
          Your account strategist · always on
        </span>
      </div>

      {/* Threaded answers — strategist's note format. No bubbles. */}
      {turns.length > 0 ? (
        <div className="mt-5 space-y-6 border-b border-zinc-100 pb-6">
          {turns.map((turn, i) => (
            <Turn key={i} turn={turn} />
          ))}
          {submitting ? (
            <p className="text-sm italic text-zinc-400">
              Your strategist is reading your account…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-700">
              Could not reach your strategist: {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Single input — large, calm, focusable. */}
      <form onSubmit={onSubmit} className="mt-5">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={2}
            disabled={submitting}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:bg-zinc-50 disabled:text-zinc-400"
            aria-label="Ask your account strategist a question"
          />
          <button
            type="submit"
            disabled={submitting || draft.trim().length === 0}
            className={cn(
              'absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg transition',
              submitting || draft.trim().length === 0
                ? 'cursor-not-allowed bg-zinc-100 text-zinc-300'
                : 'bg-zinc-900 text-white hover:bg-zinc-800',
            )}
            aria-label="Send"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>

      {/* Starter questions — server-generated per client. Render ONLY
          when the conversation is empty (one screen, one action). */}
      {showEmptyState && starterQuestions.length > 0 ? (
        <div className="mt-5">
          <div className="text-xs text-zinc-400">
            Or pick something your strategist noticed this week:
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {starterQuestions.slice(0, 4).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void submit(q)}
                disabled={submitting}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 transition hover:border-zinc-300 hover:bg-white disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

// ─── Subcomponent: a single turn (no bubble UI) ──────────────────────────

const Turn: React.FC<{ turn: Turn }> = ({ turn }) => {
  if (turn.role === 'user') {
    return (
      <div className="text-sm font-medium text-zinc-500">
        <span className="mr-2 text-zinc-400">You asked</span>
        <span className="text-zinc-800">{turn.content}</span>
      </div>
    );
  }

  // Assistant — render the answer with inline citations.
  const sources = turn.sources ?? [];

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-zinc-800 sm:text-base">
        <AnswerWithCitations answer={turn.content} sources={sources} />
      </p>
      {sources.length > 0 ? (
        <ol className="mt-4 space-y-1 border-l-2 border-zinc-100 pl-4">
          {sources.map((s, i) => (
            <SourceRow key={`${s.type}-${s.id}-${i}`} index={i + 1} source={s} />
          ))}
        </ol>
      ) : null}
      {turn.confidence !== undefined && turn.confidence < 0.5 ? (
        <p className="mt-2 text-xs italic text-zinc-400">
          Lower-confidence answer — your strategist had thin data on this one.
        </p>
      ) : null}
    </div>
  );
};

const SourceRow: React.FC<{ index: number; source: AskAiSource }> = ({
  index,
  source,
}) => {
  const label =
    source.type === 'transcript'
      ? 'Call'
      : source.type === 'event'
        ? 'Event'
        : 'Knowledge';
  const body = (
    <span className="text-xs text-zinc-500">
      <span className="mr-2 font-mono text-[10px] text-zinc-400" id={`src-${index}`}>
        [{index}]
      </span>
      <span className="mr-2 inline-block min-w-[60px] font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <span className="text-zinc-700">{source.snippet}</span>
    </span>
  );

  if (source.url) {
    return (
      <li className="leading-snug">
        <Link
          to={source.url}
          className="group inline-flex items-baseline gap-1 hover:underline"
        >
          {body}
          <ArrowUpRight
            className="h-3 w-3 shrink-0 text-zinc-300 group-hover:text-zinc-500"
            aria-hidden="true"
          />
        </Link>
      </li>
    );
  }
  return <li className="leading-snug">{body}</li>;
};

/**
 * Parse [^N] markers and replace with anchor-link superscripts. Preserves
 * surrounding text exactly. We accept either [^1] or [^1][^2] (consecutive
 * citations) and emit each one as its own <sup> anchor.
 *
 * Rendered as clickable in-page anchors to #src-N (handled by SourceRow).
 */
const CITATION_RE = /\[\^(\d+)\]/g;

const AnswerWithCitations: React.FC<{ answer: string; sources: AskAiSource[] }> = ({
  answer,
  sources,
}) => {
  const nodes = useMemo(() => {
    const out: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = CITATION_RE.exec(answer)) !== null) {
      if (match.index > lastIndex) {
        out.push(
          <React.Fragment key={`t-${key}`}>
            {answer.slice(lastIndex, match.index)}
          </React.Fragment>,
        );
      }
      const num = Number.parseInt(match[1], 10);
      const valid = num >= 1 && num <= sources.length;
      out.push(
        valid ? (
          <a
            key={`c-${key}`}
            href={`#src-${num}`}
            className="ml-0.5 align-super text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
            aria-label={`Source ${num}`}
          >
            [{num}]
          </a>
        ) : (
          <span
            key={`c-${key}`}
            className="ml-0.5 align-super text-[10px] text-zinc-300"
            title="Citation has no matching source"
          >
            [{num}]
          </span>
        ),
      );
      lastIndex = match.index + match[0].length;
      key += 1;
    }
    if (lastIndex < answer.length) {
      out.push(
        <React.Fragment key={`t-${key}`}>{answer.slice(lastIndex)}</React.Fragment>,
      );
    }
    return out;
  }, [answer, sources.length]);

  return <>{nodes}</>;
};

export default AskBoltcallAI;
