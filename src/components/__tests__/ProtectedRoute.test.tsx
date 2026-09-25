/**
 * ProtectedRoute — setup-completion gate (F7).
 *
 * Setup is "done" only when workspaces.setup_completed is true, or (legacy
 * fallback) a real inbound agent already exists. A business_profiles row
 * alone is NOT enough — it's written before agent provisioning, so a
 * mid-provisioning failure used to leave the user stuck on an empty classic
 * dashboard with no way back to /setup. Mock pattern mirrors
 * classic-dashboard-gate.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockAuthValue = {
  user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
  isAuthenticated: true,
  isLoading: false,
};
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

const mockWorkspaceMaybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
const mockAgentsLimit = vi.fn(() => Promise.resolve({ data: [], error: null }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockWorkspaceMaybeSingle(),
            }),
          }),
        };
      }
      // agents legacy-fallback query
      return {
        select: () => ({
          eq: () => ({
            or: () => ({
              not: () => ({
                limit: () => mockAgentsLimit(),
              }),
            }),
          }),
        }),
      };
    },
  },
}));

import ProtectedRoute from '../ProtectedRoute';

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div data-testid="dashboard-content">dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route path="/setup" element={<div data-testid="setup-page">setup</div>} />
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  mockWorkspaceMaybeSingle.mockReset();
  mockAgentsLimit.mockReset();
  mockWorkspaceMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockAgentsLimit.mockResolvedValue({ data: [], error: null });
});

describe('ProtectedRoute setup gate', () => {
  it('lets the user through once workspaces.setup_completed is true', async () => {
    mockWorkspaceMaybeSingle.mockResolvedValue({ data: { setup_completed: true }, error: null });
    await act(async () => {
      renderAt('/dashboard');
    });
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });

  it('sends the user back to /setup when setup_completed is false and no agent exists', async () => {
    mockWorkspaceMaybeSingle.mockResolvedValue({ data: { setup_completed: false }, error: null });
    mockAgentsLimit.mockResolvedValue({ data: [], error: null });
    await act(async () => {
      renderAt('/dashboard');
    });
    expect(screen.getByTestId('setup-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();
  });

  it('lets a legacy workspace through when setup_completed is false but an inbound agent already exists', async () => {
    mockWorkspaceMaybeSingle.mockResolvedValue({ data: { setup_completed: false }, error: null });
    mockAgentsLimit.mockResolvedValue({ data: [{ id: 'agent-1' }], error: null });
    await act(async () => {
      renderAt('/dashboard');
    });
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });
});
