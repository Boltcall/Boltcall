// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Clock, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, BarChart3, Target } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';

const faqs = [
  {
    q: 'What is speed to lead?',
    a: 'Speed to lead is the elapsed time between a prospect submitting an inquiry and receiving their first response from your business. It is measured in minutes or hours. Research consistently shows that businesses responding within 5 minutes convert significantly more leads than those responding hours or days later.',
  },
  {
    q: 'How fast should a local business respond to a lead?',
    a: 'The target response time for local businesses is 5 minutes or less. MIT research found that responding within 5 minutes makes you 100x more likely to reach a lead than responding after 30 minutes. After 10 minutes, your odds of a meaningful conversation drop by 400%.',
  },
  {
    q: 'What happens if you respond to leads too slowly?',
    a: 'Slow response causes three compounding losses: the lead goes to a competitor who responded first, the potential lifetime value of that customer is lost, and your marketing spend on generating that lead is wasted. Studies show 78% of buyers choose the business that responds first.',
  },
  {
    q: 'What is a good speed-to-lead benchmark by industry?',
    a: 'Industry benchmarks vary: HVAC and plumbing emergency calls should be answered within 2 minutes. Dental new patient inquiries within 10 minutes. Legal consultations within 30 minutes. Med spa bookings within 5 minutes. The common thread: the first business to respond wins in every industry.',
  },
  {
    q: 'How does AI improve speed to lead for local businesses?',
    a: 'AI receptionists respond instantly, 24/7, without lunch breaks, sick days, or peak-season overflow. When a lead comes in at 11pm on a Sunday, an AI system responds in under 10 seconds while human staff are unavailable. This eliminates the #1 reason local businesses lose leads: nobody answered.',
  },
];

const industries = [
  { name: 'HVAC', avgResponse: '48–72 hours', target: '2 minutes', lossRate: '38%' },
  { name: 'Plumbing', avgResponse: '24–48 hours', target: '2 minutes', lossRate: '72%' },
  { name: 'Dental', avgResponse: '24–48 hours', target: '10 minutes', lossRate: '45%' },
  { name: 'Legal', avgResponse: '24–72 hours', target: '30 minutes', lossRate: '60%' },
  { name: 'Med Spa', avgResponse: '4–24 hours', target: '5 minutes', lossRate: '55%' },
  { name: 'Roofing', avgResponse: '24–72 hours', target: '5 minutes', lossRate: '42%' },
];

const SpeedToLeadPillar: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Speed to Lead Software & Statistics for Local Businesses | Boltcall';
    updateMetaDescription(
      'Speed to lead guide for local businesses: speed to lead software, response-time statistics, benchmarks by industry, and how to answer every lead instantly.'
    );

    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Speed to Lead Software and Statistics for Local Businesses',
        description:
          'Speed to lead guide for local businesses: speed to lead software, response-time statistics, benchmarks by industry, and how to answer every lead instantly.',
        author: { '@type': 'Organization', name: 'Boltcall' },
        publisher: {
          '@type': 'Organization',
          name: 'Boltcall',
          logo: { '@type': 'ImageObject', url: 'https://boltcall.org/logo.png' },
        },
        datePublished: '2026-04-29',
        dateModified: '2026-04-29',
        url: 'https://boltcall.org/speed-to-lead',
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://boltcall.org/speed-to-lead' },
        image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.png', width: 1200, height: 630 },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
          { '@type': 'ListItem', position: 2, name: 'Speed to Lead', item: 'https://boltcall.org/speed-to-lead' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Speed to Lead Software and Statistics for Local Businesses',
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.speakable-intro'] },
      },
    ];

    const scriptEls = schemas.map((schema) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = `stl-schema-${Math.random()}`;
      el.text = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });

    return () => scriptEls.forEach((el) => el.remove());
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Speed to Lead' },
            ]}
          />
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-5 mt-4">
            <Zap className="w-4 h-4 mr-1" />
            Speed to Lead Guide
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            <span className="text-blue-600">Speed to Lead:</span> Software, Statistics, and Benchmarks
          </h1>
          <p className="text-lg text-gray-600 mb-6 max-w-3xl">
            Response time is the single highest-impact variable in lead conversion. This guide explains speed to lead, the
            speed to lead statistics local operators should watch, and how speed to lead software helps service businesses
            answer before buyers call the next provider.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/speed-test"
              className="inline-flex items-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Test Your Response Speed <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              to="/speed-to-lead/statistics"
              className="inline-flex items-center px-5 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              View All Statistics
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Quick Answer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-12"
        >
          <h2 className="text-base font-semibold text-blue-900 mb-2">Quick Answer</h2>
          <p className="speakable-intro text-blue-800 text-lg leading-relaxed">
            Speed to lead is the time between a prospect's first inquiry and your first response. Businesses responding within 5 minutes are 9x more likely to convert than those responding after 30 minutes. 78% of buyers choose the first business that responds — making response time the single highest-impact variable in lead conversion for local businesses.
          </p>
        </motion.div>

        {/* Section 1 */}
        <motion.section
          id="what-is-speed-to-lead"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">What Is Speed to Lead?</h2>
          <p className="text-gray-700 text-lg mb-4 leading-relaxed">
            Speed to lead (also called lead response time) is the elapsed time between a prospect submitting an inquiry — a phone call, web form, SMS, or chat message — and your business making first contact with them.
          </p>
          <p className="text-gray-700 text-lg mb-4 leading-relaxed">
            It is measured in minutes or hours. For local service businesses competing in the same geographic area, it is the primary determinant of who wins the job.
          </p>
          <p className="text-gray-700 text-lg mb-4 leading-relaxed">
            A practical <Link to="/" className="text-blue-600 hover:underline">Boltcall speed-to-lead system</Link> protects
            that first response across live calls, missed calls, forms, texts, and after-hours demand so the business is not
            depending on a staff member to notice every lead in real time.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            When a homeowner's pipe bursts at 9pm, they call three plumbers. The one who answers first gets the job. When a new patient searches for a dentist and fills out a contact form, the practice that calls back first gets the booking.{' '}
            <strong>The first business to respond wins the job.</strong>
          </p>
        </motion.section>

        {/* Section 2 */}
        <motion.section
          id="five-minute-rule"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">The 5-Minute Rule: What the Data Shows</h2>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 mb-6 rounded-r-lg">
            <p className="text-yellow-800 font-medium">
              MIT research: Responding within 5 minutes makes you <strong>100x more likely to reach a lead</strong> than
              responding after 30 minutes. After 10 minutes, your odds of a meaningful conversation drop by 400%.
            </p>
          </div>

          <p className="text-gray-700 text-lg mb-6 leading-relaxed">
            The 5-minute rule comes from an MIT study analyzing 100,000 sales calls across multiple industries. The data
            showed a sharp cliff in conversion probability: leads contacted within 5 minutes converted at dramatically
            higher rates than those contacted at 6 minutes or later.
          </p>

          <div className="grid md:grid-cols-3 gap-4 my-8">
            {[
              { stat: '9x', label: 'More likely to convert vs. 30-minute response', icon: <TrendingUp className="w-6 h-6 text-blue-600" /> },
              { stat: '78%', label: 'Of buyers choose the first business to respond', icon: <Target className="w-6 h-6 text-blue-600" /> },
              { stat: '47h', label: 'Average response time for local businesses', icon: <Clock className="w-6 h-6 text-red-500" /> },
            ].map((item) => (
              <div key={item.stat} className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-2">{item.icon}</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{item.stat}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>

          <p className="text-gray-700 text-lg leading-relaxed">
            The gap between what the data recommends (5 minutes) and what most businesses do (47 hours average) is the
            opportunity. Most local businesses do not have a lead generation problem — they have a lead response problem.
          </p>
          <p className="text-gray-700 text-lg mt-4">
            See the full data:{' '}
            <Link to="/speed-to-lead/statistics" className="text-blue-600 hover:underline">
              Speed to Lead Statistics for Local Businesses →
            </Link>
          </p>
        </motion.section>

        {/* Section 3 */}
        <motion.section
          id="industry-benchmarks"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">Speed to Lead Benchmarks by Industry</h2>
          <p className="text-gray-700 text-lg mb-6 leading-relaxed">
            Every local service industry has different average response times and different tolerance windows. The key
            benchmark is not the industry average — it is the time at which a lead gives up and calls the next business.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Industry</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Response Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Target</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Leads Lost to Slow Response</th>
                </tr>
              </thead>
              <tbody>
                {industries.map((row, i) => (
                  <tr key={row.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 font-medium text-gray-900">{row.name}</td>
                    <td className="py-3 px-4 text-red-600 font-medium">{row.avgResponse}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{row.target}</td>
                    <td className="py-3 px-4 text-gray-700">{row.lossRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-sm mt-3">Sources: Harvard Business Review, InsideSales.com, Boltcall industry research 2026.</p>
        </motion.section>

        {/* Section 4 */}
        <motion.section
          id="why-businesses-fail"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">Why Most Local Businesses Fail the Speed Test</h2>
          <p className="text-gray-700 text-lg mb-5 leading-relaxed">
            Slow response is not usually caused by lack of effort. It is caused by structural constraints that make
            instant response impossible without automation.
          </p>

          <ul className="space-y-4 mb-6">
            {[
              { title: 'Staff are on a job site', body: 'A plumber mid-repair cannot answer the phone. An HVAC technician on a roof cannot respond to a web form. The people who could answer are unavailable during peak demand.' },
              { title: 'After-hours inquiries pile up', body: '40–60% of web inquiries come in outside business hours. Without automation, these wait until the next morning — often 8–12 hours later — at which point the prospect has already booked a competitor.' },
              { title: 'No one owns lead response', body: 'In most small businesses, there is no dedicated person whose job is to respond to leads within 5 minutes. It happens "when someone gets to it."' },
              { title: 'Peak season overwhelm', body: 'When call volume spikes during HVAC season or after a storm, staff are overwhelmed. The very moment when there are the most leads is the moment response times are the slowest.' },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-gray-900">{item.title}:</strong>{' '}
                  <span className="text-gray-700">{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-gray-700 text-lg leading-relaxed">
            Two of these failure modes have specialized playbooks. For the after-hours problem, see{' '}
            <Link to="/blog/never-miss-a-call-after-business-hours" className="text-blue-600 hover:underline">
              never miss a call after business hours
            </Link>
            {' '}and the breakdown of the{' '}
            <Link to="/blog/best-after-hours-answering-service" className="text-blue-600 hover:underline">
              best after-hours answering service
            </Link>
            {' '}options. For paid-traffic law firms bleeding leads at night, see{' '}
            <Link to="/industries/lawyer-answering-service" className="text-blue-600 hover:underline">
              lawyer answering service
            </Link>.
          </p>
        </motion.section>

        {/* Section 5 */}
        <motion.section
          id="how-to-fix"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-5">How to Fix Your Response Time</h2>
          <p className="text-gray-700 text-lg mb-5 leading-relaxed">
            The only way to guarantee 5-minute response times, 24/7, is automation. Human staff cannot be available
            every minute of every day. AI can. Start with{' '}
            <Link to="/blog/setup-instant-lead-reply" className="text-blue-600 hover:underline">
              how to set up instant lead reply
            </Link>
            , then layer in an{' '}
            <Link to="/blog/ai-agent-for-small-business-24-7-call-answering" className="text-blue-600 hover:underline">
              AI agent for 24/7 call answering
            </Link>
            {' '}or an{' '}
            <Link to="/blog/ai-answering-service-small-business" className="text-blue-600 hover:underline">
              AI answering service for small business
            </Link>.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-8">
            {[
              { title: 'AI phone receptionist', body: 'Answers every inbound call instantly, qualifies the lead, and books appointments directly to your calendar. No hold time, no voicemail, no missed calls.' },
              { title: 'SMS auto-response', body: 'When a web form is submitted, an AI sends an immediate SMS response, qualifies the lead with follow-up questions, and notifies the right team member.' },
              { title: 'After-hours coverage', body: 'AI handles calls and inquiries 24/7 so a lead coming in at midnight on Saturday gets the same instant response as a Monday morning call.' },
              { title: 'Response time measurement', body: 'Track your actual response times so you know where the gaps are. Use the Speed Test to see how your current response compares to the 5-minute benchmark.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-blue-50 border border-blue-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-gray-900 block mb-1">{item.title}</strong>
                  <span className="text-gray-700 text-sm">{item.body}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/tools/5-minute-response-playbook"
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Get the 5-Minute Response Playbook <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <Link
              to="/speed-test"
              className="inline-flex items-center px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm"
            >
              Test Your Speed Now
            </Link>
          </div>
        </motion.section>

        {/* Related Resources */}
        <motion.section
          id="related-resources"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Related Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { href: '/speed-to-lead/statistics', title: 'Speed to Lead Statistics (2026)', desc: 'All the response time data and benchmarks in one place.' },
              { href: '/blog/speed-to-lead-local-business', title: 'In-Depth Speed to Lead Guide', desc: 'A comprehensive 11-minute read on every aspect of lead response time.' },
              { href: '/blog/missed-calls-statistics-local-business-2026', title: 'Missed Call Statistics 2026', desc: 'What the data says about how many calls local businesses miss each year.' },
              { href: '/tools/5-minute-response-playbook', title: '5-Minute Response Playbook', desc: 'Step-by-step guide to implementing instant lead response in your business.' },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <BarChart3 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 group-hover:text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 text-sm">{item.title}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Topic Cluster */}
        <motion.section
          id="topic-cluster"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Continue Reading: The Speed-to-Lead Topic Cluster</h2>
          <p className="text-gray-700 mb-6">
            Deep dives on speed-to-lead and lead response across industries, concepts, and tooling:
          </p>

          {/* Industry deep dives */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">By Industry</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-7">
            {[
              { href: '/industries/lawyer-answering-service', title: 'Lawyer answering service' },
              { href: '/blog/ai-receptionist-for-law-firms', title: 'AI receptionist for law firms' },
              { href: '/blog/speed-to-lead-for-law-firms', title: 'Speed to lead for law firms' },
              { href: '/tools/lawyer-intake-calculator', title: 'Lawyer intake calculator' },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-start gap-2.5 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1 group-hover:text-blue-600" />
                <div className="font-medium text-gray-900 group-hover:text-blue-700 text-sm">{item.title}</div>
              </Link>
            ))}
          </div>

          {/* Concept deep dives */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Receptionist Concepts</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-7">
            {[
              { href: '/blog/how-ai-receptionist-works', title: 'How an AI receptionist works' },
              { href: '/blog/ai-vs-human-receptionist', title: 'AI vs human receptionist' },
              { href: '/blog/is-ai-receptionist-worth-it', title: 'Is an AI receptionist worth it?' },
              { href: '/blog/ai-receptionist-cost-pricing', title: 'AI receptionist cost and pricing' },
              { href: '/blog/best-ai-receptionist-tools', title: 'Best AI receptionist tools' },
              { href: '/blog/5-signs-you-need-ai-receptionist', title: '5 signs you need an AI receptionist' },
              { href: '/blog/ai-chatbot-vs-live-chat-phone-comparison', title: 'AI chatbot vs live chat: which wins on the phone?' },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-start gap-2.5 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1 group-hover:text-blue-600" />
                <div className="font-medium text-gray-900 group-hover:text-blue-700 text-sm">{item.title}</div>
              </Link>
            ))}
          </div>

          {/* Free tools and guides */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Free Tools and Guides</h3>
          <p className="text-gray-700 leading-relaxed">
            Ready to put speed-to-lead into practice? Download the{' '}
            <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-blue-600 hover:underline">
              AI Receptionist Buyer's Guide
            </Link>
            , then benchmark your current setup with the{' '}
            <Link to="/lead-response-scorecard" className="text-blue-600 hover:underline">
              Lead Response Scorecard
            </Link>
            {' '}or the{' '}
            <Link to="/ai-readiness-scorecard" className="text-blue-600 hover:underline">
              AI Readiness Scorecard
            </Link>. Want to see instant response in action?{' '}
            <Link to="/response-time-test" className="text-blue-600 hover:underline">
              Request a live test call
            </Link>
            {' '}and get emailed exactly how many seconds it took Boltcall to answer.
            If your inbound channel is search, run a free{' '}
            <Link to="/seo-audit" className="text-blue-600 hover:underline">
              SEO audit
            </Link>
            {' '}or the combined{' '}
            <Link to="/seo-aeo-audit" className="text-blue-600 hover:underline">
              SEO + AEO audit
            </Link>
            {' '}to make sure leads can find you in the first place.
          </p>
        </motion.section>

        {/* FAQ */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-7">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-gray-200 pb-6 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-700 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

      </div>

      <FinalCTA {...BLOG_CTA} />
      <Footer />
    </div>
  );
};

export default SpeedToLeadPillar;
