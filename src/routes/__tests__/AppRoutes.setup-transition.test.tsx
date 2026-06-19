import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const routeState = vi.hoisted(() => ({
  initialEntries: ['/setup/loading'],
  suspendDashboardProviders: false,
  suspendTalkToAgentPage: false,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <actual.MemoryRouter initialEntries={routeState.initialEntries}>
        {children}
      </actual.MemoryRouter>
    ),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useLenis', () => ({
  useLenis: vi.fn(),
}));

vi.mock('../../components/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/DashboardProviders', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    if (routeState.suspendDashboardProviders) {
      throw new Promise(() => {});
    }
    return <>{children}</>;
  },
}));

vi.mock('../../contexts/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/seo/AeoGlobalIntro', () => ({
  default: () => null,
}));

vi.mock('../../components/BlogSchemaWrapper', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../pages/Home', () => ({
  default: () => <div>Home</div>,
}));

vi.mock('../../pages/GlassDemo', () => ({
  default: () => <div>Glass Demo</div>,
}));

vi.mock('../../pages/Setup', () => ({
  default: () => <div>Classic setup</div>,
}));

vi.mock('../../pages/SetupLoading', () => ({
  default: () => <div>Setup loading page</div>,
}));

vi.mock('../../pages/setup/TalkToAgentPage', () => ({
  default: () => {
    if (routeState.suspendTalkToAgentPage) {
      throw new Promise(() => {});
    }
    return <div>Talk to agent page</div>;
  },
}));

import AppRoutes from '../AppRoutes';

describe('AppRoutes post-setup transitions', () => {
  beforeEach(() => {
    routeState.initialEntries = ['/setup/loading'];
    routeState.suspendDashboardProviders = false;
    routeState.suspendTalkToAgentPage = false;
    window.scrollTo = vi.fn();
  });

  it('shows a visible loading state while setup loading route waits on dashboard providers', async () => {
    routeState.initialEntries = ['/setup/loading'];
    routeState.suspendDashboardProviders = true;

    render(<AppRoutes />);

    expect(await screen.findByText(/loading setup/i)).toBeInTheDocument();
  });

  it('shows a visible loading state while talk-to-agent route is still loading', async () => {
    routeState.initialEntries = ['/setup/talk-to-agent'];
    routeState.suspendTalkToAgentPage = true;

    render(<AppRoutes />);

    expect(await screen.findByText(/loading setup/i)).toBeInTheDocument();
  });
});
