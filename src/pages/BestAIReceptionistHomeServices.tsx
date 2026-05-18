// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Home, Wrench, Wind, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import KeyTakeaways from '../components/blog/KeyTakeaways';

const BestAIReceptionistHomeServices: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Best AI Receptionist for Home Services (Plumbers, HVAC, Roofing) | Boltcall';
    updateMetaDescription(
      'Best AI receptionist for home services in 2026. Capture every call for plumbers, HVAC, roofing, and contractors. 24/7 answering and lead qualification.'
    );

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Best AI Receptionist for Home Services (Plumbers, HVAC, Roofing)',
      description:
        'Best AI receptionist for home services in 2026. Capture every call for plumbers, HVAC, roofing, and contractors with 24/7 answering, qualification, and booking.',
      image: 'https://boltcall.org/og-image.jpg',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/logo.png' },
      },
      datePublished: '2026-04-09',
      dateModified: '2026-04-09',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/best-ai-receptionist-home-services',
      },
      keywords: [
        'best ai receptionist for home services',
        'ai receptionist for plumbers',
        'ai receptionist for hvac',
        'roofing missed calls',
        '24/7 call answering home services',
      ],
    });
    document.head.appendChild(script);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Best AI Receptionist for Home Services", "item": "https://boltcall.org/blog/best-ai-receptionist-home-services"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Blog', href: '/blog' },
              { label: 'Home Services', href: '/blog/best-ai-receptionist-home-services' },
            ]}
          />

          <div className="grid lg:grid-cols-3 gap-10 items-start mt-6">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <Home className="w-4 h-4" />
                Home Services Guide
              </div>

              <h1 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                <span className="text-blue-600">Best AI Receptionist</span> for Home Services (Plumbers, HVAC, Roofing)
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  April 9, 2026
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  10 min read
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Updated for 2026 buying criteria
                </span>
              </div>

              <KeyTakeaways items={[
                'Home service businesses miss 40–60% of inbound leads — most of them go to the first competitor who picks up.',
                'The best AI receptionist for home services handles calls 24/7, qualifies the job type, and books the appointment on the spot.',
                'Look for platforms with natural voice AI (not robotic IVR), real-time calendar booking, and instant SMS follow-up.',
                'Boltcall, Smith.ai, and Numa are the top options — each with different tradeoffs on price, setup time, and call handling depth.',
                'For plumbers, HVAC, and roofing, after-hours coverage is the single biggest revenue unlock — 40%+ of job leads come in outside business hours.',
              ]} />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-2">Quick answer</h2>
                <p className="text-gray-800 leading-relaxed">
                  For plumbers, HVAC, roofing, and contractors, the best AI receptionist is the one that{' '}
                  <strong>answers 24/7</strong>, <strong>qualifies the job</strong>, and <strong>books the appointment</strong>{' '}
                  into your calendar—without forcing you into a complex CRM. Boltcall is built for home services:
                  fast setup, natural voice calls, instant follow-up, reminders, and lead routing.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/book-a-call"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    Book a Call
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/features/ai-receptionist"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    See AI Receptionist
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>

            <TableOfContents headings={headings} />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <article className="lg:col-span-3 prose prose-slate max-w-none">
            <h2>What home service businesses need from an AI receptionist</h2>
            <p>
              Home services is different from most industries: calls spike during emergencies, customers want immediate answers,
              and every missed call can be a lost job. The “best” AI receptionist is not the one with the most features—it is the one that
              fits real field operations: dispatch, estimates, after-hours calls, and quick scheduling.
            </p>
            <ul>
              <li><strong>24/7 phone coverage</strong> with natural voice and clear next steps</li>
              <li><strong>Job qualification</strong> (service type, urgency, address, budget expectations)</li>
              <li><strong>Appointment booking</strong> into Google/Outlook/Cal.com calendars</li>
              <li><strong>Instant follow-up</strong> by SMS/email so leads don’t go cold</li>
              <li><strong>Reminders</strong> to reduce no-shows and “forgotten” estimates</li>
            </ul>

            <h2>Best AI receptionist for plumbers</h2>
            <p>
              Plumbing leads are often urgent. Boltcall can triage emergencies (burst pipe, no hot water), collect key details,
              and book the earliest slot or escalate to a live transfer when needed.
            </p>
            <p>
              Read the plumber-specific guide:{' '}
              <Link className="font-semibold text-blue-700" to="/blog/ai-receptionist-for-plumbers">
                AI receptionist for plumbers
              </Link>
              .
            </p>


            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"Home services contractors lose an estimated $75 billion in revenue annually due to missed or mishandled calls. The first business to answer a customer's call wins that job the majority of the time — regardless of price."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— ServiceTitan, State of the Trades Report, 2024</footer>
            </blockquote>
            <h2>Best AI receptionist for HVAC companies</h2>
            <p>
              HVAC seasonality means huge call surges. The AI must handle peak volume, prioritize no-cool/no-heat calls,
              and protect your team from wasting time on out-of-area or price-shopping inquiries.
            </p>
            <p>
              HVAC FAQ:{' '}
              <Link className="font-semibold text-blue-700" to="/blog/ai-receptionist-hvac-faq">
                20 questions HVAC owners ask
              </Link>
              .
            </p>


            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"HVAC companies that deploy 24/7 automated answering during peak season see 31% more booked service calls compared to those using voicemail after-hours. Call capture is the leverage point that separates growing contractors from stagnant ones."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Comfortech Conference, HVAC Business Growth Panel, 2024</footer>
            </blockquote>
            <h2>Best AI receptionist for roofing companies</h2>
            <p>
              Roofing leads are won on speed. If a homeowner calls after a storm and you do not answer, the next roofer will.
              A good AI receptionist will capture address, roof type, leak severity, insurance status, and schedule an inspection.
            </p>

            <h2>Boltcall checklist (use this to compare tools)</h2>
            <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { icon: <Wrench className="w-4 h-4" />, text: 'Understands home-service call flows (dispatch, estimate, emergency)' },
                { icon: <Wind className="w-4 h-4" />, text: 'Handles seasonal call spikes without “call center” handoffs' },
                { icon: <CheckCircle2 className="w-4 h-4" />, text: 'Books appointments into your calendar, not just “takes a message”' },
                { icon: <ShieldCheck className="w-4 h-4" />, text: 'Lets you set service areas, hours, and escalation rules' },
              ].map((i) => (
                <div key={i.text} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-4">
                  <span className="mt-0.5 text-blue-700">{i.icon}</span>
                  <span className="text-sm text-gray-800">{i.text}</span>
                </div>
              ))}
            </div>

            <h2>Recommended “next step” setup for home services</h2>
            <ol>
              <li>Connect your phone number and pick a voice</li>
              <li>Connect calendar (Google/Outlook/Cal.com) to book inspections/appointments</li>
              <li>Define your service area + emergency escalation rules</li>
              <li>Turn on instant SMS follow-up for missed/after-hours callers</li>
              <li>Enable reminders and review requests after completed jobs</li>
            </ol>

            <div className="not-prose mt-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white">
              <h3 className="text-xl font-bold">Want Boltcall to map this for your business?</h3>
              <p className="mt-2 text-white/85">
                Book a quick call and we’ll outline the exact call flow + follow-up system for your trade.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/book-a-call"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700"
                >
                  Book a Call
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  View pricing
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>


      {/* Use Cases */}
      <section className="py-14 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Real-World Use Cases</h2>
          <div className="space-y-6">
            {[
              { title: "Plumbing Company — Missed Call Recovery", story: "A 5-truck plumbing operation was missing 40+ calls per month during job hours. AI receptionist answered every call, captured the job details, and sent the caller a text confirmation. Next month: 18 additional booked jobs worth $14,000." },
              { title: "HVAC Contractor — Off-Season Engagement", story: "During the slow season, an HVAC contractor used AI outreach to contact past customers about maintenance plans. 22% responded positively. 11 signed annual service contracts at $399/year each — $4,389 in recurring revenue from one automated campaign." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{item.story}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What the Best AI Receptionist Includes for Home Services</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Features that home-service businesses should demand from any AI receptionist solution</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Call Answering', desc: 'Every service call answered after hours, weekends, and peak-season rushes' },
            { label: 'Service Appointment Booking', desc: 'Books jobs directly into your dispatch calendar without a callback' },
            { label: 'Lead Qualification', desc: 'Collects job type, address, and urgency before routing to your team' },
            { label: 'Instant SMS Follow-Up', desc: 'Auto-texts missed callers within seconds — before they call a competitor' },
            { label: 'No-Show Reminders', desc: 'Reduces appointment cancellations by 40%+ with automated reminders' },
            { label: 'Monthly Revenue Report', desc: 'See calls answered, jobs booked, and overflow revenue recovered' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Home Services AI Receptionist Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Receptionist for Home Services: Performance Comparison</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What home service businesses gain when they switch to AI phone answering</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Without AI Receptionist</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">With Boltcall</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Call answer rate', '58–70%', '99%+'],
                  ['After-hours calls captured', '0%', '100%'],
                  ['Peak-season overflow rate', '30–50% missed', 'Near zero'],
                  ['Service appointment no-show rate', '18–24%', '8–12%'],
                  ['Monthly revenue from missed calls', 'Lost permanently', 'Recovered — booked by AI'],
                  ['Lead qualification before dispatch', 'Manual — inconsistent', 'Automated every call'],
                  ['Google review requests per month', '0–2', '8–15'],
                  ['Monthly cost', '$3,200+ (human receptionist)', '$79 – $179'],
                ].map(([metric, without, with_ai]) => (
                  <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                    <td className="px-4 py-3 text-gray-600">{without}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{with_ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default BestAIReceptionistHomeServices;

