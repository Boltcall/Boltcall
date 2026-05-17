import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { RefreshCw, TrendingUp, Target, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

const AIFollowUpSystemPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Follow-Up System for Lead Nurturing | Boltcall';
    updateMetaDescription('AI follow-up system nurtures leads automatically. Send personalized messages, follow up with prospects, convert more. Learn more.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "AI Follow-Up System", "item": "https://boltcall.org/features/ai-follow-up-system"}]});
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
        { question: 'How many follow-ups should I send?', answer: 'Research shows that 80% of sales require 5 follow-ups, yet most businesses give up after 2. The AI Follow-Up System can continue nurturing leads for as long as needed, adapting the frequency and content based on engagement levels. The system will automatically reduce frequency if a lead isn\'t engaging and increase it if they show interest.' },
        { question: 'Will leads know it\'s automated?', answer: 'The messages are designed to feel natural and human-like. However, you can choose to be transparent about using AI assistance or present it as your team. Many businesses find that being transparent builds trust, while others prefer a more human presentation. The choice is yours.' },
        { question: 'Can I customize follow-up sequences?', answer: 'Yes. You can create custom follow-up sequences for different lead types, industries, or stages in the buyer\'s journey. The system allows full customization while providing AI-powered optimization suggestions based on best practices and your results.' },
        { question: 'What happens when a lead responds?', answer: 'When a lead responds or shows buying signals, the system can automatically notify your sales team, schedule a call, move the lead to a different nurturing track, or continue the conversation via AI. You configure how different types of responses are handled based on your sales process.' },
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
              <RefreshCw className="w-4 h-4" />
              <span className="font-semibold">AI Follow-Up System</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Never Lose a Lead with <span className="text-blue-600">AI Follow-Ups</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Automatically nurture leads with personalized follow-up messages, keeping conversations warm 
              and moving prospects through your sales funnel.
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
              <span>What is AI Follow-Up System?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              AI Follow-Up System automatically sends personalized follow-up messages to leads and customers 
              at optimal times. It nurtures relationships, answers questions, provides value, and moves prospects 
              through your sales funnel without requiring manual effort.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              The system intelligently determines when to follow up, what to say, and how to personalize messages 
              based on customer behavior, previous interactions, and lead status.
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
              <span>Why AI Follow-Ups are Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Most Sales Require Follow-Up
                    </h3>
                    <p className="text-gray-600">
                      Research shows that <strong>80% of sales require 5 follow-up contacts</strong>, yet most 
                      businesses give up after just 2 attempts. AI Follow-Up System ensures you never give up 
                      on a lead, automatically nurturing them until they're ready to buy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Timing is Everything
                    </h3>
                    <p className="text-gray-600">
                      The best time to follow up varies by customer and situation. AI Follow-Up System analyzes 
                      customer behavior and engagement to send follow-ups at the <strong>optimal moment</strong>, 
                      maximizing response rates and conversions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Keep Conversations Warm
                    </h3>
                    <p className="text-gray-600">
                      Leads go cold quickly without regular contact. Automated follow-ups keep your business 
                      top-of-mind and maintain engagement, ensuring you're there when the customer is ready to buy.
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
              <span>How AI Follow-Ups Help Your Business</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Increase Conversions
                  </h3>
                </div>
                <p className="text-gray-600">
                  Consistent follow-ups can increase conversion rates by up to 50%. 
                  Never lose a lead due to lack of follow-up.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Personalized Messaging
                  </h3>
                </div>
                <p className="text-gray-600">
                  AI personalizes each follow-up based on customer data, previous interactions, 
                  and lead status for maximum relevance and engagement.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Multi-Channel Follow-Ups
                  </h3>
                </div>
                <p className="text-gray-600">
                  Follow up via SMS, email, or both. Reach customers on their preferred channel 
                  for better engagement and response rates.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Save Time
                  </h3>
                </div>
                <p className="text-gray-600">
                  Automate the entire follow-up process. No more manual tracking, scheduling, 
                  or remembering to follow up—the AI handles everything.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">
                Start Nurturing Leads Automatically
              </h3>
              <p className="text-blue-100 mb-6">
                Never lose a lead again with automated, intelligent follow-ups.
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
              <span>How AI Follow-Up System Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Lead Capture & Analysis
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When a new lead is captured (from forms, calls, website interactions, or any source), 
                  the AI Follow-Up System immediately analyzes the lead's information, behavior, and 
                  engagement history. It determines the lead's stage in the sales funnel, buying intent, 
                  and optimal follow-up strategy. This analysis happens instantly, ensuring no time is 
                  wasted before beginning the nurturing process.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system considers multiple factors: how the lead found you, what information they 
                  provided, their engagement level, previous interactions, and industry-specific signals. 
                  This comprehensive analysis ensures follow-ups are relevant, timely, and effective.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Personalized Message Creation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI creates personalized follow-up messages based on the lead's profile, needs, 
                  and stage in the buyer's journey. Each message is tailored to address specific 
                  pain points, provide relevant value, and move the lead closer to a purchase decision. 
                  The personalization goes beyond just using the lead's name—it includes industry-specific 
                  insights, relevant case studies, and targeted offers.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Messages are crafted to feel natural and human, not like automated marketing emails. 
                  The AI uses conversational language, addresses the lead's specific situation, and 
                  provides genuine value in each communication. This approach builds trust and maintains 
                  engagement throughout the nurturing process.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Optimal Timing Determination
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system uses machine learning to determine the optimal time to send each follow-up. 
                  It analyzes the lead's engagement patterns, response times, and behavior to identify 
                  when they're most likely to be receptive. This timing optimization significantly 
                  increases open rates, response rates, and conversion rates compared to generic 
                  follow-up schedules.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The AI considers factors like time of day, day of week, time since last interaction, 
                  and lead activity patterns. It adapts in real-time, sending follow-ups when the 
                  lead is most engaged rather than following a rigid schedule. This intelligent timing 
                  ensures your messages are seen and acted upon.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Multi-Channel Delivery
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Follow-ups are sent via the lead's preferred channel—SMS, email, or both. The system 
                  tracks which channels get the best response for each lead and adjusts accordingly. 
                  Multi-channel follow-ups ensure your message reaches the lead even if they're not 
                  checking one channel regularly.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system maintains conversation continuity across channels, ensuring the lead 
                  experiences a cohesive journey regardless of which channel they use. This integrated 
                  approach prevents confusion and maintains engagement throughout the nurturing process.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Response Tracking & Adaptation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system tracks every interaction: opens, clicks, responses, and engagement levels. 
                  Based on this data, it adapts the follow-up strategy in real-time. If a lead shows 
                  high engagement, it may accelerate the sequence or offer more direct calls-to-action. 
                  If engagement is low, it may adjust the messaging or timing to re-engage.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  When a lead responds or shows buying signals, the system can automatically notify your 
                  sales team, schedule a call, or move the lead to a different nurturing track. This 
                  intelligent routing ensures hot leads get immediate attention while warm leads continue 
                  to be nurtured appropriately.
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">B2B Service Company</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A B2B service company was losing 70% of leads because they couldn't follow up consistently. 
                  After implementing AI Follow-Up System, they saw a 45% increase in lead conversion rates. 
                  The system automatically nurtured leads for weeks, providing value and building relationships 
                  until leads were ready to buy.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The company's sales team now focuses on hot leads while the AI handles nurturing for 
                  warm and cold leads. This division of labor increased overall sales productivity by 60% 
                  and reduced the sales cycle length by 30%, as leads were better qualified and more 
                  engaged when they reached the sales team.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  An e-commerce business used AI Follow-Up System to re-engage customers who abandoned 
                  shopping carts. The system sent personalized follow-ups with product recommendations, 
                  special offers, and helpful information. Cart abandonment recovery increased from 5% 
                  to 18%, generating $45,000 in additional monthly revenue.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The follow-ups weren't just promotional—they provided value through product tips, 
                  usage guides, and customer success stories. This value-first approach built trust and 
                  encouraged purchases without feeling pushy or salesy.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Best Practices Section */}
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
              <span>Best Practices for Follow-Up Success</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Provide Value First</h3>
                <p className="text-gray-600">
                  Every follow-up should provide value to the lead, whether it's helpful information, 
                  industry insights, case studies, or useful resources. Leads are more likely to engage 
                  with content that helps them rather than just promotional messages.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Vary Your Messages</h3>
                <p className="text-gray-600">
                  Don't send the same message repeatedly. Vary the content, format, and approach to 
                  keep leads engaged. Mix educational content, case studies, special offers, and direct 
                  calls-to-action to maintain interest.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Respect Opt-Outs</h3>
                <p className="text-gray-600">
                  Always provide easy opt-out options and respect them immediately. Maintaining a 
                  positive relationship with leads who aren't ready is important—they may become 
                  customers in the future or refer others.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track & Optimize</h3>
                <p className="text-gray-600">
                  Monitor which follow-ups get the best response and optimize your sequences accordingly. 
                  The AI system learns from results and improves over time, but you can also manually 
                  adjust based on your insights and business goals.
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How many follow-ups should I send?</h3>
                <p className="text-gray-600">
                  Research shows that 80% of sales require 5 follow-ups, yet most businesses give up 
                  after 2. The AI Follow-Up System can continue nurturing leads for as long as needed, 
                  adapting the frequency and content based on engagement levels. The system will 
                  automatically reduce frequency if a lead isn't engaging and increase it if they show 
                  interest.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Will leads know it\'s automated?</h3>
                <p className="text-gray-600">
                  The messages are designed to feel natural and human-like. However, you can choose to 
                  be transparent about using AI assistance or present it as your team. Many businesses 
                  find that being transparent builds trust, while others prefer a more human presentation. 
                  The choice is yours.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I customize follow-up sequences?</h3>
                <p className="text-gray-600">
                  Yes. You can create custom follow-up sequences for different lead types, industries, 
                  or stages in the buyer's journey. The system allows full customization while providing 
                  AI-powered optimization suggestions based on best practices and your results.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What happens when a lead responds?</h3>
                <p className="text-gray-600">
                  When a lead responds or shows buying signals, the system can automatically notify your 
                  sales team, schedule a call, move the lead to a different nurturing track, or continue 
                  the conversation via AI. You configure how different types of responses are handled based 
                  on your sales process.
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Follow-Up vs. Manual Follow-Up: What Changes</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What happens when you automate your lead follow-up system</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">AI Follow-Up</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Manual Follow-Up</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">No Follow-Up</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Response to missed calls', 'Under 60 seconds (SMS)', '15 min – never', 'Never'],
                  ['Follow-up sequence depth', '5-7 touch automated', '1-2 touches (manual)', 'None'],
                  ['After-hours follow-up', 'Active 24/7', 'No', 'No'],
                  ['Lead re-engagement rate', '35–50%', '10–15%', '0%'],
                  ['Staff time on follow-up/day', 'Under 15 min', '2–3 hours', '0 (no follow-up)'],
                  ['Monthly cost', 'Included in plan', '$3,200+ (staff time)', '$0'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{row[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[2]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[3]}</td>
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

export default AIFollowUpSystemPage;

