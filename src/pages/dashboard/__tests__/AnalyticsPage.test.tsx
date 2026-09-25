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

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../contexts/TokenContext', () => ({
  useTokens: () => ({
    totalAvailable: 500,
    tokensUsed: 100,
    monthlyAllocation: 1000,
    isLoading: false,
    bonusBalance: 0,
  }),
}));

// Build a deeply chainable supabase mock
function createDeepChain(resolveWith: any = { data: [], error: null }): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (onResolve: any) => Promise.resolve(resolveWith).then(onResolve);
      }
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => createDeepChain({ data: [], error: null }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

// Mock the dashboard API to return data
vi.mock('../../../lib/dashboardApi', () => ({
  fetchDashboardStats: vi.fn().mockResolvedValue({
    retell: {
      calls_today: 25,
      calls_7d: 150,
      success_rate: 85,
      avg_duration_seconds: 120,
      missed_calls_today: 3,
      total_talk_minutes_today: 45,
      active_agents: 2,
    },
    twilio: {
      sms_sent_today: 10,
      sms_received_today: 5,
      total_phone_numbers: 2,
      phone_numbers: [],
    },
    supabase: {
      total_leads: 100,
      callbacks_total: 30,
      callbacks_pending: 5,
      chats_total: 20,
      chats_active: 3,
      total_workspaces: 1,
    },
  }),
  fetchDailyMetrics: vi.fn().mockResolvedValue([
    { date: '2025-01-01', calls: 10, leads: 5, bookings: 2, sms_sent: 3, success_rate: 80 },
    { date: '2025-01-02', calls: 15, leads: 8, bookings: 3, sms_sent: 5, success_rate: 85 },
  ]),
}));

vi.mock('../../../components/ui/loading-skeleton', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

// Mock KpiTile
vi.mock('../../../components/dashboard/KpiTile', () => ({
  default: ({ title, value }: any) => (
    <div data-testid="kpi-tile">
      <span>{title}</span>
      <span>{String(value)}</span>
    </div>
  ),
}));

// Mock TimeSeriesCard
vi.mock('../../../components/dashboard/TimeSeriesCard', () => ({
  default: () => <div data-testid="time-series-card">Time Series</div>,
}));

// Mock Card
vi.mock('../../../components/ui/Card', () => ({
  default: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
}));

import AnalyticsPage from '../AnalyticsPage';

describe('AnalyticsPage', () => {
  it('should render without crashing', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    // Initially shows loading
    expect(document.body).toBeInTheDocument();
  });

  it('should render date range selector buttons', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    // Wait for data to load
    const sevenDaysBtn = await screen.findByText('7 Days');
    expect(sevenDaysBtn).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('should render refresh button', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    const refreshBtn = await screen.findByText('Refresh');
    expect(refreshBtn).toBeInTheDocument();
  });

  it('should render KPI tiles after loading', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    const kpiTiles = await screen.findAllByTestId('kpi-tile');
    expect(kpiTiles.length).toBeGreaterThanOrEqual(3);
  });

  it('should render Token Usage section', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    const tokenHeader = await screen.findByText('Token Usage');
    expect(tokenHeader).toBeInTheDocument();
  });

  // The admin-only Activity Breakdown card showed fake zeros for real customers and was removed.
  it('does not render the removed Activity Breakdown card', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );
    await screen.findByText('Token Usage');
    expect(screen.queryByText('Activity Breakdown')).not.toBeInTheDocument();
  });
});
