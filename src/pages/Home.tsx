import React, { useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
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

// Lazy load below-the-fold components to reduce initial bundle
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const FreeSetup = lazy(() => import('../components/FreeSetup'));
const Pricing = lazy(() => import('../components/Pricing'));
const IntegrationHero = lazy(() => import('../components/ui/integration-hero'));
const FAQ = lazy(() => import('../components/FAQ'));
const FinalCTA = lazy(() => import('../components/FinalCTA'));
const Footer = lazy(() => import('../components/Footer'));
const StickyScrollSection = lazy(() => import('../components/StickyScrollSection').then(module => ({ default: module.StickyScrollSection })));

function HomepageSeoIntro() {
  return (
    <section className="relative z-[2] bg-white px-4 sm:px-8 lg:px-16 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 mb-3">Instant lead response</p>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5">
          Built to answer, qualify, and book local service leads before they go cold
        </h2>
        <div className="space-y-5 text-lg leading-8 text-gray-700">
          <p>
            Boltcall is speed-to-lead software for local service businesses that cannot afford to let phone calls, web forms,
            missed calls, texts, or after-hours inquiries sit unanswered. When a homeowner, patient, client, or property owner
            reaches out, they are usually comparing multiple providers at once. The business that responds first gets the best
            chance to earn the appointment, quote, consultation, or emergency job.
          </p>
          <p>
            Instead of sending another passive notification into a CRM, Boltcall responds in seconds, captures the customer
            need, qualifies urgency, and moves the lead toward booking or a clean team handoff. That makes it useful for HVAC
            companies, plumbers, dentists, law firms, med spas, roofers, solar teams, and other local service operators where
            missed calls and slow follow-up turn paid demand into lost revenue.
          </p>
          <p>
            Use Boltcall to protect the first minute of every lead: answer live calls, recover missed calls with follow-up,
            handle after-hours capture, and keep the next step clear for the customer and the team.
          </p>
          <p>
            The workflow is intentionally simple. A new inquiry comes in, Boltcall responds, asks the practical intake
            questions, and gives the customer a path forward instead of making them wait for office hours. The team sees the
            lead details in a cleaner format, so a dispatcher, front desk, owner, or intake coordinator can step in with
            context instead of piecing together a voicemail, form note, and half-finished text thread.
          </p>
          <p>
            That speed-to-lead layer is most valuable when demand is already expensive to create. If you are buying Google
            Ads, ranking in maps, running referral campaigns, or earning repeat calls from past customers, every delayed
            response wastes work you already paid for. Boltcall helps turn that demand into a real conversation while the
            buyer is still ready to act.
          </p>
        </div>
        <nav aria-label="Homepage SEO links" className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
          <Link to="/speed-to-lead" className="rounded-lg border border-blue-200 px-4 py-2 text-blue-700 hover:bg-blue-50">
            Speed-to-lead guide
          </Link>
          <Link to="/blog/top-10-ai-receptionist-agencies" className="rounded-lg border border-blue-200 px-4 py-2 text-blue-700 hover:bg-blue-50">
            Top AI receptionist agencies
          </Link>
          <Link to="/blog/hvac-ai-lead-response" className="rounded-lg border border-blue-200 px-4 py-2 text-blue-700 hover:bg-blue-50">
            HVAC AI lead response
          </Link>
          <Link to="/lead-response-scorecard" className="rounded-lg border border-blue-200 px-4 py-2 text-blue-700 hover:bg-blue-50">
            Lead response scorecard
          </Link>
          <Link to="/comparisons" className="rounded-lg border border-blue-200 px-4 py-2 text-blue-700 hover:bg-blue-50">
            Comparisons
          </Link>
        </nav>
      </div>
    </section>
  );
}

const Home: React.FC = () => {
  // Add smooth-scroll class to body for homepage
  useEffect(() => {
    document.body.classList.add('smooth-scroll');
    return () => {
      document.body.classList.remove('smooth-scroll');
    };
  }, []);

  useEffect(() => {
    document.title = 'Speed-to-Lead Software for Local Service Businesses | Boltcall';
    updateMetaDescription('Boltcall is speed-to-lead software for local service businesses: instant lead response, missed-call recovery, AI qualification, booking, and after-hours capture.');

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
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Boltcall?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Boltcall is speed-to-lead software for local service businesses. It uses AI to answer calls, recover missed calls, qualify leads, book appointments, and follow up automatically before buyers move to a competitor."
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
      "applicationSubCategory": "Speed-to-Lead / AI Receptionist",
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
          <HomepageSeoIntro />

          {/* Boltcall Platform Preview — interactive dark bento card */}
          <section className="hidden sm:block relative z-[2] py-8 px-4 sm:px-8 lg:px-16 -mt-[360px]">
            <BentoCard />
          </section>

          {/* HowItWorks — first below-fold section, preload aggressively */}
          <div id="how-it-works" className="relative mt-0 md:mt-0 md:top-[220px]">
            <LazySection rootMargin="500px" minHeight="600px">
              <Suspense fallback={<div className="min-h-[600px]" />}>
                <HowItWorks />
              </Suspense>
            </LazySection>
          </div>

          {/* StickyScrollSection — "Why Businesses Choose BoltCall", visible on all breakpoints */}
          <div className="relative z-[1] md:top-[400px]" style={{ minHeight: '400px' }}>
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="h-[400px] w-full" />}>
                <StickyScrollSection />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:mt-[600px]">
            <LazySection rootMargin="400px" minHeight="500px">
              <Suspense fallback={<div className="min-h-[500px]" />}>
                <FreeSetup />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:-top-[255px] md:mt-24">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="min-h-[400px]" />}>
                <IntegrationHero />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:-top-[255px] md:mt-24">
            <LazySection rootMargin="400px" minHeight="600px">
              <Suspense fallback={<div className="min-h-[600px]" />}>
                <Pricing />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:-top-[255px] bg-white -mb-16 md:-mb-16">
            <LazySection rootMargin="400px" minHeight="400px">
              <Suspense fallback={<div className="min-h-[400px]" />}>
                <FAQ />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:-top-[255px] bg-white">
            <LazySection rootMargin="400px" minHeight="300px">
              <Suspense fallback={<div className="min-h-[300px]" />}>
                <FinalCTA />
              </Suspense>
            </LazySection>
          </div>

          <div className="relative md:-top-[255px]">
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
