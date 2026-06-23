import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 112, height: 80 }}>
        {children}
      </div>
    ),
  };
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import KpiTile from '../KpiTile';

describe('KpiTile', () => {
  const defaultProps = {
    title: 'Total Calls',
    value: 1234,
    delta: 12.5,
    sparkline: [10, 20, 15, 25, 30, 22, 35],
  };

  it('should render without crashing', () => {
    render(<KpiTile {...defaultProps} />);
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
  });

  it('should display the title', () => {
    render(<KpiTile {...defaultProps} />);
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
  });

  it('should format number values with locale formatting', () => {
    render(<KpiTile {...defaultProps} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should display string values as-is', () => {
    render(<KpiTile {...defaultProps} value="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should display positive delta with percentage', () => {
    render(<KpiTile {...defaultProps} delta={12.5} />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('should display negative delta with percentage', () => {
    render(<KpiTile {...defaultProps} delta={-5.3} />);
    expect(screen.getByText('5.3%')).toBeInTheDocument();
  });

  it('should keep the metric visible for positive deltas', () => {
    render(<KpiTile {...defaultProps} delta={10} />);
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
  });

  it('should keep the metric visible for negative deltas', () => {
    render(<KpiTile {...defaultProps} delta={-10} />);
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
  });

  it('should format percentage values', () => {
    render(<KpiTile {...defaultProps} value={0.856} format="percentage" />);
    expect(screen.getByText('85.6%')).toBeInTheDocument();
  });

  it('should format currency values', () => {
    render(<KpiTile {...defaultProps} value={5000} format="currency" />);
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('should format time values', () => {
    render(<KpiTile {...defaultProps} value={45} format="time" />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('should render sparkline SVG when data has 2+ points', () => {
    const { container } = render(<KpiTile {...defaultProps} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('should not render sparkline when data has fewer than 2 points', () => {
    const { container } = render(<KpiTile {...defaultProps} sparkline={[5]} />);
    expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<KpiTile {...defaultProps} className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('should handle zero delta', () => {
    render(<KpiTile {...defaultProps} delta={0} />);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });
});
