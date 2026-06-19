// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Phone, Clock, DollarSign, Zap, Shield, Star, Wrench, Calendar } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AiReceptionistForPlumbers: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Receptionist for Plumbers: Answer Every Call 24/7 (2026 Guide)';
    updateMetaDescription('AI receptionist for plumbers answers calls 24/7, books appointments, and qualifies emergencies. Stop missing leads. Setup in 24 hours with Boltcall.');

    // Article schema
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "AI Receptionist for Plumbers: Answer Every Call 24/7 (2026 Guide)",
      "description": "AI receptionist for plumbers answers calls 24/7, books appointments, and qualifies emergencies. Stop missing leads. Setup in 24 hours with Boltcall.",
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
      "datePublished": "2026-03-23",
      "dateModified": "2026-03-23",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-for-plumbers"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      },
      "articleSection": "Industry Guide",
      "keywords": ["ai receptionist for plumbers", "plumber ai receptionist", "plumbing ai answering service", "ai phone receptionist plumbing", "24/7 plumber receptionist"]
    };

    // FAQ schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does an AI receptionist work for a plumbing business?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An AI receptionist for plumbers answers every incoming call using natural-sounding voice AI. It greets the caller, identifies whether the issue is an emergency or routine job, captures the customer's name, address, and problem description, and books an appointment directly on your calendar. It also sends an instant SMS confirmation to the customer and can route true emergencies to your on-call number."
          }
        },
        {
          "@type": "Question",
          "name": "Can an AI receptionist handle plumbing emergencies?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. A properly configured AI receptionist can distinguish between emergency calls (burst pipes, flooding, gas leaks) and routine requests (dripping faucets, quote inquiries). Emergency calls are immediately routed to your on-call technician, while routine calls are handled by booking appointments or capturing details for follow-up."
          }
        },
        {
          "@type": "Question",
          "name": "How much does a plumbing AI receptionist cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An AI receptionist for plumbers typically costs between $99 and $500 per month depending on the provider and features. Boltcall offers a comprehensive plan at $389/month that includes 24/7 AI phone reception, a professional website, AI chatbot, speed-to-lead auto-reply, and Google review automation. This is 85-90% cheaper than hiring a full-time receptionist."
          }
        },
        {
          "@type": "Question",
          "name": "Will customers know they're talking to AI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Modern AI voice technology is remarkably natural. Most callers cannot distinguish between an AI receptionist and a human. The AI uses natural language processing to understand context, respond conversationally, and handle complex questions about your plumbing services. It sounds professional and friendly, representing your business exactly as you would."
          }
        },
        {
          "@type": "Question",
          "name": "How quickly can I set up an AI receptionist for my plumbing company?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "With Boltcall, you can have an AI receptionist live and answering calls within 24 hours. The setup process involves providing your business details, services offered, pricing ranges, and scheduling preferences. The AI is then trained on plumbing-specific terminology and your unique business rules. No technical knowledge is required."
          }
        }
      ]
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();
    const existingFaqScript = document.getElementById('faq-schema');
    if (existingFaqScript) existingFaqScript.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist for Plumbers", "item": "https://boltcall.org/blog/ai-receptionist-for-plumbers"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
      const faqScriptToRemove = document.getElementById('faq-schema');
      if (faqScriptToRemove) faqScriptToRemove.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-indigo-100">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <Wrench className="w-4 h-4" />
              <span className="font-semibold">Industry Guide</span>
            </div>
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'AI Receptionist for Plumbers', href: '/blog/ai-receptionist-for-plumbers' }
            ]} />

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              <span className="text-blue-600">AI Receptionist</span> for Plumbers: Answer Every Call 24/7
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>March 23, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>10 min read</span>
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
                When a homeowner's basement is flooding at 2 AM, they don't leave a voicemail and wait. They call the next plumber on the list. Every missed call is a lost job — and for most plumbing businesses, that adds up to $50,000-$100,000 in lost revenue every single year. An AI receptionist solves this by answering every call, qualifying the job, and booking it on your calendar — 24 hours a day, 365 days a year.
              </p>
            </motion.div>

            {/* AEO Direct Answer Block */}
            <div className="bg-gray-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-12">
              <p className="text-lg text-gray-800 leading-relaxed font-medium">
                An AI receptionist for plumbers answers every customer call 24/7, qualifies emergency vs routine jobs, books appointments, and sends instant follow-ups — all without hiring staff. Plumbing businesses using AI receptionists report capturing 40-60% more leads by eliminating missed calls.
              </p>
            </div>

            {/* Section 1: Why Plumbers Need an AI Receptionist */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Why Plumbers Need an AI Receptionist
              </h2>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Plumbing is one of the most call-dependent trades. Customers don't browse and compare — they have a problem right now and they need someone who picks up the phone. Here's why the traditional approach is costing you money:
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-red-50 border-l-4 border-red-400 p-5 rounded-r-xl">
                  <div className="text-3xl font-bold text-red-600 mb-2">62%</div>
                  <p className="text-gray-700">of calls to local businesses go unanswered — more than half your potential jobs never even get a chance.</p>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-xl">
                  <div className="text-3xl font-bold text-blue-600 mb-2">78%</div>
                  <p className="text-gray-700">of plumbing jobs go to the first plumber who responds. Speed isn't just an advantage — it's the game.</p>
                </div>
                <div className="bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl">
                  <div className="text-3xl font-bold text-orange-600 mb-2">$50K-$100K</div>
                  <p className="text-gray-700">average annual revenue lost by plumbing businesses due to missed calls and slow response times.</p>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-r-xl">
                  <div className="text-3xl font-bold text-green-600 mb-2">391%</div>
                  <p className="text-gray-700">higher conversion rate when responding to leads within 60 seconds vs. waiting even 5 minutes.</p>
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Plumbing customers call during emergencies — nights, weekends, and holidays are peak times for burst pipes, overflowing toilets, and water heater failures. If you're not answering those calls, your competitor is. An AI receptionist ensures you never miss another opportunity, regardless of what time it is or how busy your crew is on a job site.
                </p>
              </div>
            </motion.section>

            {/* Section 2: What an AI Receptionist Does for Your Plumbing Business */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>What an AI Receptionist Does for Your Plumbing Business
              </h2>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">
                  An AI receptionist isn't just a fancy voicemail. It's a fully capable virtual team member that handles the entire front-office workflow — from the moment a customer calls to the moment their appointment is confirmed.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Answers Every Call 24/7/365</h3>
                  </div>
                  <p className="text-gray-700">
                    Picks up on the first ring at 2 AM on Christmas Day the same way it does at 10 AM on a Tuesday. No breaks, no sick days, no missed calls — ever.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Qualifies Emergency vs Routine</h3>
                  </div>
                  <p className="text-gray-700">
                    Distinguishes between a burst pipe that needs immediate attention and a dripping faucet that can wait until Monday. Emergency calls get routed to your on-call number instantly.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Books Appointments Directly</h3>
                  </div>
                  <p className="text-gray-700">
                    Syncs with your calendar and books jobs in available time slots. The customer hangs up with a confirmed appointment — no back-and-forth required.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Sends Instant SMS Confirmation</h3>
                  </div>
                  <p className="text-gray-700">
                    The customer receives an SMS with appointment details within seconds of hanging up. This reduces no-shows and builds trust immediately.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Wrench className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Captures Full Job Details</h3>
                  </div>
                  <p className="text-gray-700">
                    Records the customer's name, address, phone number, and a description of the plumbing issue. You arrive at the job site knowing exactly what to expect.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <Star className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Follows Up with Warm Leads</h3>
                  </div>
                  <p className="text-gray-700">
                    If a caller doesn't book immediately, the AI sends a follow-up text or email. It keeps your pipeline warm without you lifting a finger.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Section 3: Cost Comparison */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>How Much Does an AI Receptionist Cost for Plumbers?
              </h2>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">
                  The biggest advantage of an AI receptionist is the math. Here's how the three main options compare for a plumbing business:
                </p>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="text-left p-4 font-semibold">Solution</th>
                      <th className="text-left p-4 font-semibold">Monthly Cost</th>
                      <th className="text-left p-4 font-semibold">Availability</th>
                      <th className="text-left p-4 font-semibold">Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-red-50 border-b border-gray-200">
                      <td className="p-4 font-semibold text-gray-900">Full-time receptionist</td>
                      <td className="p-4 text-red-600 font-bold">$2,800-$4,000</td>
                      <td className="p-4 text-gray-700">40 hrs/week</td>
                      <td className="p-4 text-gray-700">Depends on workload</td>
                    </tr>
                    <tr className="bg-yellow-50 border-b border-gray-200">
                      <td className="p-4 font-semibold text-gray-900">Answering service</td>
                      <td className="p-4 text-yellow-700 font-bold">$200-$500</td>
                      <td className="p-4 text-gray-700">24/7 but slow</td>
                      <td className="p-4 text-gray-700">30 sec - 3 min</td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="p-4 font-semibold text-gray-900">Boltcall AI Receptionist</td>
                      <td className="p-4 text-green-600 font-bold">$389/mo</td>
                      <td className="p-4 text-gray-700">24/7 instant</td>
                      <td className="p-4 text-gray-700">&lt;1 second</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
                <h3 className="text-2xl font-bold mb-4">The ROI Is Simple</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold mb-2">2 jobs</div>
                    <div className="text-blue-100 text-sm">Extra jobs per month needed to break even</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold mb-2">$300</div>
                    <div className="text-blue-100 text-sm">Average plumbing job value</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold mb-2">$600+</div>
                    <div className="text-blue-100 text-sm">Revenue from just 2 extra jobs vs $389 cost</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                <p className="text-lg text-gray-800">
                  <strong>Bottom Line:</strong> If you win just <strong className="text-blue-600">2 extra plumbing jobs per month</strong> at an average of $300 each, the AI receptionist more than pays for itself. Most plumbers capture 5-10+ additional jobs per month once they stop missing calls.
                </p>
              </div>
            </motion.section>

            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"Trades businesses are sitting on a goldmine of unrealized revenue. The jobs are out there — customers are calling. But without a system that answers every call and captures every lead, you're spending money on advertising just to send those leads to your competitors."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Tommy Mello, Founder, A1 Garage Door Service &amp; Author, Home Service Millionaire</footer>
            </blockquote>

            {/* Section 4: Real-World Scenarios */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Real-World Scenarios: AI Receptionist in Action
              </h2>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">
                  Here's exactly how an AI receptionist handles three common plumbing call scenarios — situations that would otherwise result in a lost customer.
                </p>
              </div>

              {/* Scenario 1 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <h3 className="text-xl font-bold text-gray-900">Emergency: Burst Pipe at 2 AM</h3>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p><strong>The Call:</strong> A homeowner discovers their kitchen is flooding from a burst pipe at 2 AM on a Saturday night.</p>
                  <p><strong>What the AI Does:</strong></p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Answers on the first ring with a professional greeting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Identifies "burst pipe" and "flooding" as emergency keywords</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Captures the customer's name, address, and phone number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Immediately routes the call to your on-call technician</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Sends a confirmation SMS: "Help is on the way"</span>
                    </li>
                  </ul>
                  <p><strong>Result:</strong> Customer gets help within minutes. Without AI, this call goes to voicemail and the customer calls your competitor.</p>
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <h3 className="text-xl font-bold text-gray-900">Routine: Quote Request During Lunch Rush</h3>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p><strong>The Call:</strong> A property manager calls at noon to get a quote for replacing fixtures in a rental unit. You're on a job site with your hands full.</p>
                  <p><strong>What the AI Does:</strong></p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Answers professionally while you're busy on another job</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Identifies this as a routine (non-emergency) request</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Asks qualifying questions: number of fixtures, property type, preferred dates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Books an on-site estimate appointment on your calendar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Sends SMS confirmation with appointment details to the caller</span>
                    </li>
                  </ul>
                  <p><strong>Result:</strong> You finish your current job without interruption and have a new appointment waiting on your calendar.</p>
                </div>
              </div>

              {/* Scenario 3 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <h3 className="text-xl font-bold text-gray-900">After-Hours: Bathroom Renovation Inquiry</h3>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p><strong>The Call:</strong> A homeowner calls at 8 PM on a Wednesday to discuss a bathroom renovation project. You've already clocked out for the day.</p>
                  <p><strong>What the AI Does:</strong></p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Answers warmly and discusses the scope of bathroom renovations you offer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Captures project details: bathroom size, desired fixtures, timeline, budget range</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Explains your consultation process and typical project timelines</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Books a consultation for the next available morning slot</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Sends a follow-up email with your portfolio and project FAQ the next morning</span>
                    </li>
                  </ul>
                  <p><strong>Result:</strong> A high-value renovation lead is captured and nurtured — a job that could be worth $5,000-$15,000 — instead of lost to voicemail.</p>
                </div>
              </div>
            </motion.section>

            {/* Section 5: Boltcall for Plumbers — What's Included */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Boltcall for Plumbers: What's Included
              </h2>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">
                  Boltcall isn't just an AI receptionist — it's a complete customer communication platform built for service businesses like plumbing companies. Here's everything you get:
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 mb-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">AI Phone Receptionist</p>
                      <p className="text-sm text-gray-600">Trained on plumbing terminology — knows the difference between a slab leak and a running toilet</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Professional Business Website</p>
                      <p className="text-sm text-gray-600">A conversion-optimized website for your plumbing business — included free</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">AI Website Chatbot</p>
                      <p className="text-sm text-gray-600">Engages website visitors, answers common plumbing questions, and captures leads around the clock</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Speed-to-Lead Auto-Reply</p>
                      <p className="text-sm text-gray-600">Responds to every form submission and missed call in under 60 seconds via SMS</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Google Review Automation</p>
                      <p className="text-sm text-gray-600">Automatically requests Google reviews after completed jobs to boost your local SEO ranking</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Appointment Booking Integration</p>
                      <p className="text-sm text-gray-600">Syncs with your existing calendar so the AI books jobs in your real availability</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">24-Hour Setup Guarantee</p>
                      <p className="text-sm text-gray-600">Your AI receptionist is live and answering calls within 24 hours — or you get a free AI receptionist added to your plan</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"In the home services industry, the difference between a $500K plumbing company and a $2M one often isn't the quality of the work — it's the quality of the front office. AI receptionists let small plumbing operations run a big-company front desk at startup pricing."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Ken Goodrich, CEO, Goettl Air Conditioning &amp; Plumbing</footer>
            </blockquote>

            {/* Section 6: FAQ */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Frequently Asked Questions
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How does an AI receptionist work for a plumbing business?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    An AI receptionist for plumbers answers every incoming call using natural-sounding voice AI. It greets the caller, identifies whether the issue is an emergency or routine job, captures the customer's name, address, and problem description, and books an appointment directly on your calendar. It also sends an instant SMS confirmation to the customer and can route true emergencies to your on-call number.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Can an AI receptionist handle plumbing emergencies?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Yes. A properly configured AI receptionist can distinguish between emergency calls (burst pipes, flooding, gas leaks) and routine requests (dripping faucets, quote inquiries). Emergency calls are immediately routed to your on-call technician, while routine calls are handled by booking appointments or capturing details for follow-up.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How much does a plumbing AI receptionist cost?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    An AI receptionist for plumbers typically costs between $99 and $500 per month depending on the provider and features. Boltcall offers a comprehensive plan at $389/month that includes 24/7 AI phone reception, a professional website, AI chatbot, speed-to-lead auto-reply, and Google review automation. This is 85-90% cheaper than hiring a full-time receptionist at $2,800-$4,000/month.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Will customers know they're talking to AI?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Modern AI voice technology is remarkably natural. Most callers cannot distinguish between an AI receptionist and a human. The AI uses natural language processing to understand context, respond conversationally, and handle complex questions about your plumbing services. It sounds professional and friendly, representing your business exactly as you would.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">How quickly can I set up an AI receptionist for my plumbing company?</h3>
                  <p className="text-gray-700 leading-relaxed">
                    With Boltcall, you can have an AI receptionist live and answering calls within 24 hours. The setup process involves providing your business details, services offered, pricing ranges, and scheduling preferences. The AI is then trained on plumbing-specific terminology and your unique business rules. No technical knowledge is required.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* CTA Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-white"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Stop Missing Plumbing Calls Today</h2>
              <p className="text-blue-100 text-lg mb-6 max-w-2xl">
                Every missed call is a job your competitor gets. Boltcall's AI receptionist answers every call, qualifies emergencies, books appointments, and follows up with leads — 24/7, starting within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/setup" className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
                  Start Free Setup
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/pricing" className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/30">
                  View Pricing
                  <DollarSign className="w-5 h-5" />
                </Link>
              </div>
            </motion.section>

            {/* Related Articles */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Link to="/blog/ai-receptionist-cost-pricing" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Pricing Guide</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">AI Receptionist Cost & Pricing: The Complete 2026 Guide</h3>
                  <p className="text-gray-600 mt-2 text-sm">How much does an AI receptionist really cost? Compare pricing across all major providers.</p>
                </Link>
                <Link to="/blog/speed-to-lead-local-business" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Lead Generation</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">Speed-to-Lead: Why Responding in 60 Seconds Wins the Job</h3>
                  <p className="text-gray-600 mt-2 text-sm">Research shows 391% higher conversion when you respond within 60 seconds. Here's why speed wins.</p>
                </Link>
                <Link to="/compare/boltcall-vs-podium" className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <span className="text-sm text-blue-600 font-medium">Comparison</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">Boltcall vs Podium: Which Is Right for Your Business?</h3>
                  <p className="text-gray-600 mt-2 text-sm">A detailed comparison of features, pricing, and capabilities between Boltcall and Podium.</p>
                </Link>
              </div>
            </motion.section>

          </article>

          {/* Sidebar — Table of Contents */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>


      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Plumbing Businesses</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Complete AI receptionist system built for plumbing companies — every plan includes:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Emergency Call Answering', desc: 'Captures every late-night and weekend call before it goes to a competitor' },
            { label: 'Appointment Booking', desc: 'Books service calls and estimates into your dispatch calendar automatically' },
            { label: 'Lead Qualification', desc: 'Collects issue type, address, and urgency before routing to your team' },
            { label: 'Instant SMS Follow-Up', desc: 'Auto-texts missed callers within seconds of the missed call' },
            { label: 'No-Show Reminders', desc: 'Automated texts cut appointment cancellations by 40%+' },
            { label: 'Monthly Revenue Report', desc: 'See every call answered, job booked, and revenue recovered' },
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

export default AiReceptionistForPlumbers;
