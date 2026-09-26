import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getRetellCallHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../lib/dashboardApi', () => ({
  fetchBookedRevenueMTD: () => Promise.resolve({ totalCents: 0, bookings: 0, valuedBookings: 0 }),
}));

vi.mock('../../../lib/retell', () => ({
  getRetellCallHistory: getRetellCallHistoryMock,
}));

// One connected-but-short call (missed) + one real call (handled), matching
// the same not_connected/error/short-call bucket MissedCallsPage uses.
getRetellCallHistoryMock.mockResolvedValue({
  calls: [
    { call_id: 'c1', call_status: 'ended', duration_ms: 5000 },
    { call_id: 'c2', call_status: 'ended', duration_ms: 60000 },
    { call_id: 'c3', call_status: 'not_connected' },
  ],
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'agents') {
        return {
          select: () => ({
            eq: () => ({
              not: () => Promise.resolve({ data: [{ retell_agent_id: 'agent-1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'leads') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 5, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

import TodayGlanceCard from '../TodayGlanceCard';

describe('TodayGlanceCard', () => {
  it('shows per-workspace call counts (missed vs handled) and real leads-today, not hardcoded zeros', async () => {
    render(<TodayGlanceCard />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Missed today')).toBeInTheDocument();
    });

    expect(getRetellCallHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ agentIds: ['agent-1'] })
    );

    // 1 short (missed) + 1 not_connected (missed) = 2; 1 real call handled; 5 leads today.
    expect(screen.getByText('2')).toBeInTheDocument(); // Missed today value
    expect(screen.getByText('1')).toBeInTheDocument(); // Handled by AI value
    expect(screen.getByText('5')).toBeInTheDocument(); // Leads today value
  });
});
