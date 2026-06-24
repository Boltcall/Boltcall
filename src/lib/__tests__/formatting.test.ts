import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock i18n
vi.mock('../../i18n', () => ({
  default: {
    language: 'en-US',
    t: (key: string) => {
      if (key === 'time.justNow') return 'Just now';
      return key;
    },
  },
}));

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCompactNumber,
  formatPercent,
  formatCurrency,
} from '../formatting';

describe('formatting', () => {
  describe('formatDate', () => {
    it('should format a Date object with default (medium) preset', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      const result = formatDate(date, { locale: 'en-US' });
      // Medium: "Jun 15, 2025" or similar
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format an ISO string', () => {
      const result = formatDate('2025-01-01T00:00:00Z', { locale: 'en-US' });
      expect(result).toContain('Jan');
      expect(result).toContain('2025');
    });

    it('should format a timestamp number', () => {
      const ts = new Date('2025-03-20').getTime();
      const result = formatDate(ts, { locale: 'en-US' });
      expect(result).toContain('Mar');
      expect(result).toContain('2025');
    });

    it('should use short preset', () => {
      const result = formatDate('2025-06-15', { locale: 'en-US', preset: 'short' });
      // Short typically: "6/15/25"
      expect(result).toContain('15');
    });

    it('should use long preset', () => {
      const result = formatDate('2025-06-15', { locale: 'en-US', preset: 'long' });
      expect(result).toContain('June');
      expect(result).toContain('2025');
    });

    it('should use custom Intl options', () => {
      const result = formatDate('2025-06-15', {
        locale: 'en-US',
        options: { weekday: 'long' },
      });
      expect(result).toContain('Sunday');
    });
  });

  describe('formatTime', () => {
    it('should format time portion of a date', () => {
      const date = new Date('2025-06-15T14:30:00');
      const result = formatTime(date, { locale: 'en-US' });
      expect(result).toContain('30');
    });

    it('should accept ISO string', () => {
      const result = formatTime('2025-06-15T09:15:00', { locale: 'en-US' });
      expect(result).toContain('15');
    });
  });

  describe('formatDateTime', () => {
    it('should format both date and time', () => {
      const date = new Date('2025-06-15T14:30:00');
      const result = formatDateTime(date, { locale: 'en-US' });
      expect(result).toContain('Jun');
      expect(result).toContain('30');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent dates', () => {
      const now = new Date();
      const result = formatRelativeTime(now, 'en-US');
      expect(result).toBe('Just now');
    });

    it('should return relative time for dates in the past', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = formatRelativeTime(oneHourAgo, 'en-US');
      expect(result).toContain('hour');
    });

    it('should return relative time for dates in the future', () => {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const result = formatRelativeTime(oneHourFromNow, 'en-US');
      expect(result).toMatch(/hour|minute/);
    });

    it('should handle day-level differences', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo, 'en-US');
      expect(result).toContain('3');
      expect(result).toContain('day');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with grouping separators', () => {
      const result = formatNumber(1234567, { locale: 'en-US' });
      expect(result).toBe('1,234,567');
    });

    it('should format zero', () => {
      expect(formatNumber(0, { locale: 'en-US' })).toBe('0');
    });

    it('should format negative numbers', () => {
      const result = formatNumber(-1000, { locale: 'en-US' });
      expect(result).toContain('1,000');
    });

    it('should accept custom options', () => {
      const result = formatNumber(1234.5, {
        locale: 'en-US',
        options: { minimumFractionDigits: 2 },
      });
      expect(result).toBe('1,234.50');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format thousands as K', () => {
      const result = formatCompactNumber(1200, 'en-US');
      expect(result).toContain('1.2K');
    });

    it('should format millions as M', () => {
      const result = formatCompactNumber(3400000, 'en-US');
      expect(result).toContain('3.4M');
    });

    it('should format small numbers as-is', () => {
      const result = formatCompactNumber(42, 'en-US');
      expect(result).toBe('42');
    });
  });

  describe('formatPercent', () => {
    it('should format 0.75 as 75%', () => {
      const result = formatPercent(0.75, { locale: 'en-US' });
      expect(result).toBe('75%');
    });

    it('should format 0 as 0%', () => {
      expect(formatPercent(0, { locale: 'en-US' })).toBe('0%');
    });

    it('should format 1 as 100%', () => {
      expect(formatPercent(1, { locale: 'en-US' })).toBe('100%');
    });

    it('should respect decimals option', () => {
      const result = formatPercent(0.756, { locale: 'en-US', decimals: 1 });
      expect(result).toBe('75.6%');
    });
  });

  describe('formatCurrency', () => {
    it('should format as USD by default', () => {
      const result = formatCurrency(99.99, { locale: 'en-US' });
      expect(result).toContain('$');
      expect(result).toContain('99.99');
    });

    it('should format without cents when showCents is false', () => {
      const result = formatCurrency(99.99, { locale: 'en-US', showCents: false });
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, { locale: 'en-US' });
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('should format large amounts', () => {
      const result = formatCurrency(1234567.89, { locale: 'en-US' });
      expect(result).toContain('$');
      expect(result).toContain('1,234,567.89');
    });
  });
});
