/**
 * Speed-to-Lead funnel flow tests.
 * Tests the user journey: enter URL → store updates → results stored.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useSpeedTestStore } from '../../stores/speedTestStore';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, prop) =>
      React.forwardRef(({ children, ...p }: any, ref: any) => {
        const safe: any = {};
        for (const [k, v] of Object.entries(p)) {
          if (typeof v !== 'object' && typeof v !== 'function' && !k.startsWith('while') &&
              !k.startsWith('animate') && !k.startsWith('initial') && !k.startsWith('exit') &&
              !k.startsWith('transition') && !k.startsWith('variants') && k !== 'layout' && k !== 'layoutId') {
            safe[k] = v;
          }
        }
        return React.createElement(prop as string, { ...safe, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => 0,
  useSpring: () => ({ set: vi.fn(), get: () => 0 }),
  useInView: () => true,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/speedTest', () => ({
  runSpeedTest: vi.fn().mockResolvedValue({
    loadingTime: 2.1,
    mobileScore: 72,
    desktopScore: 89,
    keyIssues: ['Large images'],
    status: 'average' as const,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en', changeLanguage: vi.fn() } }),
  Trans: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('lenis', () => ({ default: class { destroy() {} raf() {} } }));
vi.mock('@lottiefiles/dotlottie-react', () => ({ DotLottieReact: () => null }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
const gsapInstance = { registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline: () => ({ to: vi.fn(), fromTo: vi.fn(), kill: vi.fn(), set: vi.fn() }) };
vi.mock('gsap', () => ({ default: gsapInstance, gsap: gsapInstance }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: vi.fn(), refresh: vi.fn(), getAll: () => [], kill: vi.fn() } }));
vi.mock('@gsap/react', () => ({ useGSAP: (cb: any) => { try { cb(); } catch {} } }));
vi.mock('../../components/TalkToAgentModal', () => ({ default: () => null }));

// Mock global fetch for the webhook call
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ score: 85 }),
});

import SpeedTestLanding from '../speed-test/SpeedTestLanding';

describe('Speed-to-Lead funnel flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSpeedTestStore.getState().reset();
  });

  it('renders the landing page with health check heading', () => {
    render(<MemoryRouter><SpeedTestLanding /></MemoryRouter>);
    const headings = screen.getAllByText(/Website Health Check/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('has a URL input and submit button', () => {
    render(<MemoryRouter><SpeedTestLanding /></MemoryRouter>);
    const input = screen.getByPlaceholderText(/enter your website url/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run health check/i })).toBeInTheDocument();
  });

  it('updates store URL when user types and submits', async () => {
    render(<MemoryRouter><SpeedTestLanding /></MemoryRouter>);

    const input = screen.getByPlaceholderText(/enter your website url/i);
    // Use fireEvent for controlled input (faster and more reliable than userEvent.type)
    fireEvent.change(input, { target: { value: 'example.com' } });

    const submitBtn = screen.getByRole('button', { name: /run health check/i });
    fireEvent.click(submitBtn);

    // Store should have the URL (with https:// prepended)
    await waitFor(() => {
      const url = useSpeedTestStore.getState().url;
      expect(url).toContain('example.com');
    });
  });

  it('stores results and navigates to report after test completes', async () => {
    render(<MemoryRouter><SpeedTestLanding /></MemoryRouter>);

    const input = screen.getByPlaceholderText(/enter your website url/i);
    // fireEvent.change is faster + more reliable than userEvent.type under the
    // jsdom timers used here (mirrors the sibling test on line 113).
    fireEvent.change(input, { target: { value: 'https://example.com' } });

    const submitBtn = screen.getByRole('button', { name: /run health check/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const state = useSpeedTestStore.getState();
      expect(state.results).not.toBeNull();
      expect(state.results?.mobileScore).toBe(72);
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/speed-test/report');
    }, { timeout: 10000 });
  }, 15000);
});

describe('Speed-to-Lead store flow', () => {
  beforeEach(() => {
    useSpeedTestStore.getState().reset();
  });

  it('full funnel state progression: url → credentials → results → reset', () => {
    const store = useSpeedTestStore;

    // Step 1: User enters URL
    store.getState().setUrl('https://mybusiness.com');
    expect(store.getState().url).toBe('https://mybusiness.com');

    // Step 2: User enters credentials
    store.getState().setCredentials('user@biz.com', 'pass123');
    expect(store.getState().email).toBe('user@biz.com');
    expect(store.getState().password).toBe('pass123');

    // Step 3: Results come in
    store.getState().setResults({
      loadingTime: 1.5,
      mobileScore: 85,
      desktopScore: 92,
      keyIssues: [],
      status: 'fast',
    });
    expect(store.getState().results?.status).toBe('fast');

    // Step 4: Webhook results
    store.getState().setWebhookResults({ detailed: true });
    expect(store.getState().webhookResults).toEqual({ detailed: true });

    // Step 5: User resets (starts over)
    store.getState().reset();
    expect(store.getState().url).toBe('');
    expect(store.getState().results).toBeNull();
  });
});
