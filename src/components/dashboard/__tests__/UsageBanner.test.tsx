import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Variable mock data for useUsageTracking
let mockUsageData: any = {
  getAllResourceUsages: () => [],
  planTier: 'free',
};

let mockTokenData: any = {
  monthlyAllocation: 1000,
  tokensUsed: 0,
};

vi.mock('../../../hooks/useUsageTracking', () => ({
  useUsageTracking: () => mockUsageData,
}));

vi.mock('../../../contexts/TokenContext', () => ({
  useTokens: () => mockTokenData,
}));

vi.mock('../../../lib/plan-limits', async () => {
  const actual = await vi.importActual('../../../lib/plan-limits');
  return actual;
});

import UsageBanner from '../UsageBanner';

const renderBanner = () => {
  return render(
    <BrowserRouter>
      <UsageBanner />
    </BrowserRouter>
  );
};

describe('UsageBanner', () => {
  beforeEach(() => {
    mockUsageData = {
      getAllResourceUsages: () => [],
      planTier: 'free',
    };
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 0,
    };
  });

  it('should render nothing when no resources are at or approaching limit', () => {
    mockUsageData.getAllResourceUsages = () => [
      { resource: 'ai_voice_minutes', current: 2, limit: 10, percentage: 20, isAtLimit: false, isApproaching: false },
    ];
    renderBanner();
    // No warning banners should be visible
    expect(screen.queryByText(/limit reached/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approaching/)).not.toBeInTheDocument();
  });

  it('should render nothing for enterprise plan', () => {
    mockUsageData = {
      getAllResourceUsages: () => [
        { resource: 'ai_voice_minutes', current: 100, limit: -1, percentage: 0, isAtLimit: true, isApproaching: false },
      ],
      planTier: 'enterprise',
    };
    renderBanner();
    expect(screen.queryByText(/limit reached/)).not.toBeInTheDocument();
  });

  it('should show red banner when shared credits are exhausted', () => {
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 1000,
    };
    renderBanner();
    expect(screen.getByText(/Shared credits exhausted/)).toBeInTheDocument();
    expect(screen.getAllByText(/Upgrade/).length).toBeGreaterThanOrEqual(1);
  });

  it('should show usage numbers in the shared-pool banner', () => {
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 1000,
    };
    renderBanner();
    expect(screen.getByText(/1,000 of 1,000 credits/)).toBeInTheDocument();
  });

  it('should show amber banner when shared credits are running low', () => {
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 850,
    };
    renderBanner();
    expect(screen.getByText(/Shared credits running low/)).toBeInTheDocument();
    expect(screen.getByText(/View Usage/)).toBeInTheDocument();
  });

  it('should still show structural warnings separately', () => {
    mockUsageData.getAllResourceUsages = () => [
      { resource: 'phone_numbers', current: 1, limit: 1, percentage: 100, isAtLimit: true, isApproaching: false },
    ];
    renderBanner();
    expect(screen.getByText(/Phone Numbers limit reached/)).toBeInTheDocument();
  });

  it('should have an Upgrade link pointing to plan-billing', () => {
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 1000,
    };
    renderBanner();
    const upgradeLink = screen.getByText('Upgrade').closest('a');
    expect(upgradeLink).toHaveAttribute('href', '/dashboard/settings/plan-billing');
  });

  it('should dismiss shared-pool banner when X is clicked', () => {
    mockTokenData = {
      monthlyAllocation: 1000,
      tokensUsed: 1000,
    };
    renderBanner();
    expect(screen.getByText(/Shared credits exhausted/)).toBeInTheDocument();

    // Find and click the dismiss button (the X button next to upgrade)
    const dismissButtons = screen.getAllByRole('button');
    const xButton = dismissButtons.find((btn) => btn.querySelector('svg'));
    if (xButton) fireEvent.click(xButton);

    expect(screen.queryByText(/Shared credits exhausted/)).not.toBeInTheDocument();
  });
});
