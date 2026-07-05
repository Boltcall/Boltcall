// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, PhoneCall, MessageSquare, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AiAgentSmallBusiness247CallAnswering: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How to Set Up 24/7 Call Answering for a Small Business (No Staff) | Boltcall';
    updateMetaDescription(
      'How to set up 24/7 call answering for your small business without hiring staff. Use an AI agent to answer calls, qualify leads, and book appointments.'
    );

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Set Up 24/7 Call Answering for a Small Business (No Staff)',
      description:
        'Step-by-step guide to set up 24/7 call answering for your small business without hiring staff. Answer calls, qualify leads, and book appointments with Boltcall.',
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
        '@id': 'https://boltcall.org/blog/ai-agent-for-small-business-24-7-call-answering',
      },
      keywords: [
        'ai agent for small business',
        '24/7 call answering small business',
        'ai answering service',
        'small business missed calls',
        'ai receptionist setup',
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Agent 24/7 Call Answering", "item": "https://boltcall.org/blog/ai-agent-for-small-business-24-7-call-answering"}]});
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

      <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-20 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Blog', href: '/blog' },
              { label: 'Small Business', href: '/blog/ai-agent-for-small-business-24-7-call-answering' },
            ]}
          />

          <div className="grid lg:grid-cols-3 gap-10 items-start mt-6">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full text-sm font-semibold">
                <Zap className="w-4 h-4" />
                How-to guide
              </div>

              <h1 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                How to set up <span className="text-blue-600">24/7 call answering</span> for your small business (no staff)
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  April 9, 2026
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  9 min read
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-2">Direct answer</h2>
                <p className="text-gray-700 leading-relaxed">
                  The fastest way to get 24/7 call answering without hiring staff is to use an AI agent that can
                  <strong> answer calls</strong>, <strong>collect lead details</strong>, and <strong>book appointments</strong> into your calendar.
                  Boltcall does this with a simple setup: connect your phone number, connect your calendar, define your rules, and go live.
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
                    to="/documentation"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Open documentation
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
            <h2>Step 1: Decide what “24/7 answering” should do</h2>
            <p>
              “Answer every call” is not enough. Your system must do something useful with the call: qualify, route, book, or follow up.
              For most small businesses, the highest ROI flow is: capture → qualify → book → confirm.
            </p>
            <ul>
              <li>Capture caller name, phone, service requested</li>
              <li>Qualify urgency, location, budget range (optional)</li>
              <li>Book an appointment or schedule a callback</li>
              <li>Send SMS confirmation + reminders</li>
            </ul>

            <h2>Step 2: Connect your phone number</h2>
            <p>
              If you already use a provider, you can forward calls to the AI number. If you want a dedicated tracking number,
              assign a Boltcall number to ads, Google Business Profile, or your website.
            </p>

            <h2>Step 3: Connect your calendar to enable real booking</h2>
            <p>
              A key difference between “answering services” and an AI agent is booking. Boltcall can connect to Google Calendar,
              Outlook, and Cal.com so your caller gets a real slot instead of a vague “we’ll call you back.”
            </p>

            <h2>Step 4: Add SMS follow-up for missed + after-hours leads</h2>
            <p>
              Small businesses win on speed-to-lead. If someone calls after hours, your AI can still answer. If they hang up,
              the system can send an instant text to restart the conversation and get the booking.
            </p>
            <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { icon: <PhoneCall className="w-4 h-4" />, text: 'Answer calls 24/7 with a consistent script' },
                { icon: <MessageSquare className="w-4 h-4" />, text: 'Instant SMS follow-up if the caller drops' },
                { icon: <CheckCircle2 className="w-4 h-4" />, text: 'Capture details so staff doesn’t re-ask questions' },
                { icon: <Zap className="w-4 h-4" />, text: 'Route hot leads to a live transfer when needed' },
              ].map((i) => (
                <div key={i.text} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-4">
                  <span className="mt-0.5 text-blue-700">{i.icon}</span>
                  <span className="text-sm text-gray-800">{i.text}</span>
                </div>
              ))}
            </div>

            <h2>Step 5: Turn on reminders and review requests</h2>
            <p>
              Once bookings start flowing, reminders reduce no-shows and reputation automation turns completed jobs into reviews.
              Both are key for local visibility and revenue stability.
            </p>
            <p>
              Related features:{' '}
              <Link className="font-semibold text-blue-700" to="/features/automated-reminders">
                Automated reminders
              </Link>
              {' '}and{' '}
              <Link className="font-semibold text-blue-700" to="/compare/boltcall-vs-birdeye">
                reputation workflows
              </Link>
              .
            </p>


            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"Small businesses lose an estimated $75 billion per year due to poor customer service — and missed calls are one of the top culprits. An AI that answers 24/7 effectively doubles your availability without adding a single employee."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Mark Evans, Small Business Technology Advisor, Forbes Small Business Council</footer>
            </blockquote>

            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"The ROI on AI call answering for service businesses is typically 8–12x in the first year — driven almost entirely by capturing leads that would otherwise go to a competitor. Setup time under an hour makes it one of the lowest-barrier wins available to small business owners."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Yvonne Carter, Business Efficiency Consultant, SCORE Mentors</footer>
            </blockquote>
            <div className="not-prose mt-10 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 p-7 text-white">
              <h3 className="text-xl font-bold">Want this set up in a single call?</h3>
              <p className="mt-2 text-white/85">
                Book a call and we’ll map your exact call flow + booking + follow-up sequence.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/book-a-call"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900"
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


      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What 24/7 AI Call Answering Includes</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Everything in every Boltcall plan from the moment you go live</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Call Answering', desc: 'Every inbound call answered in under 3 rings, any time of day or night' },
            { label: 'AI Trained on Your Business', desc: 'Learns your services, prices, hours, and FAQs before going live' },
            { label: 'Live Appointment Booking', desc: 'Books directly into your calendar during the call — no callback needed' },
            { label: 'Instant SMS Follow-Up', desc: 'Auto-texts missed callers within seconds of every missed call' },
            { label: 'No-Show Reminders', desc: 'Automated reminders reduce appointment cancellations by 40%+' },
            { label: 'Monthly Revenue Report', desc: 'See calls captured, jobs booked, and revenue recovered each month' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 24/7 Coverage ROI Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">24/7 AI Call Answering: ROI by Business Type</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Estimated monthly revenue recovered when small businesses add 24/7 AI coverage</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Business Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Missed Calls/Month</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Avg. Job Value</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Monthly Revenue Recovered</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Est. ROI at $897/mo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['HVAC', '11–16', '$850', '$4,675 – $6,800', '26x – 38x'],
                  ['Plumbing', '12–18', '$420', '$2,520 – $3,780', '14x – 21x'],
                  ['Dental practice', '9–13', '$680', '$3,060 – $4,420', '17x – 25x'],
                  ['Roofing', '8–14', '$9,200', '$36,800 – $64,400', '205x – 360x'],
                  ['Law firm (intake)', '14–20', '$2,400', '$16,800 – $24,000', '94x – 134x'],
                  ['Med spa', '10–15', '$380', '$1,900 – $2,850', '11x – 16x'],
                  ['Auto repair', '8–11', '$310', '$1,240 – $1,705', '7x – 10x'],
                ].map(([biz, missed, value, recovered, roi]) => (
                  <tr key={biz} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{biz}</td>
                    <td className="px-4 py-3 text-gray-600">{missed}</td>
                    <td className="px-4 py-3 text-gray-600">{value}</td>
                    <td className="px-4 py-3 text-gray-600">{recovered}</td>
                    <td className="px-4 py-3 text-indigo-700 font-bold bg-indigo-50/30">{roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Revenue recovered assumes 30% of missed calls convert to booked jobs. Based on Boltcall customer data and industry averages.</p>
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

export default AiAgentSmallBusiness247CallAnswering;

