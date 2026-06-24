import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthRedirectRecovery from '../AuthRedirectRecovery';

const mocks = vi.hoisted(() => ({
  readPendingAuthRedirect: vi.fn(),
  clearPendingAuthRedirect: vi.fn(),
  isAuthenticated: false,
  isLoading: false,
}));

const mockNavigate = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mocks.isAuthenticated,
    isLoading: mocks.isLoading,
  }),
}));

vi.mock('../../../lib/authRedirect', () => ({
  readPendingAuthRedirect: mocks.readPendingAuthRedirect,
  clearPendingAuthRedirect: mocks.clearPendingAuthRedirect,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthRedirectRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readPendingAuthRedirect.mockReturnValue(null);
    mocks.isAuthenticated = false;
    mocks.isLoading = false;
    window.location.hash = '';
  });

  it('redirects authenticated users from the homepage to the pending auth destination', async () => {
    mocks.isAuthenticated = true;
    mocks.readPendingAuthRedirect.mockReturnValue('/setup');

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<AuthRedirectRecovery />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.clearPendingAuthRedirect).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true });
    });
  });

  it('shows a blocking recovery state while replaying a saved auth redirect', () => {
    mocks.isAuthenticated = true;
    mocks.readPendingAuthRedirect.mockReturnValue('/setup');

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<AuthRedirectRecovery />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent(/continuing setup/i);
  });

  it('blocks the recoverable page while auth is still resolving', () => {
    mocks.isLoading = true;
    mocks.readPendingAuthRedirect.mockReturnValue('/setup');

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<AuthRedirectRecovery />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent(/continuing setup/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears the pending redirect once the user is already on the intended setup flow', async () => {
    mocks.isAuthenticated = true;
    mocks.readPendingAuthRedirect.mockReturnValue('/setup');

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route path="*" element={<AuthRedirectRecovery />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.clearPendingAuthRedirect).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
