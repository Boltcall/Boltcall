import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useAuth } from '../AuthContext';
import { AuthProvider } from '../AuthProvider';
import * as authLib from '../../lib/auth';

// Mock the auth lib module
vi.mock('../../lib/auth', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithMicrosoft: vi.fn(),
  signInWithFacebook: vi.fn(),
}));

const mockUser: authLib.User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  company: 'Acme Inc',
  role: 'user',
  createdAt: '2025-01-01T00:00:00Z',
};

// Helper to set up a default mock for onAuthStateChange
function setupAuthStateChangeMock() {
  const unsubscribe = vi.fn();
  vi.mocked(authLib.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe } },
  } as any);
  return { unsubscribe };
}

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with user as null and isLoading as true', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading is true and user is null
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // After getCurrentUser resolves, loading becomes false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('login', () => {
    it('dispatches correct state changes on successful login', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authLib.login).mockResolvedValue(mockUser);
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password123' });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading during login and clears on error', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authLib.login).mockRejectedValue(new Error('Invalid credentials'));
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login({ email: 'test@example.com', password: 'wrong' });
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user state on logout', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(authLib.logout).mockResolvedValue(undefined);
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial auth check to complete (user is logged in)
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('session restore', () => {
    it('restores user from existing session on mount', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(mockUser);
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('handles getCurrentUser failure gracefully', async () => {
      vi.mocked(authLib.getCurrentUser).mockRejectedValue(new Error('Network error'));
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('responds to auth state changes via onAuthStateChange callback', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);

      let authCallback: ((user: authLib.User | null) => void) | null = null;
      const unsubscribe = vi.fn();
      vi.mocked(authLib.onAuthStateChange).mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe } } } as any;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change (user signs in externally)
      await act(async () => {
        authCallback!(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      // Simulate sign out
      await act(async () => {
        authCallback!(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('unsubscribes from auth state changes on unmount', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      const { unsubscribe } = setupAuthStateChangeMock();

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(authLib.getCurrentUser).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('returns a safe no-op default when used outside AuthProvider', () => {
      // AuthContext intentionally provides a safe default (no throw) so marketing
      // pages that never wrap in AuthProvider can still call useAuth without
      // crashing. The default is unauthenticated + loading.
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.signup).toBe('function');
    });
  });

  describe('signup', () => {
    it('dispatches correct state changes on successful signup', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authLib.signup).mockResolvedValue(mockUser);
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signup({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          company: 'Acme Inc',
        });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('OAuth login', () => {
    it('handles Google OAuth redirect without error', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authLib.signInWithGoogle).mockRejectedValue(
        new Error('OAuth redirect initiated')
      );
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw for OAuth redirect
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Loading was set to true during the attempt but the redirect message
      // is swallowed, so isLoading stays at true (redirect would navigate away)
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('throws non-redirect errors from OAuth', async () => {
      vi.mocked(authLib.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authLib.signInWithGoogle).mockRejectedValue(
        new Error('Provider not configured')
      );
      setupAuthStateChangeMock();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithGoogle();
        })
      ).rejects.toThrow('Provider not configured');

      expect(result.current.isLoading).toBe(false);
    });
  });
});
