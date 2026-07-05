import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Sparkles, PhoneOff, TrendingUp,
  DollarSign, Users, Clock, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Calendar, Phone, RefreshCw, ShieldCheck, MessageSquare
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

const CleaningServiceBookingCalculator: React.FC = () => {
  // Card 1: Business Volume
  const [jobsPerWeek, setJobsPerWeek] = useState(20);
  const [avgResidentialValue, setAvgResidentialValue] = useState(180);
  const [avgCommercialValue, setAvgCommercialValue] = useState(450);
  const [commercialMixPct, setCommercialMixPct] = useState(25);

  // Card 2: Missed Opportunities
  const [inquiryCallsPerDay, setInquiryCallsPerDay] = useState(8);
  const [missedCallPct, setMissedCallPct] = useState(35);
  const [newCustomerInquiryPct, setNewCustomerInquiryPct] = useState(55);
  const [quoteToBookingPct, setQuoteToBookingPct] = useState(40);

  // Card 3: Cancellations & Recurring
  const [cancellationRatePct, setCancellationRatePct] = useState(12);
  const [recurringRetentionPct, setRecurringRetentionPct] = useState(70);
  const [recurringMonthlyValue, setRecurringMonthlyValue] = useState(360);
  const [monthsBeforeChurn, setMonthsBeforeChurn] = useState(8);

  // Card 4: Recovery with AI
  const [aiCallAnswerPct, setAiCallAnswerPct] = useState(90);
  const [aiBookingLiftPct, setAiBookingLiftPct] = useState(30);
  const [cancellationRecoveryPct, setCancellationRecoveryPct] = useState(45);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Cleaning Service Booking Calculator: Stop Losing Jobs (2026) | Boltcall';
    updateMetaDescription(
      'Free calculator for cleaning services. See how many bookings you lose to missed calls, cancellations, and client churn every month.'
    );

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Cleaning Service Booking Calculator: Stop Losing Jobs",
        "description": "Free calculator for cleaning services. See how many bookings you lose to missed calls, cancellations, and client churn every month.",
        "author": { "@type": "Organization", "name": "Boltcall" },
        "datePublished": "2026-04-01",
        "dateModified": "2026-04-01",
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg",
        "width": 1200,
        "height": 630
      },
        "publisher": {
          "@type": "Organization",
          "name": "Boltcall",
          "logo": { "@type": "ImageObject", "url": "https://boltcall.org/logo.png" }
        },
        "url": "https://boltcall.org/cleaning-service-booking-calculator",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://boltcall.org/cleaning-service-booking-calculator"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How many bookings do cleaning companies lose to missed calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The average cleaning company misses 30-40% of incoming calls because teams are on-site during business hours. With 55% of those calls being new customer inquiries, a typical cleaning business loses 25-50 potential bookings per month to unanswered phones."
            }
          },
          {
            "@type": "Question",
            "name": "Can AI answer calls for a cleaning service?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. AI receptionists answer every call 24/7, collect job details like property size and cleaning type, provide instant quotes based on your pricing, and book appointments directly into your calendar. Setup takes under 10 minutes."
            }
          },
          {
            "@type": "Question",
            "name": "How much does a missed call cost a cleaning business?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A single missed call from a new residential customer costs $180 on average for the initial job. If that customer becomes recurring at $360/month for 8 months, the true cost of one missed call is up to $3,060 in lifetime revenue."
            }
          },
          {
            "@type": "Question",
            "name": "How does AI reduce last-minute cancellations for cleaners?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AI sends automated reminders via text and voice 24 and 2 hours before each appointment. When a client cancels, the AI immediately contacts waitlisted customers and reschedules the slot, recovering 40-50% of last-minute cancellations."
            }
          },
          {
            "@type": "Question",
            "name": "What is the ROI of an AI receptionist for cleaning services?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most cleaning businesses see 500-2,000% ROI. At $897/month, Boltcall typically recovers $2,000-$8,000 in revenue that would otherwise be lost to missed calls, cancellations, and client churn. The system pays for itself within the first week."
            }
          }
        ]
      }
    ];

    const scripts = schemas.map(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => scripts.forEach(s => s.remove());
    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);


    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Cleaning Service Booking Calculator", "item": "https://boltcall.org/tools/cleaning-service-booking-calculator"}]});
    document.head.appendChild(bcScript);
    return () => { document.getElementById('person-schema')?.remove(); };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    // Weighted average job value
    const avgJobValue = avgResidentialValue * (1 - commercialMixPct / 100) + avgCommercialValue * (commercialMixPct / 100);

    // Missed call losses
    const monthlyInquiryCalls = inquiryCallsPerDay * 22;
    const monthlyMissedCalls = monthlyInquiryCalls * (missedCallPct / 100);
    const missedNewCustomerCalls = monthlyMissedCalls * (newCustomerInquiryPct / 100);
    const lostBookingsFromMissedCalls = missedNewCustomerCalls * (quoteToBookingPct / 100);
    const monthlyMissedCallLoss = lostBookingsFromMissedCalls * avgJobValue;

    // Cancellation losses
    const monthlyJobs = jobsPerWeek * 4.33;
    const monthlyCancellations = monthlyJobs * (cancellationRatePct / 100);
    const monthlyCancellationLoss = monthlyCancellations * avgJobValue;

    // Churn losses (recurring clients lost per month)
    const recurringClientBase = monthlyJobs * (recurringRetentionPct / 100) / 4.33; // approximate steady-state
    const monthlyChurnedClients = recurringClientBase / monthsBeforeChurn;
    const monthlyChurnLoss = monthlyChurnedClients * recurringMonthlyValue;

    // Totals
    const monthlyTotalLoss = monthlyMissedCallLoss + monthlyCancellationLoss + monthlyChurnLoss;
    const annualTotalLoss = monthlyTotalLoss * 12;

    // Recovery with AI
    const additionalCallsAnswered = monthlyMissedCalls * (aiCallAnswerPct / 100);
    const additionalNewCustomerCalls = additionalCallsAnswered * (newCustomerInquiryPct / 100);
    const baseBookings = additionalNewCustomerCalls * (quoteToBookingPct / 100);
    const liftedBookings = baseBookings * (1 + aiBookingLiftPct / 100);
    const recoveredCallRevenue = liftedBookings * avgJobValue;

    const recoveredCancellationRevenue = monthlyCancellationLoss * (cancellationRecoveryPct / 100);

    // Churn recovery: AI follow-ups extend retention ~20%
    const recoveredChurnRevenue = monthlyChurnLoss * 0.20;

    const monthlyRecovery = recoveredCallRevenue + recoveredCancellationRevenue + recoveredChurnRevenue;
    const annualRecovery = monthlyRecovery * 12;
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    // Metric card values
    const missedCallsPerMonth = Math.round(monthlyMissedCalls);
    const lostQuoteOpportunities = Math.round(missedNewCustomerCalls);
    const lostBookings = Math.round(lostBookingsFromMissedCalls);
    const cancellationsPerMonth = Math.round(monthlyCancellations);

    return {
      avgJobValue,
      monthlyMissedCalls,
      missedNewCustomerCalls,
      lostBookingsFromMissedCalls,
      monthlyMissedCallLoss,
      monthlyCancellations,
      monthlyCancellationLoss,
      monthlyChurnedClients,
      monthlyChurnLoss,
      monthlyTotalLoss,
      annualTotalLoss,
      recoveredCallRevenue,
      recoveredCancellationRevenue,
      recoveredChurnRevenue,
      monthlyRecovery,
      annualRecovery,
      boltcallAnnualCost,
      netGain,
      roi,
      missedCallsPerMonth,
      lostQuoteOpportunities,
      lostBookings,
      cancellationsPerMonth,
    };
  }, [
    jobsPerWeek, avgResidentialValue, avgCommercialValue, commercialMixPct,
    inquiryCallsPerDay, missedCallPct, newCustomerInquiryPct, quoteToBookingPct,
    cancellationRatePct, recurringRetentionPct, recurringMonthlyValue, monthsBeforeChurn,
    aiCallAnswerPct, aiBookingLiftPct, cancellationRecoveryPct,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;
    setFormLoading(true);
    try {
      await fetch('https://n8n.srv974118.hstgr.cloud/webhook/niche-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          business_name: formCompany || undefined,
          niche: 'cleaning-service',
          source: 'booking-calculator',
          metrics: {
            monthly_total_loss: calc.monthlyTotalLoss,
            annual_total_loss: calc.annualTotalLoss,
            missed_calls_per_month: calc.missedCallsPerMonth,
            lost_quote_opportunities: calc.lostQuoteOpportunities,
            lost_bookings: calc.lostBookings,
            cancellations_per_month: calc.cancellationsPerMonth,
            monthly_recovery: calc.monthlyRecovery,
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
              <Sparkles className="w-4 h-4" />
              Free Tool for Cleaning Services
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Many Bookings Is Your Cleaning Business{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Losing Right Now?
              </span>
            </motion.h1>

            {/* Direct answer block for AEO - within first 150 words */}
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Cleaning companies miss 30-40% of incoming calls because teams are always on-site.
              Every missed call is a lost quote. Calculate exactly how much revenue slips away
              to missed calls, last-minute cancellations, and client churn each month.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Cleaning businesses lose 35% of calls while crews are on-site at jobs</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Benefit-Focused Bullets */}
        <section className="py-10 bg-slate-950">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-6">What You'll Get</h2>
            <ul className="space-y-3">
              {[
                "Recover $5,208 in lost monthly revenue from missed booking calls",
                "Reduce missed calls by 35% with AI answering in 2 rings",
                "Book more recurring clients without hiring extra office staff",
                "Capture leads from every referral — even at midnight",
                "See your exact revenue recovery opportunity now",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mt-0.5">✓</span>
                  <span className="text-slate-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --- About This Calculator --- */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 sm:p-8 space-y-4 text-slate-300 leading-relaxed"
          >
            <h2 className="text-xl font-bold text-white">About This Calculator</h2>
            <p>
              This booking revenue calculator was built for cleaning service owners — residential, commercial, and mixed operations — who want to understand exactly how much revenue they lose each month to missed inquiry calls, cancellations, and client churn. Unlike generic business calculators, this tool is calibrated to the economics of the cleaning industry: recurring contracts, job-by-job booking patterns, and the high cost of losing a long-term client.
            </p>
            <p>
              The four input sections mirror the four most common revenue drains in a cleaning business: business volume (your baseline), missed booking inquiries (calls you don't answer become competitors' clients), cancellation and churn dynamics (one lost recurring client often represents thousands in annual revenue), and the modeled recovery from AI automation. Adjust the sliders to match your actual operation, or use the defaults if you're estimating. The results panel updates immediately.
            </p>
            <p>
              Pay particular attention to the recurring client churn figure. In the cleaning industry, the difference between an 8-month and a 12-month average client retention is often tens of thousands of dollars in annual recurring revenue for a mid-size operation. Automated follow-up, rebooking prompts after cancellations, and consistent communication are the primary levers that extend average client tenure — and this calculator shows you the exact dollar value of improving each one.
            </p>
          </motion.div>
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
                    <Sparkles className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Business Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your weekly cleaning workload</div>
                  </div>
                </div>

                <Slider label="Jobs completed per week" value={jobsPerWeek} onChange={setJobsPerWeek}
                  min={3} max={60} hint="residential + commercial" />
                <Slider label="Average job value - residential" value={avgResidentialValue} onChange={setAvgResidentialValue}
                  min={50} max={500} step={10} unit="$" />
                <Slider label="Average job value - commercial" value={avgCommercialValue} onChange={setAvgCommercialValue}
                  min={100} max={2000} step={50} unit="$" />
                <Slider label="Commercial mix" value={commercialMixPct} onChange={setCommercialMixPct}
                  min={0} max={80} unit="%" hint="rest are residential" />
              </motion.div>

              {/* Card 2: Missed Opportunities */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <PhoneOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Missed Opportunities</div>
                    <div className="text-xs text-slate-500 mt-0.5">Calls you miss while cleaning</div>
                  </div>
                </div>

                <Slider label="Inquiry calls per day" value={inquiryCallsPerDay} onChange={setInquiryCallsPerDay}
                  min={2} max={30} hint="incoming phone calls" />
                <Slider label="Missed call rate" value={missedCallPct} onChange={setMissedCallPct}
                  min={10} max={60} unit="%" hint="crews are always on-site" />
                <Slider label="% that are new customer inquiries" value={newCustomerInquiryPct} onChange={setNewCustomerInquiryPct}
                  min={20} max={80} unit="%" />
                <Slider label="Quote-to-booking conversion" value={quoteToBookingPct} onChange={setQuoteToBookingPct}
                  min={15} max={70} unit="%" hint="of quoted leads who book" />
              </motion.div>

              {/* Card 3: Cancellations & Recurring */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Cancellations & Recurring</div>
                    <div className="text-xs text-slate-500 mt-0.5">Revenue leaking from your schedule</div>
                  </div>
                </div>

                <Slider label="Last-minute cancellation rate" value={cancellationRatePct} onChange={setCancellationRatePct}
                  min={0} max={30} unit="%" />
                <Slider label="Recurring client retention rate" value={recurringRetentionPct} onChange={setRecurringRetentionPct}
                  min={30} max={95} unit="%" hint="clients on regular schedules" />
                <Slider label="Average recurring client monthly value" value={recurringMonthlyValue} onChange={setRecurringMonthlyValue}
                  min={100} max={1200} step={20} unit="$" />
                <Slider label="Months before recurring client churns" value={monthsBeforeChurn} onChange={setMonthsBeforeChurn}
                  min={2} max={24} hint="average retention period" />
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

                <Slider label="AI call answer rate" value={aiCallAnswerPct} onChange={setAiCallAnswerPct}
                  min={50} max={99} unit="%" hint="24/7 AI receptionist" />
                <Slider label="AI booking conversion lift" value={aiBookingLiftPct} onChange={setAiBookingLiftPct}
                  min={10} max={60} unit="%" hint="vs current conversion" />
                <Slider label="Cancellation recovery rate via AI rescheduling" value={cancellationRecoveryPct} onChange={setCancellationRecoveryPct}
                  min={15} max={70} unit="%" hint="auto-fill from waitlist" />
              </motion.div>
            </div>

            {/* RIGHT --- STICKY RESULTS */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">

              {/* Big Loss Number */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6 sm:p-7">
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
                    You're Losing Every Month
                  </p>
                  <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
                    {fmt.format(calc.monthlyTotalLoss)}
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Annual total: <span className="text-red-400 font-bold">{fmt.format(calc.annualTotalLoss)}</span>
                  </p>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Missed calls / month', value: fmtNum.format(calc.missedCallsPerMonth), icon: PhoneOff, color: 'text-red-400' },
                    { label: 'Lost quote opps / month', value: fmtNum.format(calc.lostQuoteOpportunities), icon: Users, color: 'text-amber-400' },
                    { label: 'Lost bookings / month', value: fmtNum.format(calc.lostBookings), icon: Calendar, color: 'text-teal-400' },
                    { label: 'Cancellations / month', value: fmtNum.format(calc.cancellationsPerMonth), icon: Clock, color: 'text-blue-400' },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-800/60 rounded-xl p-3.5 text-center">
                      <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-1.5`} />
                      <p className="text-xl font-bold text-white">{m.value}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue Breakdown */}
                <div className="space-y-2.5 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue Breakdown</p>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed call loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyMissedCallLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Cancellation loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyCancellationLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Client churn loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyChurnLoss)}/mo</span>
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
                      <span className="text-sm text-slate-400">Recovered revenue / month</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.monthlyRecovery)}</span>
                    </div>
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
                      That's <span className="font-bold text-emerald-400">{fmtNum.format(Math.round(calc.lostBookings * 0.65))} extra bookings</span> per month recovered
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
              How Does AI Stop Cleaning Businesses{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                From Losing Jobs?
              </span>
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: '24/7 AI Receptionist Answers Every Call',
                  desc: 'Your crews are on-site scrubbing, mopping, and sanitizing. AI answers every ring instantly, collects property details, provides quotes based on your pricing, and books the job into your calendar. No more voicemail black holes.',
                  icon: Phone,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'Smart Reminders Crush Cancellations',
                  desc: 'AI sends personalized reminders via text and voice 24 and 2 hours before each appointment. When a client cancels, the AI contacts the next person on your waitlist and fills the slot before your crew even finishes their current job.',
                  icon: MessageSquare,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Automated Follow-Up Keeps Clients Recurring',
                  desc: 'After every cleaning, AI texts for feedback, asks to schedule the next visit, and re-engages inactive clients before they churn. Your recurring revenue grows on autopilot while you focus on delivering great service.',
                  icon: RefreshCw,
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
              Get Your Free Cleaning Service{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Revenue Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Recover $5,208+ in lost revenue monthly from missed calls',
                  'Reduce missed calls by 35% with AI answering every inquiry',
                  'Recover 45% of last-minute cancellations with auto-rescheduling',
                  'Retain recurring clients longer and increase lifetime value',
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
                  placeholder="Business Name (optional)"
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

        {/* --- FAQ SECTION --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-3xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              What Do Cleaning Business Owners{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Ask About AI?
              </span>
            </motion.h2>

            <div className="space-y-5">
              {[
                {
                  q: 'How many bookings do cleaning companies lose to missed calls?',
                  a: 'The average cleaning company misses 30-40% of incoming calls because teams are on-site during business hours. With 55% of those calls being new customer inquiries, a typical cleaning business loses 25-50 potential bookings per month to unanswered phones. At an average job value of $180-$450, that adds up to $4,500-$22,000 in lost revenue every month.',
                },
                {
                  q: 'Can AI answer calls for a cleaning service?',
                  a: 'Yes. AI receptionists answer every call 24/7, collect job details like property size, number of rooms, and cleaning type (deep clean, move-out, recurring), provide instant quotes based on your pricing, and book appointments directly into your calendar. Callers talk to a natural-sounding voice assistant that knows your services, pricing, and availability. Setup takes under 10 minutes.',
                },
                {
                  q: 'How much does a missed call cost a cleaning business?',
                  a: 'A single missed call from a new residential customer costs $180 on average for the initial job. But the real cost is much higher. If that customer becomes a recurring weekly or biweekly client at $360/month for 8 months, one missed call represents up to $3,060 in lifetime revenue. For commercial inquiries, the loss can exceed $10,000.',
                },
                {
                  q: 'How does AI reduce last-minute cancellations for cleaners?',
                  a: 'AI sends automated reminders via text and voice 24 hours and 2 hours before each appointment, reducing no-shows by up to 55%. When a client does cancel, the AI immediately contacts waitlisted customers and reschedules the slot, recovering 40-50% of last-minute cancellations before your crew even arrives at the address.',
                },
                {
                  q: 'What is the ROI of an AI receptionist for cleaning services?',
                  a: 'Most cleaning businesses see 500-2,000% ROI. At $897/month, Boltcall typically recovers $2,000-$8,000 in revenue that would otherwise be lost to missed calls, cancellations, and client churn. The system pays for itself within the first week for most cleaning companies.',
                },
              ].map((faq) => (
                <motion.div key={faq.q} variants={fadeUp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/20 transition-colors">
                  <h3 className="text-base font-bold text-white mb-3 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                    {faq.q}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed pl-8">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- SOCIAL PROOF --- */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '35%',
                text: 'Cleaning companies miss 35% of calls on average because crews are always on-site at jobs',
                icon: PhoneOff,
              },
              {
                stat: '$3,060',
                text: 'The lifetime value of one recurring cleaning client -- a single missed call can cost this much',
                icon: DollarSign,
              },
              {
                stat: '55%',
                text: 'AI reminders and instant rescheduling reduce cancellations by up to 55%',
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

        {/* --- FINAL CTA --- */}
        <FinalCTA {...CALCULATOR_CTA} />
      </main>

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


      {/* What This Tool Measures */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Measures</h2>
          <p className="text-gray-500 text-sm text-center mb-6">The booking metrics that determine your true revenue loss from missed calls</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Missed Booking Calls', desc: 'New-client calls going to voicemail while your crew is cleaning' },
              { label: 'Average Job Value', desc: 'Revenue per recurring or one-time cleaning appointment' },
              { label: 'Client Retention Rate', desc: 'How often customers rebook after their first service' },
              { label: 'Recurring Revenue Value', desc: 'Annual income from a retained recurring cleaning client' },
              { label: 'After-Hours Call Volume', desc: 'Calls arriving outside your office hours' },
              { label: 'Annual Revenue Gap', desc: 'Total income lost to missed calls and slow response times' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Benchmark Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Cleaning Service Industry Benchmarks: Call Capture and Booking Performance</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing cleaning businesses compare to the average on lead conversion</p>
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
                ['Calls answered rate', '62% (industry avg)', '99%+ with AI'],
                ['After-hours call capture', 'Voicemail or missed', 'All calls answered'],
                ['Monthly missed calls (25 call avg)', '9–10 missed calls', '0–1 missed calls'],
                ['Average job value (recurring)', '$140 – $280', '$140 – $280 (same)'],
                ['Monthly revenue lost to missed calls', '$1,260 – $2,520', '$0 – $280'],
                ['Client retention rate', '60% (1-year)', '75%+ (reminders and follow-up)'],
                ['No-show rate for appointments', '15–20%', '7–10% (reminders active)'],
                ['Monthly Google review growth', '0–1 reviews/mo', '4–7 reviews/mo (automated)'],
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

export default CleaningServiceBookingCalculator;
