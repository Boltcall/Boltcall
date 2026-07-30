import React, { useState, useEffect, useMemo } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Shield, Clock, PhoneOff, TrendingUp,
  DollarSign, Send, Zap, BarChart3,
  CheckCircle, AlertTriangle,
  Phone, Users, Timer, Award, Target, Gauge,
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

const getGrade = (score: number): { letter: string; color: string; bg: string } => {
  if (score >= 90) return { letter: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/15' };
  if (score >= 75) return { letter: 'B', color: 'text-teal-400', bg: 'bg-teal-500/15' };
  if (score >= 60) return { letter: 'C', color: 'text-amber-400', bg: 'bg-amber-500/15' };
  if (score >= 40) return { letter: 'D', color: 'text-orange-400', bg: 'bg-orange-500/15' };
  return { letter: 'F', color: 'text-red-400', bg: 'bg-red-500/15' };
};

const getResponseSpeedScore = (minutes: number): number => {
  if (minutes <= 5) return 95;
  if (minutes <= 15) return 80;
  if (minutes <= 30) return 65;
  if (minutes <= 60) return 45;
  return 20;
};

const getAfterHoursScore = (rate: number): number => {
  if (rate >= 80) return 95;
  if (rate >= 60) return 80;
  if (rate >= 40) return 65;
  if (rate >= 20) return 45;
  return 20;
};

const getConversionScore = (quoteToBindPct: number): number => {
  if (quoteToBindPct >= 40) return 95;
  if (quoteToBindPct >= 30) return 80;
  if (quoteToBindPct >= 20) return 65;
  if (quoteToBindPct >= 15) return 45;
  return 20;
};

const InsuranceLeadResponseScorecard: React.FC = () => {
  // Card 1: Lead Volume
  const [quoteRequestsPerWeek, setQuoteRequestsPerWeek] = useState(30);
  const [avgPolicyPremium, setAvgPolicyPremium] = useState(1800);
  const [avgCommissionPct, setAvgCommissionPct] = useState(12);
  const [leadSourcesCount, setLeadSourcesCount] = useState(3);

  // Card 2: Response Speed
  const [avgResponseMinutes, setAvgResponseMinutes] = useState(45);
  const [responseRatePct, setResponseRatePct] = useState(65);
  const [afterHoursLeadPct, setAfterHoursLeadPct] = useState(35);
  const [afterHoursResponsePct, setAfterHoursResponsePct] = useState(10);

  // Card 3: Conversion Reality
  const [leadToQuotePct, setLeadToQuotePct] = useState(60);
  const [quoteToBindPct, setQuoteToBindPct] = useState(25);
  const [referralRatePct, setReferralRatePct] = useState(15);
  const [avgRetentionYears, setAvgRetentionYears] = useState(5);

  // Card 4: AI Speed Improvement
  const [aiAnswerRatePct, setAiAnswerRatePct] = useState(95);
  const [conversionLiftPct, setConversionLiftPct] = useState(35);

  // Email capture
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Insurance Lead Response Scorecard: Grade Your Speed (2026) | Boltcall';
    updateMetaDescription(
      'Grade your insurance lead response speed and discover how much commission you\'re losing to slow follow-up. Learn how AI assistance can recover lost revenue and boost your close rate.'
    );

    // FAQPage schema
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'insurance-scorecard-faq-schema';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How fast should insurance agents respond to new leads?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Insurance agents should respond to new leads within 5 minutes. Studies show that responding within 5 minutes makes you 21x more likely to qualify the lead compared to responding after 30 minutes. After 60 minutes, most leads have already contacted a competitor.',
          },
        },
        {
          '@type': 'Question',
          name: 'What percentage of insurance leads are lost to slow response times?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Insurance agencies lose 35-50% of their leads to slow response times. The average agency responds in 47 minutes, but 78% of prospects bind with the first agent who responds. After-hours leads are hit hardest, with most agencies missing 90% of evening and weekend inquiries.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can AI help insurance agents respond to leads faster?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. AI-powered receptionist systems can respond to insurance leads in under 30 seconds, 24/7. They answer calls, qualify prospects by asking about coverage needs, collect policy details, and book appointments automatically. This eliminates the response gap that costs most agencies thousands in lost commissions.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much commission do insurance agents lose from missed after-hours leads?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Insurance agents lose an estimated 25-40% of potential annual commission from missed after-hours leads. With 35% of quote requests arriving outside business hours and most agencies having less than 10% after-hours response rates, the revenue gap is significant.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a good lead-to-bind conversion rate for insurance agents?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A good lead-to-bind rate for insurance agents is 15-20% overall (lead to quote at 60-70%, quote to bind at 25-35%). Top-performing agencies with fast response times and automated follow-up achieve 20-30% lead-to-bind rates. Improving response speed is the single highest-leverage way to increase this metric.',
          },
        },
      ],
    });
    document.head.appendChild(faqSchema);

    // Article schema
    const articleSchema = document.createElement('script');
    articleSchema.type = 'application/ld+json';
    articleSchema.id = 'insurance-scorecard-article-schema';
    articleSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Insurance Lead Response Scorecard: Grade Your Speed',
      description: 'Free interactive scorecard for insurance agents. Grade your lead response speed, after-hours coverage, and conversion rate to find lost commission.',
      author: { '@type': 'Organization', name: 'Boltcall' },
      publisher: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
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

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://boltcall.org/tools"}, {"@type": "ListItem", "position": 3, "name": "Insurance Lead Response Scorecard", "item": "https://boltcall.org/tools/insurance-lead-response-scorecard"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('insurance-scorecard-faq-schema')?.remove();
      document.getElementById('insurance-scorecard-article-schema')?.remove();
    };
  }, []);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const calc = useMemo(() => {
    const monthlyLeads = quoteRequestsPerWeek * 4.33;
    const avgCommission = avgPolicyPremium * (avgCommissionPct / 100);

    // Business-hours leads
    const businessHoursLeadPct = 1 - afterHoursLeadPct / 100;
    const businessHoursLeads = monthlyLeads * businessHoursLeadPct;
    const afterHoursLeads = monthlyLeads * (afterHoursLeadPct / 100);

    // Leads actually responded to
    const businessHoursResponded = businessHoursLeads * (responseRatePct / 100);
    const afterHoursResponded = afterHoursLeads * (afterHoursResponsePct / 100);
    const totalResponded = businessHoursResponded + afterHoursResponded;
    const totalMissed = monthlyLeads - totalResponded;

    // Current conversion pipeline
    const quotesGenerated = totalResponded * (leadToQuotePct / 100);
    const policiesBound = quotesGenerated * (quoteToBindPct / 100);
    const currentMonthlyCommission = policiesBound * avgCommission;

    // Missed opportunity (leads that never got responded to)
    const missedQuotes = totalMissed * (leadToQuotePct / 100) * 0.8; // slightly lower since missed leads are less warm
    const missedPolicies = missedQuotes * (quoteToBindPct / 100) * 0.7; // lower bind rate on recovered leads
    const monthlyCommissionLost = missedPolicies * avgCommission;

    // Slow response penalty on responded leads (response time decay)
    const speedDecayFactor = avgResponseMinutes <= 5 ? 0 : Math.min(0.35, (avgResponseMinutes - 5) / 120 * 0.35);
    const slowResponseLoss = businessHoursResponded * speedDecayFactor * (leadToQuotePct / 100) * (quoteToBindPct / 100) * avgCommission;

    const totalMonthlyLoss = monthlyCommissionLost + slowResponseLoss;
    const annualLoss = totalMonthlyLoss * 12;

    // Referral value lost (bound clients who would have referred)
    const referralValue = missedPolicies * (referralRatePct / 100) * avgCommission * avgRetentionYears * 0.3;

    // Lifetime value impact
    const lifetimeValuePerClient = avgCommission * avgRetentionYears;
    const lifetimeLost = missedPolicies * lifetimeValuePerClient;

    // AI Recovery
    const aiResponsedAfterHours = afterHoursLeads * (aiAnswerRatePct / 100);
    const aiResponsedBusinessHours = businessHoursLeads * (aiAnswerRatePct / 100);
    const aiTotalResponded = aiResponsedAfterHours + aiResponsedBusinessHours;
    const aiConversionBoost = 1 + conversionLiftPct / 100;
    const aiQuotes = aiTotalResponded * (leadToQuotePct / 100) * aiConversionBoost;
    const aiPolicies = aiQuotes * (quoteToBindPct / 100);
    const aiMonthlyCommission = aiPolicies * avgCommission;
    const monthlyRecovery = aiMonthlyCommission - currentMonthlyCommission;
    const annualRecovery = monthlyRecovery * 12;
    const boltcallMonthlyCost = 179;
    const boltcallAnnualCost = boltcallMonthlyCost * 12;
    const roi = boltcallAnnualCost > 0 ? Math.round(((annualRecovery - boltcallAnnualCost) / boltcallAnnualCost) * 100) : 0;

    // Grades
    const speedScore = getResponseSpeedScore(avgResponseMinutes);
    const afterHoursScore = getAfterHoursScore(afterHoursResponsePct);
    const conversionScore = getConversionScore(quoteToBindPct);
    const overallScore = Math.round(speedScore * 0.4 + afterHoursScore * 0.3 + conversionScore * 0.3);

    const speedGrade = getGrade(speedScore);
    const afterHoursGrade = getGrade(afterHoursScore);
    const conversionGrade = getGrade(conversionScore);
    const overallGrade = getGrade(overallScore);

    return {
      monthlyLeads,
      avgCommission,
      totalResponded,
      totalMissed,
      policiesBound,
      currentMonthlyCommission,
      monthlyCommissionLost,
      slowResponseLoss,
      totalMonthlyLoss,
      annualLoss,
      referralValue,
      lifetimeLost,
      monthlyRecovery,
      annualRecovery,
      roi,
      speedScore,
      afterHoursScore,
      conversionScore,
      overallScore,
      speedGrade,
      afterHoursGrade,
      conversionGrade,
      overallGrade,
    };
  }, [
    quoteRequestsPerWeek, avgPolicyPremium, avgCommissionPct, leadSourcesCount,
    avgResponseMinutes, responseRatePct, afterHoursLeadPct, afterHoursResponsePct,
    leadToQuotePct, quoteToBindPct, referralRatePct, avgRetentionYears,
    aiAnswerRatePct, conversionLiftPct,
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
          niche: 'insurance',
          source: 'lead-response-scorecard',
          metrics: {
            monthly_commission_lost: calc.totalMonthlyLoss,
            annual_commission_lost: calc.annualLoss,
            leads_missed_per_month: calc.totalMissed,
            overall_grade: calc.overallGrade.letter,
            speed_grade: calc.speedGrade.letter,
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
              <Shield className="w-4 h-4" />
              Free Tool for Insurance Agents
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
              Grade Your Insurance Agency's{' '}
              <span className="bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Lead Response Speed
              </span>
            </motion.h1>

            {/* Direct answer block for AEO - within first 150 words */}
            <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Insurance agents who respond to leads within 5 minutes are 21x more likely to qualify them.
              The average agency responds in 47 minutes and loses 35-50% of leads to competitors.
              This free scorecard grades your response speed, after-hours coverage, and conversion rate
              so you can see exactly how much commission you are leaving on the table.
            </motion.p>

            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">78% of prospects bind with the first agent who responds</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Benefit-Focused Bullets */}
        <section className="py-10 bg-slate-950">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-6">What You'll Get</h2>
            <ul className="space-y-3">
              {[
                "Respond within 5 minutes to increase lead qualification by 21x",
                "Stop losing $8,000+ monthly to slow lead response",
                "Benchmark your speed against top insurance agencies",
                "Get a personalized score and action plan instantly",
                "Learn the exact follow-up sequence that closes 40% more leads",
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

              {/* Card 1: Lead Volume */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/15">
                    <Target className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Lead Volume</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your weekly quote request flow</div>
                  </div>
                </div>

                <Slider label="Quote requests per week" value={quoteRequestsPerWeek} onChange={setQuoteRequestsPerWeek}
                  min={5} max={100} hint="all sources combined" />
                <Slider label="Average policy premium (annual)" value={avgPolicyPremium} onChange={setAvgPolicyPremium}
                  min={500} max={10000} step={100} unit="$" />
                <Slider label="Average commission %" value={avgCommissionPct} onChange={setAvgCommissionPct}
                  min={5} max={25} unit="%" hint="new business commission" />
                <Slider label="Lead sources count" value={leadSourcesCount} onChange={setLeadSourcesCount}
                  min={1} max={8} hint="web, phone, referral, aggregator..." />
              </motion.div>

              {/* Card 2: Response Speed */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                    <Timer className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Response Speed</div>
                    <div className="text-xs text-slate-500 mt-0.5">How fast you engage new leads</div>
                  </div>
                </div>

                <Slider label="Average response time (minutes)" value={avgResponseMinutes} onChange={setAvgResponseMinutes}
                  min={1} max={1440} hint="from lead to first contact" unit=" min" />
                <Slider label="Response rate (calls + forms)" value={responseRatePct} onChange={setResponseRatePct}
                  min={20} max={100} unit="%" hint="% of leads you reply to" />
                <Slider label="After-hours lead %" value={afterHoursLeadPct} onChange={setAfterHoursLeadPct}
                  min={10} max={60} unit="%" hint="evenings, weekends, holidays" />
                <Slider label="After-hours response rate" value={afterHoursResponsePct} onChange={setAfterHoursResponsePct}
                  min={0} max={50} unit="%" />
              </motion.div>

              {/* Card 3: Conversion Reality */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">Conversion Reality</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your pipeline performance</div>
                  </div>
                </div>

                <Slider label="Lead-to-quote rate" value={leadToQuotePct} onChange={setLeadToQuotePct}
                  min={20} max={90} unit="%" hint="leads that become quotes" />
                <Slider label="Quote-to-bind rate" value={quoteToBindPct} onChange={setQuoteToBindPct}
                  min={10} max={50} unit="%" hint="quotes that become policies" />
                <Slider label="Referral rate from bound clients" value={referralRatePct} onChange={setReferralRatePct}
                  min={0} max={40} unit="%" />
                <Slider label="Average client retention (years)" value={avgRetentionYears} onChange={setAvgRetentionYears}
                  min={1} max={15} hint="renewals before churn" />
              </motion.div>

              {/* Card 4: AI Speed Improvement */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/15">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[1.05rem] font-bold text-white tracking-tight">AI Speed Improvement</div>
                    <div className="text-xs text-slate-500 mt-0.5">What happens when AI answers every lead</div>
                  </div>
                </div>

                {/* AI response time - fixed display, not a slider */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">AI response time</label>
                    <span className="text-sm font-bold text-emerald-400">30 seconds</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '98%' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Instant</span>
                    <span className="text-emerald-500/70">vs your {fmtNum.format(avgResponseMinutes)} min avg</span>
                    <span></span>
                  </div>
                </div>

                <Slider label="AI answer rate (calls + forms)" value={aiAnswerRatePct} onChange={setAiAnswerRatePct}
                  min={80} max={99} unit="%" hint="24/7 coverage" />
                <Slider label="Projected conversion lift from faster response" value={conversionLiftPct} onChange={setConversionLiftPct}
                  min={15} max={60} unit="%" hint="speed-to-lead effect" />
              </motion.div>
            </div>

            {/* RIGHT --- STICKY RESULTS / SCORECARD */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-5">

              {/* Overall Grade */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6 sm:p-7">

                {/* Letter Grades */}
                <div className="text-center mb-6">
                  <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
                    Your Lead Response Scorecard
                  </p>
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl ${calc.overallGrade.bg} mb-2`}>
                    <span className={`text-6xl font-black ${calc.overallGrade.color}`}>{calc.overallGrade.letter}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-2">Overall Score: <span className="text-white font-bold">{calc.overallScore}/100</span></p>
                </div>

                {/* 3 Grade Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Response Speed', grade: calc.speedGrade, score: calc.speedScore, icon: Clock },
                    { label: 'After-Hours', grade: calc.afterHoursGrade, score: calc.afterHoursScore, icon: PhoneOff },
                    { label: 'Conversion', grade: calc.conversionGrade, score: calc.conversionScore, icon: TrendingUp },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-800/60 rounded-xl p-3.5 text-center">
                      <m.icon className={`w-4 h-4 ${m.grade.color} mx-auto mb-1.5`} />
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${m.grade.bg} mb-1`}>
                        <span className={`text-2xl font-black ${m.grade.color}`}>{m.grade.letter}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue Impact */}
                <div className="space-y-2.5 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commission Impact</p>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Missed leads / month</span>
                    <span className="text-sm font-bold text-red-400">{fmtNum.format(Math.round(calc.totalMissed))}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Commission lost / month</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.totalMonthlyLoss)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300">Commission lost / year</span>
                    <span className="text-sm font-bold text-red-400">{fmt.format(calc.annualLoss)}</span>
                  </div>
                </div>

                {/* With AI Section */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-400">With AI Lead Response</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Recovered commission / month</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.monthlyRecovery)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Annual recovery</span>
                      <span className="text-sm font-bold text-emerald-400">{fmt.format(calc.annualRecovery)}</span>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-2.5 mt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">ROI</span>
                        <span className="text-xl font-black text-emerald-400">{fmtNum.format(calc.roi)}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-400/80 text-center pt-1">
                      That's <span className="font-bold text-emerald-400">{fmtNum.format(Math.round(calc.totalMissed * 0.85))} more leads</span> responded to per month
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
              How Does AI Help Insurance Agents{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Respond Faster?
              </span>
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'Instant Lead Engagement',
                  desc: 'AI answers every call and form submission in under 30 seconds, 24/7. It asks about coverage needs, collects policy details, and qualifies the prospect before a competitor even picks up the phone.',
                  icon: Phone,
                  color: 'from-teal-500/15 to-teal-500/5',
                  borderColor: 'border-teal-500/20',
                  iconColor: 'text-teal-400',
                },
                {
                  num: '02',
                  title: 'After-Hours Coverage',
                  desc: 'No more losing evening and weekend leads. AI handles every inquiry outside business hours with the same quality as your best agent, then books appointments on your calendar automatically.',
                  icon: Clock,
                  color: 'from-blue-500/15 to-blue-500/5',
                  borderColor: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  num: '03',
                  title: 'Automatic Follow-Up',
                  desc: 'AI sends personalized follow-up texts and emails to every lead who does not bind immediately. It nurtures quote requests through the decision process so fewer prospects go cold.',
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
              <Award className="w-4 h-4" />
              Free Report
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-black text-white mb-4">
              Get Your Free Insurance{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Lead Response Report
              </span>
            </motion.h2>

            <motion.div variants={fadeUp} className="text-left bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
              <ul className="space-y-3">
                {[
                  'Respond within 5 minutes to qualify leads 21x more effectively',
                  'Recover after-hours commissions you\'re currently losing to competitors',
                  'Capture 95% of after-hours leads with AI responding in under 30 seconds',
                  'Step-by-step roadmap to increase your lead-to-bind rate with AI',
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
                  placeholder="Agency Name (optional)"
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
                  {formLoading ? 'Sending...' : 'Get My Free Scorecard Report'}
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
              What Insurance Agents Ask About{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                AI Lead Response
              </span>
            </motion.h2>

            <div className="space-y-4">
              {[
                {
                  q: 'How fast should insurance agents respond to new leads?',
                  a: 'Within 5 minutes. Research shows that responding within 5 minutes makes you 21x more likely to qualify a lead compared to waiting 30 minutes. After 60 minutes, most prospects have already contacted a competing agent. AI can respond in under 30 seconds, putting you first in line every time.',
                },
                {
                  q: 'What percentage of insurance leads are lost to slow response?',
                  a: 'Most insurance agencies lose 35-50% of their leads to slow response times. The average agency takes 47 minutes to respond, but 78% of prospects bind with the first agent who engages them. After-hours leads suffer most, with 90% going unanswered at the typical agency.',
                },
                {
                  q: 'Can AI actually help insurance agents sell more policies?',
                  a: 'Yes. AI does not replace your sales ability. It makes sure every lead gets an immediate response so you have the chance to sell. AI answers calls, qualifies coverage needs, collects policy details, and books appointments on your calendar 24/7. Agents using AI-powered lead response typically see 25-40% more policies bound per month.',
                },
                {
                  q: 'How much commission do agents lose from missed after-hours leads?',
                  a: 'With 35% of quote requests arriving outside business hours and most agencies responding to less than 10% of them, after-hours lead loss accounts for 25-40% of potential annual commission. For an agent writing $500K in premium, that can mean $15,000-$25,000 in lost commission per year.',
                },
                {
                  q: 'What is a good quote-to-bind rate for insurance agents?',
                  a: 'A solid quote-to-bind rate is 25-35%. Top-performing agencies with fast response and automated follow-up achieve 30-40%. The biggest lever to improve this metric is response speed. Leads contacted within 5 minutes convert at 3-5x the rate of leads contacted after an hour.',
                },
              ].map((faq, idx) => (
                <motion.div key={idx} variants={fadeUp}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/20 transition-colors">
                  <h3 className="text-base font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- SOCIAL PROOF STATS --- */}
        <section className="px-4 sm:px-6 py-14 bg-slate-950">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                stat: '21x',
                text: 'Leads contacted within 5 minutes are 21x more likely to be qualified than those contacted after 30 minutes',
                icon: Gauge,
              },
              {
                stat: '78%',
                text: 'Of insurance prospects bind with the first agent who responds to their quote request',
                icon: DollarSign,
              },
              {
                stat: '35%',
                text: 'Of all insurance quote requests arrive outside business hours when most agencies are closed',
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


        {/* --- WHY BOLTCALL --- */}
        <section className="px-4 sm:px-6 py-10 bg-slate-950">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-teal-900/30 to-slate-900 border border-teal-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Why Insurance Agents Choose Boltcall</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Responds in under 1 second", desc: "Beats every competing agent to the lead — 24/7, including nights and weekends when 35% of quotes come in" },
                { title: "Setup in 30 minutes", desc: "No developers, no IT team — just answer a few questions and your AI agent goes live" },
                { title: "Pays for itself", desc: "One extra bound policy per month more than covers the entire annual subscription" },
                { title: "Trained on your agency", desc: "Knows your carriers, coverages, and eligibility rules — sounds like a knowledgeable team member" },
              ].map((item) => (
                <div key={item.title} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                  <div className="font-semibold text-teal-300 mb-1">✓ {item.title}</div>
                  <div className="text-sm text-slate-400">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- COMMON CONCERNS --- */}
        <section className="px-4 sm:px-6 py-10 bg-slate-950">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-teal-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Shield className="w-8 h-8 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white mb-1">Common Concerns — Answered</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  This scorecard is 100% free and takes under 2 minutes. No credit card required, no account needed, and your numbers are never stored — calculations happen entirely in your browser. You can adjust every slider anonymously and only share your email if you want the full PDF report sent to you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <FinalCTA {...CALCULATOR_CTA} />
      </main>


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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What This Scorecard Evaluates</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Five lead-response metrics that reveal your agency's competitive speed gap</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Response Time Score', desc: 'How quickly your agency responds to new insurance inquiries' },
              { label: 'After-Hours Coverage', desc: 'Whether leads submitted evenings/weekends get same-day contact' },
              { label: 'Follow-Up Sequence', desc: 'Automated touchpoints to re-engage leads who don\'t convert immediately' },
              { label: 'Missed Call Recovery', desc: 'How many unanswered calls are followed up with SMS or email' },
              { label: 'Quote-to-Bind Rate', desc: 'Percentage of quoted prospects who ultimately bind a policy' },
              { label: 'Annual Revenue Gap', desc: 'Total income lost to slow response and poor follow-up' },
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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Insurance Industry Benchmarks: Call Capture and Revenue Impact</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How top-performing insurance businesses compare to the average on call response</p>
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
                  ['Calls answered rate', '65%', '99%+'],
                  ['Missed calls/month (40 call avg)', '14 calls', '0–1 calls'],
                  ['After-hours call coverage', 'Voicemail or none', '100% answered'],
                  ['Avg. response to web leads', '47 minutes', 'Under 60 seconds'],
                  ['Monthly revenue lost to missed calls', '$8,400', '$0–$500'],
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

export default InsuranceLeadResponseScorecard;
