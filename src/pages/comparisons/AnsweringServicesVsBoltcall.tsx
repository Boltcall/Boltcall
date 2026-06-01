import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Clock, Zap, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../../components/FinalCTA';
import GiveawayBar from '../../components/GiveawayBar';
import TableOfContents from '../../components/TableOfContents';

const headings = [
  { id: 'quick-comparison', text: 'Quick Comparison', level: 2 },
  { id: 'why-boltcall', text: 'Why Boltcall is Better', level: 2 },
  { id: 'faq', text: 'Frequently Asked Questions', level: 2 },
];

const AnsweringServicesVsBoltcall: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Answering Services vs Boltcall AI Receptionist (2026)';
    updateMetaDescription('Answering services vs Boltcall AI receptionist. Compare pricing, features, availability, and service quality side by side.');

    const bcSchema = document.createElement('script');
    bcSchema.type = 'application/ld+json';
    bcSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: 'https://boltcall.org/comparisons' },
        { '@type': 'ListItem', position: 3, name: 'Answering Services vs Boltcall', item: 'https://boltcall.org/comparisons/answering-services-vs-boltcall' },
      ],
    });
    document.head.appendChild(bcSchema);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-jsonld-answering-vs-boltcall';
    faqScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the difference between an answering service and Boltcall?',
          acceptedAnswer: { '@type': 'Answer', text: 'Traditional answering services use human operators to take messages and transfer calls — they cost $0.75–$2 per minute and only operate during set hours. Boltcall is an AI receptionist that answers 24/7 instantly, books appointments directly into your calendar, and charges a flat monthly rate with no per-call fees.' },
        },
        {
          '@type': 'Question',
          name: 'Are answering services cheaper than AI receptionists?',
          acceptedAnswer: { '@type': 'Answer', text: 'Traditional answering services appear cheaper at $50–$150/month, but per-call fees add up fast. A busy local business with 100 after-hours calls per month pays $75–$200 in overages alone. AI receptionists like Boltcall charge flat rates ($99–$299/month) with unlimited calls and actually book appointments instead of just taking messages.' },
        },
        {
          '@type': 'Question',
          name: 'Can an answering service book appointments?',
          acceptedAnswer: { '@type': 'Answer', text: 'Most traditional answering services only take a message and promise someone will call back. Boltcall\'s AI receptionist checks real-time calendar availability and books confirmed appointments during the call — no callback needed. This dramatically improves conversion rates compared to message-taking services.' },
        },
        {
          '@type': 'Question',
          name: 'Is Boltcall available 24/7 unlike answering services?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Boltcall\'s AI receptionist answers every call instantly, 24/7/365 — including weekends and holidays. Traditional answering services have shift-based coverage with hold times during peak periods. AI has no hold times, no staffing gaps, and no days off.' },
        },
      ],
    });
    document.head.appendChild(faqScript);

    return () => {
      document.head.removeChild(bcSchema);
      document.getElementById('faq-jsonld-answering-vs-boltcall')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-12"
          >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
              <Link to="/comparisons" className="hover:text-blue-600 transition-colors">
                Comparisons
              </Link>
              <span>/</span>
              <span className="text-gray-900">Answering Services vs Boltcall</span>
            </nav>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Answering Services vs <span className="text-blue-600">Boltcall</span>
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>By the Boltcall Team</span>
              <span>&middot;</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>February 10, 2025</span>
              </div>
              <span>&middot;</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>7 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AEO Answer Block */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <p className="text-gray-800 text-lg leading-relaxed">
            An answering service is a third-party staffing solution where human operators answer your calls on your behalf, take messages, and transfer calls — typically charging $0.75–$2 per minute with limited hours. Boltcall is an AI receptionist that answers calls 24/7 instantly, books confirmed appointments in real time, and charges a flat monthly rate with no per-call fees.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 items-start">
      <article className="flex-1 min-w-0 pt-4 pb-16">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 id="quick-comparison" className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Quick Comparison
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Feature</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Boltcall</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Answering Services</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Monthly cost</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">$99-200/month</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">$300-800/month + per-minute fees</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Response time</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                      <Zap className="w-4 h-4" />
                      Instant (0-5 seconds)
                    </span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-orange-600 font-semibold">1-3 minutes average</span>
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Availability</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-green-600 font-semibold">24/7/365</span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Business hours or limited 24/7 (extra cost)</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Integration</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-green-600 font-semibold">Calendar, CRM, SMS, forms</span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Limited, phone calls primarily</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Multi-channel</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">
                    <span className="text-green-600 font-semibold">Calls, SMS, forms, chat, follow-ups</span>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Phone calls only</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Customization</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Full control, easy to update</td>
                  <td className="border border-gray-200 px-4 py-3 text-gray-700">Requires service provider changes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 id="why-boltcall" className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Why Boltcall is Better
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lower Cost, More Features</h3>
              <p className="text-gray-700 leading-relaxed">
                Answering services charge $300-800/month plus per-minute fees that can add hundreds more. Boltcall costs 
                $99-200/month with no per-minute charges. Plus, Boltcall includes SMS, form handling, automated follow-ups, 
                and website chat—features that answering services don't offer.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Better Integration</h3>
              <p className="text-gray-700 leading-relaxed">
                Boltcall integrates directly with your calendar, CRM, and business systems. Answering services typically 
                just take messages and email them to you—requiring manual work to book appointments or update your systems. 
                Boltcall does it all automatically.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Full Control</h3>
              <p className="text-gray-700 leading-relaxed">
                With answering services, you're dependent on their agents and scripts. Boltcall gives you full control—you 
                can update scripts, change responses, and customize behavior instantly, without waiting for a service provider 
                to make changes.
              </p>
            </div>
          </div>
        </motion.section>
      </article>
      <div className="hidden lg:block w-64 flex-shrink-0 pt-4">
        <TableOfContents headings={headings} />
      </div>
      </div>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">What Businesses Say After Switching from Answering Services</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "We were paying $600/month for an answering service that still missed calls on weekends. Boltcall costs less and picks up every single time — including at 2am.", name: "Marcus T.", role: "HVAC Business Owner, Texas" },
            { quote: "Switching from our answering service to Boltcall was the best business decision of the year. We stopped losing after-hours leads immediately.", name: "Sandra P.", role: "Plumbing Company Owner, Georgia" },
            { quote: "The answering service would take messages and email them to us. Boltcall actually books appointments. Night and day difference in how many leads convert.", name: "Chris W.", role: "Roofing Contractor, Ohio" },
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
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Report delivered to your inbox in minutes</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What is the difference between an answering service and Boltcall?</h3>
            <p className="text-gray-600 leading-relaxed">Traditional answering services use human operators to take messages — they charge per call and only operate during set hours. Boltcall is an AI receptionist that answers 24/7 instantly, books appointments directly into your calendar, and charges a flat monthly rate with no per-call fees.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Are answering services cheaper than AI receptionists?</h3>
            <p className="text-gray-600 leading-relaxed">Traditional answering services appear cheaper upfront, but per-call fees add up fast. A business with 100 after-hours calls per month pays $75–$200 in overages. Boltcall's flat-rate plan covers unlimited calls with appointment booking included — most businesses save money immediately after switching.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Can an answering service book appointments for you?</h3>
            <p className="text-gray-600 leading-relaxed">Most traditional answering services only take a message and promise someone will call back. Boltcall's AI checks real-time calendar availability and books confirmed appointments during the call — no callback needed, no lead left waiting.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Is Boltcall available 24/7 unlike answering services?</h3>
            <p className="text-gray-600 leading-relaxed">Yes. Boltcall answers every call instantly, 24/7/365 — including weekends and holidays. Traditional answering services have shift gaps and hold times during peak periods. AI has no hold times, no staffing gaps, and no days off.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How quickly can I switch from an answering service to Boltcall?</h3>
            <p className="text-gray-600 leading-relaxed">Most businesses switch in under 30 minutes. You set up your business profile, configure your call handling rules, and forward your phone number to Boltcall. No hardware required, no downtime, and you can run both services in parallel during your trial period.</p>
          </div>
        </div>
      </section>

      <FinalCTA {...COMPARISON_CTA} />

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

export default AnsweringServicesVsBoltcall;

