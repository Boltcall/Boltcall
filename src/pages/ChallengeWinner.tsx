import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, CheckCircle, Globe, Phone, MapPin, Briefcase, MessageSquare, Zap, Bot, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BUSINESS_TYPES = [
  'HVAC',
  'Plumbing',
  'Dental Practice',
  'Law Firm',
  'Med Spa',
  'Landscaping / Lawn Care',
  'Roofing',
  'Electrical',
  'Cleaning Service',
  'Auto Repair',
  'Real Estate',
  'Chiropractic',
  'Veterinary',
  'Solar',
  'Other',
];

const ChallengeWinner: React.FC = () => {
  const navigate = useNavigate();

  const name = sessionStorage.getItem('challenge_name') || '';
  const email = sessionStorage.getItem('challenge_email') || '';
  const claimToken = sessionStorage.getItem('challenge_claim_token') || '';

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Redirect if they got here without winning
  useEffect(() => {
    if (!name || !email || !claimToken) {
      navigate('/challenge', { replace: true });
    }
  }, [name, email, claimToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessType) {
      setError('Business name and type are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      // Send winner details — uses the existing break-our-ai function or a simple email webhook
      const res = await fetch('/.netlify/functions/break-our-ai/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          businessName: businessName.trim(),
          businessType,
          websiteUrl: websiteUrl.trim(),
          phone: phone.trim(),
          city: city.trim(),
          biggestChallenge: biggestChallenge.trim(),
          claimToken,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const data: { error?: string } = res ? await res.json().catch(() => ({})) : {};
        throw new Error(data.error || 'Could not save your prize claim.');
      }

      setSubmitted(true);

      // Clean up sessionStorage
      sessionStorage.removeItem('challenge_name');
      sessionStorage.removeItem('challenge_email');
      sessionStorage.removeItem('challenge_winner_word');
      sessionStorage.removeItem('challenge_claim_token');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your prize claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main className="py-16 lg:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">

            {/* ── Prize form ─────────────────────────────────────────── */}
            {!submitted && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Winner header */}
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6 shadow-lg"
                  >
                    <Trophy className="w-10 h-10 text-white" />
                  </motion.div>

                  <h1 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-3">
                    You cracked it{name ? `, ${name}` : ''}!
                  </h1>
                  <p className="text-gray-600 max-w-md mx-auto">
                    You beat the AI. Now tell us about your business so we can build your free smart website.
                    Our team will have it ready within 24 hours.
                  </p>

                  <div className="mt-6 inline-flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
                    <Trophy className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-blue-800 font-semibold text-sm">Prize: Free Smart Website — $2,500 value</span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                    {[
                      { icon: Zap, label: 'Fast' },
                      { icon: BarChart3, label: 'Built for conversions' },
                      { icon: Phone, label: 'Speed to lead' },
                      { icon: Bot, label: 'AI chatbot' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                        <Icon className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business details form */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
                  <h2 className="text-lg font-bold text-[#0B1220] mb-1">Tell us about your business</h2>
                  <p className="text-gray-500 text-sm mb-8">
                    We need these details to build your website. The more you share, the better the result.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Business name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Acme Plumbing Co."
                          required
                          autoFocus
                          className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Business type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors bg-white"
                        >
                          <option value="">Select type...</option>
                          {BUSINESS_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          Current website URL
                          <span className="text-gray-400 font-normal">(optional)</span>
                        </span>
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yoursite.com"
                        className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            Business phone
                          </span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 555 000 0000"
                          className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            City and state
                          </span>
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Austin, TX"
                          className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          What is your biggest challenge right now?
                        </span>
                      </label>
                      <textarea
                        value={biggestChallenge}
                        onChange={(e) => setBiggestChallenge(e.target.value)}
                        placeholder="Not enough leads, website looks outdated, losing calls after hours..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none transition-colors resize-none"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        This helps us build a website that actually solves your problem, not just looks nice.
                      </p>
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0px_0px_#000] disabled:translate-x-0 disabled:translate-y-0"
                    >
                      {isSubmitting ? 'Claiming your prize...' : 'Claim My Free Website'}
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="text-center text-gray-400 text-xs">
                      We will contact you at {email} within 24 hours to get started.
                    </p>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── Thank you ─────────────────────────────────────────── */}
            {submitted && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-24 h-24 bg-green-500 rounded-full grid place-items-center mb-8 shadow-lg"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>

                <h1 className="text-3xl font-bold text-[#0B1220] mb-3">You are all set!</h1>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  We have your details. Our team will reach out to {email} within 24 hours to kick off your free smart website.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 w-full max-w-sm text-left space-y-3">
                  <p className="text-sm font-semibold text-gray-700">What happens next:</p>
                  {[
                    'We review your business details',
                    'We build your smart website: fast, built for conversions, with speed-to-lead and an AI chatbot',
                    'We send you a preview for feedback',
                    'You go live — no cost, no strings',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <a
                    href="/"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                  >
                    <Briefcase className="w-4 h-4" />
                    See Boltcall Features
                  </a>
                  <a
                    href="/challenge"
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg text-sm transition-colors"
                  >
                    Back to Challenge
                  </a>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChallengeWinner;
