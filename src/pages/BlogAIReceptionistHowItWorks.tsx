import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Brain, Zap, CheckCircle, Mic, TrendingUp, Users, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogAIReceptionistHowItWorks: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How Does an AI Receptionist Work? Technical Guide';
    updateMetaDescription('How does an AI receptionist work? Complete technical guide explaining natural language processing and automation. Learn more.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How Does an AI Receptionist Work? A Complete Technical Guide",
      "description": "How does an AI receptionist work? Complete technical guide explaining natural language processing and automation.",
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
      "datePublished": "2025-02-10",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/how-ai-receptionist-works"
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

    const speakableScript = document.createElement('script');
    speakableScript.type = 'application/ld+json';
    speakableScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": document.title,
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".speakable-intro"]
      }
    });
    document.head.appendChild(speakableScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "How AI Receptionist Works", "item": "https://boltcall.org/blog/how-ai-receptionist-works"}]});
    document.head.appendChild(bcScript);
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-schema';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "How does an AI receptionist work?", "acceptedAnswer": {"@type": "Answer", "text": "An AI receptionist works by using speech recognition to convert spoken words to text, natural language processing to understand caller intent, and pre-configured business logic to respond — booking appointments, answering FAQs, or routing calls to a human. The full process completes in under 2 seconds."}},
        {"@type": "Question", "name": "Can an AI receptionist book appointments?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. AI receptionists integrate directly with scheduling software like Google Calendar, Calendly, or practice management systems to book, reschedule, and cancel appointments in real time. Callers receive an instant SMS confirmation."}},
        {"@type": "Question", "name": "What happens when an AI receptionist cannot answer a question?", "acceptedAnswer": {"@type": "Answer", "text": "When a caller's question falls outside the configured knowledge base, the AI receptionist transfers the call to a designated staff member or leaves a detailed voicemail with a full transcript."}},
        {"@type": "Question", "name": "Is an AI receptionist as good as a human receptionist?", "acceptedAnswer": {"@type": "Answer", "text": "For routine calls — appointment booking, FAQs, and lead capture — AI receptionists match or exceed human performance in speed and consistency. They answer 100% of calls 24/7 and never miss a lead. For complex conversations, they route to a human."}}
      ]
    });
    document.head.appendChild(faqScript);
    return () => {
      document.getElementById('faq-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
      speakableScript.remove();
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
              { label: 'AI Receptionist How It Works', href: '/blog/ai-receptionist-how-it-works' }
            ]} />
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              How Does an <span className="text-blue-600">AI Receptionist</span> Work? A Complete Technical Guide
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>February 10, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>5 min read</span>
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
          <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
            An AI receptionist is a software system that automatically answers phone calls, understands spoken requests using natural language processing, books appointments in real time, and handles common customer inquiries — without a human operator. Boltcall's AI receptionist integrates with your existing calendar and CRM, operating 24/7 on autopilot.
          </p>
        </motion.div>

        {/* Key Points Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16"
        >

          {/* Table of Contents */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
            <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
            <ol className="space-y-2 list-decimal list-inside">
                  <li key="how-ai-receptionists-work-at-a-glance"><a href="#how-ai-receptionists-work-at-a-glance" className="text-blue-600 hover:underline text-sm">How AI Receptionists Work: At a Glance</a></li>
                  <li key="what-happens-when-a-call-comes-in"><a href="#what-happens-when-a-call-comes-in" className="text-blue-600 hover:underline text-sm">What Happens When a Call Comes In</a></li>
                  <li key="how-ai-receptionists-learn-your-business"><a href="#how-ai-receptionists-learn-your-business" className="text-blue-600 hover:underline text-sm">How AI Receptionists Learn Your Business</a></li>
                  <li key="why-this-technology-matters"><a href="#why-this-technology-matters" className="text-blue-600 hover:underline text-sm">Why This Technology Matters</a></li>
                  <li key="the-bottom-line"><a href="#the-bottom-line" className="text-blue-600 hover:underline text-sm">The Bottom Line</a></li>
                  <li key="real-world-use-cases"><a href="#real-world-use-cases" className="text-blue-600 hover:underline text-sm">Real-World Use Cases</a></li>
            </ol>
          </div>

          <h2 id="how-ai-receptionists-work-at-a-glance" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            How AI Receptionists Work: At a Glance
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                <Mic className="w-5 h-5 text-blue-600" />
                Voice Processing
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Converts speech to text in real-time</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Natural language understanding</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Context-aware conversation flow</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                <Brain className="w-5 h-5 text-blue-600" />
                AI Intelligence
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Large Language Models (LLMs) for reasoning</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Knowledge base integration</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Dynamic response generation</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                <Zap className="w-5 h-5 text-blue-600" />
                Action Execution
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Calendar integration for bookings</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>CRM updates and lead capture</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Real-time notifications to you</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Section 1: The Call Flow */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 id="what-happens-when-a-call-comes-in" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            What Happens When a Call Comes In
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              When someone calls your business, the AI receptionist processes the call through several integrated steps that happen in real-time:
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2 flex items-center gap-2">
              <Mic className="w-6 h-6 text-blue-600" />
              1. Speech Recognition & Understanding
            </h3>
            <p>
              As the caller speaks, Automatic Speech Recognition (ASR) technology converts their words into text using neural networks trained on millions of hours of speech. The system handles accents, background noise, and natural conversation flow.
            </p>
            <p>
              Natural Language Understanding (NLU) then analyzes the text to determine intent, extract key information (dates, services, names), and understand context. For example, "I need to reschedule for next week" is understood as: modify existing appointment, timeframe is next week, and the caller already has a booking.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              2. Knowledge Base Search & Response Generation
            </h3>
            <p>
              The AI searches your business knowledge base using semantic search—understanding meaning, not just keywords. If someone asks "What are your hours?" it finds information about business hours even if those exact words aren't in your database.
            </p>
            <p>
              Large Language Models (LLMs) like GPT-4 then generate natural, conversational responses that match your business tone, include relevant details, and maintain professional conversation. The response is converted to speech using Text-to-Speech (TTS) technology that sounds genuinely human.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2 flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-600" />
              3. Action Execution
            </h3>
            <p>
              When the conversation requires action, the AI executes tasks automatically through API integrations:
            </p>
            <ul className="space-y-2 text-gray-700 my-4 ml-4">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>Calendar Integration:</strong> Checks availability, books appointments, sends confirmations</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>CRM Updates:</strong> Creates customer records with conversation details</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>Notifications:</strong> Alerts you via SMS, email, or app notifications</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>Follow-ups:</strong> Schedules reminders and automated follow-up messages</span>
              </li>
            </ul>
            <p>
              By the time the call ends, appointments are booked, leads are captured, and you're notified—all seamlessly integrated into your existing systems.
            </p>
          </div>
        </motion.section>

        {/* Section 2: How AI Learns Your Business */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 id="how-ai-receptionists-learn-your-business" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            How AI Receptionists Learn Your Business
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              AI receptionists learn your business through initial setup and continuous improvement:
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2">Initial Setup</h3>
            <p>
              When you first set up an AI receptionist, you provide your business information: services, pricing, hours, location, FAQs, and conversation scripts. This creates your knowledge base that the AI references during calls.
            </p>
            <p>
              You also configure business rules—when to transfer calls, what questions to ask for lead qualification, and how to handle different scenarios. This initial setup typically takes 30 minutes or less.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2">Continuous Learning</h3>
            <p>
              Every conversation becomes a learning opportunity. The AI analyzes successful interactions, identifies common questions and patterns, and adapts its responses over time. It learns your specific terminology, service names, and business processes, getting more accurate with each call.
            </p>
          </div>
        </motion.section>

        {/* Section 4: The Business Impact */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 id="why-this-technology-matters" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Why This Technology Matters
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Understanding how AI receptionists work reveals their real business value:
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Speed = Revenue
            </h3>
            <p>
              Research shows responding to leads within 60 seconds increases conversion rates by 391%. AI receptionists answer instantly, 24/7, ensuring you never miss an opportunity.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-2 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              Consistency & Scalability
            </h3>
            <p>
              Every caller gets the same high-quality experience, whether you receive 10 calls or 1000. The AI is always professional, accurate, and never gets overwhelmed during busy periods.
            </p>
          </div>
        </motion.section>

        {/* Conclusion */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 id="the-bottom-line" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The Bottom Line
          </h2>
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              AI receptionists combine cutting-edge technology—speech recognition, natural language understanding, large language models, and semantic search—to create intelligent systems that genuinely understand and help your customers. They're not automated phone trees; they learn your business, adapt to your needs, and provide real value.
            </p>
            <p>
              The technology is sophisticated, but the result is simple: your customers get instant, helpful responses 24/7, and you get more bookings, better lead capture, and more time to focus on growing your business.
            </p>
          </div>
        </motion.section>

        {/* Mini Case Studies */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.52 }}
          className="mb-16"
        >
          <h2 id="real-world-use-cases" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Real-World Use Cases
          </h2>
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-600">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dental Practice — Westside Family Dental</h3>
              <p className="text-gray-700 mb-3 text-sm leading-relaxed">
                A 3-dentist practice in Phoenix was losing roughly 40 calls per month to voicemail after 5 PM —
                mostly patients trying to book emergency appointments. After deploying an AI receptionist, the
                system handled after-hours intake, collected patient details, and scheduled same-next-day slots
                directly into the practice management software.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-blue-700">+38 bookings/month captured</span>
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-green-700">ROI achieved in week 1</span>
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-gray-700">Setup time: 25 minutes</span>
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-6 border-l-4 border-orange-500">
              <h3 className="text-xl font-bold text-gray-900 mb-2">HVAC Company — CoolBreeze Heating & Air</h3>
              <p className="text-gray-700 mb-3 text-sm leading-relaxed">
                A solo-operator HVAC business in Dallas could not answer calls while on a job — meaning peak summer
                emergency calls went straight to voicemail. The AI receptionist now handles triage: classifying calls
                as emergency vs. routine, capturing contact info and system details, and texting the owner a summary
                within 15 seconds of the call ending.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-orange-700">Zero missed emergency calls</span>
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-green-700">+$4,200 captured in first month</span>
                <span className="bg-white rounded-lg px-3 py-1 font-semibold text-gray-700">Owner reviews texts, not voicemails</span>
              </div>
            </div>
          </div>
        </motion.section>

          {/* Pros & Cons Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16"
        >
          <section className="my-10">
            <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Receptionists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Answers every call instantly, 24/7 — no missed opportunities</li>
                  <li>• Processes speech and generates responses in under 500 ms</li>
                  <li>• Learns your business vocabulary and improves with every call</li>
                  <li>• Executes bookings, CRM updates, and notifications automatically</li>
                  <li>• Scales to hundreds of simultaneous calls without added cost</li>
                  <li>• Setup typically takes 30 minutes or less</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Cannot match human empathy in emotionally sensitive calls</li>
                  <li>• Accuracy depends on the quality of your business knowledge base</li>
                  <li>• Heavy accents or poor audio quality can reduce transcription accuracy</li>
                  <li>• Integration with legacy phone systems may require extra configuration</li>
                  <li>• Callers who expect a human may occasionally push back</li>
                  <li>• Complex, multi-party negotiations still require human judgment</li>
                </ul>
              </div>
            </div>
          </section>
        </motion.section>

      {/* FAQ Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="my-12"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6 divide-y divide-gray-100">
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How does an AI receptionist work?</h3>
            <p className="text-gray-700">An AI receptionist uses speech recognition to capture what a caller says, NLP to understand intent, and pre-configured business logic to respond — booking appointments, answering questions, or routing to a human. The full cycle completes in under 2 seconds.</p>
          </div>
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Can an AI receptionist book appointments?</h3>
            <p className="text-gray-700">Yes. AI receptionists integrate with scheduling software like Google Calendar and Calendly to book, reschedule, and cancel appointments in real time. Callers receive an instant SMS confirmation — no human needed.</p>
          </div>
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What happens when an AI receptionist cannot answer a question?</h3>
            <p className="text-gray-700">When a caller's question falls outside the configured knowledge base or requires human judgment, the AI transfers the call immediately to a designated staff member or leaves a detailed voicemail with a full call transcript.</p>
          </div>
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Is an AI receptionist as good as a human?</h3>
            <p className="text-gray-700">For high-volume, repetitive calls — appointment booking, FAQs, lead capture — AI outperforms humans in speed and consistency. It answers 100% of calls 24/7. For nuanced or emotionally sensitive conversations, human judgment still wins.</p>
          </div>
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How long does it take to set up an AI receptionist?</h3>
            <p className="text-gray-700">Boltcall's AI receptionist takes under 30 minutes to configure. You provide business info, services, hours, and common FAQs — the AI is ready to answer calls the same day. See our <Link to="/blog/how-to-make-ai-receptionist" className="text-blue-600 hover:underline">step-by-step setup guide</Link>.</p>
          </div>
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-gray-700">
          Related: <Link to="/blog/is-ai-receptionist-worth-it" className="text-blue-600 hover:underline">Is an AI receptionist worth it?</Link> &middot; <Link to="/blog/ai-receptionist-cost-pricing" className="text-blue-600 hover:underline">AI receptionist cost &amp; pricing</Link> &middot; <Link to="/blog/best-ai-receptionist-tools" className="text-blue-600 hover:underline">Best AI receptionist tools</Link> &middot; <Link to="/features/ai-receptionist" className="text-blue-600 hover:underline">Boltcall features</Link> &middot; <Link to="/pricing" className="text-blue-600 hover:underline">View pricing</Link>
        </div>
      </motion.section>

      {/* CTA Section */}
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
              <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.</p>
              <Link
                to="/signup"
                className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
              >
                Start the free setup
              </Link>
            </div>
          </div>
        </motion.section>
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* How AI Receptionist Works Step-by-Step Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">How an AI Receptionist Handles a Call: Step by Step</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What happens from the moment a caller dials your number to the appointment confirmation</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Step</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What Happens</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Human Needed?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['1. Call received', 'AI answers in under 3 rings with your business greeting', '< 5 seconds', 'No'],
                  ['2. Intent detection', 'AI identifies: appointment, question, emergency, or complaint', '< 10 seconds', 'No'],
                  ['3. Qualification', 'Collects name, service needed, and availability', '60–90 seconds', 'No'],
                  ['4. Calendar check', 'Queries your live scheduling system for open slots', 'Real-time', 'No'],
                  ['5. Booking confirmed', 'Reads back appointment time and sends SMS confirmation', '< 30 seconds', 'No'],
                  ['6. Escalation (if needed)', 'Transfers urgent calls to your phone immediately', 'Instant', 'Yes — for emergencies'],
                  ['7. Follow-up sent', 'Reminder texts 24h and 2h before appointment', 'Automated', 'No'],
                  ['8. Review request', 'Post-visit SMS asking for a Google review', 'Automated', 'No'],
                ].map(([step, what, time, human]) => (
                  <tr key={step} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{step}</td>
                    <td className="px-4 py-3 text-gray-600">{what}</td>
                    <td className="px-4 py-3 text-gray-600">{time}</td>
                    <td className="px-4 py-3 text-gray-600">{human}</td>
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

export default BlogAIReceptionistHowItWorks;

