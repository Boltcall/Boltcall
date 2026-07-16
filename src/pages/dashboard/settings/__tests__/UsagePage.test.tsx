import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../../contexts/TokenContext', () => ({
  useTokens: () => ({
    totalAvailable: 500,
    tokensUsed: 200,
    monthlyAllocation: 1000,
    bonusBalance: 50,
    isLoading: false,
  }),
}));

vi.mock('../../../../hooks/useUsageTracking', () => ({
  useUsageTracking: () => ({
    trend: [],
    isLoading: false,
    planTier: 'starter',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    getAllResourceUsages: () => [
      { resource: 'ai_voice_minutes', current: 50, limit: 100, percentage: 50, isAtLimit: false, isApproaching: false },
      { resource: 'ai_chat_messages', current: 250, limit: 500, percentage: 50, isAtLimit: false, isApproaching: false },
      { resource: 'sms_sent', current: 100, limit: 200, percentage: 50, isAtLimit: false, isApproaching: false },
      { resource: 'phone_numbers', current: 1, limit: 1, percentage: 100, isAtLimit: true, isApproaching: false },
      { resource: 'team_members', current: 1, limit: 1, percentage: 100, isAtLimit: true, isApproaching: false },
      { resource: 'kb_storage_mb', current: 10, limit: 100, percentage: 10, isAtLimit: false, isApproaching: false },
    ],
    refresh: vi.fn(),
  }),
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
            }),
          }),
          gte: () => ({
            then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
          }),
          then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
        }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

vi.mock('../../../../lib/plan-limits', async () => {
  const actual = await vi.importActual('../../../../lib/plan-limits');
  return actual;
});

vi.mock('../../../../lib/tokens', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/tokens')>('../../../../lib/tokens');
  return actual;
});

vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => null,
}));

vi.mock('../../../../components/dashboard/UsageBar', () => ({
  default: ({ label, current, limit }: any) => (
    <div data-testid="usage-bar">
      <span>{label}</span>
      <span>{current}/{limit}</span>
    </div>
  ),
}));

vi.mock('../../../../components/dashboard/UsageLimitModal', () => ({
  default: () => null,
}));

vi.mock('../../../../components/ui/loading-skeleton', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

import UsagePage from '../UsagePage';

describe('UsagePage', () => {
  it('should render without crashing', () => {
    render(
      <MemoryRouter>
        <UsagePage />
      </MemoryRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render usage bars', () => {
    render(
      <MemoryRouter>
        <UsagePage />
      </MemoryRouter>
    );
    const usageBars = screen.getAllByTestId('usage-bar');
    expect(usageBars.length).toBeGreaterThanOrEqual(1);
  });

  it('should display the page content', () => {
    render(
      <MemoryRouter>
        <UsagePage />
      </MemoryRouter>
    );
    // Page should have meaningful content
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });
});
