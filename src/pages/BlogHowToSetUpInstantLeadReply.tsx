import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, Settings, Zap, MessageSquare, Phone, Globe, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogHowToSetUpInstantLeadReply: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How to Set Up Instant Lead Reply for Website/Ads';
    updateMetaDescription('How to set up instant lead reply in your website and ads. Step-by-step guide to automate lead responses. Start now.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Set Up Instant Lead Reply in Your Website/Ads with Boltcall",
      "description": "How to set up instant lead reply in your website and ads. Step-by-step guide to automate lead responses.",
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
      "datePublished": "2025-03-01",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/setup-instant-lead-reply"
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Set Up Instant Lead Reply", "item": "https://boltcall.org/blog/how-to-set-up-instant-lead-reply"}]});
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
      <ReadingProgress />
      
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
              { label: 'How to Set Up Instant Lead Reply', href: '/blog/how-to-set-up-instant-lead-reply' }
            ]} />
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              How to Set Up <span className="text-blue-600">Instant Lead Reply</span> in Your Website/Ads with Boltcall
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>March 1, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
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
            Setting up instant lead reply with Boltcall is straightforward and can be done in 1-2 hours. This step-by-step guide walks you through connecting your website forms, Facebook Ads, Google Ads, and other lead sources to Boltcall's instant reply system.
          </p>
        </motion.div>

        {/* Prerequisites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>What You'll Need</h2>
          
          <ul className="space-y-3 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span>A Boltcall account (sign up at boltcall.com)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span>Access to your website's form settings or form builder</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span>Access to your Facebook Ads or Google Ads account (if using ads)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span>Basic knowledge of copying/pasting URLs (no coding required)</span>
            </li>
          </ul>
        </motion.div>

        {/* Step 1: Sign Up */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              1
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Sign Up and Access Your Dashboard</h2>
          </div>

          <ol className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <span className="font-semibold mr-3">1.</span>
              <span>Go to boltcall.com and click "Sign Up" or "Get Started"</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">2.</span>
              <span>Create your account with your business email</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">3.</span>
              <span>Complete the initial setup wizard (takes 5-10 minutes)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">4.</span>
              <span>Navigate to "Instant Lead Reply" in your dashboard</span>
            </li>
          </ol>
        </motion.div>

        {/* Step 2: Website Forms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              2
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Connect Your Website Forms</h2>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Option A: Webhook Integration (Most Common)</h3>
          
          <ol className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <span className="font-semibold mr-3">1.</span>
              <span>In Boltcall dashboard, go to "Instant Lead Reply" → "Web Forms"</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">2.</span>
              <span>Click "Add New Form" and copy your unique webhook URL</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">3.</span>
              <span>In your form builder (WordPress, Wix, Squarespace, etc.), add the webhook URL to your form's submission settings</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">4.</span>
              <span>Test by submitting a form—you should receive an instant reply within seconds</span>
            </li>
          </ol>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Option B: Native Integrations</h3>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            Boltcall offers native integrations for popular platforms:
          </p>
          <ul className="space-y-3 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>WordPress:</strong> Install the Boltcall plugin and connect in one click</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Wix:</strong> Add Boltcall app from Wix App Market</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Squarespace:</strong> Add webhook in form settings</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Custom Forms:</strong> Use webhook URL or API integration</span>
            </li>
          </ul>
        </motion.div>

        {/* Step 3: Facebook Ads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              3
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Connect Facebook Ads</h2>
          </div>

          <ol className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <span className="font-semibold mr-3">1.</span>
              <span>In Boltcall dashboard, go to "Instant Lead Reply" → "Facebook Ads"</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">2.</span>
              <span>Click "Connect Facebook" and authorize Boltcall to access your Facebook Ads account</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">3.</span>
              <span>Select which ad campaigns should trigger instant replies</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">4.</span>
              <span>Configure your response message and qualification questions</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">5.</span>
              <span>Test by clicking one of your Facebook ads—you should receive an instant reply</span>
            </li>
          </ol>

          <p className="text-lg text-gray-700 leading-relaxed">
            Once connected, every person who clicks your Facebook ad and submits their information will receive an instant reply within seconds, dramatically improving your ad conversion rates.
          </p>
        </motion.div>

        {/* Step 4: Google Ads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              4
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Connect Google Ads</h2>
          </div>

          <ol className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <span className="font-semibold mr-3">1.</span>
              <span>In Boltcall dashboard, go to "Instant Lead Reply" → "Google Ads"</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">2.</span>
              <span>Click "Connect Google Ads" and authorize access</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">3.</span>
              <span>Set up your Google Ads webhook URL in Google Ads → Tools → Conversions</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">4.</span>
              <span>Configure which conversion actions trigger instant replies</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">5.</span>
              <span>Test by completing a form submission from a Google Ad</span>
            </li>
          </ol>
        </motion.div>

        {/* Step 5: Configure Response */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              5
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Configure Your Response Messages</h2>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Customize Your Instant Reply</h3>
          
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            In Boltcall's dashboard, you can customize:
          </p>

          <ul className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <MessageSquare className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Initial Response Message:</strong> The first message leads receive. Make it personal and reference their inquiry.
              </div>
            </li>
            <li className="flex items-start">
              <Zap className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Qualification Questions:</strong> Set up questions to automatically qualify leads (budget, timeline, needs, etc.)
              </div>
            </li>
            <li className="flex items-start">
              <Phone className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Response Channels:</strong> Choose email, SMS, phone call, or all of the above
              </div>
            </li>
            <li className="flex items-start">
              <Globe className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Appointment Booking:</strong> Enable automatic calendar booking if applicable
              </div>
            </li>
            <li className="flex items-start">
              <Settings className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Business Hours:</strong> Set when instant replies should be sent vs. queued for business hours
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Step 6: Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              6
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Test Your Setup</h2>
          </div>

          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Before going live, test your instant lead reply system:
          </p>

          <ol className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <span className="font-semibold mr-3">1.</span>
              <span>Submit a test form on your website using a real email/phone number</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">2.</span>
              <span>Check that you receive a reply within 5-10 seconds</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">3.</span>
              <span>Respond to the AI's questions to test the conversation flow</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">4.</span>
              <span>Verify that qualified leads appear in your dashboard</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-3">5.</span>
              <span>Test from different channels (email, SMS, phone) if enabled</span>
            </li>
          </ol>
        </motion.div>

        {/* Common Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Common Setup Issues and Solutions</h2>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Issue: Webhook Not Receiving Data</h3>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            <strong>Solution:</strong> Verify the webhook URL is correctly pasted in your form settings. Check that your form builder supports webhooks (most modern builders do). Test the webhook URL using a tool like webhook.site to ensure it's receiving data.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Issue: Replies Not Sending</h3>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            <strong>Solution:</strong> Check your response message configuration in Boltcall. Ensure your email/SMS settings are verified. Check spam folders—initial test messages sometimes go to spam.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Issue: Facebook/Google Ads Not Connecting</h3>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            <strong>Solution:</strong> Ensure you're using an admin account for your ad platform. Clear browser cache and try reconnecting. Check that you've granted all necessary permissions during authorization.
          </p>
        </motion.div>

        {/* Best Practices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Best Practices for Instant Lead Reply</h2>
          
          <ul className="space-y-4 text-lg text-gray-700 mb-8">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Personalize messages:</strong> Use the lead's name and reference their specific inquiry</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Keep it conversational:</strong> Write responses that sound natural, not robotic</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Ask qualifying questions:</strong> Use AI to automatically qualify leads before they reach your team</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Enable multi-channel:</strong> Respond via email, SMS, and phone to reach leads on their preferred channel</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Monitor and optimize:</strong> Review response rates and adjust messages based on what works</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <span><strong>Set up notifications:</strong> Get alerts when high-value leads come in so you can follow up personally</span>
            </li>
          </ul>
        </motion.div>

        {/* Conclusion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>You're All Set!</h2>
          
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Setting up instant lead reply with Boltcall typically takes 1-2 hours from start to finish. Once configured, every lead from your website, Facebook Ads, Google Ads, or other sources will receive an instant reply within seconds.
          </p>

          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            The system works automatically 24/7, ensuring no lead ever waits for a response. You'll see qualified leads appear in your dashboard, and you can focus on closing deals instead of chasing down inquiries.
          </p>

          <p className="text-lg text-gray-700 leading-relaxed">
            If you run into any issues during setup, Boltcall's support team is available to help. Most businesses see a significant increase in lead conversion within the first week of implementing instant lead reply.
          </p>
        </motion.div>

        {/* Editor's Note */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
          <p className="text-sm font-bold text-blue-800 mb-1">Editor's Note — April 2026</p>
          <p className="text-blue-900 text-sm leading-relaxed">Setup complexity for instant lead reply tools has dropped dramatically in 2026. Modern platforms now offer native no-code integrations with the most popular form builders, ad platforms, and CRMs — meaning the webhook steps described here are often replaced by a single toggle. If you're setting this up today, expect the process to take under 30 minutes.</p>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
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
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* Setup Steps Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Setting Up Instant Lead Reply: Steps and Timeline</h2>
          <p className="text-gray-500 text-sm text-center mb-6">From zero to live instant response in under 30 minutes with Boltcall</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Step</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What to Do</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Time Required</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Manual or Automated After Setup</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['1. Connect your phone number', 'Forward your business line to Boltcall or port a new number', '5 minutes', 'Automated forever after'],
                  ['2. Train your AI receptionist', 'Enter your services, hours, and common FAQs', '10 minutes', 'Automated — updates in real time'],
                  ['3. Connect your calendar', 'Sync Google Calendar, Calendly, or your scheduling software', '5 minutes', 'Automated — live booking'],
                  ['4. Set your SMS template', 'Customize the follow-up text callers receive within 60 seconds', '5 minutes', 'Automated on every call'],
                  ['5. Test with a live call', 'Call your number and verify the greeting and booking flow', '5 minutes', 'Done — go live'],
                  ['6. Review first-week results', 'Check your dashboard for calls answered and appointments booked', '10 minutes/week', 'Monthly report automated'],
                ].map(([step, what, time, status]) => (
                  <tr key={step} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{step}</td>
                    <td className="px-4 py-3 text-gray-600">{what}</td>
                    <td className="px-4 py-3 text-gray-600">{time}</td>
                    <td className="px-4 py-3 text-gray-600">{status}</td>
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

export default BlogHowToSetUpInstantLeadReply;

