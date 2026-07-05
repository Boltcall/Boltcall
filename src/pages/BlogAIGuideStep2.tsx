import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone, MessageSquare, RotateCw, Zap, Globe, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogAIGuideStep2: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Level 2: Choosing Right AI Tools | Boltcall';
    updateMetaDescription('Level 2: Choose the right AI tools for your business. Discover essential tools and learn how to evaluate which fit your needs.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Level 2: Choosing the Right AI Tools",
      "description": "Discover the essential AI tools for local businesses and how to evaluate which ones fit your needs.",
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
        "@id": "https://boltcall.org/ai-guide-for-businesses/level-2-choosing-ai-tools"
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
        { "@type": "ListItem", "position": 3, "name": "Level 2: Choosing AI Tools", "item": "https://boltcall.org/ai-guide-for-businesses/level-2-choosing-ai-tools" },
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
              { label: 'Choosing the Right AI Tools', href: '/blog/ai-guide-step-2' }
            ]} />
            <Link 
              to="/ai-guide-for-businesses" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guide Overview</span>
            </Link>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Choosing the Right <span className="text-green-600">AI Tools</span>
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>January 20, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>6 min read</span>
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
          <p className="text-gray-700 text-sm leading-relaxed">When choosing AI tools, prioritize: (1) phone-first over chat-only, (2) vertical-specific training over generic bots, (3) calendar integration, and (4) transparent pricing. Boltcall checks all four boxes for service businesses.</p>
        </div>
        {/* Introduction */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-16"
        >
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Now that you understand what AI can do for your business, it's time to choose the right tools. 
            Not all AI solutions are created equal, and the best choice depends on your specific needs, 
            budget, and business type.
          </p>
        </motion.section>

        {/* Essential AI Tools */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-green-600 rounded-full"></div>
            Essential AI Tools for Service Businesses
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">AI Receptionist</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-3">
                24/7 call handling, appointment scheduling, and customer support. Never miss a call again.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Answers calls 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Schedules appointments automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Handles common questions</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">SMS Agent</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-3">
                Automated SMS conversations that book appointments, answer questions, and engage customers.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Text-based appointment booking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Instant customer responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Works with existing phone number</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <RotateCw className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Multi-channel Follow-ups</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-3">
                Automated follow-up sequences across SMS, email, and phone to nurture leads and close more deals.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Multi-touch campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Automated lead nurturing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Customizable sequences</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Instant Form Replies</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-3">
                Automatically respond to form submissions within seconds, qualifying leads and booking appointments instantly.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Instant form response</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Lead qualification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Works with any form</span>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Website Widget</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-3">
                AI chat widget for your website that answers visitor questions, captures leads, and books appointments 
                directly from your site—24/7.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Website chat integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Lead capture and qualification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Customizable appearance</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* What to Look For */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-green-600 rounded-full"></div>
            What to Look For When Choosing AI Tools
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Ease of Setup</h3>
              <p className="text-gray-700 leading-relaxed">
                Look for tools that can be set up in under 30 minutes without technical knowledge. The best AI tools 
                for small businesses don't require IT support or coding skills. You should be able to get started 
                the same day you sign up.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. Integration Capabilities</h3>
              <p className="text-gray-700 leading-relaxed">
                Your AI tools should integrate seamlessly with your existing systems—calendar apps (Google Calendar, 
                Cal.com), CRM systems, and your website. Avoid tools that require you to completely change your 
                workflow.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Customization Options</h3>
              <p className="text-gray-700 leading-relaxed">
                Every business is different. Your AI should be customizable to match your brand voice, business hours, 
                and specific needs. Look for tools that let you customize greetings, responses, and workflows.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">4. Pricing Transparency</h3>
              <p className="text-gray-700 leading-relaxed">
                Avoid tools with hidden fees or complicated pricing structures. Look for clear, transparent pricing 
                that fits your budget. Many AI tools offer free trials or low-cost starter plans so you can test 
                before committing.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">5. Support and Onboarding</h3>
              <p className="text-gray-700 leading-relaxed">
                Good AI tools come with excellent support. Look for providers that offer free onboarding, 
                documentation, and responsive customer support. You shouldn't have to figure everything out on your own.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Pricing Considerations */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-green-600 rounded-full"></div>
            Pricing Considerations
          </h2>
          
          <p className="text-gray-700 leading-relaxed mb-6">
            AI tools for local businesses typically range from $50-$300 per month, depending on features and usage. 
            When evaluating cost, consider:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">What's Included</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Number of calls/messages included</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Features and integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Support level</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">ROI Calculation</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Time saved per week (hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Additional leads captured</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Reduced no-shows</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-green-600 rounded-full"></div>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>What's the most important feature to look for in AI for service businesses?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Phone capability. Most AI tools are chat-only. For service businesses, 70%+ of leads still call first — so you need AI that handles inbound calls, not just web chat.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>How much should I expect to pay for AI receptionist software?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Quality AI receptionist platforms run $297–$497/month. Compare that to a part-time receptionist at $1,500+/month or a live answering service at $400–$800/month with limited capabilities.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>Can AI integrate with my existing scheduling software?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Yes. Look for platforms with native integrations for Google Calendar, Calendly, Acuity, or your industry-specific CRM. Boltcall supports the most common scheduling tools.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>How long does it take to see results?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Most businesses recover their monthly fee within the first week by capturing just 1–2 additional jobs from calls that would have gone to voicemail.
              </div>
            </details>
          </div>
        </motion.section>

        {/* Pros & Cons */}
        <motion.section
          id="pros-cons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.46 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-green-600 rounded-full"></div>
            Pros &amp; Cons of AI Tools for Local Businesses
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4">Pros</h3>
              <ul className="space-y-3">
                {[
                  'Reduced staffing costs',
                  '24/7 availability without overtime',
                  'Consistent customer experience every call',
                  'Faster lead response — captured in seconds',
                  'Automatic data capture into your CRM',
                  'Scales without hiring additional staff',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-green-900 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-4">Cons</h3>
              <ul className="space-y-3">
                {[
                  'Upfront setup time required',
                  'Learning curve for staff and owner',
                  'Monthly subscription cost to budget for',
                  'Requires reliable internet and power',
                  'Not ideal for complex, nuanced situations',
                  'Needs ongoing tuning as your business evolves',
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
                <a href="https://www.g2.com/categories/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  G2: "Best AI Tools for Small Business" Report (2024)
                </a>
              </li>
              <li>
                <a href="https://www.capterra.com/resources/ai-software-adoption-survey/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Capterra: "AI Software Adoption Survey" (2024)
                </a>
              </li>
              <li>
                <a href="https://www.gartner.com/en/information-technology/insights/artificial-intelligence" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Gartner Magic Quadrant for AI Platforms
                </a>
              </li>
              <li>
                <a href="https://techcrunch.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  TechCrunch: "How SMBs are choosing AI vendors in 2024"
                </a>
              </li>
              <li>
                <a href="https://www.forbes.com/sites/technology/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Forbes: "AI Tool Selection Framework for Small Business"
                </a>
              </li>
              <li>
                <a href="https://clutch.co/resources/small-business-technology-survey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Clutch.co: "Small Business Technology Survey" (2024)
                </a>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-gray-200"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/ai-guide-for-businesses/level-1-understanding-ai"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous: Level 1 - Understanding AI</span>
            </Link>
            <Link 
              to="/ai-guide-for-businesses/level-3-getting-started" 
              className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold transition-colors"
            >
              <span>Next: Level 3 - Getting Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* AI Tools Comparison Table for Local Businesses */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Tool Categories: What Each Solves for Local Businesses</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Matching AI tool categories to the business problems they actually solve</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">AI Tool Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Problem It Solves</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Example</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Monthly Cost Range</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI phone receptionist', 'Missed calls, after-hours leads', 'Boltcall', '$549-897'],
                  ['AI writing assistant', 'Marketing copy, emails, proposals', 'ChatGPT, Claude', '$20 – $100'],
                  ['AI scheduling tool', 'Appointment booking and reminders', 'Calendly AI, Boltcall', '$15-897'],
                  ['AI review management', 'Google review generation and response', 'Birdeye, Podium, Boltcall', '$100 – $400'],
                  ['AI social media', 'Content creation and posting', 'Hootsuite AI, Buffer', '$50 – $200'],
                  ['AI chatbot (website)', 'Website visitor questions', 'Intercom, Drift', '$100 – $500'],
                  ['AI ads management', 'Google/Meta ad optimization', 'Madgicx, Adzooma', '$150 – $1,000'],
                ].map(([category, problem, example, cost]) => (
                  <tr key={category} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{category}</td>
                    <td className="px-4 py-3 text-gray-600">{problem}</td>
                    <td className="px-4 py-3 text-gray-600">{example}</td>
                    <td className="px-4 py-3 text-gray-600">{cost}</td>
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

export default BlogAIGuideStep2;

