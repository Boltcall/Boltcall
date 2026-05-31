import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SubscriptionProvider, useSubscription } from '../SubscriptionContext';
import { AuthProvider } from '../AuthProvider';
import * as authLib from '../../lib/auth';
import * as stripeLib from '../../lib/stripe';

// Mock auth lib
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

// Mock stripe lib
vi.mock('../../lib/stripe', () => ({
  getUserSubscription: vi.fn(),
  PLAN_INFO: {
    starter: { name: 'Starter', monthlyPrice: 99, yearlyPrice: 948, tokens: 1000 },
    pro: { name: 'Pro', monthlyPrice: 179, yearlyPrice: 1716, tokens: 3000 },
    ultimate: { name: 'Ultimate', monthlyPrice: 249, yearlyPrice: 2388, tokens: 10000 },
    enterprise: { name: 'Enterprise', monthlyPrice: 997, yearlyPrice: 11964, tokens: 50000 },
  },
}));

const mockUser: authLib.User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  company: 'Acme Inc',
  role: 'user',
  createdAt: new Date().toISOString(), // Today = within trial
};

function setupAuthMocks(user: authLib.User | null = mockUser) {
  vi.mocked(authLib.getCurrentUser).mockResolvedValue(user);
  const unsubscribe = vi.fn();
  vi.mocked(authLib.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe } },
  } as any);
}

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        <SubscriptionProvider>{children}</SubscriptionProvider>
      </AuthProvider>
    );
  };
}

describe('SubscriptionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('default subscription state', () => {
    it('returns null subscription when user has no subscription', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
    });

    it('returns null plan and inactive when unauthenticated and no trial', async () => {
      setupAuthMocks(null);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.planLevel).toBeNull();
      expect(result.current.isActive).toBe(false);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isUltimate).toBe(false);
    });
  });

  describe('plan detection', () => {
    it('detects starter plan', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-1',
        user_id: 'user-123',
        plan_level: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.planLevel).toBe('starter');
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isUltimate).toBe(false);
    });

    it('detects pro plan and sets isPro to true', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-2',
        user_id: 'user-123',
        plan_level: 'pro',
        status: 'active',
        billing_interval: 'monthly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.subscription).not.toBeNull();
      });

      expect(result.current.planLevel).toBe('pro');
      expect(result.current.isActive).toBe(true);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isUltimate).toBe(false);
    });

    it('detects ultimate plan and sets both isPro and isUltimate to true', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-3',
        user_id: 'user-123',
        plan_level: 'ultimate',
        status: 'active',
        billing_interval: 'yearly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.planLevel).toBe('ultimate');
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isUltimate).toBe(true);
    });

    it('detects enterprise plan', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-4',
        user_id: 'user-123',
        plan_level: 'enterprise',
        status: 'active',
        billing_interval: 'yearly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.planLevel).toBe('enterprise');
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isUltimate).toBe(true);
    });
  });

  describe('trial status', () => {
    it('shows user as trialing when no subscription and within trial period', async () => {
      // User created today -- within 7-day trial
      setupAuthMocks({
        ...mockUser,
        createdAt: new Date().toISOString(),
      });
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      // Wait for auth to propagate and trial state to compute
      await waitFor(() => {
        expect(result.current.isTrialing).toBe(true);
      });

      expect(result.current.trialDaysRemaining).toBeGreaterThan(0);
      expect(result.current.trialDaysRemaining).toBeLessThanOrEqual(7);
      // During trial, effective plan is 'pro'
      expect(result.current.planLevel).toBe('pro');
      expect(result.current.isActive).toBe(true);
      expect(result.current.isPro).toBe(true);
    });

    it('shows trial expired when user created more than 7 days ago with no subscription', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      setupAuthMocks({
        ...mockUser,
        createdAt: eightDaysAgo.toISOString(),
      });
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isTrialing).toBe(false);
      expect(result.current.trialDaysRemaining).toBe(0);
      expect(result.current.planLevel).toBeNull();
      expect(result.current.isActive).toBe(false);
    });

    it('is not trialing when user has an active subscription', async () => {
      setupAuthMocks({
        ...mockUser,
        createdAt: new Date().toISOString(), // Within trial window
      });
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-1',
        user_id: 'user-123',
        plan_level: 'pro',
        status: 'active',
        billing_interval: 'monthly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.subscription).not.toBeNull();
      });

      // Has subscription, so not trialing even though within trial window
      expect(result.current.isTrialing).toBe(false);
      expect(result.current.planLevel).toBe('pro');
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('hasAccess', () => {
    it('returns true when user plan meets or exceeds required plan', async () => {
      setupAuthMocks(mockUser);
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue({
        id: 'sub-1',
        user_id: 'user-123',
        plan_level: 'ultimate',
        status: 'active',
        billing_interval: 'monthly',
        created_at: '2025-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.planLevel).toBe('ultimate');
      });

      expect(result.current.hasAccess('starter')).toBe(true);
      expect(result.current.hasAccess('pro')).toBe(true);
      expect(result.current.hasAccess('ultimate')).toBe(true);
      expect(result.current.hasAccess('enterprise')).toBe(false);
    });

    it('returns false when no effective plan', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      setupAuthMocks({
        ...mockUser,
        createdAt: eightDaysAgo.toISOString(),
      });
      vi.mocked(stripeLib.getUserSubscription).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasAccess('starter')).toBe(false);
      expect(result.current.hasAccess('pro')).toBe(false);
    });
  });

  describe('useSubscription hook', () => {
    it('throws when used outside SubscriptionProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSubscription());
      }).toThrow('useSubscription must be used within a SubscriptionProvider');

      spy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('handles subscription fetch error gracefully', async () => {
      setupAuthMocks(mockUser);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(stripeLib.getUserSubscription).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});
