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

describe('PLAN_LIMITS', () => {
  it('has all five plan tiers', () => {
    expect(Object.keys(PLAN_LIMITS)).toEqual(['free', 'starter', 'pro', 'ultimate', 'enterprise']);
  });

  it('enterprise has unlimited (-1) for most resources', () => {
    const ent = PLAN_LIMITS.enterprise.limits;
    expect(ent.ai_voice_minutes.limit).toBe(-1);
    expect(ent.ai_chat_messages.limit).toBe(-1);
    expect(ent.sms_sent.limit).toBe(-1);
    expect(ent.phone_numbers.limit).toBe(-1);
    expect(ent.team_members.limit).toBe(-1);
  });

  it('free plan has the lowest limits', () => {
    expect(PLAN_LIMITS.free.limits.ai_voice_minutes.limit).toBe(10);
    expect(PLAN_LIMITS.free.limits.phone_numbers.limit).toBe(0);
    expect(PLAN_LIMITS.free.limits.team_members.limit).toBe(1);
  });

  it('prices increase with tier through ultimate; enterprise is a separate custom tier', () => {
    // ponytail: canonical pricing (reference_canonical_pricing.md) puts Enterprise
    // below Ultimate, so it's excluded from the monotonic ladder here.
    const prices = [
      PLAN_LIMITS.free.monthlyPrice,
      PLAN_LIMITS.starter.monthlyPrice,
      PLAN_LIMITS.pro.monthlyPrice,
      PLAN_LIMITS.ultimate.monthlyPrice,
    ];
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
    expect(PLAN_LIMITS.enterprise.monthlyPrice).toBeGreaterThan(PLAN_LIMITS.starter.monthlyPrice);
  });
});

describe('getPlanLimit', () => {
  it('returns correct limit for plan + resource', () => {
    expect(getPlanLimit('starter', 'ai_voice_minutes')).toBe(100);
    expect(getPlanLimit('pro', 'sms_sent')).toBe(1000);
    expect(getPlanLimit('enterprise', 'ai_voice_minutes')).toBe(-1);
  });

  it('returns 0 for unknown plan', () => {
    expect(getPlanLimit('nonexistent' as any, 'ai_voice_minutes')).toBe(0);
  });
});

describe('isAtLimit', () => {
  it('returns true when usage equals limit', () => {
    expect(isAtLimit('starter', 'ai_voice_minutes', 100)).toBe(true);
  });

  it('returns true when usage exceeds limit', () => {
    expect(isAtLimit('starter', 'ai_voice_minutes', 150)).toBe(true);
  });

  it('returns false when under limit', () => {
    expect(isAtLimit('starter', 'ai_voice_minutes', 50)).toBe(false);
  });

  it('returns false for unlimited (-1) regardless of usage', () => {
    expect(isAtLimit('enterprise', 'ai_voice_minutes', 999999)).toBe(false);
  });
});

describe('getUsagePercentage', () => {
  it('calculates correct percentage', () => {
    expect(getUsagePercentage('starter', 'ai_voice_minutes', 50)).toBe(50);
    expect(getUsagePercentage('starter', 'ai_voice_minutes', 100)).toBe(100);
  });

  it('caps at 100%', () => {
    expect(getUsagePercentage('starter', 'ai_voice_minutes', 200)).toBe(100);
  });

  it('returns 0 for unlimited plans', () => {
    expect(getUsagePercentage('enterprise', 'ai_voice_minutes', 1000)).toBe(0);
  });

  it('returns 0 when limit is 0', () => {
    expect(getUsagePercentage('free', 'phone_numbers', 0)).toBe(0);
  });
});

describe('isApproachingLimit', () => {
  it('returns true at 80-99%', () => {
    expect(isApproachingLimit('starter', 'ai_voice_minutes', 80)).toBe(true);
    expect(isApproachingLimit('starter', 'ai_voice_minutes', 99)).toBe(true);
  });

  it('returns false at 100% (at limit, not approaching)', () => {
    expect(isApproachingLimit('starter', 'ai_voice_minutes', 100)).toBe(false);
  });

  it('returns false below 80%', () => {
    expect(isApproachingLimit('starter', 'ai_voice_minutes', 79)).toBe(false);
  });

  it('returns false for unlimited plans', () => {
    expect(isApproachingLimit('enterprise', 'ai_voice_minutes', 9000)).toBe(false);
  });
});

describe('formatLimit', () => {
  it('returns "Unlimited" for -1', () => {
    expect(formatLimit(-1, 'min')).toBe('Unlimited');
  });

  it('formats with unit', () => {
    expect(formatLimit(100, 'min')).toBe('100 min');
    expect(formatLimit(500, 'msgs')).toBe('500 msgs');
  });

  it('formats without unit', () => {
    expect(formatLimit(3, '')).toBe('3');
  });

  it('converts MB to GB when >= 1024', () => {
    expect(formatLimit(2048, 'MB')).toBe('2 GB');
    expect(formatLimit(10240, 'MB')).toBe('10 GB');
  });

  it('keeps MB when < 1024', () => {
    expect(formatLimit(500, 'MB')).toBe('500 MB');
  });

  it('formats large numbers with commas', () => {
    expect(formatLimit(10000, 'msgs')).toBe('10,000 msgs');
  });
});

describe('getResourceConfig', () => {
  it('returns config for a valid resource', () => {
    const config = getResourceConfig('ai_voice_minutes');
    expect(config.label).toBe('AI Voice Minutes');
    expect(config.unit).toBe('min');
    expect(config.icon).toBe('Phone');
  });
});

describe('getUsageColor', () => {
  it('returns green below 75%', () => {
    expect(getUsageColor(0)).toBe('green');
    expect(getUsageColor(74)).toBe('green');
  });

  it('returns yellow at 75-89%', () => {
    expect(getUsageColor(75)).toBe('yellow');
    expect(getUsageColor(89)).toBe('yellow');
  });

  it('returns red at 90%+', () => {
    expect(getUsageColor(90)).toBe('red');
    expect(getUsageColor(100)).toBe('red');
  });
});

describe('getUsageBarClasses', () => {
  it('returns blue classes for low usage', () => {
    const classes = getUsageBarClasses(50);
    expect(classes.bar).toContain('blue');
    expect(classes.text).toContain('blue');
  });

  it('returns amber classes for medium usage', () => {
    const classes = getUsageBarClasses(80);
    expect(classes.bar).toContain('amber');
    expect(classes.text).toContain('amber');
  });

  it('returns red classes for high usage', () => {
    const classes = getUsageBarClasses(95);
    expect(classes.bar).toContain('red');
    expect(classes.text).toContain('red');
  });
});

describe('getAllResources', () => {
  it('returns 6 resources', () => {
    expect(getAllResources()).toHaveLength(6);
  });

  it('each resource has key, label, unit, icon', () => {
    for (const resource of getAllResources()) {
      expect(resource.key).toBeTruthy();
      expect(resource.label).toBeTruthy();
      expect(resource.icon).toBeTruthy();
    }
  });
});

describe('getNextPlan', () => {
  it('returns the next tier up', () => {
    expect(getNextPlan('free')).toBe('starter');
    expect(getNextPlan('starter')).toBe('pro');
    expect(getNextPlan('pro')).toBe('ultimate');
    expect(getNextPlan('ultimate')).toBe('enterprise');
  });

  it('returns null for enterprise (top tier)', () => {
    expect(getNextPlan('enterprise')).toBeNull();
  });

  it('returns null for unknown plan', () => {
    expect(getNextPlan('nonexistent' as any)).toBeNull();
  });
});
