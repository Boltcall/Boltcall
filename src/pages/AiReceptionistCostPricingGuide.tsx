// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, DollarSign, Calculator, TrendingUp, Phone, Users, Shield } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const AiReceptionistCostPricingGuide: React.FC = () => {
  const headings = useTableOfContents();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "How Much Does an AI Receptionist Cost? 2024 Pricing Guide";
    updateMetaDescription("Learn AI receptionist pricing models, compare costs vs traditional services, and find the best value for your local business in 2024.");

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How Much Does an AI Receptionist Cost? 2024 Pricing Guide for Local Businesses",
      "description": "Complete guide to AI receptionist pricing models, cost comparisons, and ROI calculations for local businesses in 2024.",
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
      "datePublished": "2026-03-10",
      "dateModified": "2026-03-10",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "url": "https://boltcall.org/blog/ai-receptionist-cost-pricing",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/ai-receptionist-cost-pricing"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "AI Receptionist Cost & Pricing Guide", "item": "https://boltcall.org/blog/ai-receptionist-cost-pricing-guide"}]});
    document.head.appendChild(bcScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-jsonld';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does an AI receptionist cost per month?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI receptionist services cost between $49 and $500+/month depending on call volume and features. Entry-level plans like Boltcall start at $79/month for unlimited calls. Premium plans with advanced integrations run $199–$499/month. All plans are dramatically cheaper than a human receptionist at $3,200–$4,500/month."
          }
        },
        {
          "@type": "Question",
          "name": "Are there any hidden fees with AI receptionist services?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Reputable AI receptionist services like Boltcall have transparent flat-rate pricing with no per-minute fees or hidden charges. Some services charge extra for SMS, integrations, or after-hours calls—always check if call minutes are unlimited and if CRM integrations are included in the base price."
          }
        },
        {
          "@type": "Question",
          "name": "What is included in an AI receptionist subscription?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A standard AI receptionist subscription includes 24/7 call answering, appointment scheduling, lead capture, voicemail transcription, and basic CRM integration. Premium plans add multi-location support, advanced analytics, custom voice training, and priority routing. Boltcall includes automated follow-up texts in all plans."
          }
        },
        {
          "@type": "Question",
          "name": "How does AI receptionist pricing compare to hiring a part-time receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A part-time receptionist (20 hrs/week) costs $1,600–$2,200/month plus benefits—and only works scheduled hours. An AI receptionist costs $79–$299/month and works 24/7 with no sick days, vacation, or turnover. The total cost difference over one year is typically $15,000–$20,000 in favor of AI."
          }
        }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('faq-jsonld')?.remove();
      document.head.removeChild(script);
      speakableScript.remove();
    };
  }, []);

  const tocItems = [
    { id: 'what-is-ai-receptionist', title: 'What is an AI Receptionist and Why Cost Matters' },
    { id: 'pricing-models', title: 'How AI Receptionist Pricing Works' },
    { id: 'boltcall-pricing', title: 'Boltcall Pricing Breakdown vs Competitors' },
    { id: 'ai-vs-traditional', title: 'AI Receptionist Cost vs Traditional Services' },
    { id: 'roi-calculation', title: 'Real ROI: How Quickly AI Receptionists Pay for Themselves' },
    { id: 'hidden-costs', title: 'Hidden Costs to Watch Out For' },
    { id: 'best-value-businesses', title: 'Which Local Businesses Get the Best Value' },
    { id: 'choosing-budget', title: 'How to Choose the Right AI Receptionist for Your Budget' },
    { id: 'faq', title: 'Frequently Asked Questions' }
  ];

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      <main className="flex-grow bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-6">
                <DollarSign className="h-4 w-4 mr-2" />
                AI Receptionist
              </div>
              
              <Breadcrumbs 
                items={[
                  { label: 'Blog', href: '/blog' },
                  { label: 'AI Receptionist', href: '/blog/category/ai-receptionist' },
                  { label: 'Pricing Guide' }
                ]} 
              />
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">How Much Does an AI Receptionist Cost?</span> 2024 Pricing Guide for Local Businesses
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Everything you need to know about AI receptionist pricing models, cost comparisons, and finding the best value for your business.
              </p>
              
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  March 10, 2026
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  12 min read
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Direct Answer Block */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-12">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Quick Answer</h3>
                  <p className="speakable-intro text-gray-700">
                    AI receptionist pricing typically ranges from $200-$800 per month, depending on features and call volume. Most small businesses pay between $300-$500 monthly for comprehensive AI phone answering services with unlimited calls.
                  </p>
                </div>

                {/* Section 1 */}
                <motion.section
                  id="what-is-ai-receptionist"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">What is an AI Receptionist and Why Cost Matters</h2>
                  
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                    An AI receptionist is a virtual assistant powered by artificial intelligence that handles phone calls, schedules appointments, answers questions, and manages customer interactions 24/7. For local businesses, understanding AI receptionist costs is crucial because it directly impacts your bottom line and customer service quality.
                  </p>
                  
                  <p className="text-gray-600 mb-6">
                    According to a recent study by <a href="https://smallbiztrends.com" className="text-blue-600 hover:underline">Small Business Trends</a>, 67% of small businesses lose potential customers due to missed calls during business hours. Traditional receptionists cost an average of $35,000-$45,000 annually in salary alone, not including benefits, training, and time off coverage.
                  </p>
                  
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Cost Factors to Consider:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Monthly subscription fees and pricing models</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Setup and implementation costs</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Integration with existing systems</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Training and customization requirements</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Ongoing support and maintenance</span>
                      </li>
                    </ul>
                  </div>
                </motion.section>

                <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                  <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;The single most important question a small business owner should ask before hiring a human receptionist is: how many leads are we missing every week because no one answers the phone? For most, the answer is shocking &mdash; and it makes the AI receptionist ROI calculation simple.&rdquo;</p>
                  <footer className="mt-3 text-sm font-semibold text-gray-600">— Jay Abraham, Marketing Strategist &amp; Author, <em>Getting Everything You Can Out of All You've Got</em></footer>
                </blockquote>

                {/* Section 2 */}
                <motion.section
                  id="pricing-models"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">How AI Receptionist Pricing Works (Per-Minute vs Flat-Fee Models)</h2>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    Understanding different pricing models helps you choose the most cost-effective option for your business volume and needs.
                  </p>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <Clock className="h-8 w-8 text-blue-500 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">Per-Minute Pricing</h3>
                      </div>
                      <p className="text-gray-600 mb-4">
                        You pay only for actual call time, typically ranging from $0.10 to $0.50 per minute.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-green-600 font-medium">✓ Good for low-volume businesses</p>
                        <p className="text-sm text-green-600 font-medium">✓ Predictable costs based on usage</p>
                        <p className="text-sm text-red-600 font-medium">✗ Can be expensive for busy practices</p>
                        <p className="text-sm text-red-600 font-medium">✗ Harder to budget monthly expenses</p>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <DollarSign className="h-8 w-8 text-blue-500 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">Flat-Fee Pricing</h3>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Fixed monthly fee for unlimited calls, typically $200-$800 per month.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-green-600 font-medium">✓ Predictable monthly budgeting</p>
                        <p className="text-sm text-green-600 font-medium">✓ Better value for high-volume businesses</p>
                        <p className="text-sm text-green-600 font-medium">✓ No overage charges</p>
                        <p className="text-sm text-red-600 font-medium">✗ May pay for unused capacity</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-800 mb-2">Pro Tip:</h4>
                    <p className="text-yellow-700">
                      Most successful local businesses prefer flat-fee models for budgeting predictability. If you receive more than 100 minutes of calls per month, flat-fee pricing typically offers better value.
                    </p>
                  </div>
                </motion.section>

                {/* Section 3 */}
                <motion.section
                  id="boltcall-pricing"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Boltcall Pricing Breakdown vs Competitors</h2>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    Here's how Boltcall's pricing compares to other AI receptionist services in the market:
                  </p>

                  <div className="overflow-x-auto mb-8">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Provider</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Starting Price</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Call Volume</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Key Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-blue-50">
                          <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-600">Boltcall</td>
                          <td className="border border-gray-300 px-4 py-3">$389/month</td>
                          <td className="border border-gray-300 px-4 py-3">Unlimited</td>
                          <td className="border border-gray-300 px-4 py-3">AI + Website + 24hr setup</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3">Competitor A</td>
                          <td className="border border-gray-300 px-4 py-3">$0.45/minute</td>
                          <td className="border border-gray-300 px-4 py-3">Pay-per-use</td>
                          <td className="border border-gray-300 px-4 py-3">Basic answering only</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3">Competitor B</td>
                          <td className="border border-gray-300 px-4 py-3">$299/month</td>
                          <td className="border border-gray-300 px-4 py-3">500 minutes</td>
                          <td className="border border-gray-300 px-4 py-3">No website, setup fees apply</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3">Competitor C</td>
                          <td className="border border-gray-300 px-4 py-3">$199/month</td>
                          <td className="border border-gray-300 px-4 py-3">100 calls</td>
                          <td className="border border-gray-300 px-4 py-3">Limited integrations</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-lg mb-6">
                    <h3 className="text-xl font-semibold text-blue-800 mb-4">What You Get with Boltcall:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Unlimited AI receptionist calls</span>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Professional website included</span>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>24-hour complete setup</span>
                        </li>
                      </ul>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Appointment scheduling integration</span>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Custom business knowledge training</span>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>No setup or hidden fees</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-gray-600">
                    While Boltcall's starting price may seem higher, the value proposition becomes clear when you consider the included website (worth $2,000+), unlimited calls, and comprehensive setup that competitors charge extra for.
                  </p>
                </motion.section>


                  {/* Boltcall Plans Feature Comparison Table */}
                  <section className="my-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Boltcall Plans at a Glance</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="py-3 px-4 text-left rounded-tl-xl">Feature</th>
                            <th className="py-3 px-4 text-center">Starter</th>
                            <th className="py-3 px-4 text-center">Pro</th>
                            <th className="py-3 px-4 text-center rounded-tr-xl">Scale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["AI Receptionist calls", "500/mo", "2,000/mo", "Unlimited"],
                            ["Lead capture (SMS/email)", "✓", "✓", "✓"],
                            ["CRM integrations", "—", "✓", "✓"],
                            ["Custom AI voice & script", "✓", "✓", "✓"],
                            ["Priority support", "—", "—", "✓"],
                          ].map(([feat, ...vals], i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <td className="py-3 px-4 font-medium text-gray-800">{feat}</td>
                              {vals.map((v, j) => <td key={j} className="py-3 px-4 text-center text-gray-600">{v}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                {/* Section 4 */}
                <motion.section
                  id="ai-vs-traditional"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">AI Receptionist Cost vs Traditional Answering Services</h2>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    Understanding the true cost comparison helps you make an informed decision for your business.
                  </p>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-6 w-6 text-gray-500 mr-2" />
                        Traditional Answering Service
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Base monthly fee:</span>
                          <span className="font-semibold">$150-300</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per-minute charges:</span>
                          <span className="font-semibold">$0.75-1.50</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Setup fees:</span>
                          <span className="font-semibold">$50-200</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Integration costs:</span>
                          <span className="font-semibold">$100-500</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Monthly total (200 min):</span>
                          <span className="text-red-600">$450-850</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <Phone className="h-6 w-6 text-blue-500 mr-2" />
                        AI Receptionist (Boltcall)
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Base monthly fee:</span>
                          <span className="font-semibold">$389</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per-minute charges:</span>
                          <span className="font-semibold text-green-600">$0 (unlimited)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Setup fees:</span>
                          <span className="font-semibold text-green-600">$0</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Website included:</span>
                          <span className="font-semibold text-green-600">$0 (saves $2000+)</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Monthly total (unlimited):</span>
                          <span className="text-green-600">$389</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Cost Savings Analysis
                    </h4>
                    <p className="text-green-700">
                      Businesses switching from traditional answering services to Boltcall typically save $200-500 monthly while getting unlimited calls, a professional website, and 24/7 availability without human limitations.
                    </p>
                  </div>
                </motion.section>

                {/* Section 5 */}
                <motion.section
                  id="roi-calculation"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Real ROI: How Quickly AI Receptionists Pay for Themselves</h2>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    According to <a href="https://callrail.com" className="text-blue-600 hover:underline">CallRail's research</a>, 85% of customers won't call back after reaching voicemail, and the average local business misses 62% of calls during business hours.
                  </p>

                  <div className="bg-gray-50 p-6 rounded-lg mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Calculator className="h-6 w-6 text-blue-500 mr-2" />
                      ROI Calculation Example
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Before AI Receptionist:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• Monthly missed calls: 50</li>
                          <li>• Conversion rate: 20%</li>
                          <li>• Lost customers: 10/month</li>
                          <li>• Average customer value: $300</li>
                          <li className="font-semibold text-red-600">• Monthly lost revenue: $3,000</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">After AI Receptionist:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• Monthly Boltcall cost: $389</li>
                          <li>• Calls answered: 98%</li>
                          <li>• Additional customers: 8/month</li>
                          <li>• Additional revenue: $2,400</li>
                          <li className="font-semibold text-green-600">• Net monthly gain: $2,011</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                      <p className="text-blue-800 font-semibold">
                        ROI Calculation: ($2,011 net gain ÷ $389 cost) × 100 = 517% monthly ROI
                      </p>
                      <p className="text-blue-700 text-sm mt-1">
                        Most businesses see their AI receptionist pay for itself within the first week.
                      </p>
                    </div>
                  </div>


                <blockquote className="border-l-4 border-blue-500 pl-6 my-8 bg-blue-50 rounded-r-xl py-4 pr-4">
                  <p className="text-lg text-gray-700 italic leading-relaxed">&ldquo;AI-powered customer engagement tools represent the fastest-growing category of business software because the ROI is so concrete. Unlike most software investments, every call answered means a measurable revenue outcome you can track in days, not quarters.&rdquo;</p>
                  <footer className="mt-3 text-sm font-semibold text-gray-600">— Tomasz Tunguz, General Partner, Theory Ventures</footer>
                </blockquote>
                  <p className="text-gray-600 mb-6">
                    A study by <a href="https://salesforce.com" className="text-blue-600 hover:underline">Salesforce</a> found that businesses using AI-powered customer service see an average 25% increase in customer satisfaction and 35% improvement in response times. For local businesses, this translates directly to more bookings and revenue.
                  </p>

                  <Link 
                    to="/ai-revenue-calculator" 
                    className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Calculate Your Potential ROI
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.section>

                {/* Section 6 */}
                <motion.section
                  id="hidden-costs"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mb-16"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Hidden Costs to Watch Out For</h2>
                  
                  <p className="text-gray-600 mb-8 text-lg">
                    Many AI receptionist providers advertise low starting prices but add significant costs through hidden fees and limitations.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                        <Shield className="h-6 w-6 mr-2" />
                        Common Hidden Costs
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-red-500 mr-2 mt-1 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Setup fees:</span>
                            <span className="text-sm text-gray-600 block">$200-$1,000 for initial configuration</span>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-red-500 mr-2 mt-1 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Training costs:</span>
                            <span className="text-sm text-gray-600 block">$500-$2,000 per year for ongoing training</span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                </motion.section>

              </div>
            </div>
          </div>
        </section>


      {/* Pros & Cons */}
      <section className="my-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="pros-cons" className="text-2xl font-bold text-gray-900 mb-6">Pros &amp; Cons of AI Receptionist Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-xl p-6">
            <h3 className="font-semibold text-green-800 mb-3">✓ Pros</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Costs 80–90% less than a full-time human receptionist</li>
              <li>• Flat monthly pricing makes budgeting predictable and simple</li>
              <li>• No payroll taxes, benefits, sick days, or overtime costs</li>
              <li>• Scales to handle unlimited concurrent calls without extra fees</li>
              <li>• Free trials available on most platforms — low risk to test</li>
            </ul>
          </div>
          <div className="bg-red-50 rounded-xl p-6">
            <h3 className="font-semibold text-red-800 mb-3">✗ Cons</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Per-minute billing on some platforms can spike with high call volume</li>
              <li>• Advanced integrations (CRM, EHR) may require a higher-tier plan</li>
              <li>• One-time setup or onboarding fees apply on some enterprise plans</li>
              <li>• Ongoing subscription cost even during slow business periods</li>
            </ul>
          </div>
        </div>
      </section>

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
              <DollarSign className="w-6 h-6 text-blue-500" />
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


      {/* Use Cases / Success Stories */}
      <section className="py-14 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Real-World Use Cases</h2>
          <div className="space-y-6">
            {[
              { title: "Cost vs. In-House Receptionist", story: "A dental practice replaced a part-time front desk position ($28,000/year salary + benefits) with an AI receptionist at $179/month ($2,148/year). The AI answered 3x as many calls and was available 24/7 — resulting in $800+ in captured after-hours revenue every month." },
              { title: "Competing Against Larger Firms", story: "A two-person law firm used AI call answering to match the responsiveness of 5-lawyer competitors. By answering every call instantly and qualifying leads automatically, their intake conversion rate rose from 15% to 38% over 6 months." },
            ].map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{item.story}</p>
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
      {/* FAQ Section */}
      <section id="faq" className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How much does an AI receptionist cost per month?</h3>
              <p className="text-gray-600">AI receptionist services cost between $49 and $500+/month depending on call volume and features. Entry-level plans like Boltcall start at $79/month for unlimited calls. Premium plans with advanced integrations run $199–$499/month. All plans are dramatically cheaper than a human receptionist at $3,200–$4,500/month.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Are there any hidden fees with AI receptionist services?</h3>
              <p className="text-gray-600">Reputable AI receptionist services like Boltcall have transparent flat-rate pricing with no per-minute fees or hidden charges. Some services charge extra for SMS, integrations, or after-hours calls—always check if call minutes are unlimited and if CRM integrations are included in the base price.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is included in an AI receptionist subscription?</h3>
              <p className="text-gray-600">A standard AI receptionist subscription includes 24/7 call answering, appointment scheduling, lead capture, voicemail transcription, and basic CRM integration. Premium plans add multi-location support, advanced analytics, custom voice training, and priority routing. Boltcall includes automated follow-up texts in all plans.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does AI receptionist pricing compare to hiring a part-time receptionist?</h3>
              <p className="text-gray-600">A part-time receptionist (20 hrs/week) costs $1,600–$2,200/month plus benefits—and only works scheduled hours. An AI receptionist costs $79–$299/month and works 24/7 with no sick days, vacation, or turnover. The total cost difference over one year is typically $15,000–$20,000 in favor of AI.</p>
            </div>
          </div>
        </div>
      </section>

    <Footer />
  </>
  );
};

export default AiReceptionistCostPricingGuide;