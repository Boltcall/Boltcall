import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Home, PhoneOff, TrendingUp,
  DollarSign, Users, Clock, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Timer, UserX, Phone, CloudLightning
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

const RoofingMissedLeadCalculator: React.FC = () => {
  // Card 1: Company Volume
  const [leadsPerMonth, setLeadsPerMonth] = useState(60);
  const [avgReplacementValue, setAvgReplacementValue] = useState(9500);
  const [avgRepairValue, setAvgRepairValue] = useState(1800);
  const [replacementPct, setReplacementPct] = useState(55);

  // Card 2: Lead Response Problem
  const [avgResponseHours, setAvgResponseHours] = useState(8);
  const [coldLeadPct, setColdLeadPct] = useState(40);
  const [stormLeadsPerMonth, setStormLeadsPerMonth] = useState(20);

  // Card 3: Estimate No-Shows
  const [estimateNoShowPct, setEstimateNoShowPct] = useState(20);
  const [estimateBookRate, setEstimateBookRate] = useState(35);

  // Card 4: Recovery with AI
  const [aiResponseBoostPct, setAiResponseBoostPct] = useState(65);
  const [stormFirstResponderPct, setStormFirstResponderPct] = useState(85);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Roofing Missed Lead Calculator (2026) | Boltcall';
    updateMetaDescription(
      'Free calculator for roofing companies. See how much revenue you lose every month to slow lead response times, estimate no-shows, and storm leads going to competitors.'
    );

    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'roofing-faq-schema';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How fast should a roofing company respond to a new lead?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Roofing companies should respond to new leads within 5 minutes. Studies show leads contacted in under 5 minutes are 9x more likely to convert. The average roofer takes 23 hours to respond — that delay hands the job to a faster competitor.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much revenue does a slow lead response cost a roofing company?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'With an average roof replacement at $9,500 and 40% of leads going cold after waiting more than one hour, a roofing company losing just 5 jobs per month to slow response loses $47,500 in monthly revenue — $570,000 per year.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who gets storm damage roofing jobs?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '85% of storm damage roofing work goes to the first contractor that responds. After a hailstorm or wind event, homeowners call multiple roofers simultaneously — the first to call back books the inspection and wins the job.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI answer calls and texts for a roofing company?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI systems like Boltcall respond to every inbound call, text, and web form lead in under 11 seconds — 24 hours a day, 7 days a week. The AI qualifies the lead, books the estimate appointment, and sends confirmation, so your sales team only talks to ready buyers.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the ROI of AI lead response for roofing companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most roofing companies see 1,000-5,000%+ ROI from AI lead response. At $897/month, recovering just one additional roof replacement per month ($9,500+) generates a 53x return on investment.',
          },
        },
      ],
    });
    document.head.appendChild(faqSchema);

    const articleSchema = document.createElement('script');
    articleSchema.type = 'application/ld+json';
    articleSchema.id = 'roofing-article-schema';
    articleSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Roofing Missed Lead Calculator: See Your Revenue Loss From Slow Response',
      description: 'Free calculator for roofing companies to see how much revenue is lost to slow lead response times, estimate no-shows, and storm leads going to the competition.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      datePublished: '2026-04-26',
      dateModified: '2026-04-26',
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg', width: 1200, height: 630 },
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
    bcScript.text = JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://boltcall.org"},{"@type":"ListItem","position":2,"name":"Tools","item":"https://boltcall.org/tools"},{"@type":"ListItem","position":3,"name":"Roofing Missed Lead Calculator","item":"https://boltcall.org/tools/roofing-missed-lead-calculator"}]});
    document.head.appendChild(bcScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      document.getElementById('roofing-faq-schema')?.remove();
      document.getElementById('roofing-article-schema')?.remove();
    };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    const avgJobValue =
      avgReplacementValue * (replacementPct / 100) + avgRepairValue * (1 - replacementPct / 100);

    const coldLeadsPerMonth = leadsPerMonth * (coldLeadPct / 100);
    const monthlySlowResponseLoss = coldLeadsPerMonth * avgJobValue * (estimateBookRate / 100);

    const stormLeadsLost = stormLeadsPerMonth * ((100 - stormFirstResponderPct) / 100);
    const monthlyStormLoss = stormLeadsLost * avgReplacementValue;

    const estimatesPerMonth = leadsPerMonth * (estimateBookRate / 100);
    const noShowsPerMonth = estimatesPerMonth * (estimateNoShowPct / 100);
    const monthlyNoShowLoss = noShowsPerMonth * avgJobValue * 0.5;

    const monthlyTotalLoss = monthlySlowResponseLoss + monthlyStormLoss + monthlyNoShowLoss;
    const annualTotalLoss = monthlyTotalLoss * 12;

    const recoveredColdLeads = coldLeadsPerMonth * (aiResponseBoostPct / 100);
    const recoveredColdRevenue = recoveredColdLeads * avgJobValue * (estimateBookRate / 100);
    const recoveredStormRevenue = stormLeadsLost * (aiResponseBoostPct / 100) * avgReplacementValue;
    const recoveredNoShowRevenue = monthlyNoShowLoss * 0.55;
    const monthlyRecovery = recoveredColdRevenue + recoveredStormRevenue + recoveredNoShowRevenue;
    const annualRecovery = monthlyRecovery * 12;

    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;

    return {
      avgJobValue, coldLeadsPerMonth, monthlySlowResponseLoss,
      stormLeadsLost, monthlyStormLoss,
      estimatesPerMonth, noShowsPerMonth, monthlyNoShowLoss,
      monthlyTotalLoss, annualTotalLoss,
      recoveredColdRevenue, recoveredStormRevenue, recoveredNoShowRevenue,
      monthlyRecovery, annualRecovery,
      boltcallAnnualCost, netGain, roi,
    };
  }, [
    leadsPerMonth, avgReplacementValue, avgRepairValue, replacementPct,
    avgResponseHours, coldLeadPct, stormLeadsPerMonth,
    estimateNoShowPct, estimateBookRate,
    aiResponseBoostPct, stormFirstResponderPct,
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
          niche: 'roofing',
          source: 'missed-lead-calculator',
          metrics: {
            monthly_total_loss: calc.monthlyTotalLoss,
            annual_total_loss: calc.annualTotalLoss,
            cold_leads_per_month: calc.coldLeadsPerMonth,
            storm_leads_lost: calc.stormLeadsLost,
            no_shows_per_month: calc.noShowsPerMonth,
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
          {unit === '$' ? fmt.format(value) : unit === 'h' ? `${value}h` : `${fmtNum.format(value)}${unit}`}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(20,184,166,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-teal-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
        <span>{unit === '$' ? fmt.format(min) : unit === 'h' ? `${min}h` : `${min}${unit}`}</span>
        {hint && <span className="text-slate-600">{hint}</span>}
        <span>{unit === '$' ? fmt.format(max) : unit === 'h' ? `${max}h` : `${max}${unit}`}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <GiveawayBar />
      <Header />
      <main className="pt-20">

        {/* HERO */}
        <section className="relative px-4 sm:px-6 pt-16 pb-12 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0c1a1a 50%, #0F172A 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(20,184,166,0.08) 0%, transparent 60%)' }} />
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-teal-400 mb-6">
              <Home className="w-4 h-4" />
              Free Tool for Roofing Companies
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Much Revenue Are You Losing to{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Slow Lead Response?
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              The average roofer takes 23 hours to respond to a new lead. Leads contacted within 5 minutes
              convert at 9x the rate. This calculator shows exactly how much revenue your roofing company
              loses every month to slow follow-up, cold leads, and storm jobs going to faster competitors.
            </motion.p>
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">85% of storm damage jobs go to the first roofer that calls back</span>
            </motion.div>
          </motion.div>
        </section>

        {/* CALCULATOR */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT INPUTS */}
            <div className="space-y-6">

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <Home className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Company Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your monthly lead flow and job values</div>
                  </div>
                </div>
                <Slider label="Inbound leads per month" value={leadsPerMonth} onChange={setLeadsPerMonth} min={10} max={300} hint="calls, texts, web forms" />
                <Slider label="Average roof replacement value" value={avgReplacementValue} onChange={setAvgReplacementValue} min={4000} max={30000} step={500} unit="$" />
                <Slider label="Average repair job value" value={avgRepairValue} onChange={setAvgRepairValue} min={300} max={8000} step={100} unit="$" />
                <Slider label="Replacements (% of jobs)" value={replacementPct} onChange={setReplacementPct} min={10} max={90} unit="%" hint="rest are repairs" />
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <Timer className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Lead Response Problem</div>
                    <div className="text-xs text-slate-500 mt-0.5">How slow response bleeds revenue</div>
                  </div>
                </div>
                <Slider label="Your average lead response time" value={avgResponseHours} onChange={setAvgResponseHours} min={0} max={48} unit="h" hint="industry avg is 23h" />
                <Slider label="% of leads that go cold waiting" value={coldLeadPct} onChange={setColdLeadPct} min={5} max={80} unit="%" hint="book a competitor instead" />
                <Slider label="Storm / insurance leads per month" value={stormLeadsPerMonth} onChange={setStormLeadsPerMonth} min={0} max={150} hint="hail, wind, emergency" />
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <UserX className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Estimate No-Shows</div>
                    <div className="text-xs text-slate-500 mt-0.5">Jobs that disappear before you quote</div>
                  </div>
                </div>
                <Slider label="Estimate no-show rate" value={estimateNoShowPct} onChange={setEstimateNoShowPct} min={0} max={50} unit="%" />
                <Slider label="Lead-to-estimate booking rate" value={estimateBookRate} onChange={setEstimateBookRate} min={10} max={80} unit="%" hint="of leads that book an estimate" />
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/15">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Recovery with AI</div>
                    <div className="text-xs text-slate-500 mt-0.5">What instant lead response recovers</div>
                  </div>
                </div>
                <Slider label="Cold leads recovered by instant response" value={aiResponseBoostPct} onChange={setAiResponseBoostPct} min={20} max={90} unit="%" hint="with sub-11-second response" />
                <Slider label="Storm jobs to first responder" value={stormFirstResponderPct} onChange={setStormFirstResponderPct} min={50} max={95} unit="%" hint="industry data" />
              </motion.div>
            </div>

            {/* RIGHT STICKY RESULTS */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6 sm:p-7">
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">Your Company Is Losing Every Month</p>
                  <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
                    {fmt.format(calc.monthlyTotalLoss)}
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Annual total: <span className="text-red-400 font-bold">{fmt.format(calc.annualTotalLoss)}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Cold leads / month', value: fmtNum.format(Math.round(calc.coldLeadsPerMonth)), icon: PhoneOff, color: 'text-red-400' },
                    { label: 'Storm jobs lost', value: fmtNum.format(Math.round(calc.stormLeadsLost)), icon: CloudLightning, color: 'text-amber-400' },
                    { label: 'Estimates booked / mo', value: fmtNum.format(Math.round(calc.estimatesPerMonth)), icon: Clock, color: 'text-teal-400' },
                    { label: 'Estimate no-shows / mo', value: fmtNum.format(Math.round(calc.noShowsPerMonth)), icon: UserX, color: 'text-blue-400' },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-800/60 rounded-xl p-3.5 text-center">
                      <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-1.5`} />
                      <p className="text-xl font-bold text-white">{m.value}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue Breakdown</p>
                  {[
                    { label: 'Slow response loss', val: calc.monthlySlowResponseLoss },
                    { label: 'Storm jobs to competitors', val: calc.monthlyStormLoss },
                    { label: 'Estimate no-show loss', val: calc.monthlyNoShowLoss },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                      <span className="text-sm text-slate-300">{r.label}</span>
                      <span className="text-sm font-bold text-red-400">{fmt.format(r.val)}/mo</span>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With Boltcall AI Recovery</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Monthly recovery', val: fmt.format(calc.monthlyRecovery) },
                      { label: 'Annual recovery', val: fmt.format(calc.annualRecovery) },
                      { label: 'Net gain after Boltcall ($897/mo)', val: fmt.format(calc.netGain) },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">{r.label}</span>
                        <span className="text-sm font-bold text-emerald-400">{r.val}</span>
                      </div>
                    ))}
                    <div className="border-t border-emerald-500/20 pt-2.5 mt-2.5 flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">ROI</span>
                      <span className="text-xl font-black text-emerald-400">{fmtNum.format(calc.roi)}%</span>
                    </div>
                    <p className="text-xs text-emerald-400/80 text-center pt-1">
                      That's <span className="font-bold text-emerald-400">
                        {fmtNum.format(Math.round(calc.coldLeadsPerMonth * (aiResponseBoostPct / 100)))} cold leads
                      </span> recovered every month
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-4xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              How Does AI Recover{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">Lost Roofing Jobs?</span>
            </motion.h2>
            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'Instant Lead Response — Under 11 Seconds',
                  desc: 'Every call, text, and web form gets an AI response in under 11 seconds — day or night. No more leads waiting hours while your crew is on the roof. The homeowner gets a real conversation, books an estimate, and never calls the next roofer down the list.',
                  icon: Phone, color: 'from-teal-500/15 to-teal-500/5', borderColor: 'border-teal-500/20', iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'Storm Season First Responder',
                  desc: 'After hailstorms or wind events, your AI automatically texts every lead in your area in the first 60 seconds. While competitors are still checking their phones, Boltcall has already booked the inspection — and 85% of those jobs are yours.',
                  icon: CloudLightning, color: 'from-blue-500/15 to-blue-500/5', borderColor: 'border-blue-500/20', iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Estimate Confirmation & No-Show Recovery',
                  desc: 'AI sends SMS reminders the night before and morning of every estimate appointment with one-tap confirm and reschedule links. Homeowners who might have forgotten show up — and if they cancel, the next lead on your waitlist gets the slot instantly.',
                  icon: Users, color: 'from-emerald-500/15 to-emerald-500/5', borderColor: 'border-emerald-500/20', iconColor: 'text-emerald-400',
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

        {/* EMAIL CAPTURE */}
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
              Get Your Free Roofing{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">Lead Recovery Report</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Speed-to-lead playbook built for roofing companies',
                  'Storm season first responder setup guide',
                  'Estimate no-show recovery via AI SMS reminders',
                  'Cold lead reactivation sequence for roofing',
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
                <input type="text" placeholder="Your Name" value={formName} onChange={(e) => setFormName(e.target.value)} required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all" />
                <input type="email" placeholder="Email Address" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all" />
                <input type="text" placeholder="Company Name (optional)" value={formCompany} onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all" />
                <button type="submit" disabled={formLoading}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
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

        {/* FAQ */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-3xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              What Roofing Companies{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">Ask About AI</span>
            </motion.h2>
            <div className="space-y-5">
              {[
                {
                  q: 'How fast should a roofing company respond to a new lead?',
                  a: 'Within 5 minutes. Research shows leads contacted in under 5 minutes are 9x more likely to book an estimate than those reached after 30 minutes. The average roofing company currently takes 23 hours to respond — that gap is where jobs are being lost to faster competitors every single day.',
                },
                {
                  q: 'How much does slow lead response cost a roofing company?',
                  a: "With an average roof replacement at $9,500, a roofing company that loses 5 jobs per month to slow response is leaving $47,500 on the table every month — $570,000 per year. Most roofers don't know this is happening because the lead just goes quiet and appears to have not been a good fit.",
                },
                {
                  q: 'Who gets storm damage and insurance roofing jobs?',
                  a: '85% of storm damage roofing work goes to the first contractor that calls back. After a hailstorm or wind event, homeowners simultaneously contact 3-5 roofing companies. They book the first one that responds with a real person or a helpful conversation — not a voicemail.',
                },
                {
                  q: 'Can AI actually respond to roofing leads?',
                  a: 'Yes. Modern AI systems like Boltcall respond to every inbound call, text, or web form lead in under 11 seconds. The AI introduces your company, qualifies the lead (type of damage, roof age, ownership), books the estimate appointment, and sends a confirmation text — all without your team lifting a finger.',
                },
                {
                  q: 'What ROI do roofing companies get from AI lead response?',
                  a: 'Most roofing companies see 1,000-5,000%+ ROI. At $897/month for Boltcall, recovering even one additional roof replacement per month ($9,500+) generates a 53x return. The average customer sees 8-12 additional jobs booked per month by eliminating the response delay.',
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

        {/* STATS */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { stat: '9x', text: 'Higher conversion rate when roofing leads are contacted within 5 minutes vs. 30+ minutes', icon: TrendingUp },
              { stat: '85%', text: 'Of storm damage roofing work goes to the first contractor that responds to the homeowner', icon: CloudLightning },
              { stat: '23h', text: 'Average response time for roofing companies — the window where most jobs are silently lost', icon: DollarSign },
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

        <FinalCTA {...CALCULATOR_CTA} />
      </main>

      <section className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            {[
              '100% Free — no credit card required',
              'Used by 500+ local businesses',
              'Results in 30 days or your money back',
              'Your data is never sold or shared',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Reveals</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Key metrics behind every missed roofing lead and its true cost</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Cold Leads Per Month', desc: 'Leads that stop responding because your follow-up was too slow' },
              { label: 'Storm Job Loss Rate', desc: 'How many emergency jobs go to the roofer who responded first' },
              { label: 'Average Job Value', desc: 'Blended value of replacements and repairs in your mix' },
              { label: 'Estimate No-Show Cost', desc: 'Revenue tied up in appointments that never happened' },
              { label: 'Annual Recovery Potential', desc: 'What AI lead response can recapture for your business' },
              { label: 'ROI on AI Automation', desc: "Net return after Boltcall's $897/month cost" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Roofing Industry Benchmarks: Lead Response Performance</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing roofing companies compare on speed to lead and revenue per lead</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Industry Average</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">With AI Response</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Average lead response time', '23 hours', 'Under 11 seconds'],
                  ['Storm job capture rate', '15-20% (not first)', '85%+ (first responder)'],
                  ['Lead-to-estimate conversion', '25-35%', '55-70% (faster response)'],
                  ['Estimate no-show rate', '18-25%', '8-12% (AI reminders)'],
                  ['After-hours lead capture', 'Voicemail (mostly lost)', 'All leads answered 24/7'],
                  ['Monthly cold leads recovered', '0 (manual follow-up)', '60-75% recovery rate'],
                  ['Time to set up 24/7 coverage', '2-4 weeks (hire staff)', '30 minutes (AI)'],
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

export default RoofingMissedLeadCalculator;
