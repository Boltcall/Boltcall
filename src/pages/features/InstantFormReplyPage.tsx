import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { FileText, Users, Phone, Calendar, CheckCircle } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';
import { WavePath } from '../../components/ui/wave-path';

const InstantFormReplyPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Instant Lead Response System for Small Businesses';
    updateMetaDescription('Automatically respond to form submissions in seconds. Qualify leads instantly, book appointments from forms and ads. Get started now.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "Instant Form Reply", "item": "https://boltcall.org/features/instant-form-reply"}]});
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
        { question: 'Will customers know they\'re talking to AI?', answer: 'The AI can be transparent about being an AI assistant, or you can configure it to present as a team member. Many businesses find that being transparent builds trust, while others prefer a more human-like presentation. The choice is yours, and you can change it at any time.' },
        { question: 'What if a customer needs to speak to a human?', answer: 'The AI can seamlessly transfer conversations to human team members when needed. It can also schedule callbacks, take detailed messages, or escalate urgent matters. The system ensures customers always get the help they need, whether from AI or human agents.' },
        { question: 'Can I customize the responses?', answer: 'Absolutely. You can customize response templates, tone, messaging, and even create different responses for different types of forms or inquiries. The system learns from your preferences and can be trained on your specific business language and terminology.' },
        { question: 'How quickly does it respond?', answer: 'Responses are sent within 5-10 seconds of form submission. This instant response is crucial for maintaining customer engagement and maximizing conversion rates. The speed is consistent regardless of time of day or volume of submissions.' },
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
              <FileText className="w-4 h-4" />
              <span className="font-semibold">Instant Form Reply</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Turn Form Submissions into <span className="text-blue-600">Instant Conversations</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Automatically respond to every form submission within seconds, qualify leads, and book appointments—all without manual work.
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
              <span>What is Instant Form Reply?</span>
            </h2>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                Instant Form Reply automatically responds to every form submission on your website within seconds. 
                Instead of leaving customers waiting for a response, your AI immediately acknowledges their inquiry, 
                asks qualifying questions, and can even book appointments directly.
              </p>
              <p className="text-lg">
                Whether it's a contact form, quote request, consultation booking, or any other form on your site, 
                Instant Form Reply ensures every lead gets instant attention and professional follow-up. The system 
                works seamlessly with any form platform, including contact forms, lead generation forms, quote requests, 
                consultation bookings, and more.
              </p>
              <p className="text-lg">
                When a form is submitted, the AI instantly analyzes the information provided, personalizes the response 
                based on the customer's specific inquiry, and engages them in a natural conversation. This immediate 
                interaction keeps the customer engaged while they're still on your website, significantly increasing 
                the likelihood of conversion.
              </p>
              <p className="text-lg">
                The system can also intelligently route inquiries to the right department or person, schedule appointments 
                directly into your calendar, and even provide instant answers to common questions—all without any manual 
                intervention from your team.
              </p>
            </div>
          </motion.div>

          {/* Wave Path Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="my-16"
          >
            <div className="flex w-[70vw] max-w-2xl flex-col">
              <WavePath className="mb-8 text-blue-600" />
              <div className="flex w-full flex-col">
                <div className="flex">
                  <p className="text-gray-500 text-sm mt-2">Instant response flow</p>
                  <p className="text-gray-800 ml-8 w-3/4 text-lg md:text-xl">
                    From form submission to qualified lead in seconds—that's the power of instant automation.
                  </p>
                </div>
              </div>
            </div>
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
              <span>Why Instant Form Reply is Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                  The 60-Second Rule
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Research shows that <strong>responding within 60 seconds increases conversion by 391%</strong>. 
                  Most businesses take hours or days to respond to form submissions, losing potential customers 
                  to competitors who respond faster. Instant Form Reply ensures you're always first.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The difference between responding in 60 seconds versus 60 minutes is dramatic. Customers who receive 
                  instant responses feel valued and prioritized, which builds trust and increases their likelihood of 
                  choosing your business. The longer they wait, the more time they have to research competitors and 
                  find alternatives.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                  Form Abandonment is Real
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When customers submit a form and don't hear back quickly, they assume you're not interested 
                  or too busy. <strong>68% of customers will move on to a competitor</strong> if they don't receive 
                  a response within 24 hours. Instant Form Reply eliminates this risk entirely.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Form abandonment isn't just about losing a single lead—it's about losing potential long-term customers. 
                  When someone takes the time to fill out your form, they're showing genuine interest. If that interest 
                  isn't immediately acknowledged and nurtured, it quickly fades. Instant response keeps the momentum 
                  going and maintains the customer's engagement with your brand.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                  Professional First Impression
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  An instant, personalized response shows professionalism and attention to detail. 
                  It sets the tone for your entire customer relationship and demonstrates that you value 
                  their time and business.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  First impressions matter, and in the digital age, your first impression is often your form response. 
                  A professional, instant response creates a positive association with your brand from the very beginning. 
                  It shows that you're organized, responsive, and committed to customer service—qualities that customers 
                  value and remember when making purchasing decisions.
                </p>
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
              <span>How Instant Form Reply Helps Your Business</span>
            </h2>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Instant Engagement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Respond to every form submission within seconds, keeping leads engaged and moving them 
                  through your sales funnel immediately. The instant response maintains the customer's momentum 
                  and interest, preventing them from getting distracted or moving on to a competitor.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  This immediate engagement also allows you to capture more information about the lead while they're 
                  still engaged. The AI can ask follow-up questions, clarify needs, and gather additional details 
                  that help you better serve the customer and close the sale.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Lead Qualification
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatically ask qualifying questions to determine lead quality and buying intent, 
                  so you focus on the most promising opportunities. The AI can intelligently assess 
                  the customer's needs, budget, timeline, and decision-making authority.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  This qualification process saves your sales team valuable time by filtering out low-quality 
                  leads and identifying high-value prospects. The system can also score leads based on their 
                  responses, helping you prioritize follow-up efforts and allocate resources more effectively.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Automatic Booking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Book appointments directly from form submissions without any manual intervention. 
                  The AI handles scheduling and sends confirmations automatically. It can check your 
                  calendar availability, suggest optimal times, and confirm appointments instantly.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  This seamless booking process eliminates the back-and-forth typically required to schedule 
                  appointments, reducing friction in the customer journey and increasing conversion rates. 
                  Customers can book immediately while they're still engaged, rather than waiting for email 
                  responses and potentially losing interest.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  24/7 Coverage
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Forms are submitted at all hours. Instant Form Reply ensures every submission gets 
                  immediate attention, even on weekends and holidays. This 24/7 coverage means you never 
                  miss an opportunity, regardless of when a customer decides to reach out.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Many customers research and make purchasing decisions outside of traditional business hours. 
                  By providing instant responses at any time, you capture leads that would otherwise be lost 
                  to competitors who are only available during business hours. This around-the-clock availability 
                  gives you a significant competitive advantage.
                </p>
              </div>
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
              <span>How Instant Form Reply Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Form Submission Detection
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system monitors your website forms in real-time. The moment a form is submitted, 
                  Instant Form Reply is triggered. There's no delay, no waiting period—the response 
                  happens within seconds of submission. This immediate detection ensures customers receive 
                  acknowledgment while they're still on your website, maintaining engagement and momentum.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system works with any form platform: contact forms, quote request forms, consultation 
                  booking forms, newsletter signups, and more. It can integrate via webhooks, API connections, 
                  or form plugins, ensuring compatibility with your existing website infrastructure.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Instant Analysis & Personalization
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI instantly analyzes the form submission, extracting key information like name, 
                  contact details, inquiry type, and any specific questions or requirements. It then 
                  personalizes the response based on this information, addressing the customer by name 
                  and referencing their specific inquiry.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The personalization goes beyond just using the customer's name. The AI can reference 
                  specific services they inquired about, acknowledge their location if provided, and 
                  tailor the message tone based on the type of inquiry. This creates a more meaningful 
                  connection and shows that you're paying attention to their specific needs.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Multi-Channel Response
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system sends responses via multiple channels simultaneously: SMS text message and 
                  email. This ensures the customer receives the response on their preferred channel and 
                  increases the likelihood they'll see it immediately. The response includes a personalized 
                  greeting, acknowledgment of their inquiry, and next steps.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  SMS messages are particularly effective because 98% of text messages are opened, compared 
                  to just 20% of emails. By sending both, you maximize the chances of immediate engagement. 
                  The messages can include links to schedule appointments, request more information, or 
                  continue the conversation.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Lead Qualification & Engagement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI can continue the conversation through SMS, asking qualifying questions to better 
                  understand the customer's needs, budget, timeline, and decision-making authority. This 
                  two-way conversation happens in real-time, keeping the customer engaged and moving them 
                  through your sales funnel.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The qualification process is conversational and natural, not like filling out another form. 
                  The AI asks questions one at a time, responds to answers, and adapts based on the customer's 
                  responses. This approach feels more like talking to a helpful salesperson than being 
                  interrogated, leading to higher engagement and more honest responses.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Automatic Appointment Booking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  If the customer is ready to schedule, the AI can book appointments directly from the 
                  conversation. It checks your calendar availability, suggests optimal times, and confirms 
                  the appointment—all through text message. The customer never has to leave the conversation 
                  or wait for email responses.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  This seamless booking process eliminates friction and reduces the time between inquiry 
                  and appointment. Customers can book immediately while they're still engaged and interested, 
                  rather than waiting hours or days for a response and potentially losing interest or choosing 
                  a competitor.
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
              <span>Real-World Use Cases</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  An online retailer receives 500 form submissions per month from their "Contact Us" form. 
                  Before Instant Form Reply, they responded to inquiries within 24-48 hours, losing 40% of 
                  potential customers to competitors who responded faster. After implementation, every form 
                  submission receives an instant response within 10 seconds.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The instant response includes order status information, product recommendations based on 
                  their inquiry, and links to schedule a call with a sales representative. This resulted in 
                  a 35% increase in conversions and a 50% reduction in customer service workload, as many 
                  questions are answered automatically.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Service-Based Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A home cleaning service uses Instant Form Reply for their quote request form. When customers 
                  submit a form requesting a quote, they immediately receive a text message acknowledging their 
                  request and asking a few qualifying questions about their needs. The AI can provide instant 
                  price estimates for standard services and schedule in-home consultations for custom quotes.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  This instant engagement keeps customers interested and prevents them from submitting multiple 
                  quote requests to competitors. The business saw a 60% increase in consultation bookings and 
                  a 45% improvement in quote-to-booking conversion rates, as customers received immediate 
                  attention and felt valued.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Services</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A consulting firm uses Instant Form Reply for their consultation request form. When potential 
                  clients submit the form, they receive an instant response that acknowledges their inquiry, 
                  provides information about the consultation process, and offers to schedule a call immediately. 
                  The AI can check consultant availability and book consultations directly.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  This professional, instant response creates a strong first impression and demonstrates the 
                  firm's efficiency and attention to detail. The firm converted 30% more form submissions into 
                  consultations and reduced the time between inquiry and consultation from an average of 5 days 
                  to same-day or next-day scheduling.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
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
              <span>Easy Integration with Your Forms</span>
            </h2>
            
            <div className="space-y-6">
              <p className="text-lg text-gray-600 leading-relaxed">
                Instant Form Reply works with virtually any form platform. Whether you use WordPress forms, 
                Wix forms, Squarespace forms, custom HTML forms, or form builders like Typeform or JotForm, 
                the system can integrate seamlessly. Integration typically takes just a few minutes and requires 
                no coding knowledge.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Webhook Integration</h3>
                  <p className="text-gray-600 text-sm">
                    Most modern form platforms support webhooks. Simply add the webhook URL to your form 
                    settings, and submissions will be sent instantly to Instant Form Reply.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">API Integration</h3>
                  <p className="text-gray-600 text-sm">
                    For custom forms or advanced integrations, use our REST API to send form submissions 
                    programmatically. Full API documentation is available.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Plugin Integration</h3>
                  <p className="text-gray-600 text-sm">
                    For popular platforms like WordPress, we offer plugins that make integration as simple 
                    as installing and activating.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Email Integration</h3>
                  <p className="text-gray-600 text-sm">
                    For forms that send email notifications, we can monitor your email inbox and respond 
                    to form submissions automatically.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROI Section */}
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
              <span>The Financial Impact</span>
            </h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Consider a business that receives 200 form submissions per month. Research shows that 
                responding within 60 seconds increases conversion rates by 391%. If your current 
                conversion rate is 5% (10 customers from 200 submissions), responding instantly could 
                increase that to 19.5% (39 customers).
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                That's 29 additional customers per month. At an average customer value of $300, that's 
                $8,700 in additional monthly revenue ($104,400 annually). Even if the improvement is more 
                conservative at 200% (doubling conversions), that's still $3,000 monthly ($36,000 annually) 
                in additional revenue.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Additionally, you save time on manual follow-ups. If responding to each form submission 
                takes 5 minutes, that's 1,000 minutes (16.7 hours) per month saved. At $50 per hour, 
                that's $835 in time savings monthly ($10,020 annually). Combined with increased revenue, 
                the total benefit is substantial.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
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
              <span>Frequently Asked Questions</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Will customers know they're talking to AI?</h3>
                <p className="text-gray-600">
                  The AI can be transparent about being an AI assistant, or you can configure it to present 
                  as a team member. Many businesses find that being transparent builds trust, while others 
                  prefer a more human-like presentation. The choice is yours, and you can change it at any time.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What if a customer needs to speak to a human?</h3>
                <p className="text-gray-600">
                  The AI can seamlessly transfer conversations to human team members when needed. It can 
                  also schedule callbacks, take detailed messages, or escalate urgent matters. The system 
                  ensures customers always get the help they need, whether from AI or human agents.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I customize the responses?</h3>
                <p className="text-gray-600">
                  Absolutely. You can customize response templates, tone, messaging, and even create different 
                  responses for different types of forms or inquiries. The system learns from your preferences 
                  and can be trained on your specific business language and terminology.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How quickly does it respond?</h3>
                <p className="text-gray-600">
                  Responses are sent within 5-10 seconds of form submission. This instant response is crucial 
                  for maintaining customer engagement and maximizing conversion rates. The speed is consistent 
                  regardless of time of day or volume of submissions.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="my-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
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
            <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Launch an AI agent in 5 minutes at no cost. Connect it to all your business channels.</p>
            <Link
              to="/setup"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start the free setup
            </Link>
          </div>
        </div>
      </motion.div>

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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Instant Form Reply vs. Standard Form Handling</h2>
          <p className="text-gray-500 text-sm text-center mb-6">What happens to web form leads with and without instant AI-powered response</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Instant AI Reply</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Manual Callback</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Email Auto-Reply</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Response to form submission', 'Under 60 seconds (call + SMS)', '47 min average', 'Auto-email only'],
                  ['Lead qualification', 'Automated during first contact', 'Manual callback', 'None'],
                  ['After-hours form handling', 'Active 24/7', 'Next business day', 'Auto-email only'],
                  ['Conversion rate from forms', '35–52%', '18–22%', '8–12%'],
                  ['Revenue recovered/month', '$4,000 – $25,000+', 'Baseline', 'Below baseline'],
                  ['Staff effort required', 'None — fully automated', '2+ hours/day', 'None (but low results)'],
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

export default InstantFormReplyPage;

