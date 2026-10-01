import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import { usePricingVisitorTrack } from '../hooks/usePricingVisitorTrack';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import {
  SITE_DATE_PUBLISHED,
  SITE_DATE_MODIFIED,
  DEFAULT_PUBLISHER,
} from '../lib/seoConstants';
import GiveawayBar from '../components/GiveawayBar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Pricing from '../components/Pricing';
import AnswerBlock from '../components/seo/AnswerBlock';
import CaseValueBreakeven from '../components/pricing/CaseValueBreakeven';
import { DollarSign, CheckCircle, Zap, Phone, Calendar } from 'lucide-react';

const automationIntegrationLinks = [
  { label: 'integration hub', href: '/integrations' },
  { label: 'Zapier guide', href: '/integrations/zapier' },
  { label: 'Make guide', href: '/integrations/make' },
  { label: 'HubSpot guide', href: '/integrations/hubspot' },
  { label: 'GoHighLevel guide', href: '/integrations/gohighlevel' },
  { label: 'Wix guide', href: '/integrations/wix' },
  { label: 'Squarespace guide', href: '/integrations/squarespace' },
];

const PricingPage: React.FC = () => {
  usePricingVisitorTrack();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Boltcall Pricing: Speed-to-Lead Plans From $549/mo for Law Firms';
    updateMetaDescription('Flat monthly plans for law firms, from $549. No per-case fees and no share of your fees. Compare Starter, Pro, and Ultimate and see what one signed case pays for.');

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
      "name": "Boltcall Speed-to-Lead",
      "description": "Speed-to-lead system that answers new inquiries 24/7, books consultations, captures leads, and sends follow-up texts for law firms.",
      "url": "https://boltcall.org/pricing",
      "brand": { "@type": "Brand", "name": "Boltcall" },
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
          "description": "AI intake receptionist, missed call text-back, instant lead reply, consultation reminders, reports dashboard."
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "897",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" },
          "url": "https://boltcall.org/setup",
          "availability": "https://schema.org/InStock",
          "description": "Everything in Starter plus full lead follow-up system, SMS conversations, website chat widget."
        },
        {
          "@type": "Offer",
          "name": "Ultimate",
          "price": "4997",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" },
          "url": "https://boltcall.org/setup",
          "availability": "https://schema.org/InStock",
          "description": "Everything in Pro plus multi-location support and AI audits."
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
            "text": "Boltcall starts at $549/month for the Starter plan, $897/month for Pro, and $4,997/month for Ultimate. All plans include free setup and a 30-day money-back guarantee. Each plan includes a monthly credit pool shared across calls, texts, and chat. Boltcall is a flat subscription with no per-case fees and no share of your fees."
          }
        },
        {
          "@type": "Question",
          "name": "Does Boltcall pay for itself?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "That depends on your average fee and how many inquiries you lose to voicemail today. A new inquiry can be worth $2,500 or more to a law firm, so at $897/month for the Pro plan, one extra signed matter every few months covers the subscription. Boltcall cannot promise how many extra cases you will sign. Use the break-even calculator on the pricing page with your own average fee."
          }
        },
        {
          "@type": "Question",
          "name": "What is included in every Boltcall plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Every Boltcall plan includes 24/7 AI call answering, consultation booking into your calendar, instant SMS follow-up, consultation reminders, and a monthly report of calls answered and consultations booked."
          }
        },
        {
          "@type": "Question",
          "name": "Can I upgrade or cancel my Boltcall plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You can upgrade from Starter to Pro or Pro to Ultimate with one click from your dashboard. There are no long-term contracts, and you can cancel at any time."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between Boltcall Starter and Pro?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Starter includes the core AI intake receptionist, missed call text-back, instant lead reply, and consultation reminders. Pro adds a full lead follow-up system, SMS conversations, follow-ups after consultations, a website chat widget, custom AI voice and script, CRM and webhook integrations, and Google review request automation."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Boltcall Pricing: Speed-to-Lead Plans for Law Firms",
      "url": "https://boltcall.org/pricing",
      "description": "Compare Boltcall pricing plans for law firms. Speed-to-lead software starting at $549/month. Free setup included.",
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
        <h1 className="speakable-intro sr-only">Boltcall Pricing for Law Firms</h1>

        {/* Direct-answer block, AIO/AI Mode citation chunk (May 2026 update response) */}
        <AnswerBlock
          query="How much does Boltcall cost"
          definition="Boltcall pricing has three tiers: Starter at $549/month (24/7 AI call answering, missed-call text-back, instant lead reply, consultation booking), Pro at $897/month (everything in Starter plus full lead follow-up sequences, SMS conversations, and a website widget), and Ultimate at $4,997/month (everything in Pro plus multi-location support and AI audits)."
          stat="Every plan includes free setup, a monthly credit pool shared across calls, texts, and chat, no long-term contracts, and a 30-day money-back guarantee. Boltcall is a flat subscription with no per-case fees."
          outcome="A new inquiry can be worth $2,500 or more to a law firm, so one extra signed case every few months can cover a plan. Use your own average fee in the break-even calculator below."
          cta="Compare plans below or start free at boltcall.org/setup."
        />

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="text-xl font-bold text-gray-900">Want to see it working before picking a plan?</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              <a href="/#live-demo" className="text-blue-600 hover:text-blue-700 underline">Hear the AI handle a live intake call</a>, or start with the <Link to="/after-hours-lead-rescue" className="text-blue-600 hover:text-blue-700 underline">After-Hours Lead Rescue setup</Link>, which includes a test message before Boltcall imports your first 100 contacts.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Want the pricing logic first? Read the <Link to="/credits" className="text-blue-600 hover:text-blue-700 underline">shared credits explainer</Link> to see how one monthly pool gets used across phone, SMS, and website chat.
            </p>
          </div>
        </section>

        <Pricing />

        {/* What one signed case pays for */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <DollarSign className="w-4 h-4" />
              Signed-case math
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What does one signed case pay for?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Price the plan against your fees, not against a receptionist's salary.
            </p>
          </div>

          <div className="space-y-5 text-gray-700 leading-relaxed mb-10">
            <p>
              A new inquiry is expensive to create. You paid for the ad, the referral, or years of reputation. If it reaches voicemail at 9pm, the caller may sign with the next firm that picks up. For a law firm a signed matter can be worth $2,500 or more, and often much more in personal injury.
            </p>
            <p>
              Boltcall answers the call, screens the matter, and books the consultation, whether or not anyone is in the office. We cannot promise how many extra cases you will sign. What we can show is the arithmetic. Put in your own average fee and see how many extra signed cases cover each plan. To see how your current response time stacks up first, run the free <Link to="/tools/lawyer-intake-calculator" className="text-blue-600 hover:text-blue-700 underline">lawyer intake calculator</Link> or the <Link to="/lead-response-scorecard" className="text-blue-600 hover:text-blue-700 underline">lead response scorecard</Link>.
            </p>
          </div>

          <CaseValueBreakeven />

          <p className="mt-6 text-sm text-gray-600">
            Boltcall is a flat monthly subscription. There are no per-case fees, no bonuses, and no percentage of your fees.
          </p>

          {/* What's Included prose */}
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mt-12">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              What's included in every plan
            </h3>
            <p className="text-gray-600 mb-6">
              Every Boltcall plan includes setup and an AI intake assistant configured for your firm. It tells every caller it is an AI and that the call is recorded, and it never gives legal advice. Here is what you get regardless of tier:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Phone, text: '24/7 AI call answering, no hold times and no voicemail for the caller' },
                { icon: Calendar, text: 'Consultation booking into Google Calendar or Cal.com' },
                { icon: Zap, text: 'Instant text follow-up when a caller requests a callback' },
                { icon: CheckCircle, text: 'Consultation reminders to reduce no-shows' },
                { icon: DollarSign, text: 'Monthly report of calls answered and consultations booked' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <item.icon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Free setup, no credit card to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Built for law firms</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>30-day money-back guarantee (see terms)</span>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Which Boltcall Plan Is Right for My Firm?</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Everything included in each Boltcall tier</p>
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
                  ['Consultation Booking', true, true, true],
                  ['Instant SMS Follow-Up', true, true, true],
                  ['Consultation Reminders', true, true, true],
                  ['Google Review Requests', false, true, true],
                  ['Custom AI Voice & Script', false, true, true],
                  ['CRM and Webhook Integrations', false, true, true],
                  ['Multi-Location Support', false, false, true],
                  ['Monthly Report', true, true, true],
                ].map(([feature, starter, pro, agency]) => (
                  <tr key={String(feature)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center">{starter ? '✓' : 'No'}</td>
                    <td className="px-4 py-3 text-center bg-indigo-50/30 text-indigo-700 font-semibold">{pro ? '✓' : 'No'}</td>
                    <td className="px-4 py-3 text-center">{agency ? '✓' : 'No'}</td>
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
                Boltcall is purpose-built for speed-to-lead: every new inquiry gets a fast reply and a path to a booked consultation. We've published detailed head-to-head breakdowns, including <Link to="/compare/boltcall-vs-gohighlevel" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs GoHighLevel</Link>, <Link to="/compare/boltcall-vs-smith-ai" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs Smith.ai</Link>, and <Link to="/compare/boltcall-vs-birdeye" className="text-indigo-600 hover:text-indigo-700 underline">Boltcall vs BirdEye</Link>. You can browse <Link to="/comparisons" className="text-indigo-600 hover:text-indigo-700 underline">all comparisons</Link> for the full feature, pricing, and ROI matrix.
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
                Yes. Every plan is backed by a 30-day money-back guarantee (<Link to="/terms-of-service#guarantee" className="text-indigo-600 hover:text-indigo-700 underline">see guarantee terms</Link>), but most buyers like to validate fit first. Start with our <Link to="/seo-audit" className="text-indigo-600 hover:text-indigo-700 underline">free SEO audit</Link> or full <Link to="/seo-aeo-audit" className="text-indigo-600 hover:text-indigo-700 underline">SEO + AEO audit</Link> to see where your site is leaking leads, run a <Link to="/business-audit" className="text-indigo-600 hover:text-indigo-700 underline">business audit</Link> to benchmark your funnel, score your speed with the <Link to="/lead-response-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">lead response scorecard</Link>, or take the <Link to="/ai-readiness-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">AI readiness scorecard</Link>. If you want a deeper dollar-figure projection, the <Link to="/ai-revenue-audit" className="text-indigo-600 hover:text-indigo-700 underline">AI revenue audit</Link> shows exactly what Boltcall would recover for your business, and the <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-indigo-600 hover:text-indigo-700 underline">AI Receptionist Buyer's Guide</Link> walks you through every question to ask before signing with any vendor.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Does Boltcall pay for itself?</h3>
              <p className="text-gray-700 leading-relaxed">
                That depends on your average fee and how many inquiries you lose today. A new inquiry can be worth $2,500 or more to a law firm, so at $897/month for the Pro plan, one extra signed matter every few months covers the subscription. We cannot promise how many extra cases you will sign. The <a href="#breakeven" className="text-blue-600 hover:text-blue-700 underline">break-even calculator</a> above uses your own average fee.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is included in every Boltcall plan?</h3>
              <p className="text-gray-700 leading-relaxed">
                Every plan includes 24/7 AI call answering, consultation booking into your calendar, instant text follow-up, consultation reminders, and a monthly report. Each plan also includes a monthly credit pool shared across calls, texts, and chat.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you charge per case or take a share of fees?</h3>
              <p className="text-gray-700 leading-relaxed">
                No. Boltcall is a flat monthly subscription. There are no per-case fees, no bonuses for signed cases, and no percentage of your fees.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is it appropriate for a law firm to use an AI intake agent?</h3>
              <p className="text-gray-700 leading-relaxed">
                You remain responsible for your own professional obligations, including your state bar's guidance on AI and call recording. Boltcall opens every call by saying it is an AI assistant and that the call is recorded, handles intake only, and never gives legal advice. See the <Link to="/law-firm-security" className="text-blue-600 hover:text-blue-700 underline">security page for law firms</Link> for how client information is handled.
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
                Starter includes the core AI intake receptionist, missed call text-back, instant lead reply, and consultation reminders. Pro adds a full lead follow-up system, SMS conversations, follow-ups after consultations, a website chat widget, custom AI voice and script, CRM and webhook integrations, and Google review request automation.
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
            The fastest way to see if Boltcall fits is to <Link to="/book-a-call" className="text-indigo-600 hover:text-indigo-700 underline font-medium">book a strategy call</Link> with our team and we'll walk through your current lead flow and show exactly what we'd automate. Prefer to self-serve? Start with the <Link to="/lead-response-scorecard" className="text-indigo-600 hover:text-indigo-700 underline">lead response scorecard</Link>, the <Link to="/ai-revenue-audit" className="text-indigo-600 hover:text-indigo-700 underline">AI revenue audit</Link>, or the <Link to="/lead-magnet/ai-receptionist-buyers-guide" className="text-indigo-600 hover:text-indigo-700 underline">AI Receptionist Buyer's Guide</Link>. Still researching? Read every <Link to="/comparisons" className="text-indigo-600 hover:text-indigo-700 underline">competitor comparison</Link>, browse our <Link to="/blog" className="text-indigo-600 hover:text-indigo-700 underline">blog</Link>, or skim the <Link to="/speed-to-lead" className="text-indigo-600 hover:text-indigo-700 underline">speed-to-lead guide</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;

