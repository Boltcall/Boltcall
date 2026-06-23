import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import OverviewMetricCard from '../OverviewMetricCard';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
  };
});

describe('OverviewMetricCard', () => {
  it('renders a numeric value even when no explicit chartData is provided', () => {
    const { container } = render(
      <OverviewMetricCard label="Total Leads" value={12} badgeTone="positive" chartData={[]} />,
    );

    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('uses comparisonValue as the baseline series when provided', () => {
    render(
      <OverviewMetricCard
        label="Calls answered"
        value={9}
        comparisonValue={4}
        badgeTone="positive"
        chartData={[]}
      />,
    );

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
  });
});
