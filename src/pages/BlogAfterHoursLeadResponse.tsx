import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, PhoneOff, TrendingDown, Zap, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';

const BlogAfterHoursLeadResponse: React.FC = () => {
  useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'After-Hours Lead Response for Home Services (2026 Data) | Boltcall';
    updateMetaDescription('42% of home service leads arrive after hours. Learn why after-hours lead response is the biggest revenue leak for plumbers, HVAC, and contractors — and how to fix it.');

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "After-Hours Leads Are Killing Your Home Service Business — Here's the Data (And the Fix)",
      "description": "42% of home service leads arrive after hours. Data on why after-hours lead response is the biggest revenue leak for local businesses.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/after-hours-lead-response-home-services"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "After-Hours Lead Response", "item": "https://boltcall.org/blog/after-hours-lead-response-home-services" }
      ]
    });
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Boltcall Team",
      "url": "https://boltcall.org/about",
      "worksFor": { "@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org" }
    });
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('article-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'After-Hours Lead Response for Home Services', href: '/blog/after-hours-lead-response-home-services' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              After-Hours Leads Are <span className="text-blue-600">Killing</span> Your Home Service Business
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 17, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>9 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                Your phone rings at 7:43 PM on a Tuesday. A homeowner's water heater just failed. They
                need a plumber tomorrow morning. You're at dinner with your family. The call goes to voicemail.
                By 7:45 PM, they've already called your competitor. By 7:47 PM, they've booked with someone else.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                This isn't a hypothetical. It happens to home service businesses every single night. And the data
                shows it's far worse than most owners realize.
              </p>
            </motion.div>

            {/* Table of Contents */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li><a href="#the-42-percent-problem" className="text-blue-600 hover:underline text-sm">The 42% Problem: Nearly Half Your Leads Arrive After Hours</a></li>
                <li><a href="#what-happens-when-nobody-answers" className="text-blue-600 hover:underline text-sm">What Happens When Nobody Answers</a></li>
                <li><a href="#after-hours-by-industry" className="text-blue-600 hover:underline text-sm">After-Hours Lead Volume by Industry</a></li>
                <li><a href="#the-real-revenue-math" className="text-blue-600 hover:underline text-sm">The Real Revenue Math Behind Missed After-Hours Leads</a></li>
                <li><a href="#why-voicemail-doesnt-work" className="text-blue-600 hover:underline text-sm">Why Voicemail Doesn't Work (The Data Is Brutal)</a></li>
                <li><a href="#the-60-second-benchmark" className="text-blue-600 hover:underline text-sm">The 60-Second Benchmark That Changes Everything</a></li>
                <li><a href="#how-to-capture-after-hours-leads" className="text-blue-600 hover:underline text-sm">How to Capture Every After-Hours Lead Without Hiring Night Staff</a></li>
                <li><a href="#implementation-checklist" className="text-blue-600 hover:underline text-sm">Your After-Hours Lead Capture Checklist</a></li>
                <li><a href="#faq" className="text-blue-600 hover:underline text-sm">Frequently Asked Questions</a></li>
              </ol>
            </div>

            {/* Section 1 — The 42% Problem */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="the-42-percent-problem" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The 42% Problem: Nearly Half Your Leads Arrive After Hours
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  A 2026 study across 573 home service businesses found that <strong>42% of all inbound leads arrive
                  after business hours or on weekends</strong>. That's not a rounding error. That's nearly half of every
                  dollar you spend on marketing generating leads that land when you're closed.
                </p>

                <p>
                  Think about that for a second. If you're spending $3,000 a month on marketing, roughly $1,260 of
                  that budget is producing leads that hit voicemail.
                </p>

                <p>
                  The reason is simple: homeowners search for services when they're home. That means evenings,
                  weekends, and early mornings. A pipe bursts at 9 PM. An AC unit dies on Saturday afternoon. A
                  roof leak shows up during a Sunday rainstorm. The need is urgent. The timing is inconvenient.
                </p>
              </div>
            </motion.section>

            {/* Section 2 — What Happens When Nobody Answers */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="what-happens-when-nobody-answers" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                What Happens When Nobody Answers
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  When a lead calls after hours and reaches voicemail, the vast majority don't leave a message.
                  They call the next business on the list.
                </p>

                <p>
                  <strong>78% of customers buy from the first business that responds.</strong> Not the cheapest.
                  Not the one with the best reviews. The first one that picks up the phone.
                </p>

                <p>
                  Here's the cascade that plays out every night at businesses that close at 5 PM:
                </p>

                <div className="my-8 space-y-4">
                  {[
                    { time: '6:15 PM', event: 'Homeowner discovers problem (broken AC, clogged drain, etc.)', icon: AlertTriangle },
                    { time: '6:20 PM', event: 'Googles "plumber near me" or "emergency HVAC repair"', icon: Zap },
                    { time: '6:22 PM', event: 'Calls your business. Gets voicemail. Hangs up.', icon: PhoneOff },
                    { time: '6:23 PM', event: 'Calls competitor #2. Gets a live answer (or instant text back). Books appointment.', icon: TrendingDown },
                    { time: 'Next morning', event: 'You see a missed call. Lead is already gone.', icon: TrendingDown },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-24 text-sm font-semibold text-blue-600">{step.time}</div>
                      <step.icon className="w-5 h-5 mt-0.5 text-gray-400 flex-shrink-0" />
                      <p className="text-gray-700">{step.event}</p>
                    </div>
                  ))}
                </div>

                <p>
                  That's one lead. Now multiply it by every evening, every weekend, every holiday across
                  a full year. The compounding loss is staggering.
                </p>
              </div>
            </motion.section>

            {/* Section 3 — After-Hours by Industry */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="after-hours-by-industry" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                After-Hours Lead Volume by Industry
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Not every industry is hit equally. Emergency-driven services see the highest after-hours
                  volume because problems don't wait for business hours.
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-200 my-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Industry</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">After-Hours Lead %</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Peak After-Hours Window</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Plumbing', '48-55%', '6 PM - 10 PM weekdays, all day Saturday'],
                        ['HVAC', '45-52%', 'Evenings + weekends (seasonal spikes in summer/winter)'],
                        ['Roofing', '38-44%', 'Weekends + after storms'],
                        ['Electrical', '40-48%', 'Evenings when homeowners are home'],
                        ['Landscaping', '35-40%', 'Sunday afternoons + weekday evenings'],
                        ['General Contracting', '30-38%', 'Evenings + weekends'],
                        ['Dental (emergency)', '25-35%', 'Weekends + holidays'],
                        ['Legal (personal injury)', '40-50%', 'Evenings + weekends'],
                      ].map(([industry, pct, window]) => (
                        <tr key={industry} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium">{industry}</td>
                          <td className="px-4 py-3 text-blue-600 font-semibold">{pct}</td>
                          <td className="px-4 py-3 text-gray-600">{window}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400">
                  Sources: Blazeo 2026 benchmark, ServiceTitan industry reports, Scorpion Home Services data.
                </p>

                <p>
                  If you're a plumber, more than half your leads may be arriving when you're off the clock.
                  For HVAC companies during peak season, it can be even higher. These aren't low-intent
                  browsers. These are people with urgent problems ready to pay for a solution right now.
                </p>
              </div>
            </motion.section>

            {/* Section 4 — Revenue Math */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="the-real-revenue-math" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The Real Revenue Math Behind Missed After-Hours Leads
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Let's run the numbers for a typical home service business.
                </p>

                <div className="my-8 space-y-4">
                  <p className="text-gray-800 font-medium">Assumptions:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">Leads per month:</span>
                      <span>80 (from ads, SEO, referrals, Google Business Profile)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">After-hours leads:</span>
                      <span>42% = 34 leads</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">Voicemail callback rate:</span>
                      <span>~20% actually leave a message. ~30% of those still book when you call back the next morning.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">Average job value:</span>
                      <span>$450</span>
                    </li>
                  </ul>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 my-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Without After-Hours Response</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">With Instant After-Hours Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['After-hours leads captured', '~2 (from voicemail callbacks)', '34 (100% answered instantly)'],
                        ['Conversion rate', '~6% of after-hours leads', '~25% of after-hours leads'],
                        ['Jobs booked from after-hours', '~2/month', '~8-9/month'],
                        ['Monthly revenue from after-hours', '~$900', '~$3,825'],
                        ['Annual revenue difference', '', '+$35,100/year'],
                      ].map(([metric, without, withResponse]) => (
                        <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                          <td className="px-4 py-3 text-gray-600">{without}</td>
                          <td className="px-4 py-3 text-green-700 font-semibold">{withResponse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p>
                  That's <strong>$35,100 in annual revenue</strong> sitting on the table. For businesses
                  with higher job values (HVAC replacements at $5,000+, roof repairs at $8,000+), the gap
                  gets dramatically larger.
                </p>
              </div>
            </motion.section>

            {/* Mid-Content CTA */}
            <FinalCTA {...BLOG_CTA} />

            {/* Section 5 — Why Voicemail Doesn't Work */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="why-voicemail-doesnt-work" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Why Voicemail Doesn't Work (The Data Is Brutal)
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Most business owners assume voicemail is a safety net. "They'll leave a message and I'll
                  call them back in the morning." The data tells a different story.
                </p>

                <div className="my-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 font-bold text-lg">80%</span>
                      <span>of callers hang up when they reach voicemail instead of leaving a message</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 font-bold text-lg">74%</span>
                      <span>of businesses miss the 5-minute response window entirely (Blazeo 2026)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 font-bold text-lg">4%</span>
                      <span>booking rate when response time exceeds 30 minutes (home services benchmark)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 font-bold text-lg">81%</span>
                      <span>of businesses responding in over an hour report losing leads to faster competitors</span>
                    </li>
                  </ul>
                </div>

                <p>
                  Voicemail isn't a backup plan. It's a lead graveyard. When someone has an urgent home
                  service need at 8 PM, they're not going to wait until 9 AM tomorrow for a callback.
                  They're going to call the next company on the list until someone picks up.
                </p>

              </div>
            </motion.section>

            {/* Section 6 — The 60-Second Benchmark */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="the-60-second-benchmark" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                The 60-Second Benchmark That Changes Everything
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  The research is overwhelming. Across multiple studies and hundreds of thousands of leads,
                  one number keeps showing up: <strong>60 seconds</strong>.
                </p>

                <p>
                  Text responses under 60 seconds achieved a <strong>73% appointment booking rate</strong> in
                  home services (plumbing, HVAC, electrical, tree services). After 30 minutes, that drops
                  to 4%. That's not a gradual decline. It's a cliff.
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-200 my-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Response Time</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Booking Rate</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What Happens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Under 60 seconds', '73%', 'Lead is still engaged, hasn\'t called anyone else yet'],
                        ['1-5 minutes', '~35%', 'Lead may have started searching for alternatives'],
                        ['5-30 minutes', '~12%', 'Lead has likely contacted 2-3 other businesses'],
                        ['30 min - 1 hour', '4%', 'Lead has probably booked with someone else'],
                        ['Next morning', '<2%', 'Lead forgot about you or already resolved the issue'],
                      ].map(([time, rate, desc]) => (
                        <tr key={time} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium">{time}</td>
                          <td className="px-4 py-3 text-blue-600 font-semibold">{rate}</td>
                          <td className="px-4 py-3 text-gray-600">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p>
                  This is why after-hours response matters so much. It's not about being slightly faster.
                  It's the difference between a 73% booking rate and a 4% booking rate. The businesses
                  that respond instantly after hours aren't just capturing more leads. They're capturing
                  leads that are effectively invisible to everyone else.
                </p>
              </div>
            </motion.section>

            {/* Section 7 — How to Capture After-Hours Leads */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="how-to-capture-after-hours-leads" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                How to Capture Every After-Hours Lead Without Hiring Night Staff
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  You have three options for handling after-hours leads. Each has different costs,
                  conversion rates, and trade-offs.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Option 1: Answering Service ($200-800/month)</h3>
                <p>
                  Traditional answering services use human operators to take messages. They answer the phone,
                  collect caller information, and send you the message. The problem: they can't book appointments,
                  answer specific questions about your services, or qualify leads. They're expensive message pads.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Option 2: On-Call Staff ($2,000-5,000/month)</h3>
                <p>
                  Hiring someone to answer phones evenings and weekends works, but it's expensive and unreliable.
                  People get sick. They quit. They answer at varying quality levels. And you're paying whether
                  leads come in or not.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Option 3: AI-Powered Instant Response ($549-4997/month)</h3>
                <p>
                  AI receptionist systems answer every call in under 5 seconds, 24/7. They don't just take
                  messages. They answer questions about your services, qualify the lead, check your calendar
                  availability, and book the appointment on the spot. The caller gets immediate help. You
                  wake up to a booked schedule.
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-200 my-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Factor</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Answering Service</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">On-Call Staff</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">AI Receptionist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Monthly cost', '$200-800', '$2,000-5,000', '$549-4997'],
                        ['Response time', '15-45 seconds', 'Varies (miss rate 20-40%)', 'Under 5 seconds'],
                        ['Can book appointments', 'No', 'Yes', 'Yes'],
                        ['Can answer service questions', 'No (script only)', 'Yes', 'Yes'],
                        ['Availability', '24/7 (with surge charges)', 'Shift-dependent', '24/7/365'],
                        ['Scales with volume', 'Per-minute billing adds up', 'No (fixed capacity)', 'Yes (no per-call cost)'],
                      ].map(([factor, answering, staff, ai]) => (
                        <tr key={factor} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium">{factor}</td>
                          <td className="px-4 py-3 text-gray-600">{answering}</td>
                          <td className="px-4 py-3 text-gray-600">{staff}</td>
                          <td className="px-4 py-3 text-green-700 font-semibold">{ai}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>

            {/* Section 8 — Implementation Checklist */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="implementation-checklist" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Your After-Hours Lead Capture Checklist
              </h2>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Whether you choose an answering service, on-call staff, or AI, here's the minimum
                  you need to stop bleeding after-hours leads:
                </p>

                <div className="my-8 space-y-4">
                  {[
                    'Every call answered live (or by AI) within 60 seconds, including evenings and weekends',
                    'Instant SMS auto-reply on missed calls: "Got your message. How can we help?"',
                    'Website chat or form that triggers an immediate response (not a "we\'ll get back to you" confirmation)',
                    'Calendar integration so appointments can be booked without human involvement',
                    'Lead qualification built in: collect name, address, service needed, urgency level',
                    'Next-morning summary of all after-hours interactions sent to your phone',
                    'Google Business Profile messaging enabled with instant auto-reply',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>

                <p>
                  The goal isn't perfection on day one. The goal is making sure no lead that contacts you
                  after 5 PM ever hits voicemail again.
                </p>
              </div>
            </motion.section>

            {/* FAQ Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 id="faq" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
                Frequently Asked Questions
              </h2>

              <div className="space-y-8 text-gray-700 leading-relaxed mt-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">What percentage of home service leads come in after hours?</h3>
                  <p>
                    Research shows 42% on average, with emergency-driven trades like plumbing and HVAC seeing
                    48-55%. The exact number depends on your marketing channels and local market, but it's
                    consistently in the 35-55% range for most service businesses.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Do people actually book appointments through AI at night?</h3>
                  <p>
                    Yes. When given the option to book instantly vs. "we'll call you back tomorrow," the
                    vast majority choose to book now. AI systems with calendar integration report 3-4x
                    higher after-hours conversion rates compared to voicemail + next-day callback.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">How fast does an AI receptionist actually respond?</h3>
                  <p>
                    Modern AI phone systems answer in under 5 seconds. For text/chat, responses are
                    typically under 2 seconds. This is well within the 60-second window that produces
                    the highest booking rates.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">What if I only get a few leads per week after hours?</h3>
                  <p>
                    Even a handful of recovered leads per month can pay for the system many times over.
                    If your average job is $400 and you capture just 3 extra jobs per month from
                    after-hours leads, that's $1,200/month in revenue from a $549-4997/month investment.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Can AI handle emergency vs. non-emergency calls differently?</h3>
                  <p>
                    Yes. AI systems can be configured to triage calls based on urgency. True emergencies
                    (burst pipe, gas leak, no heat in winter) can trigger an immediate alert to the
                    on-call technician, while routine inquiries get booked for the next available slot.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Will callers know they're talking to AI?</h3>
                  <p>
                    Modern AI voice agents sound natural and conversational. Most callers don't notice
                    or don't care, as long as their problem gets handled quickly. The alternative (voicemail,
                    no answer) is far worse for customer experience than a competent AI that books their
                    appointment in 2 minutes.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Editor's Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-sm font-bold text-blue-800 mb-1">Editor's Note</p>
              <p className="text-blue-900 text-sm leading-relaxed">
                The 42% after-hours figure comes from a 2026 cross-industry benchmark. Your actual number
                depends on your market, services, and marketing mix. The best way to find your real number:
                check your call logs for the past 90 days and count how many inbound calls and form
                submissions arrived outside your operating hours.
              </p>
            </div>

            {/* Related Articles */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/blog/why-speed-matters" className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-300">
                  <p className="font-semibold text-gray-900">The 391% Advantage: Responding in 60 Seconds</p>
                  <p className="text-sm text-gray-500 mt-1">Why speed-to-lead is the single biggest lever for local business growth.</p>
                </Link>
                <Link to="/blog/best-after-hours-answering-service" className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-300">
                  <p className="font-semibold text-gray-900">Best After-Hours Answering Service</p>
                  <p className="text-sm text-gray-500 mt-1">Compare your options for 24/7 call coverage.</p>
                </Link>
                <Link to="/blog/never-miss-a-call-after-business-hours" className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-300">
                  <p className="font-semibold text-gray-900">Never Miss a Call After Business Hours</p>
                  <p className="text-sm text-gray-500 mt-1">How smart businesses handle after-hours calls with AI.</p>
                </Link>
                <Link to="/blog/speed-to-lead-local-business" className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-300">
                  <p className="font-semibold text-gray-900">Speed to Lead for Local Businesses</p>
                  <p className="text-sm text-gray-500 mt-1">The complete guide to faster lead response.</p>
                </Link>
              </div>
            </div>

          </article>
        </div>
      </div>

      {/* Bottom CTA */}
      <FinalCTA {...BLOG_CTA} />

      <Footer />
    </div>
  );
};

export default BlogAfterHoursLeadResponse;
