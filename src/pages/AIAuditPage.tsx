import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Brain, Globe, Phone, Settings, DollarSign, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FAQ from '../components/FAQ';
import Breadcrumbs from '../components/Breadcrumbs';
import Button from '../components/ui/Button';
import DropdownComponent from '../components/ui/dropdown-01';
import { useNavigate } from 'react-router-dom';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { MONTHLY_LEADS_OPTIONS, JOB_VALUE_OPTIONS } from '../lib/leadQualifiers';

// ── Option lists ──
const industryOptions = [
  { value: 'Plumber', label: 'Plumber' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'Lawyer', label: 'Lawyer' },
  { value: 'Contractor', label: 'General Contractor' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Auto Repair', label: 'Auto Repair' },
  { value: 'Salon/Spa', label: 'Salon / Spa' },
  { value: 'Roofing', label: 'Roofing' },
  { value: 'Electrician', label: 'Electrician' },
  { value: 'Medical Practice', label: 'Medical Practice' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Other', label: 'Other' },
];

const adminHoursOptions = [
  { value: '0-5', label: '0 – 5 hours' },
  { value: '5-10', label: '5 – 10 hours' },
  { value: '10-20', label: '10 – 20 hours' },
  { value: '20+', label: '20+ hours' },
];

const channelOptions = [
  'Phone',
  'Email',
  'Website form',
  'Walk-in',
  'Social media',
];

const painPointOptions = [
  'Missed calls',
  'Slow response time',
  'No online booking',
  'Manual follow-ups',
  'Low website traffic',
  'Not enough reviews',
  'Losing to competitors',
];

// ── Webhook URL (replace with your n8n webhook after creating it) ──
const WEBHOOK_URL = 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/ai-audit'; // n8n orchestration webhook

// ── Loading step messages ──
const loadingSteps = [
  { icon: Globe, text: 'Analyzing your website...' },
  { icon: Phone, text: 'Auditing customer communication...' },
  { icon: Settings, text: 'Evaluating operations & automation...' },
  { icon: Brain, text: 'Assessing AI readiness...' },
  { icon: DollarSign, text: 'Calculating revenue impact...' },
];

const AIAuditPage: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does a free AI business audit include?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall\'s free AI business audit scores your business across four dimensions: lead response speed, missed call rate, follow-up automation, and booking conversion. You receive a custom report with a revenue impact estimate and an AI readiness score.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does Boltcall\'s AI audit take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The AI audit takes 2–3 minutes to complete. After answering 8 questions about your business, you instantly receive a personalized report showing your AI readiness score and estimated monthly revenue impact.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is the Boltcall AI audit free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, the AI business audit is completely free. There is no obligation and no credit card required. You will receive your results immediately after completing the 2-minute questionnaire.',
          },
        },
      ],
    },
  ]);

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0); // 0 = hero, 1-4 = form steps
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState('');

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [customerChannels, setCustomerChannels] = useState<string[]>([]);
  const [monthlyLeads, setMonthlyLeads] = useState('');
  const [hasAfterHours, setHasAfterHours] = useState<boolean | null>(null);
  const [customerLtv, setCustomerLtv] = useState('');

  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [adminHours, setAdminHours] = useState('');

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    document.title = 'Free AI Business Audit | Boltcall';
    updateMetaDescription(
      'Get a free AI audit of your business. Discover how much revenue you\'re losing and how AI can help. Personalized PDF report delivered to your inbox.'
    );
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "AI Audit", "item": "https://boltcall.org/ai-audit"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  // Animate loading steps
  useEffect(() => {
    if (!isSubmitting) return;
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const toggleArrayItem = (arr: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 1) {
      if (!businessName.trim() || !industry) {
        setError('Please fill in your business name and industry.');
        return false;
      }
    } else if (step === 2) {
      if (customerChannels.length === 0 || !monthlyLeads || hasAfterHours === null || !customerLtv) {
        setError('Please answer all questions before continuing.');
        return false;
      }
    } else if (step === 3) {
      if (painPoints.length === 0 || !adminHours) {
        setError('Please select at least one challenge and your admin hours.');
        return false;
      }
    } else if (step === 4) {
      if (!contactName.trim() || !email.trim() || !consent) {
        setError('Please fill in your name, email, and accept the consent.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setIsSubmitting(true);
    setLoadingStepIndex(0);

    const payload = {
      business_name: businessName.trim(),
      industry,
      website_url: websiteUrl.trim(),
      city: city.trim(),
      state: state.trim(),
      contact_name: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      customer_channels: customerChannels,
      monthly_leads: monthlyLeads,
      has_after_hours: hasAfterHours,
      customer_ltv: customerLtv,
      pain_points: painPoints,
      admin_hours_weekly: adminHours,
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Submission failed');

      // Wait a moment for the loading animation to feel complete
      await new Promise((r) => setTimeout(r, 2000));
      navigate('/ai-audit/thank-you');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Hero ──
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-white">
        <GiveawayBar />
        <Header />
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Breadcrumbs />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                Free — No credit card required
              </div>
              <h1 className="text-[33px] md:text-[40px] lg:text-[53px] font-bold text-gray-900 mb-6 leading-tight">
                Is Your Business <span className="text-blue-600">AI-Ready?</span>
              </h1>
              <p className="text-[18px] md:text-[22px] text-gray-600 mb-4 max-w-2xl mx-auto">
                Get a personalized AI audit of your business — find out exactly where you're losing money and how AI can fix it.
              </p>
              <p className="text-gray-500 mb-10 max-w-xl mx-auto">
                Answer a few quick questions and we'll send you a branded PDF report with your scores, revenue impact analysis, and a priority action plan.
              </p>

              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg font-semibold text-lg">
                Start My Free Audit
              </Button>

              <p className="text-sm text-gray-400 mt-4">Takes ~2 minutes · Report delivered in ~3 minutes</p>

              {/* Trust signals */}
              <h2 className="text-lg font-semibold text-gray-700 mt-14 mb-4">What Your Audit Covers</h2>
              <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                {[
                  { value: '100', label: 'Revenue impact scored' },
                  { value: '5', label: 'Growth areas uncovered' },
                  { value: 'Free', label: 'Personalized action plan' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{item.value}</div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
        {/* Social Proof */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "The AI audit showed us we were losing $4,200/month to missed after-hours calls. We had no idea. Fixing that one thing paid for Boltcall 10x over.", name: "Marcus T.", role: "HVAC Business Owner, Texas" },
              { quote: "The PDF report was genuinely eye-opening. Our 'AI readiness score' was 28 out of 100. Six weeks later it's 81 and we're booking 40% more appointments.", name: "Sandra P.", role: "Dental Practice Owner, Georgia" },
              { quote: "I've done ROI calculators before but this one was different — it actually used our specific numbers and showed us exactly what to fix first.", name: "Chris W.", role: "Roofing Contractor, Ohio" },
            ].map((item) => (
              <div key={item.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="bg-gray-50 border-t border-gray-100 py-8 mb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>100% Free — no credit card required</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Used by 500+ local businesses</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>PDF report delivered in ~3 minutes</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>
            </div>
          </div>
        </section>

        {/* Benefit-Focused Bullets */}
        <section className="py-10 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
            <ul className="space-y-3">
              {[
                "Identify revenue leaks from unanswered calls in minutes",
                "See exactly how much money you're losing monthly",
                "Get a custom AI implementation roadmap — free",
                "Compare your AI readiness to top competitors in your industry",
                "Discover quick wins you can implement this week",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Objection Handling */}
        <section id="objections" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Questions About the AI Audit
          </h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Everything you need to know before you start.
          </p>
          <div className="space-y-3">
            {[
              {
                q: 'What exactly does the AI audit analyze?',
                a: 'We analyze your phone answering speed, Google Business Profile completeness, online review score, website performance, and gap vs. your top 3 local competitors.',
              },
              {
                q: 'Is my data kept private?',
                a: 'Absolutely. Your audit data is never shared or sold. It\'s used solely to generate your personalized report.',
              },
              {
                q: 'Do I need to install anything?',
                a: 'No. Just fill in the form and we do the rest. No software installation required.',
              },
              {
                q: 'How is this different from a regular SEO audit?',
                a: 'Standard SEO audits focus on keywords and backlinks. Ours focuses on phone performance and local revenue — the things that actually fill your calendar.',
              },
              {
                q: 'What happens after I get my results?',
                a: "You'll get a clear action list. You can implement it yourself, hire someone, or let us show you how Boltcall can automate the fixes.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary
                  className="font-semibold text-gray-900 px-5 py-4 cursor-pointer"
                  style={{ listStyle: 'none' }}
                >
                  {q}
                </summary>
                <p className="text-gray-600 px-5 pb-4 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <FAQ />
  
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
  }

  // ── Loading screen ──
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-white">
        <GiveawayBar />
        <Header />
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="flex justify-center mb-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 className="w-16 h-16 text-blue-600" />
                </motion.div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your AI Audit...</h2>
              <p className="text-gray-500 mb-10">Our AI is analyzing your business right now.</p>

              <div className="space-y-3 text-left">
                {loadingSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < loadingStepIndex;
                  const isActive = idx === loadingStepIndex;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: idx <= loadingStepIndex ? 1 : 0.3, x: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isActive ? 'bg-blue-50 border border-blue-200' : isDone ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : isActive ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        </motion.div>
                      ) : (
                        <Icon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                        {step.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // ── Multi-step form ──
  const totalSteps = 4;
  const stepLabels = ['Business Info', 'Operations', 'Challenges', 'Get Report'];

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-4">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {stepLabels.map((label, idx) => (
                <div key={label} className={`text-center ${currentStep >= idx + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className="text-sm font-semibold mb-1">{idx + 1}</div>
                  <div className="text-xs font-medium">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <motion.div
                className="bg-blue-600 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
          )}

          {/* Step 1 — Business Basics */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your business</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Business Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith Plumbing"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Industry *</label>
                  <DropdownComponent options={industryOptions} value={industry} onChange={setIndustry} placeholder="Select your industry" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Website URL</label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Optional — we'll analyze it if provided</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Austin"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. TX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Current Operations */}
          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">How does your business operate?</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">How do customers reach you? *</label>
                  <div className="flex flex-wrap gap-2">
                    {channelOptions.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleArrayItem(customerChannels, ch, setCustomerChannels)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          customerChannels.includes(ch)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Estimated monthly leads/inquiries *</label>
                  <DropdownComponent options={[...MONTHLY_LEADS_OPTIONS]} value={monthlyLeads} onChange={setMonthlyLeads} placeholder="Select range" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Do you have an after-hours answering system? *</label>
                  <div className="flex gap-3">
                    {[
                      { label: 'Yes', value: true },
                      { label: 'No', value: false },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setHasAfterHours(opt.value)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          hasAfterHours === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Average customer lifetime value *</label>
                  <DropdownComponent options={[...JOB_VALUE_OPTIONS]} value={customerLtv} onChange={setCustomerLtv} placeholder="Select range" required />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Pain Points */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">What are your biggest challenges?</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Select all that apply *</label>
                  <div className="flex flex-wrap gap-2">
                    {painPointOptions.map((pp) => (
                      <button
                        key={pp}
                        type="button"
                        onClick={() => toggleArrayItem(painPoints, pp, setPainPoints)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          painPoints.includes(pp)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {pp}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">How many hours/week does your team spend on admin tasks? *</label>
                  <DropdownComponent options={adminHoursOptions} value={adminHours} onChange={setAdminHours} placeholder="Select range" required />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Contact Info */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Where should we send your report?</h3>
              <p className="text-gray-500 text-sm mb-6">We'll email your personalized AI Audit PDF within a few minutes.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Optional</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to receive my AI Audit report and occasional business tips from Boltcall. You can unsubscribe at any time.
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button onClick={handleBack} disabled={currentStep <= 1} variant="outline" className="px-6 py-3">
              Back
            </Button>
            <Button onClick={handleNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white" style={{ transition: 'none' }}>
              {currentStep === 4 ? 'Get My Free Audit' : 'Next'}
            </Button>
          </div>
        </div>
      </section>

      <FAQ />

      {/* AI Audit Scoring Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">AI Audit Score Ranges: What Your Results Mean</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How to interpret your AI audit score and what action to take at each level</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Score</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Rating</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Estimated Revenue at Risk</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Recommended Next Step</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['0–30', 'Critical', '$10,000+ per month', 'Implement AI call answering and lead capture immediately'],
                  ['31–50', 'Needs Work', '$5,000 – $10,000 per month', 'Add after-hours coverage and automated follow-up'],
                  ['51–70', 'Average', '$2,000 – $5,000 per month', 'Optimize response time and add review automation'],
                  ['71–85', 'Good', '$500 – $2,000 per month', 'Fine-tune scripts and add CRM integration'],
                  ['86–100', 'Excellent', 'Minimal', 'Maintain current systems and focus on upsell automation'],
                ].map(([score, rating, risk, step]) => (
                  <tr key={score} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{score}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{rating}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{risk}</td>
                    <td className="px-4 py-3 text-gray-600">{step}</td>
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

export default AIAuditPage;
