import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  Phone,
  PhoneOff,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ArrowRight,
  ChevronDown,
  Shield,
  Bot,
  MessageSquare,
  CheckCircle2, CheckCircle,
  XCircle,
  Zap,
  FileText,
  Building2,
  Mail,
  User,
  Send,
  BarChart3,
  Target,
} from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { CALCULATOR_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

/* ───────── animation helpers ───────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ───────── types ───────── */
interface PracticeAreaOption {
  label: string;
  avgCase: number;
}

const PRACTICE_AREAS: PracticeAreaOption[] = [
  { label: 'Personal Injury', avgCase: 15000 },
  { label: 'Family Law', avgCase: 5000 },
  { label: 'Criminal Defense', avgCase: 4500 },
  { label: 'Estate Planning', avgCase: 3000 },
  { label: 'Business/Commercial', avgCase: 8000 },
  { label: 'Immigration', avgCase: 4000 },
  { label: "Workers' Comp", avgCase: 7500 },
  { label: 'Real Estate', avgCase: 3500 },
];

const RESPONSE_TIME_OPTIONS = [
  { label: 'Within 1 hour', multiplier: 0.9 },
  { label: 'Within 4 hours', multiplier: 0.75 },
  { label: 'Same business day', multiplier: 0.6 },
  { label: 'Next business day', multiplier: 0.4 },
  { label: '2-3 business days', multiplier: 0.25 },
];

const INTAKE_HANDLER_OPTIONS = [
  { label: 'Attorney personally', multiplier: 1.0 },
  { label: 'Trained intake specialist', multiplier: 0.9 },
  { label: 'Receptionist/secretary', multiplier: 0.7 },
  { label: 'Voicemail/email only', multiplier: 0.35 },
  { label: 'Answering service', multiplier: 0.6 },
];

const AFTER_HOURS_OPTIONS = [
  { label: 'Voicemail', lostRate: 0.72 },
  { label: 'Answering service', lostRate: 0.45 },
  { label: 'Nothing (line rings)', lostRate: 0.85 },
  { label: 'Auto-text response', lostRate: 0.55 },
];

/* ───────── formatters ───────── */
const fmtMoney = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

const fmtMoneyShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + Math.round(n).toLocaleString('en-US');
};

const fmtPct = (n: number) => Math.round(n) + '%';

/* ───────── slider component ───────── */
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  icon?: React.ReactNode;
}> = ({ label, value, min, max, step = 1, onChange, format, icon }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-white tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500
        [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.5)]
        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-400
        [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110
        [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-500
        [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-400"
      style={{
        background: `linear-gradient(to right, #6366F1 0%, #6366F1 ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
      }}
    />
  </div>
);

/* ───────── select component ───────── */
const Select: React.FC<{
  label: string;
  value: string;
  options: { label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}> = ({ label, value, options, onChange, icon }) => (
  <div className="space-y-2">
    <label className="text-sm text-slate-400 flex items-center gap-2">
      {icon}
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm
          appearance-none cursor-pointer hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-1
          focus:ring-indigo-500/30 transition-colors outline-none"
      >
        {options.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

/* ───────── input card wrapper ───────── */
const InputCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ icon, title, subtitle, children, delay = 0 }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    custom={delay}
    variants={fadeUp}
    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-7
      transition-all duration-300 hover:border-indigo-500/20
      hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]"
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
        {icon}
      </div>
      <div>
        <div className="text-[1.05rem] font-bold tracking-tight text-white">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </motion.div>
);

/* ───────── metric card ───────── */
const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div
    className={`rounded-xl p-4 border ${
      color === 'red'
        ? 'bg-red-500/10 border-red-500/20'
        : color === 'indigo'
        ? 'bg-indigo-500/10 border-indigo-500/20'
        : color === 'amber'
        ? 'bg-amber-500/10 border-amber-500/20'
        : 'bg-emerald-500/10 border-emerald-500/20'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      <span
        className={
          color === 'red'
            ? 'text-red-400'
            : color === 'indigo'
            ? 'text-indigo-400'
            : color === 'amber'
            ? 'text-amber-400'
            : 'text-emerald-400'
        }
      >
        {icon}
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
    <div className="text-xl font-bold text-white tabular-nums">{value}</div>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const LawyerIntakeCalculator: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much revenue does a law firm lose from missed intake calls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Law firms lose an average of $35,000–$150,000 per year from unanswered intake calls. In personal injury, a single missed case can represent $15,000–$100,000 in contingency fees. Studies show 42% of potential clients call only once and move to the next firm if no one answers.',
          },
        },
        {
          '@type': 'Question',
          name: 'What percentage of law firm leads go unanswered?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Research indicates that 38–45% of law firm intake calls go unanswered, especially outside business hours. Evening and weekend calls — when people search after an accident or legal emergency — are particularly at risk.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI handle legal intake calls 24/7?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Boltcall answers every intake call in under 11 seconds, qualifies the potential client, collects key case details, and books a consultation on the attorney\'s calendar — automatically, any time of day or night.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Law Firm Intake Revenue Loss Calculator',
      url: 'https://boltcall.org/tools/lawyer-intake-calculator',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      description: 'Free calculator for law firms to estimate annual revenue lost from missed intake calls and slow lead response.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]);

  /* ── state ── */
  const [practiceArea, setPracticeArea] = useState('Personal Injury');
  const [avgCaseValue, setAvgCaseValue] = useState(15000);
  const [casesPerMonth, setCasesPerMonth] = useState(5);

  const [callsPerWeek, setCallsPerWeek] = useState(15);
  const [emailsPerWeek, setEmailsPerWeek] = useState(8);
  const [businessHoursPct, setBusinessHoursPct] = useState(60);

  const [callsReachPerson, setCallsReachPerson] = useState(55);
  const [responseTime, setResponseTime] = useState('Same business day');
  const [intakeHandler, setIntakeHandler] = useState('Receptionist/secretary');
  const [conversionRate, setConversionRate] = useState(20);

  const [afterHoursAction, setAfterHoursAction] = useState('Voicemail');
  const [afterHoursLostPct, setAfterHoursLostPct] = useState(68);
  const [urgentRate, setUrgentRate] = useState(20);

  /* email form */
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFirm, setFormFirm] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  /* sync avg case value when practice area changes */
  useEffect(() => {
    const area = PRACTICE_AREAS.find((p) => p.label === practiceArea);
    if (area) setAvgCaseValue(area.avgCase);
  }, [practiceArea]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Law Firm Intake Leak Calculator | Boltcall';
    updateMetaDescription(
      'Free calculator for law firms: see how many cases you lose to missed calls, slow follow-up, and after-hours inquiries. Identify and fix your intake leaks.'
    );

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Lawyer Intake Calculator", "item": "https://boltcall.org/tools/lawyer-intake-calculator"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  /* ── calculations ── */
  const calc = useMemo(() => {
    const totalInquiriesWeek = callsPerWeek + emailsPerWeek;
    const totalInquiriesMonth = totalInquiriesWeek * 4.33;

    const afterHoursPct = 100 - businessHoursPct;
    const afterHoursInquiriesMonth = totalInquiriesMonth * (afterHoursPct / 100);
    const businessHoursInquiriesMonth = totalInquiriesMonth * (businessHoursPct / 100);

    /* calls that reach a person (business hours only, calls portion) */
    const callsMonth = callsPerWeek * 4.33;
    const emailsMonth = emailsPerWeek * 4.33;
    const businessHoursCallsMonth = callsMonth * (businessHoursPct / 100);
    const callsReachedPerson = businessHoursCallsMonth * (callsReachPerson / 100);
    const callsToVoicemail = businessHoursCallsMonth - callsReachedPerson;

    /* response time multiplier on voicemail/email recovery */
    const rtOption = RESPONSE_TIME_OPTIONS.find((r) => r.label === responseTime) || RESPONSE_TIME_OPTIONS[2];
    const handlerOption = INTAKE_HANDLER_OPTIONS.find((h) => h.label === intakeHandler) || INTAKE_HANDLER_OPTIONS[2];

    /* effective conversion for different paths */
    const directConversion = conversionRate / 100;
    const voicemailRecoveryRate = rtOption.multiplier * handlerOption.multiplier;
    const emailConversion = rtOption.multiplier * handlerOption.multiplier * directConversion;

    /* funnel: business hours */
    const directlyReached = callsReachedPerson;
    const directlyRetained = directlyReached * directConversion;

    const voicemailLeads = callsToVoicemail;
    const voicemailRecovered = voicemailLeads * voicemailRecoveryRate;
    const voicemailRetained = voicemailRecovered * directConversion;

    const businessHoursEmails = emailsMonth * (businessHoursPct / 100);
    const emailRetained = businessHoursEmails * emailConversion;

    const businessHoursRetained = directlyRetained + voicemailRetained + emailRetained;

    /* funnel: after hours */
    const ahOption = AFTER_HOURS_OPTIONS.find((a) => a.label === afterHoursAction) || AFTER_HOURS_OPTIONS[0];
    const afterHoursCallsMonth = callsMonth * (afterHoursPct / 100);
    const afterHoursEmailsMonth = emailsMonth * (afterHoursPct / 100);
    const afterHoursTotalMonth = afterHoursCallsMonth + afterHoursEmailsMonth;

    const afterHoursLostToCompetitor = afterHoursTotalMonth * (afterHoursLostPct / 100);
    const afterHoursRetained = (afterHoursTotalMonth - afterHoursLostToCompetitor) * directConversion * ahOption.lostRate;

    /* total current retained */
    const totalRetained = businessHoursRetained + afterHoursRetained;

    /* total potential (if 100% answered, optimal conversion) */
    const potentialRetained = totalInquiriesMonth * directConversion;

    /* losses */
    const voicemailLostMonth = callsToVoicemail * (1 - voicemailRecoveryRate);
    const afterHoursCasesLost = afterHoursLostToCompetitor * directConversion;
    const totalCasesLeaked = Math.max(0, potentialRetained - totalRetained);
    const monthlyFeeLeak = totalCasesLeaked * avgCaseValue;
    const annualFeeLeak = monthlyFeeLeak * 12;

    /* after-hours specific dollar loss */
    const afterHoursDollarLoss = afterHoursCasesLost * avgCaseValue;

    /* funnel stages */
    const funnelTotal = Math.round(totalInquiriesMonth);
    const funnelReached = Math.round(directlyReached + voicemailRecovered + businessHoursEmails + (afterHoursTotalMonth - afterHoursLostToCompetitor));
    const funnelQualified = Math.round(funnelReached * 0.6); // rough qualification rate
    const funnelRetained = Math.round(totalRetained);

    /* with AI intake (24/7, 95% answer rate, faster qualification) */
    const aiAnswerRate = 0.95;
    const aiConversionBoost = 1.3; // 30% better conversion from instant response
    const aiRetained = totalInquiriesMonth * aiAnswerRate * directConversion * aiConversionBoost;
    const casesRecovered = Math.max(0, aiRetained - totalRetained);
    const revenueRecovered = casesRecovered * avgCaseValue;
    const boltcallCost = 179;
    const netGain = revenueRecovered - boltcallCost;
    const roi = boltcallCost > 0 ? (netGain / boltcallCost) * 100 : 0;
    const yearsPayback = avgCaseValue > 0 ? avgCaseValue / (boltcallCost * 12) : 0;

    /* urgent cases */
    const urgentAfterHours = afterHoursTotalMonth * (urgentRate / 100);

    return {
      totalInquiriesMonth,
      afterHoursInquiriesMonth,
      businessHoursInquiriesMonth,
      voicemailLostMonth,
      afterHoursCasesLost,
      afterHoursLostToCompetitor,
      totalCasesLeaked,
      monthlyFeeLeak,
      annualFeeLeak,
      afterHoursDollarLoss,
      afterHoursTotalMonth,
      urgentAfterHours,
      funnelTotal,
      funnelReached,
      funnelQualified,
      funnelRetained,
      casesRecovered,
      revenueRecovered,
      netGain,
      roi,
      yearsPayback,
      boltcallCost,
    };
  }, [
    callsPerWeek,
    emailsPerWeek,
    businessHoursPct,
    callsReachPerson,
    responseTime,
    intakeHandler,
    conversionRate,
    afterHoursAction,
    afterHoursLostPct,
    urgentRate,
    avgCaseValue,
  ]);

  /* ── form submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail) return;
    setFormStatus('sending');
    try {
      await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/niche-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          business_name: formFirm,
          niche: 'lawyer',
          source: 'intake-leak-calculator',
          practice_area: practiceArea,
          metrics: {
            monthly_leak: Math.round(calc.monthlyFeeLeak),
            annual_leak: Math.round(calc.annualFeeLeak),
            after_hours_loss: Math.round(calc.afterHoursDollarLoss),
            cases_lost: Math.round(calc.totalCasesLeaked),
            roi: Math.round(calc.roi),
          },
        }),
      });
      setFormStatus('sent');
    } catch {
      setFormStatus('error');
    }
  };

  /* ═══════ RENDER ═══════ */
  return (
    <div className="min-h-screen bg-slate-950">
      <GiveawayBar />
      <Header />

      <main className="pt-20" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        {/* ════════════════ HERO ════════════════ */}
        <section className="relative px-6 pt-16 pb-14 text-center overflow-hidden bg-slate-950">
          {/* gradient bg */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
            }}
          />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative max-w-3xl mx-auto"
          >
            <motion.div custom={0} variants={fadeUp}>
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full text-[13px] font-semibold text-indigo-400 mb-6">
                <Scale className="w-4 h-4" />
                Free Tool for Law Firm Owners
              </div>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-5"
            >
              <span className="text-white">How Many Cases Are </span>
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                Walking Out Your Door?
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
            >
              A car accident victim calls your firm at 6pm. You're closed. They call the next
              attorney on Google. That one call could have been worth{' '}
              <span className="text-indigo-400 font-semibold">$50,000 in fees</span>. Calculate
              your intake leak.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm md:text-base font-medium">
                42% of law firms take 3+ days to respond to new inquiries
              </span>
            </motion.div>
          </motion.div>
        </section>

        {/* ════════════════ ABOUT THIS CALCULATOR ════════════════ */}
        <section className="relative px-4 md:px-6 py-10 bg-slate-950">
          <div className="max-w-3xl mx-auto">
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="bg-slate-900 border border-yellow-500/20 rounded-2xl p-6 sm:p-8 space-y-4 text-slate-300 leading-relaxed"
            >
              <h2 className="text-xl font-bold text-white">About This Calculator</h2>
              <p>
                The Lawyer Intake Calculator is designed for law firm owners, managing partners, and intake coordinators who want to quantify exactly how much revenue their current intake process is leaving on the table. Most law firms track case settlements and billable hours obsessively — but few have ever calculated how many qualified leads they lose before a case file is even opened. This tool fixes that.
              </p>
              <p>
                Enter your practice area, the number of new inquiries you receive each week, your current response time and intake process, and your average case value. The calculator models two scenarios: your current intake conversion rate, and an optimized rate that reflects what top-performing firms in your practice area consistently achieve. The gap between those two numbers is your monthly and annual revenue opportunity — the cases you are already generating leads for but failing to convert.
              </p>
              <p>
                Research from the Clio Legal Trends Report consistently shows that law firms that respond to inquiries within one hour convert at 2 to 3 times the rate of firms that respond the next business day. For high-value practice areas like personal injury or business litigation, that difference can represent hundreds of thousands of dollars annually. Use this calculator to understand your specific numbers, then scroll down to see which intake changes will move the needle fastest for your firm.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ════════════════ CALCULATOR ════════════════ */}
        <section className="relative px-4 md:px-6 py-12 bg-slate-950">
          <div className="max-w-[1360px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* ──── LEFT: INPUTS ──── */}
              <div className="lg:col-span-5 space-y-6">
                {/* Card 1: Case Economics */}
                <InputCard
                  icon={<DollarSign className="w-5 h-5" />}
                  title="Case Economics"
                  subtitle="Your practice area and typical fees"
                  delay={0}
                >
                  <Select
                    label="Practice Area"
                    value={practiceArea}
                    options={PRACTICE_AREAS}
                    onChange={(v) => setPracticeArea(v)}
                    icon={<Scale className="w-4 h-4" />}
                  />
                  <Slider
                    label="Average Case Value / Fee"
                    value={avgCaseValue}
                    min={1000}
                    max={100000}
                    step={500}
                    onChange={setAvgCaseValue}
                    format={fmtMoney}
                    icon={<DollarSign className="w-4 h-4" />}
                  />
                  <Slider
                    label="Average Cases Closed / Month"
                    value={casesPerMonth}
                    min={1}
                    max={30}
                    onChange={setCasesPerMonth}
                    icon={<FileText className="w-4 h-4" />}
                  />
                </InputCard>

                {/* Card 2: Inquiry Volume */}
                <InputCard
                  icon={<Phone className="w-5 h-5" />}
                  title="Inquiry Volume"
                  subtitle="How many potential clients reach out"
                  delay={1}
                >
                  <Slider
                    label="New Inquiry Calls / Week"
                    value={callsPerWeek}
                    min={3}
                    max={60}
                    onChange={setCallsPerWeek}
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <Slider
                    label="New Inquiry Emails/Forms / Week"
                    value={emailsPerWeek}
                    min={2}
                    max={30}
                    onChange={setEmailsPerWeek}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <Slider
                    label="% During Business Hours"
                    value={businessHoursPct}
                    min={40}
                    max={80}
                    onChange={setBusinessHoursPct}
                    format={(v) => fmtPct(v)}
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <div className="flex items-center justify-between text-sm bg-slate-800/60 rounded-lg px-4 py-2.5 border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-2">
                      <PhoneOff className="w-4 h-4" />
                      After-Hours / Weekends
                    </span>
                    <span className="font-semibold text-amber-400">
                      {fmtPct(100 - businessHoursPct)}
                    </span>
                  </div>
                </InputCard>

                {/* Card 3: Intake Process */}
                <InputCard
                  icon={<Users className="w-5 h-5" />}
                  title="Intake Process"
                  subtitle="How you handle new leads"
                  delay={2}
                >
                  <Slider
                    label="% of Calls That Reach a Person"
                    value={callsReachPerson}
                    min={20}
                    max={95}
                    onChange={setCallsReachPerson}
                    format={(v) => fmtPct(v)}
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <Select
                    label="Average Response to Voicemail/Email"
                    value={responseTime}
                    options={RESPONSE_TIME_OPTIONS}
                    onChange={setResponseTime}
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <Select
                    label="Who Handles Intake?"
                    value={intakeHandler}
                    options={INTAKE_HANDLER_OPTIONS}
                    onChange={setIntakeHandler}
                    icon={<Users className="w-4 h-4" />}
                  />
                  <Slider
                    label="Intake Conversion Rate (Inquiry -> Retained)"
                    value={conversionRate}
                    min={5}
                    max={50}
                    onChange={setConversionRate}
                    format={(v) => fmtPct(v)}
                    icon={<Target className="w-4 h-4" />}
                  />
                </InputCard>

                {/* Card 4: After-Hours Problem */}
                <InputCard
                  icon={<PhoneOff className="w-5 h-5" />}
                  title="The After-Hours Problem"
                  subtitle="What happens when the office is closed"
                  delay={3}
                >
                  <Select
                    label="After-Hours Call Handling"
                    value={afterHoursAction}
                    options={AFTER_HOURS_OPTIONS}
                    onChange={setAfterHoursAction}
                    icon={<PhoneOff className="w-4 h-4" />}
                  />
                  <Slider
                    label="% Who Hire Another Firm (After Hours)"
                    value={afterHoursLostPct}
                    min={40}
                    max={90}
                    onChange={setAfterHoursLostPct}
                    format={(v) => fmtPct(v)}
                    icon={<TrendingDown className="w-4 h-4" />}
                  />
                  <Slider
                    label="Emergency / Urgent Inquiry Rate"
                    value={urgentRate}
                    min={5}
                    max={40}
                    onChange={setUrgentRate}
                    format={(v) => fmtPct(v)}
                    icon={<AlertTriangle className="w-4 h-4" />}
                  />
                </InputCard>
              </div>

              {/* ──── RIGHT: RESULTS (sticky) ──── */}
              <div className="lg:col-span-7">
                <div className="lg:sticky lg:top-28 space-y-6">
                  {/* Big leak number */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={0}
                    variants={fadeUp}
                    className="rounded-2xl p-8 border border-indigo-500/30 text-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(99,102,241,0.05) 100%)',
                    }}
                  >
                    <p className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
                      Your Firm Is Leaking
                    </p>
                    <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">
                      {fmtMoney(calc.monthlyFeeLeak)}/mo
                    </p>
                    <p className="text-slate-500 text-sm">
                      in Potential Fees &middot; {fmtMoney(calc.annualFeeLeak)}/year
                    </p>
                  </motion.div>

                  {/* 4 metric cards */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="grid grid-cols-2 gap-3"
                  >
                    <motion.div custom={0} variants={fadeUp}>
                      <MetricCard
                        label="Inquiries Lost to Voicemail / Mo"
                        value={Math.round(calc.voicemailLostMonth).toString()}
                        icon={<PhoneOff className="w-4 h-4" />}
                        color="red"
                      />
                    </motion.div>
                    <motion.div custom={1} variants={fadeUp}>
                      <MetricCard
                        label="After-Hours Cases Lost / Mo"
                        value={Math.round(calc.afterHoursCasesLost).toString()}
                        icon={<Clock className="w-4 h-4" />}
                        color="amber"
                      />
                    </motion.div>
                    <motion.div custom={2} variants={fadeUp}>
                      <MetricCard
                        label="Potential Cases Leaked / Mo"
                        value={Math.round(calc.totalCasesLeaked).toString()}
                        icon={<TrendingDown className="w-4 h-4" />}
                        color="red"
                      />
                    </motion.div>
                    <motion.div custom={3} variants={fadeUp}>
                      <MetricCard
                        label="Fee Revenue Leaked / Mo"
                        value={fmtMoney(calc.monthlyFeeLeak)}
                        icon={<DollarSign className="w-4 h-4" />}
                        color="red"
                      />
                    </motion.div>
                  </motion.div>

                  {/* Intake Funnel Visualization */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={1}
                    variants={fadeUp}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6"
                  >
                    <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      Intake Funnel
                    </h3>
                    <div className="space-y-3">
                      {[
                        {
                          label: 'Total Inquiries / Month',
                          value: calc.funnelTotal,
                          pct: 100,
                          leaked: 0,
                        },
                        {
                          label: 'Reached a Person',
                          value: calc.funnelReached,
                          pct: calc.funnelTotal > 0 ? (calc.funnelReached / calc.funnelTotal) * 100 : 0,
                          leaked: calc.funnelTotal - calc.funnelReached,
                        },
                        {
                          label: 'Qualified Leads',
                          value: calc.funnelQualified,
                          pct: calc.funnelTotal > 0 ? (calc.funnelQualified / calc.funnelTotal) * 100 : 0,
                          leaked: calc.funnelReached - calc.funnelQualified,
                        },
                        {
                          label: 'Retained as Clients',
                          value: calc.funnelRetained,
                          pct: calc.funnelTotal > 0 ? (calc.funnelRetained / calc.funnelTotal) * 100 : 0,
                          leaked: calc.funnelQualified - calc.funnelRetained,
                        },
                      ].map((stage, idx) => (
                        <div key={stage.label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-300">{stage.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-semibold tabular-nums">
                                {stage.value}{' '}
                                <span className="text-slate-500 font-normal">
                                  ({fmtPct(stage.pct)})
                                </span>
                              </span>
                              {stage.leaked > 0 && (
                                <span className="text-red-400 text-xs flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />-{Math.round(stage.leaked)} leaked
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, stage.pct)}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.15 }}
                              className={`h-full rounded-full ${
                                idx === 0
                                  ? 'bg-indigo-500'
                                  : idx === 1
                                  ? 'bg-indigo-400'
                                  : idx === 2
                                  ? 'bg-purple-400'
                                  : 'bg-emerald-400'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* After-Hours Leak callout */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={2}
                    variants={fadeUp}
                    className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6"
                  >
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      The After-Hours Leak
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <PhoneOff className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          <span className="text-white font-semibold">
                            {Math.round(calc.afterHoursTotalMonth)} inquiries
                          </span>{' '}
                          happen after hours every month
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          <span className="text-white font-semibold">
                            {Math.round(calc.afterHoursLostToCompetitor)} of those callers
                          </span>{' '}
                          hire another firm
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          That's{' '}
                          <span className="text-red-400 font-bold">
                            {fmtMoney(calc.afterHoursDollarLoss)} in fees
                          </span>{' '}
                          &mdash; gone
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Scale className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          A single{' '}
                          <span className="text-white font-semibold">{practiceArea}</span> case
                          pays for{' '}
                          <span className="text-indigo-400 font-bold">
                            {calc.yearsPayback.toFixed(1)} years
                          </span>{' '}
                          of AI intake
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* With 24/7 AI Intake */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={3}
                    variants={fadeUp}
                    className="rounded-2xl p-6 border border-emerald-500/20"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.05) 100%)',
                    }}
                  >
                    <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      With 24/7 AI Intake
                    </h3>
                    <p className="text-slate-400 text-sm mb-5">
                      Every call answered. Every inquiry captured. Every after-hours caller engaged.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Cases Recovered / Mo</p>
                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                          +{Math.round(calc.casesRecovered)}
                        </p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Revenue Recovered / Mo</p>
                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                          +{fmtMoneyShort(calc.revenueRecovered)}
                        </p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">
                          Net Gain After Boltcall ({fmtMoney(calc.boltcallCost)}/mo)
                        </p>
                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                          +{fmtMoneyShort(calc.netGain)}
                        </p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">ROI</p>
                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                          {Math.round(calc.roi).toLocaleString()}%
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
                      <p className="text-emerald-300 text-sm font-medium">
                        One recovered case pays for{' '}
                        <span className="font-bold text-white">
                          {calc.yearsPayback.toFixed(1)} years
                        </span>{' '}
                        of service
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ EMAIL CAPTURE ════════════════ */}
        <section className="relative px-6 py-20 bg-slate-950">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)',
            }}
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="relative max-w-2xl mx-auto"
          >
            <motion.div
              custom={0}
              variants={fadeUp}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 md:p-10"
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Get Your Free Law Firm Intake Audit Report
                </h2>
                <p className="text-slate-400 text-sm">
                  We'll send you a custom report based on your numbers above
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  'Intake funnel analysis with specific leak points',
                  `After-hours capture strategy for ${practiceArea}`,
                  'Client intake scripts that convert',
                  'Comparison: receptionist vs answering service vs AI',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              {formStatus === 'sent' ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-xl font-bold text-white mb-1">Report on its way!</p>
                  <p className="text-slate-400 text-sm">Check your inbox in the next few minutes.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3
                          text-white text-sm placeholder:text-slate-500 focus:border-indigo-500
                          focus:ring-1 focus:ring-indigo-500/30 transition-colors outline-none"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3
                          text-white text-sm placeholder:text-slate-500 focus:border-indigo-500
                          focus:ring-1 focus:ring-indigo-500/30 transition-colors outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Firm Name (optional)"
                      value={formFirm}
                      onChange={(e) => setFormFirm(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3
                        text-white text-sm placeholder:text-slate-500 focus:border-indigo-500
                        focus:ring-1 focus:ring-indigo-500/30 transition-colors outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={formStatus === 'sending'}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60
                      text-white font-semibold py-3.5 rounded-xl transition-all duration-200
                      flex items-center justify-center gap-2 text-sm
                      shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
                  >
                    {formStatus === 'sending' ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Get My Free Intake Audit
                      </>
                    )}
                  </button>
                  {formStatus === 'error' && (
                    <p className="text-red-400 text-xs text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </form>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* ════════════════ SOCIAL PROOF ════════════════ */}
        <section className="px-6 py-16 bg-slate-950">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: <Clock className="w-6 h-6" />,
                stat: '42%',
                text: 'of law firms take 3+ days to return calls',
                source: 'Clio Legal Trends',
              },
              {
                icon: <DollarSign className="w-6 h-6" />,
                stat: '$15K-$100K',
                text: 'in fees — lost in a single missed personal injury call',
                source: 'Industry Average',
              },
              {
                icon: <Zap className="w-6 h-6" />,
                stat: '3x',
                text: 'more clients retained by firms with < 1 hour response time',
                source: 'Legal Intake Study',
              },
            ].map((item, i) => (
              <motion.div
                key={item.stat}
                custom={i}
                variants={fadeUp}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center
                  hover:border-indigo-500/20 transition-colors"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  {item.icon}
                </div>
                <p className="text-3xl font-black text-white mb-2">{item.stat}</p>
                <p className="text-slate-400 text-sm mb-2">{item.text}</p>
                <p className="text-slate-600 text-xs">{item.source}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ════════════════ VALUE CONTENT ════════════════ */}
        <section className="px-6 py-20 bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              custom={0}
              variants={fadeUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                3 Ways to Plug Your Intake Leaks
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                Stop losing cases to slow response times and missed calls
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                {
                  icon: <Bot className="w-7 h-7" />,
                  title: '24/7 AI Intake Specialist',
                  desc: 'An AI receptionist that answers after hours, qualifies leads with the right questions, and books consultations directly into your calendar. No more voicemail black holes.',
                },
                {
                  icon: <Shield className="w-7 h-7" />,
                  title: 'Instant Conflict Check & Qualification',
                  desc: 'AI asks the right screening questions — adverse parties, statute of limitations, jurisdiction — before your team even picks up. Only qualified leads reach your desk.',
                },
                {
                  icon: <MessageSquare className="w-7 h-7" />,
                  title: 'Automated Client Nurture',
                  desc: "Follow-up sequences for leads who aren't ready to retain yet. Drip education, case type resources, and check-ins until they're ready to move forward.",
                },
              ].map((tip, i) => (
                <motion.div
                  key={tip.title}
                  custom={i}
                  variants={fadeUp}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7
                    hover:border-indigo-500/20 hover:shadow-[0_0_30px_rgba(99,102,241,0.06)]
                    transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-5 group-hover:bg-indigo-500/15 transition-colors">
                    {tip.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{tip.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{tip.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ════════════════ SOFT CTA ════════════════ */}
        <section className="px-6 py-20 bg-slate-950">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.div custom={0} variants={fadeUp}>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-indigo-400" />
              </div>
            </motion.div>

            <motion.h2
              custom={1}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Ready to Stop Leaking{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {fmtMoneyShort(calc.monthlyFeeLeak)} in Fees
              </span>
              ?
            </motion.h2>

            <motion.p custom={2} variants={fadeUp} className="text-slate-400 mb-8 max-w-md mx-auto">
              See how AI intake captures every call, qualifies every lead, and books consultations
              while you sleep.
            </motion.p>

            <motion.div custom={3} variants={fadeUp}>
              <a
                href="/features/ai-receptionist"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white
                  font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-base
                  shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.4)]
                  hover:scale-[1.02]"
              >
                See It In Action
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>

            <motion.p custom={4} variants={fadeUp} className="text-slate-500 text-sm mt-5">
              Starting at $549/month &bull; No contracts &bull; Set up in 24 hours
            </motion.p>
            <motion.p custom={5} variants={fadeUp} className="text-slate-500 text-sm mt-2">
              <a href="/law-firm-security" className="underline hover:text-slate-300 transition-colors">
                How we handle confidentiality &amp; data security
              </a>
            </motion.p>
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


      {/* What This Tool Measures */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Calculator Analyzes</h2>
          <p className="text-gray-500 text-sm text-center mb-6">The six intake metrics that determine how much revenue your firm leaves on the table</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Missed Intake Calls', desc: 'Prospective client calls that go unanswered or to voicemail' },
              { label: 'Case Value', desc: 'Average revenue per signed client matter' },
              { label: 'Intake-to-Signing Rate', desc: 'Percentage of callers who convert to retained clients' },
              { label: 'After-Hours Volume', desc: 'Calls arriving evenings and weekends when staff are off' },
              { label: 'Follow-Up Recovery', desc: 'Revenue recaptured via automated intake reminders' },
              { label: 'Annual Revenue Gap', desc: 'Total yearly income lost to missed and slow intake responses' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Law Firm Intake Benchmarks: Lead Capture and Conversion Performance</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing law firms compare to the average on intake response and case conversion</p>
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
                ['Intake calls answered rate', '55% (industry avg)', '99%+ with AI'],
                ['After-hours intake capture', 'Voicemail or none', 'All intake calls answered'],
                ['Monthly missed intake calls (20 avg)', '9 missed calls', '0–1 missed calls'],
                ['Average case value', '$2,400 – $8,000', '$2,400 – $8,000 (same)'],
                ['Monthly revenue lost to missed intakes', '$21,600 – $72,000', '$0 – $8,000'],
                ['Intake-to-signing rate', '28%', '45%+ (speed + follow-up)'],
                ['Response time to web leads', '4–6 hours average', 'Under 60 seconds'],
                ['Monthly Google review growth', '0–1 reviews/mo', '3–6 reviews/mo (automated)'],
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

export default LawyerIntakeCalculator;
