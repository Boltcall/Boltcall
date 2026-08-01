import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Clock, DollarSign, AlertCircle, Loader, Mail,
  FileText, TrendingDown, CheckCircle2, Loader2,
  Building2, Users,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { useNavigate } from 'react-router-dom';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

// ── Loading step messages ──
const loadingSteps = [
  { icon: Building2, text: 'Personalizing for your company...' },
  { icon: DollarSign, text: 'Calculating your lead waste...' },
  { icon: Clock, text: 'Benchmarking your response time...' },
  { icon: TrendingDown, text: 'Mapping your revenue gap...' },
  { icon: FileText, text: 'Building your custom playbook...' },
  { icon: FileText, text: 'Generating your PDF...' },
];

const WEBHOOK_URL = 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/solar-speed-playbook';

const SolarSpeedToLeadPlaybook: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a speed-to-lead playbook for solar installers?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A speed-to-lead playbook for solar is a step-by-step system for contacting every inbound solar lead within 5 minutes. It covers lead routing, AI phone response, follow-up sequences, and booking automation — designed to maximize the 78% of solar jobs that go to the first company to respond.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast should a solar installer respond to leads?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Solar leads should be contacted within 5 minutes of inquiry. Response time is the #1 predictor of close rate in solar sales. Studies show leads contacted in under 5 minutes are 21x more likely to qualify than those contacted after 30 minutes.',
          },
        },
        {
          '@type': 'Question',
          name: 'What percentage of solar leads are lost to slow response?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Industry data shows 67% of solar leads are lost when the first response takes longer than 5 minutes. Most solar companies average 47 minutes to first contact — meaning the majority of paid leads are never properly engaged.',
          },
        },
      ],
    },
  ]);

  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [monthlyLeads, setMonthlyLeads] = useState('');
  const [costPerLead, setCostPerLead] = useState('');
  const [responseTime, setResponseTime] = useState('');
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState('');

  // Live calculations
  const leads = parseInt(monthlyLeads) || 0;
  const cpl = parseInt(costPerLead) || 0;
  const monthlySpend = leads * cpl;
  const wastedLeads = Math.round(leads * 0.94);
  const wastedMoney = wastedLeads * cpl;
  const recoverableRevenue = Math.round(wastedLeads * 0.15) * 25000; // 15% recoverable at $25K avg deal

  useEffect(() => {
    document.title = 'Free Solar Speed-to-Lead Playbook | Boltcall';
    updateMetaDescription(
      'Get a personalized playbook showing exactly how much revenue your solar company loses from slow lead response — and the 10-second fix to recover it.'
    );

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Solar Speed-to-Lead Playbook", "item": "https://boltcall.org/solar-speed-playbook"}]});
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
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const validateEmail = (emailString: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailString);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Please enter your company name');
      return;
    }
    if (!monthlyLeads.trim() || leads <= 0) {
      setError('Please enter your monthly lead volume');
      return;
    }
    if (!costPerLead.trim() || cpl <= 0) {
      setError('Please enter your average cost per lead');
      return;
    }
    if (!responseTime.trim()) {
      setError('Please select your average response time');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsAnalyzing(true);
    setLoadingStepIndex(0);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          monthly_leads: leads,
          cost_per_lead: cpl,
          response_time: responseTime,
          email: email.trim(),
          // Pre-calculated personalization data
          monthly_spend: monthlySpend,
          wasted_leads: wastedLeads,
          wasted_money: wastedMoney,
          recoverable_revenue: recoverableRevenue,
        }),
      });

      if (!response.ok) throw new Error('Submission failed');

      await new Promise((r) => setTimeout(r, 2500));
      navigate('/solar-speed-playbook/thank-you');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsAnalyzing(false);
    }
  };

  // ── Loading screen ──
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-white">
        <GiveawayBar />
        <Header />
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-center mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-16 h-16 text-blue-600" />
                </motion.div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Building Your Personalized Playbook...
              </h2>
              <p className="text-gray-500 mb-10">
                Crunching {companyName}'s numbers and building your custom report.
              </p>

              <div className="space-y-3 text-left">
                {loadingSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < loadingStepIndex;
                  const isActive = idx === loadingStepIndex;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: idx <= loadingStepIndex ? 1 : 0.3,
                        x: 0,
                      }}
                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200'
                          : isDone
                          ? 'bg-green-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        >
                          <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        </motion.div>
                      ) : (
                        <Icon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          isActive
                            ? 'text-blue-700'
                            : isDone
                            ? 'text-green-700'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
  
      {/* Common Questions */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Common Questions</h2>
          <div className="space-y-5">
            {[
              {
                q: 'Is this playbook really free?',
                a: 'Yes — 100% free. No credit card, no signup required. Download it and use it today.',
              },
              {
                q: 'Do I need Boltcall to use this playbook?',
                a: 'No. The playbook works with any lead response system. It documents the exact speed-to-lead framework that top solar closers use, regardless of their tools.',
              },
              {
                q: 'How quickly should I follow up with a solar lead?',
                a: 'Within 60 seconds if possible. Studies show contacting a lead within 1 minute increases your close rate by up to 391% compared to following up after 30 minutes. Every minute of delay costs conversions.',
              },
              {
                q: 'What if I\'m already using a different AI or CRM?',
                a: 'The playbook complements any existing system. It focuses on process and timing, not specific tools.',
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
      </div>
    );
  }

  // ── Main page ──
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero + Form */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Solar <span className="text-blue-600">Speed-to-Lead</span> Playbook
            </h1>
            <p className="text-lg text-gray-600">
              Reduce lead response time by 50% and increase conversion rates with instant replies — enter your numbers to see exactly how much revenue you can recover.
            </p>
          </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              Get Your Personalized Playbook
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              4 quick inputs — we'll calculate your exact revenue gap
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. SunPower Installs"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* Monthly Leads */}
              <div>
                <label htmlFor="monthly-leads" className="block text-sm font-medium text-gray-700 mb-1.5">
                  How many leads do you get per month?
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    id="monthly-leads"
                    value={monthlyLeads}
                    onChange={(e) => setMonthlyLeads(e.target.value)}
                    placeholder="e.g. 100"
                    min="1"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* Cost Per Lead */}
              <div>
                <label htmlFor="cost-per-lead" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Average cost per lead ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    id="cost-per-lead"
                    value={costPerLead}
                    onChange={(e) => setCostPerLead(e.target.value)}
                    placeholder="e.g. 200"
                    min="1"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              {/* Response Time - Dropdown */}
              <div>
                <label htmlFor="response-time" className="block text-sm font-medium text-gray-700 mb-1.5">
                  How fast do you typically respond to a new lead?
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="response-time"
                    value={responseTime}
                    onChange={(e) => setResponseTime(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base appearance-none bg-white"
                    disabled={isAnalyzing}
                  >
                    <option value="">Select response time...</option>
                    <option value="under_1_min">Under 1 minute</option>
                    <option value="1_to_5_min">1-5 minutes</option>
                    <option value="5_to_30_min">5-30 minutes</option>
                    <option value="30_to_60_min">30-60 minutes</option>
                    <option value="1_to_4_hours">1-4 hours</option>
                    <option value="next_day">Next business day</option>
                    <option value="no_system">No system — whenever we get to it</option>
                  </select>
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="playbook-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="playbook-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@solarcompany.com"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    disabled={isAnalyzing}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Your personalized playbook PDF will be sent here
                </p>
              </div>

              {/* Live Preview - shows when user has entered numbers */}
              {leads > 0 && cpl > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-5"
                >
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Your Revenue Opportunity
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Investment at risk monthly</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${monthlySpend.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Leads lost to slow response</div>
                      <div className="text-lg font-bold text-blue-600">
                        {wastedLeads} leads
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Revenue leaking / month</div>
                      <div className="text-lg font-bold text-blue-600">
                        ${wastedMoney.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Revenue you can recover</div>
                      <div className="text-lg font-bold text-green-600">
                        ${recoverableRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-3 text-center">
                    Faster replies = 50% less response time and more deals closed
                  </p>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isAnalyzing || !companyName.trim() || !monthlyLeads.trim() || !costPerLead.trim() || !responseTime || !email.trim()}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold text-base"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Building Your Playbook...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Get My Free Personalized Playbook
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                Free · No credit card · Personalized PDF in ~5 minutes
              </p>

              {/* Objection handling */}
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-semibold mb-1">Not sure if this applies to your company?</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Solar leads go cold 3x faster than most other industries — the average prospect contacts 3 companies in the first hour. This playbook shows you exactly how to fix that, step by step, with tactics sized for your current lead volume.
                </p>
              </div>
            </form>
          </div>
        </motion.div>
        </div>
      </section>

      {/* Benefit-Focused Bullets */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Get</h2>
          <ul className="space-y-3">
            {[
              "Cut lead response time from 2 hours to 60 seconds",
              "Close 30% more solar deals with instant callback automation",
              "Stop losing prospects to competitors who call back first",
              "Capture every inbound inquiry — even on weekends",
              "Deploy your speed playbook in 24 hours",
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>


      {/* Solar Lead Response Data Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Solar Lead Response Speed: Impact on Close Rate</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How response time affects close rate and revenue for solar sales teams</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Response Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Qualification Rate</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Assessment Booking Rate</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Est. Monthly Revenue Impact</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Under 60 seconds (AI)', '52%', '40%', 'Baseline maximum'],
                  ['1–5 minutes', '38%', '28%', '-32% vs instant'],
                  ['5–30 minutes', '24%', '18%', '-55% vs instant'],
                  ['30 min – 1 hour', '14%', '10%', '-75% vs instant'],
                  ['Same day (hours later)', '8%', '5%', '-87% vs instant'],
                  ['Next business day', '4%', '2%', '-96% vs instant — lead gone'],
                ].map(([time, qual, booking, revenue]) => (
                  <tr key={time} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{time}</td>
                    <td className="px-4 py-3 text-gray-600">{qual}</td>
                    <td className="px-4 py-3 text-gray-600">{booking}</td>
                    <td className="px-4 py-3 text-gray-600">{revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Based on Lead Response Management study data applied to solar industry metrics. Boltcall responds in under 3 seconds.</p>
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

export default SolarSpeedToLeadPlaybook;
