import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  MessageSquare,
  Phone,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

const HERO_POINTS = [
  'Convert the intake call before the caller reaches the next firm on the search results.',
  'Screen for case type, jurisdiction, and conflict basics on the first touch.',
  'Cover after-hours, court time, and depositions without missing a live prospect.',
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
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                Industry Page
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Legal answering service that captures the retainer before the caller tries the next firm.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Boltcall helps law firms answer faster, screen new matters, capture the case details
                that matter, and move callers toward a booked consultation before they call the next
                firm on the search results.
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
