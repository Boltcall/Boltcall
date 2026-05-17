import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { MessageCircle, Globe, Users, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

const WebsiteChatVoiceWidgetPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Website Chat & Voice Widget for Customer Engagement';
    updateMetaDescription('Website chat and voice widget engages visitors 24/7. Answer questions, book appointments directly from your site. Start now.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "Website Chat & Voice Widget", "item": "https://boltcall.org/features/website-widget"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  useEffect(() => {
    return injectSchemas([
      createFAQSchema([
        { question: 'Will it slow down my website?', answer: 'No. The widget is lightweight and loads asynchronously, so it doesn\'t impact your website\'s speed or performance. It\'s designed to be fast and efficient, ensuring your site remains fast while providing enhanced functionality.' },
        { question: 'Can visitors still contact me directly?', answer: 'Yes. The widget can transfer conversations to human agents when needed, or visitors can use your existing contact methods. The widget enhances your communication options without replacing them.' },
        { question: 'Does it work on mobile devices?', answer: 'Yes. The widget is fully responsive and works perfectly on mobile devices, tablets, and desktops. It adapts to different screen sizes and provides an optimal experience on all devices.' },
        { question: 'Can I see conversation transcripts?', answer: 'Yes. All conversations are logged and accessible in your dashboard. You can review transcripts, analyze visitor questions, and use insights to improve your website content and customer service.' },
      ]),
    ]);
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs />
          <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold">Website Chat/Voice Widget</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Engage Visitors with <span className="text-blue-600">AI Chat & Voice</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Add an intelligent chat and voice widget to your website that answers questions, 
              captures leads, and books appointments 24/7.
            </p>
          </motion.div>
          </div>
        </div>
      </section>

      {/* What It Is Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>What is Website Chat/Voice Widget?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              Website Chat/Voice Widget is an intelligent AI assistant that appears on your website, 
              allowing visitors to chat via text or speak via voice. It answers questions, provides information, 
              qualifies leads, and can even book appointments—all without leaving your website.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              The widget is fully customizable to match your brand, appears on all pages, and works seamlessly 
              on desktop and mobile devices. It's like having a 24/7 sales representative on every page of your site.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why It's Important Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Why Website Widget is Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                      Website Visitors Want Instant Help
                    </h3>
                    <p className="text-gray-600">
                      <strong>79% of website visitors prefer live chat</strong> over phone or email for quick questions. 
                      A chat widget provides instant answers, reducing bounce rates and increasing engagement. 
                      Visitors who chat are 3x more likely to convert than those who don't.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Capture Leads on Every Page
                    </h3>
                    <p className="text-gray-600">
                      Not all visitors will fill out a contact form, but many will chat. The widget captures 
                      leads from every page of your site, even from visitors who weren't planning to contact you. 
                      This can <strong>increase lead capture by 40-50%</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Reduce Bounce Rate
                    </h3>
                    <p className="text-gray-600">
                      When visitors have questions, they often leave. A chat widget provides instant answers, 
                      keeping visitors engaged and on your site longer. This improves SEO rankings and conversion rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Helps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Website Widget Helps Your Business</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    24/7 Availability
                  </h3>
                </div>
                <p className="text-gray-600">
                  Engage visitors anytime, even when your business is closed. 
                  Capture leads and answer questions around the clock.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Instant Answers
                  </h3>
                </div>
                <p className="text-gray-600">
                  Provide immediate answers to common questions, reducing support burden 
                  and improving customer satisfaction.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Lead Qualification
                  </h3>
                </div>
                <p className="text-gray-600">
                  Automatically qualify leads through conversation, asking the right questions 
                  to determine buying intent and fit.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Direct Booking</h3>
                </div>
                <p className="text-gray-600">
                  Book appointments directly from the widget. Visitors can schedule without 
                  leaving your site or making a phone call.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Add AI Chat to Your Website</h3>
              <p className="text-blue-100 mb-6">
                Engage every visitor and capture more leads with an intelligent website widget.
              </p>
              <Link to="/setup">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Website Chat/Voice Widget Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Easy Installation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Installing the widget is simple—just add a small code snippet to your website. The 
                  widget appears on all pages automatically, ready to engage visitors. It works on any 
                  website platform: WordPress, Shopify, Squarespace, custom HTML, or any other platform. 
                  No technical expertise required—just copy and paste the code.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The widget is lightweight and won't slow down your website. It loads asynchronously, 
                  so it doesn't impact page speed or SEO. Once installed, it works immediately, engaging 
                  visitors and capturing leads 24/7 without any additional configuration needed.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Visitor Engagement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When a visitor lands on your website, the widget can proactively engage them with a 
                  friendly greeting or wait for them to initiate conversation. You can configure when 
                  and how the widget engages visitors—immediately, after a delay, on specific pages, or 
                  only when visitors click the chat icon.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The widget can detect visitor behavior and engage at optimal moments. For example, it 
                  might engage visitors who spend time on a pricing page, visitors who scroll to the 
                  bottom of a page (indicating interest), or visitors who are about to leave. This 
                  intelligent engagement maximizes conversion opportunities.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Intelligent Conversations
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI handles conversations naturally, answering questions, providing information, 
                  and guiding visitors through your website. It can answer FAQs, explain services, 
                  provide pricing information, and help visitors find what they're looking for. The 
                  conversation feels natural and helpful, not robotic or scripted.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The AI understands context and can reference information from your website, previous 
                  messages in the conversation, and visitor behavior. It can handle complex queries, 
                  provide detailed explanations, and even make recommendations based on the visitor's 
                  needs and interests.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Lead Capture & Qualification
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  During conversations, the AI naturally collects visitor information: name, email, 
                  phone number, and specific needs. This information is captured seamlessly as part 
                  of the conversation, not through intrusive forms. The AI can also qualify leads by 
                  asking relevant questions about budget, timeline, and requirements.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  All captured leads are automatically logged in your CRM with full conversation history. 
                  This provides your sales team with complete context when following up, enabling more 
                  effective and personalized outreach. The qualification data helps prioritize leads and 
                  allocate resources effectively.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Appointment Booking & Actions
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When visitors are ready to take action, the AI can book appointments, schedule calls, 
                  send quotes, or direct them to specific pages or forms. This seamless action-taking 
                  keeps visitors engaged and converts them while they're still on your website, rather 
                  than requiring them to navigate elsewhere or wait for email responses.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The widget can also handle post-conversation actions like sending follow-up emails, 
                  adding visitors to email lists, or triggering other marketing automation workflows. 
                  This integration ensures every visitor interaction is maximized and no opportunities 
                  are lost.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Real-World Results</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce Store</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  An online store added the chat widget to help customers find products and answer 
                  questions. The widget handled 80% of customer inquiries automatically, reducing 
                  support workload by 60%. More importantly, visitors who chatted were 3x more likely 
                  to make a purchase than those who didn't.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The widget helped customers find the right products, answered sizing questions, 
                  explained shipping policies, and handled returns inquiries. This improved customer 
                  satisfaction and reduced cart abandonment, as customers got immediate answers to 
                  questions that might have prevented purchases.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A service business used the widget to capture leads and book consultations directly 
                  from their website. The widget engaged visitors, answered questions about services, 
                  and booked appointments without requiring visitors to call or fill out forms. This 
                  increased lead capture by 50% and consultation bookings by 35%.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The conversational booking process felt more natural and less intimidating than 
                  filling out forms, encouraging more visitors to book consultations. The widget also 
                  handled common questions, freeing up staff time while providing better customer 
                  service.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Customization Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Customization Options</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Matching</h3>
                <p className="text-gray-600 text-sm">
                  Customize colors, fonts, and styling to match your brand perfectly. The widget 
                  can blend seamlessly into your website design or stand out as a call-to-action.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Positioning</h3>
                <p className="text-gray-600 text-sm">
                  Choose where the widget appears: bottom-right corner, bottom-left, or custom 
                  positioning. You can also configure it to appear on specific pages only.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Greeting Messages</h3>
                <p className="text-gray-600 text-sm">
                  Customize greeting messages for different pages, visitor types, or times of day. 
                  Create personalized experiences that match your brand voice and customer expectations.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Options</h3>
                <p className="text-gray-600 text-sm">
                  Choose from different voice options for voice interactions, or configure text-only 
                  chat. The widget supports both text and voice conversations, giving visitors choice 
                  in how they want to interact.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Frequently Asked Questions</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Will it slow down my website?</h3>
                <p className="text-gray-600">
                  No. The widget is lightweight and loads asynchronously, so it doesn't impact your 
                  website's speed or performance. It's designed to be fast and efficient, ensuring 
                  your site remains fast while providing enhanced functionality.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can visitors still contact me directly?</h3>
                <p className="text-gray-600">
                  Yes. The widget can transfer conversations to human agents when needed, or visitors 
                  can use your existing contact methods. The widget enhances your communication options 
                  without replacing them.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Does it work on mobile devices?</h3>
                <p className="text-gray-600">
                  Yes. The widget is fully responsive and works perfectly on mobile devices, tablets, 
                  and desktops. It adapts to different screen sizes and provides an optimal experience 
                  on all devices.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I see conversation transcripts?</h3>
                <p className="text-gray-600">
                  Yes. All conversations are logged and accessible in your dashboard. You can review 
                  transcripts, analyze visitor questions, and use insights to improve your website 
                  content and customer service.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Boltcall paid for itself in the first week. We stopped losing calls after hours and our bookings jumped 40%.", name: "Marcus T.", role: "HVAC Owner, Texas" },
            { quote: "I was skeptical about AI, but it just works. Our front desk handles 30% fewer interruptions now.", name: "Priya S.", role: "Dental Practice Manager, California" },
            { quote: "We were losing 15-20 calls a week to voicemail. Boltcall captures every single one now.", name: "James R.", role: "Plumbing Business Owner, Florida" },
          ].map((item) => (
            <div key={item.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>100% Free — no credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Used by 500+ local businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Results in 30 days or your money back</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Your data is never sold or shared</span>
            </div>
          </div>
        </div>
      </section>


      {/* Why Boltcall */}
      <section className="py-14 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: 'Setup in 30 minutes', desc: 'No developers, no tech team. Answer 5 questions about your business and your AI receptionist is live — configured to your services, hours, and voice.' },
              { title: 'Flat monthly pricing', desc: 'Unlike per-call services that penalize you for growth, Boltcall charges a flat monthly fee. Handle 500 calls or 5,000 — your cost stays predictable.' },
              { title: 'Trained on your business', desc: 'Not a generic bot. Boltcall learns your specific services, pricing, FAQs, and booking rules — so every interaction sounds like your best team member.' },
              { title: 'ROI from day one', desc: 'One recovered call per month covers the entire subscription cost. Most customers see 5–10x ROI within the first 30 days from calls they would have otherwise missed.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-white">
                <h3 className="font-bold text-gray-900 mb-2">✓ {item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Website Chat + Voice Widget: Engagement Comparison</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How adding a combined chat and voice widget changes visitor conversion</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Chat + Voice Widget (Boltcall)</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Contact Form Only</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Visitor engagement rate', '12–18% (chat + voice)', '2–5% (form only)'],
                  ['Lead capture after hours', 'Active 24/7 (AI-powered)', 'Form only — reviewed next day'],
                  ['Avg. response to visitor question', 'Under 5 seconds', '4–24 hours (if ever)'],
                  ['Appointments booked from website', '35–50% of engaged visitors', '8–15% of form submissions'],
                  ['Customer effort to book', 'Ask via chat or voice — done', 'Fill form, wait for callback'],
                  ['Monthly cost', 'Included in plan', '$100–$500 (live chat tools)'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{row[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[2]}</td>
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

export default WebsiteChatVoiceWidgetPage;

