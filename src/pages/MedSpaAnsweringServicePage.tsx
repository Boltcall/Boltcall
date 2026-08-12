import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Gift,
  MessageSquare,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

// Pain stats — sourced from med-spa halo file (RingBooker, Voxx, Lani AI, industry benchmarks).
const PAIN_STATS = [
  { number: '68%', label: 'of med spa inquiries happen outside 9–5', source: 'Voxx' },
  { number: '15–30 min', label: 'to book with whoever answers first', source: 'Lani AI' },
  { number: '20–35%', label: 'of inbound med spa calls go unanswered', source: 'industry benchmarks' },
  { number: '$130k+', label: 'annual revenue lost per 3 missed calls per day', source: 'Lani AI, 2026' },
];

const HERO_POINTS = [
  'Every consult call answered in under 60 seconds — even at 2am, Sunday, or mid-treatment.',
  'Treatment interest, budget signal, and provider preference captured on the first touch.',
  'SMS confirmation sent while the caller is still in aesthetic-decision mode.',
];

// Bonus stack for the Godfather offer.
const BONUSES = [
  {
    title: 'Free intake-script audit',
    body: 'A 20-minute call where we grade your current phone flow against 8 med spa conversion benchmarks and rewrite the weakest 3 lines.',
    value: '$500 value',
  },
  {
    title: 'WhatsApp broadcast setup',
    body: 'We wire re-engagement broadcasts to your dormant patient list so the first month pays for itself before after-hours coverage even matters.',
    value: '$800 value',
  },
  {
    title: 'First 30 days of after-hours free',
    body: 'Evenings, weekends, and treatment blocks covered for the first month with zero after-hours upcharge. That block alone recovers a typical missed consult.',
    value: '$400 value',
  },
];

const CAPABILITIES = [
  {
    title: 'Consultation booking',
    body: 'Boltcall answers new-client calls in seconds and captures treatment interest, membership status, and scheduling preference so the front desk starts with real context.',
    icon: Phone,
  },
  {
    title: 'Treatment-type routing',
    body: 'Botox touch-ups, laser packages, and injectable consultations do not share the same intake flow. Boltcall routes callers to the right treatment path.',
    icon: Sparkles,
  },
  {
    title: 'Rebooking and no-show recovery',
    body: 'Push same-week openings to callers with lapsed treatment cycles or open packages, so the calendar stays full instead of hoping clients come back on their own.',
    icon: CalendarCheck2,
  },
  {
    title: 'Immediate text follow-up',
    body: 'Confirm the next step over SMS while the caller is still in aesthetic-decision mode, so cold callbacks stop being the default response.',
    icon: MessageSquare,
  },
];

const COMPARISON_ROWS = [
  ['Response time', 'Immediate answer path', 'Often voicemail during treatments'],
  ['After-hours coverage', 'Consistent evenings and weekends', 'Usually a generic recording'],
  ['Med-spa-specific intake', 'Treatment interest, membership, provider preference', 'Often generic message taking'],
  ['Front-desk interruption', 'Less need to pull staff off the treatment floor', 'Front desk pulled from clients mid-appointment'],
  ['Consultation capture', 'Standardized and visible in your booking system', 'Often inconsistent or lost'],
];

const FAQS = [
  {
    question: 'What is a med spa answering service?',
    answer:
      'A med spa answering service is a system that answers inbound calls to a med spa or aesthetic practice, captures treatment interest and scheduling details, and routes the caller toward a booked consultation or treatment. The best version protects new-client calls from turning into lost revenue.',
  },
  {
    question: 'Why do med spas need fast answering?',
    answer:
      'Because aesthetic clients rarely call one med spa. They call two or three and book with whichever practice answers professionally and offers a slot soon. If the front desk is treating a client, at lunch, or already on a call, that consultation books somewhere else.',
  },
  {
    question: 'Can Boltcall handle after-hours med spa calls?',
    answer:
      'Yes. Boltcall covers evenings, weekends, and treatment-block windows so consultation requests and rebooking calls never sit in voicemail. The caller gets a real conversation and a next step, not a message tone.',
  },
  {
    question: 'Does Boltcall replace the front desk?',
    answer:
      'No. It absorbs overflow the front desk cannot pick up (busy signals, after-hours, lunch, missed calls) and captures cleaner intake so staff time goes to clients on the treatment floor instead of chasing phones.',
  },
];

const RELATED_LINKS = [
  {
    title: 'AI Receptionist for Med Spas',
    href: '/blog/ai-receptionist-med-spas',
    description: 'How AI phone answering maps to med spa consultation booking and treatment intake.',
  },
  {
    title: 'AI Receptionist Med Spa FAQ',
    href: '/blog/ai-receptionist-medspa-faq',
    description: 'Common questions from med spa owners evaluating AI for the front desk.',
  },
  {
    title: 'Best AI Answering Service for Dental and Medical Practices',
    href: '/blog/best-ai-answering-service-dental-medical-practice',
    description: 'Comparison view for aesthetic and medical practices weighing AI, human receptionists, and hybrid setups.',
  },
];

export default function MedSpaAnsweringServicePage() {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Med Spa Answering Service | Boltcall',
      url: 'https://boltcall.org/industries/medspa-answering-service',
      description:
        'Med spa answering service for aesthetic practices that need faster response, cleaner consultation intake, and more booked treatments.',
      dateModified: '2026-07-28',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://boltcall.org/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Industries',
          item: 'https://boltcall.org/industries/medspa-answering-service',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Med Spa Answering Service',
          item: 'https://boltcall.org/industries/medspa-answering-service',
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Med Spa Answering Service That Books More Consultations | Boltcall';
    updateMetaDescription(
      'Med spa answering service for aesthetic practices that need faster consultation response, after-hours coverage, and cleaner intake without pulling staff off the treatment floor.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <Clock className="h-3.5 w-3.5" /> Speed-to-lead for med spas
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Book 5 new consultations in the next 14 days — or you don't pay for the month.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                68% of your consult calls arrive after 5pm, when your front desk is gone. Boltcall
                picks up in under 60 seconds, captures treatment interest and provider preference,
                and books the appointment before the caller Googles the next med spa. If we don't
                book you 5 new consults in 14 days, refund the full month.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/book-a-call"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Book a Call
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                >
                  See Pricing
                </Link>
              </div>

              <ul className="mt-8 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                {HERO_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2 rounded-xl border border-gray-200 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <AnswerBlock
              query="What is a med spa answering service"
              definition="A med spa answering service is a lead-response system that answers inbound calls to an aesthetic practice, captures treatment interest and scheduling details, and routes the caller toward a booked consultation."
              stat="For med spas, the best version does more than take messages: it handles overflow during treatment blocks, absorbs after-hours calls, and protects new-client revenue while the caller is still deciding which practice to try."
              outcome="That means fewer lost consultations, cleaner intake, and more booked treatments from the same phone volume."
              cta="Boltcall is built for that speed-to-lead workflow."
            />
          </div>
        </section>

        {/* PAIN STATS — Sabri: shine a flood light on the problem before the solution */}
        <section className="border-b border-gray-100 bg-gray-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                <TrendingDown className="h-3.5 w-3.5" /> The math you already suspect
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Every unanswered call is a $1,500–$5,000 treatment gone to the next spa.
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PAIN_STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-4xl font-bold tracking-tight text-red-300">{stat.number}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-100">{stat.label}</p>
                  <p className="mt-3 text-xs uppercase tracking-wider text-gray-400">{stat.source}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-base leading-7 text-gray-300">
              You already spent the ad money to make that phone ring. The industry math says one in
              three of those rings goes nowhere, and 68% of them arrive when your front desk is off
              the clock. This is not a marketing problem. It is an answering problem.
            </p>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why aesthetic consultations vanish so fast
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  Aesthetic clients rarely research for later. They are ready to book, have a
                  budget in mind, and are checking two or three spas. Whichever practice picks up
                  and offers a slot soon usually earns the consultation.
                </p>
                <p>
                  That is why med spa answering is really a speed problem. The missed call
                  matters, but the real loss happens in the next minute when another practice
                  picks up and books the appointment.
                </p>
                <p>
                  Boltcall gives med spas a faster front door. The goal is simple: answer, capture
                  the key context, and move the caller to a booked consultation before the
                  opportunity leaks out.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">What the caller wants immediately</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Proof that a real practice answered.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A clear path for treatment consultations versus product or pricing questions.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confirmation that treatment interest, provider preference, and callback details were captured.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A next step that feels immediate instead of a callback that may or may not come.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                What Boltcall does for med spa answering
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                This is about protecting consultation revenue and reducing the chaos around
                intake, not just sounding modern.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {CAPABILITIES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Med spa answering service vs. missed-call cleanup
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Practices usually do not lose new clients because they were second-best at
                treatment. They lose them because another spa picked up the phone first.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-blue-700">
                      Boltcall
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-gray-700">
                      Typical fallback
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, index) => (
                    <tr key={row[0]} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="border-b border-gray-100 px-4 py-4 font-medium text-gray-900">
                        {row[0]}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-gray-700">{row[1]}</td>
                      <td className="border-b border-gray-100 px-4 py-4 text-gray-600">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  Built to support the med spa cluster too
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  This page works as the money-page hub for med spa answering-service terms. The
                  aesthetic blogs reinforce it with narrower use cases like AI receptionist for
                  med spas, rebooking flows, and consultation intake.
                </p>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  The `/industries/` base keeps one clean family of vertical buyer pages while
                  blog content stays under `/blog/`.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {RELATED_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-colors hover:border-blue-200 hover:bg-white"
                  >
                    <h3 className="text-base font-semibold text-gray-900">{link.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{link.description}</p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600">
                      Read next
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
            <div className="mt-8 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GODFATHER OFFER — Sabri steps 10-15: refuseless offer + bonus stack + scarcity + guarantee */}
        <section className="bg-blue-600 text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <Gift className="h-3.5 w-3.5" /> The 14-day guarantee
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Book 5 new consultations in 14 days — or refund the full month.
                </h2>
                <p className="mt-5 text-lg leading-8 text-blue-50">
                  We install Boltcall on your existing number in a single afternoon. If, 14 days
                  after go-live, fewer than 5 new consultations have booked directly through
                  Boltcall, we refund the entire month. No claim form, no fine print.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/book-a-call"
                    className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    Claim the 14-day guarantee
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    See pricing first
                  </Link>
                </div>
                <p className="mt-5 inline-flex items-center gap-2 text-sm text-blue-100">
                  <Shield className="h-4 w-4" /> 5 clinics onboarded per month. 2 spots left in the current window.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
                <h3 className="text-lg font-semibold">You also get, on the house:</h3>
                <ul className="mt-5 space-y-5">
                  {BONUSES.map((bonus) => (
                    <li key={bonus.title} className="rounded-xl bg-white/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-white">{bonus.title}</p>
                        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                          {bonus.value}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-blue-50">{bonus.body}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-blue-100">
                  Total bundled value: <span className="font-semibold text-white">$1,700</span>.
                  Included at zero extra cost this window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PS — Sabri step 17: TL;DR + cost of doing nothing */}
        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-2xl border-l-4 border-blue-600 bg-blue-50/60 p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                P.S. — Read this if you skimmed
              </p>
              <p className="mt-4 text-base leading-8 text-gray-800">
                Every week you wait, roughly 20 to 30 med spa consult calls hit your line after 5pm
                and go to voicemail. Industry data puts that at $32,400 in direct consult revenue
                and $259,200 in three-year LTV per year. Boltcall installs in an afternoon, covers
                you inside 60 seconds, and refunds the month if you don't book 5 new consultations
                in 14 days. The math either works or you get your money back. There is no third
                outcome.
              </p>
            </div>
          </div>
        </section>

        <FinalCTA
          headline="Want consultation calls answered before they book somewhere else?"
          description="See how Boltcall helps med spas capture new-client demand, clean up intake, and book more treatments without adding front-desk headcount."
          buttonText="See Boltcall pricing"
          buttonHref="/pricing"
        />
      </main>
      <Footer />
    </div>
  );
}
