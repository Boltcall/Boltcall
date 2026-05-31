/**
 * Dashboard page smoke tests — every dashboard page renders without crashing.
 * These are shallow render tests that mock all external dependencies.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Global mocks (before any page imports) ─────────────────────────────────

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
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

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    plan: 'pro',
    status: 'active',
    isLoading: false,
  }),
  SubscriptionProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../contexts/TokenContext', () => ({
  useTokens: () => ({
    balance: 2500,
    bonusBalance: 100,
    isLoading: false,
    deductTokens: vi.fn(),
  }),
  TokenProvider: ({ children }: any) => <>{children}</>,
}));

// Deep Supabase mock that supports arbitrary chaining
function createChainMock(): any {
  const resolved = Promise.resolve({ data: [], error: null, count: 0 });
  const chain: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return resolved.then.bind(resolved);
        if (prop === 'catch') return resolved.catch.bind(resolved);
        if (prop === 'finally') return resolved.finally.bind(resolved);
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve({ data: null, error: null });
        }
        return (..._args: any[]) => chain;
      },
    }
  );
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
    removeAllChannels: vi.fn(),
    getChannels: () => [],
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

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => null, BarChart: () => null, AreaChart: () => null,
  PieChart: () => null, Line: () => null, Bar: () => null,
  Area: () => null, Pie: () => null, XAxis: () => null,
  YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  Legend: () => null, Cell: () => null, RadarChart: () => null,
  Radar: () => null, PolarGrid: () => null, PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null, Funnel: () => null, FunnelChart: () => null,
}));

// Mock heavy dashboard sub-components
vi.mock('../../../components/SetupCompletionPopup', () => ({ default: () => null }));
vi.mock('../../../components/dashboard/FeatureHub', () => ({ default: () => null }));
vi.mock('../../../components/ui/onboarding-checklist', () => ({ InteractiveOnboardingChecklist: () => null }));
vi.mock('../../../components/TalkToAgentModal', () => ({ default: () => null }));
vi.mock('../../../components/ui/empty-state', () => ({ EmptyState: ({ title }: any) => <div>{title}</div> }));
vi.mock('../../../components/dashboard/VoiceLibrary', () => ({ default: () => <div>VoiceLibrary</div> }));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// Mock ToastContext
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => <>{children}</>,
}));

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
});

// ── Dashboard page imports ─────────────────────────────────────────────────

import AnalyticsPage from '../AnalyticsPage';
import AgentsPage from '../AgentsPage';
import SmsPage from '../SmsPage';
import WhatsappPage from '../WhatsappPage';
import EmailPage from '../EmailPage';
import KnowledgeBasePage from '../KnowledgeBasePage';
import PhoneNumbersPage from '../PhoneNumbersPage';
import IntegrationsPage from '../IntegrationsPage';
import InstantLeadReplyPage from '../InstantLeadReplyPage';
import VoiceLibraryPage from '../VoiceLibraryPage';
import WebsiteBubblePage from '../WebsiteBubblePage';
import RemindersPage from '../RemindersPage';
import CalcomPage from '../CalcomPage';
import ReputationPage from '../ReputationPage';
import LocationDashboardPage from '../LocationDashboardPage';
import DeepAnalyticsPage from '../DeepAnalyticsPage';

// Settings pages
import GeneralPage from '../settings/GeneralPage';
import PreferencesPage from '../settings/PreferencesPage';
import PlanBillingPage from '../settings/PlanBillingPage';
import NotificationPage from '../settings/NotificationPage';
import RolesPage from '../settings/RolesPage';
import ActivityLogPage from '../settings/ActivityLogPage';
import ApiKeysPage from '../settings/ApiKeysPage';
import WorkspacePage from '../settings/WorkspacePage';

const renderInRouter = (Page: React.ComponentType) => {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
};

// ── Smoke tests ─────────────────────────────────────────────────────────────

describe('Dashboard pages — smoke tests', () => {
  beforeAll(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  const pages: [string, React.ComponentType][] = [
    ['AnalyticsPage', AnalyticsPage],
    ['AgentsPage', AgentsPage],
    ['SmsPage', SmsPage],
    ['WhatsappPage', WhatsappPage],
    ['EmailPage', EmailPage],
    ['KnowledgeBasePage', KnowledgeBasePage],
    ['PhoneNumbersPage', PhoneNumbersPage],
    ['IntegrationsPage', IntegrationsPage],
    ['InstantLeadReplyPage', InstantLeadReplyPage],
    ['VoiceLibraryPage', VoiceLibraryPage],
    ['WebsiteBubblePage', WebsiteBubblePage],
    ['RemindersPage', RemindersPage],
    ['CalcomPage', CalcomPage],
    ['ReputationPage', ReputationPage],
    ['LocationDashboardPage', LocationDashboardPage],
    ['DeepAnalyticsPage', DeepAnalyticsPage],
    // Settings
    ['GeneralPage', GeneralPage],
    ['PreferencesPage', PreferencesPage],
    ['PlanBillingPage', PlanBillingPage],
    ['NotificationPage', NotificationPage],
    ['RolesPage', RolesPage],
    ['ActivityLogPage', ActivityLogPage],
    ['ApiKeysPage', ApiKeysPage],
    ['WorkspacePage', WorkspacePage],
  ];

  for (const [name, Page] of pages) {
    it(`${name} renders without crashing`, () => {
      expect(() => renderInRouter(Page)).not.toThrow();
    });
  }
});
