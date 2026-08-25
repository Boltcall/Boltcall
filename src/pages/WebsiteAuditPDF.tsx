import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { createServiceSchema, injectSchemas } from '../lib/schema';
import { motion } from 'framer-motion';
import {
  Globe, Building2, AlertCircle, Loader, Mail, Phone,
  FileText, Gauge, MousePointerClick, Smartphone, CheckCircle2, Loader2, ArrowLeft,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import FAQ from '../components/FAQ';
import Breadcrumbs from '../components/Breadcrumbs';
import DropdownComponent from '../components/ui/dropdown-01';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSchemaInjector } from '../hooks/useSchemaInjector';
import { INDUSTRY_OPTIONS } from '../lib/setup/onboarding';

const LEAD_ENDPOINT = '/.netlify/functions/website-audit-lead';

const loadingSteps = [
  { icon: Globe, text: 'Loading your homepage...' },
  { icon: Gauge, text: 'Scoring above-the-fold clarity...' },
  { icon: MousePointerClick, text: 'Benchmarking against 40 local-service sites...' },
  { icon: Smartphone, text: 'Checking mobile first-screen...' },
  { icon: FileText, text: 'Writing your branded PDF...' },
];

const WebsiteAuditPDF: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does the free website audit check?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall\'s free website audit scores how fast your homepage proves you respond quickly — hero clarity, proof placement above vs. below the fold, CTA prominence, and mobile first-screen — benchmarked against other local-service homepages. You get a branded PDF with the scores and a prioritized fix list.',
          },
        },
        {
          '@type': 'Question',
          name: 'How quickly will I receive my website audit PDF?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Enter your website and email and we generate your branded PDF report shortly after — delivered straight to your inbox.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Free Website Audit PDF Report Tool',
      url: 'https://boltcall.org/website-audit',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      description: 'Free website audit that scores your homepage on response-speed proof and conversion signals, delivered as a branded PDF report.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState(() => searchParams.get('url') || '');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Free Website Audit - Get Your PDF Report | Boltcall';
    updateMetaDescription(
      'Enter your website for a free speed-to-lead audit. Get a branded PDF scoring your homepage on response-speed proof, CTA prominence, and mobile first-screen.'
    );

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Website Audit', item: 'https://boltcall.org/website-audit' },
      ],
    });
    document.head.appendChild(breadcrumbScript);

    const cleanupService = injectSchemas([
      createServiceSchema({
        name: 'Free Website Audit',
        description: 'A free website audit that scores your homepage on response-speed proof and conversion signals, delivered as a branded PDF report.',
        url: '/website-audit',
      }),
    ]);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      cleanupService();
    };
  }, []);

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev >= loadingSteps.length - 1 ? prev : prev + 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validatePhone = (value: string): boolean => /^[0-9+()\-.\s]{7,20}$/.test(value);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) { setError('Please enter your company name'); return; }
    if (!url.trim()) { setError('Please enter your website URL'); return; }
    if (!industry) { setError('Please select your industry'); return; }
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !validateEmail(email.trim())) { setError('Please enter a valid email address'); return; }
    if (!phone.trim() || !validatePhone(phone.trim())) { setError('Please enter a valid phone number'); return; }

    setIsAnalyzing(true);
    setLoadingStepIndex(0);

    try {
      const response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          url: url.trim(),
          industry,
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Submission failed');

      await new Promise((r) => setTimeout(r, 1800));
      navigate('/website-audit/thank-you');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Website Audit...</h2>
              <p className="text-gray-500 mb-10">We're scoring {companyName || 'your homepage'} against the peer benchmark.</p>

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

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-4 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">
              <FileText className="w-4 h-4" />
              <span className="font-semibold">Free PDF Report</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Website <span className="text-blue-600">Speed-to-Lead</span> Audit
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
              The business that responds first wins the job. See if your homepage proves that fast enough.
            </p>
            <p className="text-gray-500 max-w-xl mx-auto">
              We score your homepage on hero clarity, proof placement, CTA prominence, and mobile first-screen — benchmarked against local-service homepages we've audited — and send you a branded PDF with the fastest fixes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefit bullets */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
          <ul className="space-y-3">
            {[
              'A response-speed benchmark score vs. peer local-service homepages',
              'A clear read on what proof sits above the fold vs. buried below it',
              'A 30-day opportunity scorecard across 4 conversion signals',
              'A prioritized, 4-item action plan — copy fixes first, rebuilds last',
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What's included */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Gauge, label: 'Response Speed Benchmark', desc: 'Where your proof sits vs. peers' },
            { icon: MousePointerClick, label: 'CTA Prominence', desc: 'How fast a visitor finds the next step' },
            { icon: Smartphone, label: 'Mobile First-Screen', desc: "What's actually visible pre-scroll" },
            { icon: FileText, label: 'Action Plan', desc: 'The 4 fixes to make first' },
          ].map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center"
            >
              <item.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Get Your Free Audit</h2>
            <p className="text-sm text-gray-500 mb-4 text-center">
              {step === 1 ? "Tell us about your business" : "Where should we send your report?"}
            </p>

            {/* 2-step progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-gray-500">Step {step} of 2</span>
                <span className="text-xs text-gray-400">{step === 1 ? '50%' : '100%'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <motion.div
                  className="bg-blue-600 h-1 rounded-full"
                  initial={false}
                  animate={{ width: step === 1 ? '50%' : '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {step === 1 && (
              <motion.form key="step1" onSubmit={handleNext} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                <div>
                  <label htmlFor="audit-company" className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="audit-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Riverside Family Dental"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="audit-industry" className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                  <DropdownComponent options={[...INDUSTRY_OPTIONS]} value={industry} onChange={setIndustry} placeholder="Select your industry" required />
                </div>

                <div>
                  <label htmlFor="audit-url" className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="audit-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!companyName.trim() || !url.trim() || !industry}
                  className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold text-base"
                >
                  Continue
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form key="step2" onSubmit={handleSubmit} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                <div>
                  <label htmlFor="audit-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="audit-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      disabled={isAnalyzing}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Your branded PDF report will be sent to this email</p>
                </div>

                <div>
                  <label htmlFor="audit-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      id="audit-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      disabled={isAnalyzing}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">In case we spot something worth a quick call</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isAnalyzing}
                    className="px-4 py-4 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={isAnalyzing || !email.trim() || !phone.trim()}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold text-base"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Get My Free Audit
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-400">Free · No credit card · Delivered to your inbox</p>
              </motion.form>
            )}
          </div>
        </motion.div>
      </section>

      {/* Trust signals */}
      <section className="bg-gray-50 border-t border-gray-100 py-8 mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>100% Free — no credit card required</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Benchmarked against real local-service homepages</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /><span>Your data is never sold or shared</span></div>
          </div>
        </div>
      </section>

      {/* Objections */}
      <section id="objections" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Questions About Your Website Audit</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Straight answers to the things people wonder before requesting the report.</p>
        <div className="space-y-3">
          {[
            { q: 'What exactly gets scored?', a: 'Hero clarity, how much of your proof sits above vs. below the fold, CTA prominence, and mobile first-screen — the four signals that decide whether a visitor sees "this business responds fast" before they bounce.' },
            { q: 'Will this turn into a sales pitch?', a: 'No. The report is yours to keep and act on however you choose. We may follow up once — that\'s it.' },
            { q: 'What if my scores are already good?', a: 'Great news — the report will confirm it, and show you the one or two things still worth tightening.' },
          ].map(({ q, a }) => (
            <details key={q} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <summary className="font-semibold text-gray-900 px-5 py-4 cursor-pointer" style={{ listStyle: 'none' }}>{q}</summary>
              <p className="text-gray-600 px-5 pb-4 text-sm">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <FAQ />
      <Footer />
    </div>
  );
};

export default WebsiteAuditPDF;
