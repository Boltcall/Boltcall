import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const {
  mockNavigate,
  mockGetSession,
  mockMaybeSingle,
  mockConsumePendingAuthRedirect,
  mockReadPendingAgentSetup,
  mockClearPendingAgentSetup,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetSession: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockConsumePendingAuthRedirect: vi.fn(),
  mockReadPendingAgentSetup: vi.fn(),
  mockClearPendingAgentSetup: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/utils', () => ({
  updateMetaDescription: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  },
}));

vi.mock('../../lib/authRedirect', () => ({
  consumePendingAuthRedirect: mockConsumePendingAuthRedirect,
}));

vi.mock('../../lib/setup/onboarding', () => ({
  readPendingAgentSetup: mockReadPendingAgentSetup,
  clearPendingAgentSetup: mockClearPendingAgentSetup,
}));

import AuthCallback from '../AuthCallback';

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockConsumePendingAuthRedirect.mockReturnValue(null);
    mockReadPendingAgentSetup.mockReturnValue(null);
  });

  it('uses the pending auth redirect when OAuth returns from signup', async () => {
    mockConsumePendingAuthRedirect.mockReturnValue('/setup');

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true });
    });
  });

  it('falls back to the setup entry for a user without a business profile', async () => {
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true });
    });
  });

  it('sends existing profiled users to the dashboard when no setup redirect is pending', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'profile-1' } });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockClearPendingAgentSetup).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
