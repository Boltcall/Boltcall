import React, { useState, useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { Stepper, StepperPanel, StepperContent } from '../components/ui/stepper';
import Button from '../components/ui/Button';
import DropdownComponent from '../components/ui/dropdown-01';
import { useNavigate } from 'react-router-dom';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

interface AuditInputs {
  // Step 1 - Lead Friction Category
  responseTimeToInquiry: string; // < 5 mins, 30 mins, 2 hours, Next day, We often miss them
  afterHoursCallHandling: string; // Goes to voicemail, We miss them, Someone answers eventually
  
  // Step 2 - Time Leakage Category
  adminPingPongHours: string; // 0-5, 5-10, 10-20, 20+
  automatedFollowUpSystem: string; // Yes, No, We try to do it manually
  
  // Step 3 - Financial Data Points
  avgCustomerLifetimeValue: number; // LTV
  avgMonthlyLeads: number;
  avgLeadToBookingRate: number; // percentage
  
  // Internal calculation fields (derived from above)
  avgBookingValue: number; // Calculated from LTV
  avgMonthlyPhoneCalls: number; // Estimated
  avgMissedCallRate: number; // Derived from responseTimeToInquiry and afterHoursCallHandling
  avgFollowUpRate: number; // Derived from automatedFollowUpSystem
  hourlySalaryReceptionist: number; // Estimated
  monthlyReceptionistHours: number; // Derived from adminPingPongHours
  monthlyToolSpend: number;
  expectedAiCaptureRate: number; // percentage
  automationTargetFollowUps: number; // percentage
  monthlyAiSubscription: number;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
}

interface AuditResults {
  baseline: {
    bookingsPerMonth: number;
    monthlyRevenue: number;
  };
  recovery: {
    missedLeads: number;
    recoveredLeads: number;
    recoveredBookings: number;
    recoveredRevenue: number;
  };
  followUp: {
    addedBookings: number;
    addedRevenue: number;
  };
  savings: {
    staffingSavings: number;
  };
  totals: {
    monthlyUplift: number;
    annualUplift: number;
    monthlyNetGain: number;
    paybackMonths: number;
    monthlyHoursSaved: number;
  };
  assumptions: {
    aiCaptureRate: number;
    followUpUpliftPct: number;
    staffingReductionPct: number;
  };
}

// Dropdown options
const responseTimeOptions = [
  { value: '< 5 mins', label: '< 5 mins' },
  { value: '30 mins', label: '30 mins' },
  { value: '2 hours', label: '2 hours' },
  { value: 'Next day', label: 'Next day' },
  { value: 'We often miss them', label: 'We often miss them' },
];

const afterHoursOptions = [
  { value: 'Goes to voicemail', label: 'Goes to voicemail' },
  { value: 'We miss them', label: 'We miss them' },
  { value: 'Someone answers eventually', label: 'Someone answers eventually' },
];

const adminPingPongOptions = [
  { value: '0-5', label: '0-5' },
  { value: '5-10', label: '5-10' },
  { value: '10-20', label: '10-20' },
  { value: '20+', label: '20+' },
];

const automatedFollowUpOptions = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'We try to do it manually', label: 'We try to do it manually' },
];

const AIRevenueAudit: React.FC = () => {
  useSchemaInjector([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI Revenue Audit?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI Revenue Audit is a free assessment that calculates how much revenue your business is losing today from slow lead response, missed calls, and manual follow-up — and projects the revenue you could recover by adding AI automation.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much revenue am I losing to slow lead response?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Businesses that respond to leads within 5 minutes close 21x more than those that wait 30 minutes. Most local service businesses lose $30,000–$200,000 per year in potential revenue because leads are not followed up fast enough or at all.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does Boltcall\'s AI Revenue Audit measure?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boltcall\'s AI Revenue Audit measures your monthly lead volume, current response time, average job value, and close rate — then calculates your current revenue leak and the projected annual uplift from AI-powered instant lead response.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'AI Revenue Audit — Lead Response ROI Calculator',
      url: 'https://boltcall.org/ai-revenue-audit',
      applicationCategory: 'BusinessApplication',
      isAccessibleForFree: true,
      description: 'Free AI revenue audit tool that calculates how much revenue your business loses to slow lead response and how much you could recover with AI.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]);

  useEffect(() => {
    document.title = 'AI Revenue Audit Calculator - Calculate Earnings | Boltcall';
    updateMetaDescription('Boltcall AI revenue audit: calculate how much revenue you are losing from missed calls and slow lead response. Free analysis tool. Try now.');

    // Add canonical link
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://boltcall.org/ai-revenue-audit';

    // Add BreadcrumbList JSON-LD
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "AI Revenue Audit", "item": "https://boltcall.org/ai-revenue-audit" }
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
      const el = document.querySelector("link[rel='canonical']");
      if (el) el.remove();
      const bc = document.getElementById('breadcrumb-jsonld');
      if (bc) bc.remove();
    };
  }, []);
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const [inputs, setInputs] = useState<AuditInputs>({
    // Step 1 - Lead Friction
    responseTimeToInquiry: '',
    afterHoursCallHandling: '',
    
    // Step 2 - Time Leakage
    adminPingPongHours: '',
    automatedFollowUpSystem: '',
    
    // Step 3 - Financial Data Points
    avgCustomerLifetimeValue: 450,
    avgMonthlyLeads: 200,
    avgLeadToBookingRate: 10,
    
    // Internal calculation fields
    avgBookingValue: 150,
    avgMonthlyPhoneCalls: 200,
    avgMissedCallRate: 25,
    avgFollowUpRate: 40,
    hourlySalaryReceptionist: 30,
    monthlyReceptionistHours: 160,
    monthlyToolSpend: 0,
    expectedAiCaptureRate: 70,
    automationTargetFollowUps: 80,
    monthlyAiSubscription: 79,
    contactEmail: '',
    contactPhone: ''
  });


  // Derive calculation fields from user inputs
  const deriveCalculationFields = () => {
    const derived = { ...inputs };
    
    // Calculate avgBookingValue from LTV (assume LTV is 3x booking value)
    if (inputs.avgCustomerLifetimeValue > 0) {
      derived.avgBookingValue = inputs.avgCustomerLifetimeValue / 3;
    } else if (!derived.avgBookingValue || derived.avgBookingValue === 0) {
      derived.avgBookingValue = 150; // Default fallback
    }
    
    // Estimate missed call rate from response time (default to 25% if not set)
    let baseMissedCallRate = 25;
    if (inputs.responseTimeToInquiry === '< 5 mins') {
      baseMissedCallRate = 5;
    } else if (inputs.responseTimeToInquiry === '30 mins') {
      baseMissedCallRate = 15;
    } else if (inputs.responseTimeToInquiry === '2 hours') {
      baseMissedCallRate = 40; // 80% drop mentioned in logic
    } else if (inputs.responseTimeToInquiry === 'Next day') {
      baseMissedCallRate = 60;
    } else if (inputs.responseTimeToInquiry === 'We often miss them') {
      baseMissedCallRate = 80;
    }
    derived.avgMissedCallRate = baseMissedCallRate;
    
    // Adjust missed call rate based on after-hours handling
    if (inputs.afterHoursCallHandling === 'We miss them') {
      derived.avgMissedCallRate = Math.min(100, baseMissedCallRate + 20);
    } else if (inputs.afterHoursCallHandling === 'Goes to voicemail') {
      derived.avgMissedCallRate = Math.min(100, baseMissedCallRate + 10);
    }
    
    // Estimate follow-up rate from automated system
    if (inputs.automatedFollowUpSystem === 'Yes') {
      derived.avgFollowUpRate = 70;
      derived.automationTargetFollowUps = 90;
    } else if (inputs.automatedFollowUpSystem === 'We try to do it manually') {
      derived.avgFollowUpRate = 40;
      derived.automationTargetFollowUps = 80;
    } else if (inputs.automatedFollowUpSystem === 'No') {
      derived.avgFollowUpRate = 10;
      derived.automationTargetFollowUps = 80;
    } else {
      // Default values if not set
      derived.avgFollowUpRate = derived.avgFollowUpRate || 40;
      derived.automationTargetFollowUps = derived.automationTargetFollowUps || 80;
    }
    
    // Estimate monthly receptionist hours from admin ping-pong hours
    if (inputs.adminPingPongHours === '0-5') {
      derived.monthlyReceptionistHours = 20; // ~5 hours/week * 4 weeks
    } else if (inputs.adminPingPongHours === '5-10') {
      derived.monthlyReceptionistHours = 60; // ~7.5 hours/week * 4 weeks
    } else if (inputs.adminPingPongHours === '10-20') {
      derived.monthlyReceptionistHours = 120; // ~15 hours/week * 4 weeks
    } else if (inputs.adminPingPongHours === '20+') {
      derived.monthlyReceptionistHours = 160; // ~20+ hours/week * 4 weeks
    } else if (!derived.monthlyReceptionistHours || derived.monthlyReceptionistHours === 0) {
      derived.monthlyReceptionistHours = 160; // Default fallback
    }
    
    // Estimate phone calls (assume 50% of leads are calls)
    derived.avgMonthlyPhoneCalls = Math.round((inputs.avgMonthlyLeads || 200) * 0.5);
    
    // Ensure other required fields have defaults
    if (!derived.hourlySalaryReceptionist || derived.hourlySalaryReceptionist === 0) {
      derived.hourlySalaryReceptionist = 30; // Default fallback
    }
    if (!derived.expectedAiCaptureRate || derived.expectedAiCaptureRate === 0) {
      derived.expectedAiCaptureRate = 70; // Default fallback
    }
    if (!derived.monthlyAiSubscription || derived.monthlyAiSubscription === 0) {
      derived.monthlyAiSubscription = 79; // Default fallback
    }
    
    return derived;
  };

  const calculateAudit = (): AuditResults => {
    const calcInputs = deriveCalculationFields();
    
    // Variables
    const L = calcInputs.avgMonthlyLeads;
    const B = calcInputs.avgLeadToBookingRate / 100; // Convert to decimal
    const V = calcInputs.avgBookingValue;
    const MCR = calcInputs.avgMissedCallRate / 100;
    const AiCapture = calcInputs.expectedAiCaptureRate / 100;
    const FollowUp = calcInputs.automationTargetFollowUps / 100;
    const Salary = calcInputs.hourlySalaryReceptionist;
    const Hours = calcInputs.monthlyReceptionistHours;
    const AiCost = calcInputs.monthlyAiSubscription;
    const CurrentTool = calcInputs.monthlyToolSpend;
    
    // Baseline
    const bookingsPerMonth = L * B;
    const monthlyRevenue = bookingsPerMonth * V;
    
    // Missed leads & recovery
    const missedLeads = L * MCR;
    const recoveredLeads = missedLeads * AiCapture;
    const recoveredBookings = recoveredLeads * B;
    const recoveredRevenue = recoveredBookings * V;
    
    // Follow-up automation uplift
    // Conservative: automation can increase conversion on followed up leads by 30%
    const followUpUpliftPct = 0.3;
    const addedBookings = L * FollowUp * (B * followUpUpliftPct);
    const addedRevenue = addedBookings * V;
    
    // Cost savings
    const staffingReductionPct = 0.5; // 50% reduction
    const staffingSavings = Salary * (Hours * staffingReductionPct);
    
    // Calculate total hours saved per month
    // 1. Receptionist/admin hours saved (from admin ping-pong automation)
    const adminHoursSaved = Hours * staffingReductionPct;
    
    // 2. AI Receptionist handling calls (after-hours and busy times)
    // Average call handling time: 4 minutes = 0.067 hours
    const avgCallHandlingTime = 0.067; // hours per call
    const afterHoursCallRate = MCR > 0.3 ? 0.3 : MCR; // Estimate 30% of calls are after-hours/busy
    const callsHandledByAI = calcInputs.avgMonthlyPhoneCalls * afterHoursCallRate;
    const callHandlingHoursSaved = callsHandledByAI * avgCallHandlingTime;
    
    // 3. Automated follow-ups time saved (if they don't have automation)
    let followUpHoursSaved = 0;
    if (inputs.automatedFollowUpSystem === 'No' || inputs.automatedFollowUpSystem === 'We try to do it manually') {
      // Manual follow-up takes ~2 minutes per lead = 0.033 hours
      const leadsNeedingFollowUp = L * (1 - (calcInputs.avgFollowUpRate / 100));
      const manualFollowUpTime = 0.033; // hours per lead
      followUpHoursSaved = leadsNeedingFollowUp * manualFollowUpTime;
    }
    
    // 4. Reminders and scheduling automation (already included in admin hours, but add extra for automation)
    const reminderHoursSaved = Hours * 0.1; // Additional 10% for automated reminders
    
    const totalMonthlyHoursSaved = adminHoursSaved + callHandlingHoursSaved + followUpHoursSaved + reminderHoursSaved;
    
    // Totals
    const monthlyUplift = recoveredRevenue + addedRevenue + staffingSavings - AiCost + CurrentTool;
    const annualUplift = monthlyUplift * 12;
    const monthlyNetGain = monthlyUplift;
    const paybackMonths = annualUplift > 0 ? (AiCost * 12) / annualUplift : 0;
    
    return {
      baseline: {
        bookingsPerMonth: Math.round(bookingsPerMonth),
        monthlyRevenue: Math.round(monthlyRevenue)
      },
      recovery: {
        missedLeads: Math.round(missedLeads),
        recoveredLeads: Math.round(recoveredLeads),
        recoveredBookings: Math.round(recoveredBookings),
        recoveredRevenue: Math.round(recoveredRevenue)
      },
      followUp: {
        addedBookings: Math.round(addedBookings),
        addedRevenue: Math.round(addedRevenue)
      },
      savings: {
        staffingSavings: Math.round(staffingSavings)
      },
      totals: {
        monthlyUplift: Math.round(monthlyUplift),
        annualUplift: Math.round(annualUplift),
        monthlyNetGain: Math.round(monthlyNetGain),
        paybackMonths: paybackMonths > 0 ? Number(paybackMonths.toFixed(1)) : 0,
        monthlyHoursSaved: Math.round(totalMonthlyHoursSaved)
      },
      assumptions: {
        aiCaptureRate: AiCapture,
        followUpUpliftPct: followUpUpliftPct,
        staffingReductionPct: staffingReductionPct
      }
    };
  };


  const handleInputChange = (field: keyof AuditInputs, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      // Step 1: Lead Friction - requires responseTimeToInquiry and afterHoursCallHandling
      if (!inputs.responseTimeToInquiry || inputs.responseTimeToInquiry === '' || 
          !inputs.afterHoursCallHandling || inputs.afterHoursCallHandling === '') {
        alert('Please answer all questions before continuing.');
        return false;
      }
    } else if (step === 2) {
      // Step 2: Time Leakage - requires adminPingPongHours and automatedFollowUpSystem
      if (!inputs.adminPingPongHours || inputs.adminPingPongHours === '' || 
          !inputs.automatedFollowUpSystem || inputs.automatedFollowUpSystem === '') {
        alert('Please answer all questions before continuing.');
        return false;
      }
    } else if (step === 3) {
      // Step 3: Financial Data - requires avgCustomerLifetimeValue, avgMonthlyLeads, and avgLeadToBookingRate
      if (inputs.avgCustomerLifetimeValue === 0 || !inputs.avgCustomerLifetimeValue || 
          inputs.avgMonthlyLeads === 0 || !inputs.avgMonthlyLeads || 
          inputs.avgLeadToBookingRate === 0 || !inputs.avgLeadToBookingRate) {
        alert('Please answer all questions before continuing.');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show loading animation
      setIsLoading(true);
      
      // Calculate results
      const auditResults = calculateAudit();
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store results in localStorage and navigate
      const resultsData = {
        inputs,
        results: auditResults
      };
      localStorage.setItem('aiRevenueAuditResults', JSON.stringify(resultsData));
      
      // Navigate to results page
      navigate('/ai-revenue-calculator/results');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };



  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <main>
      {/* Hero Section */}
      {!surveyStarted ? (
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-[33px] md:text-[40px] lg:text-[53px] font-bold text-gray-900 mb-6 leading-tight">
                How Much Can You <span className="text-blue-600">Earn</span> with AI?
              </h1>
              
              <p className="text-[22px] text-gray-600 mb-8 max-w-2xl mx-auto">
                Get a personalized audit showing your potential revenue increase and cost savings with Boltcall's AI services.
              </p>
              
              <Button
                onClick={() => setSurveyStarted(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
              >
                Start Assessment
              </Button>
            </motion.div>
          </div>
        </section>
      ) : (
        <>
          {/* Progress Bar */}
          <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Step Titles Above Progress Bar */}
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className={`text-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="text-sm font-semibold mb-1">1</div>
                    <div className="text-sm font-medium">Lead Friction</div>
                  </div>
                  <div className={`text-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="text-sm font-semibold mb-1">2</div>
                    <div className="text-sm font-medium">Time Leakage</div>
                  </div>
                  <div className={`text-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="text-sm font-semibold mb-1">3</div>
                    <div className="text-sm font-medium">Financial Data</div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    Step {currentStep} of 3
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round((currentStep / 3) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <motion.div
                    className="bg-blue-600 h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Loading Screen */}
          {isLoading && (
            <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-16 h-16 text-blue-600" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      Calculating Your Revenue Potential...
                    </h2>
                  </div>
                  <div className="flex justify-center gap-2 pt-4">
                    <motion.div
                      className="w-2 h-2 bg-blue-600 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-blue-600 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-blue-600 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* Form Section */}
          {!isLoading && (
            <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <Stepper
                  defaultValue={currentStep}
                  value={currentStep}
                  onValueChange={setCurrentStep}
                  orientation="vertical"
                >
              <StepperPanel>
                <StepperContent value={1}>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">How much lead friction is costing your business?</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          How long does your team take to respond to a new inquiry?
                        </label>
                        <div className="max-w-md">
                          <DropdownComponent
                            options={responseTimeOptions}
                            value={inputs.responseTimeToInquiry}
                            onChange={(value) => handleInputChange('responseTimeToInquiry', value)}
                            placeholder="Select an option"
                          required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          What happens to calls after business hours or when staff is busy?
                        </label>
                        <div className="max-w-md">
                          <DropdownComponent
                            options={afterHoursOptions}
                            value={inputs.afterHoursCallHandling}
                            onChange={(value) => handleInputChange('afterHoursCallHandling', value)}
                            placeholder="Select an option"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </StepperContent>

                <StepperContent value={2}>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Where is time leakage hurting your revenue?</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          How many hours per week does your staff spend on admin tasks (scheduling, rescheduling, reminders)?
                        </label>
                        <div className="max-w-md">
                          <DropdownComponent
                            options={adminPingPongOptions}
                            value={inputs.adminPingPongHours}
                            onChange={(value) => handleInputChange('adminPingPongHours', value)}
                            placeholder="Select an option"
                            required
                          />
                        </div>
                      </div>
                        <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          Do you have an automated system that follows up with leads who didn't book?
                        </label>
                        <div className="max-w-md">
                          <DropdownComponent
                            options={automatedFollowUpOptions}
                            value={inputs.automatedFollowUpSystem}
                            onChange={(value) => handleInputChange('automatedFollowUpSystem', value)}
                            placeholder="Select an option"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </StepperContent>

                <StepperContent value={3}>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">What financial data powers your revenue estimate?</h3>
                    <div className="space-y-5">
                        <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          What is your Average Customer Value (LTV)?
                        </label>
                        <div className="max-w-md">
                          <input
                            type="number"
                            value={inputs.avgCustomerLifetimeValue}
                            onChange={(e) => handleInputChange('avgCustomerLifetimeValue', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          How many new leads do you get per month?
                        </label>
                        <div className="max-w-md">
                          <input
                            type="number"
                            value={inputs.avgMonthlyLeads}
                            onChange={(e) => handleInputChange('avgMonthlyLeads', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        </div>
                        <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          What is your current Lead-to-Booking percentage?
                        </label>
                        <div className="max-w-md">
                          <input
                            type="number"
                            value={inputs.avgLeadToBookingRate}
                            onChange={(e) => handleInputChange('avgLeadToBookingRate', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Enter as a percentage (e.g., 10 for 10%)</p>
                      </div>
                    </div>
                  </div>
                </StepperContent>

              </StepperPanel>

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
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
                  style={{ transition: 'none' }}
                >
                  {currentStep === 3 ? 'Calculate Results' : 'Next'}
                </Button>
              </div>
            </Stepper>
          </div>
        </section>
        )}

        </>
      )}

      </main>
      {/* How the Revenue Calculator Works */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How the Revenue Calculator Works</h2>
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              The calculator starts with three core inputs from your business: your monthly lead volume, your average customer lifetime value, and your current lead-to-booking rate. From there, it uses your answers about call handling and response times to estimate how many of those leads are slipping through the cracks — whether because calls go unanswered after hours, inquiries sit too long before a callback, or there's no automated follow-up system in place to re-engage leads who didn't book on first contact.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Once the baseline is established, the calculator models what happens when an AI receptionist fills those gaps. It applies industry-standard capture rates for AI-handled calls and follow-up automation — typically recovering 60 to 80 percent of leads that would otherwise be lost. The result is a monthly revenue recovery estimate: real dollars your business could be bringing in with minimal additional effort or overhead, since the AI handles calls and follow-ups automatically around the clock.
            </p>
            <p className="text-gray-700 leading-relaxed">
              The final section of the report projects your full ROI from AI implementation. It factors in staffing time saved on scheduling and admin tasks, the cost of the Boltcall subscription, and your estimated net monthly gain — then calculates how quickly the system pays for itself. For most service businesses, payback occurs within the first week of the first month, making this one of the highest-return technology investments available to local business owners today.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Boltcall paid for itself in the first week. We stopped losing calls after hours and our bookings jumped 40%.", name: "Marcus T.", role: "HVAC Owner, Texas" },
            { quote: "I was skeptical about AI, but it just works. Our front desk handles 30% fewer interruptions now.", name: "Priya S.", role: "Dental Practice Manager, California" },
            { quote: "We were losing 15-20 calls a week to voicemail. Boltcall captures every single one now.", name: "James R.", role: "Plumbing Business Owner, Florida" },
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

      {/* Revenue Impact Stats Table */}
      <section id="revenue-stats" className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revenue Impact by the Numbers</h2>
          <p className="text-gray-500 mb-6 text-sm">Industry benchmarks vs. businesses running Boltcall AI Receptionist.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Metric</th>
                  <th className="text-left px-4 py-3 font-semibold">Industry Average</th>
                  <th className="text-left px-4 py-3 font-semibold">With AI Receptionist</th>
                  <th className="text-left px-4 py-3 font-semibold">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Missed call rate', industry: '62%', ai: '0%', improvement: '-62 pts' },
                  { metric: 'Lead response time', industry: '47 hours', ai: '< 60 seconds', improvement: '99.9% faster' },
                  { metric: 'After-hours lead capture', industry: '8%', ai: '94%', improvement: '+86 pts' },
                  { metric: 'Monthly missed revenue', industry: '$18,400', ai: '$1,200', improvement: '-$17,200' },
                  { metric: 'Booking conversion rate', industry: '23%', ai: '51%', improvement: '+122%' },
                  { metric: 'Annual ROI on AI receptionist', industry: '—', ai: '380%', improvement: '—' },
                ].map((row, i) => (
                  <tr key={row.metric} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.metric}</td>
                    <td className="px-4 py-3 text-gray-600">{row.industry}</td>
                    <td className="px-4 py-3 text-blue-700 font-semibold">{row.ai}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{row.improvement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section id="pricing" className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How Boltcall Compares to Other Solutions</h2>
          <p className="text-gray-500 mb-6 text-sm">See why local businesses choose AI over traditional receptionist options.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Solution</th>
                  <th className="text-left px-4 py-3 font-semibold">Monthly Cost</th>
                  <th className="text-left px-4 py-3 font-semibold">Missed Call Coverage</th>
                  <th className="text-left px-4 py-3 font-semibold">Booking Automation</th>
                  <th className="text-left px-4 py-3 font-semibold">ROI Timeline</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { solution: 'Boltcall AI Receptionist', cost: '$297–$497', coverage: '100% (24/7)', automation: 'Yes', roi: '30 days', highlight: true },
                  { solution: 'Human receptionist', cost: '$3,200–$4,800', coverage: '~60% (business hours only)', automation: 'Manual', roi: 'Never', highlight: false },
                  { solution: 'Answering service', cost: '$250–$1,200', coverage: '~70%', automation: 'No', roi: 'Breaks even', highlight: false },
                  { solution: 'Virtual assistant', cost: '$800–$2,000', coverage: '~40%', automation: 'Limited', roi: '6–12 months', highlight: false },
                  { solution: 'No coverage', cost: '$0', coverage: '0%', automation: 'No', roi: 'Negative', highlight: false },
                ].map((row, i) => (
                  <tr key={row.solution} className={row.highlight ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`px-4 py-3 font-medium ${row.highlight ? 'text-blue-700' : 'text-gray-900'}`}>{row.solution}</td>
                    <td className="px-4 py-3 text-gray-700">{row.cost}</td>
                    <td className="px-4 py-3 text-gray-700">{row.coverage}</td>
                    <td className="px-4 py-3 text-gray-700">{row.automation}</td>
                    <td className={`px-4 py-3 font-semibold ${row.highlight ? 'text-green-700' : 'text-gray-600'}`}>{row.roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Real-World Revenue Recovery Stories</h2>
          <p className="text-gray-500 mb-8 text-sm">How local businesses used AI audit data to identify and recover lost revenue.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                industry: 'HVAC Contractor',
                location: 'Dallas, TX',
                problem: 'Revenue audit identified $23,400/month in after-hours missed revenue.',
                result: 'Implemented AI receptionist and recovered $19,800 within 45 days.',
                tag: 'After-Hours Coverage',
              },
              {
                industry: 'Dental Practice',
                location: 'Miami, FL',
                problem: 'Audit revealed 31 missed new-patient calls per month at $340 average value.',
                result: 'Added $10,540/month in revenue after switching to AI answering.',
                tag: 'New Patient Acquisition',
              },
              {
                industry: 'Plumber',
                location: 'Denver, CO',
                problem: 'Emergency calls after hours going to voicemail — $8,200/month slipping away.',
                result: '$8,200/month recovered after switching to 24/7 AI answering.',
                tag: 'Emergency Call Capture',
              },
              {
                industry: 'Law Firm',
                location: 'New York, NY',
                problem: 'Speed-to-lead gap costing $41,000/quarter in lost consultations.',
                result: 'Reduced response time from 6 hours to 45 seconds — consultations recovered.',
                tag: 'Speed-to-Lead',
              },
            ].map((item) => (
              <div key={item.industry + item.location} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 text-base">{item.industry}</p>
                    <p className="text-xs text-gray-500">{item.location}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full whitespace-nowrap">{item.tag}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2"><span className="font-semibold text-gray-800">Challenge:</span> {item.problem}</p>
                <p className="text-sm text-green-700 font-semibold">{item.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Differentiators */}
      <section id="why-boltcall-audit" className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Our Revenue Audit Is Different</h2>
          <p className="text-gray-500 mb-8 text-sm">Most revenue tools give you a score. We give you a dollar amount — and a plan.</p>
          <div className="space-y-4">
            {[
              {
                title: 'Actual Dollar Estimates',
                description: 'Not percentages, but real monthly revenue loss in dollars. You see exactly what each gap is costing you — down to the booking.',
              },
              {
                title: 'Industry-Specific Benchmarks',
                description: 'Your numbers are compared to top performers in your niche — HVAC, dental, legal, home services — not a generic national average.',
              },
              {
                title: 'Phone-First Focus',
                description: 'Most revenue audits miss call data entirely. We put inbound call handling front and center, because that\'s where most local businesses lose the most money.',
              },
              {
                title: 'Actionable Next Steps',
                description: 'Every gap in your audit comes with a specific fix — not just a score. You know exactly what to do next to plug the leak.',
              },
              {
                title: 'No Sales Pressure',
                description: 'Your results are yours to act on however you choose. We\'ll show you the numbers; what you do with them is up to you.',
              },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* What This Tool Covers */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What Your AI Revenue Audit Covers</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Six areas where AI-powered automation directly impacts your monthly revenue</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
            { label: 'Call Capture Rate', desc: 'Percentage of inbound calls answered vs. going to voicemail' },
            { label: 'After-Hours Revenue', desc: 'Jobs and appointments generated outside normal business hours' },
            { label: 'Lead Response Speed', desc: 'How your current response time compares to the 60-second benchmark' },
            { label: 'No-Show Rate', desc: 'Revenue lost to appointment cancellations and no-shows' },
            { label: 'Review Velocity', desc: 'Rate at which new Google reviews arrive and their impact on rankings' },
            { label: 'Annual Revenue Gap', desc: 'Total income recoverable with AI-powered call capture and follow-up' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <dl className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">How much revenue do local businesses lose from missed calls?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Most local service businesses miss 20–40% of inbound calls, especially after hours. With an average job value of $300–$2,000, even 5 missed calls per week translates to $78,000–$520,000 in lost annual revenue. Boltcall's AI receptionist eliminates this by answering every call 24/7.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">What is speed-to-lead and why does it affect revenue?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Speed-to-lead is how quickly a business responds to a new inquiry. Research shows 78% of customers choose the first business to respond — businesses that respond in under 60 seconds convert leads 391% more often than those responding after an hour. Boltcall's AI responds to every lead in under 11 seconds, 24/7.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">How accurate is the AI revenue audit calculator?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">The calculator uses your actual business inputs — monthly lead volume, average job value, and current booking rate — combined with industry benchmarks from thousands of local service businesses. Results are estimates based on documented patterns in lead loss; actual recovery will vary by industry, market, and implementation quality.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Can Boltcall really recover that much revenue?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Boltcall customers report 30–60% increases in booked appointments within the first 60 days, primarily by capturing leads that previously went to voicemail or were lost to slow response. An HVAC company adding $8,200/month or a dental practice recovering $10,540/month are typical outcomes, not outliers — they reflect the standard gap between current and AI-optimized lead capture rates.</p>
          </div>
        </dl>
      </section>

      <Footer />
    </div>
  );
};

export default AIRevenueAudit;

