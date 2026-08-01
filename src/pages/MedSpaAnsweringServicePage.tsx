import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

const HERO_POINTS = [
  'Book the consultation before the caller Googles the next med spa in town.',
  'Capture treatment interest, budget signal, and preferred provider on the first touch.',
  'Cover treatment blocks, evenings, and weekends without adding front-desk headcount.',
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
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                Industry Page
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Med spa answering service that books the consultation before the next spa does.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Boltcall helps med spas answer faster, route treatment inquiries, capture cleaner
                consultation intake, and move callers toward a booked appointment before they Google
                the next med spa in town.
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
