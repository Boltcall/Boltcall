import { describe, it, expect, beforeEach, vi } from 'vitest';
import dayjs from 'dayjs';

// Mock dependencies before importing the store
vi.mock('../../data/mock', () => ({
  mockData: {
    kpis: { leads: 0, qualifiedPct: 0, bookings: 0, speedToFirstReplyMedianSec: 0, showRatePct: 0, deltas: {} },
    timeSeries: [],
    channelPerf: [],
    leads: [],
    faqs: [],
    transcripts: [],
    alerts: [],
    funnelSteps: [],
  },
}));

vi.mock('../../lib/dashboardApi', () => ({
  fetchDashboardStats: vi.fn(),
  fetchDailyMetrics: vi.fn(),
  fetchBusinessHealth: vi.fn(),
  fetchCallbackStats: vi.fn(),
  fetchChatStats: vi.fn(),
  fetchLeads: vi.fn(),
}));

import { useDashboardStore } from '../dashboardStore';

describe('dashboardStore', () => {
  beforeEach(() => {
    // Reset Zustand store between tests
    const { resetFilters } = useDashboardStore.getState();
    resetFilters();
    useDashboardStore.setState({
      sidebarCollapsed: false,
      selectedLead: null,
      selectedClient: 'default-client',
    });
  });

  describe('setFilters', () => {
    it('should merge partial filters into existing filters', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ channels: ['sms'] });

      const state = useDashboardStore.getState();
      expect(state.filters.channels).toEqual(['sms']);
      // Other filters should remain unchanged
      expect(state.filters.intents).toEqual([]);
      expect(state.filters.sources).toEqual([]);
    });

    it('should update date range', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ dateRange: { start: '2025-01-01', end: '2025-01-31' } });

      const state = useDashboardStore.getState();
      expect(state.filters.dateRange.start).toBe('2025-01-01');
      expect(state.filters.dateRange.end).toBe('2025-01-31');
    });

    it('should update multiple filter fields at once', () => {
      const store = useDashboardStore.getState();
      store.setFilters({
        channels: ['form', 'sms'],
        tags: ['VIP'],
        staff: ['Alice'],
      });

      const state = useDashboardStore.getState();
      expect(state.filters.channels).toEqual(['form', 'sms']);
      expect(state.filters.tags).toEqual(['VIP']);
      expect(state.filters.staff).toEqual(['Alice']);
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to defaults', () => {
      const store = useDashboardStore.getState();

      // Set some filters first
      store.setFilters({
        channels: ['sms', 'whatsapp'],
        tags: ['VIP'],
        intents: ['new'],
      });

      // Reset
      store.resetFilters();

      const state = useDashboardStore.getState();
      expect(state.filters.channels).toEqual([]);
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.intents).toEqual([]);
      expect(state.filters.sources).toEqual([]);
      expect(state.filters.staff).toEqual([]);
    });

    it('should reset date range to last 7 days', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ dateRange: { start: '2020-01-01', end: '2020-12-31' } });
      store.resetFilters();

      const state = useDashboardStore.getState();
      const today = dayjs().format('YYYY-MM-DD');
      const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      expect(state.filters.dateRange.end).toBe(today);
      expect(state.filters.dateRange.start).toBe(weekAgo);
    });
  });

  describe('applyQuickDateRange', () => {
    it('should set today range', () => {
      const store = useDashboardStore.getState();
      store.applyQuickDateRange('today');

      const state = useDashboardStore.getState();
      const today = dayjs().format('YYYY-MM-DD');
      expect(state.filters.dateRange.start).toBe(today);
      expect(state.filters.dateRange.end).toBe(today);
    });

    it('should set 7d range', () => {
      const store = useDashboardStore.getState();
      store.applyQuickDateRange('7d');

      const state = useDashboardStore.getState();
      const today = dayjs().format('YYYY-MM-DD');
      const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      expect(state.filters.dateRange.start).toBe(weekAgo);
      expect(state.filters.dateRange.end).toBe(today);
    });

    it('should set 30d range', () => {
      const store = useDashboardStore.getState();
      store.applyQuickDateRange('30d');

      const state = useDashboardStore.getState();
      const today = dayjs().format('YYYY-MM-DD');
      const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      expect(state.filters.dateRange.start).toBe(monthAgo);
      expect(state.filters.dateRange.end).toBe(today);
    });

    it('should not change filters for custom range', () => {
      const store = useDashboardStore.getState();
      const beforeFilters = { ...useDashboardStore.getState().filters };
      store.applyQuickDateRange('custom');

      const state = useDashboardStore.getState();
      expect(state.filters.dateRange).toEqual(beforeFilters.dateRange);
    });

    it('should preserve non-date filters when applying date range', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ channels: ['sms'], tags: ['VIP'] });
      store.applyQuickDateRange('today');

      const state = useDashboardStore.getState();
      expect(state.filters.channels).toEqual(['sms']);
      expect(state.filters.tags).toEqual(['VIP']);
    });
  });

  describe('setSidebarCollapsed', () => {
    it('should set sidebar to collapsed', () => {
      useDashboardStore.getState().setSidebarCollapsed(true);
      expect(useDashboardStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should set sidebar to expanded', () => {
      useDashboardStore.getState().setSidebarCollapsed(true);
      useDashboardStore.getState().setSidebarCollapsed(false);
      expect(useDashboardStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('setSelectedLead', () => {
    it('should set a selected lead', () => {
      const lead = {
        id: 'lead-1',
        createdAt: '2025-01-01',
        name: 'Test Lead',
        channel: 'form' as const,
        intent: 'new' as const,
        qualified: false,
        booked: false,
      };
      useDashboardStore.getState().setSelectedLead(lead);
      expect(useDashboardStore.getState().selectedLead).toEqual(lead);
    });

    it('should clear selected lead with null', () => {
      const lead = {
        id: 'lead-1',
        createdAt: '2025-01-01',
        channel: 'form' as const,
        intent: 'new' as const,
        qualified: false,
        booked: false,
      };
      useDashboardStore.getState().setSelectedLead(lead);
      useDashboardStore.getState().setSelectedLead(null);
      expect(useDashboardStore.getState().selectedLead).toBeNull();
    });
  });

  describe('setSelectedClient', () => {
    it('should update selected client', () => {
      useDashboardStore.getState().setSelectedClient('client-123');
      expect(useDashboardStore.getState().selectedClient).toBe('client-123');
    });
  });
});
