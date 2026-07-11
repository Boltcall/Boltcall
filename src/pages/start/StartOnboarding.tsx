/**
 * /start — Boltcall's premium onboarding.
 *
 * A cinematic, one-question-per-screen flow that builds the user's entire
 * setup FROM their website instead of asking them to type it:
 *
 *   welcome → website → intel (auto-built profile) → pain → voice → launch → live
 *
 * Psychology baked in:
 *  - Personalization: Google name + avatar on the welcome screen; the
 *    business's own logo appears within seconds of pasting a URL.
 *  - Labor illusion: the intel scene narrates real scraping/extraction work.
 *  - Smart defaults: everything arrives prefilled; the user confirms, not types.
 *  - IKEA effect: light-touch edits (name, services, voice) create ownership.
 *  - Endowed progress: the rail starts with "Account" already complete.
 *  - Closed loop: the pain point named mid-flow is explicitly retired on the
 *    final screen — and the fix is genuinely live (agents deployed).
 *  - Peak-end: the flow hands off to a live web call with their own agent.
 *
 * This flow is ADDITIVE — /setup (V2 chat wizard) remains the default and is
 * untouched. Deployment reuses the exact same provisioning path.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Moon,
  PhoneMissed,
  PhoneCall,
  Play,
  Sparkles,
  Timer,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SetupGradientBackground } from '../../components/setup/SetupGradientBackground';
import {
  INDUSTRY_OPTIONS,
  TONE_OPTIONS,
  VOICE_OPTIONS,
  savePendingAgentSetup,
  clearPendingAgentSetup,
  type PendingAgentSetup,
} from '../../lib/setup/onboarding';
import { provisionAgentSetup } from '../../lib/setup/provisionAgentSetup';
import { useWebsiteIntel, normalizeWebsite, logoCandidates, type WebsiteIntel } from './useWebsiteIntel';
import { cn } from '../../lib/utils';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

// ─── Types & constants ────────────────────────────────────────────────────

type Scene = 'welcome' | 'website' | 'intel' | 'pain' | 'voice' | 'launch' | 'live';

const SCENE_ORDER: Scene[] = ['welcome', 'website', 'intel', 'pain', 'voice', 'launch', 'live'];

const DRAFT_KEY = 'boltcall_start_draft';

const RAIL_PHASES: Array<{ label: string; scenes: Scene[] }> = [
  { label: 'Account', scenes: [] }, // endowed — always complete
  { label: 'Business', scenes: ['welcome', 'website', 'intel'] },
  { label: 'Focus', scenes: ['pain'] },
  { label: 'Voice', scenes: ['voice'] },
  { label: 'Launch', scenes: ['launch', 'live'] },
];

const PAIN_POINTS = [
  {
    id: 'missed_calls',
    title: 'Missed calls',
    detail: 'The phone rings while we’re working. Those jobs go to whoever answers first.',
    icon: PhoneMissed,
    fix: 'Every call now gets picked up on the first ring — even with your hands full.',
  },
  {
    id: 'after_hours',
    title: 'After-hours silence',
    detail: 'Leads call at 7pm, hit voicemail, and never call back.',
    icon: Moon,
    fix: '7pm, 2am, Sunday morning — your line now answers around the clock.',
  },
  {
    id: 'slow_followup',
    title: 'Slow follow-up',
    detail: 'New leads sit for hours before anyone replies. By then they’ve moved on.',
    icon: Timer,
    fix: 'New leads now get a call back in under 60 seconds, automatically.',
  },
  {
    id: 'front_desk',
    title: 'Overwhelmed front desk',
    detail: 'Too many calls, not enough hands. Good customers wait on hold.',
    icon: Users,
    fix: 'Overflow calls are now answered instantly, so nobody waits on hold.',
  },
] as const;

type PainId = (typeof PAIN_POINTS)[number]['id'];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Launch steps narrate the real provisioning promise. The final step holds
// until the promise actually resolves.
const LAUNCH_STEPS = [
  'Creating your workspace',
  'Loading your services and answers',
  'Training your receptionist',
  'Deploying your speed-to-lead agent',
  'Bringing everything online',
];

interface Draft {
  scene: Scene;
  websiteInput: string;
  websiteUrl: string;
  domain: string;
  businessName: string;
  industry: PendingAgentSetup['industry'];
  services: Array<{ name: string; duration: number; price: number }>;
  faqs: Array<{ question: string; answer: string }>;
  logoUrl: string;
  logoFallbackUrl: string;
  pain: PainId | null;
  voiceId: PendingAgentSetup['voiceId'];
  tone: PendingAgentSetup['tone'];
  transferNumber: string;
  intelDone: boolean;
}

const EMPTY_DRAFT: Draft = {
  scene: 'welcome',
  websiteInput: '',
  websiteUrl: '',
  domain: '',
  businessName: '',
  industry: 'other',
  services: [],
  faqs: [],
  logoUrl: '',
  logoFallbackUrl: '',
  pain: null,
  voiceId: VOICE_OPTIONS[0].value,
  tone: 'friendly_concise',
  transferNumber: '',
  intelDone: false,
};

function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    // Never resume into transient scenes.
    const scene = parsed.scene === 'launch' || parsed.scene === 'live' || parsed.scene === 'welcome'
      ? (parsed.businessName ? 'intel' : 'website')
      : (parsed.scene ?? 'welcome');
    return { ...EMPTY_DRAFT, ...parsed, scene };
  } catch {
    return EMPTY_DRAFT;
  }
}

function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/[\s,]+/).find(Boolean);
  return first ? first.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || null : null;
}

// Voice-agent onboarding creates billable resources — never index it.
function useNoindex() {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'robots';
      document.head.appendChild(tag);
    }
    const previous = tag.content;
    tag.content = 'noindex, nofollow';
    return () => { tag!.content = previous || ''; };
  }, []);
}

// ─── Shared atoms ─────────────────────────────────────────────────────────

const sceneVariants = {
  initial: { opacity: 0, y: 24, filter: 'blur(12px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -16, filter: 'blur(8px)' },
};

const SceneShell: React.FC<{ id: string; children: React.ReactNode; wide?: boolean }> = ({ id, children, wide }) => (
  <motion.div
    key={id}
    variants={sceneVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.55, ease: EASE }}
    className={cn('relative z-10 mx-auto w-full px-6', wide ? 'max-w-3xl' : 'max-w-2xl')}
  >
    {children}
  </motion.div>
);

const Reveal: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({ delay = 0, children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: 0.65, ease: EASE, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={cn(
      'group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-zinc-950 transition-all',
      'hover:bg-zinc-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
      'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none',
      className,
    )}
  >
    {children}
  </button>
);

const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={cn(
      'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-medium text-white/85 transition-colors',
      'hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
      'disabled:cursor-not-allowed disabled:opacity-40',
      className,
    )}
  >
    {children}
  </button>
);

/** Business logo with graceful degradation: Clearbit → favicon → initial. */
const LogoTile: React.FC<{
  logoUrl: string;
  fallbackUrl: string;
  name: string;
  size?: number;
  className?: string;
}> = ({ logoUrl, fallbackUrl, name, size = 64, className }) => {
  const [stage, setStage] = useState<0 | 1 | 2>(logoUrl ? 0 : 2);
  const src = stage === 0 ? logoUrl : stage === 1 ? fallbackUrl : '';

  useEffect(() => {
    setStage(logoUrl ? 0 : 2);
  }, [logoUrl, fallbackUrl]);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] shadow-[0_10px_40px_rgba(0,0,0,0.45)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-2"
          onError={() => setStage((s) => (s === 0 ? 1 : 2))}
        />
      ) : (
        <span className="text-2xl font-black text-white/80">{(name || '?').charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
};

/** Top progress rail — starts with "Account" already complete (endowed progress). */
const ProgressRail: React.FC<{ scene: Scene }> = ({ scene }) => {
  // Hide during cinematic scenes so nothing competes with the Boltcall logo
  // header (top-8) or the "welcome" title animation.
  if (scene === 'welcome' || scene === 'live') return null;
  const sceneIdx = SCENE_ORDER.indexOf(scene);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-6 pt-24 sm:pt-28">
      <div className="flex w-full max-w-xl items-center gap-2">
        {RAIL_PHASES.map((phase, i) => {
          const phaseStart = phase.scenes.length ? SCENE_ORDER.indexOf(phase.scenes[0]) : -1;
          const phaseEnd = phase.scenes.length ? SCENE_ORDER.indexOf(phase.scenes[phase.scenes.length - 1]) : -1;
          const done = i === 0 || sceneIdx > phaseEnd;
          const active = !done && sceneIdx >= phaseStart && sceneIdx <= phaseEnd;
          return (
            <div key={phase.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn('h-full rounded-full', done ? 'bg-white' : 'bg-white/70')}
                  initial={false}
                  animate={{ width: done ? '100%' : active ? '55%' : '0%' }}
                  transition={{ duration: 0.7, ease: EASE }}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-500',
                  done ? 'text-white/85' : active ? 'text-white/60' : 'text-white/25',
                )}
              >
                {done && i === 0 ? '✓ ' : ''}
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Scenes ───────────────────────────────────────────────────────────────

// Welcome scene mirrors /setup's cinematic entrance: gradient beam falls from
// top, WELCOME TO BOLTCALL {NAME} fades in with blur/letter-spacing, holds,
// then fades out as the next scene takes over. Avatar sits above the title.
const WelcomeScene: React.FC<{ firstName: string | null; avatarUrl: string | null }> = ({ firstName, avatarUrl }) => {
  const welcomeText = firstName ? `Welcome to Boltcall ${firstName}` : 'Welcome to Boltcall';
  return (
    <SceneShell id="welcome">
      <style>{`
        @keyframes startWelcomeIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            filter: blur(14px);
            letter-spacing: 0.18em;
          }
          42% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
            letter-spacing: 0.11em;
          }
          78% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(0.985);
            filter: blur(8px);
          }
        }
        @keyframes startWelcomeAvatarIn {
          0% { opacity: 0; transform: translateY(-8px) scale(0.92); filter: blur(10px); }
          60% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-6px) scale(0.98); filter: blur(6px); }
        }
      `}</style>
      <div className="flex flex-col items-center text-center">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="mb-7 h-16 w-16 rounded-full border-2 border-white/25 object-cover shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
            style={{ animation: 'startWelcomeAvatarIn 2300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          />
        )}
        <h1
          className="text-3xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl lg:text-6xl"
          style={{ animation: 'startWelcomeIn 2300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        >
          {welcomeText}
        </h1>
      </div>
    </SceneShell>
  );
};

const WebsiteScene: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  error: string | null;
}> = ({ value, onChange, onSubmit, onSkip, error }) => {
  const preview = normalizeWebsite(value);
  const logos = preview ? logoCandidates(preview.domain) : null;
  return (
    <SceneShell id="website">
      <Reveal>
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
          Where does your business live online?
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mt-3 text-base text-white/55">
          Paste your website. We&rsquo;ll read it and build your whole setup for you — services, answers, even your logo.
        </p>
      </Reveal>
      <Reveal delay={0.24}>
        <form
          className="mt-9 flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
              {logos ? (
                <img
                  src={logos.fallback}
                  alt=""
                  className="h-5 w-5 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Globe className="h-5 w-5" />
              )}
            </div>
            <input
              autoFocus
              type="text"
              inputMode="url"
              autoComplete="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="yourbusiness.com"
              aria-label="Business website"
              className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] pl-12 pr-4 text-lg text-white placeholder-white/25 outline-none backdrop-blur transition-colors focus:border-white/50 focus:bg-white/[0.09]"
            />
          </div>
          <PrimaryButton
            disabled={!preview}
            onClick={onSubmit}
            aria-label="Continue"
            className="h-14 w-14 rounded-2xl px-0"
          >
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </PrimaryButton>
        </form>
      </Reveal>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <Reveal delay={0.4}>
        <button
          type="button"
          onClick={onSkip}
          className="mt-6 text-sm text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
        >
          I don&rsquo;t have a website — set up manually
        </button>
      </Reveal>
    </SceneShell>
  );
};

/** Rotating "what we're doing" lines while intel loads — labor illusion. */
const DISCOVERY_LINES = [
  'Reading your homepage…',
  'Finding the services you offer…',
  'Drafting answers to common caller questions…',
  'Matching your industry…',
  'Pulling your brand together…',
];

const IntelScene: React.FC<{
  draft: Draft;
  loading: boolean;
  manual: boolean;
  onPatch: (patch: Partial<Draft>) => void;
  onConfirm: () => void;
  onChangeWebsite: () => void;
}> = ({ draft, loading, manual, onPatch, onConfirm, onChangeWebsite }) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [faqsOpen, setFaqsOpen] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLineIdx((i) => (i + 1) % DISCOVERY_LINES.length), 1600);
    return () => clearInterval(t);
  }, [loading]);

  if (loading) {
    return (
      <SceneShell id="intel-loading">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <LogoTile
              logoUrl={draft.logoUrl}
              fallbackUrl={draft.logoFallbackUrl}
              name={draft.domain}
              size={88}
              className="shadow-[0_0_80px_rgba(140,160,255,0.25)]"
            />
          </motion.div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-white/45">{draft.domain}</p>
          <div className="mt-6 h-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={lineIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 text-lg text-white/80"
              >
                <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                {DISCOVERY_LINES[lineIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </SceneShell>
    );
  }

  const foundThings = draft.services.length > 0 || draft.faqs.length > 0;

  return (
    <SceneShell id="intel" wide>
      <Reveal>
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
          {manual
            ? 'Tell us about your business.'
            : foundThings
              ? 'We built your profile. Check our work.'
              : 'Here’s what we found. Fill in the rest.'}
        </h2>
      </Reveal>
      {!manual && (
        <Reveal delay={0.1}>
          <p className="mt-3 text-base text-white/55">
            Everything below came from your website. Fix anything we got wrong — it takes one tap.
          </p>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <div className="mt-8 rounded-3xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-8">
          {/* Identity row */}
          <div className="flex items-center gap-5">
            <LogoTile
              logoUrl={draft.logoUrl}
              fallbackUrl={draft.logoFallbackUrl}
              name={draft.businessName || draft.domain}
              size={64}
            />
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Business name
              </label>
              <input
                type="text"
                value={draft.businessName}
                onChange={(e) => onPatch({ businessName: e.target.value })}
                placeholder="Your business name"
                aria-label="Business name"
                className="w-full border-b border-white/15 bg-transparent pb-1 text-xl font-semibold text-white placeholder-white/25 outline-none transition-colors focus:border-white/60"
              />
            </div>
          </div>

          {/* Industry chips */}
          <div className="mt-7">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Industry</div>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPatch({ industry: opt.value })}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                    draft.industry === opt.value
                      ? 'border-white bg-white text-zinc-950'
                      : 'border-white/15 bg-white/[0.04] text-white/65 hover:border-white/35 hover:text-white',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="mt-7">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Services{draft.services.length > 0 ? ` · ${draft.services.length} found` : ''}
              </span>
              <button
                type="button"
                onClick={() => onPatch({ services: [...draft.services, { name: '', duration: 30, price: 0 }] })}
                className="text-xs font-medium text-white/55 transition-colors hover:text-white"
              >
                + Add service
              </button>
            </div>
            {draft.services.length === 0 ? (
              <p className="text-sm text-white/35">
                No services yet — add a couple so your agent knows what to book.
              </p>
            ) : (
              <ul className="space-y-2">
                {draft.services.map((svc, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-300/80" />
                    <input
                      type="text"
                      value={svc.name}
                      placeholder="Service name"
                      aria-label={`Service ${i + 1} name`}
                      onChange={(e) => {
                        const services = [...draft.services];
                        services[i] = { ...services[i], name: e.target.value };
                        onPatch({ services });
                      }}
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                    />
                    {svc.price > 0 && (
                      <span className="text-xs tabular-nums text-white/45">${svc.price}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove service ${i + 1}`}
                      onClick={() => onPatch({ services: draft.services.filter((_, idx) => idx !== i) })}
                      className="text-white/30 transition-colors hover:text-rose-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          {/* FAQs — collapsed proof of work */}
          {draft.faqs.length > 0 && (
            <div className="mt-7">
              <button
                type="button"
                onClick={() => setFaqsOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.07]"
              >
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Sparkles className="h-4 w-4 text-violet-300/80" />
                  {draft.faqs.length} caller questions — already answered from your site
                </span>
                <span className="text-xs text-white/40">{faqsOpen ? 'Hide' : 'Review'}</span>
              </button>
              {faqsOpen && (
                <ul className="mt-2 space-y-2">
                  {draft.faqs.map((f, i) => (
                    <li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium text-white/85">{f.question}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">{f.answer}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.35} className="mt-8 flex flex-wrap items-center gap-4">
        <PrimaryButton onClick={onConfirm} disabled={!draft.businessName.trim()}>
          Looks right
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
        {!manual && (
          <button
            type="button"
            onClick={onChangeWebsite}
            className="text-xs text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
          >
            Wrong website? Change it
          </button>
        )}
      </Reveal>
    </SceneShell>
  );
};

const PainScene: React.FC<{ selected: PainId | null; onSelect: (id: PainId) => void }> = ({ selected, onSelect }) => (
  <SceneShell id="pain" wide>
    <Reveal>
      <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
        What&rsquo;s costing you the most right now?
      </h2>
    </Reveal>
    <Reveal delay={0.12}>
      <p className="mt-3 text-base text-white/55">Be honest. This is the first thing we&rsquo;ll fix — today.</p>
    </Reveal>
    <div className="mt-9 grid gap-3 sm:grid-cols-2">
      {PAIN_POINTS.map((p, i) => {
        const Icon = p.icon;
        const active = selected === p.id;
        return (
          <Reveal key={p.id} delay={0.2 + i * 0.08}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              aria-pressed={active}
              className={cn(
                'group h-full w-full rounded-2xl border p-5 text-left transition-all duration-300',
                active
                  ? 'border-white bg-white/[0.14] shadow-[0_0_60px_rgba(255,255,255,0.08)]'
                  : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
                    active ? 'border-white/40 bg-white text-zinc-950' : 'border-white/15 bg-white/[0.06] text-white/70',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold text-white">{p.title}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{p.detail}</p>
            </button>
          </Reveal>
        );
      })}
    </div>
  </SceneShell>
);

const VoiceScene: React.FC<{
  draft: Draft;
  onPatch: (patch: Partial<Draft>) => void;
  onLaunch: () => void;
}> = ({ draft, onPatch, onLaunch }) => {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function preview(voice: (typeof VOICE_OPTIONS)[number]) {
    onPatch({ voiceId: voice.value });
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    if (playing === voice.value) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.pause();
    audio.src = voice.previewUrl;
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    try {
      setPlaying(voice.value);
      await audio.play();
    } catch {
      setPlaying(null);
    }
  }

  return (
    <SceneShell id="voice" wide>
      <Reveal>
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
          Meet your new first responder.
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mt-3 text-base text-white/55">
          This is who answers for {draft.businessName || 'your business'} when you can&rsquo;t. Pick the voice — tap to hear it.
        </p>
      </Reveal>

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        {VOICE_OPTIONS.map((voice, i) => {
          const active = draft.voiceId === voice.value;
          const isPlaying = playing === voice.value;
          return (
            <Reveal key={voice.value} delay={0.2 + i * 0.08}>
              <button
                type="button"
                onClick={() => void preview(voice)}
                aria-pressed={active}
                className={cn(
                  'w-full rounded-2xl border p-5 text-left transition-all duration-300',
                  active
                    ? 'border-white bg-white/[0.14] shadow-[0_0_50px_rgba(255,255,255,0.08)]'
                    : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">{voice.label}</span>
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                      isPlaying ? 'border-white bg-white text-zinc-950' : 'border-white/20 text-white/60',
                    )}
                  >
                    {isPlaying ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/55">{voice.description}</p>
              </button>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.4}>
        <div className="mt-7">
          <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">How it talks</div>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onPatch({ tone: t.value })}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs font-medium transition-all',
                  draft.tone === t.value
                    ? 'border-white bg-white text-zinc-950'
                    : 'border-white/15 bg-white/[0.04] text-white/65 hover:border-white/35 hover:text-white',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.5}>
        <div className="mt-7 max-w-sm">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Transfer number <span className="font-normal normal-case text-white/30">(optional — for calls that need a human)</span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={draft.transferNumber}
            onChange={(e) => onPatch({ transferNumber: e.target.value })}
            placeholder="+1 555 123 4567"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/50"
          />
        </div>
      </Reveal>

      <Reveal delay={0.6} className="mt-9">
        <PrimaryButton onClick={onLaunch}>
          Build my agent
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
      </Reveal>
    </SceneShell>
  );
};

const LaunchScene: React.FC<{
  draft: Draft;
  stepIdx: number;
  error: string | null;
  onRetry: () => void;
}> = ({ draft, stepIdx, error, onRetry }) => {
  const pain = PAIN_POINTS.find((p) => p.id === draft.pain);
  return (
    <SceneShell id="launch">
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={error ? {} : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <LogoTile
            logoUrl={draft.logoUrl}
            fallbackUrl={draft.logoFallbackUrl}
            name={draft.businessName}
            size={80}
            className="shadow-[0_0_90px_rgba(140,160,255,0.3)]"
          />
        </motion.div>
        <h2 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          Building {draft.businessName}&rsquo;s agent
        </h2>
        {pain && !error && (
          <p className="mt-3 text-sm text-white/55">
            First job: fixing <span className="font-semibold text-white/85">{pain.title.toLowerCase()}</span>.
          </p>
        )}

        {!error ? (
          <ul className="mt-10 w-full max-w-sm space-y-3 text-left">
            {LAUNCH_STEPS.map((step, i) => {
              const done = i < stepIdx;
              const current = i === stepIdx;
              return (
                <motion.li
                  key={step}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: done || current ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.45, ease: EASE, delay: i * 0.06 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-500',
                      done
                        ? 'border-emerald-300/60 bg-emerald-300/15 text-emerald-300'
                        : current
                          ? 'border-white/50 text-white'
                          : 'border-white/15 text-transparent',
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  </span>
                  <span className={cn('transition-colors duration-500', done ? 'text-white/50 line-through decoration-white/20' : current ? 'text-white' : 'text-white/40')}>
                    {step}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-10 w-full max-w-md rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5 text-left">
            <p className="text-sm font-semibold text-rose-200">Launch hit a snag</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-200/75">{error}</p>
            <GhostButton onClick={onRetry} className="mt-4 h-10 px-5 text-xs">
              Try again
            </GhostButton>
          </div>
        )}
      </div>
    </SceneShell>
  );
};

const LiveScene: React.FC<{
  draft: Draft;
  phoneNumber: string | null;
  phoneError: string | null;
  retryingPhone: boolean;
  onRetryPhone: () => void;
  onConnectCalendar: () => void;
  onCall: () => void;
  onDashboard: () => void;
}> = ({ draft, phoneNumber, phoneError, retryingPhone, onRetryPhone, onConnectCalendar, onCall, onDashboard }) => {
  const pain = PAIN_POINTS.find((p) => p.id === draft.pain);
  return (
    <SceneShell id="live" wide>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        >
          <LogoTile
            logoUrl={draft.logoUrl}
            fallbackUrl={draft.logoFallbackUrl}
            name={draft.businessName}
            size={88}
            className="shadow-[0_0_100px_rgba(110,231,183,0.25)]"
          />
        </motion.div>

        <Reveal delay={0.25}>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Live now</span>
          </div>
        </Reveal>

        <Reveal delay={0.35}>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {draft.businessName} answers in under 5 seconds.
          </h2>
        </Reveal>
        <Reveal delay={0.5}>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
            Two agents are deployed and on duty: a receptionist for every inbound call, and a
            speed-to-lead agent that chases every new lead the moment it lands.
          </p>
        </Reveal>

        {pain && (
          <Reveal delay={0.65}>
            <div className="mt-8 w-full max-w-lg rounded-2xl border border-white/12 bg-white/[0.05] p-6 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                You said this was costing you the most
              </p>
              <div className="mt-2 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950">
                  <pain.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-semibold text-white">
                    {pain.title} — <span className="text-emerald-300">handled.</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{pain.fix}</p>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Purchased number — the tangible proof the agent is reachable */}
        {phoneNumber && (
          <Reveal delay={0.75}>
            <div className="mt-6 w-full max-w-lg rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                Your business line
              </p>
              <a
                href={`tel:${phoneNumber.replace(/[^+\d]/g, '')}`}
                className="mt-1 block text-2xl font-bold tracking-tight text-white hover:text-emerald-200 transition-colors"
              >
                {phoneNumber}
              </a>
              <p className="mt-1 text-xs text-white/45">Call it right now — your agent picks up.</p>
            </div>
          </Reveal>
        )}
        {phoneError && (
          <Reveal delay={0.75}>
            <div className="mt-6 w-full max-w-lg rounded-2xl border border-amber-300/25 bg-amber-400/[0.08] p-5 text-left">
              <p className="text-sm font-semibold text-amber-200">Phone number pending</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/70">{phoneError}</p>
              <GhostButton onClick={onRetryPhone} className="mt-3 h-9 px-4 text-xs" disabled={retryingPhone}>
                {retryingPhone ? 'Retrying…' : 'Retry now'}
              </GhostButton>
            </div>
          </Reveal>
        )}

        <Reveal delay={0.85} className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <PrimaryButton onClick={onCall}>
            <PhoneCall className="h-4 w-4" />
            Hear your agent live
          </PrimaryButton>
          <GhostButton onClick={onDashboard}>
            Enter dashboard
            <ArrowRight className="h-4 w-4" />
          </GhostButton>
        </Reveal>
        <Reveal delay={1}>
          <p className="mt-5 text-xs text-white/35">
            Don&rsquo;t just take our word for it — call it like a customer would.
          </p>
        </Reveal>
        <Reveal delay={1.1}>
          <button
            onClick={onConnectCalendar}
            className="mt-6 text-xs font-medium text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80"
          >
            Connect Google Calendar so your agent can book jobs →
          </button>
        </Reveal>
      </div>
    </SceneShell>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────

const StartOnboarding: React.FC = () => {
  useNoindex();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [launchStepIdx, setLaunchStepIdx] = useState(0);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [retryingPhone, setRetryingPhone] = useState(false);
  const launchStarted = useRef(false);

  const websiteIntel = useWebsiteIntel();

  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);
  const goTo = useCallback((scene: Scene) => setDraft((d) => ({ ...d, scene })), []);

  useEffect(() => {
    document.title = 'Get started — Boltcall';
  }, []);

  // Persist the draft so a refresh resumes mid-flow.
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* quota — skip */ }
  }, [draft]);

  // Google identity: avatar + full name live in user_metadata, which the app's
  // User shape doesn't carry — read the raw session user once.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const picture = (meta?.avatar_url || meta?.picture) as string | undefined;
      const fullName = (meta?.full_name || meta?.name) as string | undefined;
      if (picture) setAvatarUrl(picture);
      if (fullName) setGoogleName(fullName);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Welcome auto-advances — the user did nothing yet, so ask nothing yet.
  useEffect(() => {
    if (draft.scene !== 'welcome' || isLoading || !isAuthenticated) return;
    const t = window.setTimeout(() => goTo('website'), 2800);
    return () => window.clearTimeout(t);
  }, [draft.scene, isLoading, isAuthenticated, goTo]);

  const firstName = useMemo(
    () => firstNameOf(googleName) ?? firstNameOf(user?.name),
    [googleName, user?.name],
  );

  function submitWebsite() {
    const normalized = normalizeWebsite(draft.websiteInput);
    if (!normalized) {
      setWebsiteError('Enter a valid website, like yourbusiness.com');
      return;
    }
    setWebsiteError(null);
    const logos = logoCandidates(normalized.domain);
    patch({
      websiteUrl: normalized.url,
      domain: normalized.domain,
      logoUrl: logos.primary,
      logoFallbackUrl: logos.fallback,
      scene: 'intel',
    });
    if (user?.id) {
      void websiteIntel.run(normalized.url, user.id).then((intel: WebsiteIntel | null) => {
        if (!intel) return;
        setDraft((d) => ({
          ...d,
          businessName: d.businessName || intel.businessName,
          industry: d.industry === 'other' ? intel.industry : d.industry,
          services: d.services.length ? d.services : intel.services,
          faqs: d.faqs.length ? d.faqs : intel.faqs,
          intelDone: true,
        }));
      });
    }
  }

  function skipWebsite() {
    setManualMode(true);
    patch({ websiteUrl: '', domain: '', logoUrl: '', logoFallbackUrl: '', intelDone: true, scene: 'intel' });
  }

  const runLaunch = useCallback(() => {
    if (!user?.id) return;
    setLaunchError(null);
    setLaunchStepIdx(0);

    const setup: PendingAgentSetup = {
      ownerName: googleName || user.name || undefined,
      businessName: draft.businessName.trim(),
      websiteUrl: draft.websiteUrl,
      country: 'us',
      industry: draft.industry,
      voiceId: draft.voiceId,
      goal: 'book-appointments',
      tone: draft.tone,
      transferNumber: draft.transferNumber.trim(),
      services: draft.services.filter((s) => s.name.trim()),
      faqs: draft.faqs,
      logoUrl: draft.logoUrl || undefined,
      painPoint: draft.pain || undefined,
      createdAt: new Date().toISOString(),
    };
    // Same recovery contract as /setup: a failed launch leaves the pending
    // setup persisted so retry / the legacy loader can resume it.
    savePendingAgentSetup(setup);

    // Narrate real work: advance one step every ~1.6s but hold the last step
    // until provisioning actually resolves.
    const stepTimer = window.setInterval(() => {
      setLaunchStepIdx((i) => Math.min(i + 1, LAUNCH_STEPS.length - 1));
    }, 1600);
    const minimumShow = new Promise((r) => setTimeout(r, LAUNCH_STEPS.length * 1600));

    Promise.all([provisionAgentSetup(user.id, setup), minimumShow])
      .then(([result]) => {
        clearPendingAgentSetup();
        window.clearInterval(stepTimer);
        setPhoneNumber(result.phone?.number ?? null);
        setPhoneError(result.phone?.error ?? null);
        setLaunchStepIdx(LAUNCH_STEPS.length);
        setTimeout(() => goTo('live'), 500);
      })
      .catch((error) => {
        window.clearInterval(stepTimer);
        console.error('Start onboarding launch failed:', error);
        setLaunchError(
          error instanceof Error ? error.message : 'Something went wrong while deploying. Try again.',
        );
      });
  }, [user, googleName, draft, goTo]);

  // Kick provisioning exactly once when entering the launch scene.
  useEffect(() => {
    if (draft.scene !== 'launch' || launchStarted.current) return;
    launchStarted.current = true;
    runLaunch();
  }, [draft.scene, runLaunch]);

  // Phone purchase retry — the launch itself already succeeded, only the
  // number is pending. Never bounce the user back through provisioning.
  const retryPhone = useCallback(async () => {
    setRetryingPhone(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', country_code: 'US' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.phone_number) {
        setPhoneNumber(data.phone_number);
        setPhoneError(null);
      } else {
        setPhoneError(data.detail || data.error || `Phone purchase failed (${res.status})`);
      }
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Phone purchase failed');
    } finally {
      setRetryingPhone(false);
    }
  }, []);

  // Optional calendar hookup — OAuth callback lands on /dashboard/integrations,
  // which is fine: the live scene is the end of the flow anyway.
  const connectCalendar = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/google-calendar-auth-start?user_id=${user.id}`);
      const data = await res.json();
      if (data.url) {
        sessionStorage.removeItem(DRAFT_KEY);
        window.location.href = data.url;
      } else {
        console.error('Calendar OAuth start failed:', data.error);
      }
    } catch (error) {
      console.error('Calendar OAuth start failed:', error);
    }
  }, [user?.id]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#050507]" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/signup?redirect=%2Fstart" replace />;
  }

  return (
    <div className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] py-24 text-white">
      <SetupGradientBackground logoVariant="white" />
      <ProgressRail scene={draft.scene} />
      <AnimatePresence mode="wait">
        {draft.scene === 'welcome' && (
          <WelcomeScene key="welcome" firstName={firstName} avatarUrl={avatarUrl} />
        )}
        {draft.scene === 'website' && (
          <WebsiteScene
            key="website"
            value={draft.websiteInput}
            onChange={(v) => {
              patch({ websiteInput: v });
              if (websiteError) setWebsiteError(null);
            }}
            onSubmit={submitWebsite}
            onSkip={skipWebsite}
            error={websiteError}
          />
        )}
        {draft.scene === 'intel' && (
          <IntelScene
            key="intel"
            draft={draft}
            loading={!draft.intelDone && websiteIntel.status === 'scanning'}
            manual={manualMode}
            onPatch={patch}
            onConfirm={() => goTo('pain')}
            onChangeWebsite={() => {
              // Full reset of website-derived data — the old site's intel
              // must not bleed into the new one.
              patch({
                businessName: '',
                industry: 'other',
                services: [],
                faqs: [],
                logoUrl: '',
                logoFallbackUrl: '',
                domain: '',
                websiteUrl: '',
                intelDone: false,
                scene: 'website',
              });
            }}
          />
        )}
        {draft.scene === 'pain' && (
          <PainScene
            key="pain"
            selected={draft.pain}
            onSelect={(id) => {
              // Select → brief beat so the choice registers → advance.
              patch({ pain: id });
              setTimeout(() => goTo('voice'), 450);
            }}
          />
        )}
        {draft.scene === 'voice' && (
          <VoiceScene key="voice" draft={draft} onPatch={patch} onLaunch={() => goTo('launch')} />
        )}
        {draft.scene === 'launch' && (
          <LaunchScene
            key="launch"
            draft={draft}
            stepIdx={launchStepIdx}
            error={launchError}
            onRetry={() => runLaunch()}
          />
        )}
        {draft.scene === 'live' && (
          <LiveScene
            key="live"
            draft={draft}
            phoneNumber={phoneNumber}
            phoneError={phoneError}
            retryingPhone={retryingPhone}
            onRetryPhone={retryPhone}
            onConnectCalendar={connectCalendar}
            onCall={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              navigate('/setup/talk-to-agent');
            }}
            onDashboard={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              navigate('/dashboard/?setupCompleted=true');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StartOnboarding;
