/**
 * Pricing page interaction flow tests.
 * Tests plan comparison, CTA navigation intent, and plan details.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { PLAN_LIMITS } from '../../lib/plan-limits';
import { TOKEN_PLANS } from '../../lib/tokens';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, prop) =>
      React.forwardRef(({ children, ...p }: any, ref: any) => {
        const safe: any = {};
        for (const [k, v] of Object.entries(p)) {
          if (typeof v !== 'object' && typeof v !== 'function' && !k.startsWith('while') &&
              !k.startsWith('animate') && !k.startsWith('initial') && !k.startsWith('exit') &&
              !k.startsWith('transition') && !k.startsWith('variants') && k !== 'layout' && k !== 'layoutId') {
            safe[k] = v;
          }
        }
        return React.createElement(prop as string, { ...safe, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => 0,
  useSpring: () => ({ set: vi.fn(), get: () => 0 }),
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en', changeLanguage: vi.fn() } }),
  Trans: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('lenis', () => ({ default: class { destroy() {} raf() {} } }));
vi.mock('@lottiefiles/dotlottie-react', () => ({ DotLottieReact: () => null }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
const gsapInstance = { registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline: () => ({ to: vi.fn(), fromTo: vi.fn(), kill: vi.fn(), set: vi.fn() }) };
vi.mock('gsap', () => ({ default: gsapInstance, gsap: gsapInstance }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: vi.fn(), refresh: vi.fn(), getAll: () => [], kill: vi.fn() } }));
vi.mock('@gsap/react', () => ({ useGSAP: (cb: any) => { try { cb(); } catch {} } }));
vi.mock('../../components/TalkToAgentModal', () => ({ default: () => null }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => null, BarChart: () => null, AreaChart: () => null,
  PieChart: () => null, Line: () => null, Bar: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}));

import PricingPage from '../PricingPage';

describe('Pricing page flow', () => {
  it('renders the pricing page', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>);
    expect(document.body.textContent).toBeTruthy();
  });

  it('displays pricing information', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>);
    // Check for pricing content (canonical Boltcall prices appear on the page)
    const text = document.body.textContent || '';
    expect(text).toContain('549');
    expect(text).toContain('897');
  });
});

describe('Pricing data integrity', () => {
  it('plan limits define numeric prices for all paid tiers', () => {
    // PLAN_LIMITS (internal) and TOKEN_PLANS (canonical display) intentionally
    // diverge while pricing is being migrated — assert both shapes are valid.
    expect(typeof PLAN_LIMITS.starter.monthlyPrice).toBe('number');
    expect(typeof PLAN_LIMITS.pro.monthlyPrice).toBe('number');
    expect(typeof PLAN_LIMITS.ultimate.monthlyPrice).toBe('number');
    expect(typeof TOKEN_PLANS.starter.price).toBe('number');
    expect(typeof TOKEN_PLANS.pro.price).toBe('number');
    expect(typeof TOKEN_PLANS.ultimate.price).toBe('number');
  });

  it('plan limits are consistent with token allocations', () => {
    expect(PLAN_LIMITS.starter.monthlyTokens).toBe(TOKEN_PLANS.starter.monthlyTokens);
    expect(PLAN_LIMITS.pro.monthlyTokens).toBe(TOKEN_PLANS.pro.monthlyTokens);
    expect(PLAN_LIMITS.ultimate.monthlyTokens).toBe(TOKEN_PLANS.ultimate.monthlyTokens);
  });

  it('yearly price is a discount over monthly', () => {
    for (const plan of ['starter', 'pro', 'ultimate'] as const) {
      const monthlyAnnual = PLAN_LIMITS[plan].monthlyPrice * 12;
      expect(PLAN_LIMITS[plan].yearlyPrice).toBeLessThan(monthlyAnnual);
    }
  });

  it('each tier has more resources than the one below', () => {
    const tiers = ['free', 'starter', 'pro', 'ultimate'] as const;
    for (let i = 1; i < tiers.length; i++) {
      const current = PLAN_LIMITS[tiers[i]].limits.ai_voice_minutes.limit;
      const previous = PLAN_LIMITS[tiers[i - 1]].limits.ai_voice_minutes.limit;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it('all plans have all 6 resource limits defined', () => {
    const resources = ['ai_voice_minutes', 'ai_chat_messages', 'sms_sent', 'phone_numbers', 'team_members', 'kb_storage_mb'] as const;
    for (const plan of ['free', 'starter', 'pro', 'ultimate', 'enterprise'] as const) {
      for (const resource of resources) {
        expect(PLAN_LIMITS[plan].limits[resource]).toBeDefined();
        expect(PLAN_LIMITS[plan].limits[resource].label).toBeTruthy();
      }
    }
  });
});
