import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const orderMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const authedFetchMock = vi.hoisted(() => vi.fn());

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

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: (...args: unknown[]) => authedFetchMock(...args),
}));

vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
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
    authedFetchMock.mockImplementation(async (url: unknown) => {
      if (url === '/.netlify/functions/saas-v2-leads?limit=50') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            hot_lead: {
              id: 'lead-1',
              name: 'Alice Johnson',
              source: 'website_form',
              captured_at: '2026-06-17T10:00:00.000Z',
              ai_summary: 'Asked for a same-day plumbing estimate.',
              status: 'new',
              next_action: 'Call in 2 min',
              why_hot: 'High-intent lead with urgent job timing.',
            },
            leads: [
              {
                id: 'lead-1',
                name: 'Alice Johnson',
                source: 'website_form',
                captured_at: '2026-06-17T10:00:00.000Z',
                ai_summary: 'Asked for a same-day plumbing estimate.',
                status: 'new',
                next_action: 'Call in 2 min',
              },
            ],
            total: 1,
          }),
          text: async () => '',
        };
      }

      if (url === '/.netlify/functions/saas-v2-lead-status-flow?period=30d') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            period: '30d',
            period_label: 'Last 30 days',
            comparison_label: 'previous last 30 days',
            filtered_total: 1,
            series: [
              { label: 'Week 1', new: 1, contacted: 0, booked: 0, lost: 0 },
              { label: 'Week 2', new: 0, contacted: 0, booked: 0, lost: 0 },
              { label: 'Week 3', new: 0, contacted: 0, booked: 0, lost: 0 },
              { label: 'Week 4', new: 0, contacted: 0, booked: 0, lost: 0 },
              { label: 'Week 5', new: 0, contacted: 0, booked: 0, lost: 0 },
              { label: 'Week 6', new: 0, contacted: 0, booked: 0, lost: 0 },
            ],
            metrics: [
              { key: 'new', current_total: 1, previous_total: 0, delta: 100 },
              { key: 'contacted', current_total: 0, previous_total: 0, delta: 0 },
              { key: 'booked', current_total: 0, previous_total: 0, delta: 0 },
              { key: 'lost', current_total: 0, previous_total: 0, delta: 0 },
            ],
          }),
          text: async () => '',
        };
      }

      throw new Error(`Unexpected authedFetch URL: ${String(url)}`);
    });
  });

  it('fetches leads once and settles without re-triggering the loading state', async () => {
    render(<SpeedToLeadPage />);

    expect(screen.getByText('Loading leads...')).toBeInTheDocument();

    await waitFor(() => {
      expect(orderMock).toHaveBeenCalledTimes(1);
    });

    expect(orderMock).toHaveBeenCalledTimes(1);
  });

  it('renders the backend-enriched V1 leads table with summary and next action columns', async () => {
    render(<SpeedToLeadPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryByText('ID')).not.toBeInTheDocument();
    expect(screen.getByText('Asked for a same-day plumbing estimate.')).toBeInTheDocument();
    expect(screen.getByText('Call in 2 min')).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      'Name',
      'Source',
      'Captured',
      'Summary',
      'Status',
      'Next Action',
    ]);
  });

  it('renders the backend lead status flow card as a visible second graph on V1', async () => {
    render(<SpeedToLeadPage />);

    await waitFor(() => {
      expect(screen.getByText('Lead status flow')).toBeInTheDocument();
    });

    expect(screen.getByText('Backend lead velocity snapshot')).toBeInTheDocument();
    expect(screen.getByText('Lead Performance')).toBeInTheDocument();
    expect(authedFetchMock).toHaveBeenCalledWith(
      '/.netlify/functions/saas-v2-leads?limit=50',
    );
    expect(authedFetchMock).toHaveBeenCalledWith(
      '/.netlify/functions/saas-v2-lead-status-flow?period=30d',
    );
  });
});
