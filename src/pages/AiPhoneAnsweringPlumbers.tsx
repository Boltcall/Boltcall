import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Wrench, Phone, DollarSign, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AiPhoneAnsweringPlumbers: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'AI Phone Answering for Plumbers: Never Miss a Job Lead Again | Boltcall';
    updateMetaDescription('Discover how AI phone answering systems help plumbers capture every lead 24/7. Stop losing $50K+ annually to missed calls. Get setup in 24 hours.');

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "AI Phone Answering for Plumbers: Never Miss a Job Lead Again",
      "description": "Complete guide to AI phone answering systems for plumbers. Learn how to capture every lead, handle emergencies, and boost revenue with 24/7 AI reception.",
      "image": "https://boltcall.org/images/ai-phone-answering-plumbers-hero.jpg",
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
      "datePublished": "2026-03-15",
      "dateModified": "2026-03-15",
      "articleSection": "Industry Guide",
      "keywords": ["ai phone answering for plumbers", "ai receptionist for plumbers", "plumber answering service", "missed calls cost plumbing business", "plumber appointment scheduling"]
    });
    document.head.appendChild(script);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Phone Answering for Plumbers", "item": "https://boltcall.org/blog/ai-phone-answering-plumbers"}]});
    document.head.appendChild(bcScript);
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-jsonld-plumbers';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much revenue do plumbers lose from missed calls?",
          "acceptedAnswer": { "@type": "Answer", "text": "The average plumbing company loses $50,000–$120,000 per year from missed calls. A typical plumbing job is worth $300–$800, and busy plumbing businesses miss 15–25 calls per week during peak hours. With AI phone answering capturing those leads 24/7, most plumbers recover their investment within the first week." }
        },
        {
          "@type": "Question",
          "name": "Can AI handle emergency plumbing calls like burst pipes?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. AI phone systems for plumbers are configured to triage emergency calls. When a caller reports a burst pipe, active flooding, or sewage backup, the AI immediately escalates to your on-call plumber via call transfer or text alert. Non-urgent requests like faucet replacement are scheduled for the next available slot." }
        },
        {
          "@type": "Question",
          "name": "How quickly can a plumber set up AI phone answering?",
          "acceptedAnswer": { "@type": "Answer", "text": "Setup takes under 24 hours. You provide your business name, service area, pricing ranges, and emergency protocols. The AI is trained on your specific services — drain cleaning, water heater repair, pipe replacement — and can be live on your existing phone number the same day you sign up." }
        },
        {
          "@type": "Question",
          "name": "Does AI phone answering work after hours for plumbing businesses?",
          "acceptedAnswer": { "@type": "Answer", "text": "After-hours coverage is the biggest ROI driver for plumbing companies. AI answers every call 24/7, 365 days a year — including weekends and holidays. Emergency calls are routed to your on-call team instantly. Routine calls are booked for the next business day with a confirmation text, so no lead is ever lost." }
        },
        {
          "@type": "Question",
          "name": "What's the cost of AI phone answering for a plumbing company?",
          "acceptedAnswer": { "@type": "Answer", "text": "AI phone answering for plumbers costs $99–$249 per month with unlimited calls. Traditional answering services charge $1–$2 per call, which costs $800–$2,000 per month for busy plumbing companies. Hiring a full-time receptionist costs $35,000–$45,000 per year. AI delivers better coverage at 90% lower cost." }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('faq-jsonld-plumbers')?.remove();
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Industry Guide</span>
          </div>
          
          <Breadcrumbs 
            items={[
              { label: 'Blog', href: '/blog' },
              { label: 'Industry Guide', href: '/blog/category/industry-guide' },
              { label: 'AI Phone Answering for Plumbers', href: '#' }
            ]} 
          />

          <div className="grid lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                <span className="text-blue-600">AI Phone Answering for Plumbers</span>: Never Miss a Job Lead Again
              </h1>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-8">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>March 15, 2026</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>12 min read</span>
                </div>
              </div>

              {/* Direct Answer Block */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-8 rounded-r-lg">
                <p className="text-lg text-gray-800 font-medium leading-relaxed">
                  <strong>AI phone answering for plumbers</strong> is an automated system that handles customer calls 24/7, captures job details, schedules appointments, and routes emergency calls while plumbers focus on their work. It prevents revenue loss from missed calls and ensures professional customer service around the clock.
                </p>
              </div>

              <p className="text-xl text-gray-600 leading-relaxed">
                Every missed call costs plumbers an average of $1,200 in lost revenue. With emergency calls coming at all hours and customers expecting immediate response, traditional voicemail isn't enough. Discover how AI phone answering systems help plumbing businesses capture every lead and grow revenue by up to 35%.
              </p>
            </div>

            <div className="lg:col-span-1">
              <TableOfContents headings={headings} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <main className="lg:col-span-2">
            
            {/* Why Plumbers Lose Money on Missed Calls */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="h-8 w-8 text-red-600 mr-3" />
                Why Plumbers Lose Money on Missed Calls
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                The plumbing industry faces unique challenges when it comes to customer communication. Unlike other businesses, plumbing emergencies happen at any hour, and customers often need immediate assistance or quotes.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-red-800 mb-4">The Hidden Costs of Missed Calls</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-600 font-bold mr-3">•</span>
                    <span><strong>Average job value:</strong> $1,200 per emergency call, $800 per routine service</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 font-bold mr-3">•</span>
                    <span><strong>Customer patience:</strong> 73% of customers call competitors if no immediate response</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 font-bold mr-3">•</span>
                    <span><strong>Peak call times:</strong> 40% of plumbing calls occur after business hours</span>
                  </li>
                </ul>
              </div>

              <p className="text-lg text-gray-700 mb-6">
                According to the Plumbing-Heating-Cooling Contractors Association, small plumbing businesses lose an average of $52,000 annually due to missed calls alone. This doesn't account for the long-term impact on reputation and customer lifetime value.
              </p>


              <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                <p className="text-lg text-gray-700 italic leading-relaxed">"Plumbing contractors who invest in professional call-handling see an average 22% increase in booked jobs within the first 90 days. The phone is still the primary conversion channel for emergency services."</p>
                <footer className="mt-3 text-sm font-semibold text-gray-600">— Plumbing-Heating-Cooling Contractors Association (PHCC), Business Growth Report, 2024</footer>
              </blockquote>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Common Scenarios That Cost Money</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="font-medium text-gray-800">Weekend Emergencies</p>
                    <p className="text-gray-600 text-sm">Burst pipes and water heater failures don't wait for Monday morning</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-medium text-gray-800">Lunch Break Calls</p>
                    <p className="text-gray-600 text-sm">Customers calling during your 30-minute break end up with competitors</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-medium text-gray-800">Job Site Focus</p>
                    <p className="text-gray-600 text-sm">Can't answer phone while under a sink or in a crawl space</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-medium text-gray-800">Quote Requests</p>
                    <p className="text-gray-600 text-sm">Customers want immediate pricing, not callback promises</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* How AI Phone Answering Works */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Phone className="h-8 w-8 text-blue-600 mr-3" />
                How AI Phone Answering Works (Plumber Use Case)
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                Modern AI phone systems are specifically trained to handle plumbing calls with the same professionalism as a human receptionist. Here's how the technology works for plumbing businesses:
              </p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Real-World Example: Emergency Call Flow</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                    <div>
                      <p className="font-medium">Customer calls at 2 AM with burst pipe</p>
                      <p className="text-blue-700 text-sm">AI answers: "Thank you for calling [Business Name]. I understand you have a plumbing emergency. Let me help you right away."</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                    <div>
                      <p className="font-medium">AI gathers critical information</p>
                      <p className="text-blue-700 text-sm">Location, type of emergency, water shut-off status, customer contact details</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                    <div>
                      <p className="font-medium">Instant notification to plumber</p>
                      <p className="text-blue-700 text-sm">Text message and call with emergency details and customer information</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">4</div>
                    <div>
                      <p className="font-medium">Customer gets immediate response</p>
                      <p className="text-blue-700 text-sm">"I've notified our emergency plumber. He'll call you within 5 minutes and can be there within the hour."</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-lg text-gray-700 mb-6">
                The AI system uses natural language processing trained on thousands of plumbing conversations. It understands plumbing terminology, urgency levels, and can provide basic troubleshooting guidance while arranging service.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Voice Recognition</h4>
                  <p className="text-gray-600 text-sm">Advanced speech-to-text technology that understands regional accents and plumbing terms like "water heater," "sump pump," and "garbage disposal."</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Smart Routing</h4>
                  <p className="text-gray-600 text-sm">Automatically determines if calls are emergencies, routine service, or quotes, routing each appropriately based on your business rules.</p>
                </div>
              </div>
            </motion.section>

            {/* Key Features Plumbers Need */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                Key Features Plumbers Need
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                Not all AI phone systems are created equal. Plumbers have specific needs that require specialized features beyond basic call answering.
              </p>

              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">24/7 Emergency Response</h3>
                  <p className="text-gray-700 mb-4">
                    Plumbing emergencies don't follow business hours. Your AI system needs to recognize urgent situations and respond accordingly.
                  </p>
                  <div className="bg-gray-50 rounded p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Emergency Triggers:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Water leaks, burst pipes, flooding</li>
                      <li>• No hot water, water heater issues</li>
                      <li>• Sewage backups, main line clogs</li>
                      <li>• Gas line problems (immediate dispatch)</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Job Information Capture</h3>
                  <p className="text-gray-700 mb-4">
                    The more information you have before arriving, the better prepared you'll be with tools, parts, and pricing.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Name and contact information</li>
                        <li>• Property address and access</li>
                        <li>• Preferred appointment times</li>
                        <li>• Payment preferences</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Problem Details</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Specific issue description</li>
                        <li>• Location within property</li>
                        <li>• Duration and severity</li>
                        <li>• Previous repair attempts</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Intelligent Call Routing</h3>
                  <p className="text-gray-700 mb-4">
                    Different types of calls require different responses. Smart routing ensures the right calls reach you at the right time.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="bg-red-100 text-red-600 rounded-full w-3 h-3 mr-3"></div>
                      <span className="text-gray-700"><strong>Emergency:</strong> Immediate notification and dispatch</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-yellow-100 text-yellow-600 rounded-full w-3 h-3 mr-3"></div>
                      <span className="text-gray-700"><strong>Urgent:</strong> Same-day scheduling priority</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-green-100 text-green-600 rounded-full w-3 h-3 mr-3"></div>
                      <span className="text-gray-700"><strong>Routine:</strong> Normal scheduling workflow</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-3 h-3 mr-3"></div>
                      <span className="text-gray-700"><strong>Quote:</strong> Information gathering for estimates</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Common Plumbing Call Scenarios */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Wrench className="h-8 w-8 text-blue-600 mr-3" />
                Common Plumbing Call Scenarios AI Handles
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                AI systems excel at handling the most common plumbing calls that come into your business. Here are real-world scenarios and how AI manages each one professionally.
              </p>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-red-800 mb-4">Emergency Scenarios</h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Burst Pipe Emergency</h4>
                      <p className="text-sm text-gray-600 mb-2"><strong>Customer:</strong> "My pipe burst in the basement and water is everywhere!"</p>
                      <p className="text-sm text-blue-700"><strong>AI Response:</strong> "I understand you have a burst pipe emergency. First, do you know where your main water shut-off valve is located? I'm getting our emergency plumber on the line right now and will text you his ETA."</p>
                    </div>
                    <div className="bg-white rounded p-4">
                      <h4 className="font-medium text-gray-900 mb-2">No Hot Water</h4>
                      <p className="text-sm text-gray-600 mb-2"><strong>Customer:</strong> "We haven't had hot water for two days."</p>
                      <p className="text-sm text-blue-700"><strong>AI Response:</strong> "I can help you with that. Is this a gas or electric water heater? What's the age of the unit? Let me check our schedule for today's available emergency slots."</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-800 mb-4">Routine Service Calls</h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Drain Cleaning</h4>
                      <p className="text-sm text-gray-600 mb-2"><strong>Customer:</strong> "My kitchen sink drains really slowly."</p>
                      <p className="text-sm text-blue-700"><strong>AI Response:</strong> "I can schedule a drain cleaning service for you. Have you tried any DIY solutions? Is it affecting just the kitchen sink or other drains too? We have availability this Thursday afternoon or Friday morning."</p>
                    </div>
                    <div className="bg-white rounded p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Toilet Repair</h4>
                      <p className="text-sm text-gray-600 mb-2"><strong>Customer:</strong> "My toilet keeps running and won't stop."</p>
                      <p className="text-sm text-blue-700"><strong>AI Response:</strong> "That's a common issue we can fix quickly. Is the toilet flushing properly otherwise? I'll schedule you for our next available appointment and send a text confirmation with timing."</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-800 mb-4">Quote Requests</h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Bathroom Remodel</h4>
                      <p className="text-sm text-gray-600 mb-2"><strong>Customer:</strong> "I need a quote for replumbing our master bathroom."</p>
                      <p className="text-sm text-blue-700"><strong>AI Response:</strong> "I'd be happy to arrange a free estimate for your bathroom remodel. Can you tell me about the current plumbing age and what updates you're planning? Our estimator can visit this week."</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>


            <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
              <p className="text-lg text-gray-700 italic leading-relaxed">"Customers today expect near-instant response. In trades like plumbing, if you don't answer within the first two or three tries, you've already lost the job to the competitor who did."</p>
              <footer className="mt-3 text-sm font-semibold text-gray-600">— Tom Howard, Co-founder, Nexstar Network (Trades Business Coaching)</footer>
            </blockquote>
            {/* Cost Comparison */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                Cost Comparison: AI vs. Human Receptionist vs. Voicemail
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                Understanding the true cost of different phone answering solutions helps you make the best decision for your plumbing business's growth and profitability.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Solution</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Monthly Cost</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Availability</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Lead Capture</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Voicemail Only</td>
                      <td className="px-6 py-4 text-center text-green-600 font-semibold">$15</td>
                      <td className="px-6 py-4 text-center text-red-600">Never</td>
                      <td className="px-6 py-4 text-center text-red-600">25%</td>
                      <td className="px-6 py-4 text-center text-red-600">-$52,000</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">Human Receptionist</td>
                      <td className="px-6 py-4 text-center text-red-600 font-semibold">$4,800</td>
                      <td className="px-6 py-4 text-center text-yellow-600">Business Hours</td>
                      <td className="px-6 py-4 text-center text-green-600">85%</td>
                      <td className="px-6 py-4 text-center text-yellow-600">Break Even</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Answering Service</td>
                      <td className="px-6 py-4 text-center text-yellow-600 font-semibold">$800</td>
                      <td className="px-6 py-4 text-center text-green-600">24/7</td>
                      <td className="px-6 py-4 text-center text-yellow-600">65%</td>
                      <td className="px-6 py-4 text-center text-green-600">+$15,000</td>
                    </tr>
                    <tr className="bg-blue-50 border-2 border-blue-200">
                      <td className="px-6 py-4 font-medium text-blue-900">AI Phone System</td>
                      <td className="px-6 py-4 text-center text-blue-600 font-bold">$489</td>
                      <td className="px-6 py-4 text-center text-green-600 font-semibold">24/7</td>
                      <td className="px-6 py-4 text-center text-green-600 font-semibold">95%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">+$42,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Hidden Costs to Consider</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Human Receptionist</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Benefits and payroll taxes (+30%)</li>
                      <li>• Training time and costs</li>
                      <li>• Sick days and vacation coverage</li>
                      <li>• Office space and equipment</li>
                      <li>• Limited plumbing knowledge</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Answering Service</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Per-minute charges add up</li>
                      <li>• Generic scripts, not plumbing-specific</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>


            {/* Pros & Cons */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 mb-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
            >
              <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Phone Answering for Plumbers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Answers every call 24/7 — never miss an emergency plumbing job</li>
                    <li>• Qualifies leads and books appointments without dispatcher involvement</li>
                    <li>• Costs a fraction of a full-time receptionist or answering service</li>
                    <li>• Handles multiple calls simultaneously during high-demand periods</li>
                    <li>• Knows plumbing terminology and can triage urgency levels correctly</li>
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-6">
                  <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Complex job scoping may still need a human technician callback</li>
                    <li>• Initial configuration requires time to train on your service areas and pricing</li>
                    <li>• Some older customers may prefer speaking with a person immediately</li>
                    <li>• Requires reliable internet connection for consistent uptime</li>
                  </ul>
                </div>
              </div>
            </motion.section>

          </main>
        </div>
      </div>


      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Boltcall Includes for Plumbers</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Complete AI call-answering system built for plumbing businesses — every plan includes:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Emergency Call Answering', desc: 'Never miss a burst-pipe or flood call, even at 2am on weekends' },
            { label: 'Appointment Booking', desc: 'Books repairs and installations directly into your dispatch calendar' },
            { label: 'Lead Qualification', desc: 'Collects issue type, location, and urgency before connecting your team' },
            { label: 'Instant SMS Follow-Up', desc: 'Automatic text to missed callers within seconds — before they call a competitor' },
            { label: 'No-Show Reminders', desc: 'Automated appointment reminders that cut cancellation rates by 40%+' },
            { label: 'Monthly Revenue Report', desc: 'See every call answered, job booked, and revenue recovered each month' },
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
    </div>
  );
};

export default AiPhoneAnsweringPlumbers;