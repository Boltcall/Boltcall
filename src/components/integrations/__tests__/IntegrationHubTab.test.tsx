import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Cal.com connects via calcom-webhook.ts (registers a real Cal.com webhook)
// and its connected state lives in business_features.reminders_config, not
// the generic user_integrations table integration-sync reads/writes. This
// test guards the merge that makes the UI reflect the real source of truth.

const authedFetchMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: authedFetchMock,
}));

vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

vi.mock('../../ui/loading-skeleton', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { reminders_config: { cal_connected: true } }, error: null }),
        }),
      }),
    }),
  },
}));

import IntegrationHubTab from '../IntegrationHubTab';

describe('IntegrationHubTab — Cal.com connection source of truth', () => {
  it('shows Cal.com as Connected when business_features.reminders_config.cal_connected is true, even though integration-sync has no calcom row', async () => {
    authedFetchMock.mockResolvedValue({
      json: () => Promise.resolve({ integrations: [] }), // integration-sync: no calcom entry
    });

    render(<IntegrationHubTab />);

    await waitFor(() => expect(screen.getByText('Cal.com')).toBeInTheDocument());
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
  });
});
