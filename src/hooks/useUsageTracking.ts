import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useUsageStore } from '../stores/usageStore';
import type { ResourceType, PlanTier } from '../lib/plan-limits';
import {
  getUsagePercentage,
  isApproachingLimit,
  isPooledUsageResource,
} from '../lib/plan-limits';
import { toast as sonnerToast } from 'sonner';

/**
 * Main usage tracking hook.
 * Fetches usage data, provides canUse() and trackUsage() functions,
 * and shows warning toasts at 80% usage.
 */
export function useUsageTracking() {
  const { user } = useAuth();
  const { planLevel } = useSubscription();
  const {
    usage,
    trend,
    isLoading,
    error,
    periodStart,
    periodEnd,
    lastFetchedAt,
    fetchUsage,
    fetchTrend,
    canUse,
    trackUsage: storeTrackUsage,
    getResourceUsage,
    getAllResourceUsages,
    setShowLimitModal,
    showLimitModal,
    limitModalResource,
    warningShownFor,
    markWarningShown,
    planTier: _planTier,
  } = useUsageStore();

  const hasCheckedWarnings = useRef(false);

  const effectivePlan: PlanTier = (planLevel as PlanTier) || 'free';

  // Fetch usage on mount
  useEffect(() => {
    if (user?.id && effectivePlan) {
      fetchUsage(user.id, effectivePlan);
      fetchTrend(user.id);
    }
  }, [user?.id, effectivePlan, fetchUsage, fetchTrend]);

  // Show warning toasts at 80% usage (once per session per resource)
  useEffect(() => {
    if (isLoading || hasCheckedWarnings.current) return;

    const resources: ResourceType[] = [
      'ai_voice_minutes',
      'ai_chat_messages',
      'sms_sent',
      'phone_numbers',
      'team_members',
      'kb_storage_mb',
    ];

    for (const resource of resources) {
      if (isPooledUsageResource(resource)) continue;
      if (warningShownFor.has(resource)) continue;

      const current = usage[resource];
      if (isApproachingLimit(effectivePlan, resource, current)) {
        const pct = getUsagePercentage(effectivePlan, resource, current);
        const resourceInfo = getResourceUsage(resource);
        sonnerToast.warning(`${resourceInfo.limit === -1 ? '' : `${Math.round(pct)}% used`}`, {
          description: `You've used ${current} of ${resourceInfo.limit === -1 ? 'unlimited' : resourceInfo.limit} ${resource.replace(/_/g, ' ')}. Consider upgrading your plan.`,
          duration: 6000,
        });
        markWarningShown(resource);
      }
    }

    hasCheckedWarnings.current = true;
  }, [isLoading, usage, effectivePlan, warningShownFor, markWarningShown, getResourceUsage]);

  const trackUsage = useCallback(
    async (resource: ResourceType, amount = 1): Promise<boolean> => {
      if (!user?.id) return false;
      return storeTrackUsage(user.id, resource, amount);
    },
    [user?.id, storeTrackUsage]
  );

  const refresh = useCallback(async () => {
    if (user?.id) {
      await fetchUsage(user.id, effectivePlan);
      await fetchTrend(user.id);
    }
  }, [user?.id, effectivePlan, fetchUsage, fetchTrend]);

  return {
    usage,
    trend,
    isLoading,
    error,
    planTier: effectivePlan,
    periodStart,
    periodEnd,
    lastFetchedAt,
    canUse,
    trackUsage,
    getResourceUsage,
    getAllResourceUsages,
    showLimitModal,
    limitModalResource,
    setShowLimitModal,
    refresh,
  };
}

/**
 * Lightweight hook for gating a single resource.
 * Returns { allowed, current, limit, percentage, showUpgrade }
 */
export function useUsageGate(resource: ResourceType) {
  const { user } = useAuth();
  const { planLevel } = useSubscription();
  const { usage: _usage, fetchUsage, getResourceUsage, setShowLimitModal, canUse } = useUsageStore();

  const effectivePlan: PlanTier = (planLevel as PlanTier) || 'free';

  useEffect(() => {
    if (user?.id) {
      fetchUsage(user.id, effectivePlan);
    }
  }, [user?.id, effectivePlan, fetchUsage]);

  const resourceUsage = getResourceUsage(resource);
  const allowed = canUse(resource);

  const showUpgrade = useCallback(() => {
    setShowLimitModal(true, resource);
  }, [resource, setShowLimitModal]);

  return {
    allowed,
    current: resourceUsage.current,
    limit: resourceUsage.limit,
    percentage: resourceUsage.percentage,
    isAtLimit: resourceUsage.isAtLimit,
    isApproaching: resourceUsage.isApproaching,
    showUpgrade,
  };
}
