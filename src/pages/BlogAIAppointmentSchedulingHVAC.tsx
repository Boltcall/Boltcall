import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Phone, CheckCircle, TrendingUp, Zap,
  Thermometer, AlertCircle, DollarSign, Shield, Settings
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import KeyTakeaways from '../components/blog/KeyTakeaways';

const BlogAIAppointmentSchedulingHVAC: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Appointment Scheduling for HVAC Companies: The 2026 Guide';
    updateMetaDescription(
      'AI appointment scheduling for HVAC companies: how to automatically book service calls 24/7, handle seasonal surges, and never lose a lead to a competitor again.'
    );

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Appointment Scheduling for HVAC Companies: The 2026 Complete Guide',
      description:
        'AI appointment scheduling for HVAC companies: how to automatically book service calls 24/7, handle seasonal surges, and never lose a lead to a competitor again.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall_full_logo.png' },
      },
      datePublished: '2026-04-20',
      dateModified: '2026-04-20',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/ai-appointment-scheduling-hvac',
      },
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg' },
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does AI appointment scheduling work for HVAC companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI appointment scheduling for HVAC companies works by answering inbound calls and web leads 24/7, collecting the job details (service type, address, urgency), checking your technician calendar for availability, and booking the appointment in real time — all without a human dispatcher. The caller gets a confirmation, and the job appears in your scheduling system automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI handle HVAC emergency calls after hours?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI scheduling systems can triage emergency vs. non-emergency calls and apply different booking rules for each. Emergency AC failures or no-heat calls in winter can be routed to on-call technicians immediately, while routine maintenance calls book into available daytime slots.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does AI appointment scheduling cost for an HVAC company?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI scheduling platforms for HVAC companies typically cost $49–$299 per month, compared to $3,000–$5,000/month for a full-time dispatcher. For most HVAC companies, a single job booked by the AI during off-hours covers the entire monthly cost.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does AI appointment scheduling integrate with HVAC software like ServiceTitan or Jobber?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Many AI scheduling platforms integrate with major HVAC management software including Jobber, Housecall Pro, and Google Calendar. ServiceTitan integration is available on higher-tier plans of some providers. Always confirm native integration before subscribing.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will AI handle peak season call volume for HVAC?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Unlike a human dispatcher who can only handle one call at a time, AI handles unlimited simultaneous calls. During a heat wave when 40 homeowners call at the same time, every call is answered instantly and every appointment is booked — no hold music, no voicemail, no lost jobs.',
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
          name: 'AI Appointment Scheduling for HVAC Companies',
          item: 'https://boltcall.org/blog/ai-appointment-scheduling-hvac',
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
                { label: 'AI Appointment Scheduling for HVAC Companies', href: '/blog/ai-appointment-scheduling-hvac' },
              ]}
            />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              AI Appointment Scheduling for{' '}
              <span className="text-blue-600">HVAC Companies</span>: The 2026 Complete Guide
            </h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>April 20, 2026</span>
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

            {/* Opening Hook */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="prose prose-lg max-w-none mb-12"
            >
              <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
                It is 9pm on the hottest day of the year. A homeowner's AC just died. They call three HVAC companies back-to-back. The first one to answer books the job. The other two don't find out they lost it until the morning. If your company isn't the first to answer — and the first to schedule — you are working harder than you need to while handing revenue to the competitor who automated their phones. This guide shows you exactly how AI appointment scheduling for HVAC works, what it costs, and how to set it up today.
              </p>
            </motion.div>

            <KeyTakeaways items={[
              'HVAC companies that answer first win the job — AI scheduling ensures you\'re always first to respond, even at 9pm.',
              'AI appointment scheduling handles inbound calls, books service windows, and sends reminders automatically, 24/7.',
              'Peak season surges (summer AC, winter heat) are handled seamlessly — AI scales to unlimited simultaneous calls.',
              'Setup takes less than 24 hours and integrates with Google Calendar, ServiceTitan, and most HVAC CRMs.',
              'Average HVAC companies using AI scheduling see a 30–45% reduction in missed leads within the first 30 days.',
            ]} />

            {/* Section 1: What Is It */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Definition</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What Is AI Appointment Scheduling for HVAC?
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  AI appointment scheduling for HVAC is software that answers your inbound service calls and web leads 24 hours a day, collects the customer's job details, checks your technician availability in real time, and books the appointment — all before the caller hangs up. No dispatcher required. No voicemail. No callback loop.
                </p>
                <p>
                  The key difference from a standard AI answering service is the booking layer. General AI receptionists take messages. HVAC scheduling AI takes the job. It knows your technician calendar, your service zones, your job types (emergency vs. maintenance vs. install), and your pricing tiers. It handles the intake conversation, confirms the slot, and sends the customer a booking confirmation — all in one call.
                </p>
                <p>
                  For HVAC companies specifically, this solves the three most expensive scheduling problems: missed after-hours calls, peak-season call overflow, and the dispatcher bottleneck that makes homeowners wait on hold while a tech is free.
                </p>

              </div>
            </motion.section>

            {/* Section 2: The HVAC Problem */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Problem</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Why HVAC Companies Lose More Leads Than Any Other Trade
              </h2>

              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">62%</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Calls Missed After Hours</div>
                  <div className="text-xs text-gray-500 mt-1">(BIA Advisory, 2024)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">3x</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Higher Call Volume in Summer / Winter Peaks</div>
                  <div className="text-xs text-gray-500 mt-1">(Jobber Industry Report, 2025)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">$850</div>
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Avg HVAC Job Value Lost Per Missed Call</div>
                  <div className="text-xs text-gray-500 mt-1">(IBISWorld, 2025)</div>
                </div>
              </div>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  HVAC is different from most trades because demand is violently seasonal. In January and July, your phones ring three times more than they do in April. A human dispatcher who handles 30 calls a day fine in spring becomes the bottleneck that costs you $20,000+ in summer when callers hit hold music and call the next company.
                </p>
                <p>
                  The second problem is timing. HVAC emergencies don't respect business hours. A furnace failure at 11pm on a Saturday is a $1,200 emergency service call. If your answer is voicemail, that revenue goes to the on-call competitor with an automated scheduler — even if your technician was available and 5 minutes closer.
                </p>
                <p>
                  The third problem is the dispatcher bottleneck itself. Even during business hours, a single dispatcher juggling 15 active calls, technician updates, and scheduling changes cannot give every caller the frictionless booking experience that converts a lead into a booked job. Callers on hold for more than 90 seconds hang up at a rate of 34% (Invoca, 2024).
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
                How AI Appointment Scheduling Works for HVAC Companies
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Here is exactly what happens from the moment a homeowner calls your HVAC company — with AI handling the full scheduling flow.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: <Phone className="w-4 h-4 text-blue-600" />,
                    step: '1. Call Answered in Under 2 Rings',
                    text: "Your business number forwards to the AI (or the AI answers directly). It greets the caller with your company name in a natural, conversational voice. No hold music, no \"your call is important to us.\" Immediate answer, every time — 24/7/365.",
                  },
                  {
                    icon: <Thermometer className="w-4 h-4 text-blue-600" />,
                    step: '2. Job Type and Urgency Classified',
                    text: "The AI asks a short intake sequence: What is the issue? Is it an emergency or can it wait? What type of system (AC, furnace, heat pump, ductwork)? How old is the unit? The caller answers in natural language — the AI extracts the job type, urgency tier, and equipment details automatically.",
                  },
                  {
                    icon: <Settings className="w-4 h-4 text-blue-600" />,
                    step: '3. Service Zone Verified',
                    text: "The AI confirms the property address and checks it against your configured service zone. If the address is outside your zone, the AI politely explains and ends the call — saving your team from driving an hour to a job that doesn't fit your territory.",
                  },
                  {
                    icon: <Calendar className="w-4 h-4 text-blue-600" />,
                    step: '4. Live Availability Checked and Slot Confirmed',
                    text: "The AI checks your live technician calendar (Google Calendar, Jobber, Housecall Pro, or your CRM). It offers the caller 2-3 available windows based on urgency — emergency slots filled same-day, maintenance calls booked into standard windows. The caller picks a time and confirms.",
                  },
                  {
                    icon: <Zap className="w-4 h-4 text-blue-600" />,
                    step: '5. Booking Created and Confirmation Sent',
                    text: "The appointment is created in your scheduling system automatically. The caller receives an SMS confirmation with the time, technician name (if set), and a link to reschedule if needed. Your dispatcher or on-call tech gets an instant notification — job booked, address confirmed, no manual entry required.",
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

            {/* Section 4: HVAC-Specific Features */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">What to Look For</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                5 Features Every HVAC Scheduling AI Must Have
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Not all AI scheduling tools are built for trades. A generic meeting-booking AI will fail in an HVAC context because it cannot triage emergencies, handle seasonal job-type routing, or integrate with field service software. Here is the checklist for HVAC specifically.
              </p>

              <div className="space-y-6">
                {[
                  {
                    num: '01',
                    title: 'Emergency vs. Maintenance Triage',
                    text: 'The AI must distinguish between "my AC stopped working at 3am in July" (emergency, same-day slot) and "I want to schedule my annual tune-up" (routine, book 2 weeks out). These two call types need different routing rules, different calendar pools, and different pricing disclosures. A one-size-fits-all booking flow loses emergency jobs to competitors who get there faster.',
                  },
                  {
                    num: '02',
                    title: 'Simultaneous Call Handling (Peak Season)',
                    text: "When the first 90-degree day hits and 40 homeowners call within two hours, a single dispatcher hits a wall. Your AI must handle unlimited simultaneous inbound calls — every caller answered instantly, every appointment booked without hold time. This alone recaptures the revenue that normally evaporates during peak season.",
                  },
                  {
                    num: '03',
                    title: 'Service Zone and Address Verification',
                    text: "The AI should confirm the caller's address against your territory before booking. This prevents scheduling technicians for jobs outside your service area and the customer disappointment that follows. Zone configuration should be easy to update as your territory expands.",
                  },
                  {
                    num: '04',
                    title: 'Native Calendar + Field Service Software Integration',
                    text: "The scheduling AI needs to read and write to your actual calendar — not send you a booking request for you to manually enter. Native integrations with Google Calendar, Jobber, Housecall Pro, and ServiceTitan prevent double-booking and keep your dispatch board accurate in real time.",
                  },
                  {
                    num: '05',
                    title: 'After-Hours On-Call Escalation',
                    text: "Not every after-hours call is an emergency, but some are. Your AI must support configurable escalation rules: if a caller describes a no-heat situation in January, alert the on-call tech immediately via SMS or call transfer. Non-emergency after-hours calls book into the next available morning window automatically.",
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

            {/* Section 5: Before vs After */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Old Way vs New Way</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                Manual Scheduling vs AI Scheduling: HVAC Reality Check
              </h2>

              <div className="overflow-x-auto rounded-xl border border-gray-200 mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/3">Situation</th>
                      <th className="text-center px-4 py-3 font-semibold text-red-600 w-1/3">Manual / Dispatcher</th>
                      <th className="text-center px-4 py-3 font-semibold text-blue-600 w-1/3">AI Scheduling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['After-hours emergency call', 'Goes to voicemail, caller calls competitor', 'Answered instantly, booked same-day slot'],
                      ['Summer peak (40 calls at once)', 'Hold queue, callers hang up, revenue lost', 'Every call answered simultaneously'],
                      ['Routine maintenance booking', 'Dispatcher manually enters job', 'AI books + creates job record automatically'],
                      ['Out-of-zone caller', 'Dispatcher wastes time explaining', 'AI verifies zone, declines politely'],
                      ['Double-booking risk', 'Human error in spreadsheet', 'Calendar integration prevents it'],
                      ['Lead capture accuracy', 'Varies by dispatcher attention', 'Structured data every call, every time'],
                      ['Cost', '$3,000–$5,000/month (dispatcher)', '$49–$299/month (AI)'],
                    ].map(([situation, manual, ai], i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 font-medium text-gray-700">{situation}</td>
                        <td className="px-4 py-3 text-center text-red-700 bg-red-50/40">{manual}</td>
                        <td className="px-4 py-3 text-center text-blue-700 bg-blue-50/40 font-medium">{ai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="text-xs font-bold uppercase text-red-600 mb-3 tracking-widest">Without AI</div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {[
                      'Homeowner calls at 9pm — hits voicemail',
                      'Calls competitor at 9:01pm — gets a live answer',
                      'Competitor books the $1,200 emergency job',
                      'You find out the next morning when checking messages',
                      'Your tech had been available all evening',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="text-xs font-bold uppercase text-blue-600 mb-3 tracking-widest">With AI</div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {[
                      'Homeowner calls at 9pm — answered in 2 rings',
                      'AI triages: no-AC emergency, confirms address',
                      'On-call tech notified instantly via SMS',
                      'Job booked, confirmation sent to customer',
                      'You wake up to a completed $1,200 job',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Section 6: Setup Guide */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Step-by-Step</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                How to Set Up AI Appointment Scheduling for Your HVAC Company
              </h2>

              <p className="text-gray-700 mb-8 leading-relaxed">
                Most HVAC owners expect this to take weeks of IT work. It doesn't. With the right platform, you can go live before your next shift starts. Here's the exact setup sequence.
              </p>

              <div className="space-y-8">
                {[
                  {
                    num: '01',
                    title: 'Pick a Platform Built for Trades',
                    text: "Choose an AI scheduling platform that handles both voice calls and SMS leads, integrates with your calendar or field service software, and supports multi-job-type routing. Avoid generic meeting-scheduler tools designed for consultants — they cannot handle HVAC intake logic. Look for HVAC-specific templates in the platform's onboarding flow.",
                  },
                  {
                    num: '02',
                    title: 'Define Your Job Types and Routing Rules',
                    text: "Set up your job categories: emergency repair, routine maintenance, new install consultation, warranty callback. For each, define the calendar pool (emergency = on-call tech, maintenance = any available tech in zone, install = senior tech only), the booking window (emergency = same-day, maintenance = next 7 days), and any pricing disclosure the AI should give before booking.",
                  },
                  {
                    num: '03',
                    title: 'Configure Your Service Zone',
                    text: "Upload your service territory by ZIP codes, city names, or a radius from your office. The AI uses this to screen every caller's address before booking. This prevents out-of-zone jobs and the awkward cancellation call your dispatcher has to make the next morning.",
                  },
                  {
                    num: '04',
                    title: 'Connect Your Calendar',
                    text: "Integrate your scheduling tool — Google Calendar works for most small HVAC companies, Jobber or Housecall Pro for mid-size operations. The AI needs read/write access to check real availability and create appointments. Most platforms complete this integration in under 5 minutes via OAuth. Test the integration with a live booking before going live.",
                  },
                  {
                    num: '05',
                    title: 'Set Your After-Hours Escalation Rules',
                    text: 'Decide what triggers your on-call technician: "no heat," "no AC," "water leak from HVAC unit," and "gas smell" should all escalate immediately to a live human or a direct tech call transfer. Non-emergency after-hours calls should book automatically into the next morning\'s open slots. Test every escalation path manually before launch.',
                  },
                  {
                    num: '06',
                    title: 'Forward Your Number and Go Live',
                    text: "Set your main business line to forward calls to the AI after N rings (or immediately for 24/7 coverage). Run five test calls: emergency booking, routine maintenance booking, out-of-zone caller, after-hours non-emergency, and an escalation trigger. When all five pass, flip to live. Your next missed call becomes your first automatically booked job.",
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

            {/* Section 7: ROI */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Math</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                What AI Scheduling Is Worth to an HVAC Company
              </h2>

              <p className="text-gray-700 mb-6 leading-relaxed">
                The ROI calculation is straightforward. Run it with your own numbers.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Phone className="w-5 h-5 text-blue-600" />,
                    label: 'Calls Missed Per Week (industry avg)',
                    value: '8–15',
                    note: 'Based on 62% after-hours miss rate for a typical 30-call/week HVAC company',
                  },
                  {
                    icon: <DollarSign className="w-5 h-5 text-blue-600" />,
                    label: 'Average HVAC Job Value',
                    value: '$350–$1,200',
                    note: 'Tune-up = $150–$200. Repair = $300–$800. Emergency = $800–$2,000.',
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
                    label: 'Revenue Recovered (1 captured call/week)',
                    value: '$1,400–$4,800/mo',
                    note: 'At a conservative 1 job/week captured from previously missed after-hours calls.',
                  },
                  {
                    icon: <Shield className="w-5 h-5 text-blue-600" />,
                    label: 'AI Scheduling Cost',
                    value: '$49–$299/mo',
                    note: 'Full coverage: calls + SMS + web leads. No dispatcher salary, no benefits.',
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="font-semibold text-gray-700 text-sm">{item.label}</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{item.value}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-700 mt-6 leading-relaxed">
                At $149/month for a full AI scheduling platform and a conservative one recovered job per week at $500 average value, the ROI is 13x. In a single summer month when call volume triples and the AI handles the overflow your dispatcher couldn't, that number jumps dramatically. The cost of not having AI is not $149/month — it is the jobs going to competitors who do.
              </p>
            </motion.section>

            {/* Section 8: Internal Links */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.48 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Related Reading</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                More Resources for HVAC Lead Automation
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                  <span>
                    <Link to="/blog/hvac-ai-lead-response" className="text-blue-600 underline hover:text-blue-800">
                      How HVAC Companies Can Book More Service Calls with AI Lead Response
                    </Link>{' '}
                    — the complete speed-to-lead playbook for HVAC.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                  <span>
                    <Link to="/blog/ai-answering-service-small-business" className="text-blue-600 underline hover:text-blue-800">
                      AI Answering Service for Small Business
                    </Link>{' '}
                    — how AI handles every inbound channel, not just phone calls.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                  <span>
                    <Link to="/tools/hvac-overflow-calculator" className="text-blue-600 underline hover:text-blue-800">
                      HVAC Overflow Calculator
                    </Link>{' '}
                    — calculate exactly how much peak-season call overflow is costing your company.
                  </span>
                </li>
              </ul>
            </motion.section>

            {/* Section 9: FAQ */}
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
                    q: 'How does AI appointment scheduling work for HVAC companies?',
                    a: 'AI appointment scheduling for HVAC companies works by answering inbound calls and web leads 24/7, collecting the job details (service type, address, urgency), checking your technician calendar for availability, and booking the appointment in real time — all without a human dispatcher. The caller gets a confirmation, and the job appears in your scheduling system automatically.',
                  },
                  {
                    q: 'Can AI handle HVAC emergency calls after hours?',
                    a: 'Yes. AI scheduling systems can triage emergency vs. non-emergency calls and apply different booking rules for each. Emergency AC failures or no-heat calls in winter can be routed to on-call technicians immediately, while routine maintenance calls book into available daytime slots.',
                  },
                  {
                    q: 'How much does AI appointment scheduling cost for an HVAC company?',
                    a: 'AI scheduling platforms for HVAC companies typically cost $49–$299 per month, compared to $3,000–$5,000/month for a full-time dispatcher. For most HVAC companies, a single job booked by the AI during off-hours covers the entire monthly cost.',
                  },
                  {
                    q: 'Does AI appointment scheduling integrate with HVAC software like ServiceTitan or Jobber?',
                    a: 'Many AI scheduling platforms integrate with major HVAC management software including Jobber, Housecall Pro, and Google Calendar. ServiceTitan integration is available on higher-tier plans of some providers. Always confirm native integration before subscribing.',
                  },
                  {
                    q: 'Will AI handle peak season call volume for HVAC?',
                    a: 'Yes. Unlike a human dispatcher who can only handle one call at a time, AI handles unlimited simultaneous calls. During a heat wave when 40 homeowners call at the same time, every call is answered instantly and every appointment is booked — no hold music, no voicemail, no lost jobs.',
                  },
                  {
                    q: 'How long does it take to set up AI scheduling for an HVAC company?',
                    a: 'Most HVAC companies are live within 30–60 minutes. You configure your job types, service zone, technician calendar integration, and escalation rules. Most platforms have HVAC-specific templates that cut setup time in half. Test calls take 15 minutes, and you are live the same day.',
                  },
                ].map((item, i) => (
                  <div key={i} className="border-b border-gray-100 pb-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.q}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Section 10: Bottom Line */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mb-16"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Bottom Line</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <div className="w-1 self-stretch bg-blue-600 rounded-full flex-shrink-0"></div>
                The First HVAC Company to Answer Wins the Job
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Speed to lead in HVAC is not a nice-to-have. It is the variable that determines who gets the job. When a homeowner's furnace fails at midnight, they do not wait for business hours — they call until someone answers. The company with AI scheduling picks up. The company without it gets a voicemail they will return in the morning, to a customer who is already warm under a technician's fixed furnace.
                </p>
                <p>
                  The math is not complicated. At $149/month, one recovered job per week pays for a year of AI scheduling in a single month. Every peak season call your AI answers instead of sending to voicemail is direct, measurable revenue that would otherwise belong to a competitor.
                </p>
                <p>
                  Set it up before peak season. Your phone will ring tonight.
                </p>
              </div>
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
                      <Thermometer className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-gray-900 font-medium mt-4 text-4xl">Answer Every Call. Book Every Job.</h2>
                  <p className="text-base text-gray-600 mt-2 whitespace-pre-line">
                    Set up AI appointment scheduling for your HVAC company in under 30 minutes. Free to start — no credit card required.
                  </p>
                  <Link
                    to="/setup"
                    className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
                  >
                    Start free — set up in 30 minutes
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

export default BlogAIAppointmentSchedulingHVAC;
