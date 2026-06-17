import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bolt, MessageSquare, ShieldCheck } from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { TokenProvider } from '../contexts/TokenContext';
import { useSetupStore } from '../stores/setupStore';
import AuthSwitch from '../components/ui/auth-switch';
import { Input } from '../components/ui/input-shadcn';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button-shadcn';
import {
  clearPendingAgentSetup,
  getGoalLabel,
  getIndustryLabel,
  getToneLabel,
  getVoiceLabel,
  GOAL_OPTIONS,
  INDUSTRY_OPTIONS,
  savePendingAgentSetup,
  TONE_OPTIONS,
  type PendingAgentSetup,
  VOICE_OPTIONS,
} from '../lib/setup/onboarding';
import { provisionAgentSetup } from '../lib/setup/provisionAgentSetup';
import { supabase } from '../lib/supabase';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  displayed?: number;
};

type Step = 'business' | 'preferences' | 'auth';
type AuthMode = 'gate' | 'email';

const BUSINESS_PROMPT =
  "Great, what's the name of your business and industry?";
const PREFERENCES_PROMPT =
  "Perfect. Now choose the voice and lead-handling style you want Boltcall to use.";
const AUTH_PROMPT =
  "Looks good. Sign in with Google and I'll save this setup, build your agent, and send you straight to your live walkthrough.";

function genId() {
  return 'setup_' + Math.random().toString(36).slice(2, 10);
}

const SetupInner: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const {
    updateBusinessProfile,
    updateAgentConfig,
    updateCallFlow,
  } = useSetupStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>('business');
  const [authMode, setAuthMode] = useState<AuthMode>('gate');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState<(typeof INDUSTRY_OPTIONS)[number]['value'] | ''>('');
  const [voiceId, setVoiceId] = useState<(typeof VOICE_OPTIONS)[number]['value']>(VOICE_OPTIONS[0].value);
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]['value']>(GOAL_OPTIONS[0].value);
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]['value']>(TONE_OPTIONS[0].value);
  const [transferNumber, setTransferNumber] = useState('');

  const timerMapRef = useRef<Map<string, number>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription(
      'Build your Boltcall AI receptionist with a guided agent-led setup.'
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const firstMessageId = genId();
    setMessages([{ id: firstMessageId, role: 'assistant', content: BUSINESS_PROMPT, displayed: 0 }]);
    typewriterAnimate(firstMessageId, BUSINESS_PROMPT);

    return () => {
      mountedRef.current = false;
      timerMapRef.current.forEach((timer) => window.clearTimeout(timer));
      timerMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSetup = useMemo<PendingAgentSetup>(() => ({
    businessName: businessName.trim(),
    industry: (industry || INDUSTRY_OPTIONS[0].value) as PendingAgentSetup['industry'],
    voiceId,
    goal,
    tone,
    transferNumber: transferNumber.trim(),
    createdAt: new Date().toISOString(),
  }), [businessName, industry, voiceId, goal, tone, transferNumber]);

  function typewriterAnimate(id: string, text: string) {
    let i = 0;
    function tick() {
      i = Math.min(text.length, i + Math.max(1, Math.floor(text.length / 80)));
      setMessages((prev) => prev.map((message) => (
        message.id === id ? { ...message, displayed: i } : message
      )));
      if (i < text.length) {
        const timer = window.setTimeout(tick, 14);
        timerMapRef.current.set(id, timer);
      } else {
        timerMapRef.current.delete(id);
      }
    }
    tick();
  }

  async function enqueueAssistant(content: string) {
    setIsAssistantTyping(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    if (!mountedRef.current) return;
    setIsAssistantTyping(false);
    const id = genId();
    setMessages((prev) => [...prev, { id, role: 'assistant', content, displayed: 0 }]);
    typewriterAnimate(id, content);
  }

  function appendUserMessage(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: 'user', content, displayed: content.length },
    ]);
  }

  function syncDraftToStore() {
    if (!businessName.trim() || !industry) return;

    updateBusinessProfile({
      businessName: businessName.trim(),
      mainCategory: industry,
      country: 'us',
      languages: 'en',
      serviceAreas: [],
      openingHours: {},
      businessPhone: transferNumber.trim() || undefined,
    });
    updateAgentConfig({
      agentType: 'inbound',
      agentName: `${businessName.trim()} AI Receptionist`,
      voiceId,
      transferNumber: transferNumber.trim(),
    });
    updateCallFlow({
      tone,
    });
  }

  const isBusinessStepValid = businessName.trim().length >= 2 && !!industry;

  async function handleBusinessContinue() {
    if (!isBusinessStepValid) return;
    setError(null);
    syncDraftToStore();
    appendUserMessage(`${businessName.trim()} · ${getIndustryLabel(industry)}`);
    setStep('preferences');
    await enqueueAssistant(PREFERENCES_PROMPT);
  }

  async function handlePreferencesContinue() {
    setError(null);
    syncDraftToStore();
    appendUserMessage(
      `${getVoiceLabel(voiceId)} voice · ${getGoalLabel(goal)} · ${getToneLabel(tone)}${transferNumber.trim() ? ` · transfer to ${transferNumber.trim()}` : ''}`,
    );

    if (user?.id) {
      await finalizeAuthenticatedSetup(user.id);
      return;
    }

    setStep('auth');
    setAuthMode('gate');
    await enqueueAssistant(AUTH_PROMPT);
  }

  async function finalizeAuthenticatedSetup(userId: string) {
    try {
      setIsSubmitting(true);
      setError(null);
      syncDraftToStore();
      await provisionAgentSetup(userId, currentSetup);
      clearPendingAgentSetup();
      navigate('/setup/loading', { replace: true });
    } catch (setupError) {
      console.error('Setup provisioning failed:', setupError);
      setError(setupError instanceof Error ? setupError.message : 'Setup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleContinue() {
    try {
      setError(null);
      syncDraftToStore();
      savePendingAgentSetup(currentSetup);
      await signInWithGoogle();
    } catch (authError) {
      if (authError instanceof Error && authError.message === 'OAuth redirect initiated') return;
      setError(authError instanceof Error ? authError.message : 'Google sign-in failed.');
    }
  }

  async function handleEmailAuthSuccess() {
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (!freshUser?.id) {
      setError('Sign in did not complete. Please try again.');
      setAuthMode('gate');
      return;
    }

    await finalizeAuthenticatedSetup(freshUser.id);
  }

  if (step === 'auth' && authMode === 'email') {
    return (
      <AuthSwitch
        defaultMode="signup"
        defaultRedirect="/setup/loading"
        onAuthenticated={handleEmailAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf5_0%,#ffffff_28%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-2">
          <Link to="/" className="inline-flex items-center">
            <img
              src="/boltcall_full_logo.png"
              alt="Boltcall"
              className="h-11 w-auto"
              width={160}
              height={52}
              loading="eager"
              decoding="async"
            />
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-500 shadow-sm sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Save your setup after Google sign-in
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex flex-col justify-between rounded-[28px] border border-amber-200/70 bg-[radial-gradient(circle_at_top,#fff4bf_0%,#fff8df_34%,#fffdf6_100%)] p-6 shadow-[0_24px_80px_rgba(251,191,36,0.12)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm">
                <Bolt className="h-3.5 w-3.5" />
                Agent-led onboarding
              </div>
              <h1 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">
                Build your Boltcall receptionist in a real conversation.
              </h1>
              <p className="mt-4 text-sm leading-6 text-zinc-700">
                We’ll keep the first steps tight: business name, industry, and the core voice preferences that shape how the agent answers your leads.
              </p>
            </div>

            <div className="mt-8 space-y-3 text-sm text-zinc-700">
              <div className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
                <MessageSquare className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <div className="font-medium text-zinc-900">Feels like a walkthrough</div>
                  <div className="mt-1 text-zinc-600">Structured fields appear inside the conversation, not in a generic form wizard.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
                <ArrowRight className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <div className="font-medium text-zinc-900">Google auth comes after momentum</div>
                  <div className="mt-1 text-zinc-600">You answer the first two setup turns, then save and continue straight into your live agent walkthrough.</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-h-[720px] flex-col overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Bolt className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-950">Boltcall setup agent</div>
                  <div className="text-xs text-zinc-500">
                    {step === 'business' && 'Step 1 of 2 · business basics'}
                    {step === 'preferences' && 'Step 2 of 2 · agent preferences'}
                    {step === 'auth' && 'Save your setup to continue'}
                  </div>
                </div>
              </div>
              <Link
                to="/login?redirect=/dashboard"
                className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Already have an account?
              </Link>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)] px-5 py-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isAssistantTyping && <TypingIndicator />}
            </div>

            {error && (
              <div className="mx-5 mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div className="border-t border-zinc-200 bg-zinc-50/70 px-5 py-5">
              {step === 'business' && (
                <StructuredPanel
                  title="Business details"
                  description="This is what Boltcall uses to shape your receptionist and dashboard."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup label="Business Name" htmlFor="businessName">
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(event) => setBusinessName(event.target.value)}
                        placeholder="Sunrise Roofing"
                      />
                    </FieldGroup>
                    <FieldGroup label="Industry" htmlFor="industry">
                      <select
                        id="industry"
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value as typeof industry)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                      >
                        <option value="">Select an industry</option>
                        {INDUSTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldGroup>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleBusinessContinue}
                      disabled={!isBusinessStepValid}
                      className="rounded-full px-5"
                    >
                      Continue
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StructuredPanel>
              )}

              {step === 'preferences' && (
                <StructuredPanel
                  title="Agent Preferences"
                  description="We kept this to the highest-leverage choices for launch."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup label="Voice" htmlFor="voiceId">
                      <select
                        id="voiceId"
                        value={voiceId}
                        onChange={(event) => setVoiceId(event.target.value as typeof voiceId)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                      >
                        {VOICE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} · {option.description}
                          </option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Primary Goal" htmlFor="goal">
                      <select
                        id="goal"
                        value={goal}
                        onChange={(event) => setGoal(event.target.value as typeof goal)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                      >
                        {GOAL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Tone" htmlFor="tone">
                      <select
                        id="tone"
                        value={tone}
                        onChange={(event) => setTone(event.target.value as typeof tone)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                      >
                        {TONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Transfer Number (optional)" htmlFor="transferNumber">
                      <Input
                        id="transferNumber"
                        value={transferNumber}
                        onChange={(event) => setTransferNumber(event.target.value)}
                        placeholder="+1 555 000 0000"
                      />
                    </FieldGroup>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handlePreferencesContinue}
                      disabled={isSubmitting}
                      className="rounded-full px-5"
                    >
                      {user?.id ? 'Build my setup' : 'Continue'}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StructuredPanel>
              )}

              {step === 'auth' && (
                <StructuredPanel
                  title="Save and continue"
                  description="Google is the fastest path. If you prefer, you can use email instead."
                >
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleContinue}
                      className="inline-flex items-center justify-center gap-3 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('email')}
                      className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
                    >
                      Use email instead
                    </button>
                  </div>
                </StructuredPanel>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const StructuredPanel: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <div className="text-sm font-semibold text-zinc-950">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const FieldGroup: React.FC<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, children }) => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const visible = message.displayed != null
    ? message.content.slice(0, message.displayed)
    : message.content;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser ? 'bg-zinc-950 text-white' : 'bg-amber-50 text-zinc-900',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap">{visible}</div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="rounded-[24px] bg-amber-50 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Setup: React.FC = () => (
  <SubscriptionProvider>
    <TokenProvider>
      <SetupInner />
    </TokenProvider>
  </SubscriptionProvider>
);

export default Setup;
