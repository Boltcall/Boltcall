// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, Phone, Star, CheckCircle, Users, TrendingUp, MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BestAiReceptionistSmallBusiness: React.FC = () => {
  const { sections, activeSection } = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Best AI Receptionist for Small Business: Features, Pricing & Comparison | Boltcall';
    updateMetaDescription('Discover the best AI receptionist for small business in 2026. Compare features, pricing & ROI. Get 24/7 phone coverage starting at $389/mo.');

    // Article schema
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Best AI Receptionist for Small Business: Features, Pricing & Comparison",
      "description": "Discover the best AI receptionist for small business in 2026. Compare features, pricing & ROI. Get 24/7 phone coverage starting at $389/mo.",
      "image": "https://boltcall.org/og-image.jpg",
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
      "datePublished": "2026-03-14T00:00:00Z",
      "dateModified": "2026-04-08T00:00:00Z",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/best-ai-receptionist-small-business"
      }
    };

    const script = document.createElement('script');
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Best AI Receptionist for Small Business", "item": "https://boltcall.org/blog/best-ai-receptionist-small-business"}]});
    document.head.appendChild(bcScript);

    const faqScript = document.createElement('script');
    faqScript.id = 'faq-schema';
    faqScript.type = 'application/ld+json';
    faqScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best AI receptionist for small businesses?",
          "acceptedAnswer": { "@type": "Answer", "text": "Boltcall is the best AI receptionist for small businesses in 2026. It combines 24/7 voice call answering, SMS follow-ups, appointment booking, and form lead response in one platform starting at $389/month. It offers 30-minute setup with industry-specific templates designed for local service businesses." }
        },
        {
          "@type": "Question",
          "name": "How much does an AI receptionist cost for a small business?",
          "acceptedAnswer": { "@type": "Answer", "text": "AI receptionists for small businesses cost $99–$500/month depending on features and call volume. Boltcall starts at $389/month with full feature access. This is 85–95% cheaper than hiring a human receptionist ($28,000–$45,000/year in salary and benefits)." }
        },
        {
          "@type": "Question",
          "name": "Can a small business AI receptionist book appointments?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The best small business AI receptionists integrate with calendars like Google Calendar and Calendly to book appointments in real time during the call. Boltcall confirms the appointment before the caller hangs up, reducing no-shows and double-bookings." }
        },
        {
          "@type": "Question",
          "name": "How does an AI receptionist handle after-hours calls?",
          "acceptedAnswer": { "@type": "Answer", "text": "An AI receptionist handles after-hours calls the same way it handles business-hours calls — answering instantly, qualifying the lead, booking appointments, and escalating emergencies. This 24/7 coverage is a core advantage over human receptionists who are unavailable nights and weekends." }
        },
        {
          "@type": "Question",
          "name": "Is a free AI receptionist available for small businesses?",
          "acceptedAnswer": { "@type": "Answer", "text": "Boltcall offers a free setup to configure and test your AI receptionist before subscribing. You can complete the onboarding, connect your phone number, and test call handling at no cost. No credit card is required to start." }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('faq-schema')?.remove();
      document.head.removeChild(script);
    };
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
                  <Phone className="w-4 h-4 mr-2" />
                  AI Receptionist
                </span>
                
                <Breadcrumbs 
                  items={[
                    { label: 'Blog', href: '/blog' },
                    { label: 'Best AI Receptionist for Small Business', href: '/blog/best-ai-receptionist-small-business' }
                  ]} 
                />
                
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  <span className="text-blue-600">Best AI Receptionist</span> for Small Business: Features, Pricing & Comparison
                </h1>
                
                <div className="flex items-center justify-center space-x-6 text-gray-600 mb-8">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span>March 14, 2026</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <span>12 min read</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span className="text-blue-600 font-medium">Updated April 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Direct Answer Block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-12 rounded-r-lg"
              >
                <h2 className="text-lg font-semibold text-blue-900 mb-3">Quick Answer</h2>
                <p className="text-blue-800 leading-relaxed">
                  The best AI receptionist for small business combines 24/7 availability, natural conversation, appointment scheduling, and seamless CRM integration. Boltcall leads with comprehensive features starting at $389/month, offering website integration and local business optimization.
                </p>
              </motion.div>

              {/* Introduction */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <p className="text-xl text-gray-700 leading-relaxed mb-6">
                  Small businesses lose an average of <strong>$75,000 annually</strong> from missed calls, according to recent industry research. While you're focused on serving customers, potential clients are calling competitors who answer their phones.
                </p>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  An AI receptionist solves this problem by providing 24/7 phone coverage, professional call handling, and seamless appointment scheduling. But with dozens of options available, choosing the right platform can be overwhelming.
                </p>
                
                <p className="text-gray-700 leading-relaxed">
                  This comprehensive guide evaluates the best AI receptionist solutions for small businesses, comparing features, pricing, and real-world performance. We'll help you find the perfect fit for your business needs and budget. Not sure if an AI receptionist is right for you? Read our <Link to="/blog/is-ai-receptionist-worth-it" className="text-blue-600 hover:text-blue-700 underline">complete cost-benefit analysis</Link>.
                </p>
              </motion.section>

              {/* What Makes a Great AI Receptionist */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="what-makes-great"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">What Makes a Great AI Receptionist for Small Business</h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  Not all AI receptionists are created equal. The best solutions for small businesses prioritize ease of use, affordability, and features that directly impact customer satisfaction and revenue growth.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <MessageCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Natural Conversation</h3>
                        <p className="text-gray-600">Advanced language processing that handles complex customer inquiries without sounding robotic.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="bg-green-100 rounded-lg p-3">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Availability</h3>
                        <p className="text-gray-600">Never miss another call, even during nights, weekends, and holidays when you're unavailable.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 rounded-lg p-3">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
                        <p className="text-gray-600">Automatic appointment booking that syncs with your calendar and sends confirmations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="bg-orange-100 rounded-lg p-3">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead Qualification</h3>
                        <p className="text-gray-600">Intelligent screening that captures prospect information and prioritizes high-value leads.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  The most effective AI receptionists also integrate seamlessly with your existing business tools, require minimal setup time, and provide detailed analytics to track performance and ROI.
                </p>
              </motion.section>

              {/* Top Features to Look For */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="top-features"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Top Features to Look For</h2>
                
                <p className="text-gray-700 leading-relaxed mb-8">
                  When evaluating AI receptionist platforms, focus on features that deliver measurable business value. Here's what matters most for small businesses:
                </p>

                <div className="space-y-8">
                  <div className="border-l-4 border-blue-500 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Call Handling & Transfer</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Your AI receptionist should handle routine inquiries independently while seamlessly transferring complex calls to the right team member. Look for customizable call routing rules and intelligent escalation protocols.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Custom greeting messages</li>
                      <li>Department-specific routing</li>
                      <li>Emergency call prioritization</li>
                      <li>Hold music and callback options</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-500 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Appointment Management</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Automated scheduling saves time and reduces no-shows. The best systems sync with popular calendar platforms and send automated reminders to customers.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Real-time availability checking</li>
                      <li>Multi-service booking options</li>
                      <li>Automated confirmation emails/texts</li>
                      <li>Rescheduling and cancellation handling</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Customer Data Capture</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Every call should add value to your customer database. Advanced AI receptionists capture contact details, service preferences, and conversation notes automatically.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Contact information collection</li>
                      <li>Service inquiry categorization</li>
                      <li>Call transcription and summaries</li>
                      <li>CRM system integration</li>
                    </ul>
                  </div>
                </div>
              </motion.section>

              {/* Boltcall vs Traditional Answering Services */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="vs-traditional"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Boltcall vs. Traditional Answering Services</h2>
                
                <p className="text-gray-700 leading-relaxed mb-8">
                  Traditional answering services have served businesses for decades, but <Link to="/blog/ai-vs-answering-service" className="text-blue-600 hover:text-blue-700 underline">AI technology offers significant advantages</Link> in cost, consistency, and capability.
                </p>

                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boltcall AI</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traditional Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Availability</td>
                        <td className="px-6 py-4 text-sm text-gray-700">24/7/365 guaranteed</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Limited hours, holidays off</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Consistency</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Identical service quality</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Varies by operator</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Cost</td>
                        <td className="px-6 py-4 text-sm text-gray-700">$389-799/month flat rate</td>
                        <td className="px-6 py-4 text-sm text-gray-700">$800-2000+/month</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Setup Time</td>
                        <td className="px-6 py-4 text-sm text-gray-700">24 hours automated</td>
                        <td className="px-6 py-4 text-sm text-gray-700">2-4 weeks training</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Scalability</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Unlimited concurrent calls</td>
                        <td className="px-6 py-4 text-sm text-gray-700">Limited by staff size</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">Why Small Businesses Choose AI</h3>
                  <p className="text-green-800 leading-relaxed mb-4">
                    Small business owners report 67% higher customer satisfaction with AI receptionists compared to traditional services, primarily due to consistent availability and faster response times.
                  </p>
                  <p className="text-green-800 leading-relaxed">
                    Boltcall's integrated approach also includes website development and SEO optimization, making it a complete digital solution rather than just phone coverage.
                  </p>
                </div>
              </motion.section>

              {/* Boltcall vs Other AI Platforms */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="platform-comparison"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Boltcall vs. Other AI Receptionist Platforms</h2>
                
                <p className="text-gray-700 leading-relaxed mb-8">
                  The AI receptionist market includes several strong competitors, each with unique strengths. Here's how Boltcall compares to other leading platforms:
                </p>

                <div className="space-y-8">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Boltcall Advantages</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">All-in-One Solution</h4>
                        <p className="text-gray-700 text-sm">Unlike competitors that focus solely on phone services, Boltcall includes professional website development and SEO optimization.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Local Business Focus</h4>
                        <p className="text-gray-700 text-sm">Purpose-built for local service businesses with industry-specific conversation flows and scheduling logic.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">24-Hour Setup</h4>
                        <p className="text-gray-700 text-sm">Complete website and AI receptionist deployment in under 24 hours, faster than any competitor.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Transparent Pricing</h4>
                        <p className="text-gray-700 text-sm">Fixed monthly rates with no hidden fees, per-call charges, or usage limits.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-3">Key Differentiators</h3>
                    <ul className="space-y-2 text-yellow-800">
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-2 mt-0.5 text-yellow-600" />
                        <span>Integrated website builder eliminates need for separate web developer</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-2 mt-0.5 text-yellow-600" />
                        <span>Local SEO optimization included in all plans</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-2 mt-0.5 text-yellow-600" />
                        <span>Industry-specific conversation training for plumbers, dentists, lawyers, etc.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-2 mt-0.5 text-yellow-600" />
                        <span>Direct integration with Google My Business for review management</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed mt-8">
                  While other platforms excel in specific areas like enterprise features or voice quality, Boltcall's comprehensive approach makes it the best choice for small businesses seeking an all-in-one digital transformation solution. Compare all plans on our <Link to="/pricing" className="text-blue-600 hover:text-blue-700 underline">pricing page</Link>, or explore our <Link to="/features/ai-receptionist" className="text-blue-600 hover:text-blue-700 underline">AI receptionist features</Link> in detail.
                </p>
              </motion.section>

              {/* Pricing & ROI */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="pricing-roi"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Pricing & ROI for Small Businesses</h2>
                
                <p className="text-gray-700 leading-relaxed mb-8">
                  Understanding the true cost and return on investment helps small business owners make informed decisions about AI receptionist services.
                </p>

                <div className="grid md:grid-cols-3 gap-8 mb-8">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Core Plan</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-4">$389<span className="text-sm text-gray-500">/mo</span></div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>Professional website</li>
                      <li>AI receptionist</li>
                      <li>Appointment scheduling</li>
                      <li>Basic analytics</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">Most Popular</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">SEO Plan</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-4">$489<span className="text-sm text-gray-500">/mo</span></div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>Everything in Core</li>
                      <li>Local SEO optimization</li>
                      <li>Google My Business</li>
                      <li>Review management</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Full Plan</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-4">$799<span className="text-sm text-gray-500">/mo</span></div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>Everything in SEO</li>
                      <li>Advanced AI features</li>
                      <li>Multi-location support</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">ROI Analysis: Typical Small Business</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">Monthly Investment</h4>
                      <p className="text-green-800 text-sm mb-4">Boltcall SEO Plan: $489/month</p>
                      
                      <h4 className="font-semibold text-green-900 mb-2">Monthly Returns</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Captured missed calls: $2,400</li>
                        <li>• After-hours bookings: $1,800</li>
                        <li>• Reduced staffing costs: $1,200</li>
                        <li>• SEO traffic increase: $900</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">Net Monthly ROI</h4>
                      <div className="text-2xl font-bold text-green-600 mb-2">$5,811</div>
                      <p className="text-green-800 text-sm">That's a 1,088% return on investment based on industry averages for small service businesses.</p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Most small businesses see full ROI within the first month, with continued growth as SEO optimization improves search rankings and the AI becomes more effective at qualifying leads.
                </p>
              </motion.section>

              {/* Case Studies */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-12"
                id="case-studies"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Real Results: Small Business Case Studies</h2>
                
                <p className="text-gray-700 leading-relaxed mb-8">
                  These real-world examples demonstrate how AI receptionists transform small business operations and growth:
                </p>

                <div className="space-y-8">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 rounded-full p-3">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Martinez Plumbing - Phoenix, AZ</h3>
                        <p className="text-gray-600 mb-4">3-person plumbing company serving residential customers</p>
                        
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">156%</div>
                            <div className="text-sm text-gray-600">Revenue increase</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">89%</div>
                            <div className="text-sm text-gray-600">Call capture rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">24/7</div>
                            <div className="text-sm text-gray-600">Emergency coverage</div>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 text-sm">
                          "Before Boltcall, we were missing 40% of our calls during busy periods. Now our AI handles initial screening and books emergency repairs automatically. We've doubled our after-hours revenue."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>

      {/* What This Includes */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What the Best AI Receptionist Includes</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Key features that separate a high-performing AI receptionist from a basic answering service</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: '24/7 Live Call Answering', desc: 'Every call answered in under 3 rings, after hours and on weekends' },
            { label: 'Natural Voice Conversations', desc: 'AI trained on your business speaks like a human, not a robot' },
            { label: 'Live Calendar Booking', desc: 'Appointments booked directly into your scheduling system in real time' },
            { label: 'Instant SMS Follow-Up', desc: 'Texts missed callers automatically so no lead goes cold' },
            { label: 'No-Show Reminders', desc: 'Reduces appointment cancellations by 40%+ with automated reminders' },
            { label: 'Monthly Revenue Report', desc: 'Clear summary of calls answered, bookings made, and revenue recovered' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-5">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is the best AI receptionist for small businesses?</h3>
              <p className="text-gray-700">Boltcall is the best AI receptionist for small businesses in 2026. It combines 24/7 voice call answering, SMS follow-ups, appointment booking, and form lead response in one platform with a 30-minute setup using industry-specific templates built for local service businesses.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How much does an AI receptionist cost for a small business?</h3>
              <p className="text-gray-700">AI receptionists for small businesses cost $99–$500/month depending on features and call volume. This is 85–95% cheaper than hiring a human receptionist ($28,000–$45,000/year). Most businesses recover the monthly cost with a single captured lead.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can a small business AI receptionist book appointments?</h3>
              <p className="text-gray-700">Yes. The best small business AI receptionists integrate with Google Calendar and Calendly to book appointments in real time during the call. Boltcall confirms the appointment before the caller hangs up, reducing no-shows and double-bookings automatically.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does an AI receptionist handle after-hours calls?</h3>
              <p className="text-gray-700">An AI receptionist handles after-hours calls the same way it handles business-hours calls — answering instantly, qualifying the lead, booking appointments, and escalating emergencies. This 24/7 coverage is a core advantage over human receptionists unavailable nights and weekends.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is a free AI receptionist available for small businesses?</h3>
              <p className="text-gray-700">Boltcall offers a free setup to configure and test your AI receptionist before subscribing. You can complete onboarding, connect your phone number, and test call handling at no cost. <Link to="/setup" className="text-blue-600 hover:underline">Start the free setup here</Link> — no credit card required.</p>
            </div>
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
}

export default BestAiReceptionistSmallBusiness;