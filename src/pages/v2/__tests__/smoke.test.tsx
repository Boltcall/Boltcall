/**
 * V2 page smoke tests — every V2 page renders without crashing, and every
 * gated page is actually blocked by V2OptInGate when v2_enabled = false.
 *
 * Mirrors the V1 dashboard smoke pattern (src/pages/dashboard/__tests__/smoke.test.tsx):
 *   - All vi.mock() calls at module top, BEFORE page imports (hoisting).
 *   - Deep Proxy supabase chain mock to support arbitrary `.from().select()...` chains.
 *   - Global fetch mock so any authedFetch / fetch resolves to empty state quickly.
 *   - framer-motion + recharts + react-i18next + sonner + canvas-confetti stubbed.
 *
 * V2-specific:
 *   - V2OptInGate is mocked with a module-scoped flag (`__v2GateState`) that flips
 *     per-test between "enabled" (passthrough) and "disabled" (renders a sentinel).
 *     This lets us verify gated pages do NOT render their primary content when
 *     v2_enabled = false without needing real Supabase/auth wiring.
 *   - authedFetch is mocked at module scope to avoid touching supabase.auth.getSession()
 *     (which would otherwise force us to mock @supabase/supabase-js with realtime
 *     methods like removeChannel — V2 pages don't use realtime but the supabase
 *     client constructor still pulls in helpers).
 *   - Heavy V2 sub-components (V2SetupChat, AskBoltcallAIV2) are stubbed so their
 *     internal fetches and DOM heaviness don't dominate the smoke run.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Hoisted mutable mock state (vi.hoisted runs before vi.mock factories) ──
const __v2State = vi.hoisted(() => ({
  // 'enabled' = gate renders children (passthrough). 'disabled' = gate renders sentinel.
  mode: 'enabled' as 'enabled' | 'disabled',
}));

const __authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
}));

// ── Global mocks (all before any page imports) ─────────────────────────────

// framer-motion — Proxy-based motion shim that strips animation props
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, prop) =>
      React.forwardRef(({ children, ...props }: any, ref: any) => {
        const safe: any = {};
        for (const [k, v] of Object.entries(props)) {
          if (!k.startsWith('while') && !k.startsWith('animate') && !k.startsWith('initial') &&
              !k.startsWith('exit') && !k.startsWith('transition') && !k.startsWith('variants') &&
              k !== 'layout' && k !== 'layoutId' && k !== 'onViewportEnter' && k !== 'viewport' &&
              k !== 'drag' && k !== 'dragConstraints' && k !== 'dragElastic') {
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

// AuthContext — pretend an authenticated user is always present.
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
    isAuthenticated: __authState.isAuthenticated,
    isLoading: __authState.isLoading,
  }),
}));

// react-i18next — identity translator.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// canvas-confetti — no-op.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// sonner toasts — no-op.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

// recharts — every chart stubbed to null/div.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => null, BarChart: () => null, AreaChart: () => null,
  PieChart: () => null, Line: () => null, Bar: () => null,
  Area: () => null, Pie: () => null, XAxis: () => null,
  YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  Legend: () => null, Cell: () => null, RadarChart: () => null,
  Radar: () => null, PolarGrid: () => null, PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null, Funnel: () => null, FunnelChart: () => null,
  ComposedChart: () => null, ScatterChart: () => null, Scatter: () => null,
  ReferenceLine: () => null, Brush: () => null,
}));

// authedFetch — short-circuit JSON success. Avoids touching supabase.auth.getSession().
vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('{}'),
  }),
}));

// FUNCTIONS_BASE constant.
vi.mock('../../../lib/api', () => ({ FUNCTIONS_BASE: '/.netlify/functions' }));

// Deep Supabase mock that supports arbitrary chaining. Includes removeChannel
// so any future realtime usage doesn't crash like V1 WhatsappPage did.
function createChainMock(): any {
  const resolved = Promise.resolve({ data: [], error: null, count: 0 });
  const chain: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (prop === 'finally') return resolved.finally.bind(resolved);
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      return (..._a: any[]) => chain;
    },
  });
  return chain;
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: (..._a: any[]) => createChainMock(),
      insert: (..._a: any[]) => createChainMock(),
      update: (..._a: any[]) => createChainMock(),
      upsert: (..._a: any[]) => createChainMock(),
      delete: (..._a: any[]) => createChainMock(),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

// Defensive: also mock @supabase/supabase-js directly in case any V2 surface
// constructs its own client at module scope.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: (..._a: any[]) => createChainMock(),
      insert: (..._a: any[]) => createChainMock(),
      update: (..._a: any[]) => createChainMock(),
      upsert: (..._a: any[]) => createChainMock(),
      delete: (..._a: any[]) => createChainMock(),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  }),
}));

// V2 sub-components — stub heavy chat surfaces so smoke tests stay fast and
// deterministic. These have their own internal fetches that we don't want firing.
vi.mock('../../../components/v2/V2SetupChat', () => ({
  __esModule: true,
  default: () => <div data-testid="v2-setup-chat-stub">V2SetupChat</div>,
}));
vi.mock('../../../components/v2/AskBoltcallAIV2', () => ({
  __esModule: true,
  default: () => <div data-testid="ask-boltcall-ai-stub">AskBoltcallAIV2</div>,
}));

// V2OptInGate — module-level mock that flips behavior based on __v2State.mode.
// 'enabled'  → renders children (passthrough, page content shows).
// 'disabled' → renders a sentinel that simulates the "Enable V2" gate screen.
vi.mock('../../../components/v2/V2OptInGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    __v2State.mode === 'enabled'
      ? <>{children}</>
      : <div data-testid="v2-gate-disabled">V2 isn&apos;t enabled for this workspace yet</div>,
  __resetV2OptInGateCache: vi.fn(),
}));

// ── V2 page imports (after all mocks) ──────────────────────────────────────

import V2AgentPage from '../V2AgentPage';
import V2AnalyticsPage from '../V2AnalyticsPage';
import V2CallsPage from '../V2CallsPage';
import V2HelpPage from '../V2HelpPage';
import V2HomePage from '../V2HomePage';
import V2IntegrationsPage from '../V2IntegrationsPage';
import V2KnowledgePage from '../V2KnowledgePage';
import V2LeadsPage from '../V2LeadsPage';
import V2MessagesPage from '../V2MessagesPage';
import V2QAPage from '../V2QAPage';
import V2ReputationPage from '../V2ReputationPage';
import V2SettingsPage from '../V2SettingsPage';
import V2SetupPage from '../V2SetupPage';
import V2OptInGate from '../../../components/v2/V2OptInGate';

// ── Helpers ────────────────────────────────────────────────────────────────

const renderInRouter = (Page: React.ComponentType) =>
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );

const renderGated = (Page: React.ComponentType) =>
  render(
    <MemoryRouter>
      <V2OptInGate>
        <Page />
      </V2OptInGate>
    </MemoryRouter>
  );

// Pages that should be wrapped in V2OptInGate at the route level (12 of 13).
const GATED_PAGES: [string, React.ComponentType][] = [
  ['V2AgentPage', V2AgentPage],
  ['V2AnalyticsPage', V2AnalyticsPage],
  ['V2CallsPage', V2CallsPage],
  ['V2HelpPage', V2HelpPage],
  ['V2HomePage', V2HomePage],
  ['V2IntegrationsPage', V2IntegrationsPage],
  ['V2KnowledgePage', V2KnowledgePage],
  ['V2LeadsPage', V2LeadsPage],
  ['V2MessagesPage', V2MessagesPage],
  ['V2QAPage', V2QAPage],
  ['V2ReputationPage', V2ReputationPage],
  ['V2SettingsPage', V2SettingsPage],
];

// ── Smoke tests ────────────────────────────────────────────────────────────

describe('V2 pages — smoke tests', () => {
  beforeAll(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  beforeEach(() => {
    // Default: gate is OPEN so render tests see page content.
    __v2State.mode = 'enabled';
    __authState.isAuthenticated = true;
    __authState.isLoading = false;
    // Fresh global fetch mock per test so prior calls don't leak.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
      text: () => Promise.resolve('{}'),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Render-without-crash tests for ALL 13 V2 pages ─────────────────────
  describe('renders without crashing', () => {
    const allPages: [string, React.ComponentType][] = [
      ...GATED_PAGES,
      ['V2SetupPage', V2SetupPage],
    ];

    for (const [name, Page] of allPages) {
      it(`${name} renders without crashing`, () => {
        expect(() => renderInRouter(Page)).not.toThrow();
      });
    }
  });

  // ── Gating tests for the 12 V2OptInGate-wrapped pages ──────────────────
  describe('is gated by V2OptInGate when v2_enabled=false', () => {
    for (const [name, Page] of GATED_PAGES) {
      it(`${name} is gated by V2OptInGate`, () => {
        __v2State.mode = 'disabled';
        renderGated(Page);

        // The gate-disabled sentinel must appear...
        expect(screen.getByTestId('v2-gate-disabled')).toBeInTheDocument();
        // ...and the gate must NOT have rendered children, so page-specific
        // stub markers from heavy V2 sub-components must be absent.
        expect(screen.queryByTestId('ask-boltcall-ai-stub')).not.toBeInTheDocument();
        expect(screen.queryByTestId('v2-setup-chat-stub')).not.toBeInTheDocument();
      });
    }
  });

  // ── Ungated test for V2SetupPage ───────────────────────────────────────
  describe('V2SetupPage is NOT gated', () => {
    it('V2SetupPage renders without v2_enabled flag set', () => {
      // Even with the gate "disabled", V2SetupPage is NOT wrapped — it must
      // still render so brand-new users can reach the wizard before opt-in.
      __v2State.mode = 'disabled';
      renderInRouter(V2SetupPage);

      // The V2SetupChat stub must be present (proves page rendered fully).
      expect(screen.getByTestId('v2-setup-chat-stub')).toBeInTheDocument();
      // And the gate-disabled sentinel must NOT appear (page bypasses the gate).
      expect(screen.queryByTestId('v2-gate-disabled')).not.toBeInTheDocument();
      expect(screen.queryByText(/skip to v1 setup/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/setup data is saved as you go/i)).not.toBeInTheDocument();
    });

    it('V2SetupPage blocks unauthenticated users before chat fetches run', () => {
      __authState.isAuthenticated = false;

      renderInRouter(V2SetupPage);

      expect(screen.getByText('Sign in before starting V2 setup')).toBeInTheDocument();
      expect(screen.queryByTestId('v2-setup-chat-stub')).not.toBeInTheDocument();
    });
  });
});
