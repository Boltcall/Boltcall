import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Stethoscope, CalendarX2, PhoneOff, TrendingUp,
  DollarSign, Users, Clock, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Calendar, UserX, Phone
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

const VetClinicRevenueCalculator: React.FC = () => {
  // Card 1: Clinic Volume
  const [appointmentsPerDay, setAppointmentsPerDay] = useState(25);
  const [avgExamValue, setAvgExamValue] = useState(85);
  const [avgProcedureValue, setAvgProcedureValue] = useState(650);
  const [procedureRatioPct, setProcedureRatioPct] = useState(20);

  // Card 2: No-Show Reality
  const [noShowPct, setNoShowPct] = useState(18);
  const [lateCancelPct, setLateCancelPct] = useState(12);
  const [automatedReminders, setAutomatedReminders] = useState(false);
  const [rebookingPct, setRebookingPct] = useState(20);

  // Card 3: Missed Calls
  const [callsPerDay, setCallsPerDay] = useState(35);
  const [missedCallPct, setMissedCallPct] = useState(25);
  const [newClientPct, setNewClientPct] = useState(40);
  const [newClientLtv, setNewClientLtv] = useState(1800);

  // Card 4: Recovery Potential
  const [reminderRecoveryPct, setReminderRecoveryPct] = useState(55);
  const [callRecoveryPct, setCallRecoveryPct] = useState(85);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Vet Clinic No-Show Revenue Calculator | Boltcall';
    updateMetaDescription(
      'Free calculator for veterinary clinics \u2014 see how much revenue you lose to no-shows, missed calls, and late cancellations every month.'
    );

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Vet Clinic Revenue Calculator", "item": "https://boltcall.org/tools/vet-clinic-revenue-calculator"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    // No-show losses
    const monthlyAppointments = appointmentsPerDay * 22;
    const examAppointments = monthlyAppointments * (1 - procedureRatioPct / 100);
    const procedureAppointments = monthlyAppointments * (procedureRatioPct / 100);
    const noShowAppointments = monthlyAppointments * (noShowPct / 100);
    const lateCancelAppointments = monthlyAppointments * (lateCancelPct / 100);
    const totalLostAppointments = noShowAppointments + lateCancelAppointments;

    // Revenue from lost appointments (weighted by exam/procedure ratio)
    const avgAppointmentValue = avgExamValue * (1 - procedureRatioPct / 100) + avgProcedureValue * (procedureRatioPct / 100);
    const monthlyNoShowLoss = noShowAppointments * avgAppointmentValue;
    const monthlyLateCancelLoss = lateCancelAppointments * avgAppointmentValue * 0.7;
    const monthlyAppointmentLoss = monthlyNoShowLoss + monthlyLateCancelLoss;

    // Missed call losses
    const monthlyMissedCalls = callsPerDay * 22 * (missedCallPct / 100);
    const missedNewClientCalls = monthlyMissedCalls * (newClientPct / 100);
    const monthlyMissedCallLoss = missedNewClientCalls * newClientLtv * 0.3;

    // Totals
    const monthlyTotalLoss = monthlyAppointmentLoss + monthlyMissedCallLoss;
    const annualTotalLoss = monthlyTotalLoss * 12;

    // Recovery with AI
    const recoveredAppointmentRevenue = monthlyAppointmentLoss * (reminderRecoveryPct / 100);
    const recoveredCallRevenue = monthlyMissedCallLoss * (callRecoveryPct / 100);
    const monthlyRecovery = recoveredAppointmentRevenue + recoveredCallRevenue;
    const annualRecovery = monthlyRecovery * 12;
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    // Metric cards
    const noShowsPerMonth = Math.round(noShowAppointments);
    const lateCancelsPerMonth = Math.round(lateCancelAppointments);
    const missedNewClientsPerMonth = Math.round(missedNewClientCalls);
    const emptySlotsPerWeek = Math.round(totalLostAppointments / 4.33);

    return {
      monthlyAppointments,
      examAppointments,
      procedureAppointments,
      noShowAppointments,
      lateCancelAppointments,
      totalLostAppointments,
      avgAppointmentValue,
      monthlyNoShowLoss,
      monthlyLateCancelLoss,
      monthlyAppointmentLoss,
      monthlyMissedCalls,
      missedNewClientCalls,
      monthlyMissedCallLoss,
      monthlyTotalLoss,
      annualTotalLoss,
      recoveredAppointmentRevenue,
      recoveredCallRevenue,
      monthlyRecovery,
      annualRecovery,
      boltcallAnnualCost,
      netGain,
      roi,
      noShowsPerMonth,
      lateCancelsPerMonth,
      missedNewClientsPerMonth,
      emptySlotsPerWeek,
    };
  }, [
    appointmentsPerDay, avgExamValue, avgProcedureValue, procedureRatioPct,
    noShowPct, lateCancelPct, automatedReminders, rebookingPct,
    callsPerDay, missedCallPct, newClientPct, newClientLtv,
    reminderRecoveryPct, callRecoveryPct,
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
          niche: 'veterinary',
          source: 'no-show-calculator',
          metrics: {
            monthly_total_loss: calc.monthlyTotalLoss,
            annual_total_loss: calc.annualTotalLoss,
            no_shows_per_month: calc.noShowsPerMonth,
            late_cancels_per_month: calc.lateCancelsPerMonth,
            missed_new_clients: calc.missedNewClientsPerMonth,
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
              <Stethoscope className="w-4 h-4" />
              Free Tool for Veterinary Clinics
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Much Revenue Are You Losing to{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                No-Shows & Missed Calls?
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Pet owners forget appointments. Your front desk can't answer every call.
              Calculate exactly how much revenue walks out the door every month.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Vet clinics lose 15-30% of daily revenue to no-shows and late cancellations</span>
            </motion.div>
          </motion.div>
        </section>

        {/* --- How to Use This Calculator --- */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="bg-slate-900 border border-teal-500/20 rounded-2xl p-6 sm:p-8 space-y-4 text-slate-300 leading-relaxed">
            <h2 className="text-xl font-bold text-white">How to Use This Calculator</h2>
            <p>
              This tool is designed for veterinary clinic owners and practice managers who want to quantify revenue losses from three sources: no-shows and late cancellations, missed inbound calls from potential new clients, and incomplete rebooking after cancellations. Enter your clinic's actual numbers using the sliders — or leave the defaults, which reflect national averages for small to mid-size vet clinics — and watch the results panel update in real time.
            </p>
            <p>
              The methodology accounts for both direct revenue loss (the appointment value itself) and lifetime client value loss (missed new clients who go to a competitor never return). The "Recovery with AI" section models what happens when automated appointment reminders, 24/7 AI call answering, and instant waitlist management are applied to your current numbers — and calculates the net gain after the cost of the system.
            </p>
            <p>
              Most vet clinics are surprised to discover their real monthly loss is two to four times higher than they estimated. No-shows feel like a small nuisance day-to-day, but the compounding effect of 15-20% empty appointment slots across an entire month adds up to thousands of dollars in preventable lost revenue. Use this calculator as your baseline, then enter your email to receive a personalized PDF report with a step-by-step recovery plan.
            </p>
          </motion.div>
        </section>

        {/* --- CALCULATOR --- */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT --- INPUTS */}
            <div className="space-y-6">

              {/* Card 1: Clinic Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <Stethoscope className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Clinic Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your daily patient flow</div>
                  </div>
                </div>

                <Slider label="Appointments per day" value={appointmentsPerDay} onChange={setAppointmentsPerDay}
                  min={10} max={60} hint="avg for busy clinic" />
                <Slider label="Average exam / checkup value" value={avgExamValue} onChange={setAvgExamValue}
                  min={50} max={200} step={5} unit="$" />
                <Slider label="Average procedure / surgery value" value={avgProcedureValue} onChange={setAvgProcedureValue}
                  min={200} max={2000} step={50} unit="$" />
                <Slider label="Procedure ratio" value={procedureRatioPct} onChange={setProcedureRatioPct}
                  min={10} max={40} unit="%" hint="rest are exams" />
              </motion.div>

              {/* Card 2: No-Show Reality */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <CalendarX2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">No-Show Reality</div>
                    <div className="text-xs text-slate-500 mt-0.5">How often clients ghost their appointments</div>
                  </div>
                </div>

                <Slider label="No-show rate" value={noShowPct} onChange={setNoShowPct}
                  min={5} max={40} unit="%" />
                <Slider label="Late cancellation rate" value={lateCancelPct} onChange={setLateCancelPct}
                  min={5} max={25} unit="%" />

                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm text-slate-300">Current reminder method</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${!automatedReminders ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>Manual calls</span>
                    <button
                      onClick={() => setAutomatedReminders(!automatedReminders)}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                        automatedReminders ? 'bg-teal-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                        automatedReminders ? 'left-[30px]' : 'left-0.5'
                      }`} />
                    </button>
                    <span className={`text-xs ${automatedReminders ? 'text-teal-400 font-semibold' : 'text-slate-500'}`}>Automated texts</span>
                  </div>
                </div>

                <Slider label="Average rebooking rate" value={rebookingPct} onChange={setRebookingPct}
                  min={10} max={50} unit="%" hint="of no-shows who rebook" />
              </motion.div>

              {/* Card 3: Missed Calls */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <PhoneOff className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Missed Calls</div>
                    <div className="text-xs text-slate-500 mt-0.5">New clients you never hear from again</div>
                  </div>
                </div>

                <Slider label="Calls per day" value={callsPerDay} onChange={setCallsPerDay}
                  min={15} max={80} hint="incoming phone calls" />
                <Slider label="% of calls missed" value={missedCallPct} onChange={setMissedCallPct}
                  min={10} max={50} unit="%" />
                <Slider label="New client calls (% of total)" value={newClientPct} onChange={setNewClientPct}
                  min={20} max={60} unit="%" />
                <Slider label="New client lifetime value" value={newClientLtv} onChange={setNewClientLtv}
                  min={500} max={5000} step={100} unit="$" />
              </motion.div>

              {/* Card 4: Recovery Potential */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/15">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Recovery Potential</div>
                    <div className="text-xs text-slate-500 mt-0.5">What AI automation can recover</div>
                  </div>
                </div>

                <Slider label="% of no-shows recoverable with AI reminders" value={reminderRecoveryPct} onChange={setReminderRecoveryPct}
                  min={30} max={70} unit="%" hint="with smart reminders" />
                <Slider label="% of missed calls recoverable with AI answering" value={callRecoveryPct} onChange={setCallRecoveryPct}
                  min={60} max={95} unit="%" hint="24/7 AI receptionist" />
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
                    { label: 'No-shows / month', value: fmtNum.format(calc.noShowsPerMonth), icon: CalendarX2, color: 'text-red-400' },
                    { label: 'Late cancels / month', value: fmtNum.format(calc.lateCancelsPerMonth), icon: Clock, color: 'text-amber-400' },
                    { label: 'Missed new clients / mo', value: fmtNum.format(calc.missedNewClientsPerMonth), icon: UserX, color: 'text-teal-400' },
                    { label: 'Empty slots / week', value: fmtNum.format(calc.emptySlotsPerWeek), icon: Calendar, color: 'text-blue-400' },
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
                    <span className="text-sm text-slate-300">No-show loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyNoShowLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Late cancellation loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyLateCancelLoss)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed call loss</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.monthlyMissedCallLoss)}/mo</span>
                  </div>
                </div>

                {/* With AI Section */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With AI Reminders + Answering</p>
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
                      That's <span className="font-bold text-emerald-400">{fmtNum.format(Math.round(calc.emptySlotsPerWeek * 0.55))} filled slots</span> per week recovered
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
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
              Get Your Free Vet Clinic{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Revenue Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'No-show reduction strategy for vet clinics',
                  'AI reminder implementation guide',
                  'Missed call recovery playbook',
                  'New client acquisition optimization',
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
                  placeholder="Clinic Name (optional)"
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
                stat: '18-30%',
                text: 'Veterinary clinics report 18-30% no-show rates without automated reminders',
                icon: CalendarX2,
              },
              {
                stat: '$1,800',
                text: 'The average lifetime value of a new vet client -- one missed call costs more than a year of AI',
                icon: DollarSign,
              },
              {
                stat: '55%',
                text: 'AI reminders reduce no-shows by up to 55% compared to manual phone calls',
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

        {/* --- VALUE CONTENT --- */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-4xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              3 Ways to{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Recover Lost Revenue
              </span>{' '}
              at Your Clinic
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'AI Appointment Reminders',
                  desc: 'Smart SMS and voice reminders sent at the perfect time -- with easy confirm/reschedule links. Reduce no-shows by up to 55% without adding front desk workload.',
                  icon: Calendar,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: '24/7 AI Receptionist',
                  desc: 'Never miss a call from a worried pet owner. AI answers every ring -- after hours, during surgery, on weekends -- and books the appointment or takes a message instantly.',
                  icon: Phone,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Waitlist & Instant Rebooking',
                  desc: 'When a client cancels, AI instantly contacts the next person on the waitlist and fills the slot. Empty exam rooms become a thing of the past.',
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
          <p className="text-gray-500 text-sm text-center mb-6">Six metrics that show how much revenue your veterinary clinic loses each month</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Missed Calls per Week', desc: 'Calls going to voicemail while your staff is with patients' },
              { label: 'Average Appointment Value', desc: 'Revenue per wellness visit, procedure, or urgent care call' },
              { label: 'Client Lifetime Value', desc: 'Total spend from a loyal pet-owner over your relationship' },
              { label: 'After-Hours Emergency Calls', desc: 'Urgent calls arriving outside staffed hours' },
              { label: 'Rebooking Recovery', desc: 'Revenue captured via automated follow-up for lapsed patients' },
              { label: 'Annual Revenue Gap', desc: 'Total income lost to unanswered and mishandled calls' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Veterinary Clinic Benchmarks: Call Capture and Revenue Performance</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing vet clinics compare to the average on call handling and client retention</p>
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
                ['Calls answered rate', '65% (industry avg)', '99%+ with AI'],
                ['After-hours emergency call capture', 'Voicemail or none', 'All calls answered'],
                ['Monthly missed calls (30 avg)', '10–11 missed calls', '0–1 missed calls'],
                ['Average new client first-year value', '$380 – $680', '$380 – $680 (same)'],
                ['Monthly revenue lost to missed calls', '$3,800 – $7,480', '$0 – $680'],
                ['Annual wellness recall compliance', '48%', '65%+ (automated recall reminders)'],
                ['No-show rate', '15–20%', '7–10% (reminders active)'],
                ['Monthly Google review growth', '1–2 reviews/mo', '5–9 reviews/mo (automated)'],
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

export default VetClinicRevenueCalculator;
