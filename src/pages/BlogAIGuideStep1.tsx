import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone, MessageSquare, RotateCw, Bell, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogAIGuideStep1: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Level 1: Understanding AI for Local Businesses';
    updateMetaDescription('Level 1: Understanding AI for local businesses. Discover what AI can do, how it works, and why it matters. Start learning now.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Level 1: Understanding AI for Local Businesses",
      "description": "Learn what AI can automate for your business, the real benefits, and how it transforms daily operations.",
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
        "@id": "https://boltcall.org/ai-guide-for-businesses/level-1-understanding-ai"
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

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "AI Guide", "item": "https://boltcall.org/ai-guide-for-businesses"}, {"@type": "ListItem", "position": 3, "name": "Level 1: Understanding AI", "item": "https://boltcall.org/ai-guide-for-businesses/level-1-understanding-ai"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
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
              { label: 'Understanding AI for Local Businesses', href: '/blog/ai-guide-step-1' }
            ]} />
            <Link 
              to="/ai-guide-for-businesses" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guide Overview</span>
            </Link>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Understanding AI for <span className="text-blue-600">Local Businesses</span>
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>January 20, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
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
          <p className="text-gray-700 text-sm leading-relaxed">AI receptionists answer calls, book appointments, and capture leads 24/7 — giving small service businesses enterprise-level customer service at a fraction of the cost. If you miss more than 2 calls per day, AI phone answering will pay for itself.</p>
        </div>
        {/* Intro */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <p className="text-lg text-gray-700 leading-relaxed">
            In this first level you'll learn exactly what AI can handle for your service business — from
            answering calls around the clock to sending automated follow-ups — so you can decide whether
            AI is the right fit before spending a single dollar. By the end you'll understand the real
            benefits, the cost vs. value trade-off, and how other local businesses are already using AI
            to grow.
          </p>
        </motion.section>

        {/* What AI Can Automate */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            What AI Can Automate for Service Businesses
          </h2>
          
          <div className="space-y-8">
            {/* Calls */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Calls</h3>
                  <p className="text-gray-700 leading-relaxed">
                    AI receptionists answer every call, 24/7. They handle inquiries, schedule appointments, 
                    answer common questions, and transfer complex issues to your team. No more missed calls, 
                    no more voicemails that never get returned. Your AI receptionist works around the clock, 
                    ensuring every customer gets immediate attention.
                  </p>
                </div>
              </div>
            </div>

            {/* SMS */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">SMS</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Automated SMS booking lets customers schedule appointments via text message. 
                    Your AI agent handles the entire conversation, confirms availability, books the slot, 
                    and sends reminders—all without you lifting a finger. Perfect for customers who prefer 
                    texting over calling.
                  </p>
                </div>
              </div>
            </div>

            {/* Follow-ups */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RotateCw className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Follow-ups</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Keep conversations warm with automated follow-up sequences. Your AI reaches out to leads 
                    at the perfect time, nurtures relationships, and moves prospects through your sales funnel. 
                    Set up multi-touch campaigns that engage leads via SMS, email, or phone—all automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Reminders</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Reduce no-shows by up to 90% with automated appointment reminders. Your AI sends personalized 
                    reminders via SMS or email, confirming appointments and reducing last-minute cancellations. 
                    Customize timing and messaging to match your business needs.
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Qualification */}
            <div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Lead Qualification</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Instantly qualify leads as they come in. Your AI asks the right questions, determines 
                    urgency, identifies budget, and routes qualified leads directly to your calendar. 
                    No more wasting time on tire-kickers or unqualified inquiries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Benefits Explained Simply */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Benefits Explained Simply
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">Save Time</h3>
              <p className="text-gray-700 leading-relaxed">
                Automate repetitive tasks and free up 10-15 hours per week. Focus on what you do best 
                while AI handles the routine work.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">Stop Missing Leads</h3>
              <p className="text-gray-700 leading-relaxed">
                Answer every call, respond to every message instantly. Never lose a lead because you 
                were too busy or it was after hours.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">Book More Appointments</h3>
              <p className="text-gray-700 leading-relaxed">
                Convert more leads into booked appointments with instant responses and automated follow-ups. 
                Studies show businesses that respond in under 60 seconds book 391% more appointments.
              </p>
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
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>Do I need technical skills to use AI for my business?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                No. Modern AI receptionist platforms like Boltcall are set up in under 24 hours with no coding required. You configure it through a simple dashboard.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>How is AI different from a phone menu (IVR)?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                IVR systems follow rigid scripts. AI receptionists understand natural language, can answer unique questions, and adapt to conversation — just like a human.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>Will AI replace my staff?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                No. AI handles routine calls (booking, FAQs, after-hours) so your team focuses on higher-value work. Think of it as hiring a tireless first-line receptionist.
              </div>
            </details>
            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                <span>What if a caller has a complex question?</span>
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                The AI can transfer the call, take a message, or schedule a callback — ensuring no caller is left without a next step.
              </div>
            </details>
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
                <a href="https://aiindex.stanford.edu/report/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Stanford AI Index Report (2024)
                </a>
              </li>
              <li>
                <a href="https://www.technologyreview.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  MIT Technology Review: "The Business Case for AI" (2024)
                </a>
              </li>
              <li>
                <a href="https://www.ibm.com/thought-leadership/institute-business-value/en-us/report/ai-adoption" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  IBM Institute for Business Value: AI Adoption Survey
                </a>
              </li>
              <li>
                <a href="https://www2.deloitte.com/us/en/insights/focus/cognitive-technologies/state-of-ai-and-intelligent-automation-in-business-survey.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Deloitte AI Institute: "State of AI in the Enterprise"
                </a>
              </li>
              <li>
                <a href="https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/superagency-in-the-workplace" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  McKinsey: "Superagency in the Workplace" (2025)
                </a>
              </li>
              <li>
                <a href="https://openai.com/research/gpt-4" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  OpenAI: "GPT-4 Technical Report" — for context on capabilities
                </a>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* Navigation to Next Step */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-gray-200"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link 
              to="/ai-guide-for-businesses" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guide Overview</span>
            </Link>
            <Link 
              to="/ai-guide-for-businesses/level-2-choosing-ai-tools" 
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              <span>Next: Level 2 - Choosing the Right AI Tools</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* AI Capabilities for Local Businesses Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What AI Can and Cannot Do for Local Businesses Today</h2>
          <p className="text-gray-500 text-sm text-center mb-6">A realistic assessment of current AI capabilities relevant to service businesses</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Task</th>
                  <th className="px-4 py-3 font-semibold text-green-700 border-b border-gray-200">AI Can Do Now</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Maturity Level</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">ROI Timeline</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Answer phone calls 24/7', 'Yes — fully capable', 'Production-ready', 'Immediate (weeks)'],
                  ['Book appointments live', 'Yes — with calendar integration', 'Production-ready', 'Immediate (weeks)'],
                  ['Send automated follow-ups', 'Yes — SMS and email', 'Production-ready', 'Immediate (weeks)'],
                  ['Write marketing copy', 'Yes — ChatGPT, Claude', 'Production-ready', 'Immediate (weeks)'],
                  ['Manage Google Ads', 'Partial — assist only', 'Maturing', '1–3 months'],
                  ['Perform physical tasks', 'No — not yet relevant', 'Early research stage', 'Not applicable'],
                  ['Replace all staff judgment', 'No — supports, not replaces', 'Not the goal', 'Not applicable'],
                ].map(([task, can, maturity, roi]) => (
                  <tr key={task} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{task}</td>
                    <td className="px-4 py-3 text-green-700">{can}</td>
                    <td className="px-4 py-3 text-gray-600">{maturity}</td>
                    <td className="px-4 py-3 text-gray-600">{roi}</td>
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

export default BlogAIGuideStep1;

