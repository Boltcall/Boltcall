// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, Phone, Brain, Settings, Zap, MessageCircle, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const HowAiReceptionistWorks: React.FC = () => {
  const { activeId, headings } = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'How Does AI Receptionist Work? Complete Technical Guide 2026 | Boltcall';
    updateMetaDescription('Discover how AI receptionists work with natural language processing, call routing, and system integrations. Complete technical guide for local businesses.');

    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How AI Receptionists Work: A Complete Technical Guide for Local Businesses",
      "description": "Discover how AI receptionists work with natural language processing, call routing, and system integrations. Complete technical guide for local businesses.",
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
      "datePublished": "2026-03-12",
      "dateModified": "2026-03-12",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/how-ai-receptionist-works"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    // Add canonical link
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/how-ai-receptionist-works';

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "How It Works", "item": "https://boltcall.org/how-it-works"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.head.removeChild(script);
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
    };
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      <main>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="hidden xl:block w-80 p-8">
          <div>
            <TableOfContents headings={headings} activeId={activeId} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-4xl mx-auto">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-24 pb-16 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Receptionist
                </span>
                <Breadcrumbs 
                  items={[
                    { label: 'Blog', href: '/blog' },
                    { label: 'AI Receptionist', href: '/blog/category/ai-receptionist' },
                    { label: 'How AI Receptionist Works' }
                  ]} 
                />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">How Does AI Receptionist Work?</span> A Complete Technical Guide for Local Businesses
              </h1>
              
              <div className="flex items-center text-gray-600 mb-8 space-x-6">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>March 12, 2026</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>12 min read</span>
                </div>
              </div>

              {/* Direct Answer Block */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
                <h2 className="font-semibold text-gray-900 mb-2">Quick Answer:</h2>
                <p className="text-gray-800">
                  AI receptionists work by using natural language processing to understand caller requests, automated decision trees to route calls appropriately, and real-time integrations with business systems to provide instant responses and schedule appointments without human intervention.
                </p>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <article className="max-w-4xl mx-auto px-6 py-12">
            <div className="prose prose-lg max-w-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                  Every day, local businesses lose potential customers to unanswered phone calls. In fact, <strong>62% of customers will hang up if their call isn't answered within 4 rings</strong>, according to recent CallHippo research. AI receptionists have emerged as the solution, but how exactly do these digital assistants work? This comprehensive guide breaks down the technology behind AI receptionists and why forward-thinking businesses are making the switch.
                </p>

                <p className="mb-8">
                  Whether you're a plumber dealing with emergency calls at 2 AM or a dental practice trying to manage appointment scheduling during busy hours, understanding how AI receptionist technology works can help you make an informed decision about automating your phone system. Companies like <strong>Boltcall</strong> are leading the charge in making this technology accessible and effective for local businesses of all sizes.
                </p>
              </motion.div>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="how-ai-receptionists-answer-calls" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Phone className="w-8 h-8 mr-3 text-blue-600" />
                  How AI Receptionists Answer Calls
                </h2>

                <p className="mb-6">
                  The moment a call comes in, AI receptionist technology springs into action through a sophisticated multi-step process. Unlike traditional phone systems that simply route calls based on predetermined rules, AI receptionists actively listen, understand, and respond to each caller's unique needs.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold mb-4">The Call Answering Process:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li><strong>Call Detection:</strong> The system immediately recognizes incoming calls and answers within 1-2 rings</li>
                    <li><strong>Voice Analysis:</strong> Speech-to-text conversion captures the caller's words in real-time</li>
                    <li><strong>Context Recognition:</strong> AI determines the caller's intent and emotional state</li>
                    <li><strong>Response Generation:</strong> Appropriate responses are generated based on your business information</li>
                    <li><strong>Voice Synthesis:</strong> Text responses are converted to natural-sounding speech</li>
                  </ol>
                </div>

                <p className="mb-6">
                  Modern AI receptionists can handle multiple calls simultaneously, ensuring no customer ever receives a busy signal. Research from Salesforce shows that <strong>78% of customers expect immediate responses</strong> when contacting businesses, making this capability crucial for maintaining customer satisfaction.
                </p>

                <p>
                  The key advantage over human receptionists isn't just availability—it's consistency. Your AI receptionist delivers the same professional greeting, accurate information, and helpful service whether it's the first call of the day or the hundredth. This consistency helps build trust and reinforces your brand image with every interaction.
                </p>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="natural-language-processing" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Brain className="w-8 h-8 mr-3 text-blue-600" />
                  Natural Language Processing: Understanding Customer Requests
                </h2>

                <p className="mb-6">
                  At the heart of every effective AI receptionist lies Natural Language Processing (NLP)—the technology that enables machines to understand and interpret human speech patterns, context, and intent. This isn't simple keyword matching; it's sophisticated language comprehension that rivals human understanding.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-blue-800">What NLP Recognizes:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Intent (appointment, question, complaint)</li>
                      <li>• Urgency level and emotional tone</li>
                      <li>• Specific services or products mentioned</li>
                      <li>• Dates, times, and contact information</li>
                      <li>• Regional accents and speech patterns</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-green-800">Advanced Capabilities:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Context switching mid-conversation</li>
                      <li>• Handling interruptions and clarifications</li>
                      <li>• Understanding slang and colloquialisms</li>
                      <li>• Processing multiple requests in one call</li>
                      <li>• Detecting when escalation is needed</li>
                    </ul>
                  </div>
                </div>

                <p className="mb-6">
                  For example, when a customer calls your plumbing business saying "My basement is flooding and I need someone here NOW," the AI doesn't just hear keywords like "basement" and "flooding." It recognizes the urgency, understands this is an emergency service request, and immediately initiates your emergency protocol—checking technician availability, providing immediate guidance, and ensuring rapid response.
                </p>

                <p className="mb-6">
                  The sophistication of modern NLP means your AI receptionist can handle regional dialects, industry-specific terminology, and even emotional customers. According to MIT research, <strong>advanced AI systems now achieve 95% accuracy in understanding human speech</strong>, even in noisy environments or with strong accents.
                </p>

                <blockquote className="border-l-4 border-blue-500 pl-6 italic text-lg text-gray-700 mb-6">
                  "The difference between basic automated systems and AI receptionists is like comparing a calculator to a smartphone. Both can do math, but only one can understand what you really need." - TechCrunch AI Review
                </blockquote>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="call-routing-decision-making" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Settings className="w-8 h-8 mr-3 text-blue-600" />
                  Call Routing & Decision Making
                </h2>

                <p className="mb-6">
                  Once the AI understands what a caller needs, sophisticated decision-making algorithms determine the best course of action. This isn't random—it's based on your business rules, priorities, and real-time conditions that change throughout the day.
                </p>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Intelligent Routing Factors:</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-blue-600 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Request Type Analysis</h4>
                        <p className="text-gray-700">Emergency calls bypass normal queues, routine inquiries get instant responses, and complex issues route to specialists.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-blue-600 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Staff Availability</h4>
                        <p className="text-gray-700">Real-time integration with schedules ensures calls reach available team members or appropriate alternatives.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-blue-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Customer History</h4>
                        <p className="text-gray-700">Previous interactions inform routing decisions, ensuring VIP customers or repeat clients get priority treatment.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mb-6">
                  The decision-making process happens in milliseconds, but it's incredibly thorough. For instance, if a dental office receives a call about tooth pain at 3 PM on a Tuesday, the AI considers: Is this an emergency? Which dentists are available? Does this patient have a history of missed appointments? Are there openings today or tomorrow? All this analysis happens instantly.
                </p>

                <p className="mb-6">
                  Smart routing also adapts to patterns. If your HVAC business typically gets more emergency calls on extremely hot days, the AI learns to prioritize faster response times and have backup protocols ready. This <Link to="/blog/ai-vs-answering-service" className="text-blue-600 hover:underline">intelligent adaptation</Link> is where AI receptionists truly outshine traditional answering services.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">Pro Tip:</h3>
                  <p className="text-yellow-700">
                    The most effective AI receptionists learn from your business patterns. The longer they operate, the better they become at predicting customer needs and making optimal routing decisions.
                  </p>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="integration-business-systems" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Zap className="w-8 h-8 mr-3 text-blue-600" />
                  Integration With Your Business Systems
                </h2>

                <p className="mb-6">
                  The real power of AI receptionists comes from their ability to seamlessly integrate with your existing business tools and databases. This isn't just about answering calls—it's about becoming a central hub that connects all your customer interaction points.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="border border-gray-200 p-6 rounded-lg">
                    <h3 className="font-semibold mb-3 text-blue-600">Scheduling Systems</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Real-time calendar access</li>
                      <li>• Automatic appointment booking</li>
                      <li>• Cancellation and rescheduling</li>
                      <li>• Reminder notifications</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 p-6 rounded-lg">
                    <h3 className="font-semibold mb-3 text-green-600">CRM Integration</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Customer history access</li>
                      <li>• Lead capture and qualification</li>
                      <li>• Contact information updates</li>
                      <li>• Service history tracking</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 p-6 rounded-lg">
                    <h3 className="font-semibold mb-3 text-purple-600">Payment Processing</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Invoice status checks</li>
                      <li>• Payment collection</li>
                      <li>• Estimate generation</li>
                      <li>• Billing inquiries</li>
                    </ul>
                  </div>
                </div>

                <p className="mb-6">
                  These integrations mean that when a customer calls, your AI receptionist has immediate access to their complete history. A returning customer to your auto repair shop doesn't need to repeat their vehicle information—the AI already knows they drive a 2020 Honda Civic and had brake work done three months ago. This level of personalization creates an exceptional customer experience that builds loyalty.
                </p>

                <p className="mb-6">
                  For local businesses, integration capabilities are game-changing. Your <Link to="/blog/ai-appointment-scheduling" className="text-blue-600 hover:underline">AI appointment scheduling</Link> system can check multiple technicians' schedules, find the optimal time slot, confirm the appointment, and send automated reminders—all while the customer is still on the phone.
                </p>

                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-blue-800">Real-World Integration Example:</h3>
                  <p className="text-blue-700">
                    A dental practice using Boltcall's AI receptionist reports that 87% of appointment requests are now handled completely during the initial call, with no callbacks needed. The AI checks insurance coverage, available appointment slots, and sends confirmation texts automatically.
                  </p>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="handling-complex-scenarios" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <MessageCircle className="w-8 h-8 mr-3 text-blue-600" />
                  Handling Complex Scenarios & Escalations
                </h2>

                <p className="mb-6">
                  While AI receptionists excel at routine tasks, their true value shows when handling complex situations that require nuanced understanding and appropriate escalation. Advanced AI systems don't just follow scripts—they evaluate scenarios and make intelligent decisions about when human intervention is needed.
                </p>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Complex Scenario Management:</h3>
                  
                  <div className="space-y-6">
                    <div className="border-l-4 border-red-500 pl-6">
                      <h4 className="font-semibold text-red-700 mb-2">Emergency Situations</h4>
                      <p className="text-gray-700 mb-2">AI recognizes urgent keywords and emotional distress, immediately escalating while providing initial guidance.</p>
                      <p className="text-sm text-gray-600 italic">Example: "Water is pouring through my ceiling!" triggers emergency plumber dispatch and interim damage control advice.</p>
                    </div>
                    
                    <div className="border-l-4 border-yellow-500 pl-6">
                      <h4 className="font-semibold text-yellow-700 mb-2">Complaint Resolution</h4>
                      <p className="text-gray-700 mb-2">Sophisticated sentiment analysis detects frustration and routes to appropriate managers with context.</p>
                      <p className="text-sm text-gray-600 italic">Example: Customer mentions "third time calling about this issue" and gets priority routing to a senior technician.</p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-6">
                      <h4 className="font-semibold text-blue-700 mb-2">Technical Consultations</h4>
                      <p className="text-gray-700 mb-2">When requests exceed basic information sharing, AI seamlessly transitions to subject matter experts.</p>
                      <p className="text-sm text-gray-600 italic">Example: HVAC installation questions route to certified technicians while basic maintenance stays with AI.</p>
                    </div>
                  </div>
                </div>

                <p className="mb-6">
                  The escalation process is transparent and smooth. Customers aren't left feeling like they're bouncing between systems—instead, they experience a natural progression from AI assistance to human expertise when needed. The AI provides the human staff member with complete conversation context, so customers don't repeat themselves.
                </p>

                <p className="mb-6">
                  Studies show that <strong>customers prefer AI handling of routine tasks but want human interaction for complex problems</strong>. According to Zendesk research, 67% of customers appreciate AI efficiency for simple requests, but 89% want human escalation available for complicated issues. Modern AI receptionists nail this balance.
                </p>

                <blockquote className="border-l-4 border-green-500 pl-6 italic text-lg text-gray-700 mb-6">
                  "Our AI receptionist handles about 80% of calls completely, but the 20% that get escalated come to us with perfect context and preparation. It's like having the world's best note-taking assistant." - Sarah M., Dental Practice Manager
                </blockquote>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="real-time-learning-improvement" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Brain className="w-8 h-8 mr-3 text-blue-600" />
                  Real-Time Learning & Improvement
                </h2>

                <p className="mb-6">
                  Perhaps the most impressive aspect of modern AI receptionists is their ability to continuously learn and improve from every interaction. Unlike traditional phone systems that remain static, AI systems evolve with your business, becoming more effective over time.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-purple-600">Machine Learning Capabilities:</h3>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Pattern Recognition:</strong> Identifies common customer questions and optimizes responses</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Seasonal Adaptation:</strong> Adjusts to busy periods and service demand changes</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Language Evolution:</strong> Learns industry terms and local expressions</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Success Optimization:</strong> Refines strategies based on conversion rates</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-600">Continuous Improvement Areas:</h3>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Response Accuracy:</strong> Learns from corrections and feedback</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Call Resolution:</strong> Identifies what leads to satisfied customers</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Escalation Timing:</strong> Optimizes when to involve human staff</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                        <span><strong>Personalization:</strong> Tailors approach to individual customer preferences</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="mb-6">
                  This learning happens automatically and safely. The AI doesn't make radical changes that could disrupt your business—instead, it makes incremental improvements based on proven patterns. For example, if customers calling about heating repairs typically need same-day service, the AI learns to prioritize those scheduling requests.
                </p>

                <p className="mb-6">
                  The learning extends beyond individual businesses too. Leading AI platforms aggregate anonymized insights across similar businesses to improve performance industry-wide. A plumbing AI might benefit from patterns learned across hundreds of other plumbing businesses, while maintaining your specific business requirements.
                </p>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold text-blue-800 mb-3">Performance Metrics That Improve Over Time:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-semibold">Call Resolution Rate:</span>
                      <p className="text-gray-700">Typically improves from 70% to 90%+ within 3 months</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-semibold">Customer Satisfaction:</span>
                      <p className="text-gray-700">Consistently increases as AI learns preferences</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-semibold">Response Accuracy:</span>
                      <p className="text-gray-700">Reaches 95%+ accuracy for routine inquiries</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-semibold">Escalation Precision:</span>
                      <p className="text-gray-700">Reduces unnecessary escalations by 40-50%</p>
                    </div>
                  </div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <h2 id="boltcall-vs-traditional-systems" className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <Users className="w-8 h-8 mr-3 text-blue-600" />
                  Comparison: How Boltcall Works vs Traditional Systems
                </h2>

                <p className="mb-6">
                  To understand the true advantage of modern AI receptionist technology, it&apos;s helpful to compare how Boltcall&apos;s system works versus traditional alternatives. The differences go far beyond just &quot;robot vs human&quot;&mdash;they represent a fundamental shift in how businesses handle customer communication.
                </p>

              </motion.section>

            </div>
          </article>
        </div>
      </div>

      {/* CTA Section */}
      <motion.div
        className="py-20 bg-gray-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200">
              <Phone className="w-6 h-6 text-blue-500" />
            </div>
            <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
          <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Launch an AI agent in 5 minutes at no cost. Connect it to all your business channels.</p>
          <Link
            to="/setup"
            className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
          >
            Start the free setup
          </Link>
        </div>
      </motion.div>

      </main>

      {/* What This Tool Covers */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">How Boltcall Works for Your Business</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Everything included in Boltcall from day one of your setup</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'AI Voice Training', desc: 'Your receptionist is trained on your business name, services, and FAQs' },
            { label: '24/7 Call Answering', desc: 'Every inbound call answered in under 3 rings, any time of day' },
            { label: 'Live Calendar Booking', desc: 'Appointments booked directly into your scheduling system in real time' },
            { label: 'Instant SMS Follow-Up', desc: 'Automatic text to callers who request a callback or leave a message' },
            { label: 'No-Show Reminders', desc: 'Appointment reminder sequences that cut cancellation rates by 40%+' },
            { label: 'Google Review Automation', desc: 'Post-appointment requests that steadily build your star rating' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How AI Receptionist Works: Steps and Timeline */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">How Boltcall Works: Setup to Revenue Recovery</h2>
          <p className="text-gray-500 text-sm text-center mb-6">From signup to your first appointment booked — what happens at each stage</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Stage</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What Happens</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Who Does It</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Signup and onboarding', 'Enter your business name, services, hours, and FAQs', '10 minutes', 'You'],
                  ['Calendar connection', 'Connect Google Calendar, Calendly, or your booking software', '5 minutes', 'You'],
                  ['Phone number setup', 'Forward your line or get a new number — AI is live', '5 minutes', 'You + Boltcall'],
                  ['First call answered', 'AI greets caller in under 3 rings with your business name', 'Immediate', 'AI automatically'],
                  ['Appointment booked', 'Caller chooses time slot, confirmation sent by SMS', 'During the call', 'AI automatically'],
                  ['No-show reminder sent', 'Automated text 24h before appointment', 'Automated forever', 'AI automatically'],
                  ['Post-visit review request', 'SMS review request 2 hours after appointment', 'Automated forever', 'AI automatically'],
                  ['Monthly revenue report', 'Dashboard shows calls answered, bookings, revenue recovered', 'Monthly', 'Boltcall generates'],
                ].map(([stage, what, time, who]) => (
                  <tr key={stage} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{stage}</td>
                    <td className="px-4 py-3 text-gray-600">{what}</td>
                    <td className="px-4 py-3 text-gray-600">{time}</td>
                    <td className="px-4 py-3 text-gray-600">{who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default HowAiReceptionistWorks;
