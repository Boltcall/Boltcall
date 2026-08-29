import React, { useEffect, lazy, Suspense } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import {
  SITE_DATE_PUBLISHED,
  SITE_DATE_MODIFIED,
  SITE_AGGREGATE_RATING,
  SITE_AUDIENCE,
  ORG_LOGO_URL,
} from '../lib/seoConstants';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LazySection from '../components/LazySection';
import BentoCard from '../components/ui/bento-card';
// ponytail: old interactive dashboard bento is parked in legacy-bento-card.tsx; swap the import if we want it back.

// Lazy load below-the-fold components to reduce initial bundle
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const FreeSetup = lazy(() => import('../components/FreeSetup'));
const Pricing = lazy(() => import('../components/Pricing'));
const IntegrationHero = lazy(() => import('../components/ui/integration-hero'));
const FAQ = lazy(() => import('../components/FAQ'));
const FinalCTA = lazy(() => import('../components/FinalCTA'));
const Footer = lazy(() => import('../components/Footer'));
const StickyScrollSection = lazy(() => import('../components/StickyScrollSection').then(module => ({ default: module.StickyScrollSection })));

const HOMEPAGE_AI_CONTEXT =
  'Instant lead response. Built to answer, qualify, and book law firm leads before they go cold. ' +
  'Boltcall is speed-to-lead software for law firms that cannot afford to let intake calls, web forms, missed calls, texts, or after-hours inquiries sit unanswered. ' +
  'When someone calls a law firm after an accident, an arrest, or a family emergency, they are usually calling more than one firm. The firm that responds first gets the best chance to sign the case. ' +
  'Instead of sending another passive notification into a CRM, Boltcall responds in seconds, captures the matter details, triages urgency, and moves the caller toward a booked consultation or a clean intake handoff. ' +
  'That makes it useful for personal injury, family law, criminal defense, immigration, and general practice firms where missed calls and slow follow-up turn paid demand into lost cases. It also serves other local service businesses (HVAC, plumbers, dentists, med spas) on the same core engine. ' +
  'Use Boltcall to protect the first minute of every lead: answer live calls, recover missed calls with follow-up, handle after-hours capture, and keep the next step clear for the caller and the intake team. ' +
  'The workflow is intentionally simple: a new inquiry comes in, Boltcall responds, asks the practical intake questions, and gives the caller a path forward instead of making them wait for office hours. ' +
  'The team sees the lead details in a cleaner format, so an intake coordinator, paralegal, or managing partner can step in with context instead of piecing together a voicemail, form note, and half-finished text thread. ' +
  'That speed-to-lead layer is most valuable when demand is already expensive to create. If you are buying Google Ads, running referral campaigns, or earning repeat calls from past clients, every delayed response wastes work you already paid for. ' +
  'Boltcall helps turn that demand into a signed case while the caller is still ready to act.';

const HOMEPAGE_AI_LINKS = [
  'https://boltcall.org/industries/lawyer-answering-service',
  'https://boltcall.org/blog/speed-to-lead-for-law-firms',
  'https://boltcall.org/blog/ai-receptionist-for-law-firms',
  'https://boltcall.org/tools/lawyer-intake-calculator',
  'https://boltcall.org/comparisons',
];

const Home: React.FC = () => {
  // Add smooth-scroll class to body for homepage
  useEffect(() => {
    document.body.classList.add('smooth-scroll');
    return () => {
      document.body.classList.remove('smooth-scroll');
    };
  }, []);

  useEffect(() => {
    document.title = 'Speed-to-Lead Software for Law Firms | Boltcall';
    updateMetaDescription('Boltcall is speed-to-lead software for law firms: instant intake response, missed-call recovery, AI qualification, consultation booking, and after-hours capture.');

    const speakableSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": document.title,
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".speakable-intro"]
      }
    };
    const speakableScript = document.createElement('script');
    speakableScript.type = 'application/ld+json';
    speakableScript.textContent = JSON.stringify(speakableSchema);
    document.head.appendChild(speakableScript);

    return () => { speakableScript.remove(); };
  }, []);

  useSchemaInjector([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Instant lead response",
      "url": "https://boltcall.org/",
      "headline": "Built to answer, qualify, and book law firm leads before they go cold",
      "description": HOMEPAGE_AI_CONTEXT,
      "abstract": HOMEPAGE_AI_CONTEXT,
      "about": [
        { "@type": "Thing", "name": "speed-to-lead software" },
        { "@type": "Thing", "name": "instant lead response" },
        { "@type": "Thing", "name": "missed-call recovery" },
        { "@type": "Thing", "name": "AI lead qualification" },
        { "@type": "Thing", "name": "law firm intake" }
      ],
      "significantLink": HOMEPAGE_AI_LINKS
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Boltcall?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall is speed-to-lead software for law firms. It uses AI to answer intake calls, recover missed calls, qualify leads, book consultations, and follow up automatically before callers move to a competing firm."
          }
        },
        {
          "@type": "Question",
          "name": "Is Boltcall an AI or a human answering service?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall is a fully automated AI service. There are no human receptionists involved. The platform uses conversational AI to answer calls, qualify leads, and book appointments automatically — 24 hours a day, 7 days a week, with no staffing costs or hold times."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Boltcall cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall starts at $549 per month for the Starter plan. The Pro plan is $897 per month. All plans include unlimited AI call answering, appointment booking, lead capture, and follow-up texts with no per-call fees. Enterprise pricing is available for multi-location businesses."
          }
        },
        {
          "@type": "Question",
          "name": "What types of businesses use Boltcall?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall serves local service businesses including HVAC companies, plumbers, dentists, law firms, med spas, roofing contractors, and solar installers. Any business that receives phone inquiries and needs to respond quickly benefits from Boltcall's speed-to-lead automation."
          }
        },
        {
          "@type": "Question",
          "name": "How does the speed-to-lead system work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall's speed-to-lead system automatically responds to every new lead within seconds — answering calls, replying to web form submissions, and sending follow-up texts without any human action required. Research shows the first business to respond wins the customer 78% of the time. Boltcall makes that response automatic and instant, even at 2am on weekends."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Boltcall",
      "url": "https://boltcall.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/logo.png"
      },
      "description": "Speed-to-lead software for local service businesses. Boltcall answers calls, recovers missed calls, books appointments, and captures after-hours leads automatically.",
      "sameAs": [
        "https://www.linkedin.com/company/boltcall"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "url": "https://boltcall.org/book-a-call"
      },
      "knowsAbout": ["speed to lead", "AI receptionist", "lead capture", "appointment booking", "local service businesses"]
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Boltcall",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Speed-to-Lead Software",
      "operatingSystem": "Web",
      "url": "https://boltcall.org",
      "inLanguage": "en-US",
      "description": "Speed-to-lead software that answers calls, recovers missed calls, qualifies leads, books appointments, and sends follow-up texts for local service businesses.",
      "image": ORG_LOGO_URL,
      "offers": {
        "@type": "Offer",
        "price": "549",
        "priceCurrency": "USD",
        "priceValidUntil": "2027-01-01",
        "url": "https://boltcall.org/pricing",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": SITE_AGGREGATE_RATING.ratingValue,
        "reviewCount": SITE_AGGREGATE_RATING.reviewCount,
        "bestRating": SITE_AGGREGATE_RATING.bestRating,
        "worstRating": SITE_AGGREGATE_RATING.worstRating
      },
      "audience": {
        "@type": "BusinessAudience",
        "audienceType": Array.from(SITE_AUDIENCE).join(', ')
      },
      "featureList": [
        "24/7 AI call answering",
        "Instant lead reply (under 11 seconds)",
        "Appointment booking into Google/Outlook/Cal.com",
        "Missed call text-back",
        "SMS follow-up sequences",
        "Multilingual support (English + Spanish)",
        "CRM integration (Clio, MyCase, Jobber, ServiceTitan, HouseCallPro)"
      ],
      "datePublished": SITE_DATE_PUBLISHED,
      "dateModified": SITE_DATE_MODIFIED
    }
  ]);

  return (
    <div className="relative bg-brand-blue">
      {/* Content */}
      <div className="relative z-10 pt-32">
        <Header />
        <main className="pb-0">
          <Hero />

          {/* Boltcall Platform Preview — interactive dark bento card */}
          <section className="relative z-[2] mt-4 px-4 py-8 sm:-mt-[360px] sm:px-8 lg:px-16">
            <BentoCard />
          </section>

          {/* HowItWorks — first below-fold section, preload aggressively */}
          <div id="how-it-works" className="relative">
            <LazySection rootMargin="500px" minHeight="600px">
              <Suspense fallback={<div className="min-h-[600px]" />}>
                <HowItWorks />
              </Suspense>
            </LazySection>
          </div>

          {/* StickyScrollSection — "Why Businesses Choose BoltCall", visible on all breakpoints */}
          <div className="relative z-[1]">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="h-[400px] w-full" />}>
                <StickyScrollSection />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative">
            <LazySection rootMargin="400px" minHeight="500px">
              <Suspense fallback={<div className="min-h-[500px]" />}>
                <FreeSetup />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="min-h-[400px]" />}>
                <IntegrationHero />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative">
            <LazySection rootMargin="400px" minHeight="600px">
              <Suspense fallback={<div className="min-h-[600px]" />}>
                <Pricing />
              </Suspense>
            </LazySection>
          </div>

          {/* How Boltcall compares — internal-link section, added 2026-08-29 per
              SEO audit. Homepage was 25 of 31 total site clicks; the 6 compare
              pages all rank top-10 with 0% CTR. Cheapest path to a second
              traffic cluster is linking them from the highest-authority page.
              ponytail: plain <section> with 6 links, no new component. */}
          <section className="relative bg-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-950 mb-3">
                  How Boltcall compares
                </h2>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                  Weighing Boltcall against another platform? Here's the honest read on how each stacks up for law firm intake and speed-to-lead response.
                </p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { slug: 'boltcall-vs-podium', name: 'Podium', angle: 'The speed-to-lead alternative to an all-in-one comms hub.' },
                  { slug: 'boltcall-vs-gohighlevel', name: 'GoHighLevel', angle: 'A simpler speed-to-lead alternative to a full CRM stack.' },
                  { slug: 'boltcall-vs-smith-ai', name: 'Smith.ai', angle: 'AI legal intake at a fraction of the per-call cost.' },
                  { slug: 'boltcall-vs-birdeye', name: 'Birdeye', angle: 'Speed-to-lead vs reputation-management focus — which wins.' },
                  { slug: 'boltcall-vs-goodcall', name: 'GoodCall', angle: 'AI receptionist head-to-head for law firms.' },
                  { slug: 'boltcall-vs-lindy', name: 'Lindy', angle: 'Purpose-built intake vs a generalist AI assistant.' },
                ].map((c) => (
                  <li key={c.slug}>
                    <a
                      href={`/compare/${c.slug}/`}
                      className="block h-full rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-500 hover:shadow-md transition"
                    >
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-lg font-semibold text-gray-950">Boltcall vs {c.name}</span>
                        <span className="text-xs font-medium text-blue-600" aria-hidden="true">→</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-snug">{c.angle}</p>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-center mt-6 text-sm">
                <a href="/comparisons/" className="text-blue-600 hover:text-blue-700 font-medium">
                  See all comparisons →
                </a>
              </p>
            </div>
          </section>

          <div className="relative bg-white -mb-16">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="min-h-[400px]" />}>
                <FAQ />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative bg-white">
            <LazySection rootMargin="400px" minHeight="300px">
              <Suspense fallback={<div className="min-h-[300px]" />}>
                <FinalCTA />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="min-h-[400px]" />}>
                <Footer />
              </Suspense>
            </LazySection>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
