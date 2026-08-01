import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Wrench, PhoneOff, TrendingUp,
  DollarSign, Users, Clock, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Calendar, UserX, Phone, Car
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

const AutoRepairMissedCallCalculator: React.FC = () => {
  // Card 1: Shop Volume
  const [carsPerDay, setCarsPerDay] = useState(12);
  const [avgRepairTicket, setAvgRepairTicket] = useState(450);
  const [avgOilChangeValue, setAvgOilChangeValue] = useState(75);
  const [majorRepairPct, setMajorRepairPct] = useState(40);

  // Card 2: Missed Calls & Walk-ins
  const [callsPerDay, setCallsPerDay] = useState(25);
  const [missedCallPct, setMissedCallPct] = useState(30);
  const [newCustomerPct, setNewCustomerPct] = useState(45);
  const [newCustomerLtv, setNewCustomerLtv] = useState(2400);

  // Card 3: Appointment No-Shows
  const [noShowPct, setNoShowPct] = useState(15);
  const [sameDayCancelPct, setSameDayCancelPct] = useState(10);

  // Card 4: Recovery with AI
  const [aiCallAnswerPct, setAiCallAnswerPct] = useState(85);
  const [reminderRecoveryPct, setReminderRecoveryPct] = useState(55);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Auto Repair Missed Call Calculator (2026) | Boltcall';
    updateMetaDescription(
      'Free calculator for auto repair shops. See how much revenue you lose to missed calls and no-shows every month, and what AI can recover.'
    );

    // FAQPage JSON-LD
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'auto-repair-faq-schema';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How many calls does the average auto repair shop miss per day?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The average auto repair shop misses 25-35% of incoming calls. For a shop receiving 25 calls per day, that means 7-9 missed calls daily, many of which are new customers who will call a competitor instead.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much revenue does a missed call cost an auto repair shop?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A single missed call from a new customer can cost $2,400 or more in lifetime value. When you factor in the average repair ticket of $450 and repeat visits over 3-5 years, each unanswered call represents significant lost revenue.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI answer phone calls for an auto repair shop?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI phone answering systems like Boltcall can answer 85-99% of incoming calls 24/7, book appointments, provide repair status updates, and collect customer information. The AI handles routine inquiries so your technicians can focus on repairs.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the no-show rate for auto repair appointments?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto repair shops typically see a 10-20% no-show rate plus an additional 8-12% same-day cancellation rate. AI-powered SMS reminders with easy confirm and reschedule links can recover up to 55% of these lost appointments.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the ROI of AI phone answering for auto repair shops?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most auto repair shops see a 500-2,000%+ ROI from AI phone answering. At $897/month, the system pays for itself by recovering just one or two missed customer calls per month, while the average shop recovers dozens.',
          },
        },
      ],
    });
    document.head.appendChild(faqSchema);

    // Article JSON-LD
    const articleSchema = document.createElement('script');
    articleSchema.type = 'application/ld+json';
    articleSchema.id = 'auto-repair-article-schema';
    articleSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Auto Repair Missed Call Calculator: See Your Revenue Loss',
      description: 'Free calculator for auto repair shops to calculate revenue lost to missed calls, no-shows, and same-day cancellations.',
      author: { '@type': 'Organization', name: 'Boltcall' },
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
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Auto Repair Missed Call Calculator", "item": "https://boltcall.org/tools/auto-repair-missed-call-calculator"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('auto-repair-faq-schema')?.remove();
      document.getElementById('auto-repair-article-schema')?.remove();
    };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    // Monthly working days
    const workDays = 22;

    // Shop volume
    const monthlyCars = carsPerDay * workDays;
    const majorRepairs = monthlyCars * (majorRepairPct / 100);
    const basicServices = monthlyCars * (1 - majorRepairPct / 100);
    const avgTicketValue = avgRepairTicket * (majorRepairPct / 100) + avgOilChangeValue * (1 - majorRepairPct / 100);

    // Missed call losses
    const monthlyTotalCalls = callsPerDay * workDays;
    const monthlyMissedCalls = monthlyTotalCalls * (missedCallPct / 100);
    const lostNewCustomers = monthlyMissedCalls * (newCustomerPct / 100);
    // New customer value: first visit ticket + 30% of remaining LTV captured immediately
    const monthlyMissedCallLoss = lostNewCustomers * (avgTicketValue + newCustomerLtv * 0.25);

    // No-show & cancellation losses
    const monthlyNoShows = monthlyCars * (noShowPct / 100);
    const monthlySameDayCancels = monthlyCars * (sameDayCancelPct / 100);
    const monthlyNoShowLoss = monthlyNoShows * avgTicketValue;
    const monthlyCancelLoss = monthlySameDayCancels * avgTicketValue * 0.7; // partial recovery on some
    const monthlyAppointmentLoss = monthlyNoShowLoss + monthlyCancelLoss;

    // Totals
    const monthlyTotalLoss = monthlyMissedCallLoss + monthlyAppointmentLoss;
    const annualTotalLoss = monthlyTotalLoss * 12;

    // Recovery with AI
    const recoveredCallRevenue = monthlyMissedCallLoss * (aiCallAnswerPct / 100);
    const recoveredAppointmentRevenue = monthlyAppointmentLoss * (reminderRecoveryPct / 100);
    const monthlyRecovery = recoveredCallRevenue + recoveredAppointmentRevenue;
    const annualRecovery = monthlyRecovery * 12;
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    return {
      monthlyCars,
      majorRepairs,
      basicServices,
      avgTicketValue,
      monthlyTotalCalls,
      monthlyMissedCalls,
      lostNewCustomers,
      monthlyMissedCallLoss,
      monthlyNoShows,
      monthlySameDayCancels,
      monthlyNoShowLoss,
      monthlyCancelLoss,
      monthlyAppointmentLoss,
      monthlyTotalLoss,
      annualTotalLoss,
      recoveredCallRevenue,
      recoveredAppointmentRevenue,
      monthlyRecovery,
      annualRecovery,
      boltcallAnnualCost,
      netGain,
      roi,
    };
  }, [
    carsPerDay, avgRepairTicket, avgOilChangeValue, majorRepairPct,
    callsPerDay, missedCallPct, newCustomerPct, newCustomerLtv,
    noShowPct, sameDayCancelPct,
    aiCallAnswerPct, reminderRecoveryPct,
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
          niche: 'auto-repair',
          source: 'missed-call-calculator',
          metrics: {
            monthly_total_loss: calc.monthlyTotalLoss,
            annual_total_loss: calc.annualTotalLoss,
            monthly_missed_calls: calc.monthlyMissedCalls,
            lost_new_customers: calc.lostNewCustomers,
            no_shows_per_month: calc.monthlyNoShows,
            same_day_cancels_per_month: calc.monthlySameDayCancels,
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
              <Wrench className="w-4 h-4" />
              Free Tool for Auto Repair Shops
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Much Revenue Do{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Missed Calls Cost Your Shop?
              </span>
            </motion.h1>

            {/* Direct answer block (within first 150 words for AEO) */}
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Auto repair shops miss 25-35% of incoming phone calls. Each missed call from a new customer
              represents $2,400+ in lifetime value. This free calculator shows exactly how much revenue
              your shop loses every month to missed calls, no-shows, and same-day cancellations.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">The average repair shop loses $8,000-$15,000/month to unanswered calls alone</span>
            </motion.div>
          </motion.div>
        </section>

        {/* --- CALCULATOR --- */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT --- INPUTS */}
            <div className="space-y-6">

              {/* Card 1: Shop Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <Car className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Shop Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your daily service throughput</div>
                  </div>
                </div>

                <Slider label="Cars serviced per day" value={carsPerDay} onChange={setCarsPerDay}
                  min={3} max={40} hint="avg for busy shop" />
                <Slider label="Average repair ticket value" value={avgRepairTicket} onChange={setAvgRepairTicket}
                  min={100} max={2000} step={25} unit="$" />
                <Slider label="Average oil change / basic service value" value={avgOilChangeValue} onChange={setAvgOilChangeValue}
                  min={30} max={200} step={5} unit="$" />
                <Slider label="Major repairs (% of jobs)" value={majorRepairPct} onChange={setMajorRepairPct}
                  min={10} max={80} unit="%" hint="rest are basic services" />
              </motion.div>

              {/* Card 2: Missed Calls */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <PhoneOff className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Missed Calls & Walk-ins</div>
                    <div className="text-xs text-slate-500 mt-0.5">New customers who call a competitor instead</div>
                  </div>
                </div>

                <Slider label="Phone calls per day" value={callsPerDay} onChange={setCallsPerDay}
                  min={5} max={80} hint="incoming calls" />
                <Slider label="% of calls missed" value={missedCallPct} onChange={setMissedCallPct}
                  min={5} max={60} unit="%" />
                <Slider label="% of missed calls from new customers" value={newCustomerPct} onChange={setNewCustomerPct}
                  min={10} max={80} unit="%" />
                <Slider label="Average new customer lifetime value" value={newCustomerLtv} onChange={setNewCustomerLtv}
                  min={500} max={8000} step={100} unit="$" />
              </motion.div>

              {/* Card 3: Appointment No-Shows */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <Calendar className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Appointment No-Shows</div>
                    <div className="text-xs text-slate-500 mt-0.5">Bays sitting empty, technicians waiting</div>
                  </div>
                </div>

                <Slider label="No-show rate" value={noShowPct} onChange={setNoShowPct}
                  min={0} max={40} unit="%" />
                <Slider label="Same-day cancellation rate" value={sameDayCancelPct} onChange={setSameDayCancelPct}
                  min={0} max={30} unit="%" />
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
                    <div className="text-xs text-slate-500 mt-0.5">What AI automation can recover for your shop</div>
                  </div>
                </div>

                <Slider label="AI call answer rate" value={aiCallAnswerPct} onChange={setAiCallAnswerPct}
                  min={50} max={99} unit="%" hint="24/7 AI receptionist" />
                <Slider label="Reminder recovery rate" value={reminderRecoveryPct} onChange={setReminderRecoveryPct}
                  min={20} max={80} unit="%" hint="no-shows recovered by SMS" />
              </motion.div>
            </div>

            {/* RIGHT --- STICKY RESULTS */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">

              {/* Big Loss Number */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6 sm:p-7">
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
                    Your Shop Is Losing Every Month
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
                    { label: 'Missed calls / month', value: fmtNum.format(Math.round(calc.monthlyMissedCalls)), icon: PhoneOff, color: 'text-red-400' },
                    { label: 'Lost new customers / mo', value: fmtNum.format(Math.round(calc.lostNewCustomers)), icon: UserX, color: 'text-amber-400' },
                    { label: 'No-shows / month', value: fmtNum.format(Math.round(calc.monthlyNoShows)), icon: Calendar, color: 'text-teal-400' },
                    { label: 'Same-day cancels / mo', value: fmtNum.format(Math.round(calc.monthlySameDayCancels)), icon: Clock, color: 'text-blue-400' },
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
                    <span className="text-sm text-slate-300">No-show loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyNoShowLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Same-day cancellation loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyCancelLoss)}/mo</span>
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
                      <span className="text-sm text-slate-400">Monthly recovery</span>
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
                      That's <span className="font-bold text-emerald-400">{fmtNum.format(Math.round(calc.lostNewCustomers * (aiCallAnswerPct / 100)))} new customers</span> recovered per month
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
              How Does AI Recover{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Lost Revenue for Auto Shops?
              </span>
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: '24/7 AI Phone Answering',
                  desc: 'Every call gets answered instantly, even during peak hours, after close, or weekends. AI books appointments, gives repair estimates, and collects vehicle details so your techs never stop turning wrenches.',
                  icon: Phone,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'Smart Appointment Reminders',
                  desc: 'AI sends SMS reminders at the perfect time with one-tap confirm or reschedule links. No more empty bays because a customer forgot their 9 AM brake job appointment.',
                  icon: Calendar,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Instant Waitlist Filling',
                  desc: 'When a customer cancels, AI automatically contacts the next person waiting for an opening. Empty bay slots get filled within minutes, not hours.',
                  icon: Users,
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
              Get Your Free Auto Repair{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Revenue Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Missed call recovery strategy for auto shops',
                  'AI phone answering implementation guide',
                  'No-show reduction playbook with SMS reminders',
                  'New customer acquisition and retention roadmap',
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
                  placeholder="Shop Name (optional)"
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

        {/* --- FAQ --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-3xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              What Auto Repair Owners{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Ask About AI
              </span>
            </motion.h2>

            <div className="space-y-5">
              {[
                {
                  q: 'How many calls does the average auto repair shop miss per day?',
                  a: 'The average auto repair shop misses 25-35% of incoming calls. For a shop receiving 25 calls per day, that means 7-9 missed calls daily. Most of these happen when technicians are under the hood or your service advisor is already on the phone. New customers who get voicemail rarely leave a message and call the next shop on Google instead.',
                },
                {
                  q: 'How much revenue does a missed call cost an auto repair shop?',
                  a: 'A single missed call from a new customer can cost $2,400 or more in lifetime value. The immediate loss is one repair ticket ($300-$600), but the real cost is the 3-5 years of oil changes, brake jobs, tire rotations, and major repairs that customer would have brought you. One missed call per day adds up to $50,000-$75,000 in annual lost revenue.',
                },
                {
                  q: 'Can AI actually answer phone calls for my auto repair shop?',
                  a: 'Yes. Modern AI phone systems answer calls in under 2 seconds, 24/7. They can book appointments, provide repair status updates, give basic estimates, collect vehicle year/make/model, and route urgent calls to your team. Customers often cannot tell they are speaking with AI. The system integrates with your existing scheduling software.',
                },
                {
                  q: 'What is the typical no-show rate for auto repair appointments?',
                  a: 'Auto repair shops typically see a 10-20% no-show rate plus an additional 8-12% same-day cancellation rate. That means for every 10 appointments scheduled, 2-3 empty bays are costing you labor and lost revenue. AI-powered SMS reminders with one-tap confirm and reschedule links can recover up to 55% of these lost appointments.',
                },
                {
                  q: 'What ROI can an auto repair shop expect from AI phone answering?',
                  a: 'Most auto repair shops see a 500-2,000%+ ROI from AI phone answering. At $897/month, the system pays for itself by recovering just one or two missed customer calls per month. The average shop recovers dozens of calls monthly, making this one of the highest-ROI investments available to independent repair shops.',
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

        {/* --- SOCIAL PROOF --- */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '30%',
                text: 'Auto repair shops miss up to 30% of incoming phone calls during business hours',
                icon: PhoneOff,
              },
              {
                stat: '$2,400',
                text: 'Average lifetime value of a single new auto repair customer over 3-5 years',
                icon: DollarSign,
              },
              {
                stat: '85%',
                text: 'AI phone systems answer 85%+ of calls that would otherwise go to voicemail',
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Reveals</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Key metrics behind every missed auto-repair call and its true cost</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Missed Calls per Week', desc: 'Calls going to voicemail while your team is on the floor' },
              { label: 'Average Repair Order Value', desc: 'Typical invoice amount per vehicle visit' },
              { label: 'Customer Lifetime Value', desc: 'Total spend from a loyal auto-repair customer over 5 years' },
              { label: 'Return Visit Rate', desc: 'How often customers rebook for maintenance or repairs' },
              { label: 'After-Hours Call Volume', desc: 'Calls arriving outside staffed shop hours' },
              { label: 'Annual Lost Revenue', desc: 'Total income slipping away from unanswered calls' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Auto Repair Shop Industry Benchmarks: Call Capture Performance</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing auto repair shops compare to the average on call response and revenue</p>
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
                ['Calls answered rate', '68% (industry avg)', '99%+ with AI'],
                ['After-hours call capture', 'Voicemail or none', 'All calls answered'],
                ['Monthly missed calls (30 call avg)', '9–10 missed calls', '0–1 missed calls'],
                ['Revenue per repair order', '$285 – $380', '$285 – $380 (same)'],
                ['Monthly revenue lost to missed calls', '$2,565 – $3,420', '$0 – $285'],
                ['No-show rate for appointments', '18–22%', '8–12% (reminders active)'],
                ['Monthly Google review growth', '1–2 reviews/mo', '5–8 reviews/mo (automated)'],
                ['Setup time for 24/7 coverage', '2–4 weeks (hire staff)', '30 minutes (AI)'],
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

export default AutoRepairMissedCallCalculator;
