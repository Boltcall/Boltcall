import React, { useState, useMemo, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Sparkles, TrendingDown, TrendingUp, Users, DollarSign,
  CalendarCheck, Send, ChevronRight, Clock, Heart, Star,
  AlertTriangle, ArrowRight, CheckCircle2, CheckCircle, Syringe, Zap,
  UserMinus, BarChart3
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { CALCULATOR_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';

const PINK = '#EC4899';

const treatmentOptions = [
  { label: 'Botox/Dysport', avg: 350 },
  { label: 'Dermal Fillers', avg: 650 },
  { label: 'Laser Hair Removal', avg: 250 },
  { label: 'Chemical Peels', avg: 175 },
  { label: 'Microneedling', avg: 300 },
  { label: 'Body Contouring', avg: 500 },
  { label: 'Facials/Skin Care', avg: 150 },
  { label: 'IV Therapy', avg: 200 },
];

const intervalOptions = [
  { label: 'Every 2 weeks', weeks: 2 },
  { label: 'Every 3 weeks', weeks: 3 },
  { label: 'Every 4 weeks (monthly)', weeks: 4 },
  { label: 'Every 6 weeks', weeks: 6 },
  { label: 'Every 8 weeks (bi-monthly)', weeks: 8 },
  { label: 'Every 3 months (quarterly)', weeks: 13 },
];

const followUpOptions = [
  'Nobody — we hope they come back',
  'Front desk calls when they remember',
  'Automated emails',
  'Text reminders',
  'Membership locks them in',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const fmtK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + Math.round(n).toLocaleString('en-US');
};

/* ─── Slider component ─── */
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, prefix = '', suffix = '' }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm font-semibold text-white">{prefix}{typeof value === 'number' && prefix === '$' ? Math.round(value).toLocaleString('en-US') : value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, ${PINK} 0%, ${PINK} ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
      }}
    />
  </div>
);

/* ─── Card wrapper ─── */
const InputCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <motion.div
    variants={fadeUp}
    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EC4899, #BE185D)' }}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
    {children}
  </motion.div>
);

/* ─── Metric card ─── */
const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color?: string }> = ({ label, value, icon, color = PINK }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-xs text-slate-400 leading-tight">{label}</span>
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

/* ─── Cascade row ─── */
const CascadeRow: React.FC<{ label: string; values: number[]; color: string }> = ({ label, values }) => (
  <div className="mb-3">
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    <div className="flex items-center gap-1">
      {values.map((v, i) => (
        <React.Fragment key={i}>
          <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center min-w-[56px]">
            <p className="text-sm font-bold text-white">{v}</p>
          </div>
          {i < values.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */

const MedSpaRebookingCalculator: React.FC = () => {
  // ── Treatment Revenue
  const [treatmentIdx, setTreatmentIdx] = useState(0);
  const [avgPrice, setAvgPrice] = useState(treatmentOptions[0].avg);
  const [upsell, setUpsell] = useState(45);

  // ── Client Volume
  const [clientsPerWeek, setClientsPerWeek] = useState(45);
  const [newClientsMonth, setNewClientsMonth] = useState(15);
  const [rebookingRate, setRebookingRate] = useState(35);
  const [intervalIdx, setIntervalIdx] = useState(2); // monthly

  // ── Client Lifetime Value
  const [treatmentsBeforeStop, setTreatmentsBeforeStop] = useState(4);
  const [membershipRevenue, setMembershipRevenue] = useState(0);
  const [retailPerVisit, setRetailPerVisit] = useState(25);

  // ── Acquisition Cost
  const [marketingSpend, setMarketingSpend] = useState(3000);
  const [newClientsFromMarketing, setNewClientsFromMarketing] = useState(12);
  const [sendsReminders, setSendsReminders] = useState(false);
  const [followUpMethod, setFollowUpMethod] = useState(0);

  // ── Email capture
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [spaName, setSpaName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // sync avg price when treatment dropdown changes
  useEffect(() => {
    setAvgPrice(treatmentOptions[treatmentIdx].avg);
  }, [treatmentIdx]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Med Spa Rebooking Calculator | Boltcall';
    updateMetaDescription('Calculate how much revenue your med spa loses from missed rebooking calls. Find your monthly opportunity cost and get an AI solution to recover it.');
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Med Spa Rebooking Calculator", "item": "https://boltcall.org/tools/medspa-rebooking-calculator"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  /* ─── CALCULATIONS ─── */
  const calc = useMemo(() => {
    const revenuePerVisit = avgPrice + upsell + retailPerVisit;
    const intervalWeeks = intervalOptions[intervalIdx].weeks;
    const visitsPerYear = 52 / intervalWeeks;

    // Current clients & rebooking
    const totalClientsMonth = clientsPerWeek * 4.33;
    const rebookingDecimal = rebookingRate / 100;
    const clientsNotRebooking = Math.round(newClientsMonth * (1 - rebookingDecimal));
    const clientsRebooking = Math.round(newClientsMonth * rebookingDecimal);

    // Cost per acquisition
    const cpa = newClientsFromMarketing > 0 ? marketingSpend / newClientsFromMarketing : 0;

    // Lost rebooking revenue per month
    const lostRebookingRevenueMonth = clientsNotRebooking * revenuePerVisit;

    // Lifetime values
    const currentLTV = treatmentsBeforeStop * revenuePerVisit + (membershipRevenue * treatmentsBeforeStop);
    const optimalVisits = Math.round(visitsPerYear * 3); // 3-year loyal client
    const optimalLTV = optimalVisits * revenuePerVisit + (membershipRevenue * 36);
    const ltvGap = optimalLTV - currentLTV;

    // Monthly rebooking gap = revenue lost from clients who don\'t rebook
    const monthlyGap = clientsNotRebooking * currentLTV / treatmentsBeforeStop;
    const annualGap = monthlyGap * 12;

    // Cost to replace churned clients
    const replacementCostMonth = clientsNotRebooking * cpa;

    // Cascade: without AI
    const cascade100 = 100;
    const cascadeRebook1 = Math.round(cascade100 * rebookingDecimal);
    const cascadeRebook2 = Math.round(cascadeRebook1 * rebookingDecimal);
    const cascadeRegulars = Math.round(cascadeRebook2 * rebookingDecimal);

    // Cascade: with AI (improved rate)
    const aiRebookingRate = Math.min(rebookingDecimal + 0.25, 0.92);
    const aiRebook1 = Math.round(cascade100 * aiRebookingRate);
    const aiRebook2 = Math.round(aiRebook1 * aiRebookingRate);
    const aiRegulars = Math.round(aiRebook2 * aiRebookingRate);

    // With AI rebooking
    const improvedRebookingRate = Math.min(rebookingRate + 25, 92);
    const improvedDecimal = improvedRebookingRate / 100;
    const improvedClientsRebooking = Math.round(newClientsMonth * improvedDecimal);
    const additionalRebookings = improvedClientsRebooking - clientsRebooking;
    const revenueRecoveredMonth = additionalRebookings * revenuePerVisit;
    const acquistionSavedMonth = additionalRebookings * cpa;
    const boltcallCost = 179;
    const netGain = revenueRecoveredMonth + acquistionSavedMonth - boltcallCost;
    const roi = boltcallCost > 0 ? ((netGain + boltcallCost) / boltcallCost) * 100 : 0;

    return {
      revenuePerVisit,
      totalClientsMonth,
      clientsNotRebooking,
      clientsRebooking,
      cpa,
      lostRebookingRevenueMonth,
      currentLTV,
      optimalLTV,
      optimalVisits,
      ltvGap,
      monthlyGap,
      annualGap,
      replacementCostMonth,
      cascade: [cascade100, cascadeRebook1, cascadeRebook2, cascadeRegulars],
      cascadeAI: [cascade100, aiRebook1, aiRebook2, aiRegulars],
      improvedRebookingRate,
      additionalRebookings,
      revenueRecoveredMonth,
      acquistionSavedMonth,
      netGain,
      roi,
      boltcallCost,
    };
  }, [avgPrice, upsell, retailPerVisit, clientsPerWeek, newClientsMonth, rebookingRate,
      intervalIdx, treatmentsBeforeStop, membershipRevenue, marketingSpend, newClientsFromMarketing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch('https://n8n.srv974118.hstgr.cloud/webhook/niche-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          business_name: spaName,
          niche: 'med_spa',
          source: 'rebooking-calculator',
          treatment_type: treatmentOptions[treatmentIdx].label,
          metrics: {
            monthly_gap: Math.round(calc.monthlyGap),
            annual_gap: Math.round(calc.annualGap),
            rebooking_rate: rebookingRate,
            ltv_current: Math.round(calc.currentLTV),
            ltv_optimal: Math.round(calc.optimalLTV),
            roi: Math.round(calc.roi),
          },
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  // LTV bar widths
  const maxLTV = Math.max(calc.currentLTV, calc.optimalLTV, 1);
  const currentLTVWidth = Math.round((calc.currentLTV / maxLTV) * 100);
  const optimalLTVWidth = Math.round((calc.optimalLTV / maxLTV) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <GiveawayBar />
      <Header />
      <main className="pt-20">

        {/* ════════ HERO ════════ */}
        <section className="relative px-4 sm:px-6 pt-16 pb-12 text-center overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(236,72,153,0.08) 0%, transparent 60%)' }} />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative z-10 max-w-3xl mx-auto"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 mb-6">
              <Syringe className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-pink-300 font-medium">Med Spa Revenue Calculator</span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-5">
              How Much Is Client Attrition{' '}
              <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">Really Costing</span>{' '}
              Your Med Spa?
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              A client comes in for Botox. Loves the results. Never rebooks. You spend $150 to acquire a new one. Calculate what your rebooking gap is actually costing you.
            </motion.p>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3">
              <AlertTriangle className="w-5 h-5 text-pink-400 flex-shrink-0" />
              <span className="text-sm sm:text-base text-slate-300">The average med spa loses <strong className="text-pink-400">60%</strong> of first-time clients after their first visit</span>
            </motion.div>
          </motion.div>
        </section>

        {/* ════════ CALCULATOR ════════ */}
        <section className="px-4 sm:px-6 pb-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── LEFT: Inputs ── */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={stagger}
              className="lg:col-span-5 space-y-6"
            >
              {/* Card 1: Treatment Revenue */}
              <InputCard title="Treatment Revenue" icon={<Sparkles className="w-5 h-5 text-white" />}>
                <div className="mb-4">
                  <label className="text-sm text-slate-300 block mb-1.5">Most popular treatment</label>
                  <select
                    value={treatmentIdx}
                    onChange={(e) => setTreatmentIdx(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    {treatmentOptions.map((t, i) => (
                      <option key={i} value={i}>{t.label} (avg {fmt(t.avg)})</option>
                    ))}
                  </select>
                </div>
                <Slider label="Average treatment price" value={avgPrice} min={75} max={1000} step={5} onChange={setAvgPrice} prefix="$" />
                <Slider label="Average upsell/add-on per visit" value={upsell} min={0} max={200} step={5} onChange={setUpsell} prefix="$" />
              </InputCard>

              {/* Card 2: Client Volume */}
              <InputCard title="Client Volume" icon={<Users className="w-5 h-5 text-white" />}>
                <Slider label="Total clients seen per week" value={clientsPerWeek} min={10} max={150} onChange={setClientsPerWeek} />
                <Slider label="New clients per month" value={newClientsMonth} min={5} max={60} onChange={setNewClientsMonth} />
                <Slider label="Current rebooking rate" value={rebookingRate} min={10} max={85} onChange={setRebookingRate} suffix="%" />
                <div className="mb-2">
                  <label className="text-sm text-slate-300 block mb-1.5">Ideal rebooking interval</label>
                  <select
                    value={intervalIdx}
                    onChange={(e) => setIntervalIdx(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    {intervalOptions.map((o, i) => (
                      <option key={i} value={i}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </InputCard>

              {/* Card 3: Client Lifetime Value */}
              <InputCard title="Client Lifetime Value" icon={<Heart className="w-5 h-5 text-white" />}>
                <Slider label="Average treatments before client stops" value={treatmentsBeforeStop} min={1} max={20} onChange={setTreatmentsBeforeStop} />
                <Slider label="Avg membership/package revenue per client" value={membershipRevenue} min={0} max={500} step={10} onChange={setMembershipRevenue} prefix="$" suffix="/mo" />
                <Slider label="Product retail per visit" value={retailPerVisit} min={0} max={150} step={5} onChange={setRetailPerVisit} prefix="$" />
              </InputCard>

              {/* Card 4: Acquisition Cost */}
              <InputCard title="Acquisition Cost" icon={<DollarSign className="w-5 h-5 text-white" />}>
                <Slider label="Monthly marketing spend" value={marketingSpend} min={500} max={15000} step={100} onChange={setMarketingSpend} prefix="$" />
                <Slider label="New clients from marketing per month" value={newClientsFromMarketing} min={3} max={40} onChange={setNewClientsFromMarketing} />
                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 mb-4">
                  <span className="text-sm text-slate-300">Cost per acquisition</span>
                  <span className="text-lg font-bold text-pink-400">{fmt(calc.cpa)}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-300">Send rebooking reminders?</span>
                  <button
                    onClick={() => setSendsReminders(!sendsReminders)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${sendsReminders ? 'bg-pink-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${sendsReminders ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div>
                  <label className="text-sm text-slate-300 block mb-1.5">Who handles rebooking follow-up?</label>
                  <select
                    value={followUpMethod}
                    onChange={(e) => setFollowUpMethod(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    {followUpOptions.map((o, i) => (
                      <option key={i} value={i}>{o}</option>
                    ))}
                  </select>
                </div>
              </InputCard>
            </motion.div>

            {/* ── RIGHT: Results (sticky) ── */}
            <div className="lg:col-span-7">
              <div className="lg:sticky lg:top-28 space-y-6">

                {/* Big number */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center"
                >
                  <p className="text-sm text-slate-400 mb-2">Your Rebooking Gap Costs</p>
                  <p className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500 bg-clip-text text-transparent leading-tight">
                    {fmt(calc.monthlyGap)}/mo
                  </p>
                  <p className="text-slate-400 mt-2 text-lg">Annual rebooking gap: <span className="text-white font-bold">{fmt(calc.annualGap)}</span></p>
                </motion.div>

                {/* 4 metrics */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={stagger}
                  className="grid grid-cols-2 gap-3"
                >
                  <MetricCard label="Clients who don't rebook/mo" value={String(calc.clientsNotRebooking)} icon={<UserMinus className="w-4 h-4" />} />
                  <MetricCard label="Lost rebooking revenue/mo" value={fmt(calc.lostRebookingRevenueMonth)} icon={<TrendingDown className="w-4 h-4" />} color="#F43F5E" />
                  <MetricCard label="Lost LTV per churned client" value={fmt(calc.currentLTV)} icon={<BarChart3 className="w-4 h-4" />} color="#A855F7" />
                  <MetricCard label="Cost to replace churned clients" value={fmt(calc.replacementCostMonth)} icon={<DollarSign className="w-4 h-4" />} color="#F59E0B" />
                </motion.div>

                {/* LTV Comparison */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-pink-400" />
                    Client Lifetime Value Comparison
                  </h3>
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Current LTV</span>
                        <span className="text-white font-semibold">{fmt(calc.currentLTV)} ({treatmentsBeforeStop} visits x {fmt(calc.revenuePerVisit)})</span>
                      </div>
                      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-500" style={{ width: `${currentLTVWidth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Optimal LTV</span>
                        <span className="text-white font-semibold">{fmt(calc.optimalLTV)} ({calc.optimalVisits} visits x {fmt(calc.revenuePerVisit)})</span>
                      </div>
                      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${optimalLTVWidth}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-sm text-pink-300">LTV gap per client: <span className="text-lg font-bold text-pink-400">{fmt(calc.ltvGap)}</span></p>
                  </div>
                </motion.div>

                {/* Rebooking Cascade */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-pink-400" />
                    The Rebooking Cascade
                  </h3>
                  <CascadeRow
                    label={`Without follow-up (${rebookingRate}% rebooking rate)`}
                    values={calc.cascade}
                    color={PINK}
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 ml-1">
                    <span>New clients</span><ArrowRight className="w-3 h-3" /><span>Rebook</span><ArrowRight className="w-3 h-3" /><span>Rebook again</span><ArrowRight className="w-3 h-3" /><span>Regulars</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <CascadeRow
                      label={`With AI follow-up (${Math.round(Math.min(rebookingRate + 25, 92))}% rebooking rate)`}
                      values={calc.cascadeAI}
                      color="#10B981"
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-500 ml-1">
                      <span>New clients</span><ArrowRight className="w-3 h-3" /><span>Rebook</span><ArrowRight className="w-3 h-3" /><span>Rebook again</span><ArrowRight className="w-3 h-3" /><span>Regulars</span>
                    </div>
                  </div>
                  <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-sm text-emerald-300">
                      <strong>{calc.cascadeAI[3] - calc.cascade[3]} more regulars</strong> per 100 new clients with AI follow-up
                    </p>
                  </div>
                </motion.div>

                {/* Hidden Cost Callout */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-gradient-to-br from-pink-950/40 to-slate-900 border border-pink-500/20 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-pink-400" />
                    Hidden Cost
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-300">You spend <strong className="text-white">{fmt(calc.cpa)}</strong> to acquire each new client</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-300">But it costs <strong className="text-emerald-400">$0</strong> to rebook an existing one</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingDown className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-300">You're spending <strong className="text-red-400">{fmt(calc.replacementCostMonth)}/month</strong> replacing clients you already had</p>
                    </div>
                  </div>
                </motion.div>

                {/* With AI-Powered Rebooking */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    With AI-Powered Rebooking
                  </h3>
                  <p className="text-sm text-slate-400 mb-5">Automated reminders sent at the perfect interval</p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">Improved rebooking rate</span>
                      <span className="text-sm font-bold text-white">{rebookingRate}% <ArrowRight className="w-3 h-3 inline text-emerald-400 mx-1" /> {Math.round(calc.improvedRebookingRate)}%</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">Revenue recovered</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt(calc.revenueRecoveredMonth)}/mo</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">Acquisition cost saved</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt(calc.acquistionSavedMonth)}/mo</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">Net gain after Boltcall (${calc.boltcallCost}/mo)</span>
                      <span className="text-lg font-bold text-emerald-400">{fmt(calc.netGain)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">ROI</span>
                      <span className="text-lg font-bold text-emerald-400">{Math.round(calc.roi).toLocaleString()}%</span>
                    </div>
                  </div>
                  <p className="text-center text-sm text-emerald-300 mt-4">
                    That's <strong>{calc.additionalRebookings} more treatments per month</strong> — without spending a dollar on ads
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ EMAIL CAPTURE ════════ */}
        <section className="px-4 sm:px-6 py-20 relative">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(236,72,153,0.06) 0%, transparent 60%)' }} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative z-10 max-w-2xl mx-auto"
          >
            <motion.div variants={fadeUp} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Check Your Inbox!</h3>
                  <p className="text-slate-400">Your Med Spa Revenue Report is on its way.</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 mb-4">
                      <Send className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-pink-300 font-medium">Free Report</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Get Your Free Med Spa Revenue Report</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {[
                      'Rebooking gap analysis with benchmarks',
                      'Treatment-specific follow-up sequences',
                      'Client retention playbook for med spas',
                      'Membership program design guide',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email address *"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Spa name (optional)"
                      value={spaName}
                      onChange={(e) => setSpaName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${PINK}, #BE185D)` }}
                    >
                      {submitting ? 'Sending...' : 'Get My Free Report'}
                    </button>
                    <p className="text-xs text-slate-500 text-center">No spam. Unsubscribe anytime.</p>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* ════════ SOCIAL PROOF ════════ */}
        <section className="px-4 sm:px-6 py-16 border-t border-slate-900">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: <UserMinus className="w-6 h-6" />, stat: '60%', text: 'Med spas lose 60% of first-time clients — most never come back' },
              { icon: <TrendingUp className="w-6 h-6" />, stat: '$50K+', text: 'Increasing rebooking rate by 15% can add $50,000+ in annual revenue' },
              { icon: <CalendarCheck className="w-6 h-6" />, stat: '3x', text: 'Clients who receive 3-touch reminders rebook 3x more often' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: PINK + '15', color: PINK }}>
                  {item.icon}
                </div>
                <p className="text-3xl font-black text-white mb-2">{item.stat}</p>
                <p className="text-sm text-slate-400">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ════════ VALUE CONTENT ════════ */}
        <section className="px-4 sm:px-6 py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">3 Ways to Turn One-Time Clients Into Regulars</h2>
              <p className="text-slate-400">Simple strategies that top-performing med spas use to keep chairs full</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Clock className="w-6 h-6" />,
                  title: 'Perfect-Timing Reminders',
                  desc: 'AI sends a rebooking nudge exactly when it\'s time for their next treatment — not too early, not too late. Personalized to each client\'s treatment cycle.',
                },
                {
                  icon: <Heart className="w-6 h-6" />,
                  title: 'Post-Treatment Follow-Up',
                  desc: 'A check-in message 48 hours after their treatment builds loyalty, catches concerns early, and keeps your spa top of mind when they\'re most impressed.',
                },
                {
                  icon: <Star className="w-6 h-6" />,
                  title: 'Membership Automation',
                  desc: 'After a client\'s 2nd visit, they\'re automatically invited to your loyalty or membership program — locking in recurring revenue without manual effort.',
                },
              ].map((tip, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-pink-500/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PINK}20, ${PINK}10)`, color: PINK }}>
                    {tip.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ════════ SOFT CTA ════════ */}
        <section className="px-4 sm:px-6 py-20 border-t border-slate-900">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Recover{' '}
              <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">{fmtK(calc.annualGap)}</span>{' '}
              in Lost Rebookings?
            </h2>
            <p className="text-slate-400 mb-8">See how automated rebooking reminders work for med spas</p>
            <a
              href="/features/automated-reminders"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${PINK}, #BE185D)` }}
            >
              See It In Action
              <ChevronRight className="w-5 h-5" />
            </a>
            <p className="text-sm text-slate-500 mt-4">Starting at $549/month &bull; No contracts &bull; Set up in 24 hours</p>
          </motion.div>
        </section>

      </main>
      <FinalCTA {...CALCULATOR_CTA} />

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

      {/* What This Tool Measures */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Analyzes</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Six metrics that reveal the true cost of unrebooked med-spa clients</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Clients per Month', desc: 'Active clients visiting your med spa each month' },
              { label: 'Rebooking Rate', desc: 'Percentage of clients who rebook before leaving' },
              { label: 'Average Service Value', desc: 'Revenue per treatment session or package' },
              { label: 'Client Lifetime Value', desc: 'Total spend from a loyal aesthetics client over 3+ years' },
              { label: 'Lapse Recovery Rate', desc: 'Clients regained via automated re-engagement sequences' },
              { label: 'Annual Revenue Gap', desc: 'Total income lost to clients who don\'t rebook' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Med Spa Industry Benchmarks: Call Capture and Revenue Impact</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing med spa businesses compare to the average on call response</p>
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
                  ['Calls answered rate', '76%', '99%+'],
                  ['Missed calls/month (40 call avg)', '9 calls', '0–1 calls'],
                  ['After-hours call coverage', 'Voicemail or none', '100% answered'],
                  ['Avg. response to web leads', '47 minutes', 'Under 60 seconds'],
                  ['Monthly revenue lost to missed calls', '$3,648', '$0–$500'],
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
      <Footer />

      {/* Slider thumb styling */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${PINK};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(236,72,153,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${PINK};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(236,72,153,0.4);
        }
      `}</style>
    </div>
  );
};

export default MedSpaRebookingCalculator;
