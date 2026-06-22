import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let authState = {
  user: null as { id: string } | null,
  isLoading: true,
};

const getRetellCallHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    tr: React.forwardRef(({ children, ...props }: any, ref: any) => <tr ref={ref} {...props}>{children}</tr>),
  },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../../lib/retell', () => ({
  getRetellCallHistory: getRetellCallHistoryMock,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'agents') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({
              data: [{ retell_agent_id: 'agent-1' }],
              error: null,
            }),
          }),
        }),
      };
    },
  },
}));

vi.mock('../../../components/ui/loading-skeleton', () => ({
  CallHistorySkeleton: () => <div>Loading skeleton</div>,
}));

vi.mock('../../../components/ui/modal-shell', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

import CallHistoryPage from '../CallHistoryPage';

describe('CallHistoryPage', () => {
  beforeEach(() => {
    authState = { user: null, isLoading: true };
    vi.clearAllMocks();
    getRetellCallHistoryMock.mockResolvedValue({ calls: [] });
  });

  it('waits for auth to settle before fetching call history', async () => {
    const { rerender } = render(<CallHistoryPage />);

    expect(getRetellCallHistoryMock).not.toHaveBeenCalled();

    authState = {
      user: { id: 'user-1' },
      isLoading: false,
    };

    rerender(<CallHistoryPage />);

    await waitFor(() => {
      expect(getRetellCallHistoryMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the loading skeleton while auth is still settling', () => {
    render(<CallHistoryPage />);

    expect(screen.getByText('Loading skeleton')).toBeInTheDocument();
    expect(getRetellCallHistoryMock).not.toHaveBeenCalled();
  });

  it('renders the main stats cards after the user is available', async () => {
    authState = {
      user: { id: 'user-1' },
      isLoading: false,
    };

    render(<CallHistoryPage />);

    await waitFor(() => {
      expect(getRetellCallHistoryMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.queryByText('Avg Duration')).not.toBeInTheDocument();
    expect(screen.queryByText('Call Quality')).not.toBeInTheDocument();
  });
});
