import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import { fetchDashboardStats, fetchDailyMetrics, fetchBusinessHealth, fetchCallbackStats, fetchChatStats, fetchLeads } from '../lib/dashboardApi';
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

      // Fetch all live data from APIs
      fetchLiveData: async () => {
        set({ loading: true, fetchError: null });

        try {
          const [stats, metrics, health, callbacks, chats, leads] = await Promise.allSettled([
            fetchDashboardStats(),
            fetchDailyMetrics(30),
            fetchBusinessHealth(),
            fetchCallbackStats(),
            fetchChatStats(),
            fetchLeads({ limit: 50 }),
          ]);

          const liveStats = stats.status === 'fulfilled' ? stats.value : null;
          const dailyMetrics = metrics.status === 'fulfilled' ? metrics.value : [];
          const businessHealth = health.status === 'fulfilled' ? health.value : null;
          const callbackStats = callbacks.status === 'fulfilled' ? callbacks.value : null;
          const chatStats = chats.status === 'fulfilled' ? chats.value : null;
          const leadsData = leads.status === 'fulfilled' ? leads.value : [];

          // Build KPIs from live data if available
          const updatedKpis: Partial<Kpis> = {};
          if (liveStats?.summary) {
            const s = liveStats.summary;
            updatedKpis.leads = (callbackStats as any)?.total || get().kpis.leads;
            updatedKpis.bookings = s.ai_calls_today;
          }

          // Convert daily metrics to time series format
          const liveTimeSeries: TimeSeriesPoint[] = dailyMetrics.map((m: any) => ({
            date: m.date,
            leads: m.new_leads_total || 0,
            bookings: m.calls_booked || 0,
          }));

          set({
            liveStats,
            dailyMetrics,
            businessHealth,
            callbackStats,
            chatStats,
            lastFetchedAt: new Date().toISOString(),
            loading: false,
            // Update store data with live data where available
            ...(liveTimeSeries.length > 0 && { timeSeries: liveTimeSeries }),
            ...(Object.keys(updatedKpis).length > 0 && { kpis: { ...get().kpis, ...updatedKpis } }),
            ...(leadsData.length > 0 && {
              leads: leadsData.map((l: any) => ({
                id: l.id,
                createdAt: l.created_at,
                name: l.client_name || 'Unknown',
                phone: l.client_phone || '',
                email: l.client_email || '',
                channel: 'form' as Channel,
                source: l.source || 'unknown',
                intent: l.status === 'completed' ? 'closed' as Intent : 'new' as Intent,
                qualified: l.status === 'scheduled' || l.status === 'completed',
                booked: l.status === 'scheduled' || l.status === 'completed',
                showed: l.status === 'completed',
                owner: '',
                tags: l.tags || [],
                notes: l.outcome_notes || '',
              })),
            }),
          });
        } catch (error) {
          console.error('Dashboard fetch error:', error);
          set({
            loading: false,
            fetchError: error instanceof Error ? error.message : 'Failed to fetch data',
          });
        }
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
