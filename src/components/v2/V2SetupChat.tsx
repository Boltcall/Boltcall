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
import { Input } from '../ui/input';

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
  "Hi, welcome to Boltcall. I'll get your instant lead response system ready through a quick setup. Start with your company name and website.";

function genId() {
  return 'm_' + Math.random().toString(36).slice(2, 10);
}

const V2SetupChat: React.FC = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null,
  );
  const [businessNameDraft, setBusinessNameDraft] = useState('');
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [answerDraft, setAnswerDraft] = useState('');
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
    if (typeof extracted.businessName === 'string' && extracted.businessName.trim()) {
      setBusinessNameDraft((prev) => prev || extracted.businessName || '');
    }
    if (typeof extracted.websiteUrl === 'string' && extracted.websiteUrl.trim()) {
      setWebsiteDraft((prev) => prev || extracted.websiteUrl || '');
    }
  }, [extracted.businessName, extracted.websiteUrl]);

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

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isStreaming || isFinalizing) return;

    setError(null);
    setAnswerDraft('');
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

  function submitOpeningStep() {
    const companyName = businessNameDraft.trim();
    const website = websiteDraft.trim();
    if (!companyName) return;

    const text = [
      `Company name: ${companyName}`,
      website ? `Website: ${website}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    void sendMessage(text);
  }

  function onAnswerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(answerDraft);
    }
  }

  const completeness = useMemo(() => computeCompleteness(extracted), [extracted]);
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant') || null;
  const latestAssistantFinished =
    !!latestAssistantMessage &&
    (latestAssistantMessage.displayed ?? latestAssistantMessage.content.length) >=
      latestAssistantMessage.content.length;
  const showResponseFields =
    hasHydrated && !isStreaming && !isFinalizing && !readyToDeploy && latestAssistantFinished;
  const showOpeningFields = showResponseFields && !hasUserMessages;

  return (
    <div className="flex h-full min-h-[640px] w-full max-w-3xl flex-col justify-center bg-transparent">
      <style>
        {`
          @keyframes v2SetupFieldFadeIn {
            0% {
              opacity: 0;
              transform: translateY(16px);
              filter: blur(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }
        `}
      </style>
      <div className="mx-auto w-full max-w-xl px-1 pt-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Profile {completeness}% ready</span>
          {readyToDeploy && <span className="font-medium text-emerald-600">Ready to deploy</span>}
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', readyToDeploy ? 'bg-emerald-500' : 'bg-amber-500')}
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

      <div className="mx-auto flex w-full max-w-2xl flex-col items-center space-y-8 overflow-visible px-1 py-8" aria-live="polite">
        {!hasHydrated && (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
            Loading your setup...
          </div>
        )}
        {messages.map((m) => (
          <MessageText key={m.id} message={m} />
        ))}
        {isStreaming && <TypingIndicator />}

        {showOpeningFields && (
          <div className="w-full max-w-xl space-y-8">
            <div
              className="opacity-0"
              style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both' }}
            >
              <Input
                id="v2-company-name"
                aria-label="Business Name"
                label="Business Name"
                value={businessNameDraft}
                onChange={(e) => setBusinessNameDraft(e.target.value)}
                className="w-full"
                autoComplete="organization"
              />
            </div>
            <div
              className="opacity-0"
              style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both' }}
            >
              <Input
                id="v2-website-url"
                aria-label="Business website - optional"
                label="Business website - optional"
                type="url"
                value={websiteDraft}
                onChange={(e) => setWebsiteDraft(e.target.value)}
                className="w-full"
                autoComplete="url"
              />
            </div>
            <button
              onClick={submitOpeningStep}
              disabled={!businessNameDraft.trim() || isStreaming || isFinalizing}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white opacity-0 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 360ms both' }}
            >
              Continue
            </button>
          </div>
        )}

        {showResponseFields && hasUserMessages && (
          <div className="flex w-full max-w-xl items-end gap-3">
            <div className="flex-1">
              <Input
                id="v2-setup-answer"
                aria-label="Your answer"
                label="Your answer"
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                onKeyDown={onAnswerKeyDown}
                className="w-full"
              />
            </div>
            <button
              onClick={() => void sendMessage(answerDraft)}
              disabled={!answerDraft.trim() || isStreaming || isFinalizing}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Continue
            </button>
          </div>
        )}
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
    <div className="flex w-full justify-center">
      <div
        className={cn(
          'max-w-2xl whitespace-pre-wrap text-center leading-tight',
          isUser
            ? 'text-base font-medium text-zinc-500'
            : 'text-2xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-3xl',
        )}
      >
        {message.toolNote && !isUser && (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">
            {message.toolNote}
          </div>
        )}
        <div>{visible}</div>
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
