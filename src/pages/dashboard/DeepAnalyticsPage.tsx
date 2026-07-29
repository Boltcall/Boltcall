import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Zap,
  Bot,
  Activity,
} from 'lucide-react';

// Analytics components
import AnalyticsDateFilter, {
  getDefaultFilters,
  type AnalyticsFilterValues,
} from '../../components/analytics/AnalyticsDateFilter';
import ConversionFunnel from '../../components/analytics/ConversionFunnel';
import RoiDashboard from '../../components/analytics/RoiDashboard';
import ResponseTimeCard from '../../components/analytics/ResponseTimeCard';
import PeakHoursHeatmap from '../../components/analytics/PeakHoursHeatmap';
import SourceAttributionChart from '../../components/analytics/SourceAttributionChart';
import AgentPerformanceTable from '../../components/analytics/AgentPerformanceTable';
import MissedOpportunities from '../../components/analytics/MissedOpportunities';
import ExportPanel from '../../components/analytics/ExportPanel';
import LiveDashboard from '../../components/analytics/LiveDashboard';

// Hook
import { useAnalytics } from '../../hooks/useAnalytics';

// Export utils
import { exportToCsv } from '../../lib/exportUtils';

/* ------------------------------------------------------------------ */
/*  Tab config                                                         */
/* ------------------------------------------------------------------ */

type TabKey = 'overview' | 'funnel' | 'roi' | 'performance' | 'live';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'funnel', label: 'Funnel', icon: TrendingUp },
  { key: 'roi', label: 'ROI', icon: Activity },
  { key: 'performance', label: 'Performance', icon: Bot },
  { key: 'live', label: 'Live', icon: Zap },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

const DeepAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filters, setFilters] = useState<AnalyticsFilterValues>(getDefaultFilters);

  // Convert filter values to AnalyticsFilters shape for the hook
  const analyticsFilters = useMemo(() => ({
    dateRange: filters.dateRange,
    userId: user?.id,
    agentId: filters.agentId || undefined,
    source: filters.source || undefined,
    leadStatus: filters.leadStatus || undefined,
    phone: filters.phone || undefined,
  }), [filters, user?.id]);

  const data = useAnalytics(analyticsFilters);

  // Build agent list for filter dropdown
  const agentOptions = useMemo(
    () => data.agents.map(a => ({ id: a.agentId, name: a.agentName })),
    [data.agents]
  );

  // Build source list for filter dropdown
  const sourceOptions = useMemo(
    () => data.sources.map(s => s.source),
    [data.sources]
  );

  // Export sections config for ExportPanel
  const exportSections = useMemo(() => [
    {
      id: 'funnel-chart',
      label: 'Conversion Funnel',
      onCsvExport: () => exportToCsv(
        data.funnel.map(s => ({ Stage: s.name, Count: s.count, Rate: `${s.rate}%`, Change: `${s.change}%` })),
        'funnel', 'Conversion Funnel'
      ),
    },
    {
      id: 'roi-dashboard',
      label: 'ROI Dashboard',
      onCsvExport: () => data.roiMetrics && exportToCsv([{ ...data.roiMetrics }], 'roi', 'ROI Dashboard'),
    },
    {
      id: 'response-time-chart',
      label: 'Response Time',
      onCsvExport: () => data.responseTime && exportToCsv(
        data.responseTime.byHour.map(h => ({ Hour: `${h.hour}:00`, Avg: h.avgSeconds, Count: h.count })),
        'response-time', 'Response Time'
      ),
    },
    {
      id: 'source-attribution-chart',
      label: 'Lead Sources',
      onCsvExport: () => exportToCsv(
        data.sources.map(s => ({ Source: s.source, Count: s.count, Percentage: `${s.percentage}%` })),
        'sources', 'Lead Sources'
      ),
    },
    {
      id: 'agent-performance',
      label: 'Agent Performance',
      onCsvExport: () => exportToCsv(
        data.agents.map(a => ({ Agent: a.agentName, Calls: a.callsHandled, Success: `${a.successRate}%`, Score: a.satisfactionScore })),
        'agents', 'Agent Performance'
      ),
    },
    {
      id: 'missed-opportunities',
      label: 'Missed Opportunities',
      onCsvExport: () => exportToCsv(
        data.missed.map(m => ({ Name: m.name, Phone: m.phone, Date: m.missedAt, Source: m.source })),
        'missed', 'Missed Opportunities'
      ),
    },
  ], [data]);

  const isLoading = data.funnelLoading || data.roiLoading || data.responseTimeLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-main dark:text-white">Deep Analytics</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Conversion funnels, ROI metrics, and performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.lastRefreshed && (
            <span className="text-xs text-text-muted">
              Updated {data.lastRefreshed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={data.refreshAll}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {data.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {data.error}
        </div>
      )}

      {/* Date + Filters */}
      <AnalyticsDateFilter
        value={filters}
        onChange={setFilters}
        agents={agentOptions}
        sources={sourceOptions}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-200 ease-out whitespace-nowrap ${
                isActive
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-text-muted hover:text-text-main hover:border-gray-300 dark:hover:border-[#1e1e24]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'live' && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview: summary cards + source chart + heatmap + missed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourceAttributionChart data={data.sources} loading={data.sourcesLoading} />
              <PeakHoursHeatmap data={data.heatmap} loading={data.heatmapLoading} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponseTimeCard stats={data.responseTime} loading={data.responseTimeLoading} />
              <MissedOpportunities data={data.missed} loading={data.missedLoading} />
            </div>
            <ExportPanel sections={exportSections} />
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className="space-y-6">
            <ConversionFunnel
              stages={data.funnel}
              loading={data.funnelLoading}
              onStageClick={data.loadDrilldown}
              drilldownData={data.drilldownData}
              drilldownStage={data.drilldownStage}
              onCloseDrilldown={data.closeDrilldown}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourceAttributionChart data={data.sources} loading={data.sourcesLoading} />
              <MissedOpportunities data={data.missed} loading={data.missedLoading} />
            </div>
          </div>
        )}

        {activeTab === 'roi' && (
          <RoiDashboard
            metrics={data.roiMetrics}
            trend={data.roiTrend}
            loading={data.roiLoading}
            onConfigChange={data.updateRoiConfig}
          />
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <AgentPerformanceTable agents={data.agents} loading={data.agentsLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponseTimeCard stats={data.responseTime} loading={data.responseTimeLoading} />
              <PeakHoursHeatmap data={data.heatmap} loading={data.heatmapLoading} />
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <LiveDashboard />
        )}
      </motion.div>
    </div>
  );
};

export default DeepAnalyticsPage;
