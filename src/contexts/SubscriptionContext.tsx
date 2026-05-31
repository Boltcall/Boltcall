import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserSubscription } from '../lib/stripe';
import type { PlanLevel } from '../lib/stripe';

const TRIAL_DAYS = 7;

const PLAN_HIERARCHY: Record<PlanLevel, number> = {
  starter: 1,
  pro: 2,
  ultimate: 3,
  enterprise: 4,
};

interface Subscription {
  id: string;
  user_id: string;
  plan_level: PlanLevel;
  status: string;
  billing_interval: string;
  stripe_customer_id?: string;
  created_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  planLevel: PlanLevel | null;
  isActive: boolean;
  isPro: boolean;
  isUltimate: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  isLoading: boolean;
  hasAccess: (requiredPlan: PlanLevel) => boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getUserSubscription();
      setSubscription(data as Subscription | null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Calculate trial status. Only authenticated users with a known createdAt
  // can be in a trial — unauthenticated visitors must never appear "trialing".
  const getTrialDaysRemaining = (): number => {
    if (!isAuthenticated || !user) return 0;
    const createdStr = user?.createdAt || (user as any)?.created_at;
    if (!createdStr) return TRIAL_DAYS; // Default to full trial for authenticated users with no createdAt
    const createdAt = new Date(createdStr);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, TRIAL_DAYS - diffDays);
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialing = !subscription && trialDaysRemaining > 0;

  // Effective plan: subscription plan, or 'pro' during trial, or null
  const effectivePlan: PlanLevel | null = subscription?.plan_level ?? (isTrialing ? 'pro' : null);

  const isActive = !!subscription || isTrialing;
  const isPro = effectivePlan === 'pro' || effectivePlan === 'ultimate' || effectivePlan === 'enterprise';
  const isUltimate = effectivePlan === 'ultimate' || effectivePlan === 'enterprise';

  const hasAccess = (requiredPlan: PlanLevel): boolean => {
    if (user?.role === 'admin') return true;
    if (!effectivePlan) return false;
    return PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[requiredPlan];
  };

  const value: SubscriptionContextType = {
    subscription,
    planLevel: effectivePlan,
    isActive,
    isPro,
    isUltimate,
    isTrialing,
    trialDaysRemaining,
    isLoading,
    hasAccess,
    refetch: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
