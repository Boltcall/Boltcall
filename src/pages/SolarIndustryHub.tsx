import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Phone, Calendar, Shield, Brain, Bell, CheckCircle, XCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';
import AnswerBlock from '../components/seo/AnswerBlock';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

const updateMetaDescription = (desc: string) => {
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', desc);
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true },
};

const STATS = [
  { value: '78%', label: 'of solar buyers go with the first company that responds' },
  { value: '381%', label: 'conversion lift from a 10-second response vs. 30 minutes' },
  { value: '<11s', label: 'Boltcall average lead response time, 24/7' },
  { value: '$4,500', label: 'average CAC — too expensive to lose leads to slow follow-up' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Lead comes in',
    body: 'Form fill, inbound call, or web chat — Boltcall captures it the moment it arrives, day or night.',
  },
  {
    step: '02',
    title: 'AI responds in <11 seconds',
    body: 'Our AI knows solar — financing, incentives, MCS, OFGEM, federal tax credits, EPC ratings. It qualifies and books on the spot.',
  },
  {
    step: '03',
    title: 'You show up to a booked site survey',
    body: 'No chasing, no voicemails. Your calendar fills while your crew is on the roof.',
  },
];

const FEATURES = [
  {
    icon: Phone,
    title: '24/7 Voice AI',
    body: 'Answers every inbound call instantly. Handles objections, qualifies homeowners, and books site surveys — even at 2am.',
  },
  {
    icon: Clock,
    title: '11-Second Web Lead Response',
    body: 'The moment a form is submitted, your lead gets a personalised SMS + AI call before your competitor\'s phone rings once.',
  },
  {
    icon: Calendar,
    title: 'Site Survey Scheduling',
    body: 'Direct-to-calendar booking via Cal.com. No back-and-forth. Lead books, you get a notification.',
  },
  {
    icon: Brain,
    title: 'Solar Knowledge Base',
    body: 'Pre-loaded with solar-specific knowledge: finance options, panel efficiency, ROI timelines, grid connection, and more.',
  },
  {
    icon: Shield,
    title: 'Lead Qualification Engine',
    body: 'Filters out tire-kickers automatically. Asks about roof type, ownership, energy bill, and timeline before booking.',
  },
  {
    icon: Bell,
    title: 'No-Show Reminders',
    body: 'Automated SMS + voice reminders at 24h and 2h before the site survey. Fewer no-shows, more closed deals.',
  },
];

const COMPARISON = [
  {
    feature: 'Response time',
    boltcall: '<11 seconds',
    sharedLeads: '4–24+ hours',
    inHouseSDR: '15–60 minutes',
    genericAI: 'Varies',
  },
  {
    feature: 'Available 24/7',
    boltcall: true,
    sharedLeads: false,
    inHouseSDR: false,
    genericAI: true,
  },
  {
    feature: 'Exclusive to you',
    boltcall: true,
    sharedLeads: false,
    inHouseSDR: true,
    genericAI: true,
  },
  {
    feature: 'Solar-specific knowledge',
    boltcall: true,
    sharedLeads: false,
    inHouseSDR: 'Depends',
    genericAI: false,
  },
  {
    feature: 'Auto site survey booking',
    boltcall: true,
    sharedLeads: false,
    inHouseSDR: false,
    genericAI: false,
  },
  {
    feature: 'Lead qualification',
    boltcall: true,
    sharedLeads: false,
    inHouseSDR: true,
    genericAI: 'Basic',
  },
  {
    feature: 'Monthly cost',
    boltcall: 'From $179/mo',
    sharedLeads: '$150–$300/lead',
    inHouseSDR: '$4,000–$6,000/mo',
    genericAI: '$200–$500/mo',
  },
];

const RESOURCES = [
  {
    title: 'The Solar 11-Second Playbook',
    desc: 'Step-by-step guide to capturing every solar lead in under 11 seconds.',
    href: '/solar-speed-playbook',
    cta: 'Download Free',
  },
  {
    title: 'Solar AI Revenue Calculator',
    desc: 'Enter your monthly leads and see exactly how much revenue you\'re losing to slow follow-up.',
    href: '/tools/solar-profit-calculator',
    cta: 'Calculate Now',
  },
  {
    title: '2026 Solar Benchmark Report',
    desc: 'We audited 500 solar installers\' response times. See where you rank.',
    href: '/solar-benchmark',
    cta: 'View Report',
  },
  {
    title: 'Solar AI Receptionist FAQ',
    desc: 'Everything solar installers ask about switching to an AI receptionist.',
    href: '/faq/ai-receptionist-solar-installer',
    cta: 'Read FAQ',
  },
  {
    title: 'Speed-to-Lead Science',
    desc: 'The data behind the 11-second response — why every minute costs you money.',
    href: '/blog/speed-to-lead',
    cta: 'Read Article',
  },
  {
    title: 'Solar Quote Generator',
    desc: 'Generate instant solar quotes to keep prospects engaged while you follow up.',
    href: '/tools/solar-quote-generator',
    cta: 'Try It Free',
  },
];

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) return <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <XCircle className="w-5 h-5 text-gray-300 mx-auto" />;
  return <span className="text-sm text-gray-700">{value}</span>;
}

const SolarIndustryHub = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How can AI help solar installers win more leads?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI responds to every solar lead in under 11 seconds, 24/7. Since 78% of solar jobs go to the first installer to respond, an AI receptionist that answers every inquiry instantly — including after hours and weekends — directly increases close rates and booked site surveys.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the average lead response time in the solar industry?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The average solar company takes 47 minutes to respond to a new lead. Top performers respond within 5 minutes and close at 3x the rate of slow responders. Boltcall\'s AI answers every solar inquiry in under 11 seconds.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Boltcall work for solar companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Boltcall is purpose-built for local service businesses including solar installers. It answers inbound calls and web leads instantly, qualifies homeowners, books site survey appointments, and sends follow-up texts automatically — without any staff involvement.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'AI Receptionist for Solar Installers | Boltcall',
      url: 'https://boltcall.org/solar',
      description: 'Boltcall answers every solar lead in under 11 seconds, 24/7. Qualifies homeowners, books site surveys, and handles objections automatically for solar companies doing 20–60 jobs/month.',
      dateModified: '2026-05-24',
    },
  ]);

  useEffect(() => {
    document.title = 'AI Receptionist for Solar Installers: 11-Second Lead Response | Boltcall';
    updateMetaDescription(
      'Boltcall answers every solar lead in under 11 seconds — 24/7. Qualifies homeowners, books site surveys, handles objections. Built specifically for solar installers doing 20–60 jobs/month.'
    );
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Header />
      <main>

        {/* Hero */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <motion.div {...fadeIn}>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 mb-6">
                  Built for Solar Installers
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-[#0B1220] mb-6 leading-tight">
                  Your reps are on rooftops.<br />
                  Your leads are calling competitors.
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl">
                  78% of solar buyers go with the first company that responds. Boltcall answers every lead in <strong>under 11 seconds</strong> — qualifies them, books the site survey, and sends reminders. You close. We handle everything before that.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="/solar-speed-playbook"
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-8 py-4 shadow-[4px_4px_0px_0px_#000] border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 text-base"
                  >
                    Get the Solar Playbook <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                  <a
                    href="/pricing"
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg px-8 py-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 text-base"
                  >
                    See Pricing
                  </a>
                </div>
              </motion.div>

              {/* Direct-answer block — AIO/AI Mode citation chunk (May 2026 update response) */}
              <div className="mt-10">
                <AnswerBlock
                  query="What is an AI receptionist for solar installers"
                  definition="An AI receptionist for solar installers is a speed-to-lead phone and SMS system that answers every inbound homeowner inquiry in under 11 seconds, qualifies the lead on home ownership, roof condition, and monthly electric bill, and books a site survey directly into the rep's calendar — 24/7, without the rep stopping a rooftop install to pick up the phone."
                  stat="78% of solar buyers go with the first company that responds, and a 10-second response converts 381% better than a 30-minute callback; Boltcall delivers that response automatically for $549–$897/month with no per-lead fees."
                  outcome="Solar companies doing 20–60 jobs/month typically recover the subscription cost from a single recovered $15,000–$45,000 install in the first 14 days."
                  cta="See the full Solar Speed Playbook below."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="py-12 bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.value}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeIn}>
                <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-6">
                  The solar lead window is 5 minutes or less
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  A homeowner fills out a form. They\'ve just compared 3 providers on EnergySage. They\'re waiting to see who calls first. That window closes in minutes — not hours.
                </p>
                <p className="text-gray-600 mb-6">
                  The industry average response time is <strong>3–6 hours</strong>. By then, your prospect has already booked a site survey with whoever picked up first. That\'s $8,000–$25,000 in revenue, gone.
                </p>
                <p className="text-gray-600">
                  Boltcall responds in under 11 seconds — every time, including nights, weekends, and bank holidays.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-2xl border border-gray-200 p-8"
              >
                <h3 className="text-base font-semibold text-gray-500 mb-6 uppercase tracking-wide">Lead response time comparison</h3>
                {[
                  { label: 'Industry average', time: '3–6 hours', pct: 95, color: 'bg-red-400' },
                  { label: 'In-house SDR', time: '15–60 min', pct: 60, color: 'bg-yellow-400' },
                  { label: 'Boltcall', time: '<11 seconds', pct: 4, color: 'bg-blue-600' },
                ].map((row) => (
                  <div key={row.label} className="mb-5">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{row.label}</span>
                      <span className="text-gray-500">{row.time}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`${row.color} h-3 rounded-full`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-4">Source: Harvard Business Review, InsideSales.com, Boltcall internal data</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                How the 11-Second Response works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From lead to booked site survey — fully automated, no human required.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
                >
                  <div className="text-4xl font-bold text-blue-100 mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold text-[#0B1220] mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                Everything a solar installer needs to never miss a lead
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Not a generic AI receptionist. Built specifically for solar — the objections, the jargon, the booking flow.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-blue-600" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#0B1220] mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ROI Math */}
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeIn}>
                <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-6">
                  The math is straightforward
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  A solar installer doing 30 jobs/month with a $10,000 average job value gets roughly 150 inbound leads. If 40% of those are lost to slow response, that\'s 60 leads — $600,000 in potential revenue — slipping away every month.
                </p>
                <p className="text-gray-600 mb-8">
                  Recovering even 20% of those with an 11-second response is $120,000/month in additional revenue. Boltcall costs from $179/month.
                </p>
                <a
                  href="/tools/solar-profit-calculator"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 shadow-[4px_4px_0px_0px_#000] border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                >
                  Calculate your number <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="bg-blue-600 px-6 py-4">
                  <h3 className="text-white font-semibold">Solar installer — 30 jobs/month</h3>
                </div>
                <div className="p-6">
                  {[
                    { label: 'Monthly inbound leads', value: '150' },
                    { label: 'Leads lost to slow response (40%)', value: '60' },
                    { label: 'Average job value', value: '$10,000' },
                    { label: 'Revenue lost monthly', value: '$600,000', highlight: true },
                    { label: 'Recovered at 20% with Boltcall', value: '+$120,000', green: true },
                    { label: 'Boltcall cost', value: 'From $179/mo' },
                  ].map((row) => (
                    <div key={row.label} className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-0 ${row.highlight ? 'text-red-500 font-semibold' : ''} ${row.green ? 'text-emerald-600 font-semibold' : ''}`}>
                      <span className={`text-sm ${row.highlight || row.green ? 'font-semibold' : 'text-gray-600'}`}>{row.label}</span>
                      <span className="font-semibold text-sm">{row.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Mid-content CTA */}
        <FinalCTA {...BLOG_CTA} />

        {/* Comparison table */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                Boltcall vs. the alternatives
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Shared lead vendors sell the same lead to 5 of your competitors. In-house SDRs sleep. Generic AI doesn\'t know solar.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="overflow-x-auto"
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-500">Feature</th>
                    <th className="py-4 px-4 text-center">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-600 text-white">Boltcall</span>
                    </th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-gray-500">Shared Lead Vendors</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-gray-500">In-House SDR</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-gray-500">Generic AI</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-4 px-4 text-sm font-medium text-gray-700">{row.feature}</td>
                      <td className="py-4 px-4 text-center font-semibold text-blue-600 text-sm">
                        <ComparisonCell value={row.boltcall} />
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500 text-sm">
                        <ComparisonCell value={row.sharedLeads} />
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500 text-sm">
                        <ComparisonCell value={row.inHouseSDR} />
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500 text-sm">
                        <ComparisonCell value={row.genericAI} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </section>

        {/* Resources hub */}
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                Solar speed-to-lead resources
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Free tools, guides, and data for solar installers who want to respond faster and close more.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {RESOURCES.map((resource, i) => (
                <motion.a
                  key={resource.title}
                  href={resource.href}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300 flex flex-col"
                >
                  <h3 className="text-lg font-semibold text-[#0B1220] mb-2">{resource.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 flex-1">{resource.desc}</p>
                  <span className="inline-flex items-center text-blue-600 text-sm font-medium">
                    {resource.cta} <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* More Solar Resources — internal linking hub */}
        <section className="py-16 lg:py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeIn} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-[#0B1220] mb-4">
                More Solar Resources
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Deep-dives, calculators, and buyer guides built for solar installers responding to leads.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Solar Deep-Dives */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Solar Deep-Dives
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/solar-benchmark" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Speed-to-Lead Benchmark
                    </Link>
                  </li>
                  <li>
                    <Link to="/solar-benchmark-2026" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      2026 Solar Speed Benchmark Report
                    </Link>
                  </li>
                  <li>
                    <Link to="/solar-speed-playbook" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Speed-to-Lead Playbook
                    </Link>
                  </li>
                  <li>
                    <Link to="/solar-speed-score" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Speed Score Quiz
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Solar Calculators */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Solar Calculators
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/tools/solar-profit-calculator" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Profit Calculator
                    </Link>
                  </li>
                  <li>
                    <Link to="/tools/solar-quote-generator" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Quote Generator
                    </Link>
                  </li>
                  <li>
                    <Link to="/tools/solar-sales-closer" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Solar Sales Closer
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Buyer Guides & Scorecards */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Buyer Guides & Scorecards
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      AI Receptionist Buyer&apos;s Guide
                    </Link>
                  </li>
                  <li>
                    <Link to="/lead-response-scorecard" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Lead Response Scorecard
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-revenue-audit" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      AI Revenue Audit
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pillar + Comparisons + What's Next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  The Speed-to-Lead Method
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/speed-to-lead" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Speed-to-Lead Guide
                    </Link>
                  </li>
                  <li>
                    <Link to="/speed-to-lead/statistics" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Speed-to-Lead Statistics
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Compare Boltcall
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/comparisons" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      All Comparisons
                    </Link>
                  </li>
                  <li>
                    <Link to="/compare/boltcall-vs-gohighlevel" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Boltcall vs GoHighLevel
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  What&apos;s next
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/pricing" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Pricing & Plans
                    </Link>
                  </li>
                  <li>
                    <Link to="/book-a-call" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      Book a Call
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <FinalCTA {...BLOG_CTA} />

      </main>
      <Footer />
    </div>
  );
};

export default SolarIndustryHub;
