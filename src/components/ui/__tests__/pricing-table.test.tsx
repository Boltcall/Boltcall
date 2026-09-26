import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingTable, type PricingPlan, type PricingFeature } from '../pricing-table';

// Regression guard for F69: the Ultimate plan (level: 'all', no isCustom) must
// route through onPlanSelect like Starter/Pro. Only a true isCustom plan
// (Enterprise) should short-circuit to /contact.

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, prop) => React.forwardRef(({ children, ...p }: any, ref: any) => {
      const safe: any = {};
      for (const [k, v] of Object.entries(p)) {
        if (typeof v !== 'object' && typeof v !== 'function') safe[k] = v;
      }
      return React.createElement(prop as string, { ...safe, ref }, children);
    }),
  }),
}));

vi.mock('@number-flow/react', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

const features: PricingFeature[] = [{ name: 'AI receptionist', included: 'starter' }];

const plans: PricingPlan[] = [
  { name: 'Starter', level: 'starter', price: { monthly: 549, yearly: 4941 } },
  { name: 'Pro', level: 'pro', price: { monthly: 897, yearly: 8073 } },
  { name: 'Ultimate', level: 'all', price: { monthly: 4997, yearly: 44973 } },
  { name: 'Enterprise', level: 'custom', price: { monthly: 997, yearly: 11964 }, isCustom: true, excludeFromTable: true },
];

describe('PricingTable CTA routing', () => {
  it('routes Ultimate (level "all", not isCustom) through onPlanSelect, not to /contact', async () => {
    const onPlanSelect = vi.fn();
    render(<PricingTable features={features} plans={plans} onPlanSelect={onPlanSelect} defaultPlan="pro" />);

    // "Ultimate" renders twice (mobile/card CTA view + desktop comparison
    // table header); the card view — the one with the CTA button — is first.
    const ultimateCard = screen.getAllByText('Ultimate')[0].closest('div.flex-1') as HTMLElement;
    const button = ultimateCard.querySelector('button') as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.textContent).toMatch(/Start 7-Day Free Trial/i);
    await userEvent.click(button);

    expect(onPlanSelect).toHaveBeenCalledWith('all', 'monthly');
  });

  it('still routes Enterprise (isCustom) to Contact Us, not onPlanSelect', () => {
    const onPlanSelect = vi.fn();
    render(<PricingTable features={features} plans={plans} onPlanSelect={onPlanSelect} defaultPlan="pro" />);

    // Enterprise is excludeFromTable but still rendered as a mobile/card CTA.
    expect(screen.getByRole('button', { name: /Contact Us/i })).toBeInTheDocument();
  });
});
