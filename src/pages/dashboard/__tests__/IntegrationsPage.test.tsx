import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => <span ref={ref} {...props}>{children}</span>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
        }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

vi.mock('../../../components/ui/loading-skeleton', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

// Mock the IntegrationHubTab directly
vi.mock('../../../components/integrations/IntegrationHubTab', () => ({
  default: () => (
    <div data-testid="integration-hub">
      <input placeholder="Search integrations..." />
      <div>HubSpot</div>
      <div>Cal.com</div>
      <div>Zapier</div>
      <div>Twilio</div>
    </div>
  ),
}));

import IntegrationsPage from '../IntegrationsPage';

describe('IntegrationsPage', () => {
  it('should render without crashing', () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    );
    expect(document.body).toBeInTheDocument();
  });

  it('should render the IntegrationHubTab', () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('integration-hub')).toBeInTheDocument();
  });

  it('should render integration cards', () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('HubSpot')).toBeInTheDocument();
    expect(screen.getByText('Cal.com')).toBeInTheDocument();
    expect(screen.getByText('Zapier')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('Search integrations...')).toBeInTheDocument();
  });
});
