import React, { useEffect, lazy, Suspense } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import {
  SITE_DATE_PUBLISHED,
  SITE_DATE_MODIFIED,
  SITE_AUDIENCE,
  ORG_LOGO_URL,
} from '../lib/seoConstants';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LazySection from '../components/LazySection';
import BentoCard from '../components/ui/bento-card';
import { PRACTICE_AREAS } from '../data/practiceAreas';
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
  'The first firm to call a potential client back signs the case. Boltcall is speed-to-lead software for law firms: it answers every new inquiry by phone, text, and web form within seconds, 24/7, screens the matter, and books the consultation. ' +
  'When someone calls a law firm after an accident, an arrest, or a family emergency, they are usually calling more than one firm. The firm that responds first gets the best chance to sign the case. ' +
  'Instead of sending another passive notification into a CRM, Boltcall responds in seconds, captures the matter details, flags urgent matters, and moves the caller toward a booked consultation or a clean intake handoff. ' +
  'That makes it useful for personal injury, family law, criminal defense, immigration, estate planning, and general practice firms where missed calls and slow follow-up turn paid demand into lost cases. ' +
  'Boltcall handles intake only. It tells every caller it is an AI and that the call is recorded, and it never gives legal advice. ' +
  'The workflow is intentionally simple: a new inquiry comes in, Boltcall responds, asks the practical intake questions, and gives the caller a path forward instead of making them wait for office hours. ' +
  'The team sees the lead details in a cleaner format, so an intake coordinator, paralegal, or managing partner can step in with context instead of piecing together a voicemail, form note, and half-finished text thread. ' +
  'That speed-to-lead layer is most valuable when demand is already expensive to create. If you are buying Google Ads, running referral campaigns, or earning repeat calls from past clients, every delayed response wastes work you already paid for.';

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
    updateMetaDescription('The first firm to call back signs the case. Boltcall answers every new law firm inquiry in seconds, screens the matter, and books the consultation, 24/7.');

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
      "name": "Speed-to-lead software for law firms",
      "url": "https://boltcall.org/",
      "headline": "The first firm to call back signs the case",
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
            "text": "Boltcall is speed-to-lead software for law firms. It uses AI to answer intake calls, recover missed calls, screen new matters, and book consultations within seconds, before callers move to a competing firm."
          }
        },
        {
          "@type": "Question",
          "name": "Is Boltcall an AI or a human answering service?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall is a fully automated AI service. There are no human receptionists involved. Every call opens by telling the caller they are speaking with an AI assistant and that the call is recorded. It handles intake only and never gives legal advice."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Boltcall cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall starts at $549 per month for the Starter plan. The Pro plan is $897 per month and the Ultimate plan is $4,997 per month. Enterprise pricing is available for larger firms and multiple offices."
          }
        },
        {
          "@type": "Question",
          "name": "Which law firms is Boltcall built for?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall is built for solo practitioners and small to mid-size firms, including personal injury, family law, criminal defense, immigration, estate planning, and general practice. Any firm that receives new-client calls and needs to respond first benefits from automatic intake."
          }
        },
        {
          "@type": "Question",
          "name": "How does the speed-to-lead system work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall answers every new inquiry within seconds: picking up calls, replying to web forms, and texting follow-ups with no human action, including at 2am. It screens the matter, flags urgent ones, and books a consultation on your calendar."
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
      "description": "Speed-to-lead software for law firms. Boltcall answers new inquiries, recovers missed calls, books consultations, and captures after-hours leads automatically.",
      "sameAs": [
        "https://www.linkedin.com/company/boltcall"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "url": "https://boltcall.org/book-a-call"
      },
      "knowsAbout": ["speed to lead", "legal intake", "law firm lead capture", "consultation booking", "missed-call recovery"]
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
      "description": "Speed-to-lead software that answers calls, recovers missed calls, screens new matters, books consultations, and sends follow-up texts for law firms.",
      "image": ORG_LOGO_URL,
      "offers": {
        "@type": "Offer",
        "price": "549",
        "priceCurrency": "USD",
        "priceValidUntil": "2027-01-01",
        "url": "https://boltcall.org/pricing",
        "availability": "https://schema.org/InStock"
      },
      "audience": {
        "@type": "BusinessAudience",
        "audienceType": Array.from(SITE_AUDIENCE).join(', ')
      },
      "featureList": [
        "24/7 AI call answering",
        "Instant lead reply within seconds",
        "Consultation booking into Google Calendar and Cal.com",
        "Missed call text-back",
        "SMS follow-up sequences",
        "Multilingual support (English + Spanish)",
        "Zapier, Make, and webhook connections for case-management tools",
        "Discloses AI and call recording on every call"
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
          <section id="live-demo" className="relative z-[2] mt-4 scroll-mt-24 px-4 py-8 sm:-mt-[360px] sm:px-8 lg:px-16">
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
                  Intake that fits your practice area
                </h2>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                  A custody emergency, an arrest, and a will update need different questions. Boltcall asks the right ones for each, and never gives legal advice.
                </p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {PRACTICE_AREAS.map((area) => (
                  <li key={area.id}>
                    <a
                      href={`/industries/lawyer-answering-service#${area.id}`}
                      className="block h-full rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-500 hover:shadow-md transition"
                    >
                      <area.icon className="mb-3 h-5 w-5 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
                      <span className="block text-base font-semibold text-gray-950">{area.name}</span>
                      <p className="mt-1 text-sm text-gray-600 leading-snug">{area.short}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

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
                  { slug: 'boltcall-vs-smith-ai', name: 'Smith.ai', angle: 'Pure AI intake versus a hybrid human and AI service.' },
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
