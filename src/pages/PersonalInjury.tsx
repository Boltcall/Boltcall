import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Phone, Clock, Calendar, Shield, TrendingUp, Zap, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { updateMetaDescription } from '../lib/utils';

const easeOutQuart: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: easeOutQuart } }),
};

const TIERS = [
  {
    name: 'Lite',
    tagline: 'Start capturing leads today',
    price: 497,
    setup: 0,
    bonus: null,
    responseTime: '<60 seconds',
    intakeCap: '100 intakes/mo',
    highlight: false,
    features: [
      'AI answers every call, form, and chat 24/7',
      'Standard PI qualification script',
      'Cal.com calendar booking',
      '2-touch no-answer follow-up (SMS)',
      'Monthly performance report',
      'Email support',
    ],
    notIncluded: ['Custom intake scripts', 'Spanish-language AI', 'CRM integration', 'Ads management'],
    cta: 'Get started',
    ctaHref: '/book-a-call',
  },
  {
    name: 'Pro',
    tagline: 'Most popular for solo firms',
    price: 897,
    setup: 0,
    bonus: 200,
    responseTime: '<30 seconds',
    intakeCap: '500 intakes/mo',
    highlight: true,
    features: [
      'Everything in Lite',
      'Customizable qualification scripts',
      'Cal.com + Clio Grow booking',
      '4-touch no-answer follow-up (voice + SMS)',
      'Spanish-language AI',
      'Per-attorney dashboard',
      'Weekly performance report',
      'Priority chat support',
    ],
    notIncluded: ['Ads management', 'Dedicated account manager'],
    cta: 'Get started',
    ctaHref: '/book-a-call',
  },
  {
    name: 'Service',
    tagline: 'Done-for-you. We run everything.',
    price: 9997,
    setup: 9997,
    bonus: 1000,
    responseTime: '<11 seconds',
    intakeCap: 'Unlimited',
    highlight: false,
    features: [
      'Everything in Pro',
      'Fully custom intake scripts (per-attorney)',
      'Clio Grow + MyCase + Filevine + custom CRM',
      '6-touch follow-up + custom cadence',
      'Multi-location + custom dashboard',
      'Google + Meta Ads management (we run it)',
      'Full-funnel: Ads to booked consultation',
      'Weekly war room call + dedicated Slack channel',
      'Monthly QBR + custom reporting',
      'Dedicated account manager',
    ],
    notIncluded: [],
    cta: 'Book a call',
    ctaHref: '/book-a-call',
  },
];

const FAQS = [
  {
    q: 'Do I need to change my phone number or website?',
    a: 'No. Boltcall sits on top of your existing setup. We forward calls, embed on your site, and connect to your existing calendar. Nothing about your public presence changes.',
  },
  {
    q: 'Will the AI give legal advice?',
    a: 'Never. Boltcall qualifies and books. It opens with a disclaimer, asks intake questions (claim type, injury date, liability, conflicts), and transfers urgent calls to you. It does not advise.',
  },
  {
    q: 'What happens when a lead calls after hours?',
    a: 'The AI answers in under 60 seconds (Lite), 30 seconds (Pro), or 11 seconds (Service). It qualifies the lead, books a consultation, and sends you an SMS alert if the case is high-value.',
  },
  {
    q: 'Which CRMs do you integrate with?',
    a: 'Cal.com on all tiers. Clio Grow on Pro+. MyCase, Filevine, and custom CRMs on Service tier.',
  },
  {
    q: 'What does the per-signed-case bonus mean?',
    a: 'On Pro and Service tiers, Boltcall earns a bonus per case your firm signs from an intake we handled. This aligns our incentives with yours. No signed case, no bonus.',
  },
  {
    q: 'How long does setup take?',
    a: 'Lite and Pro are self-serve: 30 minutes to configure, live the same day. Service tier: we onboard you in 10 days with a dedicated setup call.',
  },
];

const PersonalInjury: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Intake for Personal Injury Law Firms | Boltcall';
    updateMetaDescription(
      'Boltcall answers every PI lead in under 11 seconds, qualifies them, and books signed-consultation appointments on your calendar. The fastest AI intake in personal injury law.'
    );

    const ldJson = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Boltcall AI Intake for Personal Injury Law Firms',
      provider: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      description: 'AI intake agent for personal injury law firms. Answers every lead in under 11 seconds, qualifies, and books signed-consultation appointments.',
      offers: [
        { '@type': 'Offer', name: 'Lite', price: '497', priceCurrency: 'USD', billingIncrement: 'monthly' },
        { '@type': 'Offer', name: 'Pro', price: '897', priceCurrency: 'USD', billingIncrement: 'monthly' },
        { '@type': 'Offer', name: 'Service', price: '9997', priceCurrency: 'USD', billingIncrement: 'monthly' },
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
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-white">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-block bg-blue-600 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
              Personal Injury Law Firms Only
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
          >
            The fastest AI intake<br className="hidden sm:block" /> in{' '}
            <span className="text-blue-600">personal injury law.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
          >
            We answer every call, form, and chat in under 11 seconds, 24/7. Qualify leads. Book signed-consultation appointments directly to your calendar. That is it.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/book-a-call"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors duration-200 shadow-lg shadow-blue-600/25"
            >
              <Calendar className="w-5 h-5" />
              Book a free audit call
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-blue-600 text-gray-700 hover:text-blue-600 font-semibold px-8 py-4 rounded-xl text-lg transition-colors duration-200"
            >
              See pricing
            </a>
          </motion.div>

          {/* Stat bar */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {[
              { stat: '78%', label: 'of PI leads go to the first firm to call back' },
              { stat: '<11s', label: 'average response time on Service tier' },
              { stat: '$30K', label: 'average PI case fee at risk per missed lead' },
            ].map((item, i) => (
              <motion.div
                key={item.stat}
                variants={fadeUp} initial="hidden" animate="show" custom={5 + i}
                className="bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-sm"
              >
                <div className="text-3xl font-bold text-blue-600 mb-1">{item.stat}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center">
              PI firms are losing cases to voicemail.
            </h2>
            <p className="text-gray-400 text-center text-lg mb-12 max-w-2xl mx-auto">
              The math is brutal. A 2-attorney firm handling 40 intakes per month, with a 30% slow-response leakage rate, loses this much before the phone rings a second time.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Monthly intakes', value: '40', sub: 'for a 2-attorney firm' },
                { label: 'Slow-response leakage', value: '30%', sub: 'industry benchmark' },
                { label: 'Average PI case fee', value: '$30K', sub: 'national average' },
                { label: 'Lost monthly revenue', value: '$126K', sub: 'to faster competitors', highlight: true },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-5 ${item.highlight ? 'bg-blue-600' : 'bg-gray-800'}`}>
                  <div className="text-3xl font-bold mb-1">{item.value}</div>
                  <div className={`text-sm font-semibold mb-1 ${item.highlight ? 'text-blue-100' : 'text-gray-300'}`}>{item.label}</div>
                  <div className={`text-xs ${item.highlight ? 'text-blue-200' : 'text-gray-500'}`}>{item.sub}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs text-center mt-4">
              Based on: 40 intakes x 30% leakage x $30K avg fee x 35% sign rate. Source: industry benchmarks.
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">One system. Every lead. Nothing missed.</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Boltcall sits on top of your existing phone, website, and calendar. No rebuilds. No new staff. Just faster response.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Phone className="w-6 h-6" />, title: 'Answers in seconds', body: 'Every inbound call, web form, and chat gets answered in under 60 seconds. Service tier: under 11 seconds. 24 hours a day, 7 days a week.' },
              { icon: <Shield className="w-6 h-6" />, title: 'PI-specific qualification', body: 'Claim type, injury severity, statute timing, conflicts check. The AI screens with PI intake logic, not a generic script.' },
              { icon: <Calendar className="w-6 h-6" />, title: 'Books the consultation', body: 'Qualified leads book directly to your calendar. Clio Grow, MyCase, Filevine, or Cal.com. No admin work.' },
              { icon: <Zap className="w-6 h-6" />, title: 'Routes urgent cases to you', body: 'High-value or time-sensitive leads trigger an immediate SMS alert to the partner. Never miss a $500K case.' },
              { icon: <Clock className="w-6 h-6" />, title: 'Follows up on no-answers', body: 'Leads who go to voicemail or don\'t book get a 4-touch follow-up cadence (voice + SMS) over 7 days.' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Tracks every intake', body: 'Per-attorney dashboard shows every lead, every call outcome, every signed case. Clear ROI in week one.' },
            ].map((item, i) => (
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

      {/* VS COMPETITORS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-10"
          >
            Why not Smith.ai or LEX Reception?
          </motion.h2>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="overflow-x-auto"
          >
            <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-6 py-4 font-semibold">Feature</th>
                  <th className="px-6 py-4 font-semibold text-blue-400">Boltcall</th>
                  <th className="px-6 py-4 font-semibold text-gray-300">Smith.ai</th>
                  <th className="px-6 py-4 font-semibold text-gray-300">LEX Reception</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Response time', '<11 seconds', 'Minutes (human escalation)', 'Minutes (all human)'],
                  ['PI-specialized', 'Yes', 'Generic', 'Generic'],
                  ['Pure AI (no humans)', 'Yes', 'No (hybrid)', 'No (all human)'],
                  ['Calendar booking', 'Yes', 'Partial', 'No'],
                  ['No-answer follow-up', 'Yes (6-touch)', 'No', 'No'],
                  ['Ads management', 'Yes (Service tier)', 'No', 'No'],
                  ['Price', '$497 to $9,997/mo', '$240 to $840/mo', '$425 to $775/mo'],
                  ['Per-case alignment', 'Yes (bonus model)', 'No', 'No'],
                ].map(([feature, boltcall, smith, lex]) => (
                  <tr key={feature} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{feature}</td>
                    <td className="px-6 py-4 text-center text-blue-600 font-semibold">{boltcall}</td>
                    <td className="px-6 py-4 text-center text-gray-500">{smith}</td>
                    <td className="px-6 py-4 text-center text-gray-500">{lex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple pricing. Two products.</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Self-serve SaaS if you want the tool. Done-for-you Service if you want us to run it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${
                  tier.highlight
                    ? 'border-blue-600 shadow-xl shadow-blue-600/10 bg-white scale-[1.02]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold tracking-wide uppercase px-4 py-1.5 rounded-full shadow">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{tier.name}</h3>
                  <p className="text-gray-500 text-sm mb-5">{tier.tagline}</p>

                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-bold text-gray-900">${tier.price.toLocaleString()}</span>
                    <span className="text-gray-500 mb-1.5">/mo</span>
                  </div>
                  {tier.setup > 0 && (
                    <p className="text-sm text-gray-500">${tier.setup.toLocaleString()} one-time setup fee</p>
                  )}
                  {tier.bonus && (
                    <p className="text-sm text-blue-600 font-medium mt-1">+ ${tier.bonus}/signed case</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">{tier.responseTime}</span>
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">{tier.intakeCap}</span>
                  </div>
                </div>

                <Link
                  to={tier.ctaHref}
                  className={`w-full text-center font-semibold py-3.5 px-6 rounded-xl mb-8 transition-colors duration-200 ${
                    tier.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25'
                      : 'border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-900'
                  }`}
                >
                  {tier.cta}
                </Link>

                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={4}
            className="text-center text-gray-500 text-sm mt-8"
          >
            All tiers: no contracts on Lite/Pro, 90-day minimum on Service. Payment via PayPal, invoiced monthly.
          </motion.p>
        </div>
      </section>

      {/* ROI MATH */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">The math for a Pro subscriber.</h2>
            <p className="text-gray-400 text-lg">A 2-attorney PI firm, 40 intakes/month, on the $897/mo Pro plan.</p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {[
              { label: 'Monthly cost', value: '$897', sub: 'subscription + ~$500 in case bonuses (avg 2.5 signed cases)', muted: true },
              { label: 'Intakes recovered', value: '+12/mo', sub: '30% of 40 intakes previously leaking to voicemail', muted: false },
              { label: 'New revenue', value: '+$126K/mo', sub: '12 recovered intakes x 35% sign rate x $30K avg case', highlight: true },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-6 text-center ${item.highlight ? 'bg-blue-600' : 'bg-gray-900 border border-gray-800'}`}>
                <div className="text-3xl font-bold mb-2">{item.value}</div>
                <div className={`font-semibold text-sm mb-2 ${item.highlight ? 'text-blue-100' : 'text-white'}`}>{item.label}</div>
                <div className={`text-xs leading-relaxed ${item.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{item.sub}</div>
              </div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}
            className="text-center text-gray-600 text-xs mt-6"
          >
            Results vary. These figures use published industry benchmarks for PI intake conversion rates.
          </motion.p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
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
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get a free intake audit for your firm.</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              20-minute call. We mystery-shop your current intake flow, show you the gap, and demo what Boltcall would have done instead. No pitch unless you ask.
            </p>
            <Link
              to="/book-a-call"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Calendar className="w-5 h-5" />
              Book your free audit call
            </Link>
            <p className="text-blue-200 text-sm mt-4">boltcall.org · noamyakoby6@gmail.com</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PersonalInjury;
