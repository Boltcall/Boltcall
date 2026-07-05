import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Timer,
  Phone,
  MessageSquare,
  Users,
  Shield,
  ChevronDown,
  Star,
  Target,
  BarChart3,
  Send,
  Home,
  Bot,
  PhoneOff,
  Mail,
} from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import { createServiceSchema, injectSchemas } from '../lib/schema';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ─── types ─── */
type ResponseTime = 'under5' | '5to15' | '15to60' | '1to4h' | '4plus' | 'nextday';
type MissedAction = 'voicemail' | 'assistant' | 'autotext' | 'nothing';

interface ScoreGrade {
  letter: string;
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  ringColor: string;
}

/* ─── constants ─── */
const CONTACT_RATES: Record<ResponseTime, number> = {
  under5: 0.78,
  '5to15': 0.56,
  '15to60': 0.36,
  '1to4h': 0.16,
  '4plus': 0.08,
  nextday: 0.02,
};

const RESPONSE_LABELS: Record<ResponseTime, string> = {
  under5: 'Under 5 minutes',
  '5to15': '5–15 minutes',
  '15to60': '15–60 minutes',
  '1to4h': '1–4 hours',
  '4plus': '4+ hours',
  nextday: 'Next day',
};

const SCORE_LETTERS: Record<ResponseTime, ScoreGrade> = {
  under5: { letter: 'A+', label: 'Elite — you\'re in the top 5%', color: '#10B981', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20', ringColor: 'ring-emerald-500/40' },
  '5to15': { letter: 'B', label: 'Good — but you\'re still losing deals', color: '#FBBF24', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20', ringColor: 'ring-yellow-500/40' },
  '15to60': { letter: 'C', label: 'Average — competitors are beating you', color: '#F97316', textColor: 'text-orange-400', bgColor: 'bg-orange-500/20', ringColor: 'ring-orange-500/40' },
  '1to4h': { letter: 'D', label: 'Slow — you\'re losing most online leads', color: '#EF4444', textColor: 'text-red-400', bgColor: 'bg-red-500/20', ringColor: 'ring-red-500/40' },
  '4plus': { letter: 'F', label: 'Critical — you\'re donating leads to other agents', color: '#DC2626', textColor: 'text-red-500', bgColor: 'bg-red-600/20', ringColor: 'ring-red-600/40' },
  nextday: { letter: 'F-', label: 'Critical — you\'re essentially donating leads to other agents', color: '#991B1B', textColor: 'text-red-600', bgColor: 'bg-red-700/20', ringColor: 'ring-red-700/40' },
};

const MISSED_ACTION_OPTIONS: { value: MissedAction; label: string }[] = [
  { value: 'voicemail', label: 'Goes to voicemail' },
  { value: 'assistant', label: 'Assistant answers' },
  { value: 'autotext', label: 'Auto-text reply' },
  { value: 'nothing', label: 'Nothing' },
];

const MISSED_SCORES: Record<MissedAction, number> = {
  voicemail: 0.3,
  assistant: 0.8,
  autotext: 0.7,
  nothing: 0.0,
};

/* ─── helpers ─── */
const fmt = (n: number) =>
  n >= 1000 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$' + n.toFixed(0);

const fmtPct = (n: number) => (n * 100).toFixed(0) + '%';

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── component: Slider ─── */
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v: number) => v.toString(),
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  icon?: React.ReactNode;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300 flex items-center gap-2">
          {icon}
          {label}
        </label>
        <span className="text-sm font-semibold text-emerald-400">{format(value)}</span>
      </div>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-slate-700" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full h-2 appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-emerald-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/30
            [&::-webkit-slider-thumb]:hover:bg-emerald-300 [&::-webkit-slider-thumb]:transition-colors
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-600"
        />
      </div>
    </div>
  );
}

/* ─── component: Select dropdown ─── */
function SelectDropdown({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-800">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  MAIN PAGE                                                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const RealEstateSpeedScorecard: React.FC = () => {
  /* ── state: market ── */
  const [homePrice, setHomePrice] = useState(425000);
  const [commissionRate, setCommissionRate] = useState(2.5);

  /* ── state: lead flow ── */
  const [leadsPerMonth, setLeadsPerMonth] = useState(18);
  const [onlinePct, setOnlinePct] = useState(55);
  const [closeRate, setCloseRate] = useState(3.5);

  /* ── state: response speed ── */
  const [responseTime, setResponseTime] = useState<ResponseTime>('1to4h');
  const [showingAction, setShowingAction] = useState<MissedAction>('voicemail');
  const [afterHoursAction, setAfterHoursAction] = useState<MissedAction>('voicemail');
  const [hasAutoText, setHasAutoText] = useState(false);

  /* ── state: lost leads ── */
  const [coldPct, setColdPct] = useState(25);
  const [alreadyFoundPct, setAlreadyFoundPct] = useState(15);

  /* ── state: email form ── */
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBrokerage, setFormBrokerage] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  /* ── SEO ── */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Real Estate Speed-to-Lead Scorecard | Boltcall';
    updateMetaDescription(
      'Score your real estate lead response speed and see exactly how many deals slow follow-up is costing you. Free calculator for agents.'
    );

    return injectSchemas([
      createServiceSchema({
        name: 'Real Estate Speed-to-Lead Scorecard',
        description: 'A free scorecard tool for real estate agents to grade their lead response speed and calculate how many deals slow follow-up is costing them — with AI-powered recommendations to close the gap.',
        url: '/tools/real-estate-speed-scorecard',
      }),
    ]);
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Real Estate Speed Scorecard", "item": "https://boltcall.org/tools/real-estate-speed-scorecard"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  /* ━━ calculations ━━ */
  const calc = useMemo(() => {
    const commissionPerDeal = homePrice * (commissionRate / 100);
    const onlineLeads = leadsPerMonth * (onlinePct / 100);
    const referralPct = 100 - onlinePct;
    const referralLeads = leadsPerMonth * (referralPct / 100);

    const currentContactRate = CONTACT_RATES[responseTime];
    const optimalContactRate = CONTACT_RATES.under5; // 78%
    const aiContactRate = 0.82; // even better than 5-min because <60 seconds

    /* sub-scores 0-100 */
    const speedScore = currentContactRate / optimalContactRate * 100;
    const afterHoursScore = MISSED_SCORES[afterHoursAction] * 100;
    const autoFollowupScore = hasAutoText ? 80 : (showingAction === 'autotext' ? 60 : showingAction === 'assistant' ? 70 : 10);
    const leadRecoveryScore = Math.max(0, 100 - coldPct - alreadyFoundPct);

    /* deals math — online leads are affected by response time, referrals are less affected */
    const onlineDealsMonth = onlineLeads * currentContactRate * (closeRate / 100);
    const referralDealsMonth = referralLeads * 0.7 * (closeRate / 100); // referrals have ~70% contact baseline
    const currentDealsMonth = onlineDealsMonth + referralDealsMonth;
    const currentDealsYear = currentDealsMonth * 12;

    const optimalOnlineDealsMonth = onlineLeads * optimalContactRate * (closeRate / 100);
    const optimalDealsMonth = optimalOnlineDealsMonth + referralDealsMonth;
    const optimalDealsYear = optimalDealsMonth * 12;

    const aiOnlineDealsMonth = onlineLeads * aiContactRate * (closeRate / 100);
    const aiDealsMonth = aiOnlineDealsMonth + referralDealsMonth;
    const aiDealsYear = aiDealsMonth * 12;

    const lostDealsYear = optimalDealsYear - currentDealsYear;
    const commissionLostMonth = (optimalDealsMonth - currentDealsMonth) * commissionPerDeal;
    const commissionLostYear = commissionLostMonth * 12;

    const extraDeals5Min = optimalDealsYear - currentDealsYear;
    const additionalCommission5Min = extraDeals5Min * commissionPerDeal;

    const aiExtraDeals = aiDealsYear - currentDealsYear;
    const aiAdditionalCommission = aiExtraDeals * commissionPerDeal;
    const boltcallCostYear = 179 * 12; // $897/mo
    const aiNetGain = aiAdditionalCommission - boltcallCostYear;
    const aiROI = boltcallCostYear > 0 ? (aiNetGain / boltcallCostYear) * 100 : 0;

    const grade = SCORE_LETTERS[responseTime];

    return {
      commissionPerDeal,
      onlineLeads,
      referralPct,
      referralLeads,
      currentContactRate,
      optimalContactRate,
      aiContactRate,
      speedScore,
      afterHoursScore,
      autoFollowupScore,
      leadRecoveryScore,
      currentDealsMonth,
      currentDealsYear,
      optimalDealsYear,
      lostDealsYear,
      commissionLostMonth,
      commissionLostYear,
      extraDeals5Min,
      additionalCommission5Min,
      aiExtraDeals,
      aiAdditionalCommission,
      boltcallCostYear,
      aiNetGain,
      aiROI,
      grade,
    };
  }, [homePrice, commissionRate, leadsPerMonth, onlinePct, closeRate, responseTime, showingAction, afterHoursAction, hasAutoText, coldPct, alreadyFoundPct]);

  /* ── form submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please enter your name and email.');
      return;
    }
    setFormSubmitting(true);
    setFormError('');
    try {
      await fetch('https://n8n.srv974118.hstgr.cloud/webhook/niche-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          business_name: formBrokerage.trim() || undefined,
          niche: 'real_estate',
          source: 'speed-scorecard',
          metrics: {
            speed_score: calc.grade.letter,
            response_time: responseTime,
            deals_lost: Math.round(calc.lostDealsYear * 10) / 10,
            commission_lost: Math.round(calc.commissionLostYear),
            potential_recovery: Math.round(calc.aiAdditionalCommission),
            roi: Math.round(calc.aiROI),
          },
        }),
      });
      setFormSuccess(true);
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ━━ render ━━ */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <GiveawayBar />
      <Header />

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 overflow-hidden">
        {/* bg glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Timer className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm text-emerald-300 font-medium">Free Speed-to-Lead Scorecard for Real Estate Agents</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              What's Your{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Speed-to-Lead Score
              </span>
              ?
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              78% of buyers go with the first agent who responds. If you're not first, you're last.
              Score your response time and see exactly how many deals it's costing you.
            </motion.p>

            <motion.div variants={fadeUp} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-6 py-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-sm sm:text-base text-slate-200">
                  Agents who respond in <strong className="text-emerald-400">5 minutes</strong> are{' '}
                  <strong className="text-emerald-400">100x more likely</strong> to connect than those who wait 30 minutes.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CALCULATOR ─── */}
      <section className="relative pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* LEFT — inputs (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Card 1: Your Market */}
              <AnimatedSection>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Home className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Your Market</h3>
                  </div>
                  <div className="space-y-5">
                    <Slider
                      label="Average home price in your market"
                      value={homePrice}
                      min={150000}
                      max={2000000}
                      step={25000}
                      onChange={setHomePrice}
                      format={(v) => fmt(v)}
                      icon={<DollarSign className="w-4 h-4 text-slate-500" />}
                    />
                    <Slider
                      label="Your commission rate"
                      value={commissionRate}
                      min={1.5}
                      max={3.5}
                      step={0.1}
                      onChange={setCommissionRate}
                      format={(v) => v.toFixed(1) + '%'}
                      icon={<TrendingUp className="w-4 h-4 text-slate-500" />}
                    />
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                      <span className="text-sm text-slate-400">Average commission per deal</span>
                      <span className="text-lg font-bold text-emerald-400">{fmt(calc.commissionPerDeal)}</span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Card 2: Lead Flow */}
              <AnimatedSection>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Lead Flow</h3>
                  </div>
                  <div className="space-y-5">
                    <Slider
                      label="New leads per month (all sources)"
                      value={leadsPerMonth}
                      min={3}
                      max={80}
                      step={1}
                      onChange={setLeadsPerMonth}
                      format={(v) => v.toString()}
                      icon={<Target className="w-4 h-4 text-slate-500" />}
                    />
                    <Slider
                      label="% from online sources (Zillow, Realtor, website)"
                      value={onlinePct}
                      min={20}
                      max={90}
                      step={5}
                      onChange={setOnlinePct}
                      format={(v) => v + '%'}
                      icon={<BarChart3 className="w-4 h-4 text-slate-500" />}
                    />
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                      <span className="text-sm text-slate-400">% from referrals / sphere</span>
                      <span className="text-sm font-semibold text-slate-200">{calc.referralPct}%</span>
                    </div>
                    <Slider
                      label="Current close rate"
                      value={closeRate}
                      min={1}
                      max={25}
                      step={0.5}
                      onChange={setCloseRate}
                      format={(v) => v.toFixed(1) + '%'}
                      icon={<CheckCircle2 className="w-4 h-4 text-slate-500" />}
                    />
                  </div>
                </div>
              </AnimatedSection>

              {/* Card 3: Response Speed */}
              <AnimatedSection>
                <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Your Response Speed</h3>
                      <p className="text-xs text-emerald-400">This is the #1 factor in lead conversion</p>
                    </div>
                  </div>

                  {/* response time radio */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-300 mb-3">How quickly do you typically respond to new leads?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Object.entries(RESPONSE_LABELS) as [ResponseTime, string][]).map(([key, label]) => {
                        const grade = SCORE_LETTERS[key];
                        const selected = responseTime === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setResponseTime(key)}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                              selected
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                                : 'border-slate-700/50 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${selected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                                {selected && <span className="w-2 h-2 rounded-full bg-slate-900" />}
                              </span>
                              {label}
                            </span>
                            <span className={`font-bold text-xs ${grade.textColor}`}>
                              {grade.letter} {key === 'under5' && <Star className="w-3 h-3 inline-block -mt-0.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <SelectDropdown
                      label="What happens when you're showing a house?"
                      value={showingAction}
                      options={MISSED_ACTION_OPTIONS}
                      onChange={(v) => setShowingAction(v as MissedAction)}
                      icon={<PhoneOff className="w-4 h-4 text-slate-500" />}
                    />
                    <SelectDropdown
                      label="What happens after hours?"
                      value={afterHoursAction}
                      options={MISSED_ACTION_OPTIONS}
                      onChange={(v) => setAfterHoursAction(v as MissedAction)}
                      icon={<Phone className="w-4 h-4 text-slate-500" />}
                    />
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-300 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        Do you have automated text-back?
                      </label>
                      <button
                        onClick={() => setHasAutoText(!hasAutoText)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${hasAutoText ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            hasAutoText ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Card 4: Lost Lead Indicators */}
              <AnimatedSection>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Lost Lead Indicators</h3>
                  </div>
                  <div className="space-y-5">
                    <Slider
                      label="How many leads go cold before you reach them?"
                      value={coldPct}
                      min={0}
                      max={50}
                      step={1}
                      onChange={setColdPct}
                      format={(v) => v + '%'}
                    />
                    <Slider
                      label='How many leads say "I already found an agent"?'
                      value={alreadyFoundPct}
                      min={0}
                      max={40}
                      step={1}
                      onChange={setAlreadyFoundPct}
                      format={(v) => v + '%'}
                    />
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* RIGHT — sticky results (2 cols) */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28 space-y-6">
                {/* Speed Score Hero */}
                <AnimatedSection>
                  <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 text-center">
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-4">Your Speed Score</p>
                    <div
                      className={`inline-flex items-center justify-center w-28 h-28 rounded-full ring-4 ${calc.grade.ringColor} ${calc.grade.bgColor} mb-4`}
                    >
                      <span className="text-5xl font-black" style={{ color: calc.grade.color }}>
                        {calc.grade.letter}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${calc.grade.textColor}`}>{calc.grade.label}</p>
                  </div>
                </AnimatedSection>

                {/* Score Breakdown */}
                <AnimatedSection>
                  <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-slate-200 mb-4">Score Breakdown</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Response Speed', value: calc.speedScore, icon: <Clock className="w-4 h-4" /> },
                        { label: 'After-Hours Coverage', value: calc.afterHoursScore, icon: <Shield className="w-4 h-4" /> },
                        { label: 'Auto Follow-Up', value: calc.autoFollowupScore, icon: <MessageSquare className="w-4 h-4" /> },
                        { label: 'Lead Recovery Rate', value: calc.leadRecoveryScore, icon: <Target className="w-4 h-4" /> },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400 flex items-center gap-1.5">{item.icon}{item.label}</span>
                            <span className={`font-semibold ${item.value >= 70 ? 'text-emerald-400' : item.value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {Math.round(item.value)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                item.value >= 70 ? 'bg-emerald-500' : item.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' as const }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>

                {/* Financial Impact */}
                <AnimatedSection>
                  <div className="bg-slate-900/80 border border-red-500/20 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Financial Impact
                    </h4>

                    {calc.lostDealsYear > 0 ? (
                      <div className="space-y-3">
                        <p className="text-slate-300 text-sm">
                          Your response time costs you{' '}
                          <strong className="text-red-400">{calc.lostDealsYear.toFixed(1)} deals</strong> per year
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-500/10 rounded-lg p-3 text-center">
                            <p className="text-[10px] uppercase text-red-400/70 tracking-wider">Lost / month</p>
                            <p className="text-lg font-bold text-red-400">{fmt(Math.abs(calc.commissionLostMonth))}</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-3 text-center">
                            <p className="text-[10px] uppercase text-red-400/70 tracking-wider">Lost / year</p>
                            <p className="text-lg font-bold text-red-400">{fmt(Math.abs(calc.commissionLostYear))}</p>
                          </div>
                        </div>
                        <div className="border-t border-slate-700/50 pt-3 space-y-2">
                          <p className="text-xs text-slate-400">
                            Improving to 5-min response could mean{' '}
                            <strong className="text-emerald-400">{calc.extraDeals5Min.toFixed(1)} extra deals/year</strong>
                          </p>
                          <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                            <p className="text-[10px] uppercase text-emerald-400/70 tracking-wider">Additional commission potential</p>
                            <p className="text-xl font-bold text-emerald-400">{fmt(calc.additionalCommission5Min)}/yr</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm text-emerald-300 font-medium">Your response time is optimal!</p>
                        <p className="text-xs text-slate-400 mt-1">Keep it up — you're outpacing 95% of agents.</p>
                      </div>
                    )}
                  </div>
                </AnimatedSection>

                {/* The Math Behind Your Score */}
                <AnimatedSection>
                  <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-slate-200 mb-4">The Math Behind Your Score</h4>
                    <div className="space-y-2">
                      {[
                        { time: '5 minutes', rate: 0.78, key: 'under5' },
                        { time: '30 minutes', rate: 0.36, key: '15to60' },
                        { time: '1 hour', rate: 0.24, key: '15to60' },
                        { time: '4 hours', rate: 0.08, key: '4plus' },
                        { time: 'Next day', rate: 0.02, key: 'nextday' },
                      ].map((row) => {
                        const isCurrent =
                          (row.key === responseTime) ||
                          (responseTime === '5to15' && row.time === '30 minutes') ||
                          (responseTime === '1to4h' && row.time === '4 hours');
                        return (
                          <div
                            key={row.time}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                              isCurrent ? 'bg-emerald-500/10 border border-emerald-500/30' : ''
                            }`}
                          >
                            <span className={isCurrent ? 'text-emerald-300 font-medium' : 'text-slate-400'}>
                              {row.time}
                              {isCurrent && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-500">(You)</span>}
                            </span>
                            <span className={`font-semibold ${
                              row.rate >= 0.5 ? 'text-emerald-400' : row.rate >= 0.2 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {fmtPct(row.rate)} contact rate
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">
                        Your current contact rate:{' '}
                        <strong className={calc.currentContactRate >= 0.5 ? 'text-emerald-400' : calc.currentContactRate >= 0.2 ? 'text-yellow-400' : 'text-red-400'}>
                          {fmtPct(calc.currentContactRate)}
                        </strong>{' '}
                        vs optimal: <strong className="text-emerald-400">{fmtPct(calc.optimalContactRate)}</strong>
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                {/* With Instant AI Response */}
                <AnimatedSection>
                  <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 border border-emerald-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Bot className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-emerald-300">With Instant AI Response</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">Every lead gets a response in under 60 seconds — 24/7, even during showings.</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Additional deals per year</span>
                        <span className="font-bold text-emerald-400">+{calc.aiExtraDeals.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Additional commission</span>
                        <span className="font-bold text-emerald-400">{fmt(calc.aiAdditionalCommission)}/yr</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Boltcall cost ($897/mo)</span>
                        <span className="font-medium text-slate-300">-{fmt(calc.boltcallCostYear)}/yr</span>
                      </div>
                      <div className="border-t border-emerald-500/20 pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300 font-medium">Net gain</span>
                          <span className="font-bold text-emerald-400">{fmt(Math.max(0, calc.aiNetGain))}/yr</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-400">ROI</span>
                          <span className="font-bold text-emerald-400">{Math.max(0, Math.round(calc.aiROI)).toLocaleString()}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EMAIL CAPTURE ─── */}
      <section className="py-16 sm:py-20">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-8 sm:p-10">
              <div className="text-center mb-8">
                <Mail className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">Get Your Personalized Speed-to-Lead Report</h2>
                <p className="text-slate-400 text-sm">We'll send you a detailed breakdown with actionable next steps.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  'Responding in under 5 minutes leads to 2.6 additional deals per year',
                  'See exactly how many commissions slow follow-up is costing you',
                  'Scripts that convert — personalized to your response time grade',
                  'Set up sub-60-second AI response in under 5 minutes today',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              {formSuccess ? (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-emerald-300 mb-1">Report on its way!</p>
                  <p className="text-sm text-slate-400">Check your inbox in the next few minutes.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Brokerage (optional)"
                    value={formBrokerage}
                    onChange={(e) => setFormBrokerage(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                  {formError && <p className="text-red-400 text-sm">{formError}</p>}
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed
                      text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Get My Free Report
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="py-16 sm:py-20 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              The Data Doesn't Lie
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stat: '78%',
                text: 'of buyers hire the first agent who responds',
                source: 'NAR',
                icon: <Users className="w-6 h-6 text-emerald-400" />,
              },
              {
                stat: '4+ hours',
                text: "Average agent response time — by then, leads have contacted 3-4 agents",
                source: 'MIT Study',
                icon: <Clock className="w-6 h-6 text-yellow-400" />,
              },
              {
                stat: '21%',
                text: 'more deals closed by agents with sub-5-minute response times',
                source: 'InsideSales.com',
                icon: <TrendingUp className="w-6 h-6 text-emerald-400" />,
              },
            ].map((item, i) => (
              <AnimatedSection key={i}>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center">
                  <div className="mb-3">{item.icon}</div>
                  <p className="text-3xl sm:text-4xl font-black text-white mb-2">{item.stat}</p>
                  <p className="text-sm text-slate-300 mb-2">{item.text}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">{item.source}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VALUE CONTENT ─── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                3 Speed-to-Lead Strategies for Real Estate Agents
              </h2>
              <p className="text-slate-400 text-sm">Stop losing deals to faster agents. Here's how.</p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Win the Deal in 60 Seconds — Before Any Competitor Responds',
                desc: 'Your lead gets a personalized text within 60 seconds of reaching out — even while you\'re at a showing. 78% of buyers go with the first agent who responds. Be first, every time.',
                icon: <Zap className="w-6 h-6 text-emerald-400" />,
              },
              {
                num: '02',
                title: 'Stop Wasting Hours on Tire-Kickers, Focus on Buyers Who Close',
                desc: 'AI qualifies every lead by timeline, budget, and pre-approval status before you call back. Spend your time only on prospects ready to move — not those just browsing.',
                icon: <Target className="w-6 h-6 text-emerald-400" />,
              },
              {
                num: '03',
                title: 'Convert "Not Ready" Leads Into 2.6 Extra Deals Per Year',
                desc: 'Leads not ready to buy today become closings tomorrow. Automated nurture keeps you top of mind with market updates and check-ins — turning cold leads into future commission.',
                icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
              },
            ].map((tip) => (
              <AnimatedSection key={tip.num}>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-emerald-500">{tip.num}</span>
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">{tip.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOFT CTA ─── */}
      <section className="py-16 sm:py-24">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 border border-emerald-500/20 rounded-2xl p-10 sm:p-14">
              <Zap className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Ready to Never Lose a Lead to a Faster Agent?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                See how Boltcall's AI receptionist responds to every lead in under 60 seconds — so you never miss another deal.
              </p>
              <a
                href="/features/instant-form-reply"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-8 rounded-lg transition-colors text-base"
              >
                See It In Action
                <ArrowRight className="w-5 h-5" />
              </a>
              <p className="text-xs text-slate-500 mt-5">
                Starting at $549/month &bull; No contracts &bull; Set up in 24 hours
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Why Boltcall */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "⚡", title: "Sub-60-Second Response", desc: "Every lead gets a personalised reply in under 60 seconds — day or night, weekends included — so you are always first to respond." },
              { icon: "📅", title: "Automatic Appointment Booking", desc: "AI books directly into your calendar in real time. No back-and-forth, no double-bookings, no manual entry." },
              { icon: "🤖", title: "Fully Customisable AI Agent", desc: "Train your agent on your listings, FAQs, and brand voice in minutes. It sounds like you — not a generic bot." },
              { icon: "📊", title: "ROI-Tracked Dashboard", desc: "See calls answered, leads captured, and bookings won — with before/after comparisons so the value is always visible." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
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

      {/* What This Tool Covers */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Scorecard Evaluates</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Five speed-to-lead metrics that determine how many home-buyer and seller leads you are losing</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'Response Time Score', desc: 'How quickly your team contacts new leads vs. the 391% conversion advantage' },
            { label: 'After-Hours Lead Coverage', desc: 'Whether leads submitted evenings and weekends get same-day follow-up' },
            { label: 'Follow-Up Sequence Depth', desc: 'Number of automated touchpoints in your lead nurture workflow' },
            { label: 'Missed Call Recovery', desc: 'Percentage of unanswered calls followed up within 5 minutes via SMS' },
            { label: 'Lead-to-Appointment Rate', desc: 'Percentage of inbound leads that convert to a showing or consultation' },
            { label: 'Annual Revenue Gap', desc: 'Total commission income lost to slow response and poor follow-up' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Real Estate Industry Benchmarks: Call Capture and Revenue Impact</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing real estate businesses compare to the average on call response</p>
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
                  ['Calls answered rate', '62%', '99%+'],
                  ['Missed calls/month (40 call avg)', '15 calls', '0–1 calls'],
                  ['After-hours call coverage', 'Voicemail or none', '100% answered'],
                  ['Avg. response to web leads', '47 minutes', 'Under 60 seconds'],
                  ['Monthly revenue lost to missed calls', '$182,400', '$0–$500'],
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

export default RealEstateSpeedScorecard;
