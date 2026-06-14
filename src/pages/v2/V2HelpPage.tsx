/**
 * V2HelpPage — AI-native help surface.
 *
 * Replaces V1's keyword FAQ with a chat-like Q&A. Empty state shows 6 starter
 * chips a new user is likely to ask; clicking a chip fires that question. Each
 * answered turn renders a 2-3 paragraph answer plus 1-3 citation links pulled
 * from Boltcall public docs (boltcall.mintlify.app) and the workspace KB.
 *
 * Wraps DashboardLayoutV2 + V2OptInGate per the shell pattern. The Outlet
 * container already provides outer padding, so this page starts directly with
 * its narrative slot.
 *
 * V1 invariant: never touches V1 FAQ or V1 dashboard. Pure /v2/help surface.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, ExternalLink, Loader2, LifeBuoy } from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card-shadcn';
import { Button } from '../../components/ui/button-shadcn';

interface HelpSource {
  title: string;
  url: string;
  snippet?: string;
}

interface AskResponse {
  answer: string;
  sources?: HelpSource[];
  suggested_followups?: string[];
  support?: {
    escalated: boolean;
    channel: string;
    message: string;
  };
  error?: string;
}

type Turn =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      sources: HelpSource[];
      followups: string[];
      support?: AskResponse['support'];
      pending?: boolean;
      error?: string;
    };

const STARTER_CHIPS: string[] = [
  'How do I add a phone number?',
  'How do I change my agent voice?',
  'Why are some calls failing?',
  'How does billing work?',
  'How do I export my data?',
  'I need human support',
];

const SUPPORT_EMAIL = 'support@boltcall.org';

function newId(): string {
  return `t_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

const V2HelpPage: React.FC = () => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollAnchor = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the chat surface as new turns land so the user always lands
  // on the freshest answer without manual scroll. Smooth = less jarring than
  // an instant jump and reads as a "live" surface.
  useEffect(() => {
    if (scrollAnchor.current) {
      scrollAnchor.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turns]);

  const askQuestion = async (question: string): Promise<void> => {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    const userTurn: Turn = { id: newId(), role: 'user', text: trimmed };
    const pendingTurn: Turn = {
      id: newId(),
      role: 'assistant',
      text: '',
      sources: [],
      followups: [],
      pending: true,
    };
    setTurns((prev) => [...prev, userTurn, pendingTurn]);
    setInput('');
    setSending(true);

    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-help-ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          context: { current_page: '/v2/help' },
        }),
      });
      const data: AskResponse = await res.json().catch(() => ({ answer: '', error: 'Bad response' }));

      if (!res.ok) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === pendingTurn.id && t.role === 'assistant'
              ? {
                  ...t,
                  pending: false,
                  text:
                    'Sorry — I couldn\'t reach the help service. Try again in a moment, or email support@boltcall.org.',
                  error: data.error || `HTTP ${res.status}`,
                }
              : t,
          ),
        );
        return;
      }

      setTurns((prev) =>
        prev.map((t) =>
          t.id === pendingTurn.id && t.role === 'assistant'
            ? {
                ...t,
                pending: false,
                text: data.answer || 'No answer returned.',
                sources: Array.isArray(data.sources) ? data.sources.slice(0, 3) : [],
                followups: Array.isArray(data.suggested_followups)
                  ? data.suggested_followups.slice(0, 3)
                  : [],
                support: data.support,
              }
            : t,
        ),
      );
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === pendingTurn.id && t.role === 'assistant'
            ? {
                ...t,
                pending: false,
                text:
                  'Sorry — something went wrong asking the help service. Try again, or email support@boltcall.org.',
                error: err instanceof Error ? err.message : 'Unknown error',
              }
            : t,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askQuestion(input);
  };

  const isEmpty = turns.length === 0;

  return (
    <div className="space-y-6">
      {/* Narrative slot — V2 convention is page intro above any interactive
          surface. Sets tone so the chip-empty-state doesn't feel naked. */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-blue" />
          <h1 className="text-xl md:text-2xl font-semibold text-text-main">Help</h1>
        </div>
        <p className="text-sm text-zinc-600">
          Ask anything about Boltcall — how-to questions, troubleshooting, or
          how your own workspace is set up. Answers cite Boltcall docs and your
          workspace settings.
        </p>
      </div>

      {/* Chat surface */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[55vh] flex flex-col">
            <div className="flex-1 px-4 md:px-6 py-6">
              {isEmpty ? (
                <div className="flex flex-col items-center text-center max-w-xl mx-auto py-10">
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5 text-brand-blue" />
                  </div>
                  <h2 className="text-base font-medium text-text-main mb-1">
                    What can I help you figure out?
                  </h2>
                  <p className="text-sm text-zinc-500 mb-6">
                    Pick a starter question or type your own below.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {STARTER_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => void askQuestion(chip)}
                        disabled={sending}
                        className="text-left text-sm text-text-main bg-zinc-50 hover:bg-zinc-100 border border-border rounded-lg px-3 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-w-3xl mx-auto">
                  {turns.map((turn) =>
                    turn.role === 'user' ? (
                      <div key={turn.id} className="flex justify-end">
                        <div className="max-w-[85%] bg-brand-blue text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 whitespace-pre-wrap">
                          {turn.text}
                        </div>
                      </div>
                    ) : (
                      <div key={turn.id} className="flex justify-start">
                        <div className="max-w-[92%] w-full">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 bg-zinc-50 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                              {turn.pending ? (
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Thinking…</span>
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm text-text-main whitespace-pre-wrap leading-relaxed">
                                    {turn.text}
                                  </div>
                                  {turn.support?.escalated && (
                                    <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                      <LifeBuoy className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                      <span>{turn.support.message}</span>
                                    </div>
                                  )}
                                  {turn.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium mb-1.5">
                                        Sources
                                      </div>
                                      <ul className="space-y-1">
                                        {turn.sources.map((s, i) => (
                                          <li key={`${turn.id}-src-${i}`} className="text-xs">
                                            <a
                                              href={s.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                                            >
                                              {s.title || s.url}
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                            {s.snippet && (
                                              <span className="text-zinc-500"> — {s.snippet}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {turn.followups.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {turn.followups.map((f, i) => (
                                        <button
                                          key={`${turn.id}-fu-${i}`}
                                          type="button"
                                          onClick={() => void askQuestion(f)}
                                          disabled={sending}
                                          className="text-xs text-brand-blue bg-white border border-brand-blue/30 hover:bg-brand-blue/5 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {f}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                  <div ref={scrollAnchor} />
                </div>
              )}
            </div>

            {/* Composer — always docked at the bottom of the chat surface. */}
            <div className="border-t border-border bg-white px-4 md:px-6 py-3">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 rounded-full border border-border bg-zinc-50 px-4 py-1.5 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15 focus-within:bg-white transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about Boltcall…"
                    aria-label="Ask a question"
                    className="flex-1 bg-transparent text-sm text-text-main placeholder:text-zinc-400 focus:outline-none"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || sending}
                    className="rounded-full h-7 px-3 text-xs"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Ask
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escape hatch — when the AI can't help, the human still can. */}
      <div className="text-center text-xs text-zinc-500">
        Still stuck?{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-brand-blue hover:underline"
        >
          Email support
        </a>
      </div>
    </div>
  );
};

export default V2HelpPage;
