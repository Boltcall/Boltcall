import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Phone,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

const HERO_POINTS = [
  'Pick up urgent plumbing calls before the next plumber does.',
  'Separate emergencies from routine service without wasting dispatch time.',
  'Capture address, callback details, and job context while intent is hot.',
];

const CAPABILITIES = [
  {
    title: '24/7 call coverage',
    body: 'Boltcall answers plumbing calls when the office is closed, the team is in the field, or volume spikes during busy periods.',
    icon: Phone,
  },
  {
    title: 'Emergency triage',
    body: 'Burst pipes, active leaks, and sewer backups should not follow the same path as a routine faucet issue. Plumbing intake needs routing rules.',
    icon: Waves,
  },
  {
    title: 'Booking and callback capture',
    body: 'Collect the issue, address, urgency, and callback information so the next step is clear instead of buried in voicemail.',
    icon: CalendarCheck2,
  },
  {
    title: 'Immediate text follow-up',
    body: 'Use SMS to confirm the next step and keep the caller engaged while the team handles dispatch or callback.',
    icon: MessageSquare,
  },
];

const COMPARISON_ROWS = [
  ['Response time', 'Immediate answer path', 'Often voicemail or later callback'],
  ['After-hours coverage', 'Consistent nights and weekends', 'Usually weak or manual'],
  ['Plumbing-specific intake', 'Urgency, address, issue type, water status', 'Often generic message taking'],
  ['Field-team interruption', 'Less need to stop active jobs', 'Owner or tech gets interrupted more often'],
  ['Lead capture quality', 'Standardized and visible', 'Often inconsistent or incomplete'],
];

const FAQS = [
  {
    question: 'What is a plumbing answering service?',
    answer:
      'A plumbing answering service is a system that answers inbound plumbing calls, captures the key service details, and routes the customer to the right next step. The best version protects urgent calls from turning into lost jobs.',
  },
  {
    question: 'Why do plumbing companies need fast answering?',
    answer:
      'Because plumbing demand is often urgent. A homeowner dealing with a leak, clog, or no hot water usually keeps calling until someone answers. Slow callbacks often mean the customer already booked elsewhere.',
  },
  {
    question: 'Can Boltcall handle after-hours plumbing calls?',
    answer:
      'Yes. Boltcall is built for speed-to-lead and after-hours coverage, so plumbing companies can capture emergency and weekend demand instead of sending those calls to voicemail.',
  },
  {
    question: 'Is a plumbing answering service only for large shops?',
    answer:
      'No. Smaller plumbing companies often benefit the most because each missed emergency call hurts more and the owner is often balancing field work with intake at the same time.',
  },
];

const RELATED_LINKS = [
  {
    title: '24/7 Plumbing Answering Service',
    href: '/blog/24-7-plumbing-answering-service',
    description: 'Go deeper on what round-the-clock plumbing call coverage looks like in practice.',
  },
  {
    title: 'AI Receptionist for Plumbers',
    href: '/blog/ai-receptionist-for-plumbers',
    description: 'See how AI receptionist language maps to plumbing lead capture and booking.',
  },
  {
    title: 'AI Phone Answering for Plumbers',
    href: '/blog/ai-phone-answering-plumbers',
    description: 'Understand how a phone-answering workflow changes the first minute of response.',
  },
];

export default function PlumbingAnsweringServicePage() {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Plumbing Answering Service | Boltcall',
      url: 'https://boltcall.org/industries/plumbing-answering-service',
      description:
        'Plumbing answering service for companies that need faster response, better emergency triage, and more booked jobs.',
      dateModified: '2026-06-20',
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
          item: 'https://boltcall.org/industries/plumbing-answering-service',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Plumbing Answering Service',
          item: 'https://boltcall.org/industries/plumbing-answering-service',
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
    document.title = 'Plumbing Answering Service That Captures More Jobs | Boltcall';
    updateMetaDescription(
      'Plumbing answering service for businesses that need faster lead response, after-hours coverage, and better emergency-call capture without relying on voicemail.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                Industry Page
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Plumbing answering service that helps you win the urgent call first.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Boltcall helps plumbing companies answer faster, triage emergency demand, capture the
                right job details, and move callers toward booking before they hire the next plumber on
                the list.
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
              query="What is a plumbing answering service"
              definition="A plumbing answering service is a lead-response system that answers plumbing calls, captures the service details, and routes the customer toward booking or emergency escalation."
              stat="For plumbing companies, the best version does more than take messages: it handles after-hours demand, separates urgent leaks from routine work, and protects the first response while the caller is still searching."
              outcome="That means fewer lost emergency jobs, cleaner intake, and more booked work from the calls you already paid to generate."
              cta="Boltcall is built for that speed-to-lead workflow."
            />
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why plumbing calls disappear so fast
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  Plumbing buyers are usually not collecting information for later. They are standing in
                  a bathroom with a leak, dealing with no hot water, or trying to stop damage before it
                  gets worse. If no one answers, they keep dialing.
                </p>
                <p>
                  That is why plumbing answering is really a speed problem. The missed call matters, but
                  the real loss happens in the next minute when the caller reaches another business that
                  sounds available and ready to act.
                </p>
                <p>
                  Boltcall gives plumbing companies a faster front door. The goal is simple: answer,
                  capture the key context, and move the caller to the next step before the opportunity
                  leaks out.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">What the caller wants immediately</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Proof that a real business answered.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A clear path for emergency plumbing versus routine service.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confidence that the address, issue, and callback number were captured correctly.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A next step that feels immediate instead of “leave a message and wait.”</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                What Boltcall does for plumbing answering
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                This is about protecting urgent jobs and reducing the chaos around intake, not just
                sounding modern.
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
                Plumbing answering service vs. missed-call cleanup
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Plumbing companies usually do not lose urgent jobs because they were second-best at the
                repair. They lose them because another business picked up first.
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
                  Built to support the plumbing cluster too
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  This page should work as the money-page hub for plumbing answering-service terms.
                  The plumbing blogs then reinforce it with narrower use cases like 24/7 coverage,
                  AI phone answering, and plumber-specific intake.
                </p>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  That is the reason to keep the `/industries/` base. It gives us one clean family of
                  vertical buyer pages while blog content stays under `/blog/`.
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

        <FinalCTA
          headline="Want your plumbing calls answered before they leak away?"
          description="See how Boltcall helps plumbing companies capture urgent demand, clean up intake, and book more jobs without waiting for callbacks."
          buttonText="See Boltcall pricing"
          buttonHref="/pricing"
        />
      </main>
      <Footer />
    </div>
  );
}
