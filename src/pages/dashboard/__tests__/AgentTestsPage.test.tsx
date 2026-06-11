import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const authedFetchMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: authedFetchMock,
}));

vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

vi.mock('../../../components/ui/loading-skeleton', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

function makeThenable<T>(value: T) {
  return {
    then: (onResolve: (value: T) => unknown) => Promise.resolve(value).then(onResolve),
  };
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'agents') {
        return {
          select: () => ({
            eq: () => ({
              not: () => makeThenable({
                data: [{
                  id: 'agent-row-1',
                  name: 'Front Desk Agent',
                  retell_agent_id: 'retell-agent-1',
                  agent_type: 'inbound',
                }],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'agent_test_runs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => makeThenable({ data: [], error: null }),
              }),
            }),
          }),
          insert: insertMock,
        };
      }

      return {
        select: () => makeThenable({ data: [], error: null }),
        insert: insertMock,
      };
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

import AgentTestsPage from '../AgentTestsPage';

describe('AgentTestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ data: null, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        agentId: 'retell-agent-1',
        summary: { total: 1, passed: 1, failed: 0, unknown: 0 },
        results: [],
      }),
    }));
    authedFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        agentId: 'retell-agent-1',
        summary: { total: 1, passed: 1, failed: 0, unknown: 0 },
        results: [],
      }),
    });
  });

  it('runs protected agent tests through authenticated fetch', async () => {
    render(<AgentTestsPage />);

    const runButton = await screen.findByRole('button', { name: /run tests/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(authedFetchMock).toHaveBeenCalledWith('/.netlify/functions/agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-tests', agentId: 'retell-agent-1' }),
      });
    });
  });
});
