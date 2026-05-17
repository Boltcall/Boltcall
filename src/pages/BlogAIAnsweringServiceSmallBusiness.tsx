import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Phone, CheckCircle, TrendingUp, Zap, Users,
  MessageSquare, DollarSign, Shield, AlertCircle
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogAIAnsweringServiceSmallBusiness: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Answering Service for Small Business: The 2026 Guide';
    updateMetaDescription(
      'AI answering service for small business: how it works, what it costs, and how to set one up in under 5 minutes. Compare top tools and never miss a lead again.'
    );

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Answering Service for Small Business: The 2026 Complete Guide',
      description:
        'AI answering service for small business: how it works, what it costs, and how to set one up in under 5 minutes. Compare top tools and never miss a lead again.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall_full_logo.png' },
      },
      datePublished: '2026-04-09',
      dateModified: '2026-04-09',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/ai-answering-service-small-business',
      },
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg' },
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI answering service for small business?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI answering service is software that answers your business phone calls, texts, and web leads 24/7 using artificial intelligence. It handles greetings, FAQs, appointment booking, and lead capture without any human staff — at a fraction of the cost of a live answering service.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does an AI answering service cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most AI answering services for small businesses cost between $49 and $299 per month, compared to $250–$1,200/month for live virtual receptionist services. Boltcall starts free with paid plans beginning at $49/month.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can an AI answering service book appointments?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Modern AI answering services integrate directly with your calendar (Google Calendar, Calendly, or your CRM) to check availability and book appointments in real time during the call — no human needed.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does it take to set up an AI answering service?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most AI answering services take 5–30 minutes to set up. You provide your business info, services, hours, and FAQs. The AI is trained on this and ready to take calls the same day.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will callers know they are talking to an AI?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Modern AI voice models sound remarkably natural — most callers cannot tell the difference. You can also configure the AI to disclose that it's an automated assistant if you prefer full transparency.",
          },
        },
        {
          '@type': 'Question',
          name: 'What happens when a call is too complex for the AI?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You set escalation rules in advance. When a caller asks something outside the AI\'s knowledge, or explicitly requests a human, the system can transfer the call to you, send you a text alert, or take a message — all instantly.',
          },
        },
      ],
    };

    const speakableSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: document.title,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.speakable-intro'],
      },
    };

    ['article-schema', 'faq-schema', 'speakable-schema'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const addScript = (id: string, data: object) => {
      const s = document.createElement('script');
      s.id = id;
      s.type = 'application/ld+json';
      s.text = JSON.stringify(data);
      document.head.appendChild(s);
    };

    addScript('article-schema', articleSchema);
    addScript('faq-schema', faqSchema);
    addScript('speakable-schema', speakableSchema);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Answering Service for Small Business", "item": "https://boltcall.org/blog/ai-answering-service-small-business"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      ['article-schema', 'faq-schema', 'speakable-schema'].forEach(id => {
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

      {/* Hero */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >

            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: 'AI Answering Service for Small Business', href: '/blog/ai-answering-service-small-business' },
              ]}
            />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              AI Answering Service for{' '}
              <span className="text-blue-600">Small Business</span>: The 2026 Complete Guide
            </h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 9, 2026</span>
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

            {/* ── SECTION 1: Opening Hook ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
                Every day, the average small business misses 62% of its after-hours calls — and 85% of those callers never call back (BIA Advisory, 2024). That's not a phone problem. That's a revenue leak hiding in plain sight. An AI answering service plugs that leak for under $50 a month. This guide shows you exactly how it works, what it costs, and how to go live today.
              </p>
            </motion.div>

            {/* ── SECTION 2: What Is an AI Answering Service? ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Definition</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What Is an AI Answering Service?
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  An AI answering service is software that picks up your business phone calls, text messages, and web form leads — 24 hours a day, 7 days a week — using artificial intelligence. It greets callers, answers common questions, books appointments, captures lead information, and routes urgent calls to you. No hold music. No voicemail. No missed opportunity.
                </p>
                <p>
                  Think of it like hiring a receptionist who never sleeps, never calls in sick, and answers every single call within two rings. Unlike the old-school answering services that relied on offshore call centres reading from scripts, today's AI answers in natural, conversational speech. It understands context, handles follow-up questions, and connects directly to your calendar and CRM.
                </p>
                <p>
                  For a plumber, dentist, HVAC company, or any local service business, the math is simple: every unanswered call is a competitor's new customer. An AI answering service makes sure that never happens again.
                </p>

              </div>
            </motion.section>

            {/* ── SECTION 3: Revenue / Business Case ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Revenue Impact</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What Missed Calls Are Actually Costing You
              </h2>

              {/* Stat Cards */}
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">62%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Calls Missed After Hours</div>
                  <div className="text-xs text-gray-500 mt-1">(BIA Advisory, 2024)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">391%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Higher Conversion Under 60 Seconds</div>
                  <div className="text-xs text-gray-500 mt-1">(Harvard Business Review, 2024)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">$35K</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Avg Annual Revenue Lost per SMB</div>
                  <div className="text-xs text-gray-500 mt-1">(Invoca, 2023)</div>
                </div>
              </div>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  The numbers above aren't abstract. If your average job value is $500 and you miss four calls a week, you're walking away from $8,000 a month. Most small business owners think their main growth problem is getting more leads. It isn't. It's converting the leads they already have — and that starts with answering the phone.
                </p>
                <p>
                  Add in the cost of a full-time receptionist — $35,000–$50,000 salary plus benefits — and the ROI of an AI answering service at $49–$149/month becomes immediate. You recoup the entire year's cost with one job that would otherwise have gone to voicemail.
                </p>

              </div>
            </motion.section>

            {/* ── SECTION 4: How It Works ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Under the Hood</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                How an AI Answering Service Works
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Think of it as a three-layer stack: ears, brain, and hands. The AI listens and understands (ears), decides what to do (brain), and then takes action in your tools (hands). Here's exactly what happens from the moment your phone rings.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: <Phone className="w-4 h-4 text-blue-600" />,
                    step: '1. Call Received & Voice Converted',
                    text: 'Your business number forwards to the AI. Automatic Speech Recognition (ASR) converts the caller\'s voice to text in under 200ms — handling accents, background noise, and natural speech patterns (Deepgram, 2024).',
                  },
                  {
                    icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
                    step: '2. Intent Understood',
                    text: 'Natural Language Understanding (NLU) analyses the text to extract intent, urgency, and key data — service type, preferred dates, caller name. "I need someone to fix my AC, it\'s not cooling" maps to: HVAC service request, high urgency, no date specified.',
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-blue-600" />,
                    step: '3. Knowledge Base Searched',
                    text: 'The AI searches your business knowledge base using semantic search — finding answers by meaning, not just keywords. It knows your services, pricing, availability, and FAQs. Answers are generated by an LLM (like GPT-4) in your brand voice.',
                  },
                  {
                    icon: <Calendar className="w-4 h-4 text-blue-600" />,
                    step: '4. Actions Executed',
                    text: 'The AI doesn\'t just talk — it acts. It checks your live calendar, books the appointment, creates a CRM record, and sends the caller a confirmation text. All before the call ends.',
                  },
                  {
                    icon: <Zap className="w-4 h-4 text-blue-600" />,
                    step: '5. You Get Notified',
                    text: 'A real-time alert lands in your pocket: new booking, lead captured, or escalation needed. You stay in control without being tied to the phone.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{item.step}</div>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 5: Comparison Table ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Old Way vs New Way</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Traditional Answering Service vs AI Answering Service
              </h2>

              <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/3">Factor</th>
                      <th className="text-center px-4 py-3 font-semibold text-red-600 w-1/3">Traditional / Live Service</th>
                      <th className="text-center px-4 py-3 font-semibold text-blue-600 w-1/3">AI Answering Service</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['Monthly Cost', '$250–$1,200+', '$49–$149'],
                      ['Response Time', '30–90 seconds average', 'Under 2 rings, always'],
                      ['Hours Available', 'Business hours or extra charge', '24/7/365, included'],
                      ['Appointment Booking', 'Manual, callback required', 'Live calendar integration'],
                      ['Lead Capture Accuracy', 'Varies by agent quality', 'Structured, every time'],
                      ['Scalability', 'Add staff = add cost', 'Unlimited concurrent calls'],
                      ['Setup Time', '1–2 weeks', '5–30 minutes'],
                      ['CRM Integration', 'Rare / manual', 'Native, automatic'],
                    ].map(([factor, traditional, ai], i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 font-medium text-gray-700">{factor}</td>
                        <td className="px-4 py-3 text-center text-red-700 bg-red-50/40">{traditional}</td>
                        <td className="px-4 py-3 text-center text-blue-700 bg-blue-50/40 font-medium">{ai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="text-xs font-bold uppercase text-red-600 mb-3 tracking-widest">Before AI</div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {[
                      'Caller hits voicemail after hours',
                      '85% don\'t leave a message',
                      'You call back the next morning',
                      'Lead has already booked a competitor',
                      'You never knew you lost them',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="text-xs font-bold uppercase text-green-600 mb-3 tracking-widest">With AI</div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {[
                      'AI answers in 2 rings at 2am',
                      'Caller gets instant help — no hold',
                      'Appointment booked before they hang up',
                      'You wake up to a full calendar',
                      'No lead left behind, ever',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* ── SECTION 6: How-To Framework ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Step-by-Step</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                How to Set Up an AI Answering Service in 5 Steps
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Most business owners expect a long IT project. The reality: you can go live today. Follow these five steps and your AI receptionist will be answering calls before you finish your next coffee.
              </p>

              <div className="space-y-8">
                {[
                  {
                    num: '01',
                    title: 'Choose Your Platform',
                    text: 'Pick an AI answering service built for local service businesses. Look for: native calendar integration, call + SMS + web lead handling in one place, and a setup time under 30 minutes. Avoid platforms that require a developer to configure. Your criteria should also include transparent per-minute pricing with no hidden overage fees.',
                  },
                  {
                    num: '02',
                    title: 'Build Your Knowledge Base',
                    text: 'Feed the AI your business information: services offered, pricing (ranges or "call for quote"), business hours, service area, team size, and your 10 most common questions. The richer this base, the smarter every call response. Most platforms let you paste this as plain text — no coding required.',
                  },
                  {
                    num: '03',
                    title: 'Connect Your Calendar and CRM',
                    text: 'Integrate your booking calendar (Google Calendar, Calendly, or your CRM\'s calendar) so the AI can check real availability and confirm bookings live on the call. Connect your CRM so every lead is logged automatically with caller name, number, intent, and transcript. If you don\'t have a CRM yet, most AI answering platforms include one.',
                  },
                  {
                    num: '04',
                    title: 'Set Your Escalation Rules',
                    text: 'Decide what triggers a human handoff: caller asking for an emergency, caller requesting a specific person, or call exceeding a certain length. Configure your escalation actions: transfer to your mobile, send you a text alert, or take a detailed message with callback time preference. Test each escalation before going live.',
                  },
                  {
                    num: '05',
                    title: 'Forward Your Number and Go Live',
                    text: 'Set your business phone to forward unanswered calls (or all calls) to your AI number. Most mobile carriers let you do this in settings in under two minutes. Run three test calls: a booking request, an FAQ question, and a request for a human. When all three work correctly, you\'re live.',
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="text-5xl font-bold text-blue-100 flex-shrink-0 leading-none w-12">{step.num}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 7: Platform Breakdown ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Tool Comparison</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Best AI Answering Services for Small Business in 2026
              </h2>

              <div className="grid md:grid-cols-1 gap-4">
                {[
                  {
                    name: 'Boltcall',
                    badge: 'Best for Local Service Businesses',
                    badgeColor: 'bg-blue-600 text-white',
                    bestFor: 'Plumbers, HVAC, dentists, lawyers, realtors — any local business that runs on inbound calls and booked appointments.',
                    price: 'Free to start · Paid from $49/mo',
                    pros: [
                      'Handles calls, SMS, and web form leads in one platform',
                      'Live calendar booking on the call — no callback loop',
                      'Sets up in under 5 minutes',
                      'Built-in lead CRM with full call transcripts',
                      'Multi-channel: voice + text + web',
                    ],
                    highlight: true,
                  },
                  {
                    name: 'Smith.ai',
                    badge: 'Best Hybrid (AI + Human)',
                    badgeColor: 'bg-gray-700 text-white',
                    bestFor: 'Businesses that want human agent fallback on complex calls.',
                    price: 'From $250/mo',
                    pros: [
                      'Human agents available as backup',
                      'Strong reputation since 2015',
                      'Multi-channel support',
                    ],
                    highlight: false,
                  },
                  {
                    name: 'Goodcall',
                    badge: 'Best for Restaurants & Retail',
                    badgeColor: 'bg-gray-700 text-white',
                    bestFor: 'High call volume businesses needing menu/hours answering.',
                    price: 'From $49/mo',
                    pros: [
                      'Fast setup for simple FAQ answering',
                      'Google Business integration',
                      'No booking capability',
                    ],
                    highlight: false,
                  },
                  {
                    name: 'Ruby',
                    badge: 'Best Premium Live Service',
                    badgeColor: 'bg-gray-700 text-white',
                    bestFor: 'Law firms and professional services that want US-based live agents.',
                    price: 'From $235/mo',
                    pros: [
                      'US-based live receptionists',
                      'Legal intake expertise',
                      'High cost, human-dependent quality',
                    ],
                    highlight: false,
                  },
                ].map((tool, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-6 ${
                      tool.highlight
                        ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{tool.name}</h3>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{tool.bestFor}</p>
                    <p className="text-sm font-semibold text-gray-900 mb-3">{tool.price}</p>
                    <ul className="space-y-1">
                      {tool.pros.map((pro, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle
                            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              tool.highlight ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 8: Metrics ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Track These</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                4 Metrics to Measure Your AI Answering Service
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Install it and forget it is not a strategy. Track these four numbers weekly. If any drop below the benchmarks, review your knowledge base and escalation rules — those are almost always the root cause.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Phone className="w-5 h-5 text-blue-600" />,
                    metric: 'Call Answer Rate',
                    benchmark: '98%+',
                    desc: 'Percentage of calls answered without going to voicemail. Anything below 95% means your forwarding rule isn\'t configured correctly.',
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
                    metric: 'Lead-to-Booking Rate',
                    benchmark: '35–55%',
                    desc: 'Of all inbound calls captured as leads, how many became booked appointments? Healthy ranges for local service businesses are 35–55%.',
                  },
                  {
                    icon: <Zap className="w-5 h-5 text-blue-600" />,
                    metric: 'Avg Response Time',
                    benchmark: '< 2 rings',
                    desc: 'Time from first ring to AI greeting. Under 2 rings (5 seconds) is the gold standard. Longer indicates a call forwarding delay.',
                  },
                  {
                    icon: <DollarSign className="w-5 h-5 text-blue-600" />,
                    metric: 'Cost Per Booked Lead',
                    benchmark: '< $10',
                    desc: 'Monthly AI service cost divided by booked appointments generated. At $49/month with 10 bookings, you\'re at $4.90/booking. Outstanding.',
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{item.metric}</div>
                        <div className="text-blue-600 text-lg font-bold">{item.benchmark}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 9: FAQ ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                {[
                  {
                    q: 'What is an AI answering service for small business?',
                    a: 'An AI answering service is software that answers your business phone calls, texts, and web leads 24/7 using artificial intelligence. It handles greetings, FAQs, appointment booking, and lead capture without any human staff — at a fraction of the cost of a live answering service.',
                  },
                  {
                    q: 'How much does an AI answering service cost?',
                    a: 'Most AI answering services for small businesses cost between $49 and $299 per month, compared to $250–$1,200/month for live virtual receptionist services. Boltcall starts free with paid plans from $49/month.',
                  },
                  {
                    q: 'Can an AI answering service book appointments?',
                    a: 'Yes. Modern AI answering services integrate directly with your calendar (Google Calendar, Calendly, or your CRM) to check availability and book appointments in real time during the call — no human needed.',
                  },
                  {
                    q: 'How long does it take to set up an AI answering service?',
                    a: 'Most AI answering services take 5–30 minutes to set up. You provide your business info, services, hours, and FAQs. The AI is trained on this and ready to take calls the same day.',
                  },
                  {
                    q: 'Will callers know they are talking to an AI?',
                    a: "Modern AI voice models sound remarkably natural — most callers cannot tell the difference. You can also configure the AI to disclose that it's an automated assistant if you prefer full transparency.",
                  },
                  {
                    q: 'What happens when a call is too complex for the AI?',
                    a: "You set escalation rules in advance. When a caller asks something outside the AI's knowledge, or explicitly requests a human, the system can transfer the call to you, send you a text alert, or take a message — all instantly.",
                  },
                ].map((item, i) => (
                  <div key={i} className="border-b border-gray-100 pb-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.q}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 10: Closing ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Bottom Line</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Stop Losing Leads to Voicemail
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Your competitors are answering. Not because they have more staff — because they've automated the one thing that converts interest into revenue: the first response. An AI answering service doesn't replace your judgment or your expertise. It makes sure no one waits more than two rings to get help.
                </p>
                <p>
                  The bar is low. Most small businesses still let calls go to voicemail after 5pm. That means every local business that picks up after hours — even with an AI — captures market share that was previously just disappearing. At $49/month, the question isn't whether you can afford an AI answering service. It's whether you can afford not to have one.
                </p>
                <p>
                  Set it up today. Your phone will ring tonight. Now you'll be ready.
                </p>
              </div>
            </motion.section>

            {/* Pros & Cons */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
              className="mb-16"
            >
              <section className="my-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of an AI Answering Service for Small Businesses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>Answers every call in under 2 rings — eliminates the 62% of leads lost to voicemail after hours</li>
                      <li>Costs $49–$149/month versus $35,000–$50,000/year for a full-time receptionist</li>
                      <li>Books appointments and captures lead data automatically, connected to your CRM or calendar</li>
                      <li>Handles unlimited simultaneous inbound calls during peak hours without hold times</li>
                      <li>Responds to web form submissions and SMS leads as well as phone calls</li>
                      <li>Provides consistent, professional answers on every interaction regardless of time of day</li>
                      <li>Setup takes under 30 minutes with industry-specific templates for most local service businesses</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-xl p-6">
                    <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>Requires initial configuration to train the AI on your services, pricing, and common questions</li>
                      <li>May not handle very complex or unusual enquiries without escalating to a human</li>
                      <li>Callers who strongly prefer human interaction may ask to speak with a staff member</li>
                      <li>Knowledge base needs regular updates when services, hours, or pricing change</li>
                      <li>Older phone infrastructure may need forwarding setup before the AI can intercept calls</li>
                      <li>ROI is smaller for businesses with very low call volumes (under 20 calls/month)</li>
                    </ul>
                  </div>
                </div>
              </section>
            </motion.section>

            {/* CTA Block */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="my-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
                  <div className="flex justify-center isolate">
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.
                  </p>
                  <Link
                    to="/setup"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Start the free setup
                  </Link>
                </div>
              </div>
            </motion.section>

          </article>

          {/* Table of Contents Sidebar */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogAIAnsweringServiceSmallBusiness;
