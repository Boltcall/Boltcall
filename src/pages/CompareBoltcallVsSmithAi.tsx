// @ts-nocheck
import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, DollarSign, Zap, Shield, Star } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';

const CompareBoltcallVsSmithAi: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Boltcall vs Smith.ai: AI Receptionist Compared for Small Business (2026)';
    updateMetaDescription('Boltcall vs Smith.ai: flat pricing vs per-call fees, pure AI vs hybrid. Which AI receptionist is better for your small business in 2026?');

    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Boltcall vs Smith.ai: AI Receptionist Compared for Small Business (2026)",
      "description": "Boltcall vs Smith.ai compared head-to-head. Flat pricing vs per-call fees, pure AI vs hybrid, and which AI receptionist is better for your small business in 2026.",
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
      "datePublished": "2026-03-23",
      "dateModified": "2026-05-24",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/compare/boltcall-vs-smith-ai"
      }
    });
    document.head.appendChild(articleScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Boltcall cheaper than Smith.ai?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It depends on call volume. Smith.ai starts at $95/month for 50 calls, but charges $2.10–$2.40 per additional call. At 240+ calls per month, Boltcall's flat $549/month Starter plan is cheaper. At 300 calls, Boltcall saves $146/month vs Smith.ai's $695. Boltcall also includes a website, chatbot, and speed-to-lead automation that Smith.ai does not offer."
          }
        },
        {
          "@type": "Question",
          "name": "Does Smith.ai include a chatbot or website?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Smith.ai is a phone answering service only. It does not include an AI chatbot widget or a website builder. Boltcall includes both as part of every plan at no extra cost."
          }
        },
        {
          "@type": "Question",
          "name": "Can I switch from Smith.ai to Boltcall?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Boltcall offers a 24-hour setup guarantee, so you can be fully operational within one day. Smith.ai is month-to-month with no contracts, so you can cancel and switch at any time. Many businesses switch to Boltcall for predictable flat pricing and the all-in-one feature set."
          }
        },
        {
          "@type": "Question",
          "name": "Which is better for a law firm?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Smith.ai is the stronger choice for law firms that need human agents for complex legal intake, Clio integration, and bilingual support. Boltcall is better for solo attorneys or small practices that want flat-rate AI answering, a website, and speed-to-lead automation without per-call fees."
          }
        }
      ]
    });
    document.head.appendChild(faqScript);

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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Comparisons", "item": "https://boltcall.org/comparisons"}, {"@type": "ListItem", "position": 3, "name": "Boltcall vs Smith.ai", "item": "https://boltcall.org/compare/boltcall-vs-smith-ai"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.head.removeChild(articleScript);
      document.head.removeChild(faqScript);
      speakableScript.remove();
    };
  }, []);

  const comparisonData = [
    { feature: 'Starting Price', boltcall: '$549/mo (flat)', smithai: '$95/mo + $2.40/call', boltcallYes: true, smithaiYes: true },
    { feature: 'AI Phone Receptionist', boltcall: 'Yes, 24/7', smithai: 'Yes, with human backup', boltcallYes: true, smithaiYes: true },
    { feature: 'AI Chatbot Widget', boltcall: 'Yes, included', smithai: 'No', boltcallYes: true, smithaiYes: false },
    { feature: 'Speed-to-Lead Auto-Reply', boltcall: 'Yes, <60 seconds', smithai: 'No', boltcallYes: true, smithaiYes: false },
    { feature: 'Human Agent Backup', boltcall: 'No', smithai: 'Yes, 500+ agents', boltcallYes: false, smithaiYes: true },
    { feature: 'Website Builder', boltcall: 'Yes, free included', smithai: 'No', boltcallYes: true, smithaiYes: false },
    { feature: 'Setup Time', boltcall: '24 hours', smithai: 'Days–weeks', boltcallYes: true, smithaiYes: false },
    { feature: 'Contract Required', boltcall: 'No', smithai: 'No', boltcallYes: true, smithaiYes: true },
    { feature: 'Per-Call Charges', boltcall: 'None', smithai: 'Yes, $2.10–$2.40/call', boltcallYes: true, smithaiYes: false },
    { feature: 'Integrations', boltcall: 'Growing', smithai: '7,000+ via Zapier', boltcallYes: false, smithaiYes: true },
    { feature: 'Best For', boltcall: 'Small local businesses', smithai: 'Law firms & enterprises', boltcallYes: true, smithaiYes: true },
  ];

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <main className="pt-24 min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Comparison Guide
                </span>
              </div>

              <Breadcrumbs
                items={[
                  { label: 'Blog', href: '/blog' },
                  { label: 'Boltcall vs Smith.ai', href: '/compare/boltcall-vs-smith-ai' }
                ]}
              />

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                <span className="text-blue-600">Boltcall vs Smith.ai</span>: Which AI Receptionist is Right for Your Business?
              </h1>

              <div className="flex items-center text-gray-600 mb-8 space-x-6">
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  <span>March 23, 2026</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  <span>10 min read</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  <span>Boltcall Team</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* AEO Direct Answer Block */}
          <div className="speakable-intro bg-blue-50 border-l-4 border-blue-500 p-6 mb-10">
            <p className="text-lg font-medium text-gray-900">
              <strong>Quick Answer:</strong> Boltcall is better for small local businesses that want flat monthly pricing, an all-in-one platform with AI phone answering, chatbot, website, and speed-to-lead automation starting at $389/month. Smith.ai is better for law firms and enterprises that need hybrid AI-plus-human call handling with 7,000+ integrations, but per-call pricing gets expensive at high volume.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Boltcall and Smith.ai both answer your business phone calls with AI. But they take fundamentally different approaches. Boltcall is an all-in-one platform with flat pricing. Smith.ai is a hybrid AI-plus-human answering service with per-call fees. This guide breaks down every difference so you can make the right choice.
            </p>

            <p className="text-lg text-gray-700 mb-8">
              We compare pricing models, feature sets, integration depth, and real-world fit. By the end, you will know exactly which service matches your business needs and budget.
            </p>

            {/* Comparison Table */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-3" />
                Feature-by-Feature Comparison Table
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                This table summarizes the core differences between Boltcall and Smith.ai. Green checks mean the feature is fully included. Red marks indicate the feature is missing or limited.
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse rounded-lg overflow-hidden shadow-lg">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-6 py-4 text-left font-semibold">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold text-blue-300">Boltcall</th>
                      <th className="px-6 py-4 text-center font-semibold">Smith.ai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900 border-b border-gray-200">
                          {row.feature}
                        </td>
                        <td className="px-6 py-4 text-center border-b border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            {row.boltcallYes ? (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700">{row.boltcall}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-b border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            {row.smithaiYes ? (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700">{row.smithai}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-lg text-gray-700 mb-4">
                Boltcall wins on 7 of 11 categories. Smith.ai leads on human agent backup and integration depth. Both offer no-contract, flexible plans.
              </p>
            </motion.section>

            {/* Pricing Comparison */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                Pricing Comparison: Flat Rate vs Per-Call
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                The pricing models are fundamentally different. Boltcall charges a flat monthly fee with unlimited calls. Smith.ai charges a base fee plus a per-call rate. Which is cheaper depends entirely on your call volume.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Boltcall Pricing */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-600 mb-4">Boltcall Pricing</h3>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-gray-700">Starter Plan</span>
                      <span className="font-bold text-gray-900">$549/mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">Pro Plan</span>
                      <span className="font-bold text-gray-900">$897/mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">Ultimate Plan</span>
                      <span className="font-bold text-gray-900">$4,997/mo</span>
                    </li>
                    <li className="border-t border-blue-200 pt-3 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 inline mr-1" />
                      No contracts. No per-call fees. Website + chatbot included.
                    </li>
                  </ul>
                </div>

                {/* Smith.ai Pricing */}
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-700 mb-4">Smith.ai Pricing</h3>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-gray-700">AI Receptionist (50 calls)</span>
                      <span className="font-bold text-gray-900">$95/mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">Per extra call (up to 150)</span>
                      <span className="font-bold text-gray-900">$2.40/call</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">Virtual Receptionist (human)</span>
                      <span className="font-bold text-gray-900">$292.50/mo</span>
                    </li>
                    <li className="border-t border-gray-200 pt-3 text-sm text-gray-600">
                      <XCircle className="h-4 w-4 text-red-500 inline mr-1" />
                      Per-call fees add up. No website. No chatbot widget.
                    </li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-4">The Math at 300 Calls Per Month</h3>
              <p className="text-lg text-gray-700 mb-6">
                A typical small business receives 150-300 calls per month. Here is what 300 calls costs on each platform:
              </p>

              <div className="bg-gray-100 rounded-xl p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-semibold text-blue-600 mb-2">Boltcall (Starter Plan)</p>
                    <p className="text-3xl font-bold text-gray-900">$549/mo</p>
                    <p className="text-sm text-gray-600 mt-1">Flat rate. 300 calls, 500 calls, unlimited. Same price.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Smith.ai AI Receptionist</p>
                    <p className="text-3xl font-bold text-gray-900">$695/mo</p>
                    <p className="text-sm text-gray-600 mt-1">$95 base + 250 extra calls x $2.40 = $695</p>
                  </div>
                </div>
              </div>

              <p className="text-lg text-gray-700 mb-6">
                At 300 calls per month, Boltcall saves you $146/month or $1,752/year. The crossover point is around 240 calls — beyond that, Boltcall's flat pricing wins every month. At 400 calls, Smith.ai costs $935/month while Boltcall remains at $549. For a full breakdown of AI receptionist pricing, see our <Link to="/blog/ai-receptionist-cost-pricing" className="text-blue-600 hover:underline">AI receptionist pricing guide</Link>.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Important note:</strong> Smith.ai also offers a Virtual Receptionist plan with live human agents at $292.50/month for 30 calls ($9.75/call). This is significantly more expensive but includes human-quality call handling. Pricing shown reflects Smith.ai's published rates as of March 2026.
                </p>
              </div>
            </motion.section>

            {/* Key Differences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                Key Differences That Actually Matter
              </h2>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">1. Flat Pricing vs Per-Call Fees</h3>
              <p className="text-lg text-gray-700 mb-6">
                This is the single biggest difference. Boltcall charges a flat monthly rate regardless of call volume. Smith.ai charges per call after your base allotment. For low-volume businesses under 50 calls per month, Smith.ai's $95 entry point is cheaper. But most local businesses receive far more than 50 calls.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                The crossover point is around 240 calls per month. Beyond that, Boltcall's flat pricing saves money every single month. If your call volume is unpredictable, Boltcall eliminates the risk of surprise bills.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">2. All-in-One vs Phone Only</h3>
              <p className="text-lg text-gray-700 mb-6">
                Boltcall is a complete business platform. You get AI phone answering, an AI chatbot widget for your website, speed-to-lead automation that responds to every inquiry in under 60 seconds, and a free business website. Smith.ai is a phone answering service. It handles calls exceptionally well but does not offer a chatbot, website builder, or automated lead follow-up.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                For businesses that need more than just call answering, Boltcall provides significantly more value per dollar. For businesses that only need phone coverage, Smith.ai's focused approach may be sufficient. Learn more about the full value of AI receptionists in our <Link to="/blog/is-ai-receptionist-worth-it" className="text-blue-600 hover:underline">detailed ROI analysis</Link>.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3. Pure AI vs Hybrid AI-Plus-Human</h3>
              <p className="text-lg text-gray-700 mb-6">
                Smith.ai's core strength is its hybrid model. AI handles the initial greeting and routing, then live North America-based human agents take over for complex calls. This means real people handle nuanced conversations, legal intake, and sensitive situations. Smith.ai employs over 500 agents for this purpose.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Boltcall uses pure AI for all call handling. The AI is sophisticated enough for most small business scenarios like appointment booking, FAQ answering, and lead qualification. But it does not escalate to a human operator. For businesses where call complexity is high, such as law firms handling detailed case intake, the human backup is a genuine advantage. For most local businesses, pure AI handles 95% of calls effectively. See our <Link to="/blog/ai-vs-human-receptionist" className="text-blue-600 hover:underline">AI vs human receptionist comparison</Link> for more detail.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">4. Integration Ecosystem</h3>
              <p className="text-lg text-gray-700 mb-6">
                Smith.ai wins decisively on integrations. With 7,000+ connections via Zapier plus native integrations with Clio, HubSpot, Salesforce, MyCase, HouseCall Pro, Service Titan, and Calendly, Smith.ai fits into virtually any existing tech stack. This is especially valuable for law firms and enterprises with complex CRM requirements.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Boltcall's integration library is growing but currently smaller. For businesses with simple workflows, this is rarely an issue. For businesses with deeply integrated tech stacks, Smith.ai's ecosystem is a clear advantage.
              </p>
            </motion.section>

            {/* Who Should Choose Boltcall */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
                Who Should Choose Boltcall
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                Boltcall is the better choice if your business matches any of these criteria. The platform is purpose-built for small local businesses that need maximum automation with predictable costs.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You want predictable monthly costs.</strong> Boltcall's flat pricing means no surprise bills. Whether you get 100 calls or 1,000, you pay the same amount every month.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You need more than just phone answering.</strong> Boltcall includes a website, AI chatbot, and speed-to-lead automation. You get a complete business growth platform, not just a phone service.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You receive 240+ calls per month.</strong> Once you pass 240 calls, Boltcall is cheaper than Smith.ai every single month. The more calls you get, the bigger the savings.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You want to be operational in 24 hours.</strong> Boltcall guarantees setup within one day. If it takes longer, you get a free AI receptionist. No waiting weeks for onboarding.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>Speed-to-lead matters to you.</strong> Boltcall auto-replies to every inquiry in under 60 seconds. Research shows responding within 5 minutes makes you 100x more likely to connect with a lead.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You are a solo operator or small team (1-20 employees).</strong> Boltcall is designed for businesses your size. No enterprise complexity, no unnecessary features you will never use.
                  </span>
                </li>
              </ul>
            </motion.section>

            {/* Who Should Choose Smith.ai */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Star className="h-8 w-8 text-gray-600 mr-3" />
                Who Should Choose Smith.ai
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                Smith.ai is a highly rated service with genuine strengths. Be honest about your needs. Smith.ai may be the better fit if these apply to you.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You are a law firm or professional services firm.</strong> Smith.ai has deep legal integrations with Clio, MyCase, and other legal practice management tools. Their human agents are trained in legal intake, which requires nuance that pure AI may not match.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You need human agents for complex calls.</strong> If your calls involve sensitive topics, detailed consultations, or require empathy that AI cannot replicate, Smith.ai's hybrid model with 500+ North America-based agents is a real advantage.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You have a complex tech stack with CRM requirements.</strong> Smith.ai integrates with 7,000+ apps via Zapier, plus native connections to Salesforce, HubSpot, HouseCall Pro, and Service Titan. If your workflow depends on these integrations, Smith.ai fits seamlessly.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-lg text-gray-700">
                    <strong>You receive fewer than 50 calls per month.</strong> At low volume, Smith.ai's $95/month AI plan is significantly cheaper than Boltcall's $389. If your call volume is genuinely low and you only need phone answering, Smith.ai is the more cost-effective option.
                  </span>
                </li>
              </ul>
            </motion.section>

            {/* The Verdict */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-3" />
                The Verdict: Which Should You Choose?
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                For most small local businesses, Boltcall is the better investment. The flat pricing eliminates cost uncertainty. The all-in-one platform replaces multiple tools. And the 24-hour setup guarantee means you stop missing leads immediately. At 200+ calls per month, Boltcall is both cheaper and more feature-rich than Smith.ai.
              </p>

              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Our recommendation:</h3>
                <p className="text-lg text-gray-700 mb-4">
                  <strong>Choose Boltcall if</strong> you are a small local business that wants AI phone answering, a website, chatbot, and lead automation in one flat-rate package. Especially if you receive 150+ calls per month.
                </p>
                <p className="text-lg text-gray-700">
                  <strong>Choose Smith.ai if</strong> you are a law firm or enterprise that needs human agent backup, deep CRM integrations, and handles complex calls that require a personal touch. Or if you receive fewer than 50 calls per month.
                </p>
              </div>

              <p className="text-lg text-gray-700 mb-6">
                Both are strong services with 30-day money-back guarantees and no long-term contracts. You can try either risk-free. But if you want the most features for a predictable price, Boltcall delivers more value for the typical small business. For detailed pricing across all AI receptionist providers, see our <Link to="/pricing" className="text-blue-600 hover:underline">pricing page</Link>.
              </p>
            </motion.section>

            {/* FAQ Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Is Boltcall cheaper than Smith.ai?</h3>
                  <p className="text-lg text-gray-700">
                    It depends on your call volume. Smith.ai starts at $95/month for 50 calls, making it cheaper for very low-volume businesses. But per-call fees of $2.10-$2.40 add up fast. At 300 calls per month, Smith.ai costs $695 while Boltcall's Starter plan costs $549. The crossover is around 240 calls — beyond that, Boltcall is always cheaper. Plus, Boltcall includes a website, chatbot, and speed-to-lead automation that Smith.ai charges extra for or does not offer at all.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Does Smith.ai include a chatbot or website?</h3>
                  <p className="text-lg text-gray-700">
                    No. Smith.ai is a phone answering service. It does not include an AI chatbot widget for your website or a website builder. Boltcall includes both as part of every plan at no extra cost. If you need website chat and phone answering in one platform, Boltcall is the only option in this comparison that offers both.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Can I switch from Smith.ai to Boltcall?</h3>
                  <p className="text-lg text-gray-700">
                    Yes. Both services are month-to-month with no contracts, so switching is straightforward. Boltcall offers a 24-hour setup guarantee. You can sign up with Boltcall, verify it works for your business, and then cancel Smith.ai. Many businesses that switch cite predictable pricing and the all-in-one feature set as their primary reasons.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Which is better for a law firm?</h3>
                  <p className="text-lg text-gray-700">
                    Smith.ai is generally the stronger choice for established law firms. It offers native Clio integration, trained human agents for legal intake, bilingual support, and call screening capabilities built specifically for legal practices. Boltcall is better for solo attorneys or small legal practices that want flat-rate pricing, a website, and automated lead follow-up without per-call fees.
                  </p>
                </div>
              </div>
            </motion.section>
          </div>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-12 mb-16"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-10 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to See the Difference?</h2>
              <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
                Join hundreds of local businesses that chose Boltcall for flat-rate AI phone answering, lead automation, and a free website. Setup takes 24 hours. No contracts. No per-call fees.
              </p>
              <Link
                to="/setup"
                className="inline-flex items-center bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors duration-200"
              >
                Try Boltcall Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.section>

          {/* Related Posts */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                to="/blog/ai-receptionist-cost-pricing"
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <span className="text-sm text-blue-600 font-medium">Pricing Guide</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">AI Receptionist Cost & Pricing: Complete 2026 Guide</h3>
                <p className="text-gray-600 mt-2 text-sm">Everything you need to know about what AI receptionists cost and how to choose the right plan.</p>
              </Link>

              <Link
                to="/blog/is-ai-receptionist-worth-it"
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <span className="text-sm text-blue-600 font-medium">Analysis</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">Is an AI Receptionist Worth It? ROI Breakdown</h3>
                <p className="text-gray-600 mt-2 text-sm">Data-driven analysis of whether AI receptionists deliver real ROI for local businesses.</p>
              </Link>

              <Link
                to="/blog/ai-vs-human-receptionist"
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <span className="text-sm text-blue-600 font-medium">Comparison</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">AI vs Human Receptionist: Which is Right for You?</h3>
                <p className="text-gray-600 mt-2 text-sm">Compare AI and human receptionists on cost, speed, availability, and customer experience.</p>
              </Link>
            </div>
          </motion.section>
        </div>
      </main>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">What Businesses Say After Switching from Smith.ai</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Smith.ai was costing us $500+/month and callers still got put on hold. Boltcall is a third of the price, answers instantly, and the AI voice is more natural.", name: "James R.", role: "Law Firm Owner, New York" },
            { quote: "We switched from Smith.ai because the per-minute billing was unpredictable. Boltcall's flat rate is half the cost and it handles more call types than Smith ever did.", name: "Tony B.", role: "HVAC Business Owner, Michigan" },
            { quote: "Smith.ai requires human agents for complex calls. Boltcall's AI handles them just as well, 24/7, without the wait times or the premium price tag.", name: "Sarah L.", role: "Dental Practice Manager, California" },
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
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>100% Free — no credit card required</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Used by 500+ local businesses</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Setup completed in 24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>
          </div>
        </div>
      </section>

      <FinalCTA {...COMPARISON_CTA} />

      {/* Pros / Cons */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Boltcall vs Smith.ai: Pros and Cons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Boltcall</h3>
              <div className="mb-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Strengths</p>
                <ul className="space-y-2">
                <li key={"Pure AI — instant answer on every call, no per-call fees"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Pure AI — instant answer on every call, no per-call fees
                </li>
                <li key={"Flat monthly pricing regardless of call volume"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Flat monthly pricing regardless of call volume
                </li>
                <li key={"Consistent quality on every interaction, 24/7"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Consistent quality on every interaction, 24/7
                </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Limitations</p>
                <ul className="space-y-2">
                <li key={"No human fallback agent option for complex calls"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>No human fallback agent option for complex calls
                </li>
                <li key={"Better for businesses with predictable call types"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Better for businesses with predictable call types
                </li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Smith.ai</h3>
              <div className="mb-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Strengths</p>
                <ul className="space-y-2">
                <li key={"Hybrid AI + human receptionists available"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Hybrid AI + human receptionists available
                </li>
                <li key={"Strong after-hours coverage with live agents"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Strong after-hours coverage with live agents
                </li>
                <li key={"Good legal and medical intake options"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">✓</span>Good legal and medical intake options
                </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Limitations</p>
                <ul className="space-y-2">
                <li key={"Per-call pricing makes costs unpredictable at volume"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Per-call pricing makes costs unpredictable at volume
                </li>
                <li key={"Human agent quality varies by shift"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Human agent quality varies by shift
                </li>
                <li key={"Slower response time than pure AI systems"} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>Slower response time than pure AI systems
                </li>
                </ul>
              </div>
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
};

export default CompareBoltcallVsSmithAi;
