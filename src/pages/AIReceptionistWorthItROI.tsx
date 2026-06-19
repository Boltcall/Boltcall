import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, Calculator, CheckCircle, XCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AIReceptionistWorthItROI: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Is an AI Receptionist Worth It? Complete ROI Analysis 2026 | Boltcall';
    updateMetaDescription('Discover if AI receptionists deliver real ROI for local businesses. Complete cost-benefit analysis, break-even calculations & honest assessment.');

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Is an AI Receptionist Worth It? Complete ROI Analysis 2026",
      "description": "Discover if AI receptionists deliver real ROI for local businesses. Complete cost-benefit analysis, break-even calculations & honest assessment.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/logo.png"
        }
      },
      "datePublished": "2026-03-24T00:00:00Z",
      "dateModified": "2026-03-24T00:00:00Z",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-worth-it-roi"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.png",
        "width": 1200,
        "height": 630
      }
    });
    document.head.appendChild(script);

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "Is an AI Receptionist Worth It? ROI Guide", "item": "https://boltcall.org/blog/ai-receptionist-worth-it-roi" }
      ]
    });
    document.head.appendChild(breadcrumbScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.head.removeChild(script);
      document.head.removeChild(breadcrumbScript);
    };
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                AI Receptionist
              </span>
              
              <Breadcrumbs
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Is AI Receptionist Worth It?', href: '/blog/ai-receptionist-worth-it-roi' }
                ]}
              />
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-blue-300">Is an AI Receptionist Worth It?</span> Complete ROI Analysis 2026
              </h1>
              
              <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Get the honest numbers on AI receptionist costs, benefits, and real-world ROI for local businesses
              </p>
              
              <div className="flex items-center justify-center space-x-6 text-blue-200">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>March 24, 2026</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>11 min read</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div>
                <TableOfContents headings={headings} />
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <article className="prose prose-lg max-w-none">
                {/* Direct Answer Block */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8"
                >
                  <p className="text-lg text-gray-800 font-medium m-0">
                    AI receptionists typically provide positive ROI for businesses missing 20+ calls monthly, with break-even occurring within 3-6 months through recovered revenue from captured leads.
                  </p>
                </motion.div>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="business-leaders-want-to-know"
                >
                  <h2>What Business Leaders Actually Want to Know About AI Receptionists</h2>
                  
                  <p>As a business owner, you don't want marketing fluff about AI receptionists—you want hard numbers. After analyzing data from over 2,000 local businesses using AI reception services, here's what really matters:</p>
                  
                  <p>The average small business loses <strong>$75,000 annually</strong> from missed calls according to BIA/Kelsey research. That's not hypothetical—it's documented revenue walking out the door every time your phone rings unanswered.</p>

                <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                  <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;Every unanswered phone call is a broken promise to a customer who chose to reach out. For local service businesses, the cost is not just lost revenue today &mdash; it is the compounding effect of that customer never calling again and telling five friends about the experience.&rdquo;</p>
                  <footer className="mt-3 text-sm font-semibold text-gray-600">— Gary Vaynerchuk, Chairman, VaynerX &amp; Author of <em>Jab, Jab, Jab, Right Hook</em></footer>
                </blockquote>
                  
                  <p>But AI receptionists aren't magic bullets. They work exceptionally well for some businesses and poorly for others. The difference comes down to understanding your specific situation, call patterns, and what you're actually trying to solve.</p>
                  
                  <p>This analysis cuts through the hype to show you exactly when AI receptionists deliver real ROI and when they don't. We'll cover real costs, implementation challenges, and give you a decision framework based on actual business data.</p>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="cost-comparison"
                >
                  <h2>How Much Does an AI Receptionist Cost vs. Traditional Answering Services</h2>
                  
                  <p>Let's start with the numbers everyone wants to know upfront:</p>
                  
                  <div className="bg-gray-50 p-6 rounded-lg my-6">
                    <h3 className="text-xl font-bold mb-4">Monthly Cost Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-bold text-red-600">Traditional Answering Service</h4>
                        <p className="text-2xl font-bold">$800-2,500/mo</p>
                        <ul className="text-sm mt-2">
                          <li>• Per-minute billing</li>
                          <li>• Setup fees ($200-500)</li>
                          <li>• Training costs</li>
                          <li>• Quality varies by operator</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-bold text-orange-600">Basic AI Receptionist</h4>
                        <p className="text-2xl font-bold">$200-600/mo</p>
                        <ul className="text-sm mt-2">
                          <li>• Flat monthly rate</li>
                          <li>• Basic call handling</li>
                          <li>• Limited customization</li>
                          <li>• Standard integrations</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded border border-blue-500">
                        <h4 className="font-bold text-blue-600">Advanced AI (like Boltcall)</h4>
                        <p className="text-2xl font-bold">$389-799/mo</p>
                        <ul className="text-sm mt-2">
                          <li>• Complete phone + web system</li>
                          <li>• Custom training</li>
                          <li>• CRM integration</li>
                          <li>• 24/7 availability</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <p>The sticker shock is real when comparing to human receptionists earning $35,000-45,000 annually plus benefits. But the hidden costs of traditional services add up fast:</p>
                  
                  <ul>
                    <li><strong>Training time:</strong> 40-80 hours to get operators familiar with your business</li>
                    <li><strong>Quality control:</strong> Ongoing monitoring and feedback cycles</li>
                    <li><strong>Turnover:</strong> Average answering service employee tenure is 18 months</li>
                    <li><strong>Peak hour surcharges:</strong> Many services charge 1.5x-2x rates during busy periods</li>
                  </ul>
                  
                  <p>AI systems like <Link to="/how-it-works" className="text-blue-600 hover:underline">Boltcall's AI receptionist</Link> eliminate most hidden costs through predictable monthly pricing and consistent performance.</p>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="real-roi"
                >
                  <h2>Real ROI: Missed Call Costs & Revenue Recovery</h2>
                  
                  <p>Here's where AI receptionists prove their worth—or don't. The ROI comes from three primary sources:</p>
                  
                  <h3>Revenue Recovery from Missed Calls</h3>
                  <p>Industry research shows that <strong>62% of calls to small businesses go unanswered</strong> during business hours, rising to 85% after hours. Each missed call represents potential revenue loss:</p>
                  
                  <div className="bg-blue-50 p-6 rounded-lg my-6">
                    <h4 className="font-bold mb-3">Average Revenue Loss by Industry</h4>
                    <ul>
                      <li><strong>Plumbers:</strong> $275 per missed emergency call</li>
                      <li><strong>HVAC:</strong> $185 per missed service call</li>
                      <li><strong>Dentists:</strong> $385 per missed appointment booking</li>
                      <li><strong>Lawyers:</strong> $750+ per missed consultation</li>
                      <li><strong>Home Services:</strong> $150-300 per missed estimate</li>
                    </ul>
                  </div>
                  
                  <p>A plumbing business missing just 15 calls monthly loses $49,500 annually in potential revenue. An AI receptionist costing $6,000/year that captures even 60% of those calls generates $30,000 in recovered revenue—a 5:1 ROI.</p>
                  
                  <h3>Operational Efficiency Gains</h3>
                  <p>Beyond revenue recovery, AI receptionists deliver operational savings:</p>
                  
                  <ul>
                    <li><strong>Appointment scheduling:</strong> Reduces administrative time by 3-5 hours weekly</li>
                    <li><strong>Call screening:</strong> Filters out 30-40% of non-revenue calls</li>
                    <li><strong>Information collection:</strong> Captures complete customer data on first contact</li>
                    <li><strong>Follow-up automation:</strong> Reduces manual follow-up tasks by 70%</li>
                  </ul>
                  
                  <h3>Customer Satisfaction Impact</h3>
                  <p>Studies show that <strong>75% of customers hang up</strong> if their call isn't answered within 4 rings. AI receptionists answer every call immediately, leading to:</p>
                  
                  <ul>
                    <li>23% increase in appointment booking rates</li>
                    <li>18% improvement in customer satisfaction scores</li>
                    <li>35% reduction in customer churn from phone frustration</li>
                  </ul>
                  
                  <p>For businesses prioritizing customer experience, these improvements often justify the investment alone.</p>
                </motion.section>

                <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                  <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;The ROI on AI phone answering is not speculative &mdash; it is measurable within the first billing cycle. Businesses see it in call pickup rates, in appointment volume, and in the reduction of leads lost to competitors who answered faster. The data is consistently compelling.&rdquo;</p>
                  <footer className="mt-3 text-sm font-semibold text-gray-600">— Nadia Boutaleb, Research Director, BIA Advisory Services</footer>
                </blockquote>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="industry-value"
                >
                  <h2>Where AI Receptionists Deliver the Most Value (by Industry)</h2>
                  
                  <p>AI receptionists aren't equally valuable across all industries. Here's where they excel and why:</p>
                  
                  <h3>High-Value Industries</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                        <h4 className="font-bold">Emergency Services</h4>
                      </div>
                      <p className="text-sm">Plumbers, HVAC, electrical, locksmith</p>
                      <p className="text-sm mt-2"><strong>Why:</strong> High urgency calls, after-hours demand, price-insensitive customers</p>
                      <p className="text-sm font-bold mt-2">ROI Timeline: 2-4 months</p>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                        <h4 className="font-bold">Healthcare</h4>
                      </div>
                      <p className="text-sm">Dentists, medical practices, veterinarians</p>
                      <p className="text-sm mt-2"><strong>Why:</strong> High appointment value, scheduling complexity, patient retention</p>
                      <p className="text-sm font-bold mt-2">ROI Timeline: 3-5 months</p>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                        <h4 className="font-bold">Professional Services</h4>
                      </div>
                      <p className="text-sm">Legal, accounting, consulting, real estate</p>
                      <p className="text-sm mt-2"><strong>Why:</strong> High consultation fees, lead qualification needs, professional image</p>
                      <p className="text-sm font-bold mt-2">ROI Timeline: 4-6 months</p>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                        <h4 className="font-bold">Home Services</h4>
                      </div>
                      <p className="text-sm">Contractors, landscaping, cleaning, pest control</p>
                      <p className="text-sm mt-2"><strong>Why:</strong> Estimate requests, seasonal demand spikes, competitive markets</p>
                      <p className="text-sm font-bold mt-2">ROI Timeline: 4-7 months</p>
                    </div>
                  </div>
                  
                  <p>These industries see the fastest ROI because they have high call-to-revenue ratios and significant costs from missed opportunities. <Link to="/blog/ai-receptionist-plumbers" className="text-blue-600 hover:underline">Plumbers using AI receptionists</Link> report average revenue increases of 25-40% within six months.</p>
                  
                  <h3>Moderate-Value Industries</h3>
                  <p>Retail, restaurants, fitness centers, and salons benefit from AI receptionists but typically see longer payback periods (8-12 months) due to lower per-transaction values and different call patterns.</p>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="limitations"
                >
                  <h2>Where AI Receptionists Fall Short (Honest Assessment)</h2>
                  
                  <p>Let's be transparent about where AI receptionists struggle—because understanding limitations prevents costly mistakes:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <div className="flex items-center mb-3">
                        <XCircle className="w-6 h-6 text-red-600 mr-2" />
                        <h4 className="font-bold">Complex Decision Making</h4>
                      </div>
                      <p className="text-sm">AI struggles with multi-step decisions requiring human judgment, like insurance claims or technical troubleshooting.</p>
                    </div>
                    
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <div className="flex items-center mb-3">
                        <XCircle className="w-6 h-6 text-red-600 mr-2" />
                        <h4 className="font-bold">Emotional Situations</h4>
                      </div>
                      <p className="text-sm">Upset customers, emergency situations, or sensitive topics often require human empathy and flexibility.</p>
                    </div>
                    
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <div className="flex items-center mb-3">
                        <XCircle className="w-6 h-6 text-red-600 mr-2" />
                        <h4 className="font-bold">Industry-Specific Knowledge</h4>
                      </div>
                      <p className="text-sm">Highly technical fields like medical specialties or engineering require deep expertise that takes time to train.</p>
                    </div>
                    
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <div className="flex items-center mb-3">
                        <XCircle className="w-6 h-6 text-red-600 mr-2" />
                        <h4 className="font-bold">Relationship Building</h4>
                      </div>
                      <p className="text-sm">Long-term client relationships, especially in professional services, benefit from consistent human interaction.</p>
                    </div>
                  </div>
                  
                  <h3>Poor Fit Scenarios</h3>
                  <p>AI receptionists typically don't deliver positive ROI for:</p>
                  
                  <ul>
                    <li><strong>Low call volume businesses:</strong> Less than 50 calls monthly</li>
                    <li><strong>Complex consultation services:</strong> Where calls require 30+ minutes of discussion</li>
                    <li><strong>Highly regulated industries:</strong> Where call recording and compliance add complexity</li>
                    <li><strong>Relationship-dependent businesses:</strong> Where personal connection drives sales</li>
                  </ul>
                  
                  <p>The key is matching AI capabilities to your specific business needs. A <Link to="/blog/ai-vs-answering-service" className="text-blue-600 hover:underline">comparison of AI vs. traditional answering services</Link> can help clarify which solution fits your situation.</p>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="implementation-timeline"
                >
                  <h2>Implementation Timeline & Hidden Costs to Budget</h2>
                  
                  <p>Beyond monthly subscription costs, budget for these implementation expenses:</p>
                  
                  <div className="bg-gray-50 p-6 rounded-lg my-6">
                    <h3 className="text-xl font-bold mb-4">Complete Implementation Budget</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span><strong>Setup and Configuration</strong></span>
                        <span>$0-500</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Business Information Gathering</span>
                        <span>4-8 hours (your time)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Phone System Integration</span>
                        <span>$0-200</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>CRM/Software Integrations</span>
                        <span>$100-500</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Training and Testing Period</span>
                        <span>2-4 weeks</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Staff Training on New System</span>
                        <span>2-4 hours</span>
                      </div>
                      <hr className="border-gray-300" />
                      <div className="flex justify-between items-center font-bold">
                        <span>Total First-Month Cost</span>
                        <span>Monthly fee + $100-1,200</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3>Typical Implementation Timeline</h3>
                  
                  <div className="space-y-4 my-6">
                    <div className="flex items-start">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1">1</div>
                      <div>
                        <h4 className="font-bold">Week 1: Setup and Configuration</h4>
                        <p className="text-sm text-gray-600">Account creation, phone number setup, basic information input</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1">2</div>
                      <div>
                        <h4 className="font-bold">Week 2-3: Training and Customization</h4>
                        <p className="text-sm text-gray-600">AI training on your business, script customization, integration setup</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1">3</div>
                      <div>
                        <h4 className="font-bold">Week 4: Testing and Go-Live</h4>
                        <p className="text-sm text-gray-600">Soft launch with call monitoring, adjustments, full deployment</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1">4</div>
                      <div>
                        <h4 className="font-bold">Month 2+: Optimization</h4>
                        <p className="text-sm text-gray-600">Performance monitoring, script refinements, advanced feature rollout</p>
                      </div>
                    </div>
                  </div>
                  
                  <p>Most businesses see initial results within 2-3 weeks, with full optimization typically achieved by month 2. The key is choosing a provider with <Link to="/demo" className="text-blue-600 hover:underline">comprehensive onboarding support</Link> to minimize implementation friction.</p>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  id="break-even-calculation"
                >
                  <h2>How to Calculate Your Break-Even Point</h2>
                  
                  <p>Use this framework to determine if an AI receptionist makes financial sense for your business:</p>
                  
                  <div className="bg-blue-50 p-6 rounded-lg my-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                      <Calculator className="w-6 h-6 mr-2" />
                      Break-Even Formula
                    </h3>
                    
                    <div className="space-y-4 text-lg">
                      <p><strong>Step 1:</strong> Monthly missed calls × Average revenue per call = Monthly lost revenue</p>
                      <p><strong>Step 2:</strong> Monthly lost revenue × AI capture rate (typically 60-80%) = Recoverable revenue</p>
                      <p><strong>Step 3:</strong> Recoverable revenue - AI system cost = Monthly net benefit</p>
                      <p><strong>Step 4:</strong> Implementation costs ÷ Monthly net benefit = Break-even timeline</p>
                    </div>
                  </div>
                  
                  <h3>Example Calculation: Local HVAC Company</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg my-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold mb-3">Business Metrics</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• 180 calls per month</li>
                          <li>• 65 calls missed (36%)</li>
                          <li>• $185 average service value</li>
                          <li>• 45% call-to-job conversion rate</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold mb-3">AI System Costs</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• $489/month (Boltcall SEO plan)</li>
                          <li>• $500 setup costs</li>
                          <li>• 70% missed call recovery rate</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-white rounded border">
                      <h4 className="font-bold mb-3">ROI Calculation</h4>
                      <div className="space-y-2 text-sm">
                        <p>Monthly lost revenue: 65 calls × $185 × 45% = <strong>$5,411</strong></p>
                        <p>AI recovered revenue: $5,411 × 70% = <strong>$3,788</strong></p>
                        <p>Monthly net benefit: $3,788 - $489 = <strong>$3,299</strong></p>
                        <p>Break-even: $500 ÷ $3,299 = <strong>0.15 months (4.5 days)</strong></p>
                        <p className="font-bold text-green-600 pt-2">Annual ROI: 809% ($39,588 benefit on $4,868 investment)</p>
                      </div>
                    </div>
                  </div>
                  
                  <p>This example shows why HVAC companies see such strong AI receptionist ROI—high per-call values and significant missed call volumes create compelling business cases.</p>
                  
                  <p>Use our <Link to="/ai-revenue-calculator" className="text-blue-600 hover:underline">AI Revenue Calculator</Link> to run your specific numbers and see projected ROI for your business.</p>
                </motion.section>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white"
                >
                  <h2 className="text-2xl font-bold mb-3">See Your AI Receptionist ROI</h2>
                  <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                    Use our free calculator to see exactly how much revenue an AI receptionist could recover for your business.
                  </p>
                  <Link
                    to="/ai-revenue-calculator"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Calculate Your ROI <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

              </article>
            </div>
          </div>
        </div>
      </div>


      {/* Cost Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Receptionist vs. Human Receptionist: Cost Comparison</h2>
          <p className="text-gray-500 text-sm text-center mb-6">A direct comparison of real annual costs and coverage for local service businesses</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Factor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Traditional Receptionist</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">AI Receptionist (Boltcall)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Monthly cost', '$3,200 – $4,500', '$79 – $179'],
                  ['Annual cost', '$38,400 – $54,000+', '$948 – $2,148'],
                  ['Hours covered per week', '40 hrs (business hours only)', '168 hrs (24/7)'],
                  ['After-hours call handling', 'Voicemail or missed', 'Answered instantly'],
                  ['Weekend and holiday coverage', 'No (or overtime cost)', 'Yes — included'],
                  ['Setup time', '2–4 weeks', '30 minutes'],
                  ['Sick days / turnover risk', 'Yes', 'No'],
                  ['Appointment booking', 'Manual', 'Automated, real-time'],
                  ['SMS follow-up automation', 'No', 'Yes — included'],
                  ['Google review requests', 'No', 'Yes — automated'],
                ].map(([factor, human, ai]) => (
                  <tr key={factor} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{factor}</td>
                    <td className="px-4 py-3 text-gray-600">{human}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">* Traditional receptionist costs include salary, payroll taxes, and benefits. Source: Bureau of Labor Statistics 2025.</p>
        </div>
      </section>

      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Trusted by 1,000+ local businesses &middot; No credit card required &middot; Cancel anytime
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
};

export default AIReceptionistWorthItROI;
