import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  MessageSquare,
  Mic,
  Phone,
  PhoneMissed,
  ShieldCheck,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { PRACTICE_AREAS } from '../data/practiceAreas';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { updateMetaDescription } from '../lib/utils';
import { createServiceSchema } from '../lib/schema';

const PAGE_URL = 'https://boltcall.org/industries/lawyer-answering-service';

const TRUST_CHIPS = [
  { icon: Mic, text: 'Says it is an AI and that the call is recorded' },
  { icon: Ban, text: 'Never gives legal advice' },
  { icon: Globe, text: 'English and Spanish' },
];

// Illustrative sample only. Labeled as such on the page.
const SAMPLE_SUMMARY = [
  ['Matter', 'Personal injury, car accident'],
  ['Urgency', 'Standard'],
  ['Incident date', 'Last Tuesday'],
  ['Other parties', 'Other driver, insurer (for your conflict check)'],
  ['Insurer contact', 'Spoke to adjuster, signed nothing'],
  ['Consultation', 'Phone, Thursday 10:30 am'],
];

const FIRST_MINUTES = [
  {
    title: 'It answers',
    body: 'The call is picked up in seconds, at 2pm or 2am. Missed calls get a text back. Web forms get a reply.',
    icon: Phone,
  },
  {
    title: 'It discloses and listens',
    body: 'It says it is an AI assistant and that the call is recorded, then asks for the names involved first so you can run a conflict check.',
    icon: Mic,
  },
  {
    title: 'It triages',
    body: 'An arrest, a custody emergency, or a deadline within days is flagged urgent and your team is alerted right away.',
    icon: AlertTriangle,
  },
  {
    title: 'It books and hands off',
    body: 'Qualified callers get a consultation on your calendar. You get a summary by email, so whoever picks it up has the context.',
    icon: CalendarCheck2,
  },
];

const CHANNELS = [
  { title: 'Live calls', body: 'Answered 24/7, including when everyone is in court or a deposition.', icon: Phone, href: '/features/ai-receptionist' },
  { title: 'Missed calls', body: 'A text goes out right after the missed call, so the caller is not left hanging.', icon: PhoneMissed, href: '/features/ai-receptionist' },
  { title: 'Web forms and ad leads', body: 'A reply goes to the form submitter within seconds, before another firm gets there.', icon: FileText, href: '/features/instant-form-reply' },
  { title: 'Texts and website chat', body: 'Two-way text and a chat widget that screen the matter and offer a consultation.', icon: MessageSquare, href: '/features/sms-booking-assistant' },
];

const HARD_LIMITS = [
  'Opens every call by saying it is an AI assistant and that the call is recorded. That cannot be turned off.',
  'Never gives legal advice, and never says whether someone has a case, what it is worth, or how long it will take.',
  'Never quotes fees or promises a free consultation unless you have told it to.',
  'Never says your firm handles a type of matter unless you have listed it. Otherwise it says an attorney will review.',
  'Before the call ends, says that the call does not make the caller a client of the firm.',
  'Never promises confidentiality or privilege. It says what the caller shares goes to the firm\'s team.',
  'Asks for the names of the other people and companies first, so you can run a conflict check.',
  'Existing clients and opposing parties: it takes a name, number, and message, and shares nothing about your clients.',
];

const COMPARISON_ROWS = [
  ['Response to a new inquiry', 'Within seconds, 24/7', 'Whenever someone checks it', 'Depends on staffing and hold time'],
  ['Intake questions', 'Matter type, key dates, names for conflict checks', 'A message, if the caller leaves one', 'Often a general message script'],
  ['Urgent matters', 'Flagged and alerted right away', 'Waits in the queue', 'Depends on the script'],
  ['Attorney interruptions', 'Handled before anyone is pulled out of client work', 'None, but the lead is lost', 'Calls may be passed through to you'],
  ['Cost shape', 'Flat monthly plan', 'Free', 'Often per call or per minute'],
];

const SETUP_STEPS = [
  { n: '1', title: 'Tell it about your firm', body: 'Practice areas, hours, who gets urgent alerts, and anything it should never promise.' },
  { n: '2', title: 'Point your number at it', body: 'Forward your existing number, or get a new local one in the app.' },
  { n: '3', title: 'Connect a calendar', body: 'Google Calendar or Cal.com, so it can book consultations. Setup takes about 5 minutes.' },
];

const FAQS = [
  {
    question: 'What is a legal answering service?',
    answer:
      'A legal answering service answers inbound calls to a law firm, captures the matter details, and moves the caller toward a consultation or an intake handoff. Boltcall does this with AI, within seconds, around the clock.',
  },
  {
    question: 'Why do law firms need fast answering?',
    answer:
      'Most prospective clients call more than one firm. The firm that responds first gets the first real conversation. A callback the next morning often arrives after the caller has already spoken to someone else.',
  },
  {
    question: 'Does Boltcall give legal advice?',
    answer:
      'No. Boltcall handles intake only. It collects details and books a consultation. It does not assess a case, predict outcomes, quote fees on its own, or say the caller is a client.',
  },
  {
    question: 'Does the caller know they are talking to an AI?',
    answer:
      'Yes. Every call opens by saying the caller is speaking with an AI assistant and that the call is recorded. Recording laws vary by state, so check your own obligations, but the disclosure is always made.',
  },
  {
    question: 'What happens when a caller needs help right now?',
    answer:
      'If someone is in immediate danger it tells them to call 911. An arrest, a custody emergency, a court date within 48 hours, or an immigration enforcement situation is flagged urgent and your team is alerted. You can also set rules to transfer the call to a person.',
  },
  {
    question: 'What if we do not handle that type of case?',
    answer:
      'It only says the firm handles a practice area if you listed it. For anything else it takes the details and says an attorney will review and let the caller know whether the firm can help.',
  },
  {
    question: 'Does it work with Clio, MyCase, or Filevine?',
    answer:
      'Not natively yet. Boltcall books into Google Calendar and Cal.com, and it can send new matters to other tools through Zapier, Make, or webhooks.',
  },
  {
    question: 'How is it priced?',
    answer:
      'Boltcall is a flat monthly subscription, starting at $549 per month. There are no per-case fees and no percentage of your fees. See the pricing page for the full plans.',
  },
];

const RELATED_LINKS = [
  {
    title: 'Lawyer intake calculator',
    href: '/tools/lawyer-intake-calculator',
    description: 'Put your own numbers in and see what slow follow-up costs your firm.',
  },
  {
    title: 'Speed to lead for law firms',
    href: '/blog/speed-to-lead-for-law-firms',
    description: 'Why first-response time drives who signs the retainer.',
  },
  {
    title: 'AI receptionist for law firms',
    href: '/blog/ai-receptionist-for-law-firms',
    description: 'How AI phone answering maps to legal intake and consultation booking.',
  },
  {
    title: 'Security for law firms',
    href: '/law-firm-security',
    description: 'How Boltcall handles client information, recordings, and subprocessors.',
  },
];

export default function LawyerAnsweringServicePage() {
  const { hash } = useLocation();

  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Lawyer Answering Service | Boltcall',
      url: PAGE_URL,
      description:
        'AI legal intake that answers every new inquiry in seconds, screens the matter, flags urgent cases, and books the consultation, 24/7.',
      dateModified: '2026-10-01',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org/' },
        { '@type': 'ListItem', position: 2, name: 'Lawyer Answering Service', item: PAGE_URL },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
    createServiceSchema({
      name: 'Lawyer Answering Service | Boltcall',
      description:
        'AI legal intake for law firms: answers every new inquiry in seconds, screens the matter, flags urgent cases, and books consultations.',
      url: '/industries/lawyer-answering-service',
    }),
  ]);

  useEffect(() => {
    document.title = 'Lawyer Answering Service: Answer Every Inquiry First | Boltcall';
    updateMetaDescription(
      'AI legal intake that answers every new inquiry in seconds, screens personal injury, family, criminal, immigration, and estate matters, flags urgent cases, and books the consultation. 24/7.'
    );
  }, []);

  // Practice-area links from the homepage land on #id; scroll once the page has rendered.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* HERO */}
        <section className="border-b border-gray-100 bg-gradient-to-b from-blue-50 via-white to-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-32">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Speed-to-lead for law firms
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                The first firm to call back signs the case.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
                Boltcall answers every new inquiry in seconds, day or night, screens the matter, and
                books the consultation. Your intake team starts the morning with a summary, not a
                voicemail.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/book-a-call"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_#000] transition-colors hover:bg-blue-700"
                >
                  Book a call
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="/#live-demo"
                  className="inline-flex items-center justify-center rounded-full border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-900"
                >
                  Hear it handle a live call
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-2">
                {TRUST_CHIPS.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    <Icon className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* What the team receives */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">New inquiry summary</p>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                  Sample data
                </span>
              </div>
              <dl className="mt-5 divide-y divide-gray-100 text-sm">
                {SAMPLE_SUMMARY.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-5 text-gray-500">
                An illustration of the email your team receives after an intake call. It is not a real
                client.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <AnswerBlock
              query="What is a legal answering service"
              definition="A legal answering service answers inbound calls to a law firm, captures the matter details, and moves the caller toward a consultation or intake handoff."
              stat="Boltcall does this with AI within seconds, 24/7: it discloses that it is an AI and that the call is recorded, screens the matter type and key dates, collects names for conflict checks, and flags urgent matters."
              outcome="That means fewer inquiries lost to voicemail and more booked consultations from the demand you already pay for."
              cta="It handles intake only and never gives legal advice."
            />
          </div>
        </section>

        {/* WHY SPEED */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why the first callback wins
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
                <p>
                  Think about the last time you needed a professional in a hurry. You did not call
                  one. You called three, and you hired the one who picked up and made the next step
                  clear.
                </p>
                <p>
                  Your prospective clients do the same thing. They are dealing with an accident, an
                  arrest, a custody fight, or a deadline. They start dialing the top results, and the
                  firm that treats them like a real matter in the first few minutes gets the
                  conversation.
                </p>
                <p>
                  The call that comes in at 8pm on a Friday does not wait until Monday. Boltcall is a
                  faster front door: answer, screen the matter, and book the consultation while the
                  caller is still choosing.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900">What a caller needs right away</h3>
              <ul className="mt-5 space-y-4 text-sm text-gray-700">
                {[
                  'Someone who answers.',
                  'A clear path for an urgent matter versus a general question.',
                  'Confirmation that their details and callback number were captured.',
                  'A next step that is real, not a callback that may or may not come.',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FIRST MINUTES */}
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                What happens in the first minutes
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                The same four steps on every inquiry, in the order a careful intake coordinator would
                take them.
              </p>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {FIRST_MINUTES.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{step.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* PRACTICE AREAS */}
        <section id="practice-areas" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Intake that fits your practice area
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                A custody emergency, an arrest, and a will update need different questions. Boltcall
                asks the right ones for each, flags what is urgent, books the consultation, and never
                gives legal advice. It only says your firm handles a practice area if you listed it.
              </p>
            </div>

            <div className="mt-10 space-y-6">
              {PRACTICE_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <article
                    key={area.id}
                    id={area.id}
                    className="scroll-mt-24 grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-8"
                  >
                    <div>
                      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <h3 className="text-xl font-semibold text-gray-900">{area.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-gray-600">{area.situation}</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          Flagged as urgent
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                          {area.urgent.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          What it asks
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                          {area.intake.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Every practice area also gets the conflict-check names, a consultation booking, and the
              limits below.
            </p>
          </div>
        </section>

        {/* HARD LIMITS */}
        <section className="bg-gray-900 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Built for lawyers to sign off on
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                The limits are in the script, not in a footnote.
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-300">
                You stay responsible for your own professional obligations, including your state bar's
                rules on AI and call recording. These are the limits the intake agent follows on every
                call.
              </p>
              <Link
                to="/law-firm-security"
                className="mt-6 inline-flex items-center text-sm font-semibold text-blue-300 hover:text-white"
              >
                Read the security page
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {HARD_LIMITS.map((line) => (
                <li key={line} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-gray-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CHANNELS */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Every way a client reaches you
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                One setup covers the phone, missed calls, forms, and text.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CHANNELS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{item.body}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Boltcall, voicemail, and a live answering service
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Firms rarely lose a new matter because they were second best at the law. They lose it
                because someone else picked up the phone first.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-gray-700">
                      &nbsp;
                    </th>
                    <th scope="col" className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-blue-700">
                      Boltcall
                    </th>
                    <th scope="col" className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-gray-700">
                      Voicemail
                    </th>
                    <th scope="col" className="border-b border-gray-200 px-4 py-4 text-left font-semibold text-gray-700">
                      Live answering service
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, index) => (
                    <tr key={row[0]} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <th scope="row" className="border-b border-gray-100 px-4 py-4 text-left font-medium text-gray-900">
                        {row[0]}
                      </th>
                      <td className="border-b border-gray-100 px-4 py-4 text-gray-900">{row[1]}</td>
                      <td className="border-b border-gray-100 px-4 py-4 text-gray-600">{row[2]}</td>
                      <td className="border-b border-gray-100 px-4 py-4 text-gray-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Comparing a specific vendor?{' '}
              <Link to="/compare/boltcall-vs-smith-ai" className="font-medium text-blue-600 hover:text-blue-700">
                Boltcall vs Smith.ai
              </Link>{' '}
              or{' '}
              <Link to="/comparisons" className="font-medium text-blue-600 hover:text-blue-700">
                all comparisons
              </Link>
              .
            </p>
          </div>
        </section>

        {/* SETUP */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Live in about 5 minutes</h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                You do not need to change your website or your phone provider.
              </p>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {SETUP_STEPS.map((step) => (
                <li key={step.n} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-gray-500">
              Case-management tools: Boltcall can send new matters to Clio, MyCase, or Filevine through Zapier,
              Make, or webhooks. There is no native connection yet.
            </p>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="bg-blue-600 text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                One flat monthly price. No per-case fees.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-50">
                Plans start at $549 per month. Boltcall never takes a percentage of your fees or a
                bonus per signed case. If one extra matter worth $2,500 signs because you answered
                first, that covers more than four months of Starter. Use your own case value on the
                pricing page.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                See plans and the break-even math
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="text-center text-xs text-blue-100 sm:text-left lg:text-center">
                30-day money-back guarantee.{' '}
                <Link to="/terms-of-service#guarantee" className="underline hover:text-white">
                  See terms
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
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

        {/* RELATED */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Keep reading</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <FinalCTA
          headline="Answer the next inquiry first."
          description="Set up your AI intake assistant in about 5 minutes. Setup is free."
          buttonText="Start the free setup"
          buttonHref="/signup?redirect=/setup"
        />
      </main>
      <Footer />
    </div>
  );
}
