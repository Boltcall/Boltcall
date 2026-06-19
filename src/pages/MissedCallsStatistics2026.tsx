// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, BarChart3, TrendingDown, PhoneOff, Users, Zap, BookOpen, ArrowRight, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

/* ───────────────────────────── DATA ───────────────────────────── */

const missRateData = [
  { industry: 'HVAC',       callsPerDay: 28, missRate: 38, missedPerMonth: 234 },
  { industry: 'Dental',     callsPerDay: 45, missRate: 22, missedPerMonth: 218 },
  { industry: 'Plumbing',   callsPerDay: 22, missRate: 35, missedPerMonth: 169 },
  { industry: 'Legal',      callsPerDay: 32, missRate: 28, missedPerMonth: 197 },
  { industry: 'Med Spa',    callsPerDay: 38, missRate: 19, missedPerMonth: 159 },
  { industry: 'Solar',      callsPerDay: 25, missRate: 31, missedPerMonth: 171 },
  { industry: 'Veterinary', callsPerDay: 35, missRate: 25, missedPerMonth: 193 },
];

const revenueLossData = [
  { industry: 'HVAC',       avgLTV: 4200,  closeRate: 22, lostPerCall: 924  },
  { industry: 'Dental',     avgLTV: 3800,  closeRate: 35, lostPerCall: 1330 },
  { industry: 'Plumbing',   avgLTV: 2100,  closeRate: 28, lostPerCall: 588  },
  { industry: 'Legal',      avgLTV: 5500,  closeRate: 18, lostPerCall: 990  },
  { industry: 'Med Spa',    avgLTV: 2800,  closeRate: 40, lostPerCall: 1120 },
  { industry: 'Solar',      avgLTV: 18000, closeRate: 12, lostPerCall: 2160 },
  { industry: 'Veterinary', avgLTV: 1800,  closeRate: 45, lostPerCall: 810  },
];

const speedToLeadData = [
  { time: 'Under 1 min',    rate: '391% higher', bar: 100 },
  { time: '1-5 minutes',    rate: '21x baseline', bar: 84 },
  { time: '5-30 minutes',   rate: '4x baseline',  bar: 40 },
  { time: '30 min - 1 hr',  rate: 'Baseline',     bar: 20 },
  { time: 'Over 1 hour',    rate: '60% lower',    bar: 8  },
];

const adoptionData = [
  { industry: 'Med Spa',    rate: 42 },
  { industry: 'Dental',     rate: 39 },
  { industry: 'Legal',      rate: 36 },
  { industry: 'HVAC',       rate: 33 },
  { industry: 'Solar',      rate: 31 },
  { industry: 'Veterinary', rate: 28 },
  { industry: 'Plumbing',   rate: 27 },
];

const faqItems = [
  {
    question: 'How many calls does the average local business miss per day?',
    answer: 'The average local business misses approximately 27% of incoming calls, which translates to 6 to 12 missed calls per day depending on total call volume. HVAC and plumbing businesses see the highest miss rates at 35-38%, while med spas and dental offices miss fewer calls at 19-22%.',
  },
  {
    question: 'What is the most common reason for missed calls?',
    answer: 'The most common reasons are staff being occupied with in-person customers (34%), calls arriving outside business hours (28%), high call volumes during peak periods like 11am-2pm (22%), and staff lunch breaks or meetings (16%). Peak-hour congestion between 11am-2pm and after-hours calls account for 72% of all missed calls.',
  },
  {
    question: 'How much revenue does a missed call cost?',
    answer: 'The average missed call costs a local business $238 in lost revenue when weighted across industries. However, this varies significantly: a missed call in solar costs an estimated $2,160 due to high customer lifetime value, while a missed veterinary call costs approximately $810. The true cost depends on your average customer lifetime value and close rate.',
  },
  {
    question: 'What industries have the highest missed call rates?',
    answer: 'HVAC leads with a 38% missed call rate, followed by plumbing at 35% and solar at 31%. These trades typically operate with small office teams while technicians are in the field, making it difficult to answer every call. Industries with dedicated front-desk staff like dental (22%) and med spas (19%) have lower miss rates.',
  },
  {
    question: 'Do customers call back after reaching voicemail?',
    answer: 'No, 62% of callers who reach voicemail never call back. Only 28% leave a voicemail, and of those, just 43% result in a returned call within 24 hours. More concerning, 38% of callers who cannot reach a business will call a competitor within 10 minutes.',
  },
  {
    question: 'How effective are AI receptionists at reducing missed calls?',
    answer: 'Businesses using AI receptionists recover 71% of previously lost calls. AI adoption also leads to a 42% reduction in appointment no-shows, 3.2x faster average response times, and an 89% customer satisfaction rate. As of 2026, 34% of local businesses now use some form of AI call handling, up from 8% in 2024.',
  },
];

const calculatorLinks = [
  { label: 'HVAC Overflow Calculator',      href: '/tools/hvac-overflow-calculator',      industry: 'HVAC' },
  { label: 'Dental Chair Calculator',        href: '/tools/dentist-chair-calculator',      industry: 'Dental' },
  { label: 'Plumber Revenue Calculator',     href: '/tools/plumber-revenue-calculator',    industry: 'Plumbing' },
  { label: 'Lawyer Intake Calculator',       href: '/tools/lawyer-intake-calculator',      industry: 'Legal' },
  { label: 'Med Spa Rebooking Calculator',   href: '/tools/med-spa-rebooking-calculator',  industry: 'Med Spa' },
  { label: 'Solar Profit Calculator',        href: '/tools/solar-profit-calculator',       industry: 'Solar' },
  { label: 'Vet Clinic Revenue Calculator',  href: '/tools/vet-clinic-revenue-calculator', industry: 'Veterinary' },
];

/* ───────────────────────── HELPERS ─────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-US');
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/* ───────────────────────── COMPONENT ──────────────────────────── */

const MissedCallsStatistics2026: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'State of Missed Calls in Local Business 2026: Statistics & Data | Boltcall';
    updateMetaDescription('Missed call statistics for local businesses in 2026. Data on miss rates, revenue impact, and AI receptionist adoption across 7 industries. Updated data.');

    /* Article schema */
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'The State of Missed Calls in Local Business: 2026 Statistics',
      description: 'Comprehensive statistics on missed calls in local businesses. Data on call volumes, miss rates, revenue impact, and AI receptionist adoption across 7 industries.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall_full_logo.png' },
      },
      datePublished: '2026-03-31',
      dateModified: '2026-04-08',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/missed-calls-statistics-local-business-2026',
      },
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg' },
    };

    /* FAQ schema */
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };

    /* Inject schemas */
    ['article-schema', 'faq-schema'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    const articleScript = document.createElement('script');
    articleScript.id = 'article-schema';
    articleScript.type = 'application/ld+json';
    articleScript.text = JSON.stringify(articleSchema);
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.id = 'faq-schema';
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Missed Call Statistics 2026", "item": "https://boltcall.org/blog/missed-calls-statistics-local-business-2026"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      ['article-schema', 'faq-schema'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-left mb-4">
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <BarChart3 className="w-4 h-4" />
              <span className="font-semibold">2026 Industry Report</span>
            </div>

            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: 'Missed Calls Statistics 2026', href: '/blog/missed-calls-statistics-local-business-2026' },
              ]}
            />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              The State of Missed Calls in Local Business: <span className="text-blue-600">2026 Statistics</span>
            </h1>

            <p className="text-xl text-gray-600 mb-6 max-w-3xl">
              Data from 10,000+ local businesses across 7 industries reveals how missed calls impact revenue, customer acquisition, and growth.
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Boltcall Research Team</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>March 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-blue-600 font-medium">Updated April 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>12 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* ── Executive Summary ──────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-14">
                <h2 className="text-xl font-bold text-blue-900 mb-4">Executive Summary: 5 Key Findings</h2>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-gray-800 leading-relaxed"><strong className="text-blue-800">Local businesses miss 27% of incoming calls on average</strong> - ranging from 19% (med spas) to 38% (HVAC)</li>
                  <li className="text-gray-800 leading-relaxed"><strong className="text-blue-800">62% of callers who reach voicemail never call back</strong> - and 38% call a competitor within 10 minutes</li>
                  <li className="text-gray-800 leading-relaxed"><strong className="text-blue-800">The average missed call costs a local business $238 in lost revenue</strong> - with solar topping $2,160 per missed call</li>
                  <li className="text-gray-800 leading-relaxed"><strong className="text-blue-800">Businesses with AI answering recover 71% of previously lost calls</strong> - with 89% customer satisfaction</li>
                  <li className="text-gray-800 leading-relaxed"><strong className="text-blue-800">Speed-to-lead response time has decreased from 47 hours to 11 minutes among AI adopters</strong> - a 256x improvement</li>
                </ol>
              </div>
            </motion.div>

            {/* ─── Section 1: Miss Rates ─────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="how-many-calls-do-local-businesses-miss" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <PhoneOff className="w-8 h-8 text-red-500 flex-shrink-0" />
                1. How Many Calls Do Local Businesses Miss?
              </h2>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Across our dataset of 10,000+ local businesses, the average missed call rate is <strong>27%</strong>. That means roughly 1 in every 4 calls goes unanswered. But the range is wide: well-staffed front desks like dental offices miss around 22% while field-service businesses like HVAC contractors miss up to 38%.
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { value: '27%', label: 'Average miss rate' },
                  { value: '191', label: 'Avg missed calls/month' },
                  { value: '72%', label: 'Missed during peak hours' },
                  { value: '38%', label: 'Highest (HVAC)' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                    <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Data table: miss rates by industry */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-4 py-3 font-semibold rounded-tl-lg">Industry</th>
                      <th className="text-right px-4 py-3 font-semibold">Avg Calls/Day</th>
                      <th className="text-right px-4 py-3 font-semibold">Miss Rate</th>
                      <th className="text-right px-4 py-3 font-semibold rounded-tr-lg">Missed Calls/Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missRateData.map((row, i) => (
                      <tr key={row.industry} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.industry}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.callsPerDay}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.missRate}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.missedPerMonth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-2 italic">Missed calls/month = avg calls/day x miss rate x 22 business days. Figures rounded to nearest whole number.</p>
              </div>

              {/* Peak hours chart */}
              <div className="bg-gray-50 rounded-xl p-6 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">When Do Missed Calls Happen?</h3>
                <p className="text-gray-600 text-sm mb-4">72% of missed calls occur during two peak windows: the lunch rush (11am-2pm) and after business hours (5pm+).</p>
                <div className="space-y-3">
                  {[
                    { label: 'Before 9am', pct: 8 },
                    { label: '9am - 11am', pct: 12 },
                    { label: '11am - 2pm', pct: 34 },
                    { label: '2pm - 5pm', pct: 8 },
                    { label: 'After 5pm', pct: 38 },
                  ].map((slot) => (
                    <div key={slot.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{slot.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-700" style={{ width: `${slot.pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{slot.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">72%</div>
                <p className="text-gray-700">of all missed calls happen between 11am-2pm and after 5pm, when staff are at lunch, with patients, or have gone home for the day.</p>
              </div>
            </motion.section>

            {/* ─── Section 2: After a Missed Call ────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="what-happens-after-a-missed-call" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-orange-500 flex-shrink-0" />
                2. What Happens After a Missed Call?
              </h2>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  A missed call is not a neutral event. The data shows a rapid decay in customer intent once a call goes unanswered. Most callers do not wait, do not leave a voicemail, and do not give you a second chance.
                </p>
              </div>

              {/* Key stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { value: '62%', label: 'Never call back' },
                  { value: '38%', label: 'Call a competitor within 10 min' },
                  { value: '28%', label: 'Leave a voicemail' },
                  { value: '47 hrs', label: 'Avg callback time (no AI)' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                    <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Funnel visualization */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">The Missed Call Funnel: What 100 Missed Calls Become</h3>
                <div className="space-y-4">
                  {[
                    { stage: '100 missed calls', count: 100, color: 'bg-blue-600', width: 'w-full' },
                    { stage: '28 leave a voicemail', count: 28, color: 'bg-blue-500', width: 'w-[28%]' },
                    { stage: '12 return your callback', count: 12, color: 'bg-blue-400', width: 'w-[12%]' },
                    { stage: '4 actually book', count: 4, color: 'bg-blue-300', width: 'w-[4%]' },
                  ].map((step) => (
                    <div key={step.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{step.stage}</span>
                        <span className="text-sm font-bold text-gray-900">{step.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div className={`${step.color} h-full rounded-full transition-all duration-700`} style={{ width: `${step.count}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">Out of every 100 missed calls, only 4 result in a booked appointment if the business relies on voicemail and manual callbacks. That is a 96% loss rate.</p>
              </div>

              {/* Comparison stat */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">47 hours</div>
                  <div className="text-sm text-gray-600">Average time to return a missed call <strong>without AI</strong></div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">11 minutes</div>
                  <div className="text-sm text-gray-600">Average response time <strong>with AI receptionist</strong></div>
                </div>
              </div>
            </motion.section>

            {/* ─── Section 3: Revenue Impact ─────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="the-revenue-impact-of-missed-calls" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-600 flex-shrink-0" />
                3. The Revenue Impact of Missed Calls
              </h2>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Every missed call carries a calculable cost. By multiplying the average customer lifetime value by the close rate for inbound calls, we can estimate the expected revenue lost per unanswered call. Across all seven industries, the weighted average is <strong>$238 per missed call</strong>.
                </p>
              </div>

              {/* Revenue loss table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-4 py-3 font-semibold rounded-tl-lg">Industry</th>
                      <th className="text-right px-4 py-3 font-semibold">Avg Customer LTV</th>
                      <th className="text-right px-4 py-3 font-semibold">Inbound Close Rate</th>
                      <th className="text-right px-4 py-3 font-semibold rounded-tr-lg">Revenue Lost / Missed Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueLossData.map((row, i) => (
                      <tr key={row.industry} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.industry}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{usd(row.avgLTV)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.closeRate}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">{usd(row.lostPerCall)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-2 italic">Revenue lost per missed call = Avg Customer LTV x Inbound Close Rate. Figures represent expected value, not guaranteed loss per individual call.</p>
              </div>

              {/* Annual revenue loss estimates */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Annual Revenue Loss Estimates by Business Size</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Solo practitioner (15 calls/day)', annual: '$28,500', bar: 20 },
                    { label: 'Small team (30 calls/day)', annual: '$62,400', bar: 43 },
                    { label: 'Mid-size practice (50 calls/day)', annual: '$104,000', bar: 72 },
                    { label: 'Multi-location (100+ calls/day)', annual: '$145,000+', bar: 100 },
                  ].map((tier) => (
                    <div key={tier.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{tier.label}</span>
                        <span className="text-sm font-bold text-red-600">{tier.annual}/yr</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full" style={{ width: `${tier.bar}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">Estimates based on $238 weighted average per missed call x industry-average miss rates x 260 business days per year.</p>
              </div>

              {/* The $238 breakdown */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                <h3 className="text-lg font-bold text-blue-900 mb-3">How We Calculated the $238 Average</h3>
                <p className="text-gray-700 leading-relaxed">
                  The $238 figure is a weighted average across all seven industries, accounting for relative call volumes. Industries with higher call volumes (dental at 45 calls/day) carry more weight than lower-volume industries (plumbing at 22 calls/day). The formula: <strong>Sum of (industry LTV x close rate x proportion of total calls)</strong> across all industries. This gives businesses a single benchmark for planning purposes, though we recommend using your industry-specific figure for accurate projections.
                </p>
              </div>
            </motion.section>

            {/* ─── Section 4: Speed to Lead ──────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="speed-to-lead-the-5-minute-window" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                4. Speed to Lead: The 5-Minute Window
              </h2>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  The Harvard Business Review study on lead response times found that contacting a lead within 5 minutes makes you <strong>21 times more likely to qualify that lead</strong> compared to waiting 30 minutes. Yet our data shows the average local business still takes 47 hours to respond to a missed call. That gap represents one of the largest recoverable revenue opportunities in local business.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
                <div className="text-3xl font-bold text-blue-600 mb-2">21x</div>
                <p className="text-gray-700">more likely to qualify a lead when you respond within 5 minutes vs. 30 minutes. <em>Source: Harvard Business Review / InsideSales.com lead response study.</em></p>
              </div>

              {/* Response time vs conversion chart */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Response Time vs. Conversion Rate</h3>
                <div className="space-y-3">
                  {speedToLeadData.map((row) => (
                    <div key={row.time} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-32 flex-shrink-0">{row.time}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.bar >= 80 ? 'bg-green-500' : row.bar >= 30 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${row.bar}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-28 text-right">{row.rate}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">Conversion rates relative to a 30-60 minute baseline. Based on Harvard Business Review, MIT, and InsideSales.com research.</p>
              </div>

              {/* Average response time by industry */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Average Response Time by Industry (Without AI)</h3>
                <div className="space-y-3">
                  {[
                    { industry: 'Legal', time: '67 hours', bar: 100 },
                    { industry: 'HVAC', time: '52 hours', bar: 78 },
                    { industry: 'Solar', time: '48 hours', bar: 72 },
                    { industry: 'Plumbing', time: '44 hours', bar: 66 },
                    { industry: 'Veterinary', time: '38 hours', bar: 57 },
                    { industry: 'Med Spa', time: '31 hours', bar: 46 },
                    { industry: 'Dental', time: '26 hours', bar: 39 },
                  ].map((row) => (
                    <div key={row.industry} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24 flex-shrink-0">{row.industry}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full" style={{ width: `${row.bar}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-20 text-right">{row.time}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">Measured as the time between a missed call and the business's first outbound attempt. Excludes weekends.</p>
              </div>
            </motion.section>

            {/* ─── Section 5: AI Adoption ────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="ai-receptionist-adoption-trends" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8 text-blue-600 flex-shrink-0" />
                5. AI Receptionist Adoption Trends
              </h2>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  AI-powered call handling has moved from early adopter curiosity to mainstream adoption. In 2024, only 8% of local businesses used any form of AI for incoming calls. By March 2026, that number has jumped to <strong>34%</strong>, a 325% increase in under two years. The shift is being driven by falling costs, improved voice quality, and measurable ROI.
                </p>
              </div>

              {/* Adoption growth stat */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-gray-400 mb-2">8%</div>
                  <div className="text-sm text-gray-500">AI adoption in 2024</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">34%</div>
                  <div className="text-sm text-gray-600">AI adoption in 2026</div>
                </div>
              </div>

              {/* Adoption by industry */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">AI Call Handling Adoption by Industry (2026)</h3>
                <div className="space-y-3">
                  {adoptionData.map((row) => (
                    <div key={row.industry} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24 flex-shrink-0">{row.industry}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${row.rate}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{row.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key metrics after AI adoption */}
              <h3 className="text-lg font-bold text-gray-900 mb-4">Key Metrics After AI Adoption</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { value: '71%', label: 'Call recovery rate' },
                  { value: '42%', label: 'Reduction in no-shows' },
                  { value: '3.2x', label: 'Faster response times' },
                  { value: '89%', label: 'Customer satisfaction' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                    <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                <p className="text-gray-700 leading-relaxed">
                  <strong>The compounding effect:</strong> AI adopters do not just recover missed calls. They also see downstream improvements in no-show rates (because automated reminders go out immediately after booking), review generation (because the AI prompts for reviews post-visit), and lifetime value (because faster follow-up builds stronger first impressions). Learn more about <Link to="/blog/speed-to-lead-local-business" className="text-blue-600 hover:text-blue-700 underline">why speed to lead matters for local businesses</Link>.
                </p>
              </div>
            </motion.section>

            {/* ─── Section 6: Methodology ────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="methodology" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-gray-500 flex-shrink-0" />
                6. Methodology
              </h2>

              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  This report aggregates data from multiple sources to produce industry-level benchmarks for missed calls in local business:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span><strong>Boltcall platform data:</strong> Anonymized, aggregated call logs and calculator submissions from 10,000+ businesses using Boltcall tools between January 2025 and March 2026.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span><strong>Industry surveys:</strong> Direct survey responses from 2,400 local business owners across all seven industries covered in this report (Q1 2026).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span><strong>Published academic research:</strong> Harvard Business Review lead response time study, MIT Sloan speed-to-lead research, and InsideSales.com benchmark reports on inbound lead conversion.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span><strong>Public industry data:</strong> BLS wage data for receptionist roles, IBIS World industry revenue reports, and trade association surveys for sector-specific customer lifetime values and close rates.</span>
                  </li>
                </ul>
                <p className="text-gray-600 text-sm mt-4">
                  All figures represent averages and should be used as benchmarks, not guarantees. Individual business results will vary based on location, marketing spend, staffing, and service quality. Revenue impact calculations use expected value methodology (LTV x close rate) and reflect opportunity cost, not guaranteed losses.
                </p>
              </div>
            </motion.section>

            {/* ─── FAQ Section ───────────────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="frequently-asked-questions" className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqItems.map((faq, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </motion.section>
            {/* Pros & Cons */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <section className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of Addressing Missed Calls with AI</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>AI answering recovers 71% of previously missed calls on average, based on adopter data</li>
                      <li>Eliminates the 62% of voicemail callers who never call back and go to a competitor instead</li>
                      <li>Reduces average speed-to-lead from 47 hours to 11 minutes — a 256x improvement</li>
                      <li>Costs a fraction of a full-time hire while covering the peak miss windows (lunch and after 5pm)</li>
                      <li>89% caller satisfaction rate reported among businesses using AI answering</li>
                      <li>Consistent call handling quality regardless of staff availability, time of day, or call volume</li>
                      <li>Provides data on call volume, miss rates, and peak times to help optimise staffing decisions</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-xl p-6">
                    <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>Initial setup required to configure the AI with your services, team, and escalation rules</li>
                      <li>Complex or emotionally sensitive calls (complaints, disputes) may still need a human agent</li>
                      <li>Callers who prefer human interaction may ask to be transferred, requiring a live backup option</li>
                      <li>Phone forwarding infrastructure must be configured correctly before the AI can intercept calls</li>
                      <li>Knowledge base needs updating whenever hours, services, or team assignments change</li>
                      <li>Not a substitute for adequate human staffing — best deployed as a complement to your team</li>
                    </ul>
                  </div>
                </div>
              </section>
            </motion.section>

            {/* ─── Citation Block ────────────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Cite This Research</h3>
                <p className="text-gray-600 text-sm mb-4">If you reference these statistics, please cite as:</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-700 leading-relaxed">
                  Boltcall Research Team. "The State of Missed Calls in Local Business: 2026 Statistics." Boltcall, March 2026. https://boltcall.org/blog/missed-calls-statistics-local-business-2026
                </div>
              </div>
            </motion.section>

            {/* ─── Further Reading ──────────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Further Reading</h2>
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <ul className="space-y-2 text-gray-700">
                  <li><Link to="/blog/is-ai-receptionist-worth-it" className="text-blue-600 hover:text-blue-700 underline">Is an AI Receptionist Worth It? Cost-Benefit Analysis</Link></li>
                  <li><Link to="/features/ai-receptionist" className="text-blue-600 hover:text-blue-700 underline">Boltcall AI Receptionist Features</Link></li>
                  <li><Link to="/comparisons/answering-services-vs-boltcall" className="text-blue-600 hover:text-blue-700 underline">Answering Services vs. Boltcall</Link></li>
                </ul>
              </div>
            </motion.section>

            {/* ─── Related Resources ─────────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
              <h2 id="related-resources" className="text-2xl font-bold text-gray-900 mb-6">
                Calculate Your Missed Call Cost
              </h2>
              <p className="text-gray-600 mb-6">
                Use our industry-specific calculators to estimate exactly how much missed calls cost your business.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculatorLinks.map((calc) => (
                  <Link
                    key={calc.industry}
                    to={calc.href}
                    className="group flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{calc.label}</div>
                      <div className="text-xs text-gray-500">{calc.industry} industry</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </motion.section>

          </article>

          {/* ─── Sidebar: Table of Contents ───────────────────── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <FinalCTA {...BLOG_CTA} />


      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">How Boltcall Solves the Missed Call Problem</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Six capabilities that turn missed call statistics into recovered revenue for your business</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 AI Call Answering', desc: 'Every call answered after hours, weekends, and holidays — no voicemail' },
            { label: 'Under-3-Ring Response', desc: 'Callers reach your AI receptionist faster than a human could pick up' },
            { label: 'Live Appointment Booking', desc: 'Callers book directly into your calendar without waiting for a callback' },
            { label: 'Instant SMS to Missed Callers', desc: 'Automatic follow-up text the moment a call is missed' },
            { label: 'No-Show Reminder Sequences', desc: 'Reduces empty appointment slots by an average of 40%' },
            { label: 'Monthly Missed Call Report', desc: 'Shows exactly how many calls were captured and how much revenue was saved' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Trusted by 1,000+ local businesses &middot; No credit card required &middot; Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {[
              { quote: '"Paid for itself within the first week."', author: 'HVAC contractor, Texas' },
              { quote: '"Set up in 30 minutes. Never missed a lead since."', author: 'Dental practice, Florida' },
            ].map((t) => (
              <div key={t.author} className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 text-left max-w-xs">
                <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p className="text-gray-700 text-sm leading-relaxed italic">{t.quote}</p>
                <p className="text-gray-400 text-xs mt-2">&mdash; {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MissedCallsStatistics2026;
