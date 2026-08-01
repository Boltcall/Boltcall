import { login, signup, logout, getCurrentUser, onAuthStateChange, resetPassword, signInWithGoogle, signInWithMicrosoft, signInWithFacebook } from '../auth';

// Mock the supabase client
vi.mock('../supabase', () => {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithOAuth: vi.fn(),
  };
  return {
    supabase: { auth: mockAuth },
    default: { auth: mockAuth },
  };
});

// Import the mocked supabase so we can control it
import { supabase } from '../supabase';

const mockSupabaseUser = {
  id: 'user-abc',
  email: 'john@example.com',
  user_metadata: {
    name: 'John Doe',
    company: 'TestCorp',
  },
  created_at: '2025-06-15T10:00:00Z',
};

describe('auth lib functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns transformed user on successful login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSupabaseUser, session: {} },
        error: null,
      } as any);

      const user = await login({ email: 'john@example.com', password: 'pass123' });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'pass123',
      });
      expect(user).toEqual({
        id: 'user-abc',
        email: 'john@example.com',
        name: 'John Doe',
        company: 'TestCorp',
        role: 'user',
        createdAt: '2025-06-15T10:00:00Z',
      });
    });

    it('throws on auth error', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      await expect(login({ email: 'bad@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid login credentials');
    });

    it('throws when no user returned', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as any);

      await expect(login({ email: 'john@example.com', password: 'pass' }))
        .rejects.toThrow('Login failed');
    });

    it('falls back to email prefix for name when metadata is missing', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: 'user-xyz',
            email: 'jane@corp.com',
            user_metadata: {},
            created_at: '2025-01-01T00:00:00Z',
          },
          session: {},
        },
        error: null,
      } as any);

      const user = await login({ email: 'jane@corp.com', password: 'pass' });

      expect(user.name).toBe('jane');
      expect(user.company).toBe('');
    });
  });

  describe('signup', () => {
    it('returns transformed user on successful signup', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockSupabaseUser, session: {} },
        error: null,
      } as any);

      const user = await signup({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'pass123',
        company: 'TestCorp',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'pass123',
        options: {
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
          data: {
            name: 'John Doe',
            company: 'TestCorp',
          },
        },
      });
      expect(user.id).toBe('user-abc');
      expect(user.email).toBe('john@example.com');
    });

    it('throws on signup error', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      } as any);

      await expect(signup({
        name: 'John',
        email: 'john@example.com',
        password: 'pass',
        company: 'Corp',
      })).rejects.toThrow('Email already registered');
    });

    it('throws when no user returned from signup', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as any);

      await expect(signup({
        name: 'John',
        email: 'john@example.com',
        password: 'pass',
        company: 'Corp',
      })).rejects.toThrow('Signup failed - no user returned');
    });
  });

  describe('logout', () => {
    it('calls supabase signOut', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

      await logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('throws on signOut error', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed' },
      } as any);

      await expect(logout()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('returns transformed user when session exists', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      } as any);

      const user = await getCurrentUser();

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-abc');
      expect(user!.email).toBe('john@example.com');
    });

    it('returns null when no user session', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns null on error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      } as any);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('registers callback and returns subscription', () => {
      const unsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe } },
      } as any);

      const callback = vi.fn();
      const result = onAuthStateChange(callback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(result.data.subscription.unsubscribe).toBe(unsubscribe);
    });

    it('transforms user in callback when session has user', async () => {
      let capturedCallback: any;
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      const userCallback = vi.fn();
      onAuthStateChange(userCallback);

      // Simulate auth state change with a session
      await capturedCallback('SIGNED_IN', { user: mockSupabaseUser });

      expect(userCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-abc',
          email: 'john@example.com',
          name: 'John Doe',
        })
      );
    });

    it('passes null when session is null', async () => {
      let capturedCallback: any;
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      const userCallback = vi.fn();
      onAuthStateChange(userCallback);

      await capturedCallback('SIGNED_OUT', null);

      expect(userCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with correct params', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      await resetPassword('john@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      );
    });

    it('throws on error', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      } as any);

      await expect(resetPassword('unknown@example.com'))
        .rejects.toThrow('User not found');
    });
  });

  describe('OAuth sign-in functions', () => {
    it('signInWithGoogle calls signInWithOAuth and throws redirect', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { url: 'https://google.com/oauth', provider: 'google' },
        error: null,
      } as any);

      await expect(signInWithGoogle()).rejects.toThrow('OAuth redirect initiated');

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );
    });

    it('signInWithMicrosoft calls signInWithOAuth and throws redirect', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { url: 'https://azure.com/oauth', provider: 'azure' },
        error: null,
      } as any);

      await expect(signInWithMicrosoft()).rejects.toThrow('OAuth redirect initiated');

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'azure' })
      );
    });

    it('signInWithFacebook calls signInWithOAuth and throws redirect', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { url: 'https://facebook.com/oauth', provider: 'facebook' },
        error: null,
      } as any);

      await expect(signInWithFacebook()).rejects.toThrow('OAuth redirect initiated');

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'facebook' })
      );
    });

    it('signInWithGoogle throws auth error when OAuth fails', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { url: null, provider: 'google' },
        error: { message: 'Provider not enabled' },
      } as any);

      await expect(signInWithGoogle()).rejects.toThrow('Provider not enabled');
    });
  });
});
