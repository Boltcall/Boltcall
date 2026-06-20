import React from 'react';
import { useNavigate } from 'react-router-dom';
import Section from './ui/Section';
import { useTranslation } from 'react-i18next';
import { PricingTable } from './ui/pricing-table';
import WhisperText from './ui/whisper-text';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('marketing');

  // Self-serve plans (Starter / Pro / Ultimate) start at signup, then continue to /setup.
  // payment is handled inside the dashboard once the user is signed in.
  // High-touch plans (Enterprise / Custom) route to /book-a-call for sales.
  const PLAN_ROUTES: Record<string, string> = {
    starter: '/signup?redirect=/setup',
    pro: '/signup?redirect=/setup',
    ultimate: '/signup?redirect=/setup',
    custom: '/book-a-call',
  };

  // PricingTable data
  const pricingFeatures = [
    // Starter Plan Features
    { name: "AI receptionist", included: "starter" },
    { name: "Missed call text-back", included: "starter" },
    { name: "Instant lead reply", included: "starter" },
    { name: "Appointment reminders", included: "starter" },
    { name: "Reports dashboard", included: "starter" },

    // Pro Plan Features (includes everything from Starter)
    { name: "Full lead follow-up system", included: "pro" },
    { name: "SMS conversations", included: "pro" },
    { name: "Automatic follow-ups after jobs", included: "pro" },
    { name: "Website chat widget", included: "pro" },
    
    // Agency Plan Features (includes everything from Pro)
    { name: "Locations", included: "all" },
    { name: "AI audits", included: "all" },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      level: "starter",
      price: { monthly: 549, yearly: 4941 },
      description: "Get started with lead management.",
      tokens: "1,000 tokens/mo",
    },
    {
      name: "Pro",
      level: "pro",
      price: { monthly: 897, yearly: 8073 },
      popular: true,
      description: "Everything in Starter plus:",
      tokens: "3,000 tokens/mo",
    },
    {
      name: "Ultimate",
      level: "all",
      price: { monthly: 4997, yearly: 44973 },
      description: "Everything in Pro plus:",
      tokens: "10,000 tokens/mo",
    },
    {
      name: "ENTERPRISE",
      level: "custom",
      price: { monthly: 997, yearly: 11964 },
      description: "Tailored solutions for your business:",
      isCustom: true,
      excludeFromTable: true,
    },
  ];



  return (
    <>
      <Section id="pricing" background="white" roundedTop={true} className="!py-8 lg:!py-12">
      {/* Pricing Header */}
      <div className="text-center mb-1 mt-12 md:mt-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-[1.2]">
          <WhisperText
            text={t('pricing.heading1')}
            className="text-4xl md:text-5xl font-bold text-gray-900 inline-block"
            delay={187}
            duration={0.625}
            x={-20}
            y={0}
            triggerStart="top 80%"
          />{' '}
          <WhisperText
            text={t('pricing.heading2')}
            className="text-4xl md:text-5xl font-bold text-blue-500 inline-block"
            delay={187}
            duration={0.625}
            x={-20}
            y={0}
            triggerStart="top 80%"
          />{' '}
          <WhisperText
            text={t('pricing.heading3')}
            className="text-4xl md:text-5xl font-bold text-gray-900 inline-block"
            delay={187}
            duration={0.625}
            x={-20}
            y={0}
            triggerStart="top 80%"
          />
        </h2>
      </div>

      {/* New PricingTable Component */}
        <PricingTable
          features={pricingFeatures}
          plans={pricingPlans}
          defaultPlan="pro"
          defaultInterval="monthly"
          onPlanSelect={(plan) => {
            const planMap: Record<string, string> = {
              starter: 'starter',
              pro: 'pro',
              all: 'ultimate',
              custom: 'custom',
            };
            const planKey = planMap[plan] || plan;
            const route = PLAN_ROUTES[planKey] || '/signup?redirect=/setup';
            navigate(route);
          }}
          containerClassName="py-0"
          buttonClassName="bg-blue-600 hover:bg-blue-700"
        />

      </Section>
    </>
  );
};

export default Pricing;
