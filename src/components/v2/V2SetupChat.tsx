/**
 * V2 Conversational Setup Wizard — chat surface.
 *
 * Talks to /.netlify/functions/saas-v2-setup-conversation (turn endpoint),
 * /.netlify/functions/saas-v2-setup-state (resume endpoint), and
 * /.netlify/functions/saas-v2-setup-finalize (deploy endpoint).
 *
 * Key behaviors:
 *   - On mount, GETs state — if a conversation exists, resumes; else seeds
 *     with the opening assistant message.
 *   - Typewriter-animates assistant turns (server returns full text — no SSE
 *     because Netlify Lambda buffers responses, per the V2 build brief).
 *   - 5-minute idle timer → shows a banner offering to switch to V1 setup.
 *   - When the server signals ready_to_deploy=true, surfaces a "Deploy agent"
 *     pill that finalizes the wizard.
 *   - Persists conversation_id in sessionStorage so refresh-without-loss works
 *     even before the server has saved state.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // When animating in, we render only `displayed` characters
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
  latency_ms?: number;
  error?: string;
  recovery?: string;
}

const STORAGE_KEY = 'boltcall_v2_setup_conversation_id';
const STALL_MS = 5 * 60 * 1000; // 5 minutes

const SEED_GREETING =
  "Hey — I'm Boltcall's setup agent. I'll get your AI receptionist live in about 15 minutes through a quick chat. What's the name of your business?";

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
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Hydrate from server on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
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
              data.conversation.map((t: { role: 'user' | 'assistant'; content: string; ts: string; tool?: { name: string; result_summary?: string } }) => ({
                id: genId(),
                role: t.role,
                content: t.content,
                ts: t.ts,
                displayed: t.content.length, // resumed messages render instantly
                toolNote: t.tool ? `Ran ${t.tool.name}` : undefined,
              })),
            );
            setExtracted(data.extracted || {});
            if (data.conversation_id) {
              setConversationId(data.conversation_id);
              sessionStorage.setItem(STORAGE_KEY, data.conversation_id);
            }
          } else {
            // Seed with the opening assistant message (animated)
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
      typewriterTimers.current.forEach((id) => window.clearTimeout(id));
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stall timer — show V1 fallback banner after 5min idle ───────────────
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

  // ── Auto-scroll on new message / typing ─────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function seedOpening() {
    const id = genId();
    setMessages([{ id, role: 'assistant', content: SEED_GREETING, displayed: 0, ts: new Date().toISOString() }]);
    typewriterAnimate(id, SEED_GREETING);
  }

  function typewriterAnimate(id: string, text: string) {
    // 18ms / char is around 55 chars/sec — readable, never feels slow.
    const stepMs = 14;
    let i = 0;
    function tick() {
      i = Math.min(text.length, i + Math.max(1, Math.floor(text.length / 80)));
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, displayed: i } : m)),
      );
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
        setError(data.error || `Setup error (${res.status}). Try again or switch to the classic setup.`);
        setIsStreaming(false);
        return;
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        sessionStorage.setItem(STORAGE_KEY, data.conversation_id);
      }
      setExtracted(data.extracted || {});
      setReadyToDeploy(!!data.ready_to_deploy);

      const aid = genId();
      const toolNote = data.tool ? `Ran ${data.tool.name}` : undefined;
      setMessages((m) => [
        ...m,
        { id: aid, role: 'assistant', content: data.assistant_message, displayed: 0, ts: new Date().toISOString(), toolNote },
      ]);
      typewriterAnimate(aid, data.assistant_message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Network error. Try again, or switch to the classic setup at /setup.',
      );
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
        body: JSON.stringify({ conversation_id: conversationId, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Deploy failed. Try again or use the classic setup at /setup.');
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
    <div className="flex h-full min-h-[640px] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* ── Header strip with progress + V1 escape ───────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <BoltIcon />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Boltcall Setup</div>
            <div className="text-xs text-zinc-500">
              {extracted.businessName ? `Setting up: ${extracted.businessName}` : 'Conversational setup — 15 min'}
            </div>
          </div>
        </div>
        <Link
          to="/setup"
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Skip to classic setup
        </Link>
      </div>

      {/* ── Completeness bar ─────────────────────────────────────────────── */}
      <div className="px-5 pt-3">
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

      {/* ── Stall banner ─────────────────────────────────────────────────── */}
      {showStallBanner && (
        <div className="mx-5 mt-3 flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <span>Stuck? You can switch to the classic step-by-step setup any time.</span>
          <Link to="/setup" className="shrink-0 font-medium text-zinc-900 underline">
            Use classic setup
          </Link>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mt-3 flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span>{error}</span>
          <Link to="/setup" className="shrink-0 font-medium underline">
            Switch to V1
          </Link>
        </div>
      )}

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
        aria-live="polite"
      >
        {!hasHydrated && (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
            Loading your setup…
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isStreaming && <TypingIndicator />}
      </div>

      {/* ── Deploy CTA ────────────────────────────────────────────────────── */}
      {readyToDeploy && (
        <div className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">Everything is set</div>
            <div className="text-xs text-emerald-700">
              Deploys two agents — inbound receptionist + speed-to-lead follow-up.
            </div>
          </div>
          <button
            onClick={deployAgent}
            disabled={isFinalizing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFinalizing ? 'Deploying…' : 'Deploy agent'}
          </button>
        </div>
      )}

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-200 bg-zinc-50/60 px-3 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isFinalizing}
            placeholder={isStreaming ? 'Boltcall is replying…' : 'Type your reply…'}
            rows={1}
            className="max-h-32 min-h-[24px] flex-1 resize-none border-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || isStreaming || isFinalizing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-zinc-400">
          Press Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const visible = message.displayed != null ? message.content.slice(0, message.displayed) : message.content;
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900',
        )}
      >
        {message.toolNote && !isUser && (
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            <ToolIcon /> {message.toolNote}
          </div>
        )}
        <div className="whitespace-pre-wrap">{visible}</div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="rounded-2xl bg-zinc-100 px-4 py-2.5">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

const BoltIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const ToolIcon: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

// ── Completeness heuristic ─────────────────────────────────────────────────

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
