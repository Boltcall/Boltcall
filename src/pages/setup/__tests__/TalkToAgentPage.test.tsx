import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  authedFetch: vi.fn(),
  queryCalls: [] as Array<{ method: string; args: unknown[] }>,
  startCall: vi.fn(),
  stopCall: vi.fn(),
  on: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'owner@boltcall.org' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: (...args: unknown[]) => mocks.authedFetch(...args),
}));

vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

vi.mock('../../../components/setup/SetupGradientBackground', () => ({
  SetupGradientBackground: () => <div data-testid="setup-gradient" />,
}));

vi.mock('../../../components/ui/siri-orb', () => ({
  default: () => <div data-testid="voice-orb" />,
}));

function createAgentQuery() {
  const result = Promise.resolve({
    data: [
      {
        id: 'agent-row-1',
        retell_agent_id: 'retell-agent-1',
        name: 'Boltcall Agent',
        agent_type: 'inbound',
        workspace_id: 'workspace-1',
        created_at: '2026-06-21T00:00:00.000Z',
      },
    ],
    error: null,
  });

  const chain: any = {
    select: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'select', args });
      return chain;
    },
    eq: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'eq', args });
      return chain;
    },
    or: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'or', args });
      return chain;
    },
    not: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'not', args });
      return chain;
    },
    order: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'order', args });
      return chain;
    },
    limit: (...args: unknown[]) => {
      mocks.queryCalls.push({ method: 'limit', args });
      return chain;
    },
    then: result.then.bind(result),
    catch: result.catch.bind(result),
    finally: result.finally.bind(result),
  };
  return chain;
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mocks.queryCalls.push({ method: 'from', args: [table] });
      return createAgentQuery();
    },
  },
}));

vi.mock('retell-client-js-sdk', () => ({
  RetellWebClient: class {
    on = mocks.on;
    startCall = mocks.startCall;
    stopCall = mocks.stopCall;
  },
}));

import TalkToAgentPage from '../TalkToAgentPage';

describe('TalkToAgentPage', () => {
  beforeEach(() => {
    mocks.queryCalls.length = 0;
    mocks.navigate.mockReset();
    mocks.authedFetch.mockReset();
    mocks.startCall.mockReset();
    mocks.stopCall.mockReset();
    mocks.on.mockReset();

    mocks.startCall.mockResolvedValue(undefined);
    mocks.authedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access_token: 'web-call-token' }),
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  it('starts the web call with the signed-in users own callable inbound agent', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <TalkToAgentPage />
        </MemoryRouter>,
      );
    });

    await waitFor(() => expect(mocks.startCall).toHaveBeenCalledWith({ accessToken: 'web-call-token' }));

    expect(mocks.queryCalls).toContainEqual({ method: 'from', args: ['agents'] });
    expect(mocks.queryCalls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
    expect(mocks.queryCalls).toContainEqual({ method: 'not', args: ['retell_agent_id', 'is', null] });
    expect(mocks.authedFetch).toHaveBeenCalledWith(
      '/.netlify/functions/retell-agents',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'create_web_call', agent_id: 'retell-agent-1' }),
      }),
    );
    expect(screen.getByText(/Your agent is almost ready/i)).toBeInTheDocument();
  });

  it('sends skip to the main dashboard so the setup completion popup can open', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <TalkToAgentPage />
        </MemoryRouter>,
      );
    });

    await user.click(screen.getByRole('button', { name: /skip & enter dashboard/i }));

    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard?setupCompleted=true', { replace: true });
  });
});
