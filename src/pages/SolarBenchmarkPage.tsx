import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Phone, Users, Target, Zap, ChevronLeft,
  ArrowRight, CheckCircle2, AlertTriangle, Award,
  TrendingUp, BarChart3, Calendar,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { CALCULATOR_CTA } from '../components/FinalCTA';

// ── Types ─────────────────────────────────────────────────────────────────────
type QuizStep = 0 | 1 | 2 | 3 | 4 | 'contact' | 'submitting' | 'results';

interface Answers {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

interface GradeInfo {
  letter: string;
  label: string;
  insight: string;
  detail: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

// ── Webhook ───────────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/solar-benchmark';

// ── Quiz Questions ────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'q1',
    icon: Clock,
    question: 'When a new lead fills out your solar quote form — how fast does someone from your team call them?',
    options: [
      { label: 'Within 5 minutes (we call immediately)', score: 4 },
      { label: 'Within 30 minutes', score: 3 },
      { label: 'Within a few hours or same day', score: 2 },
      { label: 'Next business day or whenever we see it', score: 1 },
    ],
  },
  {
    id: 'q2',
    icon: Phone,
    question: 'What happens when a lead calls back and nobody from your team answers?',
    options: [
      { label: 'Auto SMS fires instantly + system retries the call', score: 4 },
      { label: 'Someone manually calls them back when free', score: 3 },
      { label: 'We leave a voicemail and wait for them to call again', score: 2 },
      { label: 'The lead usually goes cold — we lose them', score: 1 },
    ],
  },
  {
    id: 'q3',
    icon: Users,
    question: 'How many inbound solar leads does your company receive per month?',
    options: [
      { label: 'Fewer than 20 leads / month', score: 1 },
      { label: '20 – 50 leads / month', score: 2 },
      { label: '50 – 100 leads / month', score: 3 },
      { label: '100+ leads / month', score: 4 },
    ],
  },
  {
    id: 'q4',
    icon: Target,
    question: 'What percentage of your inbound solar leads turn into a booked site visit or appointment?',
    options: [
      { label: 'Over 40% — we convert most leads we speak to', score: 4 },
      { label: '20 – 40% — solid but room to improve', score: 3 },
      { label: '10 – 20% — we lose a lot before getting on-site', score: 2 },
      { label: 'Under 10% — most leads just disappear', score: 1 },
    ],
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────────
function calculateScore(answers: Answers): number {
  return [
    answers.q1 !== null ? QUESTIONS[0].options[answers.q1].score : 0,
    answers.q2 !== null ? QUESTIONS[1].options[answers.q2].score : 0,
    answers.q3 !== null ? QUESTIONS[2].options[answers.q3].score : 0,
    answers.q4 !== null ? QUESTIONS[3].options[answers.q4].score : 0,
  ].reduce((a, b) => a + b, 0);
}

function getGradeInfo(answers: Answers): GradeInfo {
  const score = calculateScore(answers);

  if (score >= 13) {
    return {
      letter: 'A',
      label: "Elite — You're in the top 5% of solar companies",
      insight: "Your speed-to-lead process is best-in-class. You're reaching leads before competitors and converting at elite rates. Most solar companies would struggle to match this.",
      detail: "The next lever is scaling your lead volume — your system can handle it. Focus on after-hours coverage and multi-touch follow-up sequences to push from great to unbeatable.",
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-300',
    };
  }
  if (score >= 9) {
    return {
      letter: 'B',
      label: "Good — But you're leaving 30% of deals on the table",
      insight: "You're faster than most solar companies, but there are gaps — likely in missed-call follow-up or after-hours coverage. Each gap costs you real deals every week.",
      detail: "Plugging these leaks could add 30-40% more booked appointments without spending a dollar more on ads. The fix is automated follow-up, not more staff.",
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-300',
    };
  }
  if (score >= 5) {
    return {
      letter: 'C',
      label: "Average — Competitors are reaching your leads first",
      insight: "The top solar companies respond in under 5 minutes. At your current speed, homeowners who fill out your form are already getting called by a competitor before you reach them.",
      detail: "78% of homeowners hire the first solar company that calls them back. If you're not first, you're not in the game — even if your pricing is better.",
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-300',
    };
  }
  return {
    letter: 'D',
    label: "Critical — You're paying for leads and giving them away",
    insight: "At this response speed, your ad budget is essentially funding your competitors' businesses. Every hour you wait, more leads in your market go cold or choose someone else.",
    detail: "This is the single highest-leverage problem in your business right now. No amount of better ads or lower pricing will help if competitors are reaching your leads first.",
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-300',
  };
}

// ── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const slideIn = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -32, transition: { duration: 0.25 } },
};

// ── Main Component ────────────────────────────────────────────────────────────
const SolarBenchmarkPage: React.FC = () => {
  const [step, setStep] = useState<QuizStep>(0);
  const [answers, setAnswers] = useState<Answers>({ q1: null, q2: null, q3: null, q4: null });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SEO + Schema
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Solar Speed-to-Lead Benchmark: Grade Your Process (2026) | Boltcall';
    updateMetaDescription(
      'Solar companies lose 78% of leads to slow response. Score your speed-to-lead process in 2 minutes and get a free grade with personalized insights.'
    );

    const webpageSchema = document.createElement('script');
    webpageSchema.type = 'application/ld+json';
    webpageSchema.id = 'solar-benchmark-webpage-schema';
    webpageSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Solar Speed-to-Lead Benchmark',
      description:
        '4-step assessment tool that scores solar companies on their lead response process and grades them A through F compared to the top solar companies in their market.',
      url: 'https://boltcall.org/solar-benchmark',
      provider: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
    });
    document.head.appendChild(webpageSchema);

    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.id = 'solar-benchmark-faq-schema';
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How fast should solar companies respond to new leads?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Solar companies should respond to new leads within 5 minutes. Research shows that calling a lead within 5 minutes makes you 21x more likely to qualify them compared to calling after 30 minutes. The average solar company responds in over 2 hours, meaning most leads have already contacted a competitor.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a good lead-to-appointment rate for solar companies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A strong lead-to-appointment rate for solar companies is 30-40%. The industry average is 15-20%. Companies using automated speed-to-lead systems consistently achieve 35-45% conversion from lead to booked site visit.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why do solar companies lose leads to competitors?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '78% of homeowners hire the first solar company that calls them back. If your response time exceeds 5 minutes — especially for after-hours or weekend leads — competitors are reaching your prospects first. The solution is automated instant callback and SMS follow-up.',
          },
        },
      ],
    });
    document.head.appendChild(faqSchema);

    return () => {
      document.getElementById('solar-benchmark-webpage-schema')?.remove();
      document.getElementById('solar-benchmark-faq-schema')?.remove();
    };
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    if (step !== 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const currentQuestionIndex = typeof step === 'number' && step >= 1 && step <= 4 ? step - 1 : -1;
  const currentQuestion = currentQuestionIndex >= 0 ? QUESTIONS[currentQuestionIndex] : null;
  const currentAnswerKey = currentQuestion ? (currentQuestion.id as keyof Answers) : null;
  const currentAnswer = currentAnswerKey ? answers[currentAnswerKey] : null;

  const handleSelectAnswer = (optionIndex: number) => {
    if (!currentAnswerKey) return;
    setAnswers((prev) => ({ ...prev, [currentAnswerKey]: optionIndex }));
    setError('');
  };

  const handleNext = () => {
    if (step === 0) { setStep(1); return; }
    if (typeof step === 'number' && step >= 1 && step <= 4) {
      if (currentAnswer === null) { setError('Please select an answer to continue.'); return; }
      setError('');
      if (step === 4) { setStep('contact'); return; }
      setStep((step + 1) as QuizStep);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 'contact') { setStep(4); return; }
    if (typeof step === 'number' && step > 1) { setStep((step - 1) as QuizStep); }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!company.trim()) { setError('Please enter your company name.'); return; }

    setError('');
    setIsSubmitting(true);
    setStep('submitting');

    const gradeResult = getGradeInfo(answers);
    const payload = {
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      response_speed: answers.q1 !== null ? QUESTIONS[0].options[answers.q1].label : '',
      missed_call_handling: answers.q2 !== null ? QUESTIONS[1].options[answers.q2].label : '',
      monthly_lead_volume: answers.q3 !== null ? QUESTIONS[2].options[answers.q3].label : '',
      lead_to_appointment_rate: answers.q4 !== null ? QUESTIONS[3].options[answers.q4].label : '',
      total_score: calculateScore(answers),
      grade: gradeResult.letter,
      grade_label: gradeResult.label,
      source: 'solar-benchmark',
      submitted_at: new Date().toISOString(),
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silent fail — user still sees their results
    } finally {
      setIsSubmitting(false);
      setStep('results');
    }
  };

  const grade = getGradeInfo(answers);

  return (
    <div className="bg-white min-h-screen">
      <Header />

      {/* ── HERO (step 0) ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <main>
          {/* Hero */}
          <section className="py-20 lg:py-28 relative overflow-hidden">
            {/* Subtle dot-grid texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                opacity: 0.55,
              }}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="max-w-3xl mx-auto text-center"
              >
                {/* Badge */}
                <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-full text-blue-700 text-sm font-semibold mb-8">
                  <BarChart3 className="w-4 h-4" />
                  Free 2-Minute Benchmark
                </motion.div>

                {/* H1 */}
                <motion.h1
                  variants={fadeUp}
                  className="text-5xl lg:text-6xl font-bold text-[#0B1220] leading-tight mb-6"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Score Your Solar Company's
                  <span className="text-[#2563EB]"> Speed-to-Lead</span>
                </motion.h1>

                {/* Direct answer block — within first 150 words for AEO */}
                <motion.p
                  variants={fadeUp}
                  className="text-xl text-[#475569] leading-relaxed mb-10 max-w-2xl mx-auto"
                >
                  Solar companies lose 78% of deals to slow response times. The average installer takes over 2 hours to call a new lead — but 78% of homeowners hire the first company that calls them back. This free 4-question benchmark grades your lead response process A through F and tells you exactly where you're losing deals.
                </motion.p>

                {/* CTA */}
                <motion.div variants={fadeUp}>
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg font-semibold border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150"
                  >
                    Get My Free Grade
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="mt-4 text-sm text-[#475569]">No signup required to start. Takes 2 minutes.</p>
                </motion.div>
              </motion.div>

              {/* Stat cards */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto"
              >
                {[
                  { icon: Clock, stat: '2h 47min', label: 'Average solar installer response time' },
                  { icon: Zap, stat: '21x', label: 'More likely to qualify a lead called in 5 min vs 30 min' },
                  { icon: TrendingUp, stat: '78%', label: 'Of homeowners hire the first company that calls them back' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_black] text-center"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-[#0B1220] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {item.stat}
                    </div>
                    <p className="text-sm text-[#475569] leading-snug">{item.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Why section */}
          <section className="py-16 lg:py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="max-w-3xl mx-auto"
              >
                <motion.h2 variants={fadeUp} className="text-3xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Why Are Solar Companies Losing 78% of Their Leads?
                </motion.h2>
                <motion.p variants={fadeUp} className="text-lg text-[#475569] mb-6">
                  A homeowner fills out a solar quote form. Within seconds, that same form data is sent to 3-5 competing solar companies. The first company to call wins the appointment. The others are left with an empty voicemail box.
                </motion.p>
                <motion.p variants={fadeUp} className="text-lg text-[#475569] mb-8">
                  The top solar companies don't have better salespeople or lower prices. They have faster systems. They respond in under 5 minutes automatically — and follow up relentlessly when nobody answers.
                </motion.p>
                <motion.div variants={fadeUp}>
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-3 px-7 py-4 bg-blue-600 text-white font-semibold border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150"
                  >
                    Take the Free Benchmark
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Comparison table */}
          <section className="py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="max-w-3xl mx-auto"
              >
                <motion.h2 variants={fadeUp} className="text-3xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  How Do the Top 5% of Solar Companies Respond to Leads?
                </motion.h2>
                <motion.div variants={fadeUp} className="overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-black rounded-lg text-sm">
                    <thead>
                      <tr className="bg-[#0B1220] text-white">
                        <th className="text-left p-4 font-semibold rounded-tl-lg">Response Time</th>
                        <th className="text-left p-4 font-semibold">Contact Rate</th>
                        <th className="text-left p-4 font-semibold rounded-tr-lg">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { time: 'Under 5 minutes', rate: '78%+', grade: 'A', highlight: false },
                        { time: '5 – 30 minutes', rate: '40 – 60%', grade: 'B', highlight: false },
                        { time: '30 min – 2 hours', rate: '20 – 35%', grade: 'C', highlight: false },
                        { time: '2+ hours / next day', rate: 'Under 15%', grade: 'D / F', highlight: true },
                      ].map((row, i) => (
                        <tr key={i} className={`border-t-2 border-black ${row.highlight ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-4 text-[#0B1220] font-medium">{row.time}</td>
                          <td className="p-4 text-[#475569]">{row.rate}</td>
                          <td className="p-4 font-bold text-[#0B1220]">{row.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
                <motion.p variants={fadeUp} className="text-sm text-[#475569] mt-4">
                  Industry average: 2h 47min. The table above shows where the top solar companies operate — and where most lose.
                </motion.p>
              </motion.div>
            </div>
          </section>

          <Footer />
        </main>
      )}

      {/* ── QUIZ STEPS (1-4) ──────────────────────────────────────────────── */}
      {typeof step === 'number' && step >= 1 && step <= 4 && currentQuestion && (
        <main className="py-16 lg:py-24">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Progress bar */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#475569]">Question {step} of 4</span>
                <span className="text-sm font-semibold text-[#2563EB]">{step * 25}% complete</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                <motion.div
                  className="h-full bg-[#2563EB] rounded-full"
                  initial={{ width: `${(step - 1) * 25}%` }}
                  animate={{ width: `${step * 25}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={slideIn}
              >
                <div className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_black] p-8 mb-6">
                  {/* Icon + label */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <currentQuestion.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                      Question {step}
                    </span>
                  </div>

                  {/* Question text */}
                  <h2
                    className="text-2xl font-bold text-[#0B1220] mb-8 leading-snug"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {currentQuestion.question}
                  </h2>

                  {/* Answer options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = currentAnswer === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(idx)}
                          className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all duration-150 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-[3px_3px_0px_0px_#1d4ed8]'
                              : 'bg-white text-[#0B1220] border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                              isSelected ? 'border-white bg-white text-blue-600' : 'border-gray-300 text-gray-400'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-sm text-red-600 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.p>
                  )}
                </div>

                {/* Nav buttons */}
                <div className="flex items-center justify-between">
                  {step > 1 ? (
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center gap-2 text-[#475569] hover:text-[#0B1220] font-medium transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={handleNext}
                    disabled={currentAnswer === null}
                    className={`inline-flex items-center gap-3 px-7 py-3.5 text-white font-semibold border-2 border-black rounded-lg transition-all duration-150 ${
                      currentAnswer !== null
                        ? 'bg-blue-600 shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none'
                        : 'bg-gray-300 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {step === 4 ? 'See My Grade' : 'Next Question'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      )}

      {/* ── CONTACT CAPTURE ───────────────────────────────────────────────── */}
      {step === 'contact' && (
        <main className="py-16 lg:py-24">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Progress bar — complete */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#475569]">Almost done</span>
                <span className="text-sm font-semibold text-[#2563EB]">100% complete</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full w-full" />
              </div>
            </div>

            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <div className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_black] p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Your Grade Is Ready</span>
                </div>

                <motion.h2
                  variants={fadeUp}
                  className="text-2xl font-bold text-[#0B1220] mb-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Where should we send your results?
                </motion.h2>
                <motion.p variants={fadeUp} className="text-[#475569] mb-8">
                  Enter your details below to see your grade and personalized insights.
                </motion.p>

                <motion.div variants={stagger} className="space-y-4">
                  {[
                    { label: 'Your name', value: name, setter: setName, placeholder: 'John Smith', type: 'text' },
                    { label: 'Work email', value: email, setter: setEmail, placeholder: 'john@solarpros.com', type: 'email' },
                    { label: 'Company name', value: company, setter: setCompany, placeholder: 'Solar Pros Inc.', type: 'text' },
                  ].map((field) => (
                    <motion.div key={field.label} variants={fadeUp}>
                      <label className="block text-sm font-semibold text-[#0B1220] mb-2">{field.label}</label>
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#0B1220] placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-sm text-red-600 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-[#475569] hover:text-[#0B1220] font-medium transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-3 px-7 py-3.5 bg-blue-600 text-white font-semibold border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0px_0px_black]"
                >
                  Show My Grade
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </main>
      )}

      {/* ── SUBMITTING ────────────────────────────────────────────────────── */}
      {step === 'submitting' && (
        <main className="py-32 lg:py-40">
          <div className="max-w-md mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <div>
                <p className="text-xl font-bold text-[#0B1220] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Calculating your grade...
                </p>
                <p className="text-[#475569]">Comparing your answers to the top solar companies.</p>
              </div>
            </motion.div>
          </div>
        </main>
      )}

      {/* ── RESULTS ───────────────────────────────────────────────────────── */}
      {step === 'results' && (
        <main>
          <section className="py-16 lg:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                {/* Grade card */}
                <motion.div
                  variants={fadeUp}
                  className={`border-2 ${grade.borderClass} rounded-2xl shadow-[6px_6px_0px_0px_black] overflow-hidden mb-8`}
                >
                  {/* Header */}
                  <div className={`${grade.bgClass} border-b-2 ${grade.borderClass} px-8 py-6`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-24 h-24 rounded-2xl border-2 ${grade.borderClass} flex items-center justify-center flex-shrink-0 bg-white shadow-[4px_4px_0px_0px_black]`}>
                        <span
                          className={`text-6xl font-black ${grade.colorClass}`}
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          {grade.letter}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-1">Your Grade</p>
                        <h1
                          className={`text-xl font-bold ${grade.colorClass}`}
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          {grade.label}
                        </h1>
                        <p className="text-sm text-[#475569] mt-1">Score: {calculateScore(answers)} / 16 points</p>
                      </div>
                    </div>
                  </div>

                  {/* Insight */}
                  <div className="bg-white px-8 py-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-[#0B1220] mb-2">What This Means</h3>
                      <p className="text-[#475569] leading-relaxed">{grade.insight}</p>
                    </div>
                    <div className={`p-4 ${grade.bgClass} border ${grade.borderClass} rounded-xl`}>
                      <p className={`text-sm font-medium ${grade.colorClass} leading-relaxed`}>{grade.detail}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Answer breakdown */}
                <motion.div variants={fadeUp} className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_black] p-8 mb-8">
                  <h2 className="text-xl font-bold text-[#0B1220] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    What Does Your Grade Mean?
                  </h2>
                  <div className="space-y-4">
                    {QUESTIONS.map((q, i) => {
                      const answerKey = q.id as keyof Answers;
                      const answerIdx = answers[answerKey];
                      const answerScore = answerIdx !== null ? q.options[answerIdx].score : 0;
                      const isStrong = answerScore >= 3;
                      return (
                        <div key={i} className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isStrong ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            {isStrong
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              : <AlertTriangle className="w-4 h-4 text-red-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0B1220] mb-0.5">
                              {q.question.split(' — ')[0]}
                            </p>
                            <p className="text-sm text-[#475569]">
                              {answerIdx !== null ? q.options[answerIdx].label : 'Not answered'}
                            </p>
                          </div>
                          <div className={`text-sm font-bold flex-shrink-0 ${isStrong ? 'text-emerald-600' : 'text-red-500'}`}>
                            {answerScore}/4
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Book a call CTA */}
                <motion.div
                  variants={fadeUp}
                  className="bg-[#0B1220] border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_black] p-8 text-center"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-white mb-3"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Ready to fix your speed-to-lead?
                  </h2>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Book a free 20-minute call. We'll show you exactly how to automate your lead response so you're always the first company to call — even at 11pm on a Friday.
                  </p>
                  <a
                    href="https://cal.com/boltcall/discovery"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold border-2 border-white rounded-lg shadow-[4px_4px_0px_0px_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150"
                  >
                    Book a Free Call
                    <ArrowRight className="w-5 h-5" />
                  </a>
                  <p className="mt-4 text-xs text-gray-500">No hard sell. No obligation. Just a plan.</p>
                </motion.div>
              </motion.div>
            </div>
          </section>

          <FinalCTA {...CALCULATOR_CTA} />
          <Footer />
        </main>
      )}
    </div>
  );
};

export default SolarBenchmarkPage;
