import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.fn();
const mockSignInWithGoogle = vi.fn().mockRejectedValue(new Error('OAuth redirect initiated'));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.forwardRef(({ children, ...p }: any, ref: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safe: any = {};
        for (const [k, v] of Object.entries(p)) {
          if (
            typeof v !== 'object' &&
            typeof v !== 'function' &&
            !k.startsWith('while') &&
            !k.startsWith('animate') &&
            !k.startsWith('initial') &&
            !k.startsWith('exit') &&
            !k.startsWith('transition') &&
            !k.startsWith('variants') &&
            k !== 'layout' &&
            k !== 'layoutId'
          ) {
            safe[k] = v;
          }
        }
        return React.createElement(prop as string, { ...safe, ref }, children);
      }),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockUser = { current: null as null | { id: string; email: string } };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser.current,
    isAuthenticated: !!mockUser.current,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    signInWithGoogle: mockSignInWithGoogle,
    signInWithMicrosoft: vi.fn(),
    signInWithFacebook: vi.fn(),
  }),
}));

vi.mock('../../contexts/SubscriptionContext', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SubscriptionProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../contexts/TokenContext', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TokenProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'fresh-user-id' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('../../lib/database', () => ({
  createUserWorkspaceAndProfile: vi.fn().mockResolvedValue({
    workspace: { id: 'ws-1' },
    businessProfile: { id: 'bp-1' },
  }),
}));

vi.mock('../../lib/webhooks', () => ({
  createAgentAndKnowledgeBase: vi.fn().mockResolvedValue({ kb_folder_id: 'kb-1' }),
}));

vi.mock('../../lib/locations', () => ({
  LocationService: {
    create: vi.fn().mockResolvedValue({ id: 'loc-1' }),
  },
}));

vi.mock('../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never;

import Setup from '../Setup';

const TEST_TIMEOUT_MS = 10000;

const renderSetup = () =>
  render(
    <MemoryRouter initialEntries={['/setup']}>
      <Setup />
    </MemoryRouter>,
  );

describe('Setup flow', () => {
  beforeEach(() => {
    mockUser.current = null;
    mockNavigate.mockReset();
    mockSignInWithGoogle.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders publicly and starts on the business step', async () => {
    renderSetup();

    expect(await screen.findByText(/business details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  }, TEST_TIMEOUT_MS);

  it('saves the setup draft before starting Google auth', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.type(screen.getByLabelText(/Business Name/i), 'Summit Solar');
    await user.type(screen.getByLabelText(/Website/i), 'https://summitsolar.example');
    await user.selectOptions(screen.getByLabelText(/Industry/i), 'solar');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await screen.findByLabelText(/Voice/i);
    await user.selectOptions(screen.getByLabelText(/Voice/i), '11labs-Grace');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.click(await screen.findByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1));

    const raw = window.localStorage.getItem('boltcall_pending_agent_setup');
    expect(raw).toBeTruthy();
    expect(raw).toContain('"businessName":"Summit Solar"');
    expect(raw).toContain('"websiteUrl":"https://summitsolar.example"');
    expect(raw).toContain('"industry":"solar"');
    expect(raw).toContain('"voiceId":"11labs-Grace"');
  }, TEST_TIMEOUT_MS);
});
