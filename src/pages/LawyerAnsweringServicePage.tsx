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
  Scale,
  Shield,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

// Pain stats — sourced from law-firm halo file (natlawreview, ClaireAI, Talkroute, Telewizard, Voxx).
const PAIN_STATS = [
  { number: '72%', label: 'of legal consumers hire the next firm if you take over 24 hours', source: 'natlawreview' },
  { number: '35%', label: 'of law firm calls go unanswered during business hours', source: 'national responsiveness study' },
  { number: '61%', label: 'of inbound legal calls arrive outside business hours', source: 'ClaireAI 2026 benchmark' },
  { number: '85%', label: 'of legal callers who reach voicemail never call back', source: 'Telewizard' },
];

const HERO_POINTS = [
  'Every intake call answered in under 60 seconds — even at 2am after a serious accident.',
  'Case type, jurisdiction, incident date, and conflict basics captured on the first touch.',
  'SMS confirmation and calendar hold sent while the caller is still choosing which firm to hire.',
];

// Bonus stack for the Godfather offer.
const BONUSES = [
  {
    title: 'Free intake-script audit',
    body: 'A 20-minute call where we grade your current intake flow against 8 conversion benchmarks (case-type screening, jurisdiction check, urgency route, callback promise) and rewrite the weakest 3 lines.',
    value: '$500 value',
  },
  {
    title: 'After-hours & court-day rollover',
    body: 'We wire Boltcall to pick up whenever your line is busy, in court, or on a deposition — no extra config on your side, no missed cases when the paralegal is heads-down.',
    value: '$600 value',
  },
  {
    title: 'First 30 days of after-hours free',
    body: 'Evenings, weekends, and holidays covered for the first month with zero after-hours upcharge. A single PI matter answered at 2am recovers the whole first year.',
    value: '$400 value',
  },
];

const CAPABILITIES = [
  {
    title: 'Live intake screening',
    body: 'Boltcall answers new-matter calls in seconds and captures case type, incident date, opposing party basics, and jurisdiction so the intake team starts with real context.',
    icon: Phone,
  },
  {
    title: 'Urgent-matter routing',
    body: 'Injury, arrest, and time-sensitive filings should not sit in the same queue as a general consultation. Boltcall routes urgent callers to the right path.',
    icon: Scale,
  },
  {
    title: 'Consultation booking',
    body: 'Collect the preferred consultation window, contact method, and matter summary, then push the booking or callback into your practice-management workflow.',
    icon: CalendarCheck2,
  },
  {
    title: 'Immediate text follow-up',
    body: 'Confirm the next step over SMS while the caller is still weighing options, so cold callbacks stop being the default response.',
    icon: MessageSquare,
  },
];

const COMPARISON_ROWS = [
  ['Response time', 'Immediate answer path', 'Often voicemail during court or depositions'],
  ['After-hours coverage', 'Consistent evenings and weekends', 'Usually an answering-service transcript'],
  ['Legal-specific intake', 'Case type, jurisdiction, timeline, opposing party', 'Often generic message taking'],
  ['Attorney interruption', 'Less need to pull attorneys out of client work', 'Attorneys interrupted for calls they cannot yet accept'],
  ['Retainer conversion', 'Standardized intake and next step', 'Often inconsistent or lost between hands'],
];

const FAQS = [
  {
    question: 'What is a legal answering service?',
    answer:
      'A legal answering service is a system that answers inbound calls to a law firm, captures the case details, and routes the caller toward a consultation or intake next step. The best version protects new-matter calls from turning into missed retainers.',
  },
  {
    question: 'Why do law firms need fast answering?',
    answer:
      'Because most prospective clients do not call one firm. They call two or three and start moving forward with whichever attorney treats them like a real matter within the first few minutes. Slow callbacks usually mean the client already signed elsewhere.',
  },
  {
    question: 'Can Boltcall handle after-hours legal calls?',
    answer:
      'Yes. Boltcall covers evenings, weekends, and court-day windows so urgent matters and consultation requests never sit in voicemail. The caller gets a real conversation and a scheduled next step, not a message tone.',
  },
  {
    question: 'Does Boltcall give legal advice?',
    answer:
      'No. Boltcall handles intake, screening, and scheduling. It captures the case details and books a consultation. It never provides legal advice or represents the firm as counsel.',
  },
];

const RELATED_LINKS = [
  {
    title: 'AI Receptionist for Law Firms',
    href: '/blog/ai-receptionist-for-law-firms',
    description: 'How AI phone answering maps to legal intake, conflict screening, and consultation booking.',
  },
  {
    title: 'Speed to Lead for Law Firms',
    href: '/blog/speed-to-lead-for-law-firms',
    description: 'Why first-response time drives retainer conversion in legal practice.',
  },
  {
    title: 'Personal Injury Intake',
    href: '/personal-injury',
    description: 'A closer look at Boltcall for personal-injury firms where speed most directly affects case value.',
  },
];

export default function LawyerAnsweringServicePage() {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Lawyer Answering Service | Boltcall',
      url: 'https://boltcall.org/industries/lawyer-answering-service',
      description:
        'Legal answering service for firms that need faster intake response, cleaner case screening, and more booked consultations.',
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
          item: 'https://boltcall.org/industries/lawyer-answering-service',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Lawyer Answering Service',
          item: 'https://boltcall.org/industries/lawyer-answering-service',
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
    document.title = 'Lawyer Answering Service That Wins More Retainers | Boltcall';
    updateMetaDescription(
      'Legal answering service for law firms that need faster new-matter response, after-hours coverage, and cleaner intake without pulling attorneys out of client work.'
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
                <Clock className="h-3.5 w-3.5" /> Speed-to-lead for law firms
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Answer every intake call in 60 seconds — even at 2am — or refund the month.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                72% of legal prospects hire whoever gets back to them first. 61% of your intake
                calls arrive after hours. Boltcall picks up in under 60 seconds, screens case type
                and jurisdiction, books the consult, and texts a confirmation. If your qualified
                consult count doesn't rise inside 30 days, refund — you keep the recordings.
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
              query="What is a legal answering service"
              definition="A legal answering service is a lead-response system that answers inbound calls to a firm, captures the case details, and routes the caller toward a consultation or intake next step."
              stat="For law firms, the best version does more than take messages: it screens matter type, protects attorney focus during court and depositions, and captures new-matter intake while the caller is still deciding which firm to hire."
              outcome="That means more booked consultations, cleaner intake, and higher retainer conversion from the same marketing spend."
              cta="Boltcall is built for that speed-to-lead workflow."
            />
          </div>
        </section>

        {/* PAIN STATS — Sabri: flood light on the problem before the solution */}
        <section className="border-b border-gray-100 bg-gray-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                <TrendingDown className="h-3.5 w-3.5" /> The intake gap you already knew about
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Every unanswered PI call is $5,000–$50,000 walking to the firm that picked up.
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
              The intake gap isn't a marketing problem. Your ads work — the calls arrive. They just
              arrive at 8pm on a Friday, when your paralegal is home. By Monday, the prospect has
              signed with the firm that answered at 8:04pm.
            </p>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why new-matter calls disappear so fast
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  A prospective client rarely calls one firm. They are dealing with an accident,
                  an arrest, a dispute, or a filing deadline. They start dialing the top few
                  results and start moving forward with whichever attorney treats them like a real
                  matter within the first minutes.
                </p>
                <p>
                  That is why legal answering is really a speed problem. The missed call matters,
                  but the real loss is in the next few minutes when another firm picks up and
                  books the consultation.
                </p>
                <p>
                  Boltcall gives firms a faster front door. The goal is simple: answer, screen the
                  matter, and move the caller to a scheduled consultation before the retainer goes
                  to another attorney.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">What the caller wants immediately</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Proof that a real firm answered.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A clear path for urgent matters versus general consultation requests.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confirmation that case type, jurisdiction, and callback details were captured.</span>
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
                What Boltcall does for legal answering
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                This is about protecting retainer revenue and reducing the chaos around intake,
                not just sounding modern.
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
                Legal answering service vs. missed-call cleanup
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Firms usually do not lose new matters because they were second-best at the law.
                They lose them because another firm picked up the phone first.
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
                  Built to support the legal cluster too
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  This page works as the money-page hub for legal answering-service terms. The
                  legal blogs reinforce it with narrower use cases like AI receptionist for law
                  firms, personal-injury intake, and speed-to-lead in legal practice.
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

        {/* GODFATHER OFFER — Sabri steps 10-15 */}
        <section className="bg-blue-600 text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <Gift className="h-3.5 w-3.5" /> The 30-day guarantee
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Answer every intake call in 60 seconds for 30 days — or refund the month and keep the recordings.
                </h2>
                <p className="mt-5 text-lg leading-8 text-blue-50">
                  We install Boltcall on your existing intake line in an afternoon. If, at day 30,
                  your qualified consult count is not measurably higher than the baseline, we
                  refund the full month. You keep every call recording either way.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/book-a-call"
                    className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    Claim the 30-day guarantee
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
                  <Shield className="h-4 w-4" /> 5 firms onboarded per month. 2 spots left in the current window.
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
                  Total bundled value: <span className="font-semibold text-white">$1,500</span>.
                  Included at zero extra cost this window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PS — Sabri step 17 */}
        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-2xl border-l-4 border-blue-600 bg-blue-50/60 p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                P.S. — Read this if you skimmed
              </p>
              <p className="mt-4 text-base leading-8 text-gray-800">
                72% of legal prospects hire the first firm that calls them back. 61% of your intake
                calls arrive after hours. 85% of the ones that hit voicemail never call again. A
                single missed PI matter is $5,000 to $50,000. Boltcall installs in an afternoon,
                answers under 60 seconds, and refunds the month if your qualified consult count
                doesn't rise. Either the math works or you get your money back. There is no third
                outcome.
              </p>
            </div>
          </div>
        </section>

        <FinalCTA
          headline="Want new-matter calls answered before they sign with another firm?"
          description="See how Boltcall helps law firms capture retainer demand, screen intake, and book more consultations without pulling attorneys out of client work."
          buttonText="See Boltcall pricing"
          buttonHref="/pricing"
        />
      </main>
      <Footer />
    </div>
  );
}
