import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, MessageSquare, CheckCircle, TrendingUp, Zap,
  Wrench, AlertCircle, DollarSign, Shield, ArrowRight
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogWhatsAppAppointmentBookingPlumbers: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'WhatsApp Appointment Booking for Plumbers: The Complete 2026 Guide';
    updateMetaDescription(
      'WhatsApp appointment booking for plumbers: how to automatically book emergency calls and service jobs via WhatsApp, reduce no-shows, and never miss a lead again.'
    );

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'WhatsApp Appointment Booking for Plumbers: The Complete 2026 Guide',
      description:
        'WhatsApp appointment booking for plumbers: how to automatically book emergency calls and service jobs via WhatsApp, reduce no-shows, and never miss a lead again.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall_full_logo.png' },
      },
      datePublished: '2026-04-21',
      dateModified: '2026-04-21',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/whatsapp-appointment-booking-plumbers',
      },
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg' },
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does WhatsApp appointment booking work for plumbers?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "A plumber connects their WhatsApp Business number to an AI booking system. When a homeowner messages about a leak, burst pipe, or routine job, the AI replies instantly, collects the job details and address, checks the plumber's calendar, and confirms a booking — all within the WhatsApp conversation. The homeowner never needs to call or visit a website.",
          },
        },
        {
          '@type': 'Question',
          name: 'Can WhatsApp handle emergency plumbing booking after hours?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI-powered WhatsApp booking systems run 24/7 and can triage urgent vs. standard jobs. A burst pipe message at 2am triggers an emergency response flow that either books an on-call slot immediately or escalates to the plumber via SMS/call. Routine jobs like drain cleaning get routed into available daytime slots.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does WhatsApp booking automation cost for a plumbing business?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'WhatsApp booking automation for plumbers typically costs $99–$249 per month depending on the platform and features. A single emergency job booked automatically while the plumber sleeps covers the entire monthly cost. Most plumbers recoup the investment within the first week.',
          },
        },
        {
          '@type': 'Question',
          name: "What happens if a customer sends a message but the AI can't understand it?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Modern AI booking systems handle natural, messy customer language very well — including typos, fragments, and non-standard phrasing. When a message is genuinely ambiguous, the AI asks a single clarifying question rather than giving up. In rare cases where the AI cannot resolve the request, it escalates to the plumber with full conversation context so no lead is ever dropped.",
          },
        },
        {
          '@type': 'Question',
          name: 'Does WhatsApp appointment booking reduce no-shows for plumbers?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — significantly. Automated WhatsApp reminders sent 24 hours and 2 hours before a job reduce no-shows by 35–60% compared to no reminders. Because the customer books directly in WhatsApp, reminders are delivered in the same thread they already read — not a separate email they ignore.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which WhatsApp booking tools work best for small plumbing businesses?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "For small plumbing businesses, the best tools combine WhatsApp Business API access with a simple calendar integration and AI conversation layer. Platforms like Boltcall connect WhatsApp to your booking calendar so you can be set up in under an hour without any technical knowledge. Avoid tools that require a full CRM or enterprise contract — you just need to connect, auto-reply, and book.",
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
    personScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Boltcall Team',
      url: 'https://boltcall.org/about',
      worksFor: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
    });
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://boltcall.org/blog' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'WhatsApp Appointment Booking for Plumbers',
          item: 'https://boltcall.org/blog/whatsapp-appointment-booking-plumbers',
        },
      ],
    });
    document.head.appendChild(bcScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      ['article-schema', 'faq-schema', 'speakable-schema'].forEach(id => {
        document.getElementById(id)?.remove();
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
                { label: 'WhatsApp Appointment Booking for Plumbers', href: '/blog/whatsapp-appointment-booking-plumbers' },
              ]}
            />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              WhatsApp Appointment Booking for{' '}
              <span className="text-blue-600">Plumbers</span>: The Complete 2026 Guide
            </h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 21, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>11 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">

            {/* Opening Hook */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
                A homeowner's pipe burst at 11pm. They don't call — they WhatsApp. Three plumbers. The first one to reply books the job. The other two don't see the message until morning. If your plumbing business doesn't have an automated booking system connected to WhatsApp, you are losing emergency jobs to competitors who do — while you sleep. This guide shows you exactly how WhatsApp appointment booking for plumbers works, what it automates, and how to set it up in a day.
              </p>
            </motion.div>

            {/* Section 1: The Revenue Problem */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Problem</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Why Plumbers Lose $45K–$120K a Year to Slow Replies
              </h2>

              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">74%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contractor Calls Go Unanswered</div>
                  <div className="text-xs text-gray-500 mt-1">(BrightLocal, 2024)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">85%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Won't Call Back a Second Time</div>
                  <div className="text-xs text-gray-500 mt-1">(Invoca, 2024)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">WhatsApp Message Open Rate</div>
                  <div className="text-xs text-gray-500 mt-1">(Meta Business, 2025)</div>
                </div>
              </div>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Most plumbing jobs are won in the first five minutes after a homeowner reaches out. When that outreach comes via WhatsApp — which it increasingly does, especially in areas with high smartphone adoption — and your reply is silence, the job goes to whoever responds first. That's not the best plumber. That's just the fastest.
                </p>
                <p>
                  The math is brutal. If you miss 3 WhatsApp enquiries per week at an average job value of $350, that's $54,600 a year. Emergency jobs — burst pipes, blocked sewers, boiler failures — average $600–$900. Missing just two of those a week is $62,400 gone annually. Not because you're bad at plumbing. Because no one was watching WhatsApp at 11pm.
                </p>
                <p>
                  The fix is not hiring someone to watch your phone 24 hours a day. The fix is automating the reply-and-book flow so every WhatsApp message gets an instant response, a booking offer, and a confirmation — without you touching anything.
                </p>
              </div>
            </motion.section>

            {/* Section 2: What Is It */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Definition</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What Is WhatsApp Appointment Booking for Plumbers?
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  WhatsApp appointment booking for plumbers is an automated system that connects your WhatsApp Business number to an AI conversation layer and your booking calendar. When a homeowner messages you about a plumbing job — any time of day or night — the AI replies immediately, collects the job details, checks your availability, and confirms a booking date and time. All inside WhatsApp. No phone tag, no website form, no manual back-and-forth.
                </p>
                <p>
                  The key distinction from a standard WhatsApp auto-reply is the booking layer. An auto-reply says "Thanks, we'll get back to you." A booking system says "We have Thursday 9am or Friday 2pm available — which works for you?" and then locks the slot. The customer gets a confirmation. The appointment appears in your calendar. You show up and do the job.
                </p>
                <p>
                  For plumbers specifically, the system also needs to handle urgency triage. A "my toilet is blocked" message is a routine job. A "water is pouring through my ceiling" message is an emergency. Good WhatsApp booking systems detect that distinction and route accordingly — emergency flow vs. standard scheduling flow.
                </p>
              </div>
            </motion.section>

            {/* Section 3: How It Works */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Under the Hood</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                How the Booking Flow Works (Step by Step)
              </h2>
              <div className="space-y-6">
                {[
                  {
                    step: '01',
                    icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
                    title: 'Homeowner Sends a WhatsApp Message',
                    desc: 'Customer finds your number on Google, a leaflet, or a referral and messages you. Could be "do you fix boilers?" or "pipe burst need someone today" — the AI handles all formats.',
                  },
                  {
                    step: '02',
                    icon: <Zap className="w-5 h-5 text-blue-600" />,
                    title: 'AI Replies Instantly',
                    desc: "Within seconds, the AI sends a warm greeting, confirms you do that type of work, and asks the first qualifying question — typically the address and the issue type.",
                  },
                  {
                    step: '03',
                    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
                    title: 'Urgency Triage',
                    desc: 'The AI detects whether the job is an emergency (active leak, no water, sewage overflow) or a standard booking. Emergency jobs trigger an escalation flow. Routine jobs go to the standard scheduler.',
                  },
                  {
                    step: '04',
                    icon: <Calendar className="w-5 h-5 text-blue-600" />,
                    title: 'Calendar Check in Real Time',
                    desc: 'The system checks your live calendar for available slots that match the job type and location. It presents 2–3 options to the customer: "We have tomorrow 8am or Friday afternoon — which works?"',
                  },
                  {
                    step: '05',
                    icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
                    title: 'Booking Confirmed in WhatsApp',
                    desc: 'Customer picks a slot. The AI confirms the booking, shares any prep instructions (e.g., "please clear access to the stopcock"), and sets a reminder. The appointment locks in your calendar.',
                  },
                  {
                    step: '06',
                    icon: <Shield className="w-5 h-5 text-blue-600" />,
                    title: 'Automated Reminders Reduce No-Shows',
                    desc: '24 hours and 2 hours before the job, the system sends a WhatsApp reminder in the same thread. Customer confirms with a single reply. No-show rates drop by 35–60%.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                        {item.step}
                      </div>
                      <div className="w-0.5 flex-1 bg-blue-100 mt-2"></div>
                    </div>
                    <div className="pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        {item.icon}
                        <span className="font-semibold text-gray-900">{item.title}</span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Section 4: Emergency vs Standard */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Flow Design</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Emergency vs. Standard Job: Two Different Flows
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  The single biggest mistake plumbers make when setting up WhatsApp booking is treating every message the same. A blocked drain that can wait until Tuesday and a burst pipe flooding a kitchen need completely different responses. Your automation needs to detect the difference and act accordingly.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-900">Emergency Flow</span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>Triggered by: "burst," "flooding," "no water," "gas smell," "ceiling leaking"</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>AI sends safety instructions immediately (e.g., "turn off your stopcock now")</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>Escalates to plumber via SMS/call with full WhatsApp context</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>If emergency slot is available, books it instantly</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>ETA sent to customer in WhatsApp thread</span></li>
                  </ul>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="font-bold text-gray-900">Standard Flow</span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><span>Triggered by: "blocked drain," "low pressure," "dripping tap," "quote request"</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><span>AI collects address, job type, preferred timing</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><span>Presents 2–3 available slots from live calendar</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><span>Customer picks slot, AI confirms and logs the job</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /><span>Reminders sent at 24h and 2h before job</span></li>
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Section 5: What to Automate */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Automation Scope</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What You Should (and Shouldn't) Automate
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Not every part of the customer conversation should be automated. The goal is to automate everything that doesn't require your judgment, so your time goes to billable work — not admin.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { automate: true, task: 'First reply to every WhatsApp message (within seconds)' },
                  { automate: true, task: 'Job type and address collection' },
                  { automate: true, task: 'Urgency triage (emergency vs. routine)' },
                  { automate: true, task: 'Calendar availability check and slot offer' },
                  { automate: true, task: 'Booking confirmation and calendar entry' },
                  { automate: true, task: '24h and 2h reminder messages' },
                  { automate: true, task: 'Post-job follow-up and review request' },
                  { automate: false, task: 'Complex pricing negotiations on large jobs' },
                  { automate: false, task: 'Sensitive situations (insurance claims, legal disputes)' },
                  { automate: false, task: 'Jobs requiring a site visit before quoting' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.automate ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {item.automate
                        ? <CheckCircle className="w-3 h-3 text-blue-600" />
                        : <span className="text-gray-400 text-xs font-bold">✕</span>
                      }
                    </div>
                    <span className={item.automate ? 'text-gray-800' : 'text-gray-500'}>{item.task}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${item.automate ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                      {item.automate ? 'Automate' : 'Stay manual'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Section 6: Setup Guide */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Setup Guide</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                How to Set Up WhatsApp Appointment Booking (6 Steps)
              </h2>
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 1 — Get a WhatsApp Business Number</h3>
                  <p>You need a separate business number for automation. This can be a new SIM or a virtual number. Do not automate your personal WhatsApp — keep them separate. Register it as a WhatsApp Business account via the WhatsApp Business app, then upgrade to API access through your automation platform.</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 2 — Connect to a WhatsApp Business API Platform</h3>
                  <p>The WhatsApp Business app itself has no automation. You need WhatsApp Business API access, which is provided through verified solution providers. Platforms like Boltcall handle this for you — you don't have to apply to Meta directly or manage API credentials.</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 3 — Connect Your Booking Calendar</h3>
                  <p>Link your calendar (Google Calendar, Jobber, Housecall Pro, or any Cal.com-compatible tool) to the booking system. Set your working hours, job duration defaults (e.g., 1 hour for standard jobs, 2 hours for installations), and buffer time between jobs.</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 4 — Configure Your Conversation Flows</h3>
                  <p>Set up the two core flows: emergency and standard. Define the trigger keywords for emergency triage. Write your greeting message and the qualifying questions the AI should ask. Most platforms come with plumbing-specific templates so you're not starting from scratch.</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 5 — Set Up Reminder Messages</h3>
                  <p>Enable automated reminders in the WhatsApp thread — 24 hours before the job and 2 hours before. Include the job address, the time window, and a simple confirmation request ("Reply YES to confirm or call us to reschedule"). This alone eliminates most no-shows.</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Step 6 — Test Before Going Live</h3>
                  <p>Message your own business WhatsApp number from a different phone and run through both the emergency flow and the standard booking flow. Check that slots appear correctly, the confirmation goes through, and the calendar entry shows up. Once you're confident it works, start directing new enquiries to the WhatsApp number.</p>
                </div>
              </div>
            </motion.section>

            {/* Section 7: ROI */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Return on Investment</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What WhatsApp Booking Automation Actually Returns
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  The ROI calculation for WhatsApp booking automation is straightforward for plumbers. The cost is typically $99–$249/month. The return is measured in three buckets:
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-900">Recovered Jobs</span>
                  </div>
                  <p className="text-sm text-gray-600">Every after-hours WhatsApp enquiry that gets an instant booking = a job you wouldn't have otherwise had. One emergency call pays for 3+ months of the tool.</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-900">Fewer No-Shows</span>
                  </div>
                  <p className="text-sm text-gray-600">Automated WhatsApp reminders reduce no-shows by 35–60%. Each avoided no-show saves 1–2 hours of dead time on your schedule — time you can fill with a paying job.</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-900">Admin Hours Saved</span>
                  </div>
                  <p className="text-sm text-gray-600">The average plumber spends 2–3 hours per day on scheduling back-and-forth. Automating booking reclaims that time for additional jobs or genuine rest.</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                For a solo plumber doing 15–20 jobs a week at an average of $350 per job, recovering even 2 extra jobs per month from automated WhatsApp booking delivers $700/month in additional revenue from a $149/month tool. That's a 4.7x return before counting no-show reduction or time savings.
              </p>
            </motion.section>

            {/* FAQ */}
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
                    q: 'How does WhatsApp appointment booking work for plumbers?',
                    a: "A plumber connects their WhatsApp Business number to an AI booking system. When a homeowner messages about a leak, burst pipe, or routine job, the AI replies instantly, collects the job details and address, checks the plumber's calendar, and confirms a booking — all within the WhatsApp conversation. The homeowner never needs to call or visit a website.",
                  },
                  {
                    q: 'Can WhatsApp handle emergency plumbing booking after hours?',
                    a: 'Yes. AI-powered WhatsApp booking systems run 24/7 and can triage urgent vs. standard jobs. A burst pipe message at 2am triggers an emergency response flow that either books an on-call slot immediately or escalates to the plumber via SMS/call. Routine jobs like drain cleaning get routed into available daytime slots.',
                  },
                  {
                    q: 'How much does WhatsApp booking automation cost for a plumbing business?',
                    a: 'WhatsApp booking automation for plumbers typically costs $99–$249 per month depending on the platform and features. A single emergency job booked automatically while the plumber sleeps covers the entire monthly cost. Most plumbers recoup the investment within the first week.',
                  },
                  {
                    q: "What happens if a customer sends a message but the AI can't understand it?",
                    a: "Modern AI booking systems handle natural, messy customer language very well — including typos, fragments, and non-standard phrasing. When a message is genuinely ambiguous, the AI asks a single clarifying question rather than giving up. In rare cases where the AI cannot resolve the request, it escalates to the plumber with full conversation context so no lead is ever dropped.",
                  },
                  {
                    q: 'Does WhatsApp appointment booking reduce no-shows for plumbers?',
                    a: 'Yes — significantly. Automated WhatsApp reminders sent 24 hours and 2 hours before a job reduce no-shows by 35–60% compared to no reminders. Because the customer books directly in WhatsApp, reminders are delivered in the same thread they already read — not a separate email they ignore.',
                  },
                  {
                    q: 'Which WhatsApp booking tools work best for small plumbing businesses?',
                    a: "For small plumbing businesses, the best tools combine WhatsApp Business API access with a simple calendar integration and AI conversation layer. Platforms like Boltcall connect WhatsApp to your booking calendar so you can be set up in under an hour without any technical knowledge. Avoid tools that require a full CRM or enterprise contract — you just need to connect, auto-reply, and book.",
                  },
                ].map((item, i) => (
                  <div key={i} className="border-b border-gray-100 pb-6">
                    <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mb-16"
            >
              <div className="rounded-2xl p-8 bg-blue-600 text-white text-center">
                <Wrench className="w-10 h-10 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Stop Missing WhatsApp Leads After Hours
                </h2>
                <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                  Boltcall connects your WhatsApp Business number to an AI booking system that answers every message instantly, books the job, and sends reminders — while you sleep, eat, or work on another site.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Get Set Up Today <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/ai-revenue-calculator"
                    className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Calculate My Revenue Recovery
                  </Link>
                </div>
              </div>
            </motion.section>

            {/* Related Posts */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'AI Appointment Scheduling for HVAC Companies: The 2026 Guide',
                    href: '/blog/ai-appointment-scheduling-hvac',
                    desc: 'How HVAC companies use AI to handle seasonal surge call volume and book 24/7.',
                  },
                  {
                    title: 'Never Miss a Call After Hours: AI Answering for Local Businesses',
                    href: '/blog/never-miss-call-after-hours',
                    desc: 'How to set up after-hours AI answering that captures leads while your office is closed.',
                  },
                ].map((post) => (
                  <Link
                    key={post.href}
                    to={post.href}
                    className="block p-5 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1 transition-colors">
                      {post.title}
                    </div>
                    <div className="text-sm text-gray-500">{post.desc}</div>
                  </Link>
                ))}
              </div>
            </motion.section>

          </article>

          {/* Table of Contents sidebar */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div>
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogWhatsAppAppointmentBookingPlumbers;
