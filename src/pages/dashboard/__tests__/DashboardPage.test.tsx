import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

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

// Mock Auth
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock SubscriptionContext — new DashboardPage uses useSubscription
vi.mock('../../../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    planLevel: 'pro',
    plan: 'pro',
    status: 'active',
    isLoading: false,
  }),
  SubscriptionProvider: ({ children }: any) => <>{children}</>,
}));

// Mock Supabase
vi.mock('../../../lib/supabase', () => {
  const createChainMock = (): any => {
    const resolved = Promise.resolve({ data: [], error: null, count: 0 });
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'then') return resolved.then.bind(resolved);
        if (prop === 'catch') return resolved.catch.bind(resolved);
        if (prop === 'finally') return resolved.finally.bind(resolved);
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve({ data: null, error: null });
        }
        return (..._args: any[]) => chain;
      },
    });
    return chain;
  };
  return {
    supabase: {
      from: () => ({
        select: () => createChainMock(),
        insert: () => createChainMock(),
        update: () => createChainMock(),
        upsert: () => createChainMock(),
        delete: () => createChainMock(),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
        getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
    },
  };
});

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Mock confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock sub-components that have complex dependencies
vi.mock('../../../components/SetupCompletionPopup', () => ({
  default: () => null,
}));

vi.mock('../../../components/dashboard/TodayGlanceCard', () => ({
  default: () => <div data-testid="today-glance-card">TodayGlanceCard</div>,
}));

vi.mock('../../../components/dashboard/WinFeed', () => ({
  default: () => <div data-testid="win-feed">WinFeed</div>,
}));

vi.mock('../../../components/dashboard/WhileYouWereGone', () => ({
  default: () => <div data-testid="while-you-were-gone">WhileYouWereGone</div>,
}));

vi.mock('../../../components/dashboard/ConversationWinsCard', () => ({
  default: () => <div data-testid="conversation-wins-card">ConversationWinsCard</div>,
}));

vi.mock('../../../components/ui/agent-workflow-block', () => ({
  AgentWorkflowBlock: () => <div data-testid="agent-workflow-block">AgentWorkflowBlock</div>,
}));

import DashboardPage from '../DashboardPage';

const renderPage = () => {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  it('should render without crashing', () => {
    renderPage();
    expect(document.body).toBeInTheDocument();
  });

  it('should render the WhileYouWereGone card', () => {
    renderPage();
    expect(screen.getByTestId('while-you-were-gone')).toBeInTheDocument();
  });

  it("should render Today's Glance card", () => {
    renderPage();
    expect(screen.getByTestId('today-glance-card')).toBeInTheDocument();
  });

  it('should render the ConversationWins card', () => {
    renderPage();
    expect(screen.getByTestId('conversation-wins-card')).toBeInTheDocument();
  });

  it('should render the AgentWorkflow block', () => {
    renderPage();
    expect(screen.getByTestId('agent-workflow-block')).toBeInTheDocument();
  });

  it('should render the WinFeed', () => {
    renderPage();
    expect(screen.getByTestId('win-feed')).toBeInTheDocument();
  });

  it('should render all primary dashboard sections', () => {
    renderPage();
    expect(screen.getByTestId('while-you-were-gone')).toBeInTheDocument();
    expect(screen.getByTestId('today-glance-card')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-wins-card')).toBeInTheDocument();
    expect(screen.getByTestId('agent-workflow-block')).toBeInTheDocument();
    expect(screen.getByTestId('win-feed')).toBeInTheDocument();
  });

  it('should not throw when SubscriptionContext is provided', () => {
    expect(() => renderPage()).not.toThrow();
  });
});
