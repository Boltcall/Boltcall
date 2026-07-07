import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import { fetchDashboardStats, fetchCallbackStats } from '../lib/dashboardApi';
import type { DashboardStats } from '../lib/dashboardApi';
import type { Lead, Kpis, TimeSeriesPoint, ChannelPerf, Faq, Transcript, Alert, FunnelStep, Channel, Intent } from '../types/dashboard';

// Empty-state seeds — new users see blank widgets that fill in when
// fetchLiveData resolves, not fabricated demo numbers.
const emptyKpis: Kpis = {
  leads: 0,
  qualifiedPct: 0,
  bookings: 0,
  speedToFirstReplyMedianSec: 0,
  showRatePct: 0,
  estRevenue: 0,
  deltas: {
    leads: 0,
    qualifiedPct: 0,
    bookings: 0,
    speedToFirstReplyMedianSec: 0,
    showRatePct: 0,
    estRevenue: 0,
  },
};

interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  channels: Channel[];
  intents: Intent[];
  sources: string[];
  staff: string[];
  tags: string[];
}

interface DashboardState {
  // Filters
  filters: DashboardFilters;
  selectedClient: string;

  // Data
  kpis: Kpis;
  timeSeries: TimeSeriesPoint[];
  channelPerf: ChannelPerf[];
  leads: Lead[];
  faqs: Faq[];
  transcripts: Transcript[];
  alerts: Alert[];
  funnelSteps: FunnelStep[];

  // Live API data
  liveStats: DashboardStats | null;
  dailyMetrics: any[];
  businessHealth: any;
  callbackStats: any;
  chatStats: any;
  lastFetchedAt: string | null;
  fetchError: string | null;

  // UI State
  loading: boolean;
  sidebarCollapsed: boolean;
  selectedLead: Lead | null;

  // Business profile (shared across dashboard)
  businessName: string | null;
  setBusinessName: (name: string) => void;

  // Actions
  setFilters: (filters: Partial<DashboardFilters>) => void;
  setSelectedClient: (client: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedLead: (lead: Lead | null) => void;
  resetFilters: () => void;
  applyQuickDateRange: (range: 'today' | '7d' | '30d' | 'custom') => void;

  // API Actions
  fetchLiveData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const defaultFilters: DashboardFilters = {
  dateRange: {
    start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  },
  channels: [],
  intents: [],
  sources: [],
  staff: [],
  tags: [],
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial state — empty widgets. Live data fills them in.
      filters: defaultFilters,
      selectedClient: 'default-client',
      kpis: emptyKpis,
      timeSeries: [],
      channelPerf: [],
      leads: [],
      faqs: [],
      transcripts: [],
      alerts: [],
      funnelSteps: [],

      // Live data
      liveStats: null,
      dailyMetrics: [],
      businessHealth: null,
      callbackStats: null,
      chatStats: null,
      lastFetchedAt: null,
      fetchError: null,

      loading: false,
      sidebarCollapsed: false,
      selectedLead: null,

      businessName: null,
      setBusinessName: (name) => set({ businessName: name }),

      // Filter actions
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      setSelectedClient: (client) => {
        set({ selectedClient: client });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      setSelectedLead: (lead) => {
        set({ selectedLead: lead });
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      applyQuickDateRange: (range) => {
        const today = dayjs();
        let start: string;
        let end: string;

        switch (range) {
          case 'today':
            start = today.format('YYYY-MM-DD');
            end = today.format('YYYY-MM-DD');
            break;
          case '7d':
            start = today.subtract(7, 'day').format('YYYY-MM-DD');
            end = today.format('YYYY-MM-DD');
            break;
          case '30d':
            start = today.subtract(30, 'day').format('YYYY-MM-DD');
            end = today.format('YYYY-MM-DD');
            break;
          case 'custom':
            return;
        }

        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: { start, end },
          },
        }));
      },

      // Fetch the two live sources the dashboard actually renders:
      // liveStats (TodayGlanceCard headline metrics) + callbackStats (pending count).
      // The `leads` table is owned by SpeedToLeadPage; do not mirror it here from
      // `callbacks` — that was a second, wrong source of truth. KPIs/timeSeries used
      // to be synthesized from mismatched fields (bookings := ai_calls_today); those
      // fabrications are removed. Add a real reader here only when something renders it.
      fetchLiveData: async () => {
        set({ loading: true, fetchError: null });

        const [stats, callbacks] = await Promise.allSettled([
          fetchDashboardStats(),
          fetchCallbackStats(),
        ]);

        const liveStats = stats.status === 'fulfilled' ? stats.value : null;
        const callbackStats = callbacks.status === 'fulfilled' ? callbacks.value : null;

        // fetchDashboardStats throws on HTTP error / timeout, so a rejection here is a
        // real outage — surface it instead of silently showing empty widgets.
        const fetchError =
          stats.status === 'rejected'
            ? (stats.reason instanceof Error ? stats.reason.message : 'Failed to load dashboard data')
            : null;

        set({
          liveStats,
          callbackStats,
          lastFetchedAt: new Date().toISOString(),
          loading: false,
          fetchError,
        });
      },

      // Full dashboard refresh
      refreshDashboard: async () => {
        await get().fetchLiveData();
      },
    }),
    {
      name: 'dashboard-store',
      partialize: (state) => ({
        filters: state.filters,
        selectedClient: state.selectedClient,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
