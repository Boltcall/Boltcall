import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Download, Mail, Loader, BarChart3, DollarSign, Users, Target, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';

const WEBHOOK_URL = 'https://n8n.srv974118.hstgr.cloud/webhook/funnel-report';

const NICHE_OPTIONS = [
  'Plumbing', 'HVAC', 'Roofing', 'Electrical', 'Dental', 'Medical', 'Legal',
  'Real Estate', 'Insurance', 'Auto Repair', 'Landscaping', 'Cleaning',
  'Salon / Spa', 'Restaurant', 'Fitness / Gym', 'Accounting', 'Other'
];

const FunnelOptimizer: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState('');
  const [visitors, setVisitors] = useState(1000);
  const [v2l, setV2l] = useState(3);
  const [l2q, setL2q] = useState(30);
  const [q2c, setQ2c] = useState(25);
  const [dealValue, setDealValue] = useState(2000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    document.title = 'Free Funnel Optimizer — See How Much Revenue Your Funnel Is Leaking';
    updateMetaDescription('Free funnel analysis tool for local businesses. Enter your conversion rates and get a PDF report with revenue leak detection, benchmarks, and fixes.');

    // Add BreadcrumbList JSON-LD
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Funnel Optimizer", "item": "https://boltcall.org/funnel-optimizer" }
      ]
    });
    document.head.appendChild(breadcrumbScript);


    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => {
      document.getElementById('person-schema')?.remove();
      const bc = document.getElementById('breadcrumb-jsonld');
      if (bc) bc.remove();
    };
  }, []);

  // Live preview calculations
  const leads = Math.round(visitors * (v2l / 100));
  const qualified = Math.round(leads * (l2q / 100));
  const closed = Math.round(qualified * (q2c / 100));
  const monthlyRevenue = closed * dealValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!businessName.trim()) { setError('Please enter your business name'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }
    if (!niche) { setError('Please select your industry'); return; }

    setIsSubmitting(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          email: email.trim(),
          niche,
          visitors,
          v2l,
          l2q,
          q2c,
          deal_value: dealValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!result?.htmlBase64) return;

    // Decode base64 HTML
    const htmlContent = atob(result.htmlBase64);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'funnel-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => '$' + n.toLocaleString();

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <BarChart3 className="w-4 h-4" />
              Free Funnel Analysis Tool
            </div>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-gray-900 mb-4 leading-tight">
              See How Much Revenue Your<br />
              <span className="text-indigo-600">Funnel Is Leaving on the Table</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Enter your numbers below. Get a detailed PDF report with revenue leak detection,
              industry benchmarks, and actionable recommendations — sent to your email instantly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefit-Focused Bullets */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
          <ul className="space-y-3">
            {[
              "Find the exact step where you're losing 60-80% of leads",
              "Increase monthly revenue by fixing 3 common funnel leaks",
              "Automate follow-ups that recover leads who went silent",
              "Add AI chat and SMS capture to your website in 24 hours",
              "Turn a 10% conversion rate into 25% with proven tactics",
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mt-0.5">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form + Live Preview */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6 space-y-5 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Your Business Info
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Smith's Plumbing"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">Select your industry...</option>
                      {NICHE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 space-y-5 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Your Funnel Numbers
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Website Visitors</label>
                    <input
                      type="number"
                      value={visitors}
                      onChange={(e) => setVisitors(Number(e.target.value) || 0)}
                      min={0}
                      step={100}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Visitor → Lead Rate</label>
                      <span className="text-sm font-bold text-indigo-600">{v2l}%</span>
                    </div>
                    <input
                      type="range"
                      value={v2l}
                      onChange={(e) => setV2l(Number(e.target.value))}
                      min={0}
                      max={50}
                      step={0.5}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0%</span>
                      <span className="text-yellow-600">Avg: 5%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Lead → Qualified Rate</label>
                      <span className="text-sm font-bold text-indigo-600">{l2q}%</span>
                    </div>
                    <input
                      type="range"
                      value={l2q}
                      onChange={(e) => setL2q(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0%</span>
                      <span className="text-yellow-600">Avg: 40%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Qualified → Closed Rate</label>
                      <span className="text-sm font-bold text-indigo-600">{q2c}%</span>
                    </div>
                    <input
                      type="range"
                      value={q2c}
                      onChange={(e) => setQ2c(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0%</span>
                      <span className="text-yellow-600">Avg: 30%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Average Deal Value ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={dealValue}
                        onChange={(e) => setDealValue(Number(e.target.value) || 0)}
                        min={0}
                        step={100}
                        className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating Your Report...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Get My Free Funnel Report
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Live Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:sticky lg:top-32 lg:self-start"
            >
              {!result ? (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
                  <h3 className="text-lg font-semibold mb-6 text-gray-300">Live Funnel Preview</h3>

                  {/* Visual Funnel */}
                  <div className="space-y-2 mb-8">
                    {[
                      { label: 'Visitors', value: visitors, width: 100, color: 'from-indigo-500 to-indigo-400' },
                      { label: 'Leads', value: leads, width: Math.max((leads / (visitors || 1)) * 100, 8), color: 'from-blue-500 to-blue-400' },
                      { label: 'Qualified', value: qualified, width: Math.max((qualified / (visitors || 1)) * 100, 5), color: 'from-orange-500 to-orange-400' },
                      { label: 'Closed', value: closed, width: Math.max((closed / (visitors || 1)) * 100, 3), color: 'from-green-500 to-green-400' },
                    ].map((stage) => (
                      <div key={stage.label} className="flex items-center gap-3">
                        <div className="w-20 text-right text-xs text-gray-400 font-medium">{stage.label}</div>
                        <div className="flex-1">
                          <div
                            className={`h-10 bg-gradient-to-r ${stage.color} rounded-md flex items-center justify-center text-sm font-bold transition-all duration-300`}
                            style={{ width: `${stage.width}%` }}
                          >
                            {stage.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Revenue Preview */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Monthly Revenue</div>
                      <div className="text-xl font-bold text-green-400">{fmt(monthlyRevenue)}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Annual Revenue</div>
                      <div className="text-xl font-bold text-green-400">{fmt(monthlyRevenue * 12)}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Deals / Month</div>
                      <div className="text-xl font-bold text-white">{closed}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Revenue / Lead</div>
                      <div className="text-xl font-bold text-indigo-400">{leads > 0 ? fmt(Math.round(monthlyRevenue / leads)) : '$0'}</div>
                    </div>
                  </div>

                  {/* Teaser */}
                  <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                    <p className="text-indigo-300 text-sm">
                      <span className="font-semibold">Increase your monthly revenue</span> by identifying conversion leaks — receive personalized recommendations to boost conversion rates and see compound growth scenarios for your business.
                    </p>
                  </div>
                </div>
              ) : (
                /* Success State */
                <div className="bg-gradient-to-br from-green-50 to-indigo-50 rounded-2xl p-8 border border-green-200">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Report Generated!</h3>
                    <p className="text-gray-600">Your funnel analysis has been sent to <strong>{email}</strong></p>
                  </div>

                  {/* Quick Summary */}
                  {result.summary && (
                    <div className="bg-white rounded-xl p-4 mb-6 space-y-2 border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Revenue</span>
                        <span className="font-bold text-green-600">{fmt(result.summary.monthly_revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Annual Revenue</span>
                        <span className="font-bold text-green-600">{fmt(result.summary.annual_revenue)}</span>
                      </div>
                      {result.summary.total_leak > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Revenue Leaking</span>
                          <span className="font-bold text-red-500">{fmt(result.summary.total_leak)}/mo</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weakest Stage</span>
                        <span className="font-bold text-orange-600">{result.summary.weakest_stage}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Report
                  </button>

                  <div className="mt-4 text-center">
                    <a
                      href="https://cal.com/boltcall"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm underline"
                    >
                      Want help fixing your funnel? Book a free strategy call →
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-4">Trusted by local business owners</p>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-500">Reports Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">$2.4M</div>
              <div className="text-sm text-gray-500">Revenue Leaks Found</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">33%</div>
              <div className="text-sm text-gray-500">Avg Revenue Increase</div>
            </div>
          </div>
        </div>
      </section>

      {/* What is a Funnel Optimizer */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
              What Is a Funnel Optimizer?
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed mb-10">
              <p>
                A funnel optimizer is a tool that maps every stage of your customer acquisition process — from first visit to closed deal — and identifies exactly where you are losing potential revenue. Most local businesses operate with conversion rates far below what is achievable. They spend money on advertising to drive website visitors, then lose the majority of those visitors before they ever become leads. They generate leads and then lose half of them before a quote is requested. They send quotes and fail to follow up consistently, losing deals to competitors who simply stayed in touch.
              </p>
              <p>
                This tool calculates your current funnel metrics and compares them to industry benchmarks for your niche. It then generates a detailed PDF report that identifies your weakest conversion stage — the one where you are leaving the most revenue on the table — and provides specific, actionable recommendations to improve it. Unlike generic marketing advice, the recommendations are personalized to your actual numbers and industry.
              </p>
              <p>
                The output includes a month-over-month revenue projection showing what your business would earn if you improved each conversion rate by just 20% — a realistic and achievable target for most businesses. For many local service companies, even a small improvement in a single funnel stage can mean $5,000 to $30,000 in additional annual revenue without increasing advertising spend.
              </p>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
              Common Funnel Leaks We Find
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  title: 'Slow Lead Response',
                  desc: 'Businesses that respond to a lead within 5 minutes are 21x more likely to convert than those who respond after an hour. Most local businesses take 6 to 24 hours. This single leak can cost 60% of your leads.',
                },
                {
                  title: 'No After-Hours Coverage',
                  desc: '40% of leads contact businesses outside of office hours. Without automated response, those leads reach out to a competitor and book before you call back the next morning.',
                },
                {
                  title: 'Missing Follow-Up Sequences',
                  desc: '80% of sales require 5 or more follow-up contacts. Most businesses give up after one or two attempts, leaving deals that are still on the table — just waiting for someone to ask again.',
                },
                {
                  title: 'Low Quote-to-Close Rate',
                  desc: 'The average local service business closes 25-35% of quotes sent. Top performers close 50-60% by using automated follow-up sequences, social proof, and urgency triggers that keep the conversation alive.',
                },
              ].map((leak) => (
                <div key={leak.title} className="bg-red-50 rounded-xl p-5 border border-red-100">
                  <h3 className="font-bold text-gray-900 mb-2">{leak.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{leak.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want AI to Fix Your Funnel Automatically?</h2>
          <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
            Stop losing revenue to slow response times and leaky funnels. Boltcall's AI receptionist responds within 5 minutes — increasing lead qualification by 21x — so every stage of your funnel converts without hiring more staff.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              See Pricing
            </a>
            <a
              href="https://cal.com/boltcall"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <Target className="w-5 h-5" />
              Book a Strategy Call
            </a>
          </div>
        </div>
      </section>

      {/* Objection Handling */}
      <section id="objections" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Common Questions About Funnel Optimization
        </h2>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Honest answers before you run your numbers.
        </p>
        <div className="space-y-3">
          {[
            {
              q: 'How do I know my funnel has gaps?',
              a: "If you're spending on ads but not seeing proportional revenue growth, you have funnel leaks. The most common: slow lead response and missed after-hours calls.",
            },
            {
              q: 'Can I optimize my funnel without rebuilding it?',
              a: 'Yes. Most funnel improvements come from fixing the response layer — not the top of funnel. Responding faster to existing leads beats getting more leads.',
            },
            {
              q: "What's the biggest funnel mistake local businesses make?",
              a: "Letting leads go to voicemail. 80% of callers who reach voicemail don't leave a message and never call back.",
            },
            {
              q: 'How much of my ad spend is being wasted?',
              a: 'Industry data suggests 35–60% of paid leads are lost due to slow response. Our audit helps you calculate your specific waste number.',
            },
            {
              q: 'How quickly can I see funnel improvements?',
              a: 'Adding AI call answering typically shows results within the first week — you\'ll see more leads converted from the same spend.',
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


      {/* Funnel Optimization Benchmarks Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Local Business Funnel Benchmarks: Average vs. Optimized</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Where local service businesses lose leads — and what top performers do differently</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Funnel Stage</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Average Business</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Optimized with AI</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Key Lever</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Calls answered', '60–70%', '99%+', '24/7 AI call answering'],
                  ['Lead qualified on first call', '45%', '85%+', 'AI qualification script'],
                  ['Appointment booked on first call', '35%', '75%+', 'Live calendar booking'],
                  ['Appointment kept (no-show rate)', '75–82%', '88–92%', 'Automated reminders'],
                  ['Customer leaves a review', '5–10%', '18–25%', 'Post-visit review request SMS'],
                  ['Repeat booking within 6 months', '30%', '55%+', 'Re-engagement SMS sequence'],
                ].map(([stage, avg, opt, lever]) => (
                  <tr key={stage} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{stage}</td>
                    <td className="px-4 py-3 text-red-600">{avg}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{opt}</td>
                    <td className="px-4 py-3 text-gray-600">{lever}</td>
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

export default FunnelOptimizer;
