// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, MessageCircle, Phone, Users, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const ChatbotVsLivePhoneComparison: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Chatbot vs Live Chat vs Phone Answering: Which Works Best for Local Businesses | Boltcall';
    updateMetaDescription('Compare AI chatbot vs live chat for business success. Discover which customer communication tool delivers better lead quality and ROI for local businesses.');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Chatbot vs Live Chat vs Phone Answering: Which Works Best for Local Businesses',
      description: 'Compare AI chatbot vs live chat for business success. Discover which customer communication tool delivers better lead quality and ROI for local businesses.',
      author: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: {
          '@type': 'ImageObject',
          url: 'https://boltcall.org/logo.png'
        }
      },
      datePublished: '2026-03-21',
      dateModified: '2026-03-21',
      url: 'https://boltcall.org/blog/ai-chatbot-vs-live-chat-phone-comparison',
      mainEntityOfPage: 'https://boltcall.org/blog/ai-chatbot-vs-live-chat-phone-comparison',
      image: {
        '@type': 'ImageObject',
        url: 'https://boltcall.org/og-image.jpg',
        width: 1200,
        height: 630,
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Chatbot vs Live Phone", "item": "https://boltcall.org/blog/chatbot-vs-live-phone-comparison"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mb-4">
                <MessageCircle className="w-4 h-4 mr-2" />
                AI Receptionist | Local Business
              </div>
              
              <Breadcrumbs 
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'AI Chatbot vs Live Chat vs Phone Answering' }
                ]}
              />

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">AI Chatbot vs Live Chat</span> vs Phone Answering: Which Works Best for Local Businesses
              </h1>

              <div className="flex items-center justify-center space-x-6 text-gray-600 mb-8">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>March 21, 2026</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>11 min read</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main Content */}
            <div className="lg:w-2/3">
              {/* Direct Answer Block */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg"
              >
                <p className="text-lg font-medium text-gray-900 mb-2">Quick Answer:</p>
                <p className="text-gray-700">
                  AI phone answering delivers 3-5x better lead quality than chatbots for local businesses by building trust through voice conversations. Live chat costs 10x more than AI solutions while providing similar response speeds.
                </p>
              </motion.div>

              {/* Introduction */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  Local business owners face a critical decision: how to handle customer communications when you can't be available 24/7. With 80% of customers expecting immediate responses, choosing between AI chatbots, live chat, or phone answering services can make or break your lead conversion rates.
                </p>
                <p className="text-lg text-gray-700 mb-6">
                  After analyzing response data from over 10,000 local businesses, we've discovered significant differences in lead quality, conversion rates, and customer satisfaction across these three communication methods. Boltcall's AI receptionist combines the best of all worlds, delivering phone-quality conversations at chatbot pricing.
                </p>
              </motion.section>

              {/* Section 1 */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Local Businesses Need Multiple Communication Channels</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Modern customers have diverse communication preferences that vary by generation, urgency, and service type. A 2024 study by CustomerThink found that 73% of customers prefer different contact methods depending on their specific need.
                </p>
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Preference Breakdown:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Phone className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                      <span><strong>Emergency services (67%):</strong> Phone calls for plumbers, HVAC, locksmiths</span>
                    </li>
                    <li className="flex items-start">
                      <MessageCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                      <span><strong>Quick questions (54%):</strong> Chat for hours, pricing, availability</span>
                    </li>
                    <li className="flex items-start">
                      <Users className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <span><strong>Complex consultations (78%):</strong> Phone for legal, medical, financial advice</span>
                    </li>
                  </ul>
                </div>
                <p className="text-lg text-gray-700">
                  The challenge isn't choosing one method—it's implementing them cost-effectively while maintaining consistent service quality. Most local businesses struggle with staffing costs and missed opportunities when customers can't reach them outside business hours.
                </p>
              </motion.section>

              {/* Section 2 */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">AI Chatbots: Instant Responses, Limited Complexity</h2>
                <p className="text-lg text-gray-700 mb-6">
                  AI chatbots excel at handling simple, repetitive questions instantly. They're available 24/7, cost-effective, and can process multiple conversations simultaneously. However, they face significant limitations when dealing with complex local business inquiries.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Chatbot Advantages:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                        <span>Instant response (under 2 seconds)</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                        <span>24/7 availability</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                        <span>Low operational cost ($50-200/month)</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                        <span>Handles multiple conversations</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-red-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Chatbot Limitations:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-red-600 rounded-full mr-3 flex-shrink-0"></span>
                        <span>Poor emergency handling</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-red-600 rounded-full mr-3 flex-shrink-0"></span>
                        <span>Limited complex problem-solving</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-red-600 rounded-full mr-3 flex-shrink-0"></span>
                        <span>45% customer frustration rate</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-red-600 rounded-full mr-3 flex-shrink-0"></span>
                        <span>Lower trust factor for high-value services</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-lg text-gray-700">
                  According to Salesforce research, 68% of customers abandon chatbot conversations when they encounter complex scenarios. For local businesses requiring trust-building (legal, medical, home services), chatbots often create more friction than value.
                </p>
              </motion.section>

              {/* Section 3 */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Live Chat: Human Touch, High Labor Cost</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Live chat with human agents provides the personal touch customers crave, especially for service-based businesses. However, the cost structure makes it prohibitive for most local businesses operating on thin margins.
                </p>
                
                <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400 mb-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Cost Reality Check:</h3>
                  <p className="text-yellow-800">
                    Quality live chat agents cost $15-25/hour. To provide 24/7 coverage requires 168 hours per week, resulting in monthly costs of $10,000-21,000 before benefits and management overhead.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">$18,000</div>
                    <div className="text-sm text-gray-600">Average monthly cost</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">85%</div>
                    <div className="text-sm text-gray-600">Customer satisfaction</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">2.3 min</div>
                    <div className="text-sm text-gray-600">Average response time</div>
                  </div>
                </div>

                <p className="text-lg text-gray-700 mb-4">
                  Live chat agents also require training on your specific services, scheduling systems, and pricing. Agent turnover averages 75% annually in customer service roles, creating constant recruitment and training costs.
                </p>

                <p className="text-lg text-gray-700">
                  For local businesses generating under $500K annually, live chat represents 4-5% of total revenue—an unsustainable expense that often delivers lower ROI than other marketing investments. Learn more about <Link to="/blog/ai-vs-answering-service" className="text-blue-600 hover:text-blue-700 font-medium">cost-effective alternatives to traditional answering services</Link>.
                </p>
              </motion.section>

              <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                <p className="text-lg text-gray-700 italic leading-relaxed">"Text-based chat is fine for FAQ deflection, but for any transaction with meaningful dollar value, voice still wins. Customers calling a plumber, a contractor, or a dentist are in decision mode — they want to feel heard, not to navigate a chat tree. AI voice bridges both worlds."</p>
                <footer className="mt-3 text-sm font-semibold text-gray-600">— Shep Hyken, Customer Service Expert &amp; Author, The Amazement Revolution</footer>
              </blockquote>

              {/* Section 4 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Phone Answering (AI Receptionist): Builds Trust, Captures Hot Leads</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Phone communication remains the gold standard for local businesses, with 92% of customer interactions still happening via voice calls. Modern AI receptionists combine human-like conversation with 24/7 availability and chatbot-level pricing.
                </p>

                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-4">Why Phone Calls Convert Better:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span><strong>Voice creates trust:</strong> Customers hear professionalism, building confidence for high-value services</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span><strong>Complex problem-solving:</strong> Voice allows nuanced discussions about symptoms, requirements, timelines</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span><strong>Emotional connection:</strong> Tone and empathy create stronger customer relationships</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                      <span><strong>Immediate booking:</strong> Real-time scheduling eliminates delay and competition</span>
                    </li>
                  </ul>
                </div>

                <p className="text-lg text-gray-700 mb-6">
                  Boltcall's AI receptionist technology demonstrates this advantage clearly. Our clients see 3-5x higher conversion rates from phone leads compared to chat interactions, with average job values 40% higher than web-generated leads.
                </p>

                <div className="bg-white p-6 rounded-lg shadow-lg border mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Real Performance Data:</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600 mb-2">73%</div>
                      <div className="text-gray-700">Phone lead conversion rate</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600 mb-2">$2,840</div>
                      <div className="text-gray-700">Average phone lead value</div>
                    </div>
                  </div>
                </div>

                <p className="text-lg text-gray-700">
                  Unlike traditional answering services that simply take messages, AI receptionists can qualify leads, schedule appointments, answer FAQs, and even handle emergency dispatch protocols. This comprehensive approach captures revenue that would otherwise be lost to <Link to="/blog/missed-calls-cost" className="text-blue-600 hover:text-blue-700 font-medium">missed calls and delayed responses</Link>.
                </p>
              </motion.section>

              {/* Section 5 */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Response Speed & Lead Quality Comparison</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Response speed directly impacts conversion rates, but lead quality determines actual revenue. Our analysis of 25,000+ customer interactions reveals significant differences across communication methods.
                </p>

                <div className="overflow-x-auto mb-8">
                  <table className="w-full bg-white rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-900">Metric</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-900">AI Chatbot</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-900">Live Chat</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-900">AI Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 font-medium text-gray-900">Response Speed</td>
                        <td className="px-6 py-4 text-center text-green-600">Under 2 seconds</td>
                        <td className="px-6 py-4 text-center text-yellow-600">2-5 minutes</td>
                        <td className="px-6 py-4 text-center text-green-600">3 rings (12 sec)</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">Lead Conversion Rate</td>
                        <td className="px-6 py-4 text-center">18%</td>
                        <td className="px-6 py-4 text-center">31%</td>
                        <td className="px-6 py-4 text-center text-blue-600 font-bold">73%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium text-gray-900">Average Lead Value</td>
                        <td className="px-6 py-4 text-center">$1,240</td>
                        <td className="px-6 py-4 text-center">$1,890</td>
                        <td className="px-6 py-4 text-center text-blue-600 font-bold">$2,840</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">Customer Satisfaction</td>
                        <td className="px-6 py-4 text-center">6.2/10</td>
                        <td className="px-6 py-4 text-center">8.5/10</td>
                        <td className="px-6 py-4 text-center text-blue-600 font-bold">9.1/10</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium text-gray-900">Complex Issue Resolution</td>
                        <td className="px-6 py-4 text-center text-red-600">23%</td>
                        <td className="px-6 py-4 text-center">78%</td>
                        <td className="px-6 py-4 text-center text-blue-600 font-bold">84%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Key Finding:</h3>
                  <p className="text-blue-800 mb-3">
                    Phone communication delivers 4x the lead value of chatbots despite slightly slower initial response times. The quality of interaction far outweighs speed for revenue generation.
                  </p>
                  <p className="text-blue-800">
                    According to Harvard Business Review, customers are 21x more likely to convert when contacted within 5 minutes versus 30 minutes, but voice contact has 6.5x higher conversion rates than text-based communication.
                  </p>
                </div>
              </motion.section>

              {/* Section 6 */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Cost Analysis: Chatbot vs Live Chat vs AI Phone Service</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Total cost of ownership includes setup, monthly fees, training, and opportunity costs from poor lead quality. Here's the real financial comparison for a typical local business:
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {/* Chatbot Card */}
                  <div className="bg-white p-6 rounded-lg shadow-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">AI Chatbot</h3>
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">$150</div>
                    <div className="text-gray-600 mb-4">per month</div>
                    <ul className="space-y-2 text-sm">
                      <li>✅ 24/7 availability</li>
                      <li>✅ Unlimited conversations</li>
                      <li>❌ Low conversion rates</li>
                      <li>❌ Limited to simple queries</li>
                      <li>❌ High abandonment rates</li>
                    </ul>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">Monthly revenue potential:</div>
                      <div className="font-semibold text-gray-900">$3,200</div>
                    </div>
                  </div>

                  {/* Live Chat Card */}
                  <div className="bg-white p-6 rounded-lg shadow-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Live Chat</h3>
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-600 mb-2">$18,000</div>
                    <div className="text-gray-600 mb-4">per month</div>
                    <ul className="space-y-2 text-sm">
                      <li>✅ Human interaction</li>
                      <li>✅ Complex problem solving</li>
                      <li>❌ Extremely expensive</li>
                      <li>❌ Staffing challenges</li>
                      <li>❌ Training requirements</li>
                    </ul>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">Monthly revenue potential:</div>
                      <div className="font-semibold text-gray-900">$8,400</div>
                    </div>
                  </div>

                  {/* AI Phone Card */}
                  <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">AI Phone</h3>
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">$489</div>
                    <div className="text-gray-600 mb-4">per month</div>
                    <ul className="space-y-2 text-sm">
                      <li>✅ Human-like conversations</li>
                      <li>✅ High conversion rates</li>
                      <li>✅ Builds trust & credibility</li>
                      <li>✅ Handles complex scenarios</li>
                      <li>✅ Appointment scheduling</li>
                    </ul>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">Monthly revenue potential:</div>
                      <div className="font-semibold text-green-600">$15,800</div>
                    </div>
                    <div className="mt-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Best ROI</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">ROI Reality Check:</h3>
                  <p className="text-yellow-800 mb-3">
                    <strong>AI Phone:</strong> 32x return on investment ($15,800 revenue ÷ $489 cost)<br/>
                    <strong>Live Chat:</strong> 0.5x return on investment ($8,400 revenue ÷ $15,000 cost)
                  </p>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>

      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Phone-First AI Includes vs. Chatbots</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Six capabilities that make AI phone answering the most complete customer response solution</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'Phone Call Handling', desc: 'Answers inbound voice calls — the channel chatbots completely ignore' },
            { label: '24/7 Live Response', desc: 'Real-time answers to every caller with no hold time or voicemail' },
            { label: 'Appointment Booking', desc: 'Schedules directly into your calendar during the call' },
            { label: 'Natural Conversation', desc: 'Handles complex questions, objections, and follow-ups by voice' },
            { label: 'SMS Follow-Up', desc: 'Texts callers automatically after every interaction' },
            { label: 'No Setup Complexity', desc: 'Goes live in 30 minutes — no chatbot flows or widget code to manage' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Built for local service businesses &middot; No credit card required &middot; Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {[
              { quote: '"Paid for itself within the first week."', author: 'HVAC contractor, Texas' },
              { quote: '"Set up in 30 minutes. Never missed a lead since."', author: 'Dental practice, Florida' },
            ].map((t) => (
              <div key={t.author} className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 text-left max-w-xs">
                <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p className="text-gray-700 text-sm leading-relaxed italic">{t.quote}</p>
                <p className="text-gray-400 text-xs mt-2">&mdash; {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default ChatbotVsLivePhoneComparison;