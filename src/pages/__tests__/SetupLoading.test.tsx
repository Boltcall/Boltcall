import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  readPendingAgentSetup: vi.fn(),
  clearPendingAgentSetup: vi.fn(),
  provisionAgentSetup: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../lib/setup/onboarding', () => ({
  readPendingAgentSetup: mocks.readPendingAgentSetup,
  clearPendingAgentSetup: mocks.clearPendingAgentSetup,
}));

vi.mock('../../lib/setup/provisionAgentSetup', () => ({
  provisionAgentSetup: mocks.provisionAgentSetup,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.mockNavigate,
  };
});

import SetupLoading from '../SetupLoading';

describe('SetupLoading', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.readPendingAgentSetup.mockReturnValue({
      businessName: 'Summit Solar',
      websiteUrl: 'https://summitsolar.example',
      industry: 'solar',
      voiceId: '11labs-Dorothy',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '+15551234567',
      createdAt: '2026-06-19T10:00:00.000Z',
    });
    mocks.provisionAgentSetup.mockResolvedValue({
      workspace: { id: 'ws-1' },
      businessProfile: { id: 'bp-1' },
      locationId: 'loc-1',
    });
  });

  it('starts provisioning the saved setup while the loading screen is shown', async () => {
    render(
      <MemoryRouter initialEntries={['/setup/loading']}>
        <SetupLoading />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(mocks.provisionAgentSetup).toHaveBeenCalledWith('user-1', {
        businessName: 'Summit Solar',
        websiteUrl: 'https://summitsolar.example',
        industry: 'solar',
        voiceId: '11labs-Dorothy',
        goal: 'book-appointments',
        tone: 'friendly_concise',
        transferNumber: '+15551234567',
        createdAt: '2026-06-19T10:00:00.000Z',
      }),
    );
    expect(mocks.clearPendingAgentSetup).toHaveBeenCalledTimes(1);
  });
});
