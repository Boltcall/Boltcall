import React, { useState } from 'react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

/**
 * AskBoltcallAIV2 — single-tenant V2 adaptation of the agency AskBoltcallAI strip.
 *
 * Behaviour:
 *  - Posts to `/.netlify/functions/saas-v2-ask-ai` (server resolves workspace_id
 *    from the JWT). Falls back to `/.netlify/functions/agency-client-ask-ai`
 *    when the V2 endpoint is unavailable (404), so the hero strip never breaks
 *    the home page during incremental rollout.
 *  - Renders an input box, suggested-prompt chips, and the streamed answer with
 *    `[^N]` citation badges. Threads turns in local state so follow-ups carry
 *    `prior_turns` context.
 *  - Pure Tailwind v3, no external UI lib.
 */

export interface AskBoltcallAIV2Source {
  type: 'transcript' | 'event' | 'kb';
  id: string;
  url?: string;
  snippet: string;
}

export interface AskBoltcallAIV2Turn {
  role: 'user' | 'assistant';
  text: string;
  sources?: AskBoltcallAIV2Source[];
  confidence?: number;
}

export interface AskBoltcallAIV2Props {
  starterQuestions: string[];
  placeholder?: string;
  className?: string;
}

const PRIMARY_ENDPOINT = `${FUNCTIONS_BASE}/saas-v2-ask-ai`;
const FALLBACK_ENDPOINT = `${FUNCTIONS_BASE}/agency-client-ask-ai`;

interface AskResponse {
  answer: string;
  sources?: AskBoltcallAIV2Source[];
  confidence?: number;
  conversation_id?: string;
}

const AskBoltcallAIV2: React.FC<AskBoltcallAIV2Props> = ({
  starterQuestions,
  placeholder = 'Ask anything about your calls, leads, or agent…',
  className = '',
}) => {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<AskBoltcallAIV2Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  async function postQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);

    const nextTurns: AskBoltcallAIV2Turn[] = [...turns, { role: 'user', text: trimmed }];
    setTurns(nextTurns);
    setInput('');

    const body = JSON.stringify({
      question: trimmed,
      prior_turns: nextTurns.slice(0, -1).map((t) => ({ role: t.role, text: t.text })),
      conversation_id: conversationId,
    });

    let res: Response | null = null;
    try {
      res = await authedFetch(PRIMARY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.status === 404) {
        res = await authedFetch(FALLBACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setLoading(false);
      return;
    }

    if (!res || !res.ok) {
      setError(`Request failed (${res?.status ?? 'no response'})`);
      setLoading(false);
      return;
    }

    let data: AskResponse;
    try {
      data = (await res.json()) as AskResponse;
    } catch {
      setError('Invalid response from server');
      setLoading(false);
      return;
    }

    if (data.conversation_id) setConversationId(data.conversation_id);
    setTurns([
      ...nextTurns,
      {
        role: 'assistant',
        text: data.answer || '',
        sources: data.sources,
        confidence: data.confidence,
      },
    ]);
    setLoading(false);
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          AI
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Ask Boltcall</p>
          <p className="text-xs text-slate-500">
            Backed by your calls, leads, and knowledge base
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 md:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          postQuestion(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Ask Boltcall a question"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 md:flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {starterQuestions.length > 0 && turns.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {starterQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => postQuestion(q)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {turns.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
              <div
                className={
                  t.role === 'user'
                    ? 'inline-block max-w-[85%] rounded-xl bg-slate-900 px-3 py-2 text-sm text-white'
                    : 'inline-block max-w-[95%] rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800'
                }
              >
                <p className="whitespace-pre-wrap">{t.text}</p>
                {t.role === 'assistant' && t.sources && t.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.sources.map((s, idx) => (
                      <a
                        key={`${s.type}-${s.id}-${idx}`}
                        href={s.url || '#'}
                        target={s.url ? '_blank' : undefined}
                        rel="noreferrer"
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700"
                        title={s.snippet}
                      >
                        [^{idx + 1}] {s.type}
                      </a>
                    ))}
                  </div>
                )}
                {t.role === 'assistant' && typeof t.confidence === 'number' && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Confidence {Math.round(t.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AskBoltcallAIV2;
