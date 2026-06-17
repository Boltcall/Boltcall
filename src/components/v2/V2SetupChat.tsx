/**
 * V2 setup surface.
 *
 * Talks to /.netlify/functions/saas-v2-setup-conversation, setup-state, and
 * setup-finalize. The UI is intentionally not a chat shell: assistant prompts
 * render as plain text, and the active answer field sits directly underneath.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayed?: number;
  ts: string;
  toolNote?: string;
}

interface ExtractedDraft {
  businessName?: string;
  websiteUrl?: string;
  industry?: string;
  services?: Array<{ name: string; duration: number; price: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  agentConfig?: { agentName?: string; voiceId?: string; transferNumber?: string };
  [k: string]: unknown;
}

interface TurnResponse {
  conversation_id: string;
  assistant_message: string;
  tool?: { name: string; summary?: string } | null;
  extracted: ExtractedDraft;
  wizard_step: string;
  ready_to_deploy: boolean;
  state_version?: number;
  latency_ms?: number;
  error?: string;
  recovery?: string;
}

const STORAGE_KEY = 'boltcall_v2_setup_conversation_id';
const STALL_MS = 5 * 60 * 1000;

const SEED_GREETING =
  "Hey - I'm Boltcall's setup agent. I'll get your instant lead response system ready through a quick setup. What's the name of your business?";

function genId() {
  return 'm_' + Math.random().toString(36).slice(2, 10);
}

const V2SetupChat: React.FC = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null,
  );
  const [draft, setDraft] = useState('');
  const [extracted, setExtracted] = useState<ExtractedDraft>({});
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [readyToDeploy, setReadyToDeploy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStallBanner, setShowStallBanner] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const lastUserActivity = useRef<number>(Date.now());
  const stallTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typewriterTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const timers = typewriterTimers.current;
    (async () => {
      try {
        const url = conversationId
          ? `${FUNCTIONS_BASE}/saas-v2-setup-state?conversation_id=${encodeURIComponent(conversationId)}`
          : `${FUNCTIONS_BASE}/saas-v2-setup-state`;
        const res = await authedFetch(url, { method: 'GET' });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.conversation && data.conversation.length > 0) {
            setMessages(
              data.conversation.map(
                (t: {
                  role: 'user' | 'assistant';
                  content: string;
                  ts: string;
                  tool?: { name: string; result_summary?: string };
                }) => ({
                  id: genId(),
                  role: t.role,
                  content: t.content,
                  ts: t.ts,
                  displayed: t.content.length,
                  toolNote: t.tool ? `Ran ${t.tool.name}` : undefined,
                }),
              ),
            );
            setExtracted(data.extracted || {});
            if (typeof data.state_version === 'number') {
              setStateVersion(data.state_version);
            }
            if (data.conversation_id) {
              setConversationId(data.conversation_id);
              sessionStorage.setItem(STORAGE_KEY, data.conversation_id);
            }
          } else {
            seedOpening();
          }
        } else {
          seedOpening();
        }
      } catch {
        seedOpening();
      } finally {
        if (!cancelled) setHasHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function resetStall() {
      lastUserActivity.current = Date.now();
      setShowStallBanner(false);
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
      stallTimer.current = window.setTimeout(() => {
        setShowStallBanner(true);
      }, STALL_MS);
    }
    resetStall();
    return () => {
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
    };
  }, [messages.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  function seedOpening() {
    const id = genId();
    setMessages([
      { id, role: 'assistant', content: SEED_GREETING, displayed: 0, ts: new Date().toISOString() },
    ]);
    typewriterAnimate(id, SEED_GREETING);
  }

  function typewriterAnimate(id: string, text: string) {
    const stepMs = 14;
    let i = 0;
    function tick() {
      i = Math.min(text.length, i + Math.max(1, Math.floor(text.length / 80)));
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, displayed: i } : m)));
      if (i < text.length) {
        const t = window.setTimeout(tick, stepMs);
        typewriterTimers.current.set(id, t);
      } else {
        typewriterTimers.current.delete(id);
      }
    }
    tick();
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || isStreaming || isFinalizing) return;

    setError(null);
    setDraft('');
    lastUserActivity.current = Date.now();
    setShowStallBanner(false);

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      displayed: text.length,
      ts: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setIsStreaming(true);

    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-setup-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_message: text,
        }),
      });

      const data = (await res.json()) as TurnResponse;
      if (!res.ok || data.error) {
        setError(data.error || `Setup error (${res.status}). Try again.`);
        setIsStreaming(false);
        return;
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        sessionStorage.setItem(STORAGE_KEY, data.conversation_id);
      }
      setExtracted(data.extracted || {});
      if (typeof data.state_version === 'number') {
        setStateVersion(data.state_version);
      }
      setReadyToDeploy(!!data.ready_to_deploy);

      const aid = genId();
      const toolNote = data.tool ? `Ran ${data.tool.name}` : undefined;
      setMessages((m) => [
        ...m,
        {
          id: aid,
          role: 'assistant',
          content: data.assistant_message,
          displayed: 0,
          ts: new Date().toISOString(),
          toolNote,
        },
      ]);
      typewriterAnimate(aid, data.assistant_message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Try again.');
    } finally {
      setIsStreaming(false);
    }
  }

  async function deployAgent() {
    if (!conversationId) return;
    setIsFinalizing(true);
    setError(null);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-setup-finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          expected_state_version: stateVersion,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (res.status === 409 || data.code === 'state_drift') {
        setError(
          data.error ||
            'Setup state changed since you reviewed it. Refresh to see the latest draft, then re-confirm deploy.',
        );
        setIsFinalizing(false);
        return;
      }
      if (!res.ok || data.error) {
        setError(data.error || 'Deploy failed. Try again.');
        setIsFinalizing(false);
        return;
      }
      sessionStorage.removeItem(STORAGE_KEY);
      const redirect = data.redirect_to || '/dashboard';
      navigate(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deploy failed. Try again.');
      setIsFinalizing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const completeness = useMemo(() => computeCompleteness(extracted), [extracted]);

  return (
    <div className="flex h-full min-h-[640px] w-full max-w-3xl flex-col bg-white">
      <div className="px-1 pt-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Profile {completeness}% ready</span>
          {readyToDeploy && <span className="font-medium text-emerald-600">Ready to deploy</span>}
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              readyToDeploy ? 'bg-emerald-500' : 'bg-amber-500',
            )}
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {showStallBanner && (
        <div className="mx-1 mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          Stuck? You can keep going here, or refresh this page to resume the latest saved setup state.
        </div>
      )}

      {error && (
        <div className="mx-1 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4" aria-live="polite">
        {!hasHydrated && (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
            Loading your setup...
          </div>
        )}
        {messages.map((m) => (
          <MessageText key={m.id} message={m} />
        ))}
        {isStreaming && <TypingIndicator />}

        <div className="pt-1">
          <label htmlFor="v2-setup-answer" className="sr-only">
            Your setup answer
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="v2-setup-answer"
              aria-label="Your setup answer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isFinalizing}
              placeholder={isStreaming ? 'Waiting for Boltcall...' : 'Write your answer...'}
              rows={1}
              className="min-h-11 max-h-32 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || isStreaming || isFinalizing}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

      {readyToDeploy && (
        <div className="mx-1 mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">Everything is set</div>
            <div className="text-xs text-emerald-700">
              Deploys two agents: inbound receptionist and speed-to-lead follow-up.
            </div>
          </div>
          <button
            onClick={deployAgent}
            disabled={isFinalizing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFinalizing ? 'Deploying...' : 'Deploy agent'}
          </button>
        </div>
      )}
    </div>
  );
};

const MessageText: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const visible =
    message.displayed != null ? message.content.slice(0, message.displayed) : message.content;

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] text-sm leading-relaxed',
          isUser ? 'text-zinc-500' : 'text-zinc-950',
        )}
      >
        {message.toolNote && !isUser && (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">
            {message.toolNote}
          </div>
        )}
        <div className="whitespace-pre-wrap">{visible}</div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start px-1 py-2.5">
    <div className="flex gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
    </div>
  </div>
);

const SendIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

function computeCompleteness(e: ExtractedDraft): number {
  let score = 0;
  if (e.businessName) score += 20;
  if (e.industry) score += 15;
  if (e.websiteUrl) score += 10;
  if (e.services && e.services.length > 0) score += 25;
  if (e.faqs && e.faqs.length > 0) score += 15;
  if (e.agentConfig?.agentName) score += 10;
  if (e.agentConfig?.transferNumber !== undefined) score += 5;
  return Math.min(100, score);
}

export default V2SetupChat;
