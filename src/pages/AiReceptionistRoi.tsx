// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Phone,
  DollarSign,
  Calculator,
  Mail,
  User,
  Loader2,
  Shield,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  ChevronRight,
  Building2,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';

// ── Calculator inputs ───────────────────────────────────────────────────────
interface RoiInputs {
  missedCallsPerWeek: number;
  avgCustomerValue: number;
  currentReceptionistCost: number;
}

interface RoiResults {
  missedCallsPerMonth: number;
  revenueRecoveredPerMonth: number;
  revenueRecoveredPerYear: number;
  costSavingsPerMonth: number;
  totalMonthlyGain: number;
  totalAnnualGain: number;
  aiCostPerMonth: number;
  netMonthlyROI: number;
  roiMultiple: number;
}

// ── Business type options ───────────────────────────────────────────────────
const businessTypes = [
  'Plumber',
  'Dentist',
  'HVAC',
  'Real Estate',
  'Law Firm',
  'Medical Practice',
  'Auto Repair',
  'Salon / Spa',
  'Roofing',
  'Electrician',
  'Accounting',
  'Other',
];

// ── Main Component ──────────────────────────────────────────────────────────
const AiReceptionistRoi: React.FC = () => {
  const [inputs, setInputs] = useState<RoiInputs>({
    missedCallsPerWeek: 10,
    avgCustomerValue: 500,
    currentReceptionistCost: 0,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'AI Receptionist ROI Calculator | Boltcall';
    updateMetaDescription(
      'Calculate how much revenue your business loses to missed calls. Free AI receptionist ROI calculator shows potential savings and recovered revenue.'
    );

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/ai-receptionist-roi';

    // Add BreadcrumbList JSON-LD
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "AI Receptionist ROI Calculator", "item": "https://boltcall.org/ai-receptionist-roi" }
      ]
    });
    document.head.appendChild(breadcrumbScript);


    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => {
      document.getElementById('person-schema')?.remove();
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
      const bc = document.getElementById('breadcrumb-jsonld');
      if (bc) bc.remove();
    };
  }, []);

  // ── Calculation logic ───────────────────────────────────────────────────
  const calculateROI = (): RoiResults => {
    const missedCallsPerMonth = inputs.missedCallsPerWeek * 4.33;
    const conversionRate = 0.25; // 25% of missed calls would have converted
    const aiCaptureRate = 0.70; // AI captures 70% of missed calls
    const aiCostPerMonth = 179; // Boltcall Pro plan

    const recoveredCalls = missedCallsPerMonth * aiCaptureRate;
    const recoveredBookings = recoveredCalls * conversionRate;
    const revenueRecoveredPerMonth = recoveredBookings * inputs.avgCustomerValue;
    const revenueRecoveredPerYear = revenueRecoveredPerMonth * 12;

    // Cost savings: if they have a receptionist, AI replaces ~50% of that cost
    const costSavingsPerMonth = inputs.currentReceptionistCost * 0.5;

    const totalMonthlyGain = revenueRecoveredPerMonth + costSavingsPerMonth;
    const totalAnnualGain = totalMonthlyGain * 12;
    const netMonthlyROI = totalMonthlyGain - aiCostPerMonth;
    const roiMultiple = aiCostPerMonth > 0 ? totalMonthlyGain / aiCostPerMonth : 0;

    return {
      missedCallsPerMonth: Math.round(missedCallsPerMonth),
      revenueRecoveredPerMonth: Math.round(revenueRecoveredPerMonth),
      revenueRecoveredPerYear: Math.round(revenueRecoveredPerYear),
      costSavingsPerMonth: Math.round(costSavingsPerMonth),
      totalMonthlyGain: Math.round(totalMonthlyGain),
      totalAnnualGain: Math.round(totalAnnualGain),
      aiCostPerMonth,
      netMonthlyROI: Math.round(netMonthlyROI),
      roiMultiple: Number(roiMultiple.toFixed(1)),
    };
  };

  const results = calculateROI();

  const handleCalculate = () => {
    if (inputs.missedCallsPerWeek <= 0 || inputs.avgCustomerValue <= 0) {
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleUnlockFullReport = () => {
    setShowEmailGate(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsSubmitting(true);

    try {
      await fetch('https://n8n.srv974118.hstgr.cloud/webhook/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source: 'ai-receptionist-roi',
          businessType: businessType || 'Not specified',
          missedCallsPerWeek: inputs.missedCallsPerWeek,
          avgCustomerValue: inputs.avgCustomerValue,
          currentReceptionistCost: inputs.currentReceptionistCost,
          calculatedResults: results,
        }),
      });
    } catch (err) {
      console.error('Webhook error:', err);
    }

    setIsSubmitting(false);
    setShowEmailGate(false);
    setShowResults(true);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // ── Animation variants ────────────────────────────────────────────────────
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <div className="min-h-screen bg-white font-['Poppins']">
      <GiveawayBar />
      <Header />

      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-[#DDE2EE] pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6"
            >
              <Calculator className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-medium text-[#2563EB]">Free ROI Calculator</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0B1220] leading-tight mb-6"
            >
              How Much Revenue Are You{' '}
              <span className="text-[#2563EB]">Losing to Missed Calls?</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
            >
              Enter 3 numbers. See exactly how much an AI receptionist could save your business
              every month.
            </motion.p>

            {/* Trust indicators */}
            <motion.div
              variants={fadeInUp}
              className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2563EB]" />
                <span>Takes 30 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#2563EB]" />
                <span>Instant preview</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefit-Focused Bullets */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
          <ul className="space-y-3">
            {[
              "Recover $50K+ annually by capturing missed calls",
              "Book appointments 24/7 without hiring extra staff",
              "Respond to every lead in under 60 seconds — automatically",
              "Reduce no-shows with automated SMS reminders",
              "Free up your team to focus on high-value work",
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Calculator Section ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="bg-white border-2 border-[#0B1220] rounded-2xl p-8 md:p-10 shadow-[6px_6px_0px_0px_#0B1220]"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-[#0B1220] mb-8 text-center">
                  Calculate Your ROI
                </h2>

                <div className="space-y-8">
                  {/* Input 1: Missed calls */}
                  <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-[#0B1220] mb-3">
                      <Phone className="w-5 h-5 text-[#2563EB]" />
                      How many calls do you miss per week?
                    </label>
                    <input
                      type="number"
                      value={inputs.missedCallsPerWeek}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          missedCallsPerWeek: parseInt(e.target.value) || 0,
                        }))
                      }
                      min="0"
                      className="w-full px-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium text-lg"
                      placeholder="e.g. 10"
                    />
                    <p className="text-sm text-gray-500 mt-1.5">
                      Include after-hours, lunch breaks, and busy periods
                    </p>
                  </div>

                  {/* Input 2: Average customer value */}
                  <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-[#0B1220] mb-3">
                      <DollarSign className="w-5 h-5 text-[#2563EB]" />
                      Average value per customer ($)
                    </label>
                    <input
                      type="number"
                      value={inputs.avgCustomerValue}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          avgCustomerValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min="0"
                      step="50"
                      className="w-full px-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium text-lg"
                      placeholder="e.g. 500"
                    />
                    <p className="text-sm text-gray-500 mt-1.5">
                      What a typical customer pays over their lifetime
                    </p>
                  </div>

                  {/* Input 3: Current receptionist cost */}
                  <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-[#0B1220] mb-3">
                      <Building2 className="w-5 h-5 text-[#2563EB]" />
                      Current monthly receptionist cost ($)
                    </label>
                    <input
                      type="number"
                      value={inputs.currentReceptionistCost}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          currentReceptionistCost: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min="0"
                      step="100"
                      className="w-full px-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium text-lg"
                      placeholder="$0 if no receptionist"
                    />
                    <p className="text-sm text-gray-500 mt-1.5">
                      Enter $0 if you don't currently have one
                    </p>
                  </div>

                  {/* Calculate button */}
                  <button
                    onClick={handleCalculate}
                    className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-semibold text-lg px-8 py-4 rounded-lg border-2 border-[#0B1220] shadow-[4px_4px_0px_0px_#0B1220] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                  >
                    Calculate My ROI
                    <Calculator className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Preview Results Section ───────────────────────────────────── */}
      {showPreview && !showEmailGate && !showResults && (
        <section ref={resultsRef} className="py-16 md:py-24 bg-gradient-to-b from-white to-[#DDE2EE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-3xl mx-auto"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl md:text-4xl font-bold text-[#0B1220] text-center mb-12"
              >
                Your ROI Preview
              </motion.h2>

              {/* Preview cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <motion.div
                  variants={fadeInUp}
                  className="bg-white border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-red-500 mb-1">
                    {results.missedCallsPerMonth}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Calls missed/month</div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-[#2563EB] mb-1">
                    {formatCurrency(results.revenueRecoveredPerMonth)}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Revenue recovered/month</div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-500 mb-1">
                    {formatCurrency(results.totalAnnualGain)}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Potential annual gain</div>
                </motion.div>
              </div>

              {/* Blurred teaser + CTA */}
              <motion.div variants={fadeInUp} className="relative">
                {/* Blurred preview of full report */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 blur-[3px] select-none pointer-events-none">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Net Monthly ROI</div>
                      <div className="text-2xl font-bold text-gray-300">$X,XXX</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">ROI Multiple</div>
                      <div className="text-2xl font-bold text-gray-300">XX.Xx</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Cost Savings</div>
                      <div className="text-2xl font-bold text-gray-300">$X,XXX/mo</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Break-Even</div>
                      <div className="text-2xl font-bold text-gray-300">X days</div>
                    </div>
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <button
                      onClick={handleUnlockFullReport}
                      className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-semibold text-lg px-8 py-4 rounded-lg border-2 border-[#0B1220] shadow-[4px_4px_0px_0px_#0B1220] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                    >
                      Unlock Full Report
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-sm text-gray-500 mt-3">
                      Enter your email to get the complete breakdown
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ─── Email Gate Section ────────────────────────────────────────── */}
      {showEmailGate && !showResults && (
        <section ref={resultsRef} className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg mx-auto"
            >
              <div className="bg-white border-2 border-[#0B1220] rounded-2xl p-8 md:p-10 shadow-[6px_6px_0px_0px_#0B1220] text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-6"
                >
                  <Calculator className="w-10 h-10 text-[#2563EB]" />
                </motion.div>

                <h2 className="text-2xl md:text-3xl font-bold text-[#0B1220] mb-3">
                  Your Full ROI Report is Ready
                </h2>
                <p className="text-gray-600 mb-8">
                  Get your complete ROI breakdown with net savings, ROI multiple, and recommendations.
                </p>

                <form onSubmit={handleSubmitEmail} className="space-y-4">
                  {/* Name */}
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium placeholder:text-gray-400"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium placeholder:text-gray-400"
                    />
                  </div>

                  {/* Business Type */}
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border-2 border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-[#0B1220] font-medium appearance-none bg-white"
                    >
                      <option value="">Select business type</option>
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || !name.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-semibold text-lg px-8 py-4 rounded-lg border-2 border-[#0B1220] shadow-[4px_4px_0px_0px_#0B1220] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_#0B1220]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get My Full Report
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-xs text-gray-400">No spam. Unsubscribe anytime.</p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ─── Full Results Section ──────────────────────────────────────── */}
      {showResults && (
        <section ref={resultsRef} className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-3xl mx-auto"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl md:text-4xl font-bold text-[#0B1220] text-center mb-4"
              >
                Your Complete ROI Breakdown
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-gray-600 text-center mb-12 text-lg"
              >
                Here is what an AI receptionist could mean for your business.
              </motion.p>

              {/* Main stats */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <motion.div
                  variants={fadeInUp}
                  className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] text-white"
                >
                  <div className="text-sm font-medium text-blue-200 mb-1">Revenue Recovered / Month</div>
                  <div className="text-4xl font-bold">{formatCurrency(results.revenueRecoveredPerMonth)}</div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] text-white"
                >
                  <div className="text-sm font-medium text-emerald-200 mb-1">Net Monthly ROI</div>
                  <div className="text-4xl font-bold">{formatCurrency(results.netMonthlyROI)}</div>
                </motion.div>
              </div>

              {/* Detail grid */}
              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                  <div className="text-sm text-gray-500 mb-1">Missed Calls / Month</div>
                  <div className="text-2xl font-bold text-[#0B1220]">{results.missedCallsPerMonth}</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                  <div className="text-sm text-gray-500 mb-1">ROI Multiple</div>
                  <div className="text-2xl font-bold text-[#2563EB]">{results.roiMultiple}x</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                  <div className="text-sm text-gray-500 mb-1">Cost Savings / Month</div>
                  <div className="text-2xl font-bold text-[#0B1220]">{formatCurrency(results.costSavingsPerMonth)}</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                  <div className="text-sm text-gray-500 mb-1">Annual Gain</div>
                  <div className="text-2xl font-bold text-emerald-500">{formatCurrency(results.totalAnnualGain)}</div>
                </div>
              </motion.div>

              {/* Assumptions note */}
              <motion.div
                variants={fadeInUp}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-12"
              >
                <p className="text-sm text-gray-600">
                  <strong>Assumptions:</strong> 25% of missed calls would have converted, AI captures 70% of
                  missed calls, Boltcall Pro at $179/mo, 50% receptionist cost reduction. Actual results vary by industry.
                </p>
              </motion.div>

              {/* CTA */}
              <motion.div variants={fadeInUp} className="text-center">
                <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] border-2 border-[#0B1220] rounded-2xl p-8 md:p-12 shadow-[6px_6px_0px_0px_#0B1220]">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    Ready to Stop Losing {formatCurrency(results.revenueRecoveredPerMonth)}/mo?
                  </h3>
                  <p className="text-blue-100 mb-8 text-lg">
                    Get an AI receptionist that answers 100% of calls, books appointments, and
                    captures every lead -- 24/7.
                  </p>
                  <a
                    href="/setup"
                    className="inline-flex items-center gap-2 bg-white text-[#2563EB] font-semibold text-lg px-8 py-4 rounded-lg border-2 border-[#0B1220] shadow-[4px_4px_0px_0px_#0B1220] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                  >
                    Get Started Free
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ─── Testimonials Section ─────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.p variants={fadeInUp} className="text-sm font-medium text-[#2563EB] uppercase tracking-wider mb-3">
              Real Results
            </motion.p>
            <motion.h3 variants={fadeInUp} className="text-2xl md:text-3xl font-bold text-[#0B1220]">
              What business owners say after switching to AI
            </motion.h3>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "We were missing 15–20 calls a week during busy season. After switching to Boltcall, every call gets answered and we've booked an extra $8,000 in jobs in the first month.",
                name: "Derek M.",
                role: "Plumbing & Drain, Ohio",
                result: "+$8K/mo",
              },
              {
                quote: "I thought a $179/month AI receptionist was expensive — until I realized I was losing $3,000+ per week in missed calls. The ROI calculator was an eye-opener.",
                name: "Sandra L.",
                role: "HVAC Company Owner, Arizona",
                result: "23x ROI",
              },
              {
                quote: "Patients calling after hours used to hit voicemail and call our competitor. Now they get booked automatically. Our no-show rate dropped by 40% too.",
                name: "Dr. Kevin P.",
                role: "Dental Practice, Florida",
                result: "40% fewer no-shows",
              },
            ].map((item) => (
              <motion.div
                key={item.name}
                variants={fadeInUp}
                className="bg-white border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220] flex flex-col"
              >
                <div className="flex-1">
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
                </div>
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0B1220]">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.role}</p>
                  </div>
                  <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {item.result}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How AI Captures Missed Revenue ───────────────────────────── */}
      <section className="py-16 md:py-20 bg-[#F8FAFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.h3 variants={fadeInUp} className="text-2xl md:text-3xl font-bold text-[#0B1220] text-center mb-10">
              How an AI receptionist turns missed calls into booked revenue
            </motion.h3>
            <div className="space-y-5">
              {[
                {
                  step: '01',
                  title: 'Answers every call — 24/7, even on weekends',
                  desc: 'Most local businesses miss 40–60% of calls outside business hours. An AI receptionist answers instantly, any time of day, with zero hold time.',
                },
                {
                  step: '02',
                  title: 'Qualifies the caller and captures their details',
                  desc: 'The AI asks the right questions, captures name, contact info, and service need — turning anonymous callers into real leads in your CRM.',
                },
                {
                  step: '03',
                  title: 'Books appointments directly on your calendar',
                  desc: 'Callers get booked in real time without waiting for a callback. No back-and-forth, no missed opportunities — just confirmed appointments.',
                },
                {
                  step: '04',
                  title: 'Sends automated follow-up to reduce no-shows',
                  desc: 'Reminder texts and confirmation messages keep booked customers from forgetting or going to a competitor before their appointment.',
                },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  variants={fadeInUp}
                  className="flex gap-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0B1220] mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Social Proof Section ──────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-[#DDE2EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-medium text-[#2563EB] uppercase tracking-wider mb-4"
            >
              Why It Matters
            </motion.p>
            <motion.h3
              variants={fadeInUp}
              className="text-2xl md:text-3xl font-bold text-[#0B1220] mb-12"
            >
              The cost of missed calls is real
            </motion.h3>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  stat: '62%',
                  label: 'of calls go unanswered',
                  description: 'outside business hours — every one is potential revenue walking out the door',
                  icon: Phone,
                },
                {
                  stat: '$50K+',
                  label: 'recovered annually',
                  description: 'by businesses that stop missing calls — with AI answering 24/7',
                  icon: TrendingUp,
                },
                {
                  stat: '391%',
                  label: 'more leads converted',
                  description: 'when you respond within 1 minute — AI makes sub-1-minute response automatic',
                  icon: Zap,
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  className="bg-white border-2 border-[#0B1220] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0B1220]"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                    {React.createElement(item.icon, {
                      className: 'w-6 h-6 text-[#2563EB]',
                    })}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-[#2563EB] mb-1">
                    {item.stat}
                  </div>
                  <div className="text-base font-semibold text-[#0B1220] mb-2">{item.label}</div>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Objection Handling ───────────────────────────────────────── */}
      <section id="objections" className="py-16 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-2xl md:text-3xl font-bold text-[#0B1220] mb-2 text-center"
            >
              Common Questions About ROI Calculations
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-gray-500 text-center mb-10"
            >
              Real answers to the questions we hear most before businesses get started.
            </motion.p>
            <motion.div variants={fadeInUp} className="space-y-3">
              {[
                {
                  q: 'Are these ROI estimates accurate for my business?',
                  a: 'All calculations use conservative industry averages. Your actual results may be higher. Numbers are based on MIT speed-to-lead research and BrightLocal missed call data.',
                },
                {
                  q: 'What if my average job value is lower?',
                  a: 'The calculator lets you input your own numbers. Even at $150/job, recovering 8 missed calls/month = $1,200 in monthly revenue recovered.',
                },
                {
                  q: 'How long until I see results?',
                  a: 'Most businesses see measurable improvement within the first 30 days — starting from the first calls handled by AI.',
                },
                {
                  q: "What if AI can't handle my industry's calls?",
                  a: 'Boltcall is trained on local service business call patterns. You customize the script for your specific services.',
                },
                {
                  q: 'Is the $297/month worth it?',
                  a: "If the calculator shows you're losing even $1,000/month in missed calls, the math is clear. Most users recover their subscription cost in the first week.",
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden"
                >
                  <summary
                    className="font-semibold text-gray-900 px-5 py-4 cursor-pointer"
                    style={{ listStyle: 'none' }}
                  >
                    {q}
                  </summary>
                  <p className="text-gray-600 px-5 pb-4 text-sm">{a}</p>
                </details>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* ROI Calculation Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Receptionist ROI Calculator: Worked Examples</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Real numbers showing how quickly Boltcall pays for itself across different business types</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Business</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Missed Calls/Mo</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Avg. Job Value</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Revenue Recovered/Mo</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">ROI at $179/mo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['HVAC contractor', '13', '$850', '$3,315', '18.5x'],
                  ['Dental practice', '10', '$680', '$2,040', '11.4x'],
                  ['Plumbing company', '15', '$420', '$1,890', '10.6x'],
                  ['Law firm (intake)', '17', '$2,400', '$12,240', '68x'],
                  ['Roofing company', '10', '$9,200', '$27,600', '154x'],
                  ['Med spa', '12', '$380', '$1,368', '7.6x'],
                ].map(([biz, missed, value, recovered, roi]) => (
                  <tr key={biz} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{biz}</td>
                    <td className="px-4 py-3 text-gray-600">{missed}</td>
                    <td className="px-4 py-3 text-gray-600">{value}</td>
                    <td className="px-4 py-3 text-gray-600">{recovered}</td>
                    <td className="px-4 py-3 text-indigo-700 font-bold bg-indigo-50/30">{roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Revenue recovered assumes 30% of missed calls convert to booked jobs. Based on Boltcall customer data.</p>
        </div>
      </section>

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

export default AiReceptionistRoi;
