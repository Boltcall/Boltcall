import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Code, Zap, CheckCircle, XCircle, Phone, Brain, Database, Mic, MessageSquare, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogHowToMakeAIReceptionist: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How to Make an AI Receptionist: Step-by-Step Guide';
    updateMetaDescription('How to make an AI receptionist: complete step-by-step guide. Learn to build and deploy your own AI assistant today.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Make an AI Receptionist: A Complete Step-by-Step Guide",
      "description": "How to make an AI receptionist: complete step-by-step guide. Learn to build and deploy your own AI assistant.",
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
      "datePublished": "2025-02-20",
      "dateModified": "2026-04-08",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/how-to-make-ai-receptionist"
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "How to Make an AI Receptionist", "item": "https://boltcall.org/blog/how-to-make-ai-receptionist"}]});
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
              { label: 'How to Make an AI Receptionist', href: '/blog/how-to-make-ai-receptionist' }
            ]} />
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              How to Make an <span className="text-blue-600">AI Receptionist</span>: A Complete Step-by-Step Guide
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>February 20, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>10 min read</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-blue-600 font-medium">Updated April 2026</span>
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
            Building an AI receptionist from scratch requires combining multiple technologies: speech recognition, natural language understanding, conversation management, and voice synthesis. This guide walks you through the complete process, from choosing the right tools to deploying your AI receptionist.
          </p>
        </motion.div>

        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>What You'll Need to Build an AI Receptionist</h2>
          
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <h3 className="text-2xl font-bold mb-6">Core Components</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Mic className="w-6 h-6" />
                  <h4 className="font-semibold text-lg">Speech Recognition (ASR)</h4>
                </div>
                <p className="text-blue-100 text-sm">Converts spoken words to text in real-time</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Brain className="w-6 h-6" />
                  <h4 className="font-semibold text-lg">Natural Language Understanding</h4>
                </div>
                <p className="text-blue-100 text-sm">Understands intent and context from text</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  <MessageSquare className="w-6 h-6" />
                  <h4 className="font-semibold text-lg">Conversation Management</h4>
                </div>
                <p className="text-blue-100 text-sm">Manages dialogue flow and state</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Phone className="w-6 h-6" />
                  <h4 className="font-semibold text-lg">Text-to-Speech (TTS)</h4>
                </div>
                <p className="text-blue-100 text-sm">Converts responses back to natural speech</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step 1 */}
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
            <h2 className="text-3xl font-bold text-gray-900">Choose Your Technology Stack</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Option 1: All-in-One Platforms (Easiest)
              </h3>
              <p className="text-gray-700 mb-4">
                Use platforms like Retell AI, Twilio Voice AI, or Boltcall that provide the complete infrastructure:
              </p>
              <ul className="space-y-2 text-gray-700 mb-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Pre-built ASR/TTS:</strong> No need to integrate separate services</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Conversation management:</strong> Built-in dialogue handling</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Phone integration:</strong> Direct connection to phone systems</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span><strong>Time to deploy:</strong> 1-2 days</span>
                </li>
              </ul>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Best for:</strong> Businesses that want to get started quickly without technical complexity.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                Option 2: Build from Components (Most Control)
              </h3>
              <p className="text-gray-700 mb-4">
                Assemble your own stack using individual services:
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Speech Recognition:</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Google Cloud Speech-to-Text</li>
                    <li>• AWS Transcribe</li>
                    <li>• Deepgram</li>
                    <li>• AssemblyAI</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">LLM/Conversation:</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• OpenAI GPT-4</li>
                    <li>• Anthropic Claude</li>
                    <li>• Google Gemini</li>
                    <li>• Custom fine-tuned models</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Text-to-Speech:</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• ElevenLabs</li>
                    <li>• Google Cloud TTS</li>
                    <li>• Amazon Polly</li>
                    <li>• Azure Speech</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Phone Integration:</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Twilio</li>
                    <li>• Vonage (Nexmo)</li>
                    <li>• Plivo</li>
                    <li>• Bandwidth</li>
                  </ul>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Time to deploy:</strong> 2-4 weeks (requires significant development)
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step 2 */}
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
            <h2 className="text-3xl font-bold text-gray-900">Define Your AI's Knowledge Base</h2>
          </div>

          <p className="text-lg text-gray-700 mb-6">
            Your AI receptionist needs to know about your business to answer questions accurately. This includes:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Business Information</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Services offered</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Pricing and packages</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Business hours</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Location and directions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Common FAQs</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Conversation Scripts</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Greeting messages</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Booking flow questions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Qualification questions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Handoff scenarios</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Error handling responses</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
            <p className="text-gray-800">
              <strong>Pro Tip:</strong> Start with your website content, FAQ page, and existing customer service scripts. These provide a solid foundation for your AI's knowledge base.
            </p>
          </div>
        </motion.div>

        {/* Step 3 */}
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
            <h2 className="text-3xl font-bold text-gray-900">Set Up Conversation Logic</h2>
          </div>

          <p className="text-lg text-gray-700 mb-6">
            Your AI needs to handle different conversation flows. Here's a typical call flow:
          </p>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Standard Call Flow</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Greeting & Identification</h4>
                  <p className="text-gray-700 text-sm">"Hello! Thank you for calling [Business Name]. How can I help you today?"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Intent Recognition</h4>
                  <p className="text-gray-700 text-sm">AI identifies if caller wants to book, ask questions, or speak to someone</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Information Gathering</h4>
                  <p className="text-gray-700 text-sm">Collect necessary details (name, service needed, preferred time, etc.)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Action Execution</h4>
                  <p className="text-gray-700 text-sm">Book appointment, answer question, or transfer to human</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  5
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Confirmation & Closing</h4>
                  <p className="text-gray-700 text-sm">Confirm details and provide next steps</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step 4 */}
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
            <h2 className="text-3xl font-bold text-gray-900">Integrate with Your Systems</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Calendar Integration</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Connect to Google Calendar, Cal.com, or other booking systems so your AI can check availability and book appointments directly.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• OAuth authentication</li>
                <li>• Calendar API access</li>
                <li>• Real-time availability checks</li>
                <li>• Automatic booking creation</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Database className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">CRM Integration</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Sync call data, leads, and bookings with your CRM (HubSpot, Salesforce, etc.) for complete customer management.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Lead capture and storage</li>
                <li>• Call transcript logging</li>
                <li>• Appointment sync</li>
                <li>• Customer history access</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Notification System</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Set up real-time notifications for new bookings, important calls, or when human handoff is needed.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• SMS notifications</li>
                <li>• Email alerts</li>
                <li>• Slack/Teams integration</li>
                <li>• Mobile app push notifications</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Phone Number Setup</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Configure your phone number to route calls to your AI receptionist system.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Purchase/port phone number</li>
                <li>• Configure call routing</li>
                <li>• Set up voicemail fallback</li>
                <li>• Enable call recording</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Step 5 */}
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
            <h2 className="text-3xl font-bold text-gray-900">Test and Refine</h2>
          </div>

          <p className="text-lg text-gray-700 mb-6">
            Before going live, thoroughly test your AI receptionist:
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-white border-l-4 border-blue-600 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Test Scenarios</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Standard booking requests</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Complex questions about services</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Requests to speak with a human</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Edge cases and error handling</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Different accents and speaking speeds</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Common Issues to Watch For</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Misunderstanding customer intent</li>
                <li>• Incorrect appointment booking</li>
                <li>• Poor handling of interruptions</li>
                <li>• Unnatural conversation flow</li>
                <li>• Technical glitches or delays</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Alternative: Using a Platform */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Alternative: Use a Ready-Made Platform</h2>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
            <p className="text-lg text-gray-800 mb-6">
              Building an AI receptionist from scratch requires significant time, technical expertise, and ongoing maintenance. For most businesses, using a platform like <strong>Boltcall</strong> is faster and more cost-effective:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Building from Scratch</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>2-4 weeks development time</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>$10,000+ in development costs</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Ongoing maintenance required</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Technical expertise needed</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Using Boltcall</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Set up in 1-2 days</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>$99-299/month (no upfront cost)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Fully managed and maintained</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>No technical knowledge required</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pros & Cons Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="mb-16"
        >
          <section className="my-10">
            <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of Building vs. Buying an AI Receptionist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• No-code platforms let non-technical teams launch in under an hour</li>
                  <li>• Pre-built speech &amp; NLP pipelines eliminate months of engineering work</li>
                  <li>• Managed services handle uptime, updates, and scaling automatically</li>
                  <li>• Deep CRM and calendar integrations available out of the box</li>
                  <li>• Cost-effective compared to hiring developers to build from scratch</li>
                  <li>• Continuous model improvements without extra effort on your part</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Custom-built solutions offer more control but require significant dev time</li>
                  <li>• Vendor lock-in if you rely on a single platform API</li>
                  <li>• Knowledge base quality directly limits the AI accuracy</li>
                  <li>• Edge-case call flows need careful scripting and testing</li>
                  <li>• Building from scratch risks obsolescence as LLMs evolve rapidly</li>
                  <li>• Integration with niche legacy systems may require custom work</li>
                </ul>
              </div>
            </div>
          </section>
        </motion.div>

        {/* Conclusion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>Conclusion</h2>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Building an AI receptionist is technically feasible, but it requires expertise in speech recognition, natural language processing, conversation design, and system integration. For most businesses, the time and cost of building from scratch far exceeds the benefits.
            </p>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              If you have a development team and want complete control, building your own can work. But for 95% of businesses, using a proven platform like Boltcall provides faster deployment, better reliability, and ongoing improvements—all at a fraction of the cost of building from scratch. Explore our <Link to="/features/ai-receptionist" className="text-blue-600 hover:text-blue-700 underline">AI receptionist features</Link> or read <Link to="/blog/is-ai-receptionist-worth-it" className="text-blue-600 hover:text-blue-700 underline">our cost-benefit analysis</Link> to see if it makes sense for your business.
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
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

        {/* Related Reading */}
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Related Reading</h3>
          <ul className="space-y-2 text-gray-700">
            <li><Link to="/blog/top-10-ai-receptionist-agencies" className="text-blue-600 hover:text-blue-700 underline">Top 10 AI Receptionist Agencies Compared</Link></li>
            <li><Link to="/pricing" className="text-blue-600 hover:text-blue-700 underline">Boltcall Pricing Plans</Link></li>
            <li><Link to="/blog/speed-to-lead-local-business" className="text-blue-600 hover:text-blue-700 underline">Speed to Lead: Why Response Time Matters</Link></li>
          </ul>
        </div>
          </article>

          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* AI Receptionist Building Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Build vs. Buy: AI Receptionist Options Compared</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What it takes to build a custom AI receptionist vs. using a purpose-built solution</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Factor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Build Your Own</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Use Boltcall</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Setup time', '3–6 months of development', '30 minutes'],
                  ['Upfront cost', '$15,000 – $100,000+', '$0'],
                  ['Monthly cost', '$2,000 – $10,000 (infrastructure + maintenance)', '$79 – $179'],
                  ['Voice quality', 'Depends on provider and tuning', 'Production-ready, trained on local businesses'],
                  ['Calendar integration', 'Custom development required', 'Built in — connects to Google, Calendly, and more'],
                  ['SMS follow-up', 'Must build separate workflow', 'Included — automated from day one'],
                  ['Industry-specific training', 'You write every prompt', 'Pre-trained on your trade type'],
                  ['Ongoing maintenance', 'Your team (or contractor)', 'Handled by Boltcall'],
                  ['ROI timeline', '12–18 months to break even', '48–72 hours to positive ROI'],
                ].map(([factor, build, buy]) => (
                  <tr key={factor} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{factor}</td>
                    <td className="px-4 py-3 text-gray-600">{build}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{buy}</td>
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

export default BlogHowToMakeAIReceptionist;

