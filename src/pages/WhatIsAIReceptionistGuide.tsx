// @ts-nocheck
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { motion } from 'framer-motion';
import { Phone, Calendar, MessageSquare, Zap, CheckCircle, Clock, DollarSign, Shield, ArrowRight, Star, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { BLOG_CTA } from '../components/FinalCTA';
import Breadcrumbs from '../components/Breadcrumbs';

const WhatIsAIReceptionistGuide: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'What Is an AI Receptionist? Complete Guide (2026)';
    updateMetaDescription('An AI receptionist is a fully automated phone answering system that handles calls, books appointments, and captures leads 24/7 — no human staff required. Learn how it works, what it costs, and who needs one.');
  }, []);

  useSchemaInjector([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "What Is an AI Receptionist? Complete Guide (2026)",
      "description": "An AI receptionist is a fully automated phone answering system that handles calls, books appointments, and captures leads 24/7 — no human staff required.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall",
        "url": "https://boltcall.org"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/logo.png"
        }
      },
      "datePublished": "2026-01-15",
      "dateModified": "2026-05-24",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/what-is-ai-receptionist-guide"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An AI receptionist is a fully automated phone answering system powered by artificial intelligence. It answers incoming calls, greets callers, collects information, books appointments, and sends follow-up messages — all without any human staff involved. Unlike a human receptionist or a hybrid answering service, an AI receptionist operates 24 hours a day, 7 days a week, at a fixed monthly cost with no per-call fees."
          }
        },
        {
          "@type": "Question",
          "name": "How does an AI receptionist work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An AI receptionist uses a combination of voice recognition (speech-to-text), natural language processing (NLP), and conversational AI to understand what callers say and respond appropriately. When a call comes in, the AI answers instantly, identifies the caller's need, asks qualifying questions, and takes action — booking an appointment, capturing a lead, transferring to a staff member, or sending a follow-up text. The entire interaction happens in real time with a natural-sounding voice."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between an AI receptionist and a human receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The key differences are cost, availability, and consistency. A human receptionist costs $35,000–$50,000 per year in salary plus benefits, works 8-hour shifts, and varies in quality. An AI receptionist costs $500–$1,000 per month, works 24/7 including weekends and holidays, and delivers consistent responses on every call. AI receptionists cannot handle highly nuanced or emotionally sensitive conversations as well as an experienced human, but for standard call handling — booking, lead capture, and FAQ answering — AI performs at least as well."
          }
        },
        {
          "@type": "Question",
          "name": "How much does an AI receptionist cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI receptionists typically cost between $99 and $1,000 per month depending on features and call volume. Entry-level plans start around $99/month for basic call answering with limited minutes. Full-featured platforms like Boltcall start at $549/month and include unlimited AI call answering, appointment booking, lead capture, follow-up texts, and no per-call fees. Hybrid AI-plus-human services like Smith.ai charge per call ($2.10–$2.40/call) on top of a base monthly fee, making costs unpredictable at high volume."
          }
        },
        {
          "@type": "Question",
          "name": "What businesses benefit most from an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Local service businesses with high inbound call volume benefit most: HVAC companies, plumbers, dentists, law firms, med spas, roofing contractors, pest control, and solar installers. Any business where missing a call means losing a customer — and where calls come in outside business hours — gets immediate ROI from an AI receptionist. The technology is especially valuable for solo operators and small teams that cannot afford to hire a dedicated front desk person."
          }
        },
        {
          "@type": "Question",
          "name": "Can an AI receptionist book appointments?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Modern AI receptionists integrate directly with calendar systems including Google Calendar, Outlook, Calendly, and Cal.com. When a caller wants to book an appointment, the AI checks real-time availability, offers open slots, confirms the booking, and sends the caller a confirmation text — all during the same call, with no human involvement required."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "What Is an AI Receptionist? Complete Guide (2026)",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".speakable-intro"]
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "What Is an AI Receptionist?", "item": "https://boltcall.org/blog/what-is-ai-receptionist-guide" }
      ]
    }
  ]);

  return (
    <>
      <GiveawayBar />
      <Header />

      <main className="pt-24 min-h-screen bg-white">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Complete Guide
                </span>
              </div>
              <Breadcrumbs
                items={[
                  { label: 'Blog', href: '/blog' },
                  { label: 'What Is an AI Receptionist?', href: '/blog/what-is-ai-receptionist-guide' }
                ]}
              />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                What Is an <span className="text-blue-600">AI Receptionist</span>? Complete Guide (2026)
              </h1>
              <div className="flex items-center text-gray-600 mb-6 space-x-6 flex-wrap gap-y-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  <span className="text-sm">Updated May 6, 2026</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">12 min read</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="text-sm">Boltcall Team</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Direct Answer Block — speakable */}
          <div className="speakable-intro bg-blue-50 border-l-4 border-blue-500 p-6 mb-10 rounded-r-lg">
            <p className="text-lg font-medium text-gray-900">
              <strong>Quick Answer:</strong> An AI receptionist is a fully automated phone answering system powered by artificial intelligence. It answers every incoming call 24/7, books appointments, captures leads, and sends follow-up texts — with no human receptionists involved. Businesses use AI receptionists to stop missing calls after hours, eliminate phone tag, and respond to every new lead in under 60 seconds.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">

            {/* Section 1 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Phone className="h-7 w-7 text-blue-600 flex-shrink-0" />
                What Is an AI Receptionist?
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                An AI receptionist is software that answers your business phone calls using artificial intelligence — specifically a combination of voice recognition, natural language processing, and a conversational AI model. When a call comes in, the AI picks up instantly, understands what the caller needs, and takes action: booking an appointment, capturing a lead, answering a FAQ, or transferring to the right person.
              </p>
              <p className="text-lg text-gray-700 mb-4">
                Unlike a human receptionist, an AI receptionist is available 24 hours a day, 7 days a week, including holidays. It never calls in sick, never puts a caller on hold to check a schedule, and handles every call with identical professionalism. Most AI receptionists today use large language models (LLMs) to understand unstructured, natural conversation rather than forcing callers through rigid phone menus.
              </p>
              <p className="text-lg text-gray-700 mb-4">
                An AI receptionist is not the same as an IVR (interactive voice response) system or a phone tree. Those systems require callers to press numbered options and cannot understand free-form speech. A modern AI receptionist holds a real conversation, adapts to what the caller says, and resolves their need without making them navigate menus.
              </p>
              <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-100">
                <p className="font-semibold text-gray-900 mb-2">Key distinction:</p>
                <ul className="space-y-1 text-gray-700">
                  <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" /> AI receptionist — fully automated, no human staff, 24/7</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" /> Hybrid answering service — AI + human backup agents (e.g. Smith.ai)</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" /> Virtual receptionist — human agents who answer remotely, no AI</li>
                </ul>
              </div>
            </motion.section>

            {/* Section 2 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Zap className="h-7 w-7 text-blue-600 flex-shrink-0" />
                How Does an AI Receptionist Work?
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                When a call comes in, here is what happens step by step:
              </p>
              <ol className="space-y-4 mb-6">
                {[
                  { step: '1', title: 'Instant answer', desc: 'The AI picks up within one ring. No hold music, no voicemail.' },
                  { step: '2', title: 'Greeting', desc: 'The AI greets the caller using your business name and a custom script you define.' },
                  { step: '3', title: 'Understanding intent', desc: 'The AI listens to the caller\'s request using speech-to-text and natural language processing to understand what they need — a booking, a quote, an answer, or a transfer.' },
                  { step: '4', title: 'Taking action', desc: 'The AI books the appointment in your calendar, captures lead details, answers the FAQ, or transfers the call — all in real time during the conversation.' },
                  { step: '5', title: 'Follow-up', desc: 'After the call, the AI sends a confirmation text to the caller and a lead summary to you via email or SMS.' },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{item.step}</span>
                    <div>
                      <span className="font-semibold text-gray-900">{item.title}: </span>
                      <span className="text-gray-700">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-lg text-gray-700 mb-4">
                The technology behind this is a stack of three components. A speech-to-text engine (like Deepgram or Whisper) transcribes what the caller says in real time. An LLM (like GPT-4o or a fine-tuned model) determines the appropriate response based on the caller's words and your business context. A text-to-speech engine (like ElevenLabs) converts the AI's response back into natural-sounding speech before the caller hears it.
              </p>
              <p className="text-lg text-gray-700">
                This full loop — listen, understand, respond — now completes in under 500ms on modern AI receptionist platforms. The experience for the caller feels like a natural phone conversation, not a robot interaction.
              </p>
            </motion.section>

            {/* Section 3 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Calendar className="h-7 w-7 text-blue-600 flex-shrink-0" />
                What Can an AI Receptionist Do?
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Most modern AI receptionist platforms handle the following tasks out of the box:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {[
                  { icon: Phone, task: 'Answer every call instantly, 24/7' },
                  { icon: Calendar, task: 'Book appointments in your calendar in real time' },
                  { icon: MessageSquare, task: 'Send confirmation and reminder texts to callers' },
                  { icon: Zap, task: 'Respond to missed calls or web leads in under 60 seconds' },
                  { icon: CheckCircle, task: 'Answer frequently asked questions about your business' },
                  { icon: Shield, task: 'Qualify leads with custom screening questions' },
                  { icon: Users, task: 'Transfer calls to the right staff member or department' },
                  { icon: DollarSign, task: 'Deliver call summaries and lead reports after every call' },
                ].map((item) => (
                  <div key={item.task} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <item.icon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{item.task}</span>
                  </div>
                ))}
              </div>
              <p className="text-lg text-gray-700">
                More advanced platforms also handle multi-location routing, bilingual conversations, post-appointment Google review requests, CRM integration (HubSpot, Salesforce, GoHighLevel), and web form lead follow-up. The exact capabilities depend on the platform you choose and how you configure it.
              </p>
            </motion.section>

            {/* Section 4 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-blue-600 flex-shrink-0" />
                Who Should Use an AI Receptionist?
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                AI receptionists are most valuable for businesses that:
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Receive 50+ inbound calls per month',
                  'Miss calls after business hours (evenings, weekends)',
                  'Lose leads because callers hang up and call a competitor',
                  'Cannot afford a full-time front desk person ($35,000–$50,000/year)',
                  'Need to book appointments over the phone without staff involvement',
                  'Want to respond to every new lead in under 5 minutes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-lg text-gray-700 mb-4">
                The industries that see the fastest ROI from AI receptionists are local service businesses: HVAC, plumbing, dental practices, law firms (especially PI and family law), med spas, roofing, pest control, solar, and real estate. These businesses share three characteristics: high inbound call volume, strong revenue per customer, and significant after-hours call traffic.
              </p>
              <p className="text-lg text-gray-700">
                A law firm that wins one new client from an after-hours call that would have gone to voicemail often recoups a full year of AI receptionist costs in a single case. An HVAC company that captures every after-hours emergency call instead of losing them to a competitor can recover $300–$1,500 per call in missed revenue.
              </p>
            </motion.section>

            {/* Section 5 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <DollarSign className="h-7 w-7 text-blue-600 flex-shrink-0" />
                How Much Does an AI Receptionist Cost?
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                AI receptionist pricing falls into three models:
              </p>
              <div className="space-y-4 mb-6">
                <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-2">1. Flat monthly fee (best for high volume)</h3>
                  <p className="text-gray-700 text-sm mb-2">One fixed price regardless of call volume. Examples: Boltcall ($549–$897/mo), MyAI Front Desk ($65–$97/mo for limited plans).</p>
                  <p className="text-green-700 text-sm font-medium">Best for: businesses with 150+ calls/month or unpredictable volume.</p>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-2">2. Per-call or per-minute pricing</h3>
                  <p className="text-gray-700 text-sm mb-2">Base fee + per-call charge. Examples: Smith.ai ($95/mo + $2.10–$2.40/call), Ruby ($235/mo for 50 minutes).</p>
                  <p className="text-yellow-700 text-sm font-medium">Best for: very low-volume businesses under 50 calls/month.</p>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-2">3. Usage-based with minute caps</h3>
                  <p className="text-gray-700 text-sm mb-2">Included minutes per month, overage charges after that.</p>
                  <p className="text-gray-600 text-sm font-medium">Best for: predictable, low-volume use cases.</p>
                </div>
              </div>
              <p className="text-lg text-gray-700">
                For a small business receiving 200+ calls per month, a flat-rate AI receptionist at $549/month typically costs 70-80% less than hiring a part-time human receptionist — and performs around the clock instead of for 20 hours per week.
              </p>
            </motion.section>

            {/* Section 6 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Shield className="h-7 w-7 text-blue-600 flex-shrink-0" />
                AI Receptionist vs Human Receptionist: What's the Difference?
              </h2>
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-5 py-3 text-left font-semibold text-sm">Factor</th>
                      <th className="px-5 py-3 text-center font-semibold text-sm text-blue-300">AI Receptionist</th>
                      <th className="px-5 py-3 text-center font-semibold text-sm">Human Receptionist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { factor: 'Cost', ai: '$549–$1,000/mo', human: '$35,000–$50,000/yr' },
                      { factor: 'Availability', ai: '24/7/365', human: '8hr shifts, PTO' },
                      { factor: 'Response time', ai: '< 1 ring', human: '2–4 rings (if available)' },
                      { factor: 'Consistency', ai: 'Identical every call', human: 'Varies by person/day' },
                      { factor: 'Complex calls', ai: 'Good for structured tasks', human: 'Better for nuanced situations' },
                      { factor: 'Appointment booking', ai: 'Real-time, zero error', human: 'Manual, error-prone' },
                      { factor: 'After-hours', ai: 'Full capability', human: 'Not available' },
                      { factor: 'Setup time', ai: '24 hours', human: '2–4 weeks to hire/train' },
                    ].map((row, i) => (
                      <tr key={row.factor} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-5 py-3 font-medium text-gray-900 text-sm border-b border-gray-100">{row.factor}</td>
                        <td className="px-5 py-3 text-center text-sm text-blue-700 font-medium border-b border-gray-100">{row.ai}</td>
                        <td className="px-5 py-3 text-center text-sm text-gray-700 border-b border-gray-100">{row.human}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-lg text-gray-700">
                For most local service businesses, an AI receptionist handles 90-95% of call types as well as or better than a human. The 5-10% of calls that genuinely require human judgment — highly sensitive situations, complex negotiations, or calls where empathy is the primary value — can be transferred to a staff member in real time. You get the best of both: AI efficiency for the majority of calls, human touch available when it truly matters.
              </p>
            </motion.section>

            {/* Section 7 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Zap className="h-7 w-7 text-blue-600 flex-shrink-0" />
                How Do You Set Up an AI Receptionist?
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                Most AI receptionist platforms can be set up in under 24 hours. Here is the typical process:
              </p>
              <ol className="space-y-4 mb-6">
                {[
                  { step: '1', title: 'Sign up and provide business details', desc: 'Your business name, address, phone number, hours of operation, and services offered. This trains the AI on your specific context.' },
                  { step: '2', title: 'Configure call handling rules', desc: 'What should the AI do when someone calls? Book an appointment? Capture a lead? Transfer to a specific person? You set the rules.' },
                  { step: '3', title: 'Connect your calendar', desc: 'Link your Google Calendar, Outlook, or Calendly account so the AI can check availability and book appointments in real time.' },
                  { step: '4', title: 'Forward your business number', desc: 'Set your existing business phone to forward calls to the AI\'s dedicated number. No number change required — callers still dial your existing number.' },
                  { step: '5', title: 'Test and go live', desc: 'Call your own number to verify the AI responds correctly. Make any adjustments. You\'re live — the AI answers every call from this point forward.' },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{item.step}</span>
                    <div>
                      <span className="font-semibold text-gray-900">{item.title}: </span>
                      <span className="text-gray-700">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>

            {/* FAQ Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions About AI Receptionists</h2>
              <div className="space-y-8">
                {[
                  {
                    q: 'What is an AI receptionist?',
                    a: 'An AI receptionist is a fully automated phone answering system powered by artificial intelligence. It answers incoming calls 24/7, books appointments, captures leads, and sends follow-up texts — without any human receptionists involved.',
                  },
                  {
                    q: 'How does an AI receptionist work?',
                    a: 'When a call comes in, the AI answers instantly, listens to what the caller says using speech-to-text technology, understands the request with natural language processing, and takes the appropriate action — booking an appointment, capturing a lead, or transferring to a staff member. The full process happens in real time with a natural-sounding voice.',
                  },
                  {
                    q: 'What is the difference between an AI receptionist and a human receptionist?',
                    a: 'A human receptionist costs $35,000–$50,000 per year, works 8-hour shifts, and has variable quality. An AI receptionist costs $500–$1,000 per month, works 24/7/365, and handles every call with consistent quality. AI handles structured tasks (booking, lead capture, FAQ) as well as a human; complex or emotionally sensitive calls are better transferred to a human in real time.',
                  },
                  {
                    q: 'How much does an AI receptionist cost?',
                    a: 'AI receptionists range from $99/month for basic plans to $1,000+/month for full-featured platforms. Boltcall starts at $549/month and includes unlimited AI call answering, appointment booking, lead capture, and follow-up texts with flat-rate pricing and no per-call fees.',
                  },
                  {
                    q: 'Can an AI receptionist book appointments?',
                    a: 'Yes. AI receptionists integrate with Google Calendar, Outlook, Calendly, and Cal.com to check real-time availability, book appointments, and send confirmation texts — all during the call, with no human involvement.',
                  },
                  {
                    q: 'Is an AI receptionist the same as a chatbot?',
                    a: 'No. A chatbot is text-based and lives on your website. An AI receptionist is voice-based and handles phone calls. Some platforms offer both: an AI voice receptionist for calls and an AI chatbot widget for website visitors. Boltcall includes both in every plan.',
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border-b border-gray-100 pb-6 last:border-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{q}</h3>
                    <p className="text-lg text-gray-700">{a}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Related content */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Guides</h2>
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  { to: '/compare/boltcall-vs-smith-ai', label: 'Comparison', title: 'Boltcall vs Smith.ai: Which AI Receptionist Is Right for You?', desc: 'Head-to-head comparison of pricing, features, and who each service fits.' },
                  { to: '/blog/ai-receptionist-cost-pricing', label: 'Pricing Guide', title: 'AI Receptionist Cost & Pricing: Complete 2026 Guide', desc: 'Everything you need to know about AI receptionist pricing models.' },
                  { to: '/blog/ai-vs-human-receptionist', label: 'Deep Dive', title: 'AI vs Human Receptionist: Which Is Right for You?', desc: 'Side-by-side analysis on cost, speed, availability, and use cases.' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <span className="text-xs text-blue-600 font-medium">{item.label}</span>
                    <h3 className="text-base font-semibold text-gray-900 mt-1 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </motion.section>

          </div>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mt-10 mb-16"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-10 text-center text-white">
              <h2 className="text-3xl font-bold mb-3">See an AI Receptionist in Action</h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Boltcall answers every call 24/7, books appointments, and captures leads automatically. Pure AI — no human receptionists, no per-call fees. Setup in 24 hours.
              </p>
              <Link
                to="/setup"
                className="inline-flex items-center bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.section>
        </div>
      </main>

      <FinalCTA {...BLOG_CTA} />
      <Footer />
    </>
  );
};

export default WhatIsAIReceptionistGuide;
