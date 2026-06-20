import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import FAQ from '../FAQ';

const PricingSection: React.FC = () => {
  const [currency, setCurrency] = useState<'USD' | 'ILS'>('USD');
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  const plans = [
    {
      title: 'Starter',
      subtitle: 'AI Lead Catcher',
      priceMonthlyUsd: 549,
      priceAnnualUsd: 4941,
      priceMonthlyIls: 2060,
      priceAnnualIls: 18540,
      features: [
        '1 AI agent — SMS, email & chat in one setup',
        'Qualifies & nurtures leads automatically',
        'Auto-booking to Google or Outlook',
        '3-step follow-up sequence (SMS + email)',
        'Owner alerts (SMS + email)'
      ],
      limits: '1 user · 1 calendar · 300 conversations · 1,000 SMS/mo',
      support: 'Email/chat (48h)',
      ctaLabel: 'Start 7-Day Free Trial',
      popular: false
    },
    {
      title: 'Pro',
      subtitle: 'AI Front Desk',
      priceMonthlyUsd: 897,
      priceAnnualUsd: 8073,
      priceMonthlyIls: 3364,
      priceAnnualIls: 30276,
      features: [
        'Everything in Starter',
        '3 AI agents — voice calls + outbound campaigns',
        'Live transfer to human when needed',
        'WhatsApp messaging (speed-to-lead)',
        '1 CRM integration + Zapier/Make',
        'Full analytics, transcripts & call recordings',
        'Google review requests (post-appointment)'
      ],
      limits: '2 users · 2 calendars · 300 voice mins · 2,500 SMS/mo',
      support: 'Priority chat (24h) + onboarding call',
      guarantee: '10 extra bookings in 30 days or your money back.',
      ctaLabel: 'Start 7-Day Free Trial',
      popular: true
    },
    {
      title: 'Ultimate',
      subtitle: 'Done-For-You Growth Engine',
      priceMonthlyUsd: 4997,
      priceAnnualUsd: 44973,
      priceMonthlyIls: 18740,
      priceAnnualIls: 168660,
      features: [
        'Everything in Pro',
        'We run your ads (Meta + Google)',
        'Full funnel: Ads → AI Agent → Booked appointments',
        'Unlimited agents + Instagram/Facebook DMs',
        'Done-for-you setup in 48h + branded voice',
        'Dedicated account manager + quarterly strategy reviews'
      ],
      limits: '5 users · 4 calendars · 900 voice mins · 6,000 SMS/mo',
      support: 'VIP same-day · phone + WhatsApp · add locations at $750/ea',
      ctaLabel: 'Start 7-Day Free Trial',
      popular: false
    }
  ];

  const comparisonFeatures = [
    { name: 'AI agent — one setup, every channel', starter: true, pro: true, ultimate: true },
    { name: 'SMS, email & website chat', starter: true, pro: true, ultimate: true },
    { name: 'Lead qualification + auto-booking', starter: true, pro: true, ultimate: true },
    { name: 'Multi-step follow-up sequences', starter: true, pro: true, ultimate: true },
    { name: 'AI voice calls (inbound + outbound)', starter: false, pro: true, ultimate: true },
    { name: 'Live transfer to human', starter: false, pro: true, ultimate: true },
    { name: 'CRM integration + Zapier/Make', starter: false, pro: true, ultimate: true },
    { name: 'Call transcripts & recordings', starter: false, pro: true, ultimate: true },
    { name: 'Google review requests', starter: false, pro: true, ultimate: true },
    { name: 'Money-back guarantee', starter: false, pro: true, ultimate: true },
    { name: 'We run your ads (Meta + Google)', starter: false, pro: false, ultimate: true },
    { name: 'Full funnel: Ads → AI → Bookings', starter: false, pro: false, ultimate: true },
    { name: 'WhatsApp + Facebook/Instagram DMs', starter: false, pro: true, ultimate: true },
    { name: 'Done-for-you setup in 48h', starter: false, pro: false, ultimate: true },
    { name: 'Dedicated account manager', starter: false, pro: false, ultimate: true },
    { name: 'Quarterly strategy reviews', starter: false, pro: false, ultimate: true },
    { name: 'Branded voice + compliance pack', starter: false, pro: false, ultimate: true },
    { name: 'AI agents', starter: '1', pro: '3', ultimate: 'Unlimited' },
    { name: 'Users / Calendars', starter: '1 / 1', pro: '2 / 2', ultimate: '5 / 4' },
    { name: 'Voice minutes / SMS', starter: '— / 1,000', pro: '300 / 2,500', ultimate: '900 / 6,000' }
  ];

  const handlePlanSelect = () => {
    navigate('/signup?redirect=/setup');
  };

  const handleContactUs = () => {
    navigate('/book-a-call');
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-light-blue">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Pick your plan.
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            One AI agent. Every channel. Set up once. Pick how far you want us to take it.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            className="flex items-center justify-center gap-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className={`text-lg font-medium transition-colors duration-300 ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                isAnnual ? 'bg-brand-blue' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <motion.div
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                animate={{ x: isAnnual ? 32 : 2 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1],
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              />
            </button>
            <span className={`text-lg font-medium transition-colors duration-300 ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                3 months free
              </span>
            )}
          </motion.div>

          {/* Currency Toggle */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="text-sm font-medium text-gray-700">Currency:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Switch to USD currency"
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('ILS')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  currency === 'ILS'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Switch to ILS currency"
              >
                ₪
              </button>
            </div>
          </motion.div>
        </div>

        {/* Plan Headers */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              className={`text-center p-6 rounded-xl bg-white shadow-lg ${
                plan.popular ? 'ring-2 ring-brand-blue shadow-xl scale-[1.02]' : ''
              }`}
            >
              {plan.popular && (
                <div className="mb-4">
                  <span className="inline-flex items-center bg-gradient-to-r from-brand-blue to-brand-sky text-white px-4 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.title}</h3>
              <p className="text-gray-600 mb-4">{plan.subtitle}</p>
              
              <div className="mb-4">
                <div className="text-4xl font-bold text-gray-900">
                  {currency === 'USD'
                    ? `$${(isAnnual ? plan.priceAnnualUsd : plan.priceMonthlyUsd).toLocaleString()}`
                    : `₪${(isAnnual ? plan.priceAnnualIls : plan.priceMonthlyIls).toLocaleString()}`
                  }
                  <span className="text-lg font-normal text-gray-600">
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>
                {isAnnual && (
                  <p className="text-green-600 text-sm mt-1">3 months free</p>
                )}
              </div>

              <Button
                onClick={handlePlanSelect}
                variant={plan.popular ? 'primary' : 'outline'}
                size="lg"
                className="w-full"
              >
                {plan.ctaLabel}
              </Button>
              {plan.title === 'Ultimate' && (
                <Button
                  onClick={handleContactUs}
                  variant="outline"
                  size="lg"
                  className="w-full mt-3"
                >
                  Book a Call
                </Button>
              )}

            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-x-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="min-w-[640px]">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-left">
                <h4 className="text-lg font-semibold text-gray-900">Features</h4>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">Starter</h4>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">Pro</h4>
                {plans[1].popular && (
                  <span className="inline-flex items-center bg-gradient-to-r from-brand-blue to-brand-sky text-white text-xs mt-1 px-3 py-1 rounded-full font-medium">
                    Most Popular
                  </span>
                )}
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">Ultimate</h4>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {comparisonFeatures.map((feature, index) => (
              <motion.div
                key={feature.name}
                className="grid grid-cols-4 gap-4 px-8 py-6 hover:bg-gray-50 transition-colors duration-200"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="text-left">
                  <span className="text-gray-900 font-medium">{feature.name}</span>
                </div>
                
                <div className="text-center">
                  {typeof feature.starter === 'boolean' ? (
                    feature.starter ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />
                    ) : (
                      <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={2.5} />
                    )
                  ) : (
                    <span className="text-gray-900">{feature.starter}</span>
                  )}
                </div>
                
                <div className="text-center">
                  {typeof feature.pro === 'boolean' ? (
                    feature.pro ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />
                    ) : (
                      <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={2.5} />
                    )
                  ) : (
                    <span className="text-gray-900">{feature.pro}</span>
                  )}
                </div>
                
                <div className="text-center">
                  {typeof feature.ultimate === 'boolean' ? (
                    feature.ultimate ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={2.5} />
                    ) : (
                      <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={2.5} />
                    )
                  ) : (
                    <span className="text-gray-900">{feature.ultimate}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <FAQ />
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;

