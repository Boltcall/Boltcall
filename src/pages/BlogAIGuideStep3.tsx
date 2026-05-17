import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, CheckCircle, Zap, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogAIGuideStep3: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Level 3: Getting Started with AI Tools | Boltcall';
    updateMetaDescription('Level 3: Get started with AI in 30 minutes. Step-by-step guide to implementing AI in your business from setup to going live.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Level 3: Getting Started with AI",
      "description": "Step-by-step guide to implementing AI in your business, from setup to going live in under 30 minutes.",
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
      "datePublished": "2025-02-01",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/ai-guide-for-businesses/level-3-getting-started"
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

    // BreadcrumbList schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "AI Guide for Businesses", "item": "https://boltcall.org/ai-guide-for-businesses" },
        { "@type": "ListItem", "position": 3, "name": "Level 3: Getting Started", "item": "https://boltcall.org/ai-guide-for-businesses/level-3-getting-started" },
      ],
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
      document.getElementById('breadcrumb-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
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
              { label: 'Getting Started with AI', href: '/blog/ai-guide-step-3' }
            ]} />
            <Link 
              to="/ai-guide-for-businesses" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guide Overview</span>
            </Link>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Getting Started with <span className="text-purple-600">AI</span>
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>January 20, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>10 min read</span>
              </div>
            </div>

            {/* Author byline */}
            <div className="flex items-center gap-3 mb-6 text-sm text-gray-500 mt-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">BC</div>
              <span>Written by <strong className="text-gray-700">The Boltcall Team</strong> · Updated {new Date().getFullYear()}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">
        {/* TL;DR */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-5 mb-8">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">TL;DR</p>
          <p className="text-gray-700 text-sm leading-relaxed">Getting started takes less than 24 hours. Connect your phone number, configure your AI agent's voice and FAQ responses, integrate your calendar, and go live. Most businesses see ROI within the first week.</p>
        </div>
        {/* Introduction */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-16"
        >
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            You've learned what AI can do and which tools to choose. Now it's time to implement. This step-by-step 
            guide will walk you through setting up AI in your business in under 30 minutes.
          </p>
        </motion.section>

        {/* Setup Process */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-purple-600 rounded-full"></div>
            The 30-Minute Setup Process
          </h2>
          
          <div className="space-y-8">
            {/* Level 1 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                  1
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your AI Agent</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Start by creating your AI agent using the setup wizard. You'll be asked to provide basic information 
                  about your business:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Business name and type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Services you offer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Business hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Contact information</span>
                  </li>
                </ul>
                <p className="text-gray-600 text-sm mt-3 italic">
                  Time: ~5 minutes
                </p>
              </div>
            </div>

            {/* Level 2 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                  2
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Calendar</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect your existing calendar system. Most AI tools support popular calendar apps:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Google Calendar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Cal.com</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Microsoft Outlook</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Apple Calendar</span>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  The connection process is usually a simple OAuth flow—just click "Connect" and authorize access. 
                  Your AI will automatically check availability and book appointments directly into your calendar.
                </p>
                <p className="text-gray-600 text-sm mt-3 italic">
                  Time: ~3 minutes
                </p>
              </div>
            </div>

            {/* Level 3 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                  3
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Customize Your Greeting and Responses</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Personalize how your AI interacts with customers. You can customize:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Opening greeting and tone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Common questions and answers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Appointment booking flow</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Business-specific information</span>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  Many platforms offer industry-specific templates to speed this up. You can always refine these 
                  later based on real customer interactions.
                </p>
                <p className="text-gray-600 text-sm mt-3 italic">
                  Time: ~10 minutes
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                  4
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Go Live</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Once you've completed the setup, it's time to activate your AI. This typically involves:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Connecting your phone number (for call handling)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Installing website widget (if using)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>Testing with a test call or message</span>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  Most platforms offer a test mode so you can try everything before going live with real customers.
                </p>
                <p className="text-gray-600 text-sm mt-3 italic">
                  Time: ~12 minutes
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Best Practices */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-purple-600 rounded-full"></div>
            Implementation Best Practices
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Simple</h3>
              <p className="text-gray-700 leading-relaxed">
                Don't try to automate everything at once. Start with one feature—like AI receptionist for calls—and 
                expand from there once you're comfortable. This makes the transition smoother and helps you learn 
                what works best for your business.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monitor and Refine</h3>
              <p className="text-gray-700 leading-relaxed">
                Review your AI's conversations regularly, especially in the first few weeks. Look for common 
                questions it's missing or areas where responses could be improved. Most AI tools learn from your 
                feedback and get better over time.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Train Your Team</h3>
              <p className="text-gray-700 leading-relaxed">
                Make sure your team knows how the AI system works and when it will transfer calls to them. Set 
                clear expectations about what the AI handles vs. what requires human attention. This ensures 
                smooth handoffs and better customer experiences.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Use Analytics</h3>
              <p className="text-gray-700 leading-relaxed">
                Most AI platforms provide analytics on call volume, booking rates, and customer satisfaction. 
                Use this data to understand your AI's performance and identify opportunities for improvement.
              </p>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-purple-600 rounded-full"></div>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>How long does setup actually take?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-600 text-purple-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Most businesses are live within 24 hours. You'll need: a phone number (or forward your existing one), your business hours, FAQ answers, and calendar access.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>What if the AI gives a wrong answer?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-600 text-purple-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                You control the AI's knowledge base. You can review call transcripts, update responses, and refine performance from your dashboard. The AI gets smarter over time.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>Do I need to change my phone number?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-600 text-purple-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                No. You can forward your existing number to Boltcall, or get a new number — your choice. Callers won't know anything changed.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>What metrics should I track to measure success?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-600 text-purple-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Track: calls answered vs. missed, bookings per week (before and after), and revenue from AI-captured leads. Most clients see 30–50% more booked appointments in month one.
              </div>
            </details>
          </div>
        </motion.section>

        {/* Pros & Cons */}
        <motion.section
          id="pros-cons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-purple-600 rounded-full"></div>
            Should You Start with AI Now?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4">Pros of Starting Now</h3>
              <ul className="space-y-3">
                {[
                  'Early mover advantage over local competitors',
                  'Immediate ROI possible within the first month',
                  'AI improves over time as it learns your business',
                  'Competitors are still falling behind — act now',
                  'Setup is faster than most business owners expect',
                  'Dedicated onboarding support available',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-green-900 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-4">Cons of Waiting</h3>
              <ul className="space-y-3">
                {[
                  'Competitors adopting AI faster every month',
                  'Missed leads accumulate daily while you wait',
                  'Integration takes time — starting later means later results',
                  'Staff learning curve is longer when change is rushed',
                  'AI platform costs are rising as adoption grows',
                  'Catching up to early adopters becomes harder over time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-red-900 text-sm">
                    <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500 font-bold text-base leading-none">&#x2715;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Success Stories */}
        <motion.section
          id="success-stories"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.46 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-purple-600 rounded-full"></div>
            Success Stories
          </h2>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">🛁 Plumbing Company — Blue Ridge Plumbing</h3>
              <p className="text-gray-700 text-sm leading-relaxed">Blue Ridge Plumbing went live in under 30 minutes using Boltcall’s setup wizard, forwarding their existing number to the AI receptionist. In the first week their dispatcher reported zero missed calls and four new emergency bookings that previously would have gone to voicemail overnight.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">💇 Salon — Luxe Hair Studio</h3>
              <p className="text-gray-700 text-sm leading-relaxed">Luxe Hair Studio’s front desk was spending 90 minutes a day answering booking calls between client sessions. After connecting their Google Calendar to Boltcall, the AI handles all appointment scheduling autonomously — freeing the stylist-owner to take on two additional clients per day and grow monthly revenue by roughly $2,400.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">🏡 Real Estate Team — The Caldwell Group</h3>
              <p className="text-gray-700 text-sm leading-relaxed">The Caldwell Group, a four-agent real estate team, set up Boltcall during an active listing weekend and responded to every inbound lead in under 60 seconds. The team closed two additional buyer contracts that month which they directly attribute to speed-to-lead — a combined commission gain of over $18,000.</p>
            </div>
          </div>
        </motion.section>

        {/* Sources & Further Reading */}
        <motion.section
          id="sources"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="mb-16"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sources &amp; Further Reading</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://www.bain.com/insights/topics/technology/artificial-intelligence/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Bain &amp; Company: "AI Adoption Playbook for SMBs"
                </a>
              </li>
              <li>
                <a href="https://www.hubspot.com/state-of-ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  HubSpot: "State of AI Report" (2024)
                </a>
              </li>
              <li>
                <a href="https://www.salesforce.com/resources/articles/trends-in-ai-for-customer-service/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Salesforce: "Trends in AI for Customer Service"
                </a>
              </li>
              <li>
                <a href="https://www.nielsen.com/insights/2024/local-business-digital-transformation/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Nielsen: "Local Business Digital Transformation Study"
                </a>
              </li>
              <li>
                <a href="https://www.brightlocal.com/research/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  BrightLocal: "Local Business AI Usage Survey"
                </a>
              </li>
              <li>
                <a href="https://boltcall.org/resources/ai-receptionist-impact-report" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Boltcall: "2025 AI Receptionist Impact Report"
                </a>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="my-16"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
              <div className="flex justify-center isolate">
                <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Zap className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
              <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.</p>
              <Link
                to="/setup"
                className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
              >
                Start the free setup
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 pt-8 border-t border-gray-200"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link 
              to="/ai-guide-for-businesses/level-2-choosing-ai-tools" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous: Level 2 - Choosing AI Tools</span>
            </Link>
            <Link 
              to="/ai-guide-for-businesses" 
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              <span>Back to Guide Overview</span>
            </Link>
          </div>
        </motion.div>
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* AI Implementation Checklist Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Implementation Checklist: 30-Day Launch Timeline</h2>
          <p className="text-gray-500 text-sm text-center mb-6">From choosing your first AI tool to measuring results in 30 days</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Week</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Action</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Time Required</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Expected Outcome</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Week 1', 'Set up AI phone receptionist (Boltcall)', '30 minutes', 'Zero missed calls from day 1'],
                  ['Week 1', 'Connect your calendar for live booking', '15 minutes', 'Automated appointment booking'],
                  ['Week 2', 'Configure SMS follow-up sequence', '20 minutes', 'Automated lead nurturing starts'],
                  ['Week 2', 'Enable appointment reminder automation', '15 minutes', 'No-show rate begins to drop'],
                  ['Week 3', 'Set up post-visit review request', '20 minutes', 'Google reviews start growing'],
                  ['Week 3', 'Write AI-assisted FAQ content for website', '60 minutes', 'Better AI search visibility'],
                  ['Week 4', 'Review first-month call and booking report', '30 minutes', 'Baseline data for optimization'],
                  ['Week 4', 'Add second AI tool (writing or ads)', '60 minutes', 'Broader automation coverage'],
                ].map(([week, action, time, outcome]) => (
                  <tr key={action} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{week}</td>
                    <td className="px-4 py-3 text-gray-600">{action}</td>
                    <td className="px-4 py-3 text-gray-600">{time}</td>
                    <td className="px-4 py-3 text-green-700">{outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogAIGuideStep3;

