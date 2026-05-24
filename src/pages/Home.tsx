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
import AnswerBlock from '../components/seo/AnswerBlock';

// Lazy load below-the-fold components to reduce initial bundle
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const FreeSetup = lazy(() => import('../components/FreeSetup'));
const Testimonials = lazy(() => import('../components/Testimonials'));
const Pricing = lazy(() => import('../components/Pricing'));
const IntegrationHero = lazy(() => import('../components/ui/integration-hero'));
const FAQ = lazy(() => import('../components/FAQ'));
const FinalCTA = lazy(() => import('../components/FinalCTA'));
const Footer = lazy(() => import('../components/Footer'));
const StickyScrollSection = lazy(() => import('../components/StickyScrollSection').then(module => ({ default: module.StickyScrollSection })));

const Home: React.FC = () => {
  // Add smooth-scroll class to body for homepage
  useEffect(() => {
    document.body.classList.add('smooth-scroll');
    return () => {
      document.body.classList.remove('smooth-scroll');
    };
  }, []);

  useEffect(() => {
    document.title = 'AI Receptionist: 24/7 Booking & Lead Capture | Boltcall';
    updateMetaDescription('Never miss a call or lead. AI receptionist answers 24/7, books appointments instantly, captures leads automatically. Start free today.');

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
            "text": "Boltcall is a fully automated AI receptionist and speed-to-lead platform for local service businesses. Boltcall uses AI — not human receptionists — to answer every call 24/7, book appointments instantly, capture leads, and send follow-up text messages automatically."
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
      "description": "AI-powered speed-to-lead and receptionist platform for local service businesses. Answers every call 24/7, books appointments instantly, and captures leads automatically.",
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
      "description": "AI receptionist that answers calls 24/7, books appointments, captures leads, and sends follow-up texts for local service businesses.",
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

          {/* Direct-answer block — AIO/AI Mode citation chunk (May 2026 update response) */}
          <section className="relative z-[2] bg-white px-4 sm:px-8 lg:px-16 -mt-[120px] sm:-mt-[160px]">
            <AnswerBlock
              query="What is Boltcall"
              definition="Boltcall is a speed-to-lead AI receptionist platform that answers every inbound call in under 11 seconds, replies to web-form leads instantly by SMS, and books appointments directly into your calendar — 24/7, without a human receptionist."
              stat="Plans start at $549/month for unlimited AI call answering, automated reminders that cut no-shows by 40%, and post-job Google review requests; the average customer recovers the subscription cost in the first week from one captured after-hours lead."
              outcome="Local service businesses using Boltcall stop losing 30–40% of inbound leads that previously went to voicemail and win the race-to-respond against slower competitors."
              cta="Book a 15-minute setup call at boltcall.org/book-a-call."
            />
          </section>

          {/* Boltcall Platform Preview — interactive dark bento card */}
          <section className="hidden sm:block relative z-[2] py-8 px-4 sm:px-8 lg:px-16 -mt-[60px]">
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
            <LazySection rootMargin="400px" minHeight="320px">
              <Suspense fallback={<div className="min-h-[320px]" />}>
                <Testimonials />
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
