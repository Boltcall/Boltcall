import React, { useEffect, useState } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FreeWebsiteMultiStepForm } from '@/components/ui/free-website-multistep-form';
import AnimatedNumberCountdown from '@/components/ui/countdown-number';

const FreeWebsitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showSurvey, setShowSurvey] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Fixed end date (2 days from launch date - doesn't reset on deploy)
  // Update the launch date below to set when the offer started
  const [endDate] = useState(() => {
    // Set the launch date to when the offer started (update this date as needed)
    // The timer will always show 2 days from this fixed date
    const launchDate = new Date('2026-01-15T00:00:00Z'); // Update this to your launch date
    const endsAt = new Date(launchDate);
    endsAt.setDate(endsAt.getDate() + 2);
    return endsAt;
  });

  useEffect(() => {
    document.title = 'Free Professional Website for Law Firms — Delivered in 5 Days | Boltcall';
    updateMetaDescription('Fill out our form to get a free professional website for your business. Modern design, fast loading, and SEO optimized. Apply now.');

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Free Website", "item": "https://boltcall.org/free-website" },
      ],
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    return () => {
      document.getElementById('breadcrumb-schema')?.remove();
    };
  }, []);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState({
    name: '',
    email: '',
    companyName: '',
    website: ''
  });
  const [allowNotifications, setAllowNotifications] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wrapper function to handle partial form data updates
  const handleFormDataUpdate = (data: Record<string, string>) => {
    setSurveyData(prev => ({
      ...prev,
      ...data,
    }));
  };

  // Get referral ID from URL on mount
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferrerId(refParam);
    }
  }, [searchParams]);



  return (
    <div className="min-h-screen h-auto items-start justify-start bg-white">
      <header className="w-full py-8">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: 'easeOut' }}>
            <Link to="/" className="block">
              <img src="/boltcall_full_logo.png" alt="Boltcall" className="h-16 w-auto" width={160} height={64} loading="eager" decoding="async" />
            </Link>
          </motion.div>
        </div>
      </header>

        <motion.div className="max-w-4xl mx-auto px-4 pb-16" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-[0_35px_60px_-12px_rgba(0,0,0,0.6)]">
          {/* Left: dark panel */}
          <div className="bg-gray-900 text-white p-10 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-400 rounded-full -ml-[8px]">
                  NEW WEBSITE IN 24 HOURS
                </span>
                <h1 className="text-[calc(1.5rem*1.1)] md:text-[calc(1.875rem*1.1)] font-extrabold text-white leading-tight">
                  <span className="text-blue-500">Free Professional</span>
                  <br />
                  <span className="text-white">Website</span>
                </h1>
              </div>

              <p className="mt-10 text-white text-base md:text-lg leading-6 max-w-md">
                Get a <span className="text-blue-500">completely free</span> professional website <span className="text-blue-500">optimized</span> to help you attract more customers.
              </p>

              {/* Website highlights */}
              <ul className="mt-6 space-y-3 text-white/90 text-[calc(0.875rem*1.1)]">
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Never miss a revenue-generating call with AI Receptionist</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Build trust automatically with a steady stream of 5-star Google reviews</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Built to <a href="https://web.dev/vitals/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Google's Core Web Vitals</a> standards for fast loading and high performance</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Attract more customers with SEO optimization for Google ranking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Improve customer engagement with instant AI form responses</span>
                </li>
              </ul>
            </div>

            <p className="mt-8 text-xs text-white/50 leading-relaxed">
              Want to see how a great website boosts rankings? Read{' '}
              <a
                href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white/80 transition-colors"
              >
                Google's SEO Starter Guide
              </a>{' '}
              or browse{' '}
              <a
                href="https://www.capterra.com/website-builder-software/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white/80 transition-colors"
              >
                website builder reviews on Capterra
              </a>
              .
            </p>
            {/* Disclaimer removed per request */}
          </div>

          {/* Right: brand panel */}
          <div className="bg-gradient-to-b from-brand-blue to-brand-sky text-white p-10 md:p-12">
            <AnimatePresence mode="wait">
              {!showSurvey ? (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <p className="uppercase tracking-widest text-xs text-white/80 mb-4">Offer ends in:</p>
                  <div className="mt-4 scale-[0.87]">
                    <AnimatedNumberCountdown
                      endDate={endDate}
                      className="[&_span]:text-white/80 [&_div]:text-white"
                    />
                  </div>

                  <button
                    onClick={() => setShowSurvey(true)}
                    className="mt-8 inline-flex items-center justify-center px-6 py-3 bg-white text-brand-blue font-semibold rounded-md shadow hover:bg-gray-50 transition-colors"
                  >
                    Apply for Free Website
                  </button>

                  <div className="my-8 h-px w-40 bg-white/30 mx-auto" />

                  <p className="mt-10 text-xs text-white/80">©2026 Boltcall</p>
                </motion.div>
              ) : (
                <motion.div
                  key="survey"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex-1 giveaway-form">
                    {!isSubmitted ? (
                      <FreeWebsiteMultiStepForm
                        formData={surveyData}
                        setFormData={handleFormDataUpdate}
                        allowNotifications={allowNotifications}
                        setAllowNotifications={setAllowNotifications}
                        onSubmit={async () => {
                          setIsSubmitting(true);
                          try {
                            // Prepare data to send to webhook
                            const referralId = referrerId || '0';
                            const payload = {
                              name: surveyData.name,
                              email: surveyData.email,
                              companyName: surveyData.companyName,
                              website: surveyData.website,
                              allowNotifications: allowNotifications,
                              referralId: referralId
                            };

                            // Call webhook
                            const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/c4bc1f22-204e-40d1-be8d-fae0f36f3098', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(payload),
                            });

                            // Get response body first (can only read once)
                            const responseText = await response.text();
                            
                            // Check if response is ok
                            if (!response.ok) {
                              console.error('Response error:', responseText);
                              throw new Error(`Failed to submit form: ${response.status} ${response.statusText}`);
                            }

                            // Try to get referral ID from response header (may be blocked by CORS)
                            let referralIdFromHeader = null;
                            try {
                              referralIdFromHeader = response.headers.get('referal_id') || response.headers.get('referral_id');
                            } catch (e) {
                              // CORS may block header access
                            }
                            
                            // Parse response body - handle UUID string directly
                            let responseData = null;
                            let finalReferralId = referralIdFromHeader;
                            
                            if (!finalReferralId && responseText) {
                              const trimmedText = responseText.trim();
                              
                              // Check if response is a UUID string (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                              const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                              if (uuidPattern.test(trimmedText)) {
                                // Response is directly the UUID
                                finalReferralId = trimmedText;
                              } else {
                                // Try to parse as JSON
                                try {
                                  responseData = JSON.parse(trimmedText);
                                  // Try to extract ID from JSON object
                                  finalReferralId = responseData?.id || 
                                                    responseData?.referal_id || 
                                                    responseData?.referral_id ||
                                                    responseData?.userId ||
                                                    responseData?.user_id;
                                } catch (e) {
                                  // If it's not JSON and not UUID, check if it's a plain number/string ID
                                  if (trimmedText) {
                                    finalReferralId = trimmedText;
                                  } else {
                                    // Response is empty or invalid
                                  }
                                }
                              }
                            }
                            
                            // Form submitted successfully
                            setIsSubmitted(true);
                          } catch (error) {
                            console.error('Error submitting form:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Failed to submit form. Please try again.';
                            alert(errorMessage);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        isSubmitting={isSubmitting}
                        isSubmitted={isSubmitted}
                      />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6 flex flex-col justify-center h-full"
                      >
                        <div className="mb-4">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Application Received!</h3>
                          <p className="text-white/90">
                            Thank you for your interest! We'll review your application and get back to you soon.
                          </p>
                        </div>
                        <div className="mt-4">
                          <p className="text-white/90 mb-2">In the meantime...</p>
                          <a 
                            href="https://tryboltcall.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-6 py-3 bg-white text-brand-blue font-semibold rounded-md shadow hover:bg-gray-50 transition-colors"
                          >
                            View Demo
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </motion.div>

      {/* Benefit-Focused Bullets */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
          <ul className="space-y-3">
            {[
              "Attract more customers with a professional, fast-loading website",
              "Built-in lead capture forms that work 24/7",
              "Mobile-optimized design that ranks in local search",
              "Integrated with your AI receptionist from day one",
              "Launch-ready in 48 hours — no technical skills needed",
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Answer 5 questions about your business</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Fill out a short form with your business name, location, services, and a few details about how you want to present your brand online. No technical knowledge required — we take care of everything from here.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">2</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">We build your AI-powered site in 48 hours</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Our team designs a professional, mobile-optimized website tailored to your industry and service area. It's built to Google's Core Web Vitals standards, SEO-optimized for local search, and pre-connected to Boltcall's AI receptionist so you start capturing leads from day one.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">3</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">You review and approve — launch ready</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  We send you a preview link within 48 hours. Review the design, request any changes, and once you're happy, we point the site live to your domain. The entire process requires less than 15 minutes of your time, and you end up with a professional website that would normally cost thousands of dollars.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="social-proof" className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Trusted by Local Businesses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { stat: '500+', label: 'local businesses served' },
              { stat: '4.9/5', label: 'average rating' },
              { stat: '24hr', label: 'delivery time' },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-3xl font-extrabold text-blue-600 mb-1">{stat}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Money-back guarantee',
              'No setup fees',
              'SSL included',
            ].map((signal) => (
              <div key={signal} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal navigation links */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-xl shadow-sm px-6 py-4 flex flex-wrap gap-3 text-sm items-center">
          <span className="font-semibold text-gray-700 mr-1">Explore:</span>
          <Link to="/pricing" className="text-blue-600 hover:underline">Pricing Plans</Link>
          <span className="text-gray-300">·</span>
          <Link to="/features/ai-receptionist" className="text-blue-600 hover:underline">AI Receptionist</Link>
          <span className="text-gray-300">·</span>
          <Link to="/blog" className="text-blue-600 hover:underline">Blog</Link>
          <span className="text-gray-300">·</span>
          <Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
        </div>
      </section>
    </div>
  );
};

export default FreeWebsitePage;

