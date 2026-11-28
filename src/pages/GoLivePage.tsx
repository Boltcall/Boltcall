import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ExternalLink, Play, ShieldCheck } from 'lucide-react';

// TODO(Noam): record the 90-second explainer and set this (e.g. '/videos/go-live.mp4' or a hosted URL).
// While empty, the video section is hidden so prospects never see a dead player.
const GO_LIVE_VIDEO_SRC = '';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 549,
    blurb: 'Answer and book every new inquiry.',
    features: [
      'AI intake receptionist',
      'Missed call text-back',
      'Instant lead reply',
      'Consultation reminders',
      'Reports dashboard',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 897,
    blurb: 'Everything in Starter, plus the follow-up system.',
    popular: true,
    features: [
      'Full lead follow-up system',
      'SMS conversations',
      'Website chat widget',
      'Custom AI voice and script',
      'CRM and webhook integrations',
    ],
  },
] as const;

const STEPS = [
  {
    title: 'A call-back in seconds',
    body: 'Every new call, missed call, web form, and text gets a reply within seconds, before another firm gets there.',
  },
  {
    title: 'After-hours intake',
    body: 'Nights, weekends, court days. It answers, takes the intake, and alerts your team to anything urgent.',
  },
  {
    title: 'Qualification on your terms',
    body: 'It collects the matter type, key dates, and names for your conflict check. It never gives legal advice or says whether someone has a case.',
  },
  {
    title: 'A booked consultation',
    body: 'Qualified callers land on your Google Calendar or Cal.com. You get a summary by email, so whoever picks it up has the context.',
  },
];

const FAQS = [
  {
    q: 'Does it sound robotic?',
    a: 'Judge it yourself. Your demo is the same assistant that would answer your calls. It opens every call by saying it is an AI assistant and that the call is recorded, and that cannot be turned off.',
  },
  {
    q: 'What about my existing intake staff?',
    a: 'It covers what your team cannot: after hours, court days, busy lines. Urgent matters are flagged and your team is alerted, and every booked consultation comes with a summary so your staff pick up with context.',
  },
  {
    q: 'Is it OK under bar and ethics rules?',
    a: 'You remain responsible for your own professional obligations, including your state bar guidance on AI and call recording. It handles intake only, never gives legal advice, and says the call does not make the caller a client. See the security page for how client information is handled.',
    link: { to: '/law-firm-security', label: 'Security page for law firms' },
  },
  {
    q: 'Is there a contract?',
    a: 'No long-term contracts. It is a flat monthly plan with no per-case fees and no share of your fees. Cancel any time from your dashboard.',
  },
  {
    q: 'What happens to my phone number?',
    a: 'Nothing has to change. Forward your existing number, or get a new local one in the app. We suggest starting with forwarding only when no one answers.',
  },
  {
    q: 'How long does setup take?',
    a: 'Setup is free. You tell it about your firm and connect a calendar, about 5 minutes of your time, and we take it from there. You are live in 48 hours.',
  },
];

function track(event: string, params: Record<string, string | number | boolean>) {
  // GA4 via the site's consent-gated loader; no-ops until the visitor accepts analytics.
  window.gtag?.('event', event, params);
}

function safeDemoUrl(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function VideoSlot() {
  const [playing, setPlaying] = useState(false);
  if (!GO_LIVE_VIDEO_SRC) return null;
  return (
    <section className="px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-sm">
        {playing ? (
          <video src={GO_LIVE_VIDEO_SRC} controls autoPlay playsInline className="aspect-video w-full" />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
            aria-label="Play the 90-second walkthrough"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg transition-transform duration-200 group-hover:scale-105">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
            <span className="absolute bottom-4 left-4 text-sm font-semibold">90 seconds: how going live works</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default function GoLivePage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const firm = params.get('firm')?.trim().slice(0, 80) || '';
  const demoUrl = safeDemoUrl(params.get('demo'));

  useEffect(() => {
    document.title = 'Your demo is ready to go live | Boltcall';
    // Personalized, per-lead page: keep it out of search.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    track('go_live_view', { slug, has_firm: !!firm, has_demo: !!demoUrl });
  }, [slug, firm, demoUrl]);

  const checkoutUrl = (plan: string) => {
    const q = new URLSearchParams({ plan, slug });
    if (firm) q.set('firm', firm);
    return `/go-live-checkout?${q.toString()}`;
  };
  const onCta = (plan: string) => track('go_live_cta_click', { slug, plan, has_firm: !!firm });

  const openDemo = demoUrl && (
    <a
      href={demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('go_live_demo_open', { slug })}
      className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full focus-visible:ring-4 focus-visible:ring-blue-300 border-2 border-black bg-blue-600 px-7 text-base font-semibold text-white shadow-[4px_4px_0_0_#000] transition-colors hover:bg-blue-700 sm:w-auto"
    >
      Open your demo <ExternalLink className="h-4 w-4" aria-hidden />
    </a>
  );

  return (
    <main className="min-h-screen bg-white text-gray-900" dir="ltr">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold tracking-tight">
          boltcall
        </Link>
        <a href="#plans" className="text-sm font-semibold text-blue-700 underline underline-offset-4">
          See plans
        </a>
      </header>

      {/* 1. Hero */}
      <section className="bg-gradient-to-b from-blue-50 via-white to-white px-4 pb-12 pt-8 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Your demo is ready
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {firm ? `${firm}, your demo is ready to go live.` : 'Your demo is ready to go live.'}
          </h1>
          <p className="mt-4 text-lg font-semibold text-blue-700">Setup is free. Live in 48 hours.</p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-gray-600 md:text-lg">
            We built this demo for your firm. Try it, see how it answers a new inquiry, then go live below. No meeting needed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {openDemo}
            <a
              href="#plans"
              className={
                demoUrl
                  ? 'text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-gray-900'
                  : 'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full focus-visible:ring-4 focus-visible:ring-blue-300 border-2 border-black bg-blue-600 px-7 text-base font-semibold text-white shadow-[4px_4px_0_0_#000] hover:bg-blue-700 sm:w-auto'
              }
            >
              {demoUrl ? 'Skip to plans' : 'See plans'} {!demoUrl && <ArrowRight className="h-4 w-4" aria-hidden />}
            </a>
          </div>
        </div>
      </section>

      {/* 2. Video (hidden until Noam sets GO_LIVE_VIDEO_SRC) */}
      <VideoSlot />

      {/* 3. What goes live */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-gray-950">The first firm to call back signs the case.</h2>
          <p className="mt-3 text-base text-gray-600 md:text-lg">
            Most prospective clients call more than one firm, and the first to respond gets the first real conversation. Here is what goes live for you.
          </p>
          <ol className="mt-8 space-y-6 border-l-2 border-dashed border-gray-200 pl-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-sm font-bold text-blue-600">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-gray-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Pricing */}
      <section id="plans" className="scroll-mt-4 bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950">Pick a plan. Setup is free.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-gray-600 md:text-lg">
            One flat monthly price. No per-case fees, no share of your fees.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                  'popular' in p && p.popular ? 'border-2 border-blue-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                  {'popular' in p && p.popular && (
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Most popular</span>
                  )}
                </div>
                <p className="mt-3">
                  <span className="text-4xl font-bold tracking-tight text-gray-950">${p.price}</span>
                  <span className="text-gray-600">/mo</span>
                </p>
                <p className="mt-1 text-sm text-gray-600">{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={3} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={checkoutUrl(p.key)}
                  onClick={() => onCta(p.key)}
                  className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full focus-visible:ring-4 focus-visible:ring-blue-300 border-2 border-black bg-blue-600 px-6 text-base font-semibold text-white shadow-[4px_4px_0_0_#000] transition-colors hover:bg-blue-700"
                >
                  Go live on {p.name} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            Bigger firm?{' '}
            <Link to="/book-a-call" className="font-semibold text-blue-700 underline underline-offset-4">
              Talk to Noam
            </Link>
          </p>
        </div>
      </section>

      {/* 5. Guarantee (promise already on /pricing and Terms section 7) */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-gray-200 p-6 sm:flex-row sm:items-start sm:p-8">
          <ShieldCheck className="h-8 w-8 shrink-0 text-blue-600" aria-hidden />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950">30-day money-back guarantee</h2>
            <p className="mt-2 text-gray-600">
              Every plan is backed by a 30-day money-back guarantee, starting the day your assistant is live. No long-term contract, and you can cancel any time. The full terms are in{' '}
              <Link to="/terms-of-service#guarantee" className="font-semibold text-blue-700 underline underline-offset-4">
                section 7 of our Terms
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-gray-950">What you would ask on a call</h2>
          <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-base font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <p className="pb-4 leading-relaxed text-gray-600">
                  {f.a}{' '}
                  {'link' in f && f.link && (
                    <Link to={f.link.to} className="font-semibold text-blue-700 underline underline-offset-4">
                      {f.link.label}
                    </Link>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Closing CTA */}
      <section className="bg-gray-950 px-4 py-14 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight">Your demo is waiting. So is the next inquiry.</h2>
          <p className="mt-3 text-gray-300">Free setup, live in 48 hours, 30-day money-back guarantee.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {PLANS.map((p) => (
              <Link
                key={p.key}
                to={checkoutUrl(p.key)}
                onClick={() => onCta(p.key)}
                className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-7 text-base font-semibold sm:w-auto ${
                  'popular' in p && p.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'border border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {p.name}, ${p.price}/mo
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap gap-5 px-4 py-8 text-xs text-gray-500 sm:px-6 lg:px-8">
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/law-firm-security">Security</Link>
        <span>Intake assistance only. Not legal advice.</span>
      </footer>
    </main>
  );
}
