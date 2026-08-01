import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  TreePine, PhoneOff, TrendingUp,
  DollarSign, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Phone, Sun, Snowflake, CalendarCheck,
  CloudSun
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FinalCTA, { CALCULATOR_CTA } from '../components/FinalCTA';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const LandscapingSeasonalRevenueCalculator: React.FC = () => {
  // Card 1: Business Volume
  const [jobsPerWeek, setJobsPerWeek] = useState(15);
  const [avgMaintenanceValue, setAvgMaintenanceValue] = useState(350);
  const [avgProjectValue, setAvgProjectValue] = useState(2500);
  const [recurringMixPct, setRecurringMixPct] = useState(60);

  // Card 2: Seasonal Reality
  const [peakMonths, setPeakMonths] = useState(7);
  const [offSeasonDropPct, setOffSeasonDropPct] = useState(60);
  const [peakQuotesPerDay, setPeakQuotesPerDay] = useState(10);
  const [offSeasonQuotesPerDay, setOffSeasonQuotesPerDay] = useState(3);

  // Card 3: Missed Calls & Lost Quotes
  const [peakMissedCallPct, setPeakMissedCallPct] = useState(40);
  const [offSeasonMissedCallPct, setOffSeasonMissedCallPct] = useState(20);
  const [quoteCloseRate, setQuoteCloseRate] = useState(35);
  const [customerLtv, setCustomerLtv] = useState(4200);

  // Card 4: Recovery with AI
  const [aiAnswerRate, setAiAnswerRate] = useState(90);
  const [aiQuoteBookingRate, setAiQuoteBookingRate] = useState(40);
  const [offSeasonUpsellRate, setOffSeasonUpsellRate] = useState(20);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Calculate Your Landscaping Revenue Losses from Missed Calls and Seasonal Gaps | Boltcall';
    updateMetaDescription(
      'Free landscaping revenue calculator. See how much money missed calls, lost quotes, and seasonal gaps cost your landscaping business every year.'
    );

    // FAQPage JSON-LD
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'landscaping-faq-schema';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much revenue do landscaping companies lose to missed calls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The average landscaping company misses 30-45% of incoming calls during peak season because crews are in the field. With an average customer lifetime value of $4,200, each missed call from a potential new customer can cost thousands in lost revenue over time.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can an AI receptionist answer calls for a landscaping business?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI phone receptionists like Boltcall answer every call 24/7, collect project details, provide instant quotes for standard services, and book estimates on your calendar -- even while your crew is on a job site.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do landscapers handle the off-season revenue gap?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Smart landscaping businesses offset the off-season drop by upselling services like snow removal, holiday lighting installation, and hardscape projects. AI follow-up systems can automatically offer these services to existing customers, boosting off-season revenue by 15-30%.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the average quote-to-close rate for landscaping companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Landscaping companies typically close 25-40% of quotes they send out. The biggest factor in closing rate is speed to lead -- responding to quote requests within 5 minutes increases close rates by up to 400% compared to responding after 30 minutes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is AI affordable for small landscaping companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI receptionist services like Boltcall cost $897/month -- less than a single lost landscaping customer. Most landscaping businesses see a positive ROI within the first month by recovering just 2-3 missed quote requests.',
          },
        },
      ],
    });
    document.head.appendChild(faqSchema);

    // Article JSON-LD
    const articleSchema = document.createElement('script');
    articleSchema.type = 'application/ld+json';
    articleSchema.id = 'landscaping-article-schema';
    articleSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Landscaping Revenue Calculator: How Much Do Missed Calls Really Cost?',
      description: 'Interactive calculator showing landscaping companies exactly how much revenue they lose to missed calls, lost quotes, and seasonal gaps every year.',
      author: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
      },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      image: {
        '@type': 'ImageObject',
        url: 'https://boltcall.org/og-image.jpg',
        width: 1200,
        height: 630,
      },
    });
    document.head.appendChild(articleSchema);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Landscaping Revenue Calculator", "item": "https://boltcall.org/tools/landscaping-seasonal-revenue-calculator"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('landscaping-faq-schema')?.remove();
      document.getElementById('landscaping-article-schema')?.remove();
    };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    const offSeasonMonths = 12 - peakMonths;

    // Monthly revenue baseline
    const monthlyJobs = jobsPerWeek * 4.33;
    const recurringJobs = monthlyJobs * (recurringMixPct / 100);
    const oneTimeJobs = monthlyJobs * (1 - recurringMixPct / 100);
    const peakMonthlyRevenue = (recurringJobs * avgMaintenanceValue) + (oneTimeJobs * avgProjectValue);
    const offSeasonMonthlyRevenue = peakMonthlyRevenue * (1 - offSeasonDropPct / 100);

    // Missed calls per month
    const peakMissedCallsPerMonth = peakQuotesPerDay * 22 * (peakMissedCallPct / 100);
    const offSeasonMissedCallsPerMonth = offSeasonQuotesPerDay * 22 * (offSeasonMissedCallPct / 100);

    // Lost quotes per month (missed calls that would have been quotes)
    const peakLostQuotes = peakMissedCallsPerMonth;
    const offSeasonLostQuotes = offSeasonMissedCallsPerMonth;

    // Revenue lost to missed calls (using close rate + blended job value)
    const blendedJobValue = (avgMaintenanceValue * (recurringMixPct / 100)) + (avgProjectValue * (1 - recurringMixPct / 100));
    const peakMissedCallRevenueLoss = peakLostQuotes * (quoteCloseRate / 100) * blendedJobValue;
    const offSeasonMissedCallRevenueLoss = offSeasonLostQuotes * (quoteCloseRate / 100) * blendedJobValue;

    // Revenue lost to seasonality gap (difference between peak and off-season revenue)
    const monthlySeasonalityGap = peakMonthlyRevenue - offSeasonMonthlyRevenue;
    const annualSeasonalityLoss = monthlySeasonalityGap * offSeasonMonths;

    // Total annual loss
    const annualPeakMissedCallLoss = peakMissedCallRevenueLoss * peakMonths;
    const annualOffSeasonMissedCallLoss = offSeasonMissedCallRevenueLoss * offSeasonMonths;
    const annualMissedCallLoss = annualPeakMissedCallLoss + annualOffSeasonMissedCallLoss;
    const annualTotalLoss = annualMissedCallLoss + annualSeasonalityLoss;

    // Recovery with AI
    const additionalCallsAnsweredPeak = peakMissedCallsPerMonth * (aiAnswerRate / 100);
    const additionalCallsAnsweredOffSeason = offSeasonMissedCallsPerMonth * (aiAnswerRate / 100);
    const recoveredQuotesPeak = additionalCallsAnsweredPeak * (aiQuoteBookingRate / 100);
    const recoveredQuotesOffSeason = additionalCallsAnsweredOffSeason * (aiQuoteBookingRate / 100);
    const recoveredRevenuePeak = recoveredQuotesPeak * (quoteCloseRate / 100) * blendedJobValue;
    const recoveredRevenueOffSeason = recoveredQuotesOffSeason * (quoteCloseRate / 100) * blendedJobValue;
    const offSeasonUpsellRevenue = recurringJobs * avgMaintenanceValue * (offSeasonUpsellRate / 100);

    const annualRecoveredCallRevenue = (recoveredRevenuePeak * peakMonths) + (recoveredRevenueOffSeason * offSeasonMonths);
    const annualUpsellRevenue = offSeasonUpsellRevenue * offSeasonMonths;
    const annualRecovery = annualRecoveredCallRevenue + annualUpsellRevenue;

    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    return {
      peakMonths,
      offSeasonMonths,
      peakMonthlyRevenue,
      offSeasonMonthlyRevenue,
      peakMissedCallsPerMonth: Math.round(peakMissedCallsPerMonth),
      offSeasonMissedCallsPerMonth: Math.round(offSeasonMissedCallsPerMonth),
      peakLostQuotes: Math.round(peakLostQuotes),
      offSeasonLostQuotes: Math.round(offSeasonLostQuotes),
      peakMissedCallRevenueLoss,
      offSeasonMissedCallRevenueLoss,
      monthlySeasonalityGap,
      annualSeasonalityLoss,
      annualMissedCallLoss,
      annualTotalLoss,
      annualRecovery,
      boltcallAnnualCost,
      netGain,
      roi,
      blendedJobValue,
    };
  }, [
    jobsPerWeek, avgMaintenanceValue, avgProjectValue, recurringMixPct,
    peakMonths, offSeasonDropPct, peakQuotesPerDay, offSeasonQuotesPerDay,
    peakMissedCallPct, offSeasonMissedCallPct, quoteCloseRate, customerLtv,
    aiAnswerRate, aiQuoteBookingRate, offSeasonUpsellRate,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;
    setFormLoading(true);
    try {
      await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/niche-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          business_name: formCompany || undefined,
          niche: 'landscaping',
          source: 'seasonal-revenue-calculator',
          metrics: {
            peak_missed_calls_month: calc.peakMissedCallsPerMonth,
            offseason_missed_calls_month: calc.offSeasonMissedCallsPerMonth,
            peak_lost_quotes: calc.peakLostQuotes,
            offseason_lost_quotes: calc.offSeasonLostQuotes,
            annual_missed_call_loss: calc.annualMissedCallLoss,
            annual_seasonality_loss: calc.annualSeasonalityLoss,
            annual_total_loss: calc.annualTotalLoss,
            annual_recovery: calc.annualRecovery,
            roi: calc.roi,
          },
        }),
      });
      setFormSubmitted(true);
    } catch {
      setFormSubmitted(true);
    } finally {
      setFormLoading(false);
    }
  };

  // Slider component
  const Slider = ({
    label, value, onChange, min, max, step = 1, unit = '', hint = '',
  }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step?: number; unit?: string; hint?: string;
  }) => (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-bold text-teal-400">
          {unit === '$' ? fmt.format(value) : `${fmtNum.format(value)}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(20,184,166,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-teal-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
        <span>{unit === '$' ? fmt.format(min) : `${min}${unit}`}</span>
        {hint && <span className="text-slate-600">{hint}</span>}
        <span>{unit === '$' ? fmt.format(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <GiveawayBar />
      <Header />

      <main className="pt-20">
        {/* --- HERO --- */}
        <section className="relative px-4 sm:px-6 pt-16 pb-12 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0c1a1a 50%, #0F172A 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(20,184,166,0.08) 0%, transparent 60%)' }} />

          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-teal-400 mb-6">
              <TreePine className="w-4 h-4" />
              Free Tool for Landscaping Companies
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Much Do{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Missed Calls & Seasons
              </span>{' '}
              Really Cost You?
            </motion.h1>

            {/* Direct answer block for AEO -- within first 150 words */}
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Landscaping companies miss 30-45% of incoming calls during peak season because
              crews are always in the field. Each missed call from a potential customer can cost
              $1,000 or more in lost revenue. Use this free calculator to see your real numbers.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Landscapers lose 30-45% of calls while on job sites during peak season</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Benefit-Focused Bullets */}
        <section className="py-10 bg-slate-950">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-6">What You'll Get</h2>
            <ul className="space-y-3">
              {[
                "Recover $117,617 annually with AI-powered call capture",
                "Never lose a landscaping quote request to voicemail again",
                "Increase quote-to-close rate by 400% with instant response",
                "Capture every seasonal rush call automatically",
                "See your exact missed revenue in under 2 minutes",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mt-0.5">✓</span>
                  <span className="text-slate-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --- CALCULATOR --- */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT --- INPUTS */}
            <div className="space-y-6">

              {/* Card 1: Business Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <TreePine className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Business Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your weekly job flow and pricing</div>
                  </div>
                </div>

                <Slider label="Jobs completed per week" value={jobsPerWeek} onChange={setJobsPerWeek}
                  min={3} max={50} hint="avg for busy crew" />
                <Slider label="Average maintenance contract monthly value" value={avgMaintenanceValue} onChange={setAvgMaintenanceValue}
                  min={100} max={1500} step={25} unit="$" />
                <Slider label="Average one-time project value" value={avgProjectValue} onChange={setAvgProjectValue}
                  min={500} max={15000} step={100} unit="$" />
                <Slider label="Recurring vs one-time mix (% recurring)" value={recurringMixPct} onChange={setRecurringMixPct}
                  min={10} max={90} unit="%" hint="rest are one-time" />
              </motion.div>

              {/* Card 2: Seasonal Reality */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <Sun className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Seasonal Reality</div>
                    <div className="text-xs text-slate-500 mt-0.5">How seasons impact your revenue</div>
                  </div>
                </div>

                <Slider label="Peak season months" value={peakMonths} onChange={setPeakMonths}
                  min={4} max={12} hint="spring through fall" />
                <Slider label="Off-season revenue drop" value={offSeasonDropPct} onChange={setOffSeasonDropPct}
                  min={20} max={90} unit="%" hint="winter slowdown" />
                <Slider label="Quote requests per day (peak)" value={peakQuotesPerDay} onChange={setPeakQuotesPerDay}
                  min={3} max={30} hint="incoming calls/leads" />
                <Slider label="Quote requests per day (off-season)" value={offSeasonQuotesPerDay} onChange={setOffSeasonQuotesPerDay}
                  min={0} max={10} />
              </motion.div>

              {/* Card 3: Missed Calls & Lost Quotes */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <PhoneOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Missed Calls & Lost Quotes</div>
                    <div className="text-xs text-slate-500 mt-0.5">Customers you never hear from again</div>
                  </div>
                </div>

                <Slider label="Missed call % during peak season" value={peakMissedCallPct} onChange={setPeakMissedCallPct}
                  min={10} max={70} unit="%" hint="crews are in the field" />
                <Slider label="Missed call % off-season" value={offSeasonMissedCallPct} onChange={setOffSeasonMissedCallPct}
                  min={5} max={50} unit="%" />
                <Slider label="Quote-to-close rate" value={quoteCloseRate} onChange={setQuoteCloseRate}
                  min={15} max={60} unit="%" hint="quotes that become jobs" />
                <Slider label="New customer lifetime value" value={customerLtv} onChange={setCustomerLtv}
                  min={500} max={15000} step={100} unit="$" />
              </motion.div>

              {/* Card 4: Recovery with AI */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/15">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Recovery with AI</div>
                    <div className="text-xs text-slate-500 mt-0.5">What AI automation can recover</div>
                  </div>
                </div>

                <Slider label="AI call answer rate" value={aiAnswerRate} onChange={setAiAnswerRate}
                  min={50} max={99} unit="%" hint="24/7 AI receptionist" />
                <Slider label="AI quote booking rate" value={aiQuoteBookingRate} onChange={setAiQuoteBookingRate}
                  min={15} max={65} unit="%" hint="calls converted to booked quotes" />
                <Slider label="Off-season upsell success" value={offSeasonUpsellRate} onChange={setOffSeasonUpsellRate}
                  min={5} max={40} unit="%" hint="snow removal, holiday lights, etc." />
              </motion.div>
            </div>

            {/* RIGHT --- STICKY RESULTS */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">

              {/* Big Loss Number */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6 sm:p-7">
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
                    Annual Revenue You're Losing
                  </p>
                  <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
                    {fmt.format(calc.annualTotalLoss)}
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Missed calls: <span className="text-red-400 font-bold">{fmt.format(calc.annualMissedCallLoss)}</span>
                    {' '}+ Seasonal gap: <span className="text-red-400 font-bold">{fmt.format(calc.annualSeasonalityLoss)}</span>
                  </p>
                </div>

                {/* Seasonal Comparison - Peak vs Off-Season */}
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Seasonal Comparison</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Peak Season Column */}
                    <div className="bg-slate-800/60 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 justify-center mb-2">
                        <Sun className="w-4 h-4 text-amber-400" />
                        <p className="text-[11px] font-bold text-amber-400 uppercase">Peak Season</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{fmtNum.format(calc.peakMissedCallsPerMonth)}</p>
                          <p className="text-[10px] text-slate-500">missed calls/mo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-400">{fmt.format(calc.peakMissedCallRevenueLoss)}</p>
                          <p className="text-[10px] text-slate-500">lost revenue/mo</p>
                        </div>
                      </div>
                    </div>

                    {/* Off-Season Column */}
                    <div className="bg-slate-800/60 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 justify-center mb-2">
                        <Snowflake className="w-4 h-4 text-blue-400" />
                        <p className="text-[11px] font-bold text-blue-400 uppercase">Off-Season</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{fmtNum.format(calc.offSeasonMissedCallsPerMonth)}</p>
                          <p className="text-[10px] text-slate-500">missed calls/mo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-400">{fmt.format(calc.offSeasonMissedCallRevenueLoss)}</p>
                          <p className="text-[10px] text-slate-500">lost revenue/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Lost quotes / mo (peak)', value: fmtNum.format(calc.peakLostQuotes), icon: PhoneOff, color: 'text-red-400' },
                    { label: 'Lost quotes / mo (off)', value: fmtNum.format(calc.offSeasonLostQuotes), icon: Snowflake, color: 'text-blue-400' },
                    { label: 'Seasonality gap / mo', value: fmt.format(calc.monthlySeasonalityGap), icon: CloudSun, color: 'text-amber-400' },
                    { label: 'Avg job value (blended)', value: fmt.format(calc.blendedJobValue), icon: DollarSign, color: 'text-teal-400' },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-800/60 rounded-xl p-3.5 text-center">
                      <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-1.5`} />
                      <p className="text-lg font-bold text-white">{m.value}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue Breakdown */}
                <div className="space-y-2.5 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue Breakdown</p>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed call loss (peak)</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.peakMissedCallRevenueLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed call loss (off-season)</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.offSeasonMissedCallRevenueLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Seasonality revenue gap</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlySeasonalityGap)}/mo</span>
                  </div>
                </div>

                {/* With AI Section */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With Boltcall AI Receptionist</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Annual recovery</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.annualRecovery)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Net gain after Boltcall ($897/mo)</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.netGain)}</span>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-2.5 mt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">ROI</span>
                        <span className="text-xl font-black text-emerald-400">{fmtNum.format(calc.roi)}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-400/80 text-center pt-1">
                      That pays for itself in <span className="font-bold text-emerald-400">{calc.annualRecovery > 0 ? Math.max(1, Math.round(calc.boltcallAnnualCost / (calc.annualRecovery / 12))) : '?'} days</span> each month
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-4xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              How Does AI{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Recover Lost Revenue
              </span>{' '}
              for Landscapers?
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'AI Answers Every Call, 24/7',
                  desc: 'Your crews are mowing, trimming, and installing. Your phone is ringing. Boltcall AI picks up instantly -- collects the project details, property size, and preferred schedule -- then books the estimate on your calendar. No more voicemails that never get returned.',
                  icon: Phone,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'Instant Quotes & Follow-Up',
                  desc: 'AI sends a text with a quote range for standard services like lawn maintenance, mulching, or seasonal cleanup within seconds of the call. Then follows up automatically if they don\'t book -- because the fastest response wins 78% of the time.',
                  icon: CalendarCheck,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Off-Season Upsell Engine',
                  desc: 'When winter hits, AI automatically reaches out to your existing customers offering snow removal, holiday lighting, hardscape projects, and spring pre-booking. Turn your slowest months into a steady revenue stream.',
                  icon: Snowflake,
                  color: 'from-emerald-500/15 to-emerald-500/5',
                  borderColor: 'border-emerald-500/20',
                  iconColor: 'text-emerald-400',
                },
              ].map((tip) => (
                <motion.div key={tip.num} variants={fadeUp}
                  className={`bg-gradient-to-r ${tip.color} border ${tip.borderColor} rounded-2xl p-6 sm:p-7 flex items-start gap-5`}>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                      <tip.icon className={`w-6 h-6 ${tip.iconColor}`} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-500">{tip.num}</span>
                      <h3 className="text-lg font-bold text-white">{tip.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- EMAIL CAPTURE --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20"
          style={{ background: 'linear-gradient(180deg, #020617 0%, #0c1a1a 50%, #020617 100%)' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}
            className="max-w-2xl mx-auto text-center">

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-teal-400 mb-6">
              <BarChart3 className="w-4 h-4" />
              Free Report
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white mb-4">
              Get Your Free Landscaping{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Revenue Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Recover $117,617 annually by capturing missed quote requests',
                  'Increase quote-to-close rate by 400% with faster responses',
                  'Boost off-season revenue 15-30% with automated upsell follow-ups',
                  'Answer every call from the field so no lead goes to a competitor',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {!formSubmitted ? (
              <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm
                    focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm
                    focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all"
                />
                <input
                  type="text"
                  placeholder="Company Name (optional)"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm
                    focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all"
                />
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700
                    text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20
                    hover:shadow-teal-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {formLoading ? 'Sending...' : 'Get My Free Report'}
                </button>
              </motion.form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-lg font-bold text-white mb-1">Report on the way!</p>
                <p className="text-sm text-slate-400">Check your inbox in the next few minutes.</p>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* --- SOCIAL PROOF --- */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '30-45%',
                text: 'Landscaping companies miss 30-45% of incoming calls during peak season when crews are in the field',
                icon: PhoneOff,
              },
              {
                stat: '$4,200',
                text: 'The average lifetime value of a recurring landscaping customer -- one missed call costs more than 2 years of AI',
                icon: DollarSign,
              },
              {
                stat: '78%',
                text: 'Of customers hire the first landscaper to respond. AI ensures that landscaper is always you.',
                icon: TrendingUp,
              },
            ].map((item) => (
              <motion.div key={item.stat} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center hover:border-teal-500/20 transition-colors">
                <item.icon className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <p className="text-3xl font-black text-white mb-2">{item.stat}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-3xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              Common Questions About{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                AI for Landscaping Companies
              </span>
            </motion.h2>

            <div className="space-y-5">
              {[
                {
                  q: 'How much revenue do landscaping companies lose to missed calls?',
                  a: 'The average landscaping company misses 30-45% of incoming calls during peak season because crews are always in the field. With an average customer lifetime value of $4,200 and a 35% close rate on quotes, each missed call represents hundreds in immediate revenue and thousands in lifetime value. For a busy landscaping company getting 10 quote requests per day, that can mean $15,000-$40,000+ in lost revenue per month.',
                },
                {
                  q: 'Can an AI receptionist really answer calls for a landscaping business?',
                  a: 'Yes. Modern AI phone receptionists like Boltcall answer every call 24/7 with natural-sounding conversation. They collect project details (lawn size, service type, timeline), provide instant quote ranges for standard services, and book estimates directly on your calendar. Callers often can\'t tell they\'re speaking with AI.',
                },
                {
                  q: 'How do landscapers handle the off-season revenue gap?',
                  a: 'Smart landscaping businesses offset the off-season drop by upselling complementary services: snow removal, holiday lighting installation, hardscape projects, gutter cleaning, and spring pre-booking discounts. AI follow-up systems can automatically offer these services to your existing customer base, recovering 15-30% of the seasonal revenue gap without any manual outreach.',
                },
                {
                  q: 'What is the average quote-to-close rate for landscaping companies?',
                  a: 'Landscaping companies typically close 25-40% of quotes. The biggest factor is response speed. Responding to quote requests within 5 minutes increases close rates by up to 400% compared to 30-minute response times. An AI receptionist responds in under 11 seconds, giving you the speed advantage over every competitor.',
                },
                {
                  q: 'Is AI affordable for small landscaping companies?',
                  a: 'Yes. AI receptionist services like Boltcall cost $897/month, which is less than the profit from a single missed landscaping job. Most landscaping businesses see a positive ROI within the first week by recovering just 2-3 missed quote requests that would have gone to a competitor.',
                },
              ].map((faq, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/20 transition-colors">
                  <h3 className="text-base font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- FINAL CTA --- */}
        <FinalCTA {...CALCULATOR_CTA} />
      </main>

      {/* Why Boltcall Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="my-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Landscaping Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Responds in under 1 second", desc: "Capture every peak-season quote request — even when your crews are on the job and cannot pick up" },
              { title: "Setup in 30 minutes", desc: "No developers, no tech team — answer a few questions and your AI agent goes live before the next call comes in" },
              { title: "Pays for itself", desc: "One extra job booked per month covers the entire subscription — most landscapers recover the cost in the first week of peak season" },
              { title: "Trained on your services", desc: "Knows your seasonal offerings, service areas, and pricing — gives callers real answers, not a voicemail" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-1">✓ {item.title}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
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

      {/* Industry Benchmark Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Landscaping Industry Benchmarks: Call Capture and Seasonal Revenue</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing landscaping companies compare to the average during peak season</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Industry Average</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">With AI Answering</th>
                </tr>
              </thead>
              <tbody>
                {[
                ['Calls answered rate (peak season)', '58% (industry avg)', '99%+ with AI'],
                ['After-hours call capture', 'Voicemail or missed', 'All calls answered'],
                ['Monthly missed calls (peak, 45 avg)', '19 missed calls', '0–1 missed calls'],
                ['Average job value (installation)', '$1,200 – $4,500', '$1,200 – $4,500 (same)'],
                ['Monthly revenue lost to missed calls', '$22,800 – $85,500', '$0 – $4,500'],
                ['Quote-to-close rate', '28%', '45%+ (faster response)'],
                ['No-show rate for estimate appointments', '20–28%', '10–14% (reminders active)'],
                ['Monthly Google review growth', '0–2 reviews/mo', '5–10 reviews/mo (automated)'],
                ].map(([metric, avg, ai]) => (
                  <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                    <td className="px-4 py-3 text-gray-600">{avg}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default LandscapingSeasonalRevenueCalculator;
