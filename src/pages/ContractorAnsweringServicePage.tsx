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
  Wrench,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';

const HERO_POINTS = [
  'Answer contractor leads before they call the next company.',
  'Capture the scope, urgency, and address while intent is still hot.',
  'Keep after-hours and overflow demand from turning into lost jobs.',
];

const CAPABILITIES = [
  {
    title: 'Immediate call pickup',
    body: 'Boltcall answers inbound contractor calls fast so the customer reaches your business before the opportunity leaks to a competitor.',
    icon: Phone,
  },
  {
    title: 'Trade-specific intake',
    body: 'Collect the property type, job category, urgency, address, and callback details so your team starts from context instead of guesswork.',
    icon: Wrench,
  },
  {
    title: 'Booking and callback routing',
    body: 'Move the lead toward an estimate, inspection, dispatch, or callback path instead of stopping at a generic message.',
    icon: CalendarCheck2,
  },
  {
    title: 'After-hours follow-up',
    body: 'Use immediate SMS and clear next steps to keep contractor leads warm when the office is closed or the crew is in the field.',
    icon: MessageSquare,
  },
];

const COMPARISON_ROWS = [
  ['Response path', 'Immediate answer and intake', 'Often voicemail or delayed callback'],
  ['Job qualification', 'Scope, urgency, address, and trade details', 'Usually generic message taking'],
  ['After-hours coverage', 'Consistent evenings and weekends', 'Often weak or manual'],
  ['Next-step routing', 'Estimate, callback, dispatch, or booking path', 'Usually only logs a message'],
  ['Lead protection', 'Built for speed-to-lead conversion', 'Reactive after the lead has cooled'],
];

const FAQS = [
  {
    question: 'What is a contractor answering service?',
    answer:
      'A contractor answering service is a system that answers inbound calls, captures the important project details, and routes the customer toward the right next step. The best version helps the business respond fast enough to win the job.',
  },
  {
    question: 'Why do contractors need faster answering?',
    answer:
      'Because buyers often contact multiple companies at once. If one contractor answers clearly and another sends the caller to voicemail, the first business usually gets the better chance to book the estimate or service visit.',
  },
  {
    question: 'Can Boltcall handle after-hours contractor calls?',
    answer:
      'Yes. Boltcall is built for speed-to-lead, after-hours response, and overflow demand so contractor businesses can capture leads when the team is off-site, on another job, or closed for the day.',
  },
  {
    question: 'Is this only for one trade?',
    answer:
      'No. It works across contractor categories where response speed matters, including roofing, HVAC, plumbing, remodeling, and other home-service or field-service businesses.',
  },
];

const RELATED_LINKS = [
  {
    title: 'AI Receptionist vs Answering Service for Contractors',
    href: '/blog/ai-receptionist-vs-answering-service-contractors',
    description: 'See how contractor buyers compare message taking versus real speed-to-lead workflows.',
  },
  {
    title: 'How Fast Should a Contractor Respond to a New Lead?',
    href: '/blog/how-fast-contractor-respond-new-lead',
    description: 'Go deeper on why contractor leads cool off when the response takes too long.',
  },
  {
    title: 'Roofer Answering Service',
    href: '/blog/roofer-answering-service',
    description: 'Explore a more specific example of contractor answering for weather-driven demand.',
  },
  {
    title: 'Best AI Receptionist for Home Services',
    href: '/blog/best-ai-receptionist-home-services',
    description: 'Compare contractor use cases with other high-speed home-service categories.',
  },
];

export default function ContractorAnsweringServicePage() {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Contractor Answering Service | Boltcall',
      url: 'https://boltcall.org/industries/contractor-answering-service',
      description:
        'Contractor answering service for businesses that need faster lead response, after-hours coverage, and more booked jobs.',
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
          item: 'https://boltcall.org/industries/contractor-answering-service',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Contractor Answering Service',
          item: 'https://boltcall.org/industries/contractor-answering-service',
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
    document.title = 'Contractor Answering Service That Wins More Jobs | Boltcall';
    updateMetaDescription(
      'Contractor answering service for businesses that need faster lead response, after-hours coverage, and better intake without relying on voicemail.'
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
                Contractor answering service that protects the first response.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Boltcall helps contractors answer faster, capture project details cleanly, handle
                after-hours demand, and move new leads toward the next step before they hire someone
                else.
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
              query="What is a contractor answering service"
              definition="A contractor answering service is a lead-response system that answers inbound contractor calls, captures the job details, and routes the caller toward the right next step."
              stat="For contractors, the best version does more than take a message: it protects the first response, handles after-hours demand, and helps the team qualify the lead while the buyer is still ready to act."
              outcome="That means fewer lost estimates, cleaner intake, and more jobs booked from the calls you already worked to generate."
              cta="Boltcall is built for that speed-to-lead workflow."
            />
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why contractor leads disappear so quickly
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  Contractor buyers usually have an active project, repair, inspection, or estimate in
                  motion. They are not looking for a long follow-up chain. They want to know that a real
                  business answered and can help them take the next step.
                </p>
                <p>
                  That is why contractor answering is really a speed-to-lead problem. The missed call is
                  only the first leak. The bigger loss happens when the buyer reaches a competitor that
                  sounds available, organized, and ready to move.
                </p>
                <p>
                  Boltcall gives contractors a faster front door. It helps the business answer, qualify,
                  and route leads without making every new inquiry depend on an owner or office manager
                  being free at the exact right moment.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">What the caller needs immediately</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confirmation that someone answered and understood the request.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A clear path for urgent jobs versus routine estimates.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Confidence that the address, scope, timing, and callback details were captured.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>A next step that feels real instead of a loose promise to call back later.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                What a good contractor answering workflow should do
              </h2>
              <p className="mt-6 text-base leading-8 text-gray-600">
                A contractor answering service should not behave like a passive answering desk. The job
                is to reduce the distance between inbound demand and a scheduled next step. That means
                faster intake, clearer qualification, and better follow-up when the team is in the field.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {CAPABILITIES.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-gray-900">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Contractor answering service vs basic message taking
              </h2>
              <p className="mt-6 text-base leading-8 text-gray-600">
                The useful comparison is not human versus AI. It is passive intake versus an active
                speed-to-lead system. If the workflow only creates another message to review later, the
                buyer still waits and the job is still at risk.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Boltcall</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Typical answering service</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMPARISON_ROWS.map(([category, boltcall, typical]) => (
                    <tr key={category}>
                      <td className="px-6 py-4 font-medium text-gray-900">{category}</td>
                      <td className="px-6 py-4 text-gray-600">{boltcall}</td>
                      <td className="px-6 py-4 text-gray-600">{typical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Who this fits best
              </h2>
              <p className="mt-6 text-base leading-8 text-gray-600">
                Contractor answering works best when each booked job is meaningful enough that slow
                response creates obvious revenue loss. That includes teams dealing with inbound calls,
                web leads, missed-call recovery, or after-hours project inquiries.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <ul className="space-y-4 text-sm leading-7 text-gray-700">
                <li className="flex gap-3">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Roofing and storm-response companies handling sudden call spikes.</span>
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Remodeling and general contractor teams juggling site visits and estimate requests.</span>
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Home-service operators where nights and weekends still generate serious demand.</span>
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  <span>Growing local businesses that need cleaner intake before they hire more admin staff.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex items-end justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Related contractor resources</h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  These pages go deeper on contractor-specific response speed, comparisons, and trade
                  examples.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {RELATED_LINKS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{item.description}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                    Read next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">FAQs</h2>
            <div className="mt-10 space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FinalCTA />
      <Footer />
    </div>
  );
}
