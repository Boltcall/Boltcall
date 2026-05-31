/**
 * Speed-to-Lead funnel pages — smoke tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...props }: any, ref: any) => {
        const safe: any = {};
        for (const [k, v] of Object.entries(props)) {
          if (!k.startsWith('while') && !k.startsWith('animate') && !k.startsWith('initial') &&
              !k.startsWith('exit') && !k.startsWith('transition') && !k.startsWith('variants') &&
              k !== 'layout' && k !== 'layoutId' && k !== 'onViewportEnter' && k !== 'viewport') {
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
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        }),
      }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('lenis', () => ({ default: class { destroy() {} raf() {} } }));
vi.mock('@lottiefiles/dotlottie-react', () => ({ DotLottieReact: () => null }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
const gsapInstance = {
  registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn(), set: vi.fn(),
  timeline: () => ({ to: vi.fn(), fromTo: vi.fn(), kill: vi.fn(), set: vi.fn() }),
};
vi.mock('gsap', () => ({
  default: gsapInstance,
  gsap: gsapInstance,
}));
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn(), refresh: vi.fn(), getAll: () => [], kill: vi.fn() },
}));
vi.mock('@gsap/react', () => ({ useGSAP: (cb: any) => { try { cb(); } catch {} } }));
vi.mock('../../components/TalkToAgentModal', () => ({ default: () => null }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => null, BarChart: () => null, AreaChart: () => null,
  PieChart: () => null, Line: () => null, Bar: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}));

// ── Page imports ─────────────────────────────────────────────────────────────

import SpeedTestLanding from '../speed-test/SpeedTestLanding';
import SpeedTestLogin from '../speed-test/SpeedTestLogin';
import SpeedTestReport from '../speed-test/SpeedTestReport';
import SpeedTestOffer from '../speed-test/SpeedTestOffer';

const renderInRouter = (Page: React.ComponentType) => {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
};

describe('Speed-to-Lead funnel pages — smoke tests', () => {
  const pages: [string, React.ComponentType][] = [
    ['SpeedTestLanding', SpeedTestLanding],
    ['SpeedTestLogin', SpeedTestLogin],
    ['SpeedTestReport', SpeedTestReport],
    ['SpeedTestOffer', SpeedTestOffer],
  ];

  for (const [name, Page] of pages) {
    it(`${name} renders without crashing`, () => {
      expect(() => renderInRouter(Page)).not.toThrow();
    });
  }
});
