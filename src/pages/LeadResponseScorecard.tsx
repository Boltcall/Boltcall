import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Phone, Clock, TrendingUp, Star } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Stepper, StepperPanel, StepperContent } from '../components/ui/stepper';
import Button from '../components/ui/Button';
import DropdownComponent from '../components/ui/dropdown-01';
import { useNavigate } from 'react-router-dom';

interface ScorecardInputs {
  // Step 1
  industry: string;
  monthlyLeads: number;
  answerRate: string;

  // Step 2
  responseTime: string;
  followUpMethods: string[];

  // Step 3
  avgJobValue: number;
  name: string;
  email: string;
}

const industryOptions = [
  { value: 'Plumber', label: 'Plumber' },
  { value: 'HVAC', label: 'HVAC / Heating & Cooling' },
  { value: 'Dentist', label: 'Dentist / Dental Practice' },
  { value: 'Lawyer', label: 'Lawyer / Law Firm' },
  { value: 'Med Spa', label: 'Med Spa / Aesthetics' },
  { value: 'Roofing', label: 'Roofing' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'Auto Repair', label: 'Auto Repair' },
  { value: 'Chiropractor', label: 'Chiropractor' },
  { value: 'Vet Clinic', label: 'Vet Clinic' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Cleaning Service', label: 'Cleaning Service' },
  { value: 'Other', label: 'Other Local Business' },
];

const answerRateOptions = [
  { value: 'under40', label: 'Under 40% — We miss more than we answer' },
  { value: '40to55', label: '40–55% — Roughly half' },
  { value: '55to70', label: '55–70% — Most, but not all' },
  { value: '70to85', label: '70–85% — Pretty good coverage' },
  { value: 'over85', label: '85%+ — We answer almost everything' },
];

const responseTimeOptions = [
  { value: 'under5', label: 'Under 5 minutes' },
  { value: '5to15', label: '5–15 minutes' },
  { value: '15to60', label: '15–60 minutes' },
  { value: '1to4h', label: '1–4 hours' },
  { value: 'nextday', label: 'Next day or longer' },
];

const followUpChoices = [
  { id: 'phone', label: 'Follow-up phone call' },
  { id: 'sms', label: 'Text / SMS message' },
  { id: 'email', label: 'Email follow-up' },
  { id: 'automated', label: 'Automated system (CRM, etc.)' },
  { id: 'none', label: "We usually don't follow up" },
];

// Score helpers
const answerRateToNumeric = (val: string): number => {
  const map: Record<string, number> = {
    under40: 20, '40to55': 47, '55to70': 62, '70to85': 77, over85: 92,
  };
  return map[val] ?? 50;
};

export const answerRateToScore = (val: string): number => {
  const map: Record<string, number> = {
    under40: 5, '40to55': 35, '55to70': 60, '70to85': 82, over85: 100,
  };
  return map[val] ?? 50;
};

export const responseTimeToScore = (val: string): number => {
  const map: Record<string, number> = {
    under5: 100, '5to15': 72, '15to60': 44, '1to4h': 18, nextday: 5,
  };
  return map[val] ?? 50;
};

export const responseTimeToBookRate = (val: string): number => {
  const map: Record<string, number> = {
    under5: 0.73, '5to15': 0.45, '15to60': 0.2, '1to4h': 0.1, nextday: 0.04,
  };
  return map[val] ?? 0.2;
};

export const calcRecoveryScore = (methods: string[]): number => {
  if (methods.includes('none')) return 5;
  const hasPhone = methods.includes('phone');
  const hasDigital = methods.includes('sms') || methods.includes('email');
  const hasAutomated = methods.includes('automated');
  if (hasPhone && hasDigital && hasAutomated) return 95;
  if (hasPhone && hasDigital) return 75;
  if (hasPhone || hasDigital) return 50;
  return 30;
};

export const scoreToGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

export const gradeBg: Record<string, string> = {
  A: 'bg-green-50 border-green-200',
  B: 'bg-blue-50 border-blue-200',
  C: 'bg-yellow-50 border-yellow-200',
  D: 'bg-orange-50 border-orange-200',
  F: 'bg-red-50 border-red-200',
};

export const gradeColors: Record<string, string> = {
  A: 'text-green-600',
  B: 'text-blue-600',
  C: 'text-yellow-500',
  D: 'text-orange-500',
  F: 'text-red-600',
};

export interface ScorecardResults {
  inputs: ScorecardInputs;
  answerRateScore: number;
  responseScore: number;
  recoveryScore: number;
  overallScore: number;
  overallGrade: string;
  revenueAtRisk: number;
  answerRateNumeric: number;
}

const LeadResponseScorecard: React.FC = () => {
  useEffect(() => {
    document.title = 'Lead Response Scorecard: Free Grade for Local Service Businesses | Boltcall';
    updateMetaDescription(
      "Get your free lead response grade in 60 seconds. See your answer rate score, response speed score, and how much revenue you're losing. For plumbers, HVAC, dentists & more."
    );

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/lead-response-scorecard';

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Lead Response Scorecard', item: 'https://boltcall.org/lead-response-scorecard' },
      ],
    });
    document.head.appendChild(breadcrumbScript);

    const toolScript = document.createElement('script');
    toolScript.type = 'application/ld+json';
    toolScript.id = 'tool-schema';
    toolScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Lead Response Scorecard',
      url: 'https://boltcall.org/lead-response-scorecard',
      description: 'Free tool that grades your lead response system and calculates monthly revenue at risk.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
    });
    document.head.appendChild(toolScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('tool-schema')?.remove();
      document.querySelector("link[rel='canonical']")?.remove();
    };
  }, []);

  const [surveyStarted, setSurveyStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [inputs, setInputs] = useState<ScorecardInputs>({
    industry: '',
    monthlyLeads: 80,
    answerRate: '',
    responseTime: '',
    followUpMethods: [],
    avgJobValue: 350,
    name: '',
    email: '',
  });

  const handleInputChange = (field: keyof ScorecardInputs, value: string | number | string[]) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const toggleFollowUp = (id: string) => {
    setInputs(prev => {
      const current = prev.followUpMethods;
      if (id === 'none') {
        return { ...prev, followUpMethods: current.includes('none') ? [] : ['none'] };
      }
      const withoutNone = current.filter(m => m !== 'none');
      if (withoutNone.includes(id)) {
        return { ...prev, followUpMethods: withoutNone.filter(m => m !== id) };
      }
      return { ...prev, followUpMethods: [...withoutNone, id] };
    });
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!inputs.industry || !inputs.answerRate || inputs.monthlyLeads <= 0) {
        alert('Please fill in all fields before continuing.');
        return false;
      }
    } else if (step === 2) {
      if (!inputs.responseTime || inputs.followUpMethods.length === 0) {
        alert('Please answer all questions before continuing.');
        return false;
      }
    } else if (step === 3) {
      if (!inputs.name.trim() || !inputs.email.trim() || inputs.avgJobValue <= 0) {
        alert('Please fill in all fields to get your score.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputs.email)) {
        alert('Please enter a valid email address.');
        return false;
      }
    }
    return true;
  };

  const calculateResults = (): ScorecardResults => {
    const answerScore = answerRateToScore(inputs.answerRate);
    const responseScore = responseTimeToScore(inputs.responseTime);
    const recoveryScore = calcRecoveryScore(inputs.followUpMethods);
    const overallScore = Math.round(answerScore * 0.4 + responseScore * 0.4 + recoveryScore * 0.2);
    const grade = scoreToGrade(overallScore);

    const answerRateNumeric = answerRateToNumeric(inputs.answerRate);
    const currentBookRate = responseTimeToBookRate(inputs.responseTime);
    const bestBookRate = 0.73;
    const leads = inputs.monthlyLeads;
    const jobValue = inputs.avgJobValue;

    const missedLeads = leads * (1 - answerRateNumeric / 100);
    const missedRevenue = missedLeads * bestBookRate * jobValue;
    const answeredLeads = leads * (answerRateNumeric / 100);
    const responseDelayLoss = answeredLeads * (bestBookRate - Math.min(currentBookRate, bestBookRate)) * jobValue;
    const revenueAtRisk = Math.round(missedRevenue + responseDelayLoss);

    return {
      inputs,
      answerRateScore: answerScore,
      responseScore,
      recoveryScore,
      overallScore,
      overallGrade: grade,
      revenueAtRisk,
      answerRateNumeric,
    };
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsLoading(true);

      const results = calculateResults();

      // Fire n8n webhook (non-blocking)
      fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inputs.name,
          email: inputs.email,
          source: 'lead-response-scorecard',
          industry: inputs.industry,
          monthlyLeads: inputs.monthlyLeads,
          answerRate: inputs.answerRate,
          responseTime: inputs.responseTime,
          followUpMethods: inputs.followUpMethods.join(', '),
          avgJobValue: inputs.avgJobValue,
          overallGrade: results.overallGrade,
          revenueAtRisk: results.revenueAtRisk,
        }),
      }).catch(() => {});

      await new Promise(resolve => setTimeout(resolve, 2200));

      localStorage.setItem('leadResponseScorecardResults', JSON.stringify(results));
      navigate('/lead-response-scorecard/results');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const stepLabels = ['Your Business', 'Response Speed', 'Get Your Score'];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* Hero */}
        {!surveyStarted ? (
          <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                  <Star className="w-4 h-4" />
                  Free Tool — Results in 60 Seconds
                </div>

                <h1 className="text-[33px] md:text-[42px] lg:text-[54px] font-bold text-gray-900 mb-6 leading-tight">
                  What's Your Lead Response <span className="text-blue-600">Score?</span>
                </h1>

                <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed">
                  Answer 8 quick questions. Get your grade — and see how much revenue you're leaving on the table every month.
                </p>

                <p className="text-base text-gray-500 mb-10 max-w-xl mx-auto">
                  For plumbers, HVAC, dentists, lawyers, med spas, and every local service business.
                </p>

                <Button
                  onClick={() => setSurveyStarted(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg font-bold text-lg shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-transform"
                >
                  Get My Free Score
                </Button>

                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                  {[
                    '100% Free',
                    'No credit card',
                    'Takes under 60 seconds',
                    'Your data is never sold',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Preview cards */}
            <div className="max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <Phone className="w-5 h-5 text-blue-600" />, label: 'Answer Rate Score', desc: 'How many leads actually reach you' },
                { icon: <Clock className="w-5 h-5 text-blue-600" />, label: 'Response Speed Score', desc: 'How fast you follow up vs. benchmarks' },
                { icon: <TrendingUp className="w-5 h-5 text-blue-600" />, label: 'Revenue at Risk', desc: 'Dollars slipping away every month' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
                  <div className="flex justify-center mb-2">{item.icon}</div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            {/* Progress */}
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {stepLabels.map((label, i) => (
                    <div key={label} className={`text-center ${currentStep >= i + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className="text-sm font-bold mb-1">{i + 1}</div>
                      <div className="text-sm font-medium">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700">Step {currentStep} of 3</span>
                  <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <motion.div
                    className="bg-blue-600 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </section>

            {/* Loading */}
            {isLoading && (
              <section className="py-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 className="w-16 h-16 text-blue-600" />
                      </motion.div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Grading Your Lead Response System...</h2>
                    <p className="text-gray-500">Comparing against 500+ local service businesses</p>
                    <div className="flex justify-center gap-2 pt-2">
                      {[0, 0.2, 0.4].map(delay => (
                        <motion.div
                          key={delay}
                          className="w-2 h-2 bg-blue-600 rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </section>
            )}

            {/* Form */}
            {!isLoading && (
              <section className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                  <Stepper
                    defaultValue={currentStep}
                    value={currentStep}
                    onValueChange={setCurrentStep}
                    orientation="vertical"
                  >
                    <StepperPanel>
                      {/* Step 1 */}
                      <StepperContent value={1}>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Business</h3>
                          <p className="text-gray-500 mb-6 text-sm">Tell us about your business so we can benchmark against your industry.</p>
                          <div className="space-y-6">
                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                What type of business do you run?
                              </label>
                              <div className="max-w-md">
                                <DropdownComponent
                                  options={industryOptions}
                                  value={inputs.industry}
                                  onChange={val => handleInputChange('industry', val)}
                                  placeholder="Select your industry"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                How many inbound calls or leads do you receive per month?
                              </label>
                              <div className="max-w-xs">
                                <input
                                  type="number"
                                  value={inputs.monthlyLeads}
                                  onChange={e => handleInputChange('monthlyLeads', parseInt(e.target.value) || 0)}
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                What percentage of those calls/leads do you actually answer or respond to?
                              </label>
                              <div className="max-w-md">
                                <DropdownComponent
                                  options={answerRateOptions}
                                  value={inputs.answerRate}
                                  onChange={val => handleInputChange('answerRate', val)}
                                  placeholder="Select your answer rate"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </StepperContent>

                      {/* Step 2 */}
                      <StepperContent value={2}>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Response Speed</h3>
                          <p className="text-gray-500 mb-6 text-sm">Speed is the #1 factor in whether a lead books with you or your competitor.</p>
                          <div className="space-y-6">
                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                How long does it take your team to respond to a new lead?
                              </label>
                              <div className="max-w-md">
                                <DropdownComponent
                                  options={responseTimeOptions}
                                  value={inputs.responseTime}
                                  onChange={val => handleInputChange('responseTime', val)}
                                  placeholder="Select your response time"
                                  required
                                />
                              </div>
                              {inputs.responseTime && inputs.responseTime !== 'under5' && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                >
                                  <p className="text-xs text-orange-700 font-medium">
                                    Benchmark: Responding within 5 minutes = 73% booking rate. Waiting{' '}
                                    {inputs.responseTime === '5to15' ? '5–15 min = 45%' :
                                      inputs.responseTime === '15to60' ? '15–60 min = 20%' :
                                        inputs.responseTime === '1to4h' ? '1–4 hours = 10%' :
                                          'until next day = just 4%'}.
                                  </p>
                                </motion.div>
                              )}
                            </div>

                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                How do you follow up with leads who don't book on first contact? (Select all that apply)
                              </label>
                              <div className="space-y-3 max-w-md">
                                {followUpChoices.map(choice => (
                                  <label key={choice.id} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={inputs.followUpMethods.includes(choice.id)}
                                      onChange={() => toggleFollowUp(choice.id)}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{choice.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </StepperContent>

                      {/* Step 3 */}
                      <StepperContent value={3}>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your Score</h3>
                          <p className="text-gray-500 mb-6 text-sm">One last step — we need your job value to calculate your revenue at risk, and your email to send you the full report.</p>
                          <div className="space-y-5">
                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-2">
                                What is your average job or appointment value? ($)
                              </label>
                              <p className="text-xs text-gray-500 mb-3">E.g. average invoice, appointment fee, or first job value</p>
                              <div className="max-w-xs">
                                <input
                                  type="number"
                                  value={inputs.avgJobValue}
                                  onChange={e => handleInputChange('avgJobValue', parseFloat(e.target.value) || 0)}
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-3">
                                Your first name
                              </label>
                              <div className="max-w-xs">
                                <input
                                  type="text"
                                  value={inputs.name}
                                  onChange={e => handleInputChange('name', e.target.value)}
                                  placeholder="e.g. James"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-base font-semibold text-gray-900 mb-1">
                                Business email
                              </label>
                              <p className="text-xs text-gray-500 mb-3">We'll send your full scorecard report here.</p>
                              <div className="max-w-sm">
                                <input
                                  type="email"
                                  value={inputs.email}
                                  onChange={e => handleInputChange('email', e.target.value)}
                                  placeholder="you@yourbusiness.com"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            <p className="text-xs text-gray-400">
                              No spam. No sales pressure. Your data is never sold or shared.
                            </p>
                          </div>
                        </div>
                      </StepperContent>
                    </StepperPanel>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                      <Button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        variant="outline"
                        className="px-6 py-3"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-[4px_4px_0px_0px_#000]"
                        style={{ transition: 'none' }}
                      >
                        {currentStep === 3 ? 'Get My Score' : 'Next'}
                      </Button>
                    </div>
                  </Stepper>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* How It Works */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How the Lead Response Scorecard Works</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              The scorecard grades your business across three dimensions: your call answer rate, your response speed, and your lead recovery system. Each area is weighted based on its impact on revenue — answer rate and response time each account for 40% of your score, while your follow-up recovery system accounts for the remaining 20%.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Your "Revenue at Risk" figure is calculated using industry-verified booking rate benchmarks. Businesses that respond to leads within 5 minutes book 73% of them. Businesses that wait an hour book fewer than 1 in 5. The difference between your current response behavior and the 5-minute benchmark — multiplied by your job value and monthly lead volume — is your monthly revenue at risk.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Your results are benchmarked against real performance data from local service businesses across plumbing, HVAC, dental, legal, and home services. An A grade means your lead response system is best-in-class. An F means you are likely losing the majority of leads you generate to competitors who answer faster.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Lead Response Speed Matters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { stat: '78%', desc: 'of jobs go to the first business that responds' },
              { stat: '73%', desc: 'booking rate when you respond in under 5 minutes' },
              { stat: '8x', desc: 'more likely to qualify the lead with a 5-min response vs. 30 min' },
              { stat: '62%', desc: 'of calls to local service businesses go unanswered' },
            ].map(item => (
              <div key={item.stat} className="bg-blue-50 rounded-xl border border-blue-100 p-5 flex items-start gap-4">
                <div className="text-3xl font-bold text-blue-600 flex-shrink-0">{item.stat}</div>
                <p className="text-sm text-gray-700 leading-snug pt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grade scale */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Understanding Your Grade</h2>
          <p className="text-gray-500 mb-6 text-sm">Here's what each grade means for your business.</p>
          <div className="space-y-3">
            {[
              { grade: 'A', range: '85–100', title: 'Best in Class', desc: 'You answer fast, respond instantly, and follow up with multiple touchpoints. You are likely winning the majority of leads you touch.' },
              { grade: 'B', range: '70–84', title: 'Above Average', desc: 'Strong performance overall with 1–2 gaps — likely response speed or follow-up automation — that are costing you some deals.' },
              { grade: 'C', range: '55–69', title: 'Average', desc: 'You answer most calls but your response speed or follow-up is inconsistent. You are losing a meaningful percentage of leads to faster competitors.' },
              { grade: 'D', range: '40–54', title: 'Below Average', desc: 'Significant revenue is slipping through the cracks. You may be answering less than half of calls or taking hours to respond.' },
              { grade: 'F', range: '0–39', title: 'At Risk', desc: 'Your lead response system has major gaps. The majority of leads you generate are likely going to competitors who are faster.' },
            ].map(item => (
              <div key={item.grade} className={`flex gap-5 rounded-xl border p-4 ${gradeBg[item.grade]}`}>
                <div className={`text-3xl font-black flex-shrink-0 w-10 text-center ${gradeColors[item.grade]}`}>{item.grade}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title} <span className="text-gray-400 font-normal">({item.range})</span></p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LeadResponseScorecard;
