import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  authedFetch: vi.fn(),
  provision: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'owner@boltcall.org', name: 'Noam Test' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getUser: (...args: unknown[]) => mocks.getUser(...args) } },
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: (...args: unknown[]) => mocks.authedFetch(...args),
}));

vi.mock('../../../lib/api', () => ({ FUNCTIONS_BASE: '/.netlify/functions' }));

vi.mock('../../../lib/setup/provisionAgentSetup', () => ({
  provisionAgentSetup: (...args: unknown[]) => mocks.provision(...args),
}));

vi.mock('../../../components/setup/SetupGradientBackground', () => ({
  SetupGradientBackground: () => <div data-testid="setup-gradient" />,
}));

// jsdom has no rAF-driven animation loop — AnimatePresence mode="wait" would
// never finish an exit animation, so scenes would never swap. Strip motion.
vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'variants', 'transition', 'whileHover', 'whileTap',
  ]);
  const strip = (props: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (!MOTION_PROPS.has(k)) clean[k] = v;
    }
    return clean;
  };
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          React.forwardRef(
            (
              { children, ...props }: { children?: React.ReactNode } & Record<string, unknown>,
              ref: React.Ref<HTMLElement>,
            ) => React.createElement(tag, { ref, ...strip(props) }, children),
          ),
      },
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

import StartOnboarding from '../StartOnboarding';

describe('StartOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            full_name: 'Noam Yakoby',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      },
    });
    mocks.authedFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
  });

  it('greets the user by their Google first name, then advances to the website scene', async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <StartOnboarding />
      </MemoryRouter>,
    );

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/Welcome to Boltcall Noam/i)).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(3000); });
    vi.useRealTimers();

    expect(
      screen.getByText(/Where does your business live online/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Business website')).toBeInTheDocument();
  });

  it('walks website → intel → pain → voice and launches with extracted data', async () => {
    // Scrape + extract respond instantly so the intel scene resolves.
    mocks.authedFetch.mockImplementation(async (url: string) => {
      if (String(url).includes('scrape-url')) {
        return {
          ok: true,
          json: async () => ({
            title: 'Smith Dental | Family Dentistry',
            description: 'Dental care',
            content: 'We are a dental office offering teeth cleaning and dentist checkups.'.repeat(3),
          }),
        };
      }
      if (String(url).includes('ai-extract-kb')) {
        return {
          ok: true,
          json: async () => ({
            services: [{ name: 'Teeth cleaning', duration: 30, price: 120 }],
            faqs: [{ question: 'Do you take insurance?', answer: 'Yes.' }],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    mocks.provision.mockResolvedValue({});

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StartOnboarding />
      </MemoryRouter>,
    );

    // Skip welcome auto-advance (~2.8s).
    await screen.findByText(/Where does your business live online/i, {}, { timeout: 8000 });

    await user.type(screen.getByLabelText('Business website'), 'smithdental.com');
    await user.click(screen.getByLabelText('Continue'));

    // Intel resolves with extracted profile.
    await screen.findByDisplayValue('Smith Dental', {}, { timeout: 5000 });
    expect(screen.getByDisplayValue('Teeth cleaning')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Looks right/i }));
    expect(screen.getByText(/What.s costing you the most/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /After-hours silence/i }));
    await screen.findByText(/Meet your new first responder/i, {}, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: /Build my agent/i }));
    await screen.findByText(/Building Smith Dental/i);

    expect(mocks.provision).toHaveBeenCalledTimes(1);
    const [, setup] = mocks.provision.mock.calls[0] as [string, Record<string, unknown>];
    expect(setup.businessName).toBe('Smith Dental');
    expect(setup.industry).toBe('dental');
    expect(setup.services).toEqual([{ name: 'Teeth cleaning', duration: 30, price: 120 }]);
    expect(setup.painPoint).toBe('after_hours');
    expect(setup.logoUrl).toBe('https://logo.clearbit.com/smithdental.com');
  });
});
