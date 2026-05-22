import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Search, BookOpen, AlertTriangle, Phone, HelpCircle, ArrowRight, FileText, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// AEO best practice: short, declarative, self-contained answers AI engines
// can quote directly. Each "quick answer" is a one-sentence factual claim.
const QUICK_ANSWERS = [
  { q: 'What is Boltcall?', a: 'Boltcall is an AI receptionist platform for local service businesses that answers every inbound call 24/7, books appointments, and texts back missed callers within seconds.' },
  { q: 'How fast does setup take?', a: 'Most businesses go live within 30 minutes: connect a phone number, paste in your services and FAQs, choose a voice tone, and the AI starts answering calls.' },
  { q: 'Does Boltcall replace a human receptionist?', a: 'Boltcall replaces a human receptionist for phone-driven workflows (answering, booking, qualifying), but transfers complex or in-person situations to your team automatically.' },
  { q: 'What does Boltcall cost?', a: 'Boltcall plans start at $497 per month for Starter and $649 per month for Pro. Both include unlimited AI call answering with no per-minute fees.' },
  { q: 'Where do I find detailed setup docs?', a: 'Full step-by-step documentation lives at boltcall.mintlify.app — includes integrations with Cal.com, Google Calendar, Twilio, and Retell.' },
];

// Comprehensive FAQ for the FAQPage schema + visible accordion. Targets the
// real search queries help-center visitors arrive with.
const FAQS = [
  {
    q: 'How do I set up my AI receptionist for the first time?',
    a: 'Sign in at boltcall.org/setup, paste in your business name, hours, services, and three to five frequently asked questions, then pick a voice tone (professional, friendly, authoritative, or casual). Boltcall provisions a phone number via Twilio and deploys an inbound + outbound agent on Retell automatically. Total time is usually 15-30 minutes. The agent starts answering calls as soon as you forward your existing business line to the new number.',
  },
  {
    q: 'How do I forward my existing business number to Boltcall?',
    a: 'Most carriers use *72 followed by the Boltcall number to enable call forwarding, and *73 to disable it. For VoIP systems (RingCentral, Vonage, 8x8) you set forwarding rules inside the admin panel. We recommend conditional forwarding on busy/no-answer first, then move to always-forward once you trust the AI. Full carrier-specific instructions are in the documentation.',
  },
  {
    q: 'What happens when a caller asks something the AI cannot answer?',
    a: 'Boltcall warm-transfers to a real person whenever the conversation hits a topic outside its training. You set the transfer number and define which topics trigger a transfer (emergencies, complex pricing, legal questions). The handoff happens mid-call with the AI handing over the full caller context, so the human picks up already knowing why they are calling.',
  },
  {
    q: 'Can the AI book appointments directly into my calendar?',
    a: 'Yes. Boltcall integrates with Cal.com, Google Calendar, and Calendly natively. The agent checks real-time availability during the call, offers the next two or three open slots, confirms with the caller, and writes the booking to the calendar. The caller and your team both receive a confirmation text and email within seconds.',
  },
  {
    q: 'Why are some of my calls dropping or sounding choppy?',
    a: 'Choppy call quality is almost always a network issue on the caller side or a misconfigured SIP trunk. Check that your Boltcall phone number is using the recommended Twilio Voice region for your location (Boltcall auto-picks at provisioning but it can drift). If the issue is consistent across multiple callers, open a ticket from /contact with three example call SIDs and our team responds within two business hours.',
  },
  {
    q: 'How do I update what the AI says about my business?',
    a: 'Open the dashboard, go to Agents → Knowledge Base, and edit the text directly. Changes propagate to live agents within 60 seconds — no redeploy needed. You can also add services, prices, hours, and FAQs without restarting the agent. The dashboard logs every change with a timestamp so you can roll back if something sounds off.',
  },
  {
    q: 'Does Boltcall work outside business hours?',
    a: 'Yes — that is one of the biggest reasons businesses adopt it. The AI answers 24/7/365. You configure separate behavior for business hours (book directly into calendar) vs after-hours (collect lead details, send confirmation text, queue a callback for the next business day). After-hours coverage typically captures 20-40 percent more leads with no additional staffing cost.',
  },
  {
    q: 'How do I cancel or change my plan?',
    a: 'You can change plans or cancel anytime from Billing in the dashboard. Plan changes take effect at the next billing cycle (the current period is not pro-rated). Cancellations stop billing immediately and the phone number is released after a 30-day hold period in case you change your mind. Email noam@boltcall.org if you need a longer hold.',
  },
];

// HowTo for the setup flow — Google + AI engines render this as a step list.
const HOWTO_STEPS = [
  { name: 'Sign up at boltcall.org/setup',                text: 'Create your Boltcall account with email and business name. No credit card required for the trial.' },
  { name: 'Describe your business',                       text: 'Paste in your hours, top services, and 3-5 frequently asked questions so the AI knows how to answer your specific callers.' },
  { name: 'Pick a voice tone',                            text: 'Choose professional, friendly, authoritative, or casual. You can preview each tone before saving.' },
  { name: 'Boltcall provisions phone + agents',           text: 'A Twilio number and two Retell agents (inbound + outbound) are created automatically. This step takes 30-60 seconds.' },
  { name: 'Forward your existing line',                   text: 'Use *72 followed by your new Boltcall number to forward calls. Test with one inbound call to confirm everything works.' },
];

const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Boltcall Help Center: Setup Guides, FAQs & Troubleshooting';
    updateMetaDescription('Boltcall help center: step-by-step AI receptionist setup, call-forwarding guides, calendar integration, troubleshooting call quality, and answers to billing and account questions.');

    // Canonical — match the trailing-slash version Netlify serves.
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://boltcall.org/help-center/';

    // FAQPage — biggest AEO lift, eligible for rich result + AI Overview citation.
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'help-faq-schema';
    faqSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(faqSchema);

    // HowTo — Google's rich-result eligibility for "how to set up X" queries.
    const howToSchema = document.createElement('script');
    howToSchema.type = 'application/ld+json';
    howToSchema.id = 'help-howto-schema';
    howToSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to set up the Boltcall AI receptionist',
      totalTime: 'PT30M',
      estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
      step: HOWTO_STEPS.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.name,
        text: s.text,
      })),
    });
    document.head.appendChild(howToSchema);

    // Speakable — flags the Quick Answers section as voice-search friendly.
    const speakableSchema = document.createElement('script');
    speakableSchema.type = 'application/ld+json';
    speakableSchema.id = 'help-speakable-schema';
    speakableSchema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: document.title,
      url: 'https://boltcall.org/help-center/',
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.speakable-answer'] },
    });
    document.head.appendChild(speakableSchema);

    return () => {
      document.getElementById('help-faq-schema')?.remove();
      document.getElementById('help-howto-schema')?.remove();
      document.getElementById('help-speakable-schema')?.remove();
    };
  }, []);

  const helpCategories: HelpCategory[] = [
    {
      id: 'getting-started',
      title: 'Step-by-Step Guide to Setting Up Your AI Receptionist',
      description: 'How to setup and best settings for customers to get started with Boltcall',
      articleCount: 5,
      icon: <BookOpen className="w-8 h-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'known-issues',
      title: 'Comprehensive Troubleshooting for Call Quality Issues',
      description: 'A place for all known issues that the team is working on fixing and work arounds for the time being.',
      articleCount: 4,
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'phone-setup',
      title: 'How to Configure Phone Numbers and Verified Caller ID',
      description: 'Phone numbers and Verified Call ID',
      articleCount: 8,
      icon: <Phone className="w-8 h-8" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'how-to-guides',
      title: 'Practical How-To Guides for Every Boltcall Feature',
      description: 'How to Guides that you might need',
      articleCount: 11,
      icon: <HelpCircle className="w-8 h-8" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const popularArticles = [
    {
      id: '1',
      title: 'Setting up your first AI agent',
      category: 'Getting Started',
      readTime: '5 min read',
      views: '1.2k views'
    },
    {
      id: '2',
      title: 'Troubleshooting call quality issues',
      category: 'Known Issues',
      readTime: '3 min read',
      views: '890 views'
    },
    {
      id: '3',
      title: 'Configuring phone numbers',
      category: 'Phone Setup',
      readTime: '7 min read',
      views: '756 views'
    },
    {
      id: '4',
      title: 'Creating custom voice prompts',
      category: 'How To Guides',
      readTime: '4 min read',
      views: '623 views'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search functionality
    // TODO: implement search functionality
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Help Center - Support & Documentation | Boltcall",
    "description": "Boltcall help center with support articles, FAQs, and documentation. Find answers to common questions about AI receptionist setup, phone configuration, and troubleshooting.",
    "url": "https://boltcall.org/help-center",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Boltcall",
      "url": "https://boltcall.org"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Help Center", "item": "https://boltcall.org/help-center" }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD WebPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Boltcall Help Center: Setup Guides, Troubleshooting &amp; Support</h1>
            <p className="text-xl text-gray-600 mb-8">Find answers, guides, and solutions to get the most out of Boltcall</p>
            
            {/* Search Input */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="Search for help articles, guides, or solutions..."
                />
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Lead answer — AEO best practice: a self-contained 40-60 word
            definition that AI engines and AI Overviews can quote verbatim. */}
        <p className="speakable-answer text-gray-700 text-center max-w-4xl mx-auto mb-10 text-lg leading-relaxed">
          The Boltcall Help Center is the support hub for the Boltcall AI receptionist platform. It answers the most common setup, configuration, and troubleshooting questions for local service businesses: how to launch your first AI agent, forward your phone number, integrate Cal.com or Google Calendar, fix call-quality issues, and manage billing. Most setups complete in 30 minutes.
        </p>

        {/* Quick Answers — short citable Q&A pairs, ideal for AI Overview
            extraction and voice search snippets. */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick answers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_ANSWERS.map((qa) => (
              <div key={qa.q} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="font-semibold text-gray-900 text-sm mb-1.5">{qa.q}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{qa.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Documentation CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-12"
        >
          <a
            href="https://boltcall.mintlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-xl shadow-blue-600/10 transition hover:brightness-[1.03]"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Open Boltcall Documentation</h2>
                  <p className="mt-1 text-white/85">
                    Step-by-step setup guides, integrations, features, troubleshooting, and best practices.
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 md:self-auto">
                Go to Documentation
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </a>
        </motion.div>

        {/* Help Categories */}
        <div className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl font-bold text-gray-900 mb-8 text-center"
          >
            How to Set Up Your AI Receptionist: A Step-by-Step Guide
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {helpCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow cursor-pointer group"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 ${category.bgColor} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <div className={category.color}>
                      {category.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FileText className="w-4 h-4" />
                        <span>{category.articleCount} articles</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
                        <span className="text-sm font-medium">Browse</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Popular Articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Troubleshooting Call Quality: Common Issues and Solutions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {popularArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{article.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{article.readTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{article.views}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links – Related Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Explore Boltcall Features, Pricing, and Documentation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { label: 'Documentation', href: 'https://boltcall.mintlify.app/', external: true },
              { label: 'About Boltcall', href: '/about' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Contact Us', href: '/contact' },
              { label: 'AI Receptionist', href: '/features/ai-receptionist' },
            ].map(({ label, href, external }) => (
              external ? (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 hover:shadow-md"
                >
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  to={href}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 hover:shadow-md"
                >
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            ))}
          </div>
        </motion.div>

        {/* What You'll Find Here */}
        <div className="mt-16 mb-10 bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How Boltcall&apos;s Help Center Is Organized: Four Core Areas</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            This Help Center is organized into four core areas so you can quickly find the answer you need — whether you're just getting started, configuring your AI receptionist, or running into a technical issue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {[
              {
                title: 'Getting Started',
                desc: 'Step-by-step guides for setting up your Boltcall account, connecting your phone number, and launching your AI receptionist for the first time. Most businesses are live within 30 minutes.',
              },
              {
                title: 'AI Receptionist Setup',
                desc: 'Configure your AI\'s voice, script, business hours, and call-handling rules. Learn how to customize responses for your specific services and frequently asked questions.',
              },
              {
                title: 'Appointment Booking & SMS',
                desc: 'Connect your calendar, set booking rules, and configure SMS follow-up sequences. Covers Google Calendar, Calendly, and direct booking integrations.',
              },
              {
                title: 'Billing & Account',
                desc: 'Manage your subscription, update payment methods, and understand your plan limits. Includes guidance on upgrading, downgrading, and canceling.',
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col gap-1 p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">{item.title}</span>
                <span className="text-sm text-gray-600 leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-6 leading-relaxed">
            Can't find what you need? Our support team responds to all inquiries within 2 business hours Monday–Friday, 9am–6pm ET. Use the Contact Support button below to reach us directly.
          </p>
        </div>

        {/* Full FAQ — visible accordion mirrors the FAQPage schema. */}
        <section className="mt-16 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Frequently asked questions</h2>
          <p className="text-gray-600 mb-8 text-sm">
            Detailed answers to the questions Boltcall customers ask most often. For step-by-step walkthroughs with screenshots, open the full documentation at boltcall.mintlify.app.
          </p>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-gray-900" style={{ listStyle: 'none' }}>
                  {f.q}
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* How-to: visible mirror of the HowTo schema. */}
        <section className="mt-16 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How to set up the Boltcall AI receptionist (5 steps)</h2>
          <p className="text-gray-600 mb-8 text-sm">
            Total time: about 30 minutes. No engineering required.
          </p>
          <ol className="space-y-4">
            {HOWTO_STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 bg-blue-50 rounded-xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help? Contact Boltcall support</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team responds to every inquiry within two business hours, Monday through Friday, 9am to 6pm Eastern. For account-specific questions, please include your business name and the phone number on your account when you reach out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Contact Support
            </Link>
            <Link
              to="/book-a-call"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Schedule a Call
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpCenter;
