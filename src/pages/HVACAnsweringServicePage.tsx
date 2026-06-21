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
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

const HERO_POINTS = [
  'Answer every service call, even after hours.',
  'Qualify emergencies before your dispatcher calls back.',
  'Book jobs faster than the shop that waits until morning.',
];

const CAPABILITIES = [
  {
    title: 'Immediate call pickup',
    body: 'Boltcall answers HVAC calls in seconds so the homeowner talks to your business before they keep calling competitors.',
    icon: Phone,
  },
  {
    title: 'After-hours triage',
    body: 'Separate true no-cooling and no-heat emergencies from routine scheduling requests with rules built around your on-call process.',
    icon: Clock3,
  },
  {
    title: 'Booking and callback capture',
    body: 'Collect the address, callback number, issue type, and preferred time so your team starts with context instead of a vague voicemail.',
    icon: CalendarCheck2,
  },
  {
    title: 'SMS follow-up',
    body: 'Keep high-intent leads warm with immediate texts and follow-up prompts instead of hoping they answer a callback later.',
    icon: MessageSquare,
  },
];

const COMPARISON_ROWS = [
  ['Response time', 'Seconds', 'Often voicemail or delayed callback'],
  ['After-hours coverage', 'Built for nights and weekends', 'Usually weak or inconsistent'],
  ['HVAC-specific intake', 'Issue type, urgency, callback, address', 'Often generic message taking'],
  ['Booking workflow', 'Can push toward a real next step', 'Usually just logs a message'],
  ['Missed-call recovery', 'Built into the speed-to-lead flow', 'Reactive at best'],
];

const FAQS = [
  {
    question: 'What is an HVAC answering service?',
    answer:
      'An HVAC answering service is a system that answers inbound service calls, captures lead details, and routes the caller to the right next step. The best HVAC answering service does more than take messages: it helps you respond fast enough to win the job.',
  },
  {
    question: 'Why does response speed matter so much for HVAC companies?',
    answer:
      'Because HVAC calls are often urgent. When a homeowner has no cooling, no heat, or a weekend emergency, they usually keep calling until a business answers clearly and gives them a next step.',
  },
  {
    question: 'Can Boltcall handle after-hours HVAC calls?',
    answer:
      'Yes. Boltcall is designed for speed-to-lead and after-hours response, so HVAC companies can answer nights and weekends, capture the details, and route emergency versus routine calls differently.',
  },
  {
    question: 'Is this better than a basic answering service?',
    answer:
      'For most HVAC shops, yes. A basic answering service often stops at message taking. Boltcall is built to move the lead toward booking, qualification, or the right callback path instead of just logging a note.',
  },
];

const RELATED_LINKS = [
  {
    title: 'AI Receptionist for HVAC',
    href: '/blog/ai-receptionist-for-hvac-speed-to-lead',
    description: "See how Boltcall's speed-to-lead angle maps to this core HVAC buyer phrase.",
  },
  {
    title: 'After-Hours Answering Service for HVAC',
    href: '/blog/after-hours-answering-service-hvac',
    description: 'See how evening and weekend HVAC calls turn into booked revenue instead of voicemail.',
  },
  {
    title: 'HVAC Virtual Receptionist',
    href: '/blog/hvac-virtual-receptionist',
    description: 'Understand where virtual receptionist language overlaps with speed-to-lead positioning.',
  },
  {
    title: 'HVAC AI Lead Response',
    href: '/blog/hvac-ai-lead-response',
    description: 'Go deeper on what happens after a new HVAC lead comes in.',
  },
];

export default function HVACAnsweringServicePage() {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'HVAC Answering Service | Boltcall',
      url: 'https://boltcall.org/industries/hvac-answering-service',
      description:
        'HVAC answering service for companies that need faster lead response, after-hours call coverage, and more booked jobs.',
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
          item: 'https://boltcall.org/industries/hvac-answering-service',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'HVAC Answering Service',
          item: 'https://boltcall.org/industries/hvac-answering-service',
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
    document.title = 'HVAC Answering Service That Books Jobs Faster | Boltcall';
    updateMetaDescription(
      'HVAC answering service for contractors who need faster lead response, after-hours coverage, and more booked calls without losing emergency jobs to voicemail.'
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
                HVAC answering service that responds before the other shop does.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Boltcall helps HVAC companies answer new calls immediately, handle after-hours demand,
                capture service details, and push leads toward booking before they disappear.
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
              query="What is an HVAC answering service"
              definition="An HVAC answering service is a lead-response system that answers heating and cooling calls, captures the job details, and routes the caller toward booking or dispatch."
              stat="For HVAC companies, the best version does more than message taking: it handles after-hours demand, separates emergencies from routine service, and responds while the homeowner is still ready to buy."
              outcome="That means fewer missed opportunities, faster callbacks, and more jobs booked before a competitor answers first."
              cta="Boltcall is built for that speed-to-lead workflow."
            />
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why HVAC companies lose calls even when the phone rings
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  HVAC demand is urgent, seasonal, and often after-hours. When the AC goes out at
                  night or the furnace fails on a weekend, the caller is not browsing. They want the
                  first company that answers clearly and gives them a next step.
                </p>
                <p>
                  That is why generic voicemail, next-morning callbacks, and basic answering services
                  leak revenue. The missed call is not the real problem. The real problem is slow
                  response while the buyer is still searching.
                </p>
                <p>
                  Boltcall is designed around HVAC speed-to-lead. It helps you answer faster, capture
                  the important context, and move the caller toward booking or escalation instead of
                  dropping them into a queue.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">What the caller needs fast</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confirmation that someone actually answered.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A clear path for emergency versus routine service.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confidence that the issue, address, and callback details were captured correctly.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A next step they can trust instead of "leave a message."</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                What Boltcall does for HVAC answering
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                This page is not about sounding futuristic. It is about making sure an HVAC company
                responds while the lead is still live.
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
                HVAC answering service vs. "we'll call you back"
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                HVAC buyers usually do not reward the company with the nicest voicemail. They reward the
                company that answers first and sounds ready to help.
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
                  Built to support the HVAC cluster we already have
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  This page should act like the money-page hub for HVAC answering-service searches.
                  The supporting HVAC blogs then feed authority and internal links into it.
                </p>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  The clean split is: this page owns <strong>HVAC answering service</strong>, the AI
                  receptionist page owns the buyer-angle wording, the after-hours page owns off-hours
                  urgency, and the virtual receptionist page captures adjacent category language.
                </p>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  That is why the `/industries/` base makes sense here. It gives us one clean structure
                  for HVAC, plumbing, electrician, and contractor money pages while keeping blog content
                  under `/blog/`.
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
          headline="Want every HVAC lead answered while it still matters?"
          description="See how Boltcall helps HVAC companies answer faster, qualify better, and book more jobs without relying on next-morning callbacks."
          buttonText="See Boltcall pricing"
          buttonHref="/pricing"
        />
      </main>
      <Footer />
    </div>
  );
}
