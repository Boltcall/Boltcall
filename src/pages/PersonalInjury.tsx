import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, ChevronDown, Clock, Mic, PhoneMissed, Shield, Zap, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { updateMetaDescription } from '../lib/utils';
import { PRACTICE_AREAS } from '../data/practiceAreas';

const easeOutQuart: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: easeOutQuart } }),
};

const pi = PRACTICE_AREAS.find((a) => a.id === 'personal-injury')!;

const STEPS = [
  { icon: <PhoneMissed className="w-6 h-6" />, title: 'Answers in seconds', body: 'Every inbound call, missed call, and web form gets a response within seconds, day or night. The caller who just left the scene or the ER is not sent to voicemail.' },
  { icon: <Mic className="w-6 h-6" />, title: 'Discloses first', body: 'It opens by saying it is an AI assistant and that the call is recorded. It never promises confidentiality and never says the caller is a client.' },
  { icon: <FileText className="w-6 h-6" />, title: 'Takes a PI intake', body: 'Accident type and date, injuries in the caller\'s own words, police report and witnesses, and whether they have spoken to or signed anything with an insurer.' },
  { icon: <Shield className="w-6 h-6" />, title: 'Names for conflicts', body: 'It asks for the other driver, employer, business, or insurer up front, so you can run a conflict check before anyone details the matter.' },
  { icon: <AlertTriangle className="w-6 h-6" />, title: 'Flags what is urgent', body: 'A deadline coming up soon, or a caller pressed to sign something by an insurer, is flagged for the attorney right away.' },
  { icon: <Calendar className="w-6 h-6" />, title: 'Books the consultation', body: 'Qualified callers get a consultation on your calendar (Google Calendar or Cal.com). You get a summary by email.' },
];

const LIMITS = [
  'Never gives legal advice or says whether the caller has a case.',
  'Never predicts what a case is worth, how long it will take, or the outcome.',
  'Never quotes fees or says the firm works on contingency unless you have told it to.',
  'Never tells a caller they may have missed a deadline. It collects the date and the attorney assesses.',
];

const FAQS = [
  {
    q: 'Do I need to change my phone number or website?',
    a: 'No. Forward your existing number to Boltcall, or get a new local one in the app. Setup takes about 5 minutes.',
  },
  {
    q: 'Will the AI give legal advice?',
    a: 'Never. Boltcall handles intake only. It collects the details, flags urgent matters, and books a consultation. If a caller asks "do I have a case?", it says only the attorney can answer and takes their details.',
  },
  {
    q: 'Does the caller know it is an AI?',
    a: 'Yes. Every call opens by saying the caller is speaking with an AI assistant and that the call is recorded.',
  },
  {
    q: 'What happens when a lead calls after hours?',
    a: 'It answers within seconds, takes the intake, books a consultation if a calendar is connected, and alerts your team to anything urgent. Without a connected calendar it captures a callback request and emails you.',
  },
  {
    q: 'How does it connect to my tools?',
    a: 'It books into Google Calendar and Cal.com. It can send new matters to other tools, including case-management software, through Zapier, Make, or webhooks. There is no native Clio, MyCase, or Filevine connection yet.',
  },
  {
    q: 'Do you take a fee per signed case?',
    a: 'No. Boltcall is a flat monthly subscription. There are no per-case fees, bonuses, or percentages of your fees.',
  },
];

const PersonalInjury: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Intake for Personal Injury Law Firms | Boltcall';
    updateMetaDescription(
      'Boltcall answers every personal injury inquiry in seconds, takes the PI intake, flags urgent matters, and books the consultation. Flat monthly plans from $549. Never gives legal advice.'
    );

    const ldJson = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Boltcall AI Intake for Personal Injury Law Firms',
      provider: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      description: 'AI intake for personal injury law firms. Answers every inquiry in seconds, takes the PI intake, flags urgent matters, and books consultations.',
      offers: [
        { '@type': 'Offer', name: 'Starter', price: '549', priceCurrency: 'USD', url: 'https://boltcall.org/pricing' },
        { '@type': 'Offer', name: 'Pro', price: '897', priceCurrency: 'USD', url: 'https://boltcall.org/pricing' },
        { '@type': 'Offer', name: 'Ultimate', price: '4997', priceCurrency: 'USD', url: 'https://boltcall.org/pricing' },
      ],
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'pi-schema';
    s.text = JSON.stringify(ldJson);
    document.head.appendChild(s);
    return () => { document.getElementById('pi-schema')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 mb-6">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> For personal injury firms
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6"
          >
            The injured caller signs with the firm that{' '}
            <span className="text-blue-600">answers first.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
          >
            Boltcall answers every call, form, and text within seconds, takes the personal injury intake, and books the consultation on your calendar. It never gives legal advice.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/book-a-call"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 text-lg shadow-[4px_4px_0px_0px_#000] transition-colors duration-200"
            >
              <Calendar className="w-5 h-5" aria-hidden="true" />
              Book a call
            </Link>
            <a
              href="/#live-demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-300 hover:border-gray-900 text-gray-900 font-semibold px-8 py-4 text-lg transition-colors duration-200"
            >
              Hear a live intake call
            </a>
            <Link to="/tools/pi-sms-intake-agent" className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-4 font-semibold text-gray-900">Build your free SMS intake agent</Link>
          </motion.div>
        </div>
      </section>

      {/* THE SITUATION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center">
              Injured callers do not wait for Monday.
            </h2>
            <p className="text-gray-300 text-lg text-center max-w-2xl mx-auto">
              {pi.situation} The call that comes in at 8pm on a Friday gets answered by someone. The only question is whether it is you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for the PI intake call.</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Boltcall sits on top of your existing phone, website, and calendar. No new staff and no rebuild.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LIMITS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-3"
          >
            What it will not do
          </motion.h2>
          <p className="text-center text-gray-600 mb-8">These limits apply on every call.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {LIMITS.map((line) => (
              <li key={line} className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white p-4 text-sm text-gray-700">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-gray-600">
            See the full list on the{' '}
            <Link to="/industries/lawyer-answering-service#practice-areas" className="font-medium text-blue-600 hover:text-blue-700">
              law firm page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">The same plans as every firm.</h2>
            <p className="text-gray-600 text-lg mb-3">
              Boltcall is a flat monthly subscription that starts at $549. There are no per-case fees, no bonuses, and no percentage of your fees.
            </p>
            <p className="text-gray-600 mb-8">
              Every plan includes 24/7 AI call answering, consultation booking, and instant text follow-up. Compare Starter, Pro, and Ultimate on the pricing page.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 text-lg transition-colors duration-200"
            >
              See plans and pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-12"
          >
            Common questions
          </motion.h2>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div
                key={faq.q}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="border border-gray-200 bg-white rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`pi-faq-answer-${i}`}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === i && (
                  <div id={`pi-faq-answer-${i}`} className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Answer the next injured caller first.</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Book a short call and we will walk through how your current intake handles a new inquiry, then show what Boltcall would do instead.
            </p>
            <Link
              to="/book-a-call"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-full text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Zap className="w-5 h-5" aria-hidden="true" />
              Book a call
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PersonalInjury;
