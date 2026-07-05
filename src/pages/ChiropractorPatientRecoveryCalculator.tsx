import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Activity, CalendarX2, PhoneOff, TrendingUp,
  DollarSign, Users, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Calendar, UserX, Phone, MessageSquare
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

const ChiropractorPatientRecoveryCalculator: React.FC = () => {
  // Card 1: Practice Volume
  const [visitsPerDay, setVisitsPerDay] = useState(30);
  const [avgVisitValue, setAvgVisitValue] = useState(65);
  const [avgInitialExamValue, setAvgInitialExamValue] = useState(250);
  const [newPatientPct, setNewPatientPct] = useState(15);

  // Card 2: Patient Drop-Off
  const [planCompletionPct, setPlanCompletionPct] = useState(45);
  const [avgPlanVisits, setAvgPlanVisits] = useState(24);
  const [revenuePerPlan, setRevenuePerPlan] = useState(1560);

  // Card 3: Missed Calls & No-Shows
  const [callsPerDay, setCallsPerDay] = useState(20);
  const [missedCallPct, setMissedCallPct] = useState(28);
  const [noShowPct, setNoShowPct] = useState(20);
  const [newPatientLtv, setNewPatientLtv] = useState(2200);

  // Card 4: Recovery with AI
  const [aiAnswerPct, setAiAnswerPct] = useState(85);
  const [reminderRecoveryPct, setReminderRecoveryPct] = useState(60);
  const [reEngagementPct, setReEngagementPct] = useState(25);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Chiropractor Patient Recovery Calculator (2026) | Boltcall';
    updateMetaDescription(
      'Free chiropractor calculator. See how much revenue you lose to dropped patients, missed calls, and no-shows every month. Discover your AI recovery potential.'
    );

    // Article schema
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': 'Chiropractor Patient Recovery Calculator: Find Hidden Revenue Losses',
      'description': 'Free calculator for chiropractic clinics to measure revenue lost to incomplete treatment plans, missed calls, and no-shows, and project AI-powered recovery.',
      'author': {
        '@type': 'Organization',
        'name': 'Boltcall',
        'url': 'https://boltcall.org',
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Boltcall',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://boltcall.org/boltcall-logo.png',
        },
      },
      'datePublished': '2026-04-01',
      'dateModified': '2026-04-01',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/chiropractor-patient-recovery-calculator',
      },
      'articleSection': 'Industry Calculator',
      'keywords': ['chiropractor calculator', 'patient recovery', 'chiropractic revenue', 'AI receptionist chiropractor'],
      'image': {
        '@type': 'ImageObject',
        'url': 'https://boltcall.org/og-image.jpg',
        'width': 1200,
        'height': 630,
      },
    };

    const articleScript = document.createElement('script');
    articleScript.id = 'article-schema';
    articleScript.type = 'application/ld+json';
    articleScript.text = JSON.stringify(articleSchema);
    document.head.appendChild(articleScript);

    // FAQPage schema
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'How much revenue do chiropractors lose to incomplete treatment plans?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'The average chiropractic clinic loses 40-60% of treatment plan revenue because patients drop off before completing care. With a typical plan worth $1,500+, even a small practice can lose $10,000-$30,000 monthly from patient attrition alone.',
          },
        },
        {
          '@type': 'Question',
          'name': 'Can AI reduce missed calls at a chiropractic office?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes. AI receptionists answer 85-99% of incoming calls 24/7, including after hours and during adjustments. This prevents new patient leads from going to voicemail and calling a competitor instead.',
          },
        },
        {
          '@type': 'Question',
          'name': 'What is the average no-show rate for chiropractors?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Chiropractic clinics typically see no-show rates between 15-25%. AI-powered appointment reminders via SMS and voice can reduce this by 40-60%, recovering thousands in monthly revenue.',
          },
        },
        {
          '@type': 'Question',
          'name': 'How does AI help chiropractors re-engage dropped patients?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'AI sends automated re-engagement messages to patients who miss visits or fall off their treatment plan. These personalized follow-ups remind patients of their care goals and make rebooking easy, recovering 15-30% of dropped patients.',
          },
        },
        {
          '@type': 'Question',
          'name': 'What ROI can a chiropractor expect from an AI receptionist?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Most chiropractic clinics see 500-2,000%+ ROI from AI automation. A $897/month investment typically recovers $3,000-$15,000 in monthly revenue from missed calls, no-shows, and dropped patients.',
          },
        },
      ],
    };

    const faqScript = document.createElement('script');
    faqScript.id = 'faq-schema';
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    // BreadcrumbList schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://boltcall.org' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Tools', 'item': 'https://boltcall.org/tools' },
        { '@type': 'ListItem', 'position': 3, 'name': 'Chiropractor Patient Recovery Calculator', 'item': 'https://boltcall.org/tools/chiropractor-patient-recovery-calculator' },
      ],
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('article-schema')?.remove();
      document.getElementById('faq-schema')?.remove();
      document.getElementById('breadcrumb-schema')?.remove();
    };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    const workingDays = 22;

    // Practice volume
    const monthlyVisits = visitsPerDay * workingDays;
    const monthlyNewPatients = Math.round(monthlyVisits * (newPatientPct / 100));

    // Patient drop-off losses
    const dropOffRate = 1 - planCompletionPct / 100;
    const droppedPatientsPerMonth = Math.round(monthlyNewPatients * dropOffRate);
    const remainingVisitsPerDropped = avgPlanVisits * dropOffRate;
    const revenueLostToIncompletePlans = droppedPatientsPerMonth * remainingVisitsPerDropped * avgVisitValue;

    // Missed call losses
    const monthlyMissedCalls = callsPerDay * workingDays * (missedCallPct / 100);
    const missedNewPatientCalls = monthlyMissedCalls * 0.4; // ~40% of calls are potential new patients
    const monthlyMissedCallLoss = missedNewPatientCalls * newPatientLtv * 0.25; // 25% conversion probability

    // No-show losses
    const monthlyNoShows = monthlyVisits * (noShowPct / 100);
    const monthlyNoShowLoss = monthlyNoShows * avgVisitValue;

    // Totals
    const monthlyTotalLoss = revenueLostToIncompletePlans + monthlyMissedCallLoss + monthlyNoShowLoss;
    const annualTotalLoss = monthlyTotalLoss * 12;

    // Recovery with AI
    const recoveredCallRevenue = monthlyMissedCallLoss * (aiAnswerPct / 100);
    const recoveredNoShowRevenue = monthlyNoShowLoss * (reminderRecoveryPct / 100);
    const recoveredDropOffRevenue = revenueLostToIncompletePlans * (reEngagementPct / 100);
    const monthlyRecovery = recoveredCallRevenue + recoveredNoShowRevenue + recoveredDropOffRevenue;
    const annualRecovery = monthlyRecovery * 12;
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    return {
      monthlyVisits,
      monthlyNewPatients,
      droppedPatientsPerMonth,
      revenueLostToIncompletePlans,
      monthlyMissedCalls: Math.round(monthlyMissedCalls),
      missedNewPatientCalls: Math.round(missedNewPatientCalls),
      monthlyMissedCallLoss,
      monthlyNoShows: Math.round(monthlyNoShows),
      monthlyNoShowLoss,
      monthlyTotalLoss,
      annualTotalLoss,
      recoveredCallRevenue,
      recoveredNoShowRevenue,
      recoveredDropOffRevenue,
      monthlyRecovery,
      annualRecovery,
      boltcallAnnualCost,
      netGain,
      roi,
    };
  }, [
    visitsPerDay, avgVisitValue, avgInitialExamValue, newPatientPct,
    planCompletionPct, avgPlanVisits, revenuePerPlan,
    callsPerDay, missedCallPct, noShowPct, newPatientLtv,
    aiAnswerPct, reminderRecoveryPct, reEngagementPct,
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
          niche: 'chiropractic',
          source: 'patient-recovery-calculator',
          metrics: {
            monthly_total_loss: calc.monthlyTotalLoss,
            annual_total_loss: calc.annualTotalLoss,
            dropped_patients_per_month: calc.droppedPatientsPerMonth,
            revenue_lost_incomplete_plans: calc.revenueLostToIncompletePlans,
            missed_calls_per_month: calc.monthlyMissedCalls,
            no_shows_per_month: calc.monthlyNoShows,
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
              <Activity className="w-4 h-4" />
              Free Tool for Chiropractic Clinics
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Much Revenue Do You Lose to{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Dropped Patients & Missed Calls?
              </span>
            </motion.h1>

            {/* Direct answer block - within first 150 words for AEO */}
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              The average chiropractic clinic loses $8,000-$25,000 every month to patients who abandon treatment plans,
              unanswered phone calls, and no-shows. This free calculator shows your exact losses and how much AI can recover.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">55% of chiropractic patients drop off before completing their treatment plan</span>
            </motion.div>
          </motion.div>
        </section>

        {/* --- How to Use This Calculator --- */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-indigo-950/60 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 space-y-4 text-slate-300 leading-relaxed"
          >
            <h2 className="text-xl font-bold text-white">How This Calculator Works</h2>
            <p>
              This tool is built specifically for chiropractic clinic owners and practice managers who want to measure revenue losses across three distinct areas: incomplete treatment plans (patients who drop off before finishing their prescribed care), missed inbound calls from new patient leads, and appointment no-shows. Each of these categories represents a separate revenue leak — and most practices are unaware of the true dollar impact until they run the numbers.
            </p>
            <p>
              Enter your clinic's actual figures using the sliders in each section. If you don't know a specific number, the defaults reflect national benchmarks for solo and small group chiropractic practices. The right-side panel calculates your total monthly and annual loss in real time and models the revenue recovery you would see with AI-powered answering, appointment reminders, and patient re-engagement sequences.
            </p>
            <p>
              The methodology is grounded in documented industry data: the average chiropractic practice loses 40–60% of treatment plan revenue to patient attrition, carries a 15–25% no-show rate, and misses roughly a quarter of inbound calls. By understanding where your clinic sits relative to these benchmarks, you can prioritize which leak to address first for the fastest revenue impact. Enter your email below the calculator to receive a personalized recovery plan PDF.
            </p>
          </motion.div>
        </section>

        {/* --- CALCULATOR --- */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT --- INPUTS */}
            <div className="space-y-6">

              {/* Card 1: Practice Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <Activity className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Practice Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your daily patient flow</div>
                  </div>
                </div>

                <Slider label="Patient visits per day" value={visitsPerDay} onChange={setVisitsPerDay}
                  min={5} max={80} hint="avg for busy practice" />
                <Slider label="Average adjustment visit value" value={avgVisitValue} onChange={setAvgVisitValue}
                  min={30} max={150} step={5} unit="$" />
                <Slider label="Average initial exam value" value={avgInitialExamValue} onChange={setAvgInitialExamValue}
                  min={100} max={500} step={10} unit="$" />
                <Slider label="New patients per month (%)" value={newPatientPct} onChange={setNewPatientPct}
                  min={5} max={40} unit="%" hint="of total visits" />
              </motion.div>

              {/* Card 2: Patient Drop-Off */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <CalendarX2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Patient Drop-Off</div>
                    <div className="text-xs text-slate-500 mt-0.5">Patients who quit before plan completion</div>
                  </div>
                </div>

                <Slider label="Treatment plan completion rate" value={planCompletionPct} onChange={setPlanCompletionPct}
                  min={10} max={90} unit="%" hint="industry avg ~45%" />
                <Slider label="Average treatment plan visits" value={avgPlanVisits} onChange={setAvgPlanVisits}
                  min={6} max={52} hint="visits per plan" />
                <Slider label="Revenue per completed plan" value={revenuePerPlan} onChange={setRevenuePerPlan}
                  min={500} max={5000} step={20} unit="$" />
              </motion.div>

              {/* Card 3: Missed Calls & No-Shows */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <PhoneOff className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Missed Calls & No-Shows</div>
                    <div className="text-xs text-slate-500 mt-0.5">Patients and leads that slip through the cracks</div>
                  </div>
                </div>

                <Slider label="Phone calls per day" value={callsPerDay} onChange={setCallsPerDay}
                  min={5} max={60} hint="incoming calls" />
                <Slider label="Missed call rate" value={missedCallPct} onChange={setMissedCallPct}
                  min={5} max={60} unit="%" />
                <Slider label="No-show rate" value={noShowPct} onChange={setNoShowPct}
                  min={5} max={45} unit="%" hint="industry avg ~20%" />
                <Slider label="New patient lifetime value" value={newPatientLtv} onChange={setNewPatientLtv}
                  min={500} max={6000} step={100} unit="$" />
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
                    <div className="text-xs text-slate-500 mt-0.5">What AI automation can recover for your practice</div>
                  </div>
                </div>

                <Slider label="AI call answer rate" value={aiAnswerPct} onChange={setAiAnswerPct}
                  min={50} max={99} unit="%" hint="24/7 AI receptionist" />
                <Slider label="Automated reminder recovery" value={reminderRecoveryPct} onChange={setReminderRecoveryPct}
                  min={20} max={80} unit="%" hint="no-shows recovered" />
                <Slider label="Re-engagement message recovery" value={reEngagementPct} onChange={setReEngagementPct}
                  min={5} max={50} unit="%" hint="dropped patients brought back" />
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
                    { label: 'Dropped patients / mo', value: fmtNum.format(calc.droppedPatientsPerMonth), icon: UserX, color: 'text-red-400' },
                    { label: 'Missed calls / month', value: fmtNum.format(calc.monthlyMissedCalls), icon: PhoneOff, color: 'text-amber-400' },
                    { label: 'No-shows / month', value: fmtNum.format(calc.monthlyNoShows), icon: CalendarX2, color: 'text-teal-400' },
                    { label: 'New patients at risk / mo', value: fmtNum.format(calc.missedNewPatientCalls), icon: Users, color: 'text-blue-400' },
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
                    <span className="text-sm text-slate-300">Incomplete plan loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.revenueLostToIncompletePlans)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed call loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyMissedCallLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">No-show loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyNoShowLoss)}/mo</span>
                  </div>
                </div>

                {/* With AI Section */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With Boltcall AI Recovery</p>
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
                      That's <span className="font-bold text-emerald-400">{fmt.format(calc.monthlyRecovery)}</span> back in your pocket every month
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
              How Does AI Recover Revenue for{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Chiropractic Clinics?
              </span>
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'AI Answers Every Call 24/7',
                  desc: 'New patients call when their back pain flares up -- not just during office hours. AI picks up every ring, qualifies the caller, and books their initial exam instantly. No more lost leads to voicemail.',
                  icon: Phone,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'Smart Reminders Eliminate No-Shows',
                  desc: 'Automated SMS and voice reminders sent at the right time with easy confirm or reschedule links. Patients who would have ghosted their adjustment show up instead. Reduces no-shows by up to 60%.',
                  icon: Calendar,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Re-Engagement Brings Back Dropped Patients',
                  desc: 'When a patient misses their 8th visit out of 24, AI sends a personalized follow-up. It reminds them of their care goals, makes rebooking easy, and recovers the patients who would have quietly disappeared.',
                  icon: MessageSquare,
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
              Get Your Free Chiropractic{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Patient Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Patient drop-off reduction strategy for chiropractors',
                  'AI reminder implementation guide for treatment plans',
                  'Missed call recovery playbook',
                  'Re-engagement sequences that bring patients back',
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
                  placeholder="Practice Name (optional)"
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

        {/* --- SOCIAL PROOF / STATS --- */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '55%',
                text: 'Over half of chiropractic patients drop off before finishing their treatment plan, costing practices thousands monthly',
                icon: CalendarX2,
              },
              {
                stat: '$2,200',
                text: 'The average lifetime value of a chiropractic patient -- one missed call can cost more than a year of AI automation',
                icon: DollarSign,
              },
              {
                stat: '28%',
                text: 'Nearly 1 in 3 calls to chiropractic offices go unanswered during adjustments, lunch, or after hours',
                icon: PhoneOff,
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
              What Do Chiropractors Ask About{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                AI Automation?
              </span>
            </motion.h2>

            <div className="space-y-4">
              {[
                {
                  q: 'How much revenue do chiropractors lose to incomplete treatment plans?',
                  a: 'The average chiropractic clinic loses 40-60% of treatment plan revenue because patients drop off before completing care. With a typical plan worth $1,500+, even a small practice can lose $10,000-$30,000 monthly from patient attrition alone.',
                },
                {
                  q: 'Can AI really reduce missed calls at a chiropractic office?',
                  a: 'Yes. AI receptionists answer 85-99% of incoming calls 24/7, including after hours and during adjustments. This prevents new patient leads from going to voicemail and calling a competitor instead. Most practices see results within the first week.',
                },
                {
                  q: 'What is the average no-show rate for chiropractic appointments?',
                  a: 'Chiropractic clinics typically see no-show rates between 15-25%. AI-powered appointment reminders via SMS and voice can reduce this by 40-60%, recovering thousands in monthly revenue without adding any front desk workload.',
                },
                {
                  q: 'How does AI help re-engage patients who dropped their treatment plan?',
                  a: 'AI sends automated re-engagement messages to patients who miss visits or fall off their treatment plan. These personalized follow-ups remind patients of their care goals, highlight progress made so far, and make rebooking easy with a single tap.',
                },
                {
                  q: 'What ROI can a chiropractor expect from an AI receptionist?',
                  a: 'Most chiropractic clinics see 500-2,000%+ ROI from AI automation. A $897/month investment typically recovers $3,000-$15,000 in monthly revenue from missed calls, no-shows, and dropped patients. The calculator above shows your specific numbers.',
                },
              ].map((faq) => (
                <motion.div key={faq.q} variants={fadeUp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/20 transition-colors">
                  <h3 className="text-base font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- WHY BOLTCALL --- */}
        <section id="why-boltcall" className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-4">
              Why Boltcall for{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Chiropractic Practices
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
              Not all AI receptionists are built for healthcare. Here's what makes Boltcall the right fit for chiropractic clinics.
            </motion.p>
            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: Activity,
                  title: 'Chiropractic-Trained AI',
                  desc: 'Understands appointment types, insurance questions, and new-patient intake — so callers get accurate, helpful answers without you lifting a finger.',
                },
                {
                  icon: CheckCircle,
                  title: 'HIPAA-Friendly Design',
                  desc: 'Call data is handled with healthcare privacy standards in mind, giving you and your patients confidence that sensitive information stays protected.',
                },
                {
                  icon: Phone,
                  title: '24/7 Patient Capture',
                  desc: 'Never miss a new patient because your front desk is busy with in-office patients or closed for the evening. Boltcall answers every call, every time.',
                },
                {
                  icon: MessageSquare,
                  title: 'Automated Follow-Up',
                  desc: 'Sends appointment reminders and re-engages missed patients via SMS — reducing no-shows and pulling dropped patients back into care automatically.',
                },
                {
                  icon: Calendar,
                  title: 'Integrates With Your Calendar',
                  desc: 'Books directly into your scheduling system with no double-booking. Patients get confirmed slots instantly, and your team sees updates in real time.',
                },
              ].map((item) => (
                <motion.div key={item.title} variants={fadeUp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* --- CONTACT SECTION --- */}
        <section id="contact" className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-900">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-3xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white mb-4">
              Have Questions?{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                We're Here to Help
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mb-10">
              We typically respond within 2 business hours. Reach out any time and a real person will get back to you.
            </motion.p>
            <motion.div variants={fadeUp}
              className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-10 text-left shadow-xl shadow-blue-900/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Email Support</p>
                  <a href="mailto:support@boltcall.org"
                    className="text-white font-bold text-lg hover:text-blue-100 transition-colors">
                    support@boltcall.org
                  </a>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Book a Call</p>
                  <a href="https://boltcall.org/book-a-call" target="_blank" rel="noopener noreferrer"
                    className="text-white font-bold text-lg hover:text-blue-100 transition-colors">
                    boltcall.org/book-a-call
                  </a>
                </div>
                <div className="sm:col-span-2 border-t border-blue-500/40 pt-6 mt-2">
                  <p className="text-blue-100 text-sm leading-relaxed">
                    We typically respond within <strong className="text-white">2 business hours</strong>. Whether you want to see a live demo, ask about pricing, or get help configuring Boltcall for your chiropractic practice — our team is ready.
                  </p>
                </div>
              </div>
            </motion.div>
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
          <p className="text-gray-500 text-sm text-center mb-6">Six revenue factors that determine how many patients you're losing each month</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Missed Calls per Week', desc: 'Unanswered calls during and after business hours' },
              { label: 'Appointment Value', desc: 'Average revenue per new patient visit' },
              { label: 'Lifetime Patient Value', desc: 'Total revenue a retained chiropractic patient generates' },
              { label: 'No-Show Rate', desc: 'Percentage of booked appointments that are abandoned' },
              { label: 'Rebooking Recovery', desc: 'Revenue recaptured via automated SMS follow-up' },
              { label: 'Annual Revenue Gap', desc: 'Total yearly income lost to missed and lapsed patients' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Benchmarks Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Chiropractic Industry Benchmarks: Call Capture and Revenue Impact</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing chiropractic businesses compare to the average on call response</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Industry Average</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Top Performers (AI-Assisted)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Calls answered rate', '78%', '99%+'],
                  ['Missed calls/month (40 call avg)', '8 calls', '0–1 calls'],
                  ['After-hours call coverage', 'Voicemail or none', '100% answered'],
                  ['Avg. response to web leads', '47 minutes', 'Under 60 seconds'],
                  ['Monthly revenue lost to missed calls', '$4,224', '$0–$500'],
                  ['No-show rate', '18–25%', '8–12%'],
                  ['Monthly Google review growth', '0–2 reviews', '8–15 reviews'],
                  ['Setup time for 24/7 coverage', '2–4 weeks (hire)', '30 minutes (AI)'],
                ].map(([metric, avg, best]) => (
                  <tr key={metric} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{metric}</td>
                    <td className="px-4 py-3 text-gray-600">{avg}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{best}</td>
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

export default ChiropractorPatientRecoveryCalculator;
