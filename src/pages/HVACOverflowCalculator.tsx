import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Flame, Phone, PhoneOff, DollarSign, Users, Wrench, TrendingUp,
  Shield, ArrowRight, CheckCircle, AlertTriangle, Thermometer,
  Send, Zap, BarChart3, PhoneCall
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { CALCULATOR_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const HVACOverflowCalculator: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How many HVAC calls go unanswered during peak season?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'On average, HVAC companies miss 35–42% of inbound calls during peak season (summer cooling and winter heating). Each missed call is a potential $4,000–$8,000 install lost to a competitor who answered.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much revenue does an HVAC company lose to missed calls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A typical HVAC company receiving 28 calls/day at peak misses roughly 10–12 calls daily. At an average ticket value of $5,500, that is $55,000–$66,000 in potential revenue walked out the door each peak month.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI handle HVAC after-hours calls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Boltcall answers every HVAC call in under 11 seconds, 24/7 — including nights, weekends, and holiday peaks. It qualifies the homeowner, books the service appointment, and sends a confirmation text automatically.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'HVAC Overflow & Missed Revenue Calculator',
      url: 'https://boltcall.org/tools/hvac-overflow-calculator',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      description: 'Free calculator that estimates how much revenue an HVAC company loses each year from missed calls during peak and off-peak seasons.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]);

  // Peak Season Volume
  const [peakCallsPerDay, setPeakCallsPerDay] = useState(28);
  const [peakMonths, setPeakMonths] = useState(4);
  const [offPeakCallsPerDay, setOffPeakCallsPerDay] = useState(8);

  // Call Handling Reality
  const [peakMissedPct, setPeakMissedPct] = useState(38);
  const [offPeakMissedPct, setOffPeakMissedPct] = useState(12);
  const [staffAnswering, setStaffAnswering] = useState(1);
  const [techsAnswerCalls, setTechsAnswerCalls] = useState(true);

  // Revenue Per Job
  const [avgInstallValue, setAvgInstallValue] = useState(5800);
  const [avgServiceValue, setAvgServiceValue] = useState(285);
  const [installRatioPct, setInstallRatioPct] = useState(25);
  const [competitorLossPct, setCompetitorLossPct] = useState(72);

  // Maintenance Agreements
  const [maintenanceCustomers, setMaintenanceCustomers] = useState(80);
  const [annualAgreementValue, setAnnualAgreementValue] = useState(250);
  const [agreementFromCallersPct, setAgreementFromCallersPct] = useState(20);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Calculate HVAC Revenue Lost to Missed Calls | Boltcall';
    updateMetaDescription(
      'Free HVAC calculator — find out how many installs you lose during peak season when calls go unanswered. Calculate your revenue leak and fix it.'
    );
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "HVAC Overflow Calculator", "item": "https://boltcall.org/tools/hvac-overflow-calculator"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  const offPeakMonths = 12 - peakMonths;

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });


  const calc = useMemo(() => {
    const peakDays = peakMonths * 30;
    const offPeakDays = offPeakMonths * 30;

    const totalPeakCalls = peakCallsPerDay * peakDays;
    const totalOffPeakCalls = offPeakCallsPerDay * offPeakDays;

    const missedPeakCalls = Math.round(totalPeakCalls * (peakMissedPct / 100));
    const missedOffPeakCalls = Math.round(totalOffPeakCalls * (offPeakMissedPct / 100));
    const totalMissedCalls = missedPeakCalls + missedOffPeakCalls;

    const missedPeakPerMonth = Math.round(missedPeakCalls / peakMonths);

    // Of missed calls, how many go to competitor
    const lostPeakCallers = Math.round(missedPeakCalls * (competitorLossPct / 100));
    const lostOffPeakCallers = Math.round(missedOffPeakCalls * (competitorLossPct / 100));

    // Split into installs vs service
    const lostPeakInstalls = Math.round(lostPeakCallers * (installRatioPct / 100));
    const lostPeakService = lostPeakCallers - lostPeakInstalls;
    const lostOffPeakInstalls = Math.round(lostOffPeakCallers * (installRatioPct / 100));
    const lostOffPeakService = lostOffPeakCallers - lostOffPeakInstalls;

    const lostInstallRevenuePeak = lostPeakInstalls * avgInstallValue;
    const lostServiceRevenuePeak = lostPeakService * avgServiceValue;
    const peakSeasonLoss = lostInstallRevenuePeak + lostServiceRevenuePeak;

    const lostInstallRevenueOffPeak = lostOffPeakInstalls * avgInstallValue;
    const lostServiceRevenueOffPeak = lostOffPeakService * avgServiceValue;
    const offPeakLoss = lostInstallRevenueOffPeak + lostServiceRevenueOffPeak;

    const totalInstallLoss = lostInstallRevenuePeak + lostInstallRevenueOffPeak;
    const totalServiceLoss = lostServiceRevenuePeak + lostServiceRevenueOffPeak;
    const annualLoss = peakSeasonLoss + offPeakLoss;

    const totalLostInstalls = lostPeakInstalls + lostOffPeakInstalls;
    const totalLostService = lostPeakService + lostOffPeakService;

    // Maintenance agreements lost
    const totalMissedCallers = lostPeakCallers + lostOffPeakCallers;
    const lostAgreements = Math.round(totalMissedCallers * (agreementFromCallersPct / 100));
    const lostAgreementRevenue = lostAgreements * annualAgreementValue;

    // Tech distraction cost
    const techDistractionMonthlyCost = techsAnswerCalls
      ? Math.round((peakCallsPerDay * 0.25 * 15 / 60) * 75 * 22) // 25% of calls answered by techs, 15 min each, $75/hr billable, 22 work days
      : 0;

    // AI recovery
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const peakRecovery = Math.round(peakSeasonLoss * 0.85); // 85% recovery rate
    const annualRecovery = Math.round(annualLoss * 0.85);
    const netGain = annualRecovery - boltcallAnnualCost;
    const roi = boltcallAnnualCost > 0 ? Math.round((netGain / boltcallAnnualCost) * 100) : 0;
    const extraInstalls = Math.round(totalLostInstalls * 0.85);

    return {
      totalPeakCalls,
      totalOffPeakCalls,
      missedPeakCalls,
      missedOffPeakCalls,
      totalMissedCalls,
      missedPeakPerMonth,
      lostPeakInstalls,
      lostPeakService,
      lostOffPeakInstalls,
      lostOffPeakService,
      totalLostInstalls,
      totalLostService,
      lostInstallRevenuePeak,
      lostServiceRevenuePeak,
      peakSeasonLoss,
      offPeakLoss,
      totalInstallLoss,
      totalServiceLoss,
      annualLoss,
      lostAgreements,
      lostAgreementRevenue,
      techDistractionMonthlyCost,
      peakRecovery,
      annualRecovery,
      netGain,
      roi,
      extraInstalls,
      boltcallAnnualCost,
    };
  }, [
    peakCallsPerDay, peakMonths, offPeakCallsPerDay, offPeakMonths,
    peakMissedPct, offPeakMissedPct, techsAnswerCalls,
    avgInstallValue, avgServiceValue, installRatioPct, competitorLossPct,
    maintenanceCustomers, annualAgreementValue, agreementFromCallersPct,
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
          niche: 'hvac',
          source: 'peak-season-calculator',
          metrics: {
            peak_season_loss: calc.peakSeasonLoss,
            annual_loss: calc.annualLoss,
            missed_calls_peak: calc.missedPeakCalls,
            lost_installs: calc.totalLostInstalls,
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
        <span className="text-sm font-bold text-orange-400">
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
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(249,115,22,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
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
        {/* ─── HERO ─── */}
        <section className="relative px-4 sm:px-6 pt-16 pb-12 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1c1017 50%, #0F172A 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 60%)' }} />

          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-orange-400 mb-6">
              <Flame className="w-4 h-4" />
              Free Tool for HVAC Pros
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              How Many Installs Are You Losing{' '}
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                During Peak Season?
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              When the first heat wave hits, your phone explodes. But your team is on the roof, not at the desk.
              Calculate exactly how many $5,000+ installs walk to your competitor.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">HVAC companies miss up to 40% of calls during peak season</span>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── AEO STATIC TEXT — extractable by AI search ─── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-orange-900 mb-2">How Many HVAC Leads Are You Losing to Missed Calls?</h2>
            <p className="text-orange-800 text-sm leading-relaxed">
              HVAC companies miss an average of 38% of inbound calls during peak season when technicians are on job sites.
              Each missed call costs between $285 (service call) and $5,800 (new install). This calculator shows your
              exact annual revenue leak and what AI-assisted call answering recovers.
            </p>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Peak season is when HVAC businesses earn 60–70% of annual revenue — and it is also when call volume triples
            and staff are the least available to answer. The structural problem: the people who could answer calls are on
            the roof or in a crawlspace. Without automation, every ring that goes unanswered during a heat wave is a
            lead that immediately calls the next HVAC company on Google.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              '38% of HVAC calls go unanswered during peak season (Boltcall research)',
              '72% of callers hire the first HVAC company that answers',
              'Average install job value: $5,000–$8,000 in most US markets',
              'Each missed peak-season call costs an average of $1,900 in lost revenue when lifetime value is included',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-slate-400 text-sm">
                <span className="text-orange-400 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-slate-500 text-xs">
            See full data:{' '}
            <a href="/speed-to-lead" className="text-orange-400 hover:underline">
              Speed to Lead benchmarks for HVAC businesses →
            </a>
          </p>
        </section>

        {/* ─── CALCULATOR ─── */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-8">

            {/* LEFT — INPUTS */}
            <div className="space-y-6">

              {/* Card 1: Peak Season Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/15">
                    <Thermometer className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Peak Season Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">How busy does it really get?</div>
                  </div>
                </div>

                <Slider label="Incoming calls per day (peak)" value={peakCallsPerDay} onChange={setPeakCallsPerDay}
                  min={10} max={60} hint="avg for busy HVAC" />
                <Slider label="Peak season months per year" value={peakMonths} onChange={setPeakMonths}
                  min={2} max={6} unit=" mo" />
                <Slider label="Off-peak calls per day" value={offPeakCallsPerDay} onChange={setOffPeakCallsPerDay}
                  min={3} max={20} />

                <div className="flex justify-between items-center bg-slate-800/60 rounded-lg px-4 py-2.5 mt-2">
                  <span className="text-sm text-slate-400">Off-peak months</span>
                  <span className="text-sm font-bold text-white">{offPeakMonths} months (auto)</span>
                </div>
              </motion.div>

              {/* Card 2: Call Handling Reality */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <PhoneOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Call Handling Reality</div>
                    <div className="text-xs text-slate-500 mt-0.5">What happens when calls come in</div>
                  </div>
                </div>

                <Slider label="% of peak calls missed / voicemail" value={peakMissedPct} onChange={setPeakMissedPct}
                  min={10} max={70} unit="%" />
                <Slider label="% of off-peak calls missed" value={offPeakMissedPct} onChange={setOffPeakMissedPct}
                  min={5} max={30} unit="%" />
                <Slider label="Current staff answering phones" value={staffAnswering} onChange={setStaffAnswering}
                  min={0} max={5} />

                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-slate-300">Do techs answer calls on jobs?</span>
                  <button
                    onClick={() => setTechsAnswerCalls(!techsAnswerCalls)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      techsAnswerCalls ? 'bg-orange-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      techsAnswerCalls ? 'left-[30px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </motion.div>

              {/* Card 3: Revenue Per Job */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/15">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Revenue Per Job</div>
                    <div className="text-xs text-slate-500 mt-0.5">What each job type is worth</div>
                  </div>
                </div>

                <Slider label="Average install / replacement value" value={avgInstallValue} onChange={setAvgInstallValue}
                  min={3000} max={15000} step={100} unit="$" />
                <Slider label="Average repair / service call value" value={avgServiceValue} onChange={setAvgServiceValue}
                  min={100} max={800} step={5} unit="$" />
                <Slider label="Install vs service call ratio" value={installRatioPct} onChange={setInstallRatioPct}
                  min={10} max={50} unit="% installs" hint="of total calls" />
                <Slider label="% of missed callers who go to competitor" value={competitorLossPct} onChange={setCompetitorLossPct}
                  min={40} max={90} unit="%" />
              </motion.div>

              {/* Card 4: Maintenance Agreements */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/15">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Maintenance Agreements</div>
                    <div className="text-xs text-slate-500 mt-0.5">Recurring revenue from service customers</div>
                  </div>
                </div>

                <Slider label="Current maintenance agreement customers" value={maintenanceCustomers} onChange={setMaintenanceCustomers}
                  min={0} max={500} step={5} />
                <Slider label="Annual agreement value" value={annualAgreementValue} onChange={setAnnualAgreementValue}
                  min={150} max={500} step={10} unit="$" />
                <Slider label="% of agreements from first-time callers" value={agreementFromCallersPct} onChange={setAgreementFromCallersPct}
                  min={10} max={40} unit="%" />
              </motion.div>
            </div>

            {/* RIGHT — STICKY RESULTS */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">

              {/* Big Loss Number */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 border border-orange-500/20 rounded-2xl p-6 sm:p-7">
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2">
                    You're Losing During Peak Season
                  </p>
                  <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent leading-tight">
                    {fmt.format(calc.peakSeasonLoss)}
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Annual total: <span className="text-red-400 font-bold">{fmt.format(calc.annualLoss)}</span>
                  </p>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Missed calls / peak mo', value: fmtNum.format(calc.missedPeakPerMonth), icon: PhoneOff, color: 'text-red-400' },
                    { label: 'Lost installs / peak', value: fmtNum.format(calc.lostPeakInstalls), icon: Wrench, color: 'text-orange-400' },
                    { label: 'Lost service calls / peak', value: fmtNum.format(calc.lostPeakService), icon: Phone, color: 'text-yellow-400' },
                    { label: 'Lost agreements / year', value: fmtNum.format(calc.lostAgreements), icon: Shield, color: 'text-blue-400' },
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
                    <span className="text-sm text-slate-300">Install revenue lost</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.totalInstallLoss)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Service revenue lost</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.totalServiceLoss)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Maintenance agreements lost</span>
                    <span className="text-sm font-bold text-blue-400">{fmt.format(calc.lostAgreementRevenue)}/yr recurring</span>
                  </div>
                </div>

                {/* Tech Distraction Cost */}
                {techsAnswerCalls && calc.techDistractionMonthlyCost > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-400 mb-1">Tech Distraction Cost</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          When techs answer phones on jobs, each call costs ~15 min of billable time.
                        </p>
                        <p className="text-lg font-bold text-amber-400 mt-2">
                          {fmt.format(calc.techDistractionMonthlyCost)}/month in lost productivity
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* With AI Section */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With AI Answering Every Call</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Revenue recovered (peak)</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.peakRecovery)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Year-round recovery</span>
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
                      That's <span className="font-bold text-emerald-400">{calc.extraInstalls} extra installs</span> per peak season
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── EMAIL CAPTURE ─── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20"
          style={{ background: 'linear-gradient(180deg, #020617 0%, #0c1222 50%, #020617 100%)' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}
            className="max-w-2xl mx-auto text-center">

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-orange-400 mb-6">
              <BarChart3 className="w-4 h-4" />
              Free Report
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white mb-4">
              Get Your Free HVAC{' '}
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Revenue Recovery Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Peak season loss analysis based on your numbers',
                  'Call overflow management guide for HVAC companies',
                  'Maintenance agreement growth strategy',
                  'Seasonal staffing vs AI comparison breakdown',
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
                    focus:outline-none focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm
                    focus:outline-none focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
                <input
                  type="text"
                  placeholder="Company Name (optional)"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm
                    focus:outline-none focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)] transition-all"
                />
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700
                    text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20
                    hover:shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* ─── SOCIAL PROOF ─── */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '35-45%',
                text: 'HVAC companies report 35-45% of calls go unanswered during heat waves',
                icon: PhoneOff,
              },
              {
                stat: '$5,800',
                text: 'The average HVAC install is $5,800 — one missed call costs more than a year of AI',
                icon: DollarSign,
              },
              {
                stat: '28%',
                text: 'Companies using AI answering see 28% more booked installs during peak',
                icon: TrendingUp,
              },
            ].map((item) => (
              <motion.div key={item.stat} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center hover:border-orange-500/20 transition-colors">
                <item.icon className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                <p className="text-3xl font-black text-white mb-2">{item.stat}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ─── VALUE CONTENT ─── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-4xl mx-auto">

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
              3 Ways to{' '}
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Capture Every Call
              </span>{' '}
              During Peak Season
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: '24/7 AI Call Answering',
                  desc: 'Never miss a call, even when the whole team is on installs. AI picks up every ring — nights, weekends, heat waves — and books the appointment or takes a message instantly.',
                  icon: PhoneCall,
                  color: 'from-orange-500/15 to-orange-500/5',
                  borderColor: 'border-orange-500/20',
                  iconColor: 'text-orange-400',
                },
                {
                  num: '02',
                  title: 'Priority Routing',
                  desc: 'AI qualifies callers in real time and routes hot install leads immediately to your sales team. Service calls get scheduled, emergencies get escalated — all automatically.',
                  icon: Users,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Maintenance Agreement Builder',
                  desc: 'Turn every service call into recurring revenue. AI identifies agreement-eligible customers and offers enrollment during the call, growing your maintenance base on autopilot.',
                  icon: Shield,
                  color: 'from-emerald-500/15 to-emerald-500/5',
                  borderColor: 'border-emerald-500/20',
                  iconColor: 'text-emerald-400',
                },
              ].map((tip) => (
                <motion.div key={tip.num} variants={fadeUp}
                  className={`bg-gradient-to-r ${tip.color} border ${tip.borderColor} rounded-2xl p-6 sm:p-7 flex items-start gap-5`}>
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center`}>
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

        {/* ─── SOFT CTA ─── */}
        <section className="px-4 sm:px-6 py-16 sm:py-20"
          style={{ background: 'linear-gradient(180deg, #020617 0%, #1c1017 50%, #020617 100%)' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-2xl mx-auto text-center">

            <motion.div variants={fadeUp}>
              <Flame className="w-10 h-10 text-orange-400 mx-auto mb-4" />
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white mb-4">
              Ready to Capture{' '}
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                {fmt.format(calc.annualRecovery)} More Revenue
              </span>{' '}
              Next Peak Season?
            </motion.h2>

            <motion.p variants={fadeUp} className="text-slate-400 mb-8">
              Stop letting heat waves burn your revenue. Let AI answer while your team installs.
            </motion.p>

            <motion.div variants={fadeUp}>
              <a
                href="/features/ai-receptionist"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700
                  text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20
                  hover:shadow-orange-500/30 text-lg"
              >
                See It In Action
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-sm text-slate-500 mt-5">
              Starting at $549/month &bull; No contracts &bull; Set up in 24 hours
            </motion.p>
          </motion.div>
        </section>
      </main>

      {/* How the HVAC Overflow Calculator Works */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">How the HVAC Overflow Calculator Works</h2>
        <div className="space-y-4 text-slate-400 leading-relaxed text-base">
          <p>
            This calculator estimates how much revenue your HVAC company loses during peak season from missed overflow calls. When your phones are ringing faster than your team can answer — during a July heat wave or a January cold snap — those unanswered calls don't wait. They call your competitor. Enter your average job value and estimated missed calls during busy periods to see your monthly and annual opportunity cost in real time.
          </p>
          <p>
            The overflow problem is seasonal but the revenue loss is permanent. A homeowner who calls during peak season and can't reach you doesn't call back in three weeks when things slow down — they're already booked with someone else. This calculator separates your peak-season missed calls from your off-peak baseline so you can see exactly how much of your annual revenue leak comes from those critical high-volume months versus the rest of the year.
          </p>
          <p>
            Once you've calculated your overflow gap, the recovery estimate shows what an AI phone agent would recapture by answering every call instantly — day or night, peak or off-peak. Unlike voicemail or call forwarding, an AI agent qualifies the caller, captures their information, and schedules the appointment while your techs are on job sites. The ROI is calculated against Boltcall's fixed monthly cost so you can see your net gain and payback period before committing to anything.
          </p>
        </div>
      </section>

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

      {/* Why Boltcall */}
      <section className="py-16 sm:py-20 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">Why HVAC Companies Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "📞", title: "Never Miss a Peak-Season Call", desc: "AI answers every ring instantly during heat waves and cold snaps — when your team is on installs and phones go unanswered." },
              { icon: "🛠️", title: "Instant Job Scheduling", desc: "Callers are qualified and booked on the spot. Service calls get scheduled, installs get routed to sales — all without human touch." },
              { icon: "🔄", title: "Maintenance Agreement Upsells", desc: "AI identifies agreement-eligible customers during every service call and offers enrollment automatically, growing recurring revenue on autopilot." },
              { icon: "💰", title: "Proven ROI", desc: "HVAC clients typically recover 10–20x their monthly Boltcall cost in captured revenue during a single peak-season month." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Measures</h2>
          <p className="text-gray-500 text-sm text-center mb-6">The six demand metrics that determine how much overflow revenue you're leaving behind</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Peak-Season Call Volume', desc: 'Inbound service calls during summer and winter rush periods' },
              { label: 'Average Service Value', desc: 'Revenue per installation, repair, or maintenance visit' },
              { label: 'Overflow Call Loss Rate', desc: 'Calls going unanswered when your team is fully dispatched' },
              { label: 'After-Hours Call Volume', desc: 'Evening and weekend emergency HVAC calls' },
              { label: 'Customer Lifetime Value', desc: 'Total revenue from a retained HVAC service customer' },
              { label: 'Annual Revenue Opportunity', desc: 'Total income recoverable with 24/7 call coverage' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">HVAC Industry Benchmarks: Call Capture and Revenue Impact</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing hvac businesses compare to the average on call response</p>
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
                  ['Calls answered rate', '73%', '99%+'],
                  ['Missed calls/month (40 call avg)', '10 calls', '0–1 calls'],
                  ['After-hours call coverage', 'Voicemail or none', '100% answered'],
                  ['Avg. response to web leads', '47 minutes', 'Under 60 seconds'],
                  ['Monthly revenue lost to missed calls', '$9,180', '$0–$500'],
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
    </div>
  );
};

export default HVACOverflowCalculator;
