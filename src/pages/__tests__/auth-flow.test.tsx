/**
 * Auth user flow tests — login, signup, form validation, mode switching.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Production intentionally hides providers until Supabase OAuth is configured.
vi.hoisted(() => { vi.stubEnv('VITE_OAUTH_ENABLED', 'false'); });
afterAll(() => { vi.unstubAllEnvs(); });

// ── Mocks ───────────────────────────────────────────────────────────────────

const {
  mockLogin,
  mockSignup,
  mockNavigate,
  mockSignInWithGoogle,
  mockSignInWithMicrosoft,
  mockSignInWithFacebook,
  mockSavePendingAuthRedirect,
  mockResend,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSignup: vi.fn(),
  mockNavigate: vi.fn(),
  mockSignInWithGoogle: vi.fn(),
  mockSignInWithMicrosoft: vi.fn(),
  mockSignInWithFacebook: vi.fn(),
  mockSavePendingAuthRedirect: vi.fn(),
  mockResend: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { resend: mockResend } },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, prop) =>
      React.forwardRef(({ children, ...p }: any, ref: any) => {
        const safe: any = {};
        for (const [k, v] of Object.entries(p)) {
          if (typeof v !== 'object' && typeof v !== 'function' && !k.startsWith('while') &&
              !k.startsWith('animate') && !k.startsWith('initial') && !k.startsWith('exit') &&
              !k.startsWith('transition') && !k.startsWith('variants') && k !== 'layout' &&
              k !== 'layoutId' && k !== 'onViewportEnter' && k !== 'viewport') {
            safe[k] = v;
          }
        }
        return React.createElement(prop as string, { ...safe, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithMicrosoft: mockSignInWithMicrosoft,
    signInWithFacebook: mockSignInWithFacebook,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/auth', () => ({
  resetPassword: vi.fn(),
}));

vi.mock('../../lib/authRedirect', () => ({
  savePendingAuthRedirect: mockSavePendingAuthRedirect,
}));

import AuthSwitch from '../../components/ui/auth-switch';

const renderAuth = (
  mode: 'login' | 'signup' = 'login',
  initialEntries: string[] = ['/'],
) => {
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthSwitch defaultMode={mode} />
    </MemoryRouter>
  );
  return { user, ...result };
};

describe('Auth flow — Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderAuth('login');
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('renders the LOGIN submit button', () => {
    renderAuth('login');
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login and navigates on valid submission', async () => {
    mockLogin.mockResolvedValue({ id: 'u1' });
    const { user } = renderAuth('login');

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    const { user } = renderAuth('login');

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('does not offer unconfigured OAuth providers on login', () => {
    renderAuth('login');
    expect(screen.queryByTitle('Google')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Microsoft')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Facebook')).not.toBeInTheDocument();
  });

  it('has forgot password link', () => {
    renderAuth('login');
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });
});

describe('Auth flow — Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with email and password fields', () => {
    renderAuth('signup');
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('calls signup and uses the component default redirect on valid submission', async () => {
    mockSignup.mockResolvedValue({ id: 'u1' });
    const { user } = renderAuth('signup');

    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'securepass');
    // Click the submit button (type=submit), not the tab
    const buttons = screen.getAllByRole('button', { name: /sign up/i });
    const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit') || buttons[buttons.length - 1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: '',
        email: 'new@example.com',
        password: 'securepass',
        company: '',
      });
    });

    await waitFor(() => {
      expect(mockSavePendingAuthRedirect).toHaveBeenCalledWith('/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows error on signup failure', async () => {
    mockSignup.mockRejectedValue(new Error('Email already registered'));
    const { user } = renderAuth('signup');

    await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'securepass');
    const buttons = screen.getAllByRole('button', { name: /sign up/i });
    const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit') || buttons[buttons.length - 1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  it('uses the requested setup redirect after signup', async () => {
    mockSignup.mockResolvedValue({ id: 'u1' });
    const { user } = renderAuth('signup', ['/signup?redirect=%2Fsetup']);

    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'securepass');
    const buttons = screen.getAllByRole('button', { name: /sign up/i });
    const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit') || buttons[buttons.length - 1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSavePendingAuthRedirect).toHaveBeenCalledWith('/setup');
      expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true });
    });
  });

  it('keeps setup signup on the email flow while OAuth is unconfigured', () => {
    renderAuth('signup', ['/signup?redirect=%2Fsetup']);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.queryByTitle('Google')).not.toBeInTheDocument();
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    expect(mockSavePendingAuthRedirect).not.toHaveBeenCalled();
  });

});

describe('Auth flow — Signup email confirmation resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const submitSignupExpectingConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
    const err = new Error('email_confirmation_required');
    err.name = 'EmailConfirmationRequiredError';
    mockSignup.mockRejectedValue(err);

    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'securepass');
    const buttons = screen.getAllByRole('button', { name: /sign up/i });
    const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit') || buttons[buttons.length - 1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  };

  it('shows a neutral (non-error) confirmation panel and starts a 60s cooldown on resend', async () => {
    mockResend.mockResolvedValue({ error: null });
    const { user } = renderAuth('signup');

    await submitSignupExpectingConfirmation(user);

    // Neutral state, not the red error box used for real failures
    expect(screen.queryByText(/email already registered/i)).not.toBeInTheDocument();
    const messageBox = screen.getByText(/we sent a confirmation link/i).closest('div');
    expect(messageBox).not.toHaveClass('bg-red-50');

    const resendBtn = screen.getByRole('button', { name: /resend confirmation email/i });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({ type: 'signup', email: 'new@example.com' });
    });

    // Cooldown engaged — button disabled and relabeled, can't be clicked again
    const cooldownBtn = screen.getByRole('button', { name: /resend in \d+s/i });
    expect(cooldownBtn).toBeDisabled();
    await user.click(cooldownBtn);
    expect(mockResend).toHaveBeenCalledTimes(1);
  });

  it('shows an error message (not the cooldown) when resend fails', async () => {
    mockResend.mockResolvedValue({ error: { message: 'Too many requests' } });
    const { user } = renderAuth('signup');

    await submitSignupExpectingConfirmation(user);

    await user.click(screen.getByRole('button', { name: /resend confirmation email/i }));

    await waitFor(() => {
      expect(screen.getByText('Too many requests')).toBeInTheDocument();
    });
    // No cooldown started on failure
    expect(screen.getByRole('button', { name: /resend confirmation email/i })).not.toBeDisabled();
  });
});

describe('Auth flow — Mode switching', () => {
  it('switches from login to signup mode', async () => {
    const { user } = renderAuth('login');

    // "Sign Up" tab button (type=button, not submit)
    const buttons = screen.getAllByText('Sign Up');
    const signupTab = buttons.find(b => b.getAttribute('type') === 'button') || buttons[0];
    await user.click(signupTab);

    await waitFor(() => {
      // "Sign up" heading appears
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
  });

  it('switches from signup to login mode', async () => {
    const { user } = renderAuth('signup');

    // Tab button "Sign In" — find button with that text
    const buttons = screen.getAllByText('Sign In');
    const loginTab = buttons.find(el => el.tagName === 'BUTTON') || buttons[0];
    await user.click(loginTab);

    await waitFor(() => {
      // Login heading "Sign in" (lowercase i)
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('accepts custom default redirects for both auth modes', () => {
    // Verifying the component accepts these props
    const { unmount } = render(
      <MemoryRouter>
        <AuthSwitch defaultMode="signup" defaultRedirect="/setup" />
      </MemoryRouter>
    );
    unmount();

    render(
      <MemoryRouter>
        <AuthSwitch defaultMode="login" defaultRedirect="/dashboard" />
      </MemoryRouter>
    );
  });
});
