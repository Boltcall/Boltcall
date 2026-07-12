/**
 * ClassicDashboardGate — surface-wall tests.
 *
 * Verifies the V1 side of the V1/V2 wall: workspaces with v2_enabled = true
 * are redirected out of /dashboard/* to the mapped V2 sibling page, classic
 * workspaces render V1 untouched, and the exempt surfaces (Agency OS, client
 * portal) are never redirected. Mock pattern mirrors smoke.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Mocks (must run before component imports) ─────────────────────────────

const mockAuthValue = {
  user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
  isAuthenticated: true,
  isLoading: false,
};
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

const mockSupabaseMaybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: () => mockSupabaseMaybeSingle(),
          }),
        }),
      }),
    }),
  },
}));

import ClassicDashboardGate, { mapV1PathToV2 } from '../ClassicDashboardGate';
import { resetV2SurfaceCache } from '../v2Surface';

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard/*"
          element={
            <ClassicDashboardGate>
              <div data-testid="v1-content">v1 dashboard</div>
            </ClassicDashboardGate>
          }
        />
        <Route path="/v2" element={<div data-testid="v2-home">v2 home</div>} />
        <Route path="/v2/:page" element={<div data-testid="v2-page">v2 page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  resetV2SurfaceCache();
  mockSupabaseMaybeSingle.mockReset();
  mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('mapV1PathToV2', () => {
  it('maps V1 deep links to their V2 siblings', () => {
    expect(mapV1PathToV2('/dashboard/calls')).toBe('/v2/calls');
    expect(mapV1PathToV2('/dashboard/call-history')).toBe('/v2/calls');
    expect(mapV1PathToV2('/dashboard/analytics')).toBe('/v2/analytics');
    expect(mapV1PathToV2('/dashboard/leads')).toBe('/v2/leads');
    expect(mapV1PathToV2('/dashboard/missed-calls')).toBe('/v2/leads');
    expect(mapV1PathToV2('/dashboard/messages')).toBe('/v2/messages');
    expect(mapV1PathToV2('/dashboard/sms')).toBe('/v2/messages');
    expect(mapV1PathToV2('/dashboard/agents/abc123')).toBe('/v2/agent');
    expect(mapV1PathToV2('/dashboard/knowledge-base')).toBe('/v2/knowledge');
    expect(mapV1PathToV2('/dashboard/integrations')).toBe('/v2/integrations');
    expect(mapV1PathToV2('/dashboard/reputation')).toBe('/v2/reputation');
    expect(mapV1PathToV2('/dashboard/qa/review')).toBe('/v2/qa');
    expect(mapV1PathToV2('/dashboard/settings/plan-billing')).toBe('/v2/settings');
  });

  it('defaults everything else to the V2 home', () => {
    expect(mapV1PathToV2('/dashboard')).toBe('/v2');
    expect(mapV1PathToV2('/dashboard/getting-started')).toBe('/v2');
    expect(mapV1PathToV2('/dashboard/feedback')).toBe('/v2');
  });
});

describe('ClassicDashboardGate', () => {
  it('redirects a V2 workspace from /dashboard to /v2', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: true }, error: null });
    await act(async () => {
      renderAt('/dashboard/getting-started');
    });
    expect(screen.queryByTestId('v1-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('v2-home')).toBeInTheDocument();
  });

  it('redirects a V2 workspace deep link to the V2 sibling page', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: true }, error: null });
    await act(async () => {
      renderAt('/dashboard/calls');
    });
    expect(screen.queryByTestId('v1-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('v2-page')).toBeInTheDocument();
  });

  it('renders V1 for a classic workspace', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: false }, error: null });
    await act(async () => {
      renderAt('/dashboard/getting-started');
    });
    expect(screen.getByTestId('v1-content')).toBeInTheDocument();
  });

  it('never redirects the Agency OS surface, even for a V2 workspace', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: true }, error: null });
    await act(async () => {
      renderAt('/dashboard/agency/queue');
    });
    expect(screen.getByTestId('v1-content')).toBeInTheDocument();
  });

  it('never redirects the client portal, even for a V2 workspace', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: true }, error: null });
    await act(async () => {
      renderAt('/dashboard/client/welcome');
    });
    expect(screen.getByTestId('v1-content')).toBeInTheDocument();
  });
});
