import { describe, it, expect } from 'vitest';
import {
  getPlanLimit,
  isAtLimit,
  getUsagePercentage,
  isApproachingLimit,
  formatLimit,
  getResourceConfig,
  getUsageColor,
  getUsageBarClasses,
  getAllResources,
  getNextPlan,
  PLAN_LIMITS,
} from '../plan-limits';
import type { PlanTier, ResourceType } from '../plan-limits';

describe('plan-limits', () => {
  const planTiers: PlanTier[] = ['free', 'starter', 'pro', 'ultimate', 'enterprise'];
  const resourceTypes: ResourceType[] = [
    'ai_voice_minutes',
    'ai_chat_messages',
    'sms_sent',
    'phone_numbers',
    'team_members',
    'kb_storage_mb',
  ];

  describe('getPlanLimit', () => {
    it('should return correct limit for free plan voice minutes', () => {
      expect(getPlanLimit('free', 'ai_voice_minutes')).toBe(10);
    });

    it('should return correct limit for starter plan', () => {
      expect(getPlanLimit('starter', 'ai_voice_minutes')).toBe(100);
      expect(getPlanLimit('starter', 'ai_chat_messages')).toBe(500);
      expect(getPlanLimit('starter', 'sms_sent')).toBe(200);
    });

    it('should return correct limit for pro plan', () => {
      expect(getPlanLimit('pro', 'ai_voice_minutes')).toBe(500);
      expect(getPlanLimit('pro', 'team_members')).toBe(3);
    });

    it('should return correct limit for ultimate plan', () => {
      expect(getPlanLimit('ultimate', 'ai_voice_minutes')).toBe(2000);
      expect(getPlanLimit('ultimate', 'team_members')).toBe(10);
    });

    it('should return -1 (unlimited) for enterprise plan voice minutes', () => {
      expect(getPlanLimit('enterprise', 'ai_voice_minutes')).toBe(-1);
      expect(getPlanLimit('enterprise', 'ai_chat_messages')).toBe(-1);
      expect(getPlanLimit('enterprise', 'sms_sent')).toBe(-1);
    });

    it('should return a number for enterprise kb_storage_mb (not unlimited)', () => {
      expect(getPlanLimit('enterprise', 'kb_storage_mb')).toBe(10240);
    });

    it('should return 0 for free plan phone numbers', () => {
      expect(getPlanLimit('free', 'phone_numbers')).toBe(0);
    });

    it('should return a value for every plan/resource combination', () => {
      for (const plan of planTiers) {
        for (const resource of resourceTypes) {
          const limit = getPlanLimit(plan, resource);
          expect(typeof limit).toBe('number');
        }
      }
    });
  });

  describe('isAtLimit', () => {
    it('should return false when usage is below limit', () => {
      expect(isAtLimit('free', 'ai_voice_minutes', 5)).toBe(false);
    });

    it('should return true when usage equals limit', () => {
      expect(isAtLimit('free', 'ai_voice_minutes', 10)).toBe(true);
    });

    it('should return true when usage exceeds limit', () => {
      expect(isAtLimit('free', 'ai_voice_minutes', 15)).toBe(true);
    });

    it('should return false for unlimited resources (enterprise)', () => {
      expect(isAtLimit('enterprise', 'ai_voice_minutes', 999999)).toBe(false);
    });

    it('should return true for free plan phone numbers at 0 usage since limit is 0', () => {
      expect(isAtLimit('free', 'phone_numbers', 0)).toBe(true);
    });

    it('should return false for starter plan at half usage', () => {
      expect(isAtLimit('starter', 'ai_chat_messages', 250)).toBe(false);
    });
  });

  describe('getUsagePercentage', () => {
    it('should return 0 for zero usage', () => {
      expect(getUsagePercentage('free', 'ai_voice_minutes', 0)).toBe(0);
    });

    it('should return 50 for half usage', () => {
      expect(getUsagePercentage('free', 'ai_voice_minutes', 5)).toBe(50);
    });

    it('should return 100 for full usage', () => {
      expect(getUsagePercentage('free', 'ai_voice_minutes', 10)).toBe(100);
    });

    it('should cap at 100 for over-limit usage', () => {
      expect(getUsagePercentage('free', 'ai_voice_minutes', 20)).toBe(100);
    });

    it('should return 0 for unlimited resources', () => {
      expect(getUsagePercentage('enterprise', 'ai_voice_minutes', 5000)).toBe(0);
    });

    it('should return 0 for zero limit', () => {
      expect(getUsagePercentage('free', 'phone_numbers', 0)).toBe(0);
    });

    it('should calculate correctly for starter plan', () => {
      // starter voice limit is 100, 80 = 80%
      expect(getUsagePercentage('starter', 'ai_voice_minutes', 80)).toBe(80);
    });
  });

  describe('isApproachingLimit', () => {
    it('should return false when under 80%', () => {
      expect(isApproachingLimit('free', 'ai_voice_minutes', 7)).toBe(false); // 70%
    });

    it('should return true at exactly 80%', () => {
      expect(isApproachingLimit('free', 'ai_voice_minutes', 8)).toBe(true); // 80%
    });

    it('should return true at 90%', () => {
      expect(isApproachingLimit('free', 'ai_voice_minutes', 9)).toBe(true); // 90%
    });

    it('should return false at 100% (at limit, not approaching)', () => {
      expect(isApproachingLimit('free', 'ai_voice_minutes', 10)).toBe(false); // 100%
    });

    it('should return false for unlimited resources', () => {
      expect(isApproachingLimit('enterprise', 'ai_voice_minutes', 50000)).toBe(false);
    });

    it('should return false for zero limit resources', () => {
      expect(isApproachingLimit('free', 'phone_numbers', 0)).toBe(false);
    });
  });

  describe('formatLimit', () => {
    it('should format unlimited as "Unlimited"', () => {
      expect(formatLimit(-1, 'min')).toBe('Unlimited');
    });

    it('should format with unit', () => {
      expect(formatLimit(100, 'min')).toBe('100 min');
    });

    it('should format large numbers with locale separators', () => {
      expect(formatLimit(10000, 'msgs')).toBe('10,000 msgs');
    });

    it('should convert MB to GB when >= 1024', () => {
      expect(formatLimit(2048, 'MB')).toBe('2 GB');
      expect(formatLimit(10240, 'MB')).toBe('10 GB');
    });

    it('should keep MB when under 1024', () => {
      expect(formatLimit(500, 'MB')).toBe('500 MB');
    });

    it('should handle empty unit', () => {
      expect(formatLimit(3, '')).toBe('3');
    });
  });

  describe('getResourceConfig', () => {
    it('should return config for each resource type', () => {
      for (const resource of resourceTypes) {
        const config = getResourceConfig(resource);
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
        expect(config.unit).toBeDefined();
        expect(config.icon).toBeTruthy();
        expect(config.description).toBeTruthy();
      }
    });

    it('should return correct label for ai_voice_minutes', () => {
      expect(getResourceConfig('ai_voice_minutes').label).toBe('AI Voice Minutes');
    });
  });

  describe('getUsageColor', () => {
    it('should return green for low usage', () => {
      expect(getUsageColor(50)).toBe('green');
    });

    it('should return yellow for 75-89%', () => {
      expect(getUsageColor(75)).toBe('yellow');
      expect(getUsageColor(89)).toBe('yellow');
    });

    it('should return red for 90%+', () => {
      expect(getUsageColor(90)).toBe('red');
      expect(getUsageColor(100)).toBe('red');
    });
  });

  describe('getUsageBarClasses', () => {
    it('should return blue classes for low usage', () => {
      const classes = getUsageBarClasses(50);
      expect(classes.bar).toContain('blue');
      expect(classes.text).toContain('blue');
    });

    it('should return amber classes for medium usage', () => {
      const classes = getUsageBarClasses(80);
      expect(classes.bar).toContain('amber');
    });

    it('should return red classes for high usage', () => {
      const classes = getUsageBarClasses(95);
      expect(classes.bar).toContain('red');
    });
  });

  describe('getAllResources', () => {
    it('should return all 6 resources with configs', () => {
      const resources = getAllResources();
      expect(resources).toHaveLength(6);
      resources.forEach((r) => {
        expect(r.key).toBeTruthy();
        expect(r.label).toBeTruthy();
      });
    });
  });

  describe('getNextPlan', () => {
    it('should return starter for free', () => {
      expect(getNextPlan('free')).toBe('starter');
    });

    it('should return pro for starter', () => {
      expect(getNextPlan('starter')).toBe('pro');
    });

    it('should return ultimate for pro', () => {
      expect(getNextPlan('pro')).toBe('ultimate');
    });

    it('should return enterprise for ultimate', () => {
      expect(getNextPlan('ultimate')).toBe('enterprise');
    });

    it('should return null for enterprise (highest tier)', () => {
      expect(getNextPlan('enterprise')).toBeNull();
    });
  });

  describe('PLAN_LIMITS config', () => {
    it('should have all plan tiers', () => {
      for (const tier of planTiers) {
        expect(PLAN_LIMITS[tier]).toBeDefined();
        expect(PLAN_LIMITS[tier].name).toBeTruthy();
        expect(typeof PLAN_LIMITS[tier].monthlyPrice).toBe('number');
        expect(typeof PLAN_LIMITS[tier].yearlyPrice).toBe('number');
        expect(typeof PLAN_LIMITS[tier].monthlyTokens).toBe('number');
      }
    });

    it('should have increasing monthly prices from free through ultimate', () => {
      // ponytail: Enterprise is a custom lower-priced tier by canonical pricing
      // (reference_canonical_pricing.md), not the top of a monotonic ladder — it
      // sits below Ultimate, so it's checked separately.
      expect(PLAN_LIMITS.free.monthlyPrice).toBe(0);
      expect(PLAN_LIMITS.starter.monthlyPrice).toBeGreaterThan(PLAN_LIMITS.free.monthlyPrice);
      expect(PLAN_LIMITS.pro.monthlyPrice).toBeGreaterThan(PLAN_LIMITS.starter.monthlyPrice);
      expect(PLAN_LIMITS.ultimate.monthlyPrice).toBeGreaterThan(PLAN_LIMITS.pro.monthlyPrice);
      expect(PLAN_LIMITS.enterprise.monthlyPrice).toBeGreaterThan(PLAN_LIMITS.starter.monthlyPrice);
    });
  });
});
