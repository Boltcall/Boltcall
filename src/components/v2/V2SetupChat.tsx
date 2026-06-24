/**
 * V2 setup surface.
 *
 * Talks to /.netlify/functions/saas-v2-setup-conversation, setup-state, and
 * setup-finalize. The UI is intentionally not a chat shell: assistant prompts
 * render as plain text, and the active answer field sits directly underneath.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { savePendingAgentSetup } from '../../lib/setup/onboarding';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

const SEED_GREETING =
  "I'll get your instant lead response system ready through a quick setup. First, tell me who owns this setup.";

const OPENING_STEP_PROMPTS: Record<OpeningStep, string> = {
  owner: SEED_GREETING,
  business: 'Great. Now tell me about the business we are setting up.',
  agent: 'Perfect. Now choose how your AI agent should sound and add any knowledge files you want it to know.',
};

const VOICE_OPTIONS = [
  { id: '11labs-Grace', name: 'Grace', description: 'Warm and confident' },
  { id: '11labs-Nico', name: 'Nico', description: 'Direct and energetic' },
  { id: 'retell-Leland', name: 'Leland', description: 'Polished and calm' },
] as const;

type OpeningStep = 'owner' | 'business' | 'agent';

function genId() {
  return 'm_' + Math.random().toString(36).slice(2, 10);
}

const ASSISTANT_SPEAKING_MS = 1400;
const SETUP_BUTTON_BASE =
  'inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-45';
const SETUP_BUTTON_PRIMARY = `${SETUP_BUTTON_BASE} bg-white text-zinc-950 hover:bg-zinc-100`;
const SETUP_BUTTON_SECONDARY =
  `${SETUP_BUTTON_BASE} border border-white/14 bg-white/6 text-white hover:bg-white/10`;

function normalizeOptionalWebsite(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return { value: '', error: null };

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { value: '', error: 'Enter a website URL that starts with http:// or https://.' };
    }
    return { value: url.toString().replace(/\/$/, ''), error: null };
  } catch {
    return { value: '', error: 'Enter a valid website URL, like boltcall.org.' };
  }
}

const V2SetupChat: React.FC<{ onSpeakingChange?: (speaking: boolean) => void }> = ({
  onSpeakingChange,
}) => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null,
  );
  const [openingStep, setOpeningStep] = useState<OpeningStep>('owner');
  const [isOpeningTransitioning, setIsOpeningTransitioning] = useState(false);
  const [ownerNameDraft, setOwnerNameDraft] = useState('');
  const [countryDraft, setCountryDraft] = useState('');
  const [businessNameDraft, setBusinessNameDraft] = useState('');
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [voiceDraft, setVoiceDraft] = useState<(typeof VOICE_OPTIONS)[number]['id']>(
    VOICE_OPTIONS[0].id,
  );
  const [kbFileNames, setKbFileNames] = useState<string[]>([]);
  const [answerDraft, setAnswerDraft] = useState('');
  const [extracted, setExtracted] = useState<ExtractedDraft>({});
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [readyToDeploy, setReadyToDeploy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const openingTransitionTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const speakingTimer = useRef<number | null>(null);

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
      if (openingTransitionTimer.current) window.clearTimeout(openingTransitionTimer.current);
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
      if (speakingTimer.current) window.clearTimeout(speakingTimer.current);
      onSpeakingChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof extracted.businessName === 'string' && extracted.businessName.trim()) {
      setBusinessNameDraft((prev) => prev || extracted.businessName || '');
    }
    if (typeof extracted.websiteUrl === 'string' && extracted.websiteUrl.trim()) {
      setWebsiteDraft((prev) => prev || extracted.websiteUrl || '');
    }
  }, [extracted.businessName, extracted.websiteUrl]);

  useEffect(() => {
    if (!onSpeakingChange) return;

    if (isStreaming || isFinalizing) {
      if (speakingTimer.current) window.clearTimeout(speakingTimer.current);
      onSpeakingChange(true);
      return;
    }

    const latestAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
    if (!latestAssistantId || !hasHydrated) {
      onSpeakingChange(false);
      return;
    }

    onSpeakingChange(true);
    if (speakingTimer.current) window.clearTimeout(speakingTimer.current);
    speakingTimer.current = window.setTimeout(() => {
      onSpeakingChange(false);
      speakingTimer.current = null;
    }, ASSISTANT_SPEAKING_MS);

    return () => {
      if (speakingTimer.current) {
        window.clearTimeout(speakingTimer.current);
        speakingTimer.current = null;
      }
    };
  }, [hasHydrated, isFinalizing, isStreaming, messages, onSpeakingChange]);

  function seedOpening() {
    const id = genId();
    setMessages([
      { id, role: 'assistant', content: SEED_GREETING, ts: new Date().toISOString() },
    ]);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isStreaming || isFinalizing) return;

    setError(null);
    setAnswerDraft('');

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
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

      const data = await readResponseJson<TurnResponse>(res);
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
      const assistantMessage = data.assistant_message || 'Got it.';
      setMessages((m) => [
        ...m,
        {
          id: aid,
          role: 'assistant',
          content: assistantMessage,
          ts: new Date().toISOString(),
          toolNote,
        },
      ]);
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
      const data = await readResponseJson<{ code?: string; error?: string; redirect_to?: string }>(res);
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

  function advanceOpeningStep(nextStep: OpeningStep) {
    setIsOpeningTransitioning(true);
    if (openingTransitionTimer.current) window.clearTimeout(openingTransitionTimer.current);
    openingTransitionTimer.current = window.setTimeout(() => {
      setOpeningStep(nextStep);
      setIsOpeningTransitioning(false);
    }, 360);
  }

  function previousOpeningStep() {
    if (isOpeningTransitioning) return;
    if (openingStep === 'business') {
      advanceOpeningStep('owner');
      return;
    }
    if (openingStep === 'agent') {
      advanceOpeningStep('business');
    }
  }

  function submitOpeningStep() {
    if (openingStep === 'owner') {
      if (!ownerNameDraft.trim() || !countryDraft.trim()) return;
      advanceOpeningStep('business');
      return;
    }

    if (openingStep === 'business') {
      if (!businessNameDraft.trim()) return;
      const normalizedWebsite = normalizeOptionalWebsite(websiteDraft);
      if (normalizedWebsite.error) {
        setError(normalizedWebsite.error);
        return;
      }
      setWebsiteDraft(normalizedWebsite.value);
      setError(null);
      advanceOpeningStep('agent');
      return;
    }

    const ownerName = ownerNameDraft.trim();
    const country = countryDraft.trim();
    const companyName = businessNameDraft.trim();
    const normalizedWebsite = normalizeOptionalWebsite(websiteDraft);
    if (normalizedWebsite.error) {
      setError(normalizedWebsite.error);
      advanceOpeningStep('business');
      return;
    }
    const website = normalizedWebsite.value;
    if (!ownerName || !country || !companyName) return;
    const voice = VOICE_OPTIONS.find((option) => option.id === voiceDraft) ?? VOICE_OPTIONS[0];
    setError(null);
    savePendingAgentSetup({
      ownerName,
      businessName: companyName,
      websiteUrl: website,
      country,
      industry: 'other',
      voiceId: voice.id,
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '',
      kbFileNames,
      createdAt: new Date().toISOString(),
    });
    sessionStorage.removeItem(STORAGE_KEY);
    setIsOpeningTransitioning(true);
    if (finishTimer.current) window.clearTimeout(finishTimer.current);
    finishTimer.current = window.setTimeout(() => {
      navigate('/setup/loading', { replace: true });
    }, 420);
  }

  function onAnswerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(answerDraft);
    }
  }

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant') || null;
  const latestAssistantFinished = !!latestAssistantMessage;
  const showResponseFields =
    hasHydrated && !isStreaming && !isFinalizing && !readyToDeploy && latestAssistantFinished;
  const showOpeningFields = showResponseFields && !hasUserMessages;
  const openingAssistantMessage = latestAssistantMessage;
  const openingPromptText =
    openingStep === 'owner' && openingAssistantMessage
      ? openingAssistantMessage.content
      : OPENING_STEP_PROMPTS[openingStep];
  const canContinueOpening =
    openingStep === 'owner'
      ? !!ownerNameDraft.trim() && !!countryDraft.trim()
      : openingStep === 'business'
        ? !!businessNameDraft.trim()
        : !!voiceDraft;

  return (
    <div className="v2-setup-chat flex h-full min-h-0 w-full max-w-3xl flex-col justify-center bg-transparent">
      <style>
        {`
          .v2-setup-chat input:-webkit-autofill,
          .v2-setup-chat input:-webkit-autofill:hover,
          .v2-setup-chat input:-webkit-autofill:focus,
          .v2-setup-chat input:-webkit-autofill:active {
            -webkit-text-fill-color: #ffffff !important;
            caret-color: #ffffff;
            -webkit-box-shadow: 0 0 0 1000px rgba(5, 5, 7, 0.96) inset !important;
            box-shadow: 0 0 0 1000px rgba(5, 5, 7, 0.96) inset !important;
            border-bottom-color: rgba(255, 255, 255, 0.92) !important;
            transition: background-color 9999s ease-in-out 0s;
          }

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

          @keyframes v2SetupPromptFadeIn {
            0% {
              opacity: 0;
              transform: translateX(18px);
              filter: blur(10px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
              filter: blur(0);
            }
          }
        `}
      </style>
      <div className="mx-auto w-full max-w-xl px-1 pt-3">
        {readyToDeploy && <div className="text-center text-xs font-medium text-emerald-300">Ready to deploy</div>}
      </div>

      {error && (
        <div className="mx-1 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col items-start space-y-7 overflow-visible px-1 py-4" aria-live="polite">
        {!hasHydrated && (
          <div className="py-12" aria-hidden="true" />
        )}
        {!showOpeningFields && messages.map((m) => <MessageText key={m.id} message={m} />)}

        {showOpeningFields && (
          <div
            className={cn(
              'w-full max-w-2xl space-y-8 transition-all duration-300 ease-out',
              isOpeningTransitioning ? 'translate-y-2 opacity-0 blur-sm' : 'translate-y-0 opacity-100 blur-0',
            )}
          >
            <div
              className="flex w-full justify-start"
              style={{ animation: 'v2SetupPromptFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
            >
              <p className="max-w-2xl whitespace-pre-wrap text-left text-2xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
                {openingPromptText}
              </p>
            </div>

            {openingStep === 'owner' && (
              <div className="grid gap-8 sm:grid-cols-2">
                <div
                  className="opacity-0"
                  style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both' }}
                >
                  <Input
                    id="v2-owner-name"
                    aria-label="Owner name"
                    label="Owner name"
                    value={ownerNameDraft}
                    onChange={(e) => setOwnerNameDraft(e.target.value)}
                    className="w-full"
                    autoComplete="name"
                  />
                </div>
                <div
                  className="opacity-0"
                  style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both' }}
                >
                  <Input
                    id="v2-country"
                    aria-label="Country"
                    label="Country"
                    value={countryDraft}
                    onChange={(e) => setCountryDraft(e.target.value)}
                    className="w-full"
                    autoComplete="country-name"
                  />
                </div>
              </div>
            )}

            {openingStep === 'business' && (
              <div className="grid gap-8 sm:grid-cols-2">
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
                    label="Website - optional"
                    type="url"
                    value={websiteDraft}
                    onChange={(e) => {
                      setWebsiteDraft(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full"
                    autoComplete="url"
                    aria-invalid={error ? true : undefined}
                  />
                </div>
              </div>
            )}

            {openingStep === 'agent' && (
              <div className="space-y-7">
                <fieldset
                  aria-label="Choose voice"
                  className="grid gap-3 opacity-0 sm:grid-cols-3"
                  style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both' }}
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <label
                      key={voice.id}
                      className={cn(
                        'cursor-pointer rounded-2xl border px-4 py-4 text-left transition',
                        voiceDraft === voice.id
                          ? 'border-white bg-white/20 shadow-[0_16px_50px_rgba(255,255,255,0.10)]'
                          : 'border-white/25 bg-white/10 hover:bg-white/15',
                      )}
                    >
                      <input
                        type="radio"
                        name="v2-agent-voice"
                        value={voice.id}
                        checked={voiceDraft === voice.id}
                        onChange={() => setVoiceDraft(voice.id)}
                        className="sr-only"
                        aria-label={`${voice.name} voice`}
                      />
                      <span className="block text-sm font-semibold text-white">{voice.name}</span>
                      <span className="mt-1 block text-xs text-white/65">{voice.description}</span>
                    </label>
                  ))}
                </fieldset>
                <div
                  className="opacity-0"
                  style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both' }}
                >
                  <label
                    htmlFor="v2-kb-files"
                    className="block border-b-2 border-white pb-3 text-left text-base font-medium text-white"
                  >
                    More KB files - optional
                  </label>
                  <input
                    id="v2-kb-files"
                    aria-label="More KB files - optional"
                    type="file"
                    multiple
                    className="mt-3 block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-950"
                    onChange={(e) =>
                      setKbFileNames(Array.from(e.currentTarget.files ?? []).map((file) => file.name))
                    }
                  />
                  {kbFileNames.length > 0 && (
                    <p className="mt-2 text-left text-xs text-white/55">{kbFileNames.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            <div
              className="flex items-center gap-3 opacity-0"
              style={{ animation: 'v2SetupFieldFadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 360ms both' }}
            >
              {openingStep !== 'owner' && (
                <button
                  type="button"
                  onClick={previousOpeningStep}
                  disabled={isOpeningTransitioning || isStreaming || isFinalizing}
                  className={SETUP_BUTTON_SECONDARY}
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={submitOpeningStep}
                disabled={!canContinueOpening || isStreaming || isFinalizing}
                className={SETUP_BUTTON_PRIMARY}
              >
                {openingStep === 'agent' ? 'Finish' : 'Continue'}
              </button>
            </div>
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
              type="button"
              onClick={() => void sendMessage(answerDraft)}
              disabled={!answerDraft.trim() || isStreaming || isFinalizing}
              className={SETUP_BUTTON_PRIMARY}
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
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
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

  return (
    <div className="flex w-full justify-start">
      <div
        className={cn(
          'max-w-2xl whitespace-pre-wrap text-left leading-tight',
          isUser
            ? 'text-base font-medium text-white/60'
            : 'text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl',
        )}
        style={{ animation: 'v2SetupPromptFadeIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        {message.toolNote && !isUser && (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">
            {message.toolNote}
          </div>
        )}
        <div>{message.content}</div>
      </div>
    </div>
  );
};

async function readResponseJson<T>(
  res: Response,
): Promise<Partial<T> & { error?: string }> {
  const responseWithText = res as Response & { text?: () => Promise<string> };
  if (typeof responseWithText.text === 'function') {
    const raw = await responseWithText.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Partial<T> & { error?: string };
    } catch {
      return { error: raw } as Partial<T> & { error?: string };
    }
  }

  try {
    return (await res.json()) as Partial<T> & { error?: string };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : `Setup error (${res.status}). Try again.`,
    } as Partial<T> & { error?: string };
  }
}

export default V2SetupChat;
