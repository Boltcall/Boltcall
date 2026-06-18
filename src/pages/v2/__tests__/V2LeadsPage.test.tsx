import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const authedFetchMock = vi.fn();

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: (...args: unknown[]) => authedFetchMock(...args),
}));

vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

import V2LeadsPage from '../V2LeadsPage';

describe('V2LeadsPage', () => {
  beforeEach(() => {
    authedFetchMock.mockReset();
  });

  it('renders the lead status flow card from backend aggregate data when leads are available', async () => {
    authedFetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          hot_lead: null,
          total: 4,
          leads: [
            {
              id: 'lead-1',
              name: 'Alice Plumbing',
              source: 'Google Ads',
              captured_at: '2026-06-17T10:00:00.000Z',
              ai_summary: 'Asked for a same-day plumbing estimate.',
              status: 'new',
              next_action: 'Call in 2 min',
            },
            {
              id: 'lead-2',
              name: 'Bay Dental',
              source: 'Website',
              captured_at: '2026-06-16T12:00:00.000Z',
              ai_summary: 'Requested a whitening appointment.',
              status: 'contacted',
              next_action: 'Send follow-up text',
            },
            {
              id: 'lead-3',
              name: 'Cedar HVAC',
              source: 'Facebook',
              captured_at: '2026-06-15T09:30:00.000Z',
              ai_summary: 'Needs emergency AC service.',
              status: 'booked',
              next_action: 'Confirm appointment',
            },
            {
              id: 'lead-4',
              name: 'Delta Roofing',
              source: 'Referral',
              captured_at: '2026-06-14T14:45:00.000Z',
              ai_summary: 'Requested a roof inspection quote.',
              status: 'lost',
              next_action: 'Archive lead',
            },
          ],
        }),
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          period: '30d',
          period_label: 'Last 30 days',
          comparison_label: 'previous last 30 days',
          filtered_total: 4,
          series: [
            { label: 'Week 1', new: 4, contacted: 1, booked: 0, lost: 0 },
            { label: 'Week 2', new: 2, contacted: 2, booked: 1, lost: 0 },
            { label: 'Week 3', new: 1, contacted: 1, booked: 2, lost: 0 },
            { label: 'Week 4', new: 0, contacted: 1, booked: 1, lost: 1 },
            { label: 'Week 5', new: 0, contacted: 0, booked: 2, lost: 1 },
            { label: 'Week 6', new: 0, contacted: 0, booked: 1, lost: 2 },
          ],
          metrics: [
            { key: 'new', current_total: 7, previous_total: 3, delta: 133 },
            { key: 'contacted', current_total: 5, previous_total: 4, delta: 25 },
            { key: 'booked', current_total: 7, previous_total: 5, delta: 40 },
            { key: 'lost', current_total: 4, previous_total: 2, delta: 100 },
          ],
        }),
        text: async () => '',
      });

    render(
      <MemoryRouter>
        <V2LeadsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lead status flow')).toBeInTheDocument();
    });

    const flowCard = screen.getByText('Lead status flow').closest('section');
    expect(flowCard).not.toBeNull();

    const flowCardQueries = within(flowCard as HTMLElement);
    await waitFor(() => {
      expect(authedFetchMock).toHaveBeenNthCalledWith(
        2,
        '/.netlify/functions/saas-v2-lead-status-flow?period=30d',
      );
      expect(flowCardQueries.getByText('New')).toBeInTheDocument();
      expect(flowCardQueries.getByText('Booked')).toBeInTheDocument();
      const comparisonRows = flowCardQueries.getAllByText(/previous last 30 days/i);
      expect(comparisonRows.length).toBe(4);
      expect(comparisonRows[0].parentElement).toHaveTextContent('7');
    });
  });
});
