import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, TrendingUp, Zap, Users, HelpCircle, Clock as ClockIcon, AlertCircle, Globe } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import { updateMetaDescription } from '../lib/utils';
import { createArticleSchema, createFAQSchema, injectSchemas } from '../lib/schema';

const pageFaqs = [
  { question: 'Does an AI agent replace a receptionist?', answer: 'For most local businesses, yes — AI agents can handle 80-90% of receptionist tasks. They answer calls, schedule appointments, answer questions, and handle follow-ups. However, AI agents work best when they can transfer complex calls to your team.' },
  { question: 'Is AI reliable with accents and languages?', answer: "Modern AI agents, including Boltcall, are trained on diverse accents and can handle multiple languages. They're often more consistent than human agents who might struggle with unfamiliar accents." },
  { question: 'Can I use both AI and a call center?', answer: 'Absolutely. Many businesses use AI agents for initial contact and basic inquiries, then transfer complex calls to human agents or call centers. Boltcall can seamlessly transfer calls to your team or a call center when needed.' },
  { question: "What happens if the AI can't answer a question?", answer: "Boltcall is designed to handle most common inquiries, but when it encounters something it can't handle, it can transfer the call to your team, take a message, or schedule a callback. You can configure it to escalate specific types of inquiries automatically." },
];

const AIAgentComparison: React.FC = () => {
  useEffect(() => {
    document.title = 'AI Agent Comparison: Boltcall vs Traditional Call Centers (2026)';
    updateMetaDescription("Compare AI agents vs traditional call centers. See how Boltcall's AI receptionist beats call centers on cost, speed, availability, and lead capture.");

    return injectSchemas([
      createArticleSchema({
        headline: 'AI Agent Comparison: Boltcall vs Traditional Call Centers',
        description: "Compare AI agents vs traditional call centers on cost, speed, availability, and lead capture.",
        datePublished: '2025-02-10',
        dateModified: '2026-04-09',
        url: '/ai-agent-comparison',
      }),
      createFAQSchema(pageFaqs),
    ]);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "AI Agent Comparison", "item": "https://boltcall.org/ai-agent-comparison"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-12"
          >
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'AI Agent Comparison', href: '/ai-agent-comparison' },
            ]} />

            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">Comparison Guide</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              AI Agent Comparison: <span className="text-blue-600">Boltcall</span> vs. Traditional Call Centers
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>By the Boltcall Team</span>
              <span>&middot;</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Updated April 2026</span>
              </div>
              <span>&middot;</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        {/* TL;DR Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-12 bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3">TL;DR</p>
          <p className="text-gray-800 font-medium mb-3">
            AI agents like Boltcall cost 10–20× less than traditional call centers, respond instantly 24/7, and never miss a lead — making them the clear winner for local businesses that rely on inbound calls.
          </p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span><strong>Cost:</strong> $549-897/month vs. $2,000–5,000/month for a call center</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span><strong>Speed:</strong> 0–5 second response vs. 2–5 minute average hold</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span><strong>Availability:</strong> 24/7/365 vs. business hours only</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span><strong>Missed leads:</strong> 0% vs. 30–50% during peak hours at call centers</span></li>
          </ul>
        </motion.div>

        {/* Quick Comparison Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Quick Comparison Table
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Feature</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Boltcall AI Agent</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Traditional Call Center</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Cost per month</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">$549-897/month</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">$2,000-5,000/month</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Response time</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                      <Zap className="w-4 h-4" />
                      Instant (0-5 seconds)
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                      <ClockIcon className="w-4 h-4" />
                      2-5 minutes average
                    </span>
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Quality</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Consistent, professional, never tired</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Varies by agent, training, and time of day</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Availability</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                      <Globe className="w-4 h-4" />
                      24/7/365
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Business hours only (typically 8am-6pm)</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Missed-lead rate</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-green-600 font-semibold">Answers every call, 24/7</span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-red-600 font-semibold">30-50% during peak hours</span>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Setup time</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">30 minutes</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">2-4 weeks</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Multi-channel support</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-green-600 font-semibold">Calls, SMS, forms, follow-ups</span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Phone calls only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Pros and Cons */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Pros and Cons
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* AI Agents */}
            <div>
              <div className="flex items-start gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">AI Agents</h3>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Pros
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Instant response (0-5 seconds)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>24/7 availability, never closes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Affordable ($549-897/month)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Handles multiple channels (calls, SMS, forms)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Consistent quality, never tired or stressed</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Automated follow-ups and reminders</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Quick setup (30 minutes)</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Cons
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>May struggle with very complex, multi-step sales processes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Less personal touch than human agents</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Requires initial setup and configuration</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Call Centers */}
            <div>
              <div className="flex items-start gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Call Centers</h3>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Pros
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Human touch and empathy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Can handle very complex sales processes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Good for long qualification calls</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span>Can adapt to unique situations</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Cons
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Expensive ($2,000-5,000/month + per-minute fees)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Business hours only (misses after-hours leads)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Wait times (2-5 minutes average)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>High missed-call rate (30-50% during peak)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Quality varies by agent and training</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Long setup time (2-4 weeks)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Phone calls only (no SMS, forms, or automated follow-ups)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2 mt-1">•</span>
                    <span>Agent turnover affects consistency</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* When Boltcall Wins */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            When Boltcall Wins
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Immediate Response</h3>
              <p className="text-gray-700 leading-relaxed">
                While call centers make customers wait 2-5 minutes (or longer during peak times), Boltcall's AI 
                answers every call instantly—within 0-5 seconds. Research shows that responding within 60 seconds 
                increases conversion rates by 391%. With Boltcall, you never miss that critical window.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">24/7 Availability</h3>
              <p className="text-gray-700 leading-relaxed">
                Traditional call centers operate during business hours (typically 8am-6pm). That means 66% of 
                the day, your leads are going unanswered. Boltcall works 24/7/365—answering calls at 11 PM on Sunday, 
                on holidays, and during lunch breaks. Your business never closes, so your customer service shouldn't either.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Follow-ups</h3>
              <p className="text-gray-700 leading-relaxed">
                Call centers handle the initial call, but then what? Someone has to manually follow up, send reminders, 
                and nurture leads. Boltcall automates all of this—sending SMS reminders, following up on form submissions, 
                and keeping conversations warm. It's like having a full customer service team that never sleeps.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Works with Forms, SMS, Calls</h3>
              <p className="text-gray-700 leading-relaxed">
                Call centers only handle phone calls. Boltcall handles calls, SMS messages, form submissions, and 
                website chat—all in one platform. When a lead fills out a form on your website at 2 AM, Boltcall 
                responds instantly via SMS. When someone texts you, Boltcall handles it. It's a complete customer 
                engagement system, not just a phone service.
              </p>
            </div>
          </div>
        </motion.section>

        {/* When Call Centers Might Be Better */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            When Call Centers Might Be Better
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Very Complex Sales Processes</h3>
              <p className="text-gray-700 leading-relaxed">
                If your sales process requires multiple back-and-forth conversations, extensive customization, or 
                complex negotiations that can't be automated, a human call center might be better. However, for most 
                local service businesses (dental, HVAC, auto repair, etc.), AI agents handle the vast majority of 
                inquiries perfectly.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Long Qualification Calls</h3>
              <p className="text-gray-700 leading-relaxed">
                If your typical sales call takes 30+ minutes and requires deep relationship building, human agents 
                might be more effective. But for most businesses, the majority of calls are quick inquiries that AI 
                handles excellently—and AI can always transfer complex calls to your team.
              </p>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Does an AI agent replace a receptionist?
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    For most local businesses, yes—AI agents can handle 80-90% of receptionist tasks. They answer calls, 
                    schedule appointments, answer questions, and handle follow-ups. However, AI agents work best when they 
                    can transfer complex calls to your team. Think of it as having a receptionist that never sleeps, never 
                    takes breaks, and never misses a call—but can still hand off to humans when needed.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Is AI reliable with accents and languages?
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Modern AI agents, including Boltcall, are trained on diverse accents and can handle multiple languages. 
                    They're often more consistent than human agents who might struggle with unfamiliar accents. Boltcall 
                    supports multiple languages and can be configured for your specific customer base. If you serve a 
                    multilingual community, AI agents can actually be more reliable than call centers that may not have 
                    agents fluent in all languages you need.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Can I use both AI and a call center?
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Absolutely. Many businesses use AI agents for initial contact and basic inquiries, then transfer 
                    complex calls to human agents or call centers. This hybrid approach gives you the best of both worlds: 
                    instant response and 24/7 coverage from AI, plus human touch for complex situations. Boltcall can 
                    seamlessly transfer calls to your team or a call center when needed.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What happens if the AI can't answer a question?
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Boltcall is designed to handle most common inquiries, but when it encounters something it can't handle, 
                    it can transfer the call to your team, take a message, or schedule a callback. You can also configure 
                    it to escalate specific types of inquiries automatically. The goal is to handle 80-90% of calls 
                    automatically, freeing your team to focus on the complex cases that truly need human attention.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </article>


      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes vs. Generic AI Agents</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How Boltcall compares to general-purpose AI agent platforms across key capabilities</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'Industry-Specific Training', desc: 'Pre-trained on your trade, not a blank general-purpose AI' },
            { label: 'Phone Call Handling', desc: 'Answers inbound voice calls — not just text chat or web forms' },
            { label: 'Live Calendar Integration', desc: 'Books appointments directly vs. only collecting lead info' },
            { label: 'SMS Automation', desc: 'Sends follow-up texts and reminders without any configuration' },
            { label: 'Setup in 30 Minutes', desc: 'Goes live the same day vs. weeks of custom AI agent development' },
            { label: 'Flat Monthly Pricing', desc: 'Predictable cost with no per-interaction fees or usage overage charges' },
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

export default AIAgentComparison;

