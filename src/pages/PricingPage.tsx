import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { usePricingVisitorTrack } from '../hooks/usePricingVisitorTrack';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import {
  SITE_DATE_PUBLISHED,
  SITE_DATE_MODIFIED,
  SITE_AGGREGATE_RATING,
  DEFAULT_PUBLISHER,
} from '../lib/seoConstants';
import GiveawayBar from '../components/GiveawayBar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Pricing from '../components/Pricing';
import AnswerBlock from '../components/seo/AnswerBlock';
import { DollarSign, CheckCircle, Zap, Phone, Calendar, Star } from 'lucide-react';

const automationIntegrationLinks = [
  { label: 'integration hub', href: '/integrations' },
  { label: 'Zapier guide', href: '/integrations/zapier' },
  { label: 'Make guide', href: '/integrations/make' },
  { label: 'HubSpot guide', href: '/integrations/hubspot' },
  { label: 'GoHighLevel guide', href: '/integrations/gohighlevel' },
];

const PricingPage: React.FC = () => {
  usePricingVisitorTrack();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Boltcall Pricing - AI Receptionist Plans & Pricing';
    updateMetaDescription('Compare Boltcall pricing plans. Choose the perfect AI receptionist plan for your business. Free setup included. View plans now.');

    // Add canonical link
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/pricing';

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

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Pricing", "item": "https://boltcall.org/pricing"}]});
    document.head.appendChild(bcScript);


    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
      speakableScript.remove();
    };
  }, []);

  useSchemaInjector([
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Boltcall AI Receptionist",
      "description": "AI receptionist that answers calls 24/7, books appointments, captures leads, and sends follow-up texts for local service businesses.",
      "url": "https://boltcall.org/pricing",
      "brand": { "@type": "Brand", "name": "Boltcall" },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": SITE_AGGREGATE_RATING.ratingValue,
        "reviewCount": SITE_AGGREGATE_RATING.reviewCount,
        "bestRating": SITE_AGGREGATE_RATING.bestRating,
        "worstRating": SITE_AGGREGATE_RATING.worstRating
      },
      "datePublished": SITE_DATE_PUBLISHED,
      "dateModified": SITE_DATE_MODIFIED,
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter",
          "price": "549",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" },
          "url": "https://boltcall.org/setup",
          "availability": "https://schema.org/InStock",
          "description": "AI receptionist, missed call text-back, instant lead reply, appointment reminders, reports dashboard."
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "897",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" },
          "url": "https://boltcall.org/setup",
          "availability": "https://schema.org/InStock",
          "description": "Everything in Starter plus full lead follow-up system, SMS conversations, website chat widget, custom AI voice."
        },
        {
          "@type": "Offer",
          "name": "Ultimate",
          "price": "4997",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" },
          "url": "https://boltcall.org/setup",
          "availability": "https://schema.org/InStock",
          "description": "Everything in Pro plus multi-location support, dedicated account manager, AI audits."
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does Boltcall cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall starts at $549/month for the Starter plan, $897/month for Pro, and $4,997/month for Ultimate. All plans include free setup and a 30-day money-back guarantee. No per-call or per-minute fees."
          }
        },
        {
          "@type": "Question",
          "name": "Does Boltcall pay for itself?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most businesses recover the full cost of their Boltcall subscription within the first week. The average missed call to a local service business represents $300–$1,500 in lost revenue. At $897/month for the Pro plan, recovering even a handful of additional appointments per month generates 5–10× the subscription cost."
          }
        },
        {
          "@type": "Question",
          "name": "What is included in every Boltcall plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Every Boltcall plan includes 24/7 AI call answering, appointment booking into your calendar, instant SMS follow-up, automated appointment reminders that cut no-shows by 40%+, post-appointment Google review requests, and a monthly revenue report."
          }
        },
        {
          "@type": "Question",
          "name": "Can I upgrade or cancel my Boltcall plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You can upgrade from Starter to Pro or Pro to Ultimate with one click from your dashboard. There are no long-term contracts — you can cancel at any time."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between Boltcall Starter and Pro?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Starter includes the core AI receptionist, missed call text-back, instant lead reply, and appointment reminders. Pro adds a full lead follow-up system, SMS conversations, automated post-job follow-ups, a website chat widget, custom AI voice and script, CRM integration, and Google review request automation."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Boltcall Pricing — AI Receptionist Plans",
      "url": "https://boltcall.org/pricing",
      "description": "Compare Boltcall pricing plans. AI receptionist starting at $549/month. Free setup included.",
      "datePublished": SITE_DATE_PUBLISHED,
      "dateModified": SITE_DATE_MODIFIED,
      "publisher": DEFAULT_PUBLISHER,
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
    }
  ]);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <main className="pt-20">
        <h1 className="speakable-intro sr-only">Boltcall AI Receptionist Pricing Plans</h1>

        {/* Direct-answer block — AIO/AI Mode citation chunk (May 2026 update response) */}
        <AnswerBlock
          query="How much does Boltcall cost"
          definition="Boltcall pricing has three tiers: Starter at $549/month (24/7 AI call answering, missed-call text-back, instant lead reply, calendar booking), Pro at $897/month (everything in Starter plus full lead follow-up sequences, SMS conversations, custom AI voice, website widget), and Ultimate at $4,997/month (everything in Pro plus multi-location support, a dedicated account manager, and AI audits)."
          stat="All plans include free setup, no per-minute or per-call fees, no long-term contracts, and a 30-day money-back guarantee."
          outcome="Most local service businesses recover the full subscription cost within the first week, because a single after-hours emergency call or recovered missed lead is typically worth $300–$1,500 in job revenue."
          cta="Compare plans below or start free at boltcall.org/setup."
        />

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="text-xl font-bold text-gray-900">Want a working SMS setup before picking a plan?</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              Start with a focused mini-implementation: the <Link to="/after-hours-lead-rescue" className="text-indigo-600 hover:text-indigo-700 underline">After-Hours Lead Rescue setup</Link>, the <Link to="/automatic-reviews-agent" className="text-indigo-600 hover:text-indigo-700 underline">Automatic Reviews Agent setup</Link>, or the <Link to="/reminders-agent" className="text-indigo-600 hover:text-indigo-700 underline">Reminders Agent setup</Link>. Each one includes a test message before Boltcall imports the first 100 contacts.
            </p>
          </div>
        </section>

        <Pricing />

        {/* Why Boltcall Pays For Itself */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <DollarSign className="w-4 h-4" />
              ROI Analysis
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Does Boltcall Pay for Itself?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Most businesses recover the full cost of their subscription within the first week — from a single appointment booked or emergency call answered after hours.
            </p>
          </div>

          <div className="space-y-5 text-gray-700 leading-relaxed mb-12">
            <p>
              The average missed call to a local service business represents $300 to $1,500 in lost revenue when you account for the full customer lifetime value. A plumber who misses an emergency call at 9 pm loses not just one repair job but potentially a $3,000-per-year repeat customer. A dental practice that sends new patients to voicemail loses a $3,200 lifetime value relationship. When you multiply those numbers across the 40 to 60 calls the average small business misses every month, the math becomes stark.
            </p>
            <p>
              Boltcall's AI receptionist answers every call — during business hours, after hours, on weekends, and on holidays — and converts a significant percentage of those callers into booked appointments. At $897 per month for the Pro plan, recovering even a handful of additional jobs or appointments per month typically generates 5 to 10 times the subscription cost. Most of our customers see positive ROI within 48 hours of going live. If you want to see how your current response time stacks up before committing, run our free <Link to="/lead-response-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">lead response scorecard</Link> or read our <Link to="/speed-to-lead" className="text-indigo-600 hover:text-indigo-700 underline">speed-to-lead guide</Link>.
            </p>
            <p>
              Beyond call answering, every plan includes automated appointment reminders that reduce no-shows by an average of 40%, SMS follow-up sequences that re-engage leads who expressed interest but didn't book, and post-appointment review requests that build your Google rating over time. These features compound each other — more calls answered means more appointments booked, better reminders mean fewer empty slots, and better reviews mean more inbound calls. Boltcall is not a single tool; it is a complete revenue recovery system.
            </p>
          </div>

          {/* What's Included prose */}
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-600" />
              What's Included in Every Plan
            </h3>
            <p className="text-gray-600 mb-6">
              Every Boltcall plan includes a complete setup, a dedicated AI voice trained on your business, and access to the full automation suite. Here is what you get regardless of which tier you choose:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Phone, text: '24/7 AI call answering — no hold times, no voicemail for the caller' },
                { icon: Calendar, text: 'Appointment booking directly into your calendar system' },
                { icon: Zap, text: 'Instant SMS follow-up when a caller requests a callback' },
                { icon: CheckCircle, text: 'Automated appointment reminders to cut no-show rates by 40%+' },
                { icon: Star, text: 'Post-appointment Google review request sequences' },
                { icon: DollarSign, text: 'Monthly revenue report showing calls answered and bookings recovered' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <item.icon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">What Do Boltcall Customers Say?</h2>
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

      </main>

      {/* Plan Comparison Table */}
      <section className="bg-white py-10 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Which Boltcall Plan Is Right for My Business?</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Everything included in each Boltcall tier — no hidden fees</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Feature</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 text-center">Starter</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 text-center bg-indigo-50">Pro</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 text-center">Ultimate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['24/7 AI Call Answering', true, true, true],
                  ['Appointment Booking', true, true, true],
                  ['Instant SMS Follow-Up', true, true, true],
                  ['No-Show Reminders', true, true, true],
                  ['Google Review Requests', false, true, true],
                  ['Custom AI Voice & Script', false, true, true],
                  ['CRM Integration', false, true, true],
                  ['Multi-Location Support', false, false, true],
                  ['Dedicated Account Manager', false, false, true],
                  ['Monthly Revenue Report', true, true, true],
                ].map(([feature, starter, pro, agency]) => (
                  <tr key={String(feature)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center">{starter ? '✓' : '—'}</td>
                    <td className="px-4 py-3 text-center bg-indigo-50/30 text-indigo-700 font-semibold">{pro ? '✓' : '—'}</td>
                    <td className="px-4 py-3 text-center">{agency ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Pricing FAQ</h2>
          <p className="text-gray-500 text-center mb-10 text-sm">Everything buyers ask before picking a Boltcall plan.</p>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does Boltcall compare to other lead-response tools?</h3>
              <p className="text-gray-700 leading-relaxed">
                Boltcall is purpose-built for speed-to-lead — every inbound lead gets a reply in under a minute and is booked on your calendar. We've published detailed head-to-head breakdowns, including <Link to="/compare/boltcall-vs-gohighlevel" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs GoHighLevel</Link>, <Link to="/compare/boltcall-vs-smith-ai" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs Smith.ai</Link>, and <Link to="/compare/boltcall-vs-birdeye" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs BirdEye</Link>. You can browse <Link to="/comparisons" className="text-indigo-600 hover:text-indigo-700 underline">all comparisons</Link> for the full feature, pricing, and ROI matrix.
              </p>
              <p className="mt-3 text-gray-700 leading-relaxed">
                If your team already works inside automation tools, start with our{' '}
                {automationIntegrationLinks.map((link, index) => (
                  <React.Fragment key={link.href}>
                    <Link to={link.href} className="text-indigo-600 hover:text-indigo-700 underline">{link.label}</Link>
                    {index < automationIntegrationLinks.length - 2 ? ', ' : index === automationIntegrationLinks.length - 2 ? ', or ' : ''}
                  </React.Fragment>
                ))}
                {' '}to route new leads into Boltcall without changing your current stack.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I try Boltcall before committing to a plan?</h3>
              <p className="text-gray-700 leading-relaxed">
                Yes — every plan is backed by a 30-day money-back guarantee, but most buyers like to validate fit first. Start with our <Link to="/seo-audit" className="text-indigo-600 hover:text-indigo-700 underline">free SEO audit</Link> or full <Link to="/seo-aeo-audit" className="text-indigo-600 hover:text-indigo-700 underline">SEO + AEO audit</Link> to see where your site is leaking leads, run a <Link to="/business-audit" className="text-indigo-600 hover:text-indigo-700 underline">business audit</Link> to benchmark your funnel, score your speed with the <Link to="/lead-response-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">lead response scorecard</Link>, or take the <Link to="/ai-readiness-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">AI readiness scorecard</Link>. If you want a deeper dollar-figure projection, the <Link to="/ai-revenue-audit" className="text-indigo-600 hover:text-indigo-700 underline">AI revenue audit</Link> shows exactly what Boltcall would recover for your business, and the <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-indigo-600 hover:text-indigo-700 underline">AI Receptionist Buyer's Guide</Link> walks you through every question to ask before signing with any vendor.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Does Boltcall pay for itself?</h3>
              <p className="text-gray-700 leading-relaxed">
                Most businesses recover the full cost within the first week. The average missed call to a local service business represents $300–$1,500 in lost revenue. At $897/month for the Pro plan, recovering even a handful of additional appointments per month generates 5–10× the subscription cost. We break down the math with real customer case studies on our <Link to="/blog" className="text-indigo-600 hover:text-indigo-700 underline">blog</Link>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is included in every Boltcall plan?</h3>
              <p className="text-gray-700 leading-relaxed">
                Every plan includes 24/7 AI call answering, appointment booking into your calendar, instant SMS follow-up, automated appointment reminders that cut no-shows by 40%+, post-appointment Google review requests, and a monthly revenue report.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I upgrade, cancel, or refer Boltcall?</h3>
              <p className="text-gray-700 leading-relaxed">
                Yes to all three. You can upgrade from Starter to Pro or Pro to Ultimate with one click from your dashboard, there are no long-term contracts, and you can cancel any time. Agencies, consultants, and SaaS founders can also earn recurring revenue by joining the Boltcall <Link to="/partners" className="text-indigo-600 hover:text-indigo-700 underline">Partner Program</Link>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is the difference between Starter and Pro?</h3>
              <p className="text-gray-700 leading-relaxed">
                Starter includes the core AI receptionist, missed call text-back, instant lead reply, and appointment reminders. Pro adds a full lead follow-up system, SMS conversations, automated post-job follow-ups, a website chat widget, custom AI voice and script, CRM integration, and Google review request automation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Next / Try Boltcall */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Not Ready to Pick a Plan? Try Boltcall First.</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            The fastest way to see if Boltcall fits is to <Link to="/book-a-call" className="text-indigo-600 hover:text-indigo-700 underline font-medium">book a strategy call</Link> with our team — we'll walk through your current lead flow and show exactly what we'd automate. Prefer to self-serve? Start with the <Link to="/lead-response-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">lead response scorecard</Link>, the <Link to="/ai-revenue-audit" className="text-indigo-600 hover:text-indigo-700 underline">AI revenue audit</Link>, or the <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-indigo-600 hover:text-indigo-700 underline">AI Receptionist Buyer's Guide</Link>. Still researching? Read every <Link to="/comparisons" className="text-indigo-600 hover:text-indigo-700 underline">competitor comparison</Link>, browse our <Link to="/blog" className="text-indigo-600 hover:text-indigo-700 underline">blog</Link>, or skim the <Link to="/speed-to-lead" className="text-indigo-600 hover:text-indigo-700 underline">speed-to-lead guide</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;

