import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SetupClassic from '../SetupClassic';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) =>
        React.forwardRef(({ children, ...props }: any, ref: any) =>
          React.createElement(prop as string, { ...props, ref }, children),
        ),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'owner@example.com' },
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) => {
      const translations: Record<string, string> = {
        'wizard.title': 'Setup Wizard',
        'wizard.stepOf': `Step ${params?.current} of ${params?.total}`,
        'wizard.loading': 'Loading',
        'wizard.back': 'Back',
        'wizard.next': 'Next',
        'wizard.complete': 'Complete',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('SetupClassic', () => {
  it('renders the old wizard setup instead of the agent-led setup page', async () => {
    window.scrollTo = vi.fn();

    render(
      <MemoryRouter initialEntries={['/setup/classic']}>
        <SetupClassic />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Setup Wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.queryByText(/business details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Boltcall setup agent/i)).not.toBeInTheDocument();
  });
});
