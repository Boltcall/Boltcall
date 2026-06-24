/**
 * V2 shared component smoke tests.
 *
 * Goal: render-without-crash + the most-basic-shape assertions for the six
 * V2 surfaces (DashboardLayoutV2, SidebarV2, V2OptInGate, V2OptInToggle,
 * AskBoltcallAIV2, V2SetupChat). Mirrors the pattern in
 * src/pages/dashboard/__tests__/smoke.test.tsx — all vi.mock() calls live
 * at the top of the file so hoisting puts them in place before the V2
 * imports execute.
 *
 * Hard rules followed:
 *   - Smoke tests only. No deep behavior assertions.
 *   - No real network, no real Supabase, no real LLM calls.
 *   - jsdom env + @testing-library/react (config from vitest.config.ts).
 *   - V2-gate pages aren't tested here (lane 1 covers pages). This lane
 *     exercises the gate itself in both states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Global mocks (must run before V2 component imports) ───────────────────

// react-router-dom: keep the real module but stub useNavigate so we can
// assert post-action navigation without wiring a Routes tree.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Auth context: short-circuit to an authenticated user. Same shape as
// src/pages/dashboard/__tests__/smoke.test.tsx.
const mockAuthValue = {
  user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
  isAuthenticated: true,
  isLoading: false,
};
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

// authedFetch — used by V2 components instead of bare fetch (for JWT). Each
// test overrides via mockAuthedFetch.mockImplementation / mockResolvedValueOnce.
const mockAuthedFetch = vi.fn();
vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: (...args: any[]) => mockAuthedFetch(...args),
}));

// FUNCTIONS_BASE constant — pin to a known value so endpoint URLs are
// deterministic across environments.
vi.mock('../../../lib/api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

// Deep Supabase chain mock (same shape as V1 smoke test). Each test can
// override the maybeSingle resolution via mockSupabaseMaybeSingle.
const mockSupabaseMaybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
function createChainMock(): any {
  const resolved = Promise.resolve({ data: [], error: null, count: 0 });
  const chain: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return resolved.then.bind(resolved);
        if (prop === 'catch') return resolved.catch.bind(resolved);
        if (prop === 'finally') return resolved.finally.bind(resolved);
        if (prop === 'maybeSingle') return () => mockSupabaseMaybeSingle();
        if (prop === 'single') return () => Promise.resolve({ data: null, error: null });
        return (..._args: any[]) => chain;
      },
    }
  );
  return chain;
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: (..._a: any[]) => createChainMock(),
      insert: (..._a: any[]) => createChainMock(),
      update: (..._a: any[]) => createChainMock(),
      upsert: (..._a: any[]) => createChainMock(),
      delete: (..._a: any[]) => createChainMock(),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
    // V2 surfaces occasionally call removeChannel — not in the V1 smoke mock.
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

// Default fetch fallback (in case any component bypasses authedFetch).
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: [] }),
  }) as any;
  mockNavigate.mockReset();
  mockAuthedFetch.mockReset();
  mockSupabaseMaybeSingle.mockReset();
  mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── V2 component imports ──────────────────────────────────────────────────

import DashboardLayoutV2 from '../DashboardLayoutV2';
import SidebarV2 from '../SidebarV2';
import V2OptInGate, { __resetV2OptInGateCache } from '../V2OptInGate';
import V2OptInToggle from '../V2OptInToggle';
import AskBoltcallAIV2 from '../AskBoltcallAIV2';
import V2SetupChat from '../V2SetupChat';

const renderInRouter = (ui: React.ReactElement, initialEntries: string[] = ['/v2']) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

// ──────────────────────────────────────────────────────────────────────────
// DashboardLayoutV2
// ──────────────────────────────────────────────────────────────────────────

describe('DashboardLayoutV2 — smoke', () => {
  it('renders without crashing', () => {
    expect(() => renderInRouter(<DashboardLayoutV2 />)).not.toThrow();
  });

  it('renders the Ask Boltcall AI strategist input + sidebar', () => {
    renderInRouter(<DashboardLayoutV2 />);
    // Topbar: ask-AI input.
    expect(screen.getByLabelText('Ask Boltcall AI strategist')).toBeInTheDocument();
    // Sidebar: V2 nav landmark wires up.
    expect(screen.getByRole('complementary', { name: /v2 navigation/i })).toBeInTheDocument();
  });

  it('exposes a "Back to V1" escape hatch in the topbar', () => {
    renderInRouter(<DashboardLayoutV2 />);
    // Two buttons exist (topbar + sidebar footer). At least one matches.
    const backButtons = screen.getAllByRole('button', { name: /back to v1/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// SidebarV2
// ──────────────────────────────────────────────────────────────────────────

describe('SidebarV2 — smoke', () => {
  const noop = () => {};

  it('renders without crashing', () => {
    expect(() =>
      renderInRouter(
        <SidebarV2 isOpen={false} onClose={noop} onBackToV1={noop} />
      )
    ).not.toThrow();
  });

  it('renders the expected V2 nav entries (5+ of the documented set)', () => {
    renderInRouter(
      <SidebarV2 isOpen={false} onClose={noop} onBackToV1={noop} />
    );
    // The brief enumerates: Home, Analytics, Calls, Leads, Messages, Agent,
    // Knowledge, Integrations, Reputation, Help, QA, Settings.
    // The component's "Home" section uses the label "Overview" — both forms
    // are accepted so the test stays robust to copy tweaks.
    const labelsToCheck = [
      /overview|home/i,
      /calls/i,
      /messages/i,
      /leads/i,
      /agent/i,
      /knowledge/i,
      /analytics/i,
      /qa/i,
      /reputation/i,
      /integrations/i,
      /help/i,
      /settings/i,
    ];
    const hits = labelsToCheck.filter((rx) => screen.queryAllByText(rx).length > 0);
    expect(hits.length).toBeGreaterThanOrEqual(5);
  });

  it('renders the "Back to V1" escape-hatch button', () => {
    renderInRouter(
      <SidebarV2 isOpen={false} onClose={noop} onBackToV1={noop} />
    );
    expect(screen.getByRole('button', { name: /back to v1/i })).toBeInTheDocument();
  });

  it('fires onBackToV1 when the escape-hatch button is clicked', () => {
    const onBack = vi.fn();
    renderInRouter(
      <SidebarV2 isOpen={false} onClose={noop} onBackToV1={onBack} />
    );
    fireEvent.click(screen.getByRole('button', { name: /back to v1/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// V2OptInGate
// ──────────────────────────────────────────────────────────────────────────

describe('V2OptInGate — smoke', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetV2OptInGateCache();
  });

  it('renders children when v2_enabled = true', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: true }, error: null });
    await act(async () => {
      renderInRouter(
        <V2OptInGate>
          <div data-testid="v2-child">v2 content</div>
        </V2OptInGate>
      );
    });
    expect(screen.getByTestId('v2-child')).toBeInTheDocument();
  });

  it('renders the opt-in prompt when v2_enabled = false', async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: false }, error: null });
    await act(async () => {
      renderInRouter(
        <V2OptInGate>
          <div data-testid="v2-child">v2 content</div>
        </V2OptInGate>
      );
    });
    // Children are NOT rendered.
    expect(screen.queryByTestId('v2-child')).not.toBeInTheDocument();
    // The opt-in CTA IS rendered.
    expect(
      screen.getByRole('button', { name: /enable v2/i })
    ).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// V2OptInToggle
// ──────────────────────────────────────────────────────────────────────────

describe('V2OptInToggle — smoke', () => {
  it('renders a switch with the V2 label', async () => {
    await act(async () => {
      renderInRouter(<V2OptInToggle />);
    });
    const sw = screen.getByRole('switch');
    expect(sw).toBeInTheDocument();
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/AI-native dashboard/i)).toBeInTheDocument();
  });

  it('calls saas-v2-toggle when the switch is flipped on', async () => {
    // Initial load resolves to disabled.
    mockSupabaseMaybeSingle.mockResolvedValue({ data: { v2_enabled: false }, error: null });
    // Server accepts the flip.
    mockAuthedFetch.mockResolvedValue({ ok: true, status: 200 });

    await act(async () => {
      renderInRouter(<V2OptInToggle />);
    });
    const sw = screen.getByRole('switch');
    await act(async () => {
      fireEvent.click(sw);
    });

    expect(mockAuthedFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockAuthedFetch.mock.calls[0];
    expect(String(url)).toContain('/saas-v2-toggle');
    expect(init.method).toBe('POST');
    // Switching ON should also navigate into /v2/.
    expect(mockNavigate).toHaveBeenCalledWith('/v2/');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// AskBoltcallAIV2
// ──────────────────────────────────────────────────────────────────────────

describe('AskBoltcallAIV2 — smoke', () => {
  it('renders the input + the suggested-prompt chips', () => {
    renderInRouter(
      <AskBoltcallAIV2 starterQuestions={['What were my best calls today?', 'How is conversion trending?']} />
    );
    expect(screen.getByLabelText('Ask Boltcall a question')).toBeInTheDocument();
    expect(screen.getByText('What were my best calls today?')).toBeInTheDocument();
    expect(screen.getByText('How is conversion trending?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ask$/i })).toBeInTheDocument();
  });

  it('POSTs to the saas-v2-ask-ai endpoint on submit', async () => {
    mockAuthedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ answer: 'pong', sources: [], confidence: 0.9 }),
    });

    renderInRouter(<AskBoltcallAIV2 starterQuestions={[]} />);
    const input = screen.getByLabelText('Ask Boltcall a question') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ping' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    });

    expect(mockAuthedFetch).toHaveBeenCalled();
    const [url, init] = mockAuthedFetch.mock.calls[0];
    expect(String(url)).toContain('/saas-v2-ask-ai');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.question).toBe('ping');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// V2SetupChat
// ──────────────────────────────────────────────────────────────────────────

describe('V2SetupChat — smoke', () => {
  beforeEach(() => {
    // Mount-time hydrate call (GET /saas-v2-setup-state) — return no
    // existing conversation so the chat seeds with the opening greeting.
    mockAuthedFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('saas-v2-setup-state')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ conversation: [], extracted: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            conversation_id: 'conv_1',
            assistant_message: 'Got it.',
            extracted: {},
            wizard_step: 'business_name',
            ready_to_deploy: false,
          }),
      });
    });
  });

  it('renders setup as inline questions without chat chrome', async () => {
    vi.useFakeTimers();
    await act(async () => {
      renderInRouter(<V2SetupChat />);
    });

    const openingPrompt = screen.getByText(/I'll get your instant lead response system ready/i);
    expect(openingPrompt).not.toHaveTextContent(/welcome to Boltcall/i);
    expect(openingPrompt.closest('.text-left')).toBeTruthy();
    expect(openingPrompt.closest('.justify-start')).toBeTruthy();
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByLabelText(/owner name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByText(/First, tell me who owns this setup/i).closest('p')).toHaveClass('text-left');
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/business website - optional/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/choose voice/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/more kb files - optional/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profile 0% ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stuck\? You can keep going here/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading your setup/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/your answer/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type your reply/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Boltcall Setup')).not.toBeInTheDocument();
    expect(screen.queryByText(/conversational setup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/classic setup/i)).not.toBeInTheDocument();
  });

  it('walks through owner, business, and AI agent opening setup steps', async () => {
    vi.useFakeTimers();
    await act(async () => {
      renderInRouter(<V2SetupChat />);
    });

    await act(async () => {
      vi.runAllTimers();
    });

    fireEvent.change(screen.getByLabelText(/owner name/i), {
      target: { value: 'Noam Yakoby' },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: 'Israel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByLabelText(/owner name/i).closest('.transition-all')).toHaveClass('opacity-0');
    await act(async () => {
      vi.advanceTimersByTime(360);
    });

    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business website - optional/i)).toBeInTheDocument();
    const previousButton = screen.getByRole('button', { name: /previous/i });
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(previousButton).toHaveClass('border', 'border-white/14', 'bg-white/6', 'text-white');
    expect(continueButton).toHaveClass('bg-white', 'text-zinc-950');
    expect(screen.queryByLabelText(/owner name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/industry/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/voice/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/primary goal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tone/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/transfer number/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: 'Boltcall Plumbing' },
    });
    fireEvent.change(screen.getByLabelText(/business website - optional/i), {
      target: { value: 'https://boltcall.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await act(async () => {
      vi.advanceTimersByTime(360);
    });

    expect(screen.getByLabelText(/choose voice/i)).toBeInTheDocument();
    expect(screen.getByText(/Grace/i)).toBeInTheDocument();
    expect(screen.getByText(/Nico/i)).toBeInTheDocument();
    expect(screen.getByText(/Leland/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/more kb files - optional/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toHaveClass(
      'border',
      'border-white/14',
      'bg-white/6',
      'text-white',
    );
    expect(screen.getByRole('button', { name: /finish/i })).toHaveClass(
      'bg-white',
      'text-zinc-950',
    );
  });

  it('saves all opening setup fields and fades into the loading step on Finish', async () => {
    vi.useFakeTimers();
    await act(async () => {
      renderInRouter(<V2SetupChat />);
    });

    await act(async () => {
      vi.runAllTimers();
    });

    fireEvent.change(screen.getByLabelText(/owner name/i), {
      target: { value: 'Noam Yakoby' },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: 'Israel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await act(async () => {
      vi.advanceTimersByTime(360);
    });

    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: 'Boltcall Plumbing' },
    });
    fireEvent.change(screen.getByLabelText(/business website - optional/i), {
      target: { value: 'https://boltcall.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await act(async () => {
      vi.advanceTimersByTime(360);
    });

    fireEvent.click(screen.getByRole('radio', { name: /Leland/i }));
    fireEvent.change(screen.getByLabelText(/more kb files - optional/i), {
      target: {
        files: [
          new File(['hello'], 'faq.pdf', { type: 'application/pdf' }),
          new File(['pricing'], 'pricing.txt', { type: 'text/plain' }),
        ],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(screen.getByLabelText(/choose voice/i).closest('.transition-all')).toHaveClass('opacity-0');

    const conversationCalls = mockAuthedFetch.mock.calls.filter(([u]) =>
      typeof u === 'string' ? u.includes('saas-v2-setup-conversation') : false
    );
    expect(conversationCalls).toHaveLength(0);

    expect(JSON.parse(window.localStorage.getItem('boltcall_pending_agent_setup') || '{}')).toMatchObject({
      ownerName: 'Noam Yakoby',
      country: 'Israel',
      businessName: 'Boltcall Plumbing',
      websiteUrl: 'https://boltcall.org',
      industry: 'other',
      voiceId: 'retell-Leland',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '',
      kbFileNames: ['faq.pdf', 'pricing.txt'],
    });

    await act(async () => {
      vi.advanceTimersByTime(420);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/setup/loading', { replace: true });
  });
});
