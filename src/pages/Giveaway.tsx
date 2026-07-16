import React, { useEffect, useState } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { Facebook, Check, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GiveawayMultiStepForm } from '@/components/ui/giveaway-multistep-form';
import AnimatedNumberCountdown from '@/components/ui/countdown-number';

// 2026-07-27 14:00 Israel time (UTC+3)
const GIVEAWAY_ENDS_AT = new Date('2026-07-27T11:00:00Z');

const GiveawayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showSurvey, setShowSurvey] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fixed giveaway deadline — same instant for every visitor (11 days from 2026-07-16)
  const endDate = GIVEAWAY_ENDS_AT;

  useEffect(() => {
    document.title = 'The Boltcall Launch Giveaway | Boltcall';
    updateMetaDescription('Boltcall is live. To celebrate, win a full AI audit of your business, a free branded Smart Website, and a complete speed-to-lead setup with AI receptionist and SMS follow-up.');
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Giveaway", "item": "https://boltcall.org/giveaway"}]});
    document.head.appendChild(bcScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);
  const [referralLink, setReferralLink] = useState('');
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState({
    name: '',
    email: '',
    companyName: '',
    website: '',
    whyChoose: '',
    referralSource: ''
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

  const generateReferralLink = (userId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://boltcall.org';
    return `${baseUrl}/giveaway?ref=${userId}`;
  };
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://boltcall.org/giveaway';
  const shareText = encodeURIComponent("Boltcall just launched and they're giving away a full AI setup — if either of us wins, we both win! Join here:");
  const encodedUrl = encodeURIComponent(shareUrl);
  const twitterHref = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;


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
                  The Boltcall Launch Giveaway
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                  <span className="text-blue-500">AI Audit</span> <span className="text-white">+</span> <span className="text-blue-500">Smart Website</span>
                  <br />
                  <span className="text-white">+</span> <span className="text-blue-500">Full Speed-to-Lead Setup</span>
                </h1>
              </div>

              <p className="mt-10 text-white text-base md:text-lg leading-6 max-w-md">
                One winner gets a full <span className="text-blue-500">AI audit</span> of their business, a free <span className="text-blue-500">branded Smart Website</span>, and a complete <span className="text-blue-500">speed-to-lead system</span> set up for them — AI receptionist, SMS follow-up, and more.
              </p>

              {/* Prize highlights */}
              <ul className="mt-6 space-y-3 text-white/90 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Full AI audit of your business — see exactly where leads leak and what to automate</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Free branded Smart Website — designed, built, and launched for you</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>AI receptionist answering every call 24/7 — set up and configured for your business</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Instant SMS follow-up to every missed call and form lead</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-brand-blue" strokeWidth={2.5} />
                  <span>Full speed-to-lead system — booking, follow-ups, and every lead answered instantly</span>
                </li>
              </ul>
            </div>

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
                  <p className="uppercase tracking-widest text-xs text-white/80 mb-4">Giveaway ends in:</p>
                  <div className="mt-4 scale-[0.87]">
                    <AnimatedNumberCountdown
                      endDate={endDate}
                      className="[&_span]:text-white/80 [&_div]:text-white"
                    />
                  </div>

                  {Date.now() < endDate.getTime() ? (
                    <button
                      onClick={() => setShowSurvey(true)}
                      className="mt-8 inline-flex items-center justify-center px-6 py-3 bg-white text-brand-blue font-semibold rounded-md shadow hover:bg-gray-50 transition-colors"
                    >
                      Enter Giveaway
                    </button>
                  ) : (
                    <p className="mt-8 text-white font-semibold">This giveaway has ended. The winner is being notified by email.</p>
                  )}

                  <div className="my-8 h-px w-40 bg-white/30 mx-auto" />

                  <div className="text-sm md:text-base opacity-90">Share the giveaway on your socials for a higher chance to win!</div>
                  <div className="mt-4 flex items-center justify-center gap-2.5 px-2">
                    <a
                      href={twitterHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share on X (Twitter)"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5" fill="currentColor" strokeWidth={2.5}><path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.29l-5.486-7.163-6.272 7.163H1.223l7.73-8.833L.75 2.25h6.043l4.957 6.51 6.494-6.51zm-1.158 19.5h1.833L7.01 3.89H5.048l12.038 17.86z" /></svg>
                    </a>
                    <a
                      href={facebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share on Facebook"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <Facebook className="w-3 h-3" strokeWidth={2.5} />
                    </a>
                    <a
                      href={linkedinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share on LinkedIn"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <Linkedin className="w-3 h-3" strokeWidth={2.5} />
                    </a>
                  </div>

                  <div className="my-8 h-px w-40 bg-white/30 mx-auto" />

                  <div className="text-sm opacity-90">Send the post to this email: <a href="mailto:noamj@boltcall.org" className="underline hover:opacity-80">noamj@boltcall.org</a></div>

                  <p className="mt-10 text-xs text-white/80">©{new Date().getFullYear()} Boltcall</p>
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
                      <GiveawayMultiStepForm
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
                              whyChoose: surveyData.whyChoose || surveyData['referralSource'],
                              allowNotifications: allowNotifications,
                              referralId: referralId
                            };

                            const response = await fetch('/.netlify/functions/giveaway-entry', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(payload),
                            });

                            const responseData = await response.json().catch(() => null);

                            if (!response.ok) {
                              throw new Error(responseData?.error || `Failed to submit form: ${response.status}`);
                            }

                            if (responseData?.id) {
                              setReferralLink(generateReferralLink(String(responseData.id)));
                              setIsSubmitted(true);
                            } else {
                              console.error('No referral ID in response:', responseData);
                              setReferralLink('');
                              setIsSubmitted(true);
                            }
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
                        className="text-center space-y-6"
                      >
                        <div className="mb-4">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
                          <p className="text-white/90">
                            Your entry has been submitted successfully. We'll be in touch soon!
                          </p>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4 border border-white/30">
                          <p className="text-sm font-medium mb-3">Your Referral Link</p>
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              readOnly
                              value={referralLink}
                              className="flex-1 px-3 py-2 rounded-md bg-white/10 border border-white/30 text-white text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(referralLink);
                                // You could add a toast notification here
                              }}
                              className="px-4 py-2 bg-white text-brand-blue font-semibold rounded-md hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-base text-white/90 mt-2 font-medium">
                            Share this link with a friend. If one of you wins, you both win a prize
                          </p>
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

      {/* Winner selection transparency */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-2 pb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">How the winner is selected</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xl mx-auto">
            One winner is chosen at random from all valid entries after the countdown ends. Sharing your referral link earns bonus entries — each friend who enters through your link gives you an extra chance to win. The winner is notified by email within 48 hours of the draw.
          </p>
        </div>
      </div>

      {/* Internal navigation links */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-3 text-sm text-gray-500 justify-center">
          <span className="font-semibold text-gray-800 mr-1">Explore Boltcall:</span>
          <Link to="/pricing" className="hover:text-gray-900 underline">Pricing</Link>
          <span>·</span>
          <Link to="/features/ai-receptionist" className="hover:text-gray-900 underline">AI Receptionist</Link>
          <span>·</span>
          <Link to="/blog" className="hover:text-gray-900 underline">Blog</Link>
          <span>·</span>
          <Link to="/challenge" className="hover:text-gray-900 underline">Break Our AI Challenge</Link>
        </div>
      </div>

      {/* Why Enter section */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Why Enter the Boltcall Launch Giveaway?</h2>
        <p className="text-gray-600 mb-4 leading-relaxed">
          Boltcall is officially live, and we're celebrating the launch by giving one local business owner
          the full Boltcall treatment: a complete AI audit of their business,
          a free branded Smart Website, and the entire speed-to-lead system set up for them — AI receptionist,
          SMS lead follow-up, and automated appointment booking.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The AI receptionist answers 100% of calls 24/7, qualifies leads automatically, and sends follow-up texts
          to every missed caller. Setup is done for you. No contracts, no credit card required — just enter
          your details and you're in.
        </p>
      </section>

      {/* Risk Reversal */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Common Questions About the Giveaway</h2>
        <div className="space-y-4">
          {[
            { q: 'Is there any catch?', a: 'No purchase required. No credit card. The winner gets the AI audit, the branded Smart Website, and the full speed-to-lead setup completely free.' },
            { q: 'How is the winner selected?', a: 'One winner is chosen at random from all valid entries after the countdown ends. We notify the winner by email within 48 hours of the draw.' },
            { q: 'What happens after I win?', a: 'We build everything for you — the audit, the website, and the full setup. Nothing is auto-billed and no subscription is auto-started.' },
          ].map((item) => (
            <div key={item.q} className="py-3 border-b border-gray-100 last:border-0">
              <p className="font-semibold text-gray-800 mb-1">{item.q}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GiveawayPage;
