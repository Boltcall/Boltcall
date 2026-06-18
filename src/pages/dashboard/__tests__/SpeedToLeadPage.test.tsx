import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const orderMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'leads') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            order: orderMock,
          }),
        }),
      };
    },
  },
}));

import SpeedToLeadPage from '../SpeedToLeadPage';

describe('SpeedToLeadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'lead-1',
          name: 'Alice Johnson',
          phone: '+1 555 000 1111',
          email: 'alice@example.com',
          source: 'website_form',
          status: 'new',
          created_at: '2026-06-17T10:00:00.000Z',
        },
      ],
      error: null,
    });
  });

  it('fetches leads once and settles without re-triggering the loading state', async () => {
    render(<SpeedToLeadPage />);

    expect(screen.getByText('Loading leads...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading leads...')).not.toBeInTheDocument();
    expect(orderMock).toHaveBeenCalledTimes(1);
  });

  it('shows name before status and removes the id column from the lead table', async () => {
    render(<SpeedToLeadPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryByText('ID')).not.toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Name', 'Status', 'Source', 'Date']);
  });
});
