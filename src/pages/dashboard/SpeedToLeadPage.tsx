import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  createdAt: string;
  assignedAgentId?: string;
}

const sourceColors: Record<string, string> = {
  'AI Receptionist': '#3B82F6',
  'ai_receptionist': '#3B82F6',
  'Speed to Lead': '#F59E0B',
  'speed_to_lead': '#F59E0B',
  'Instant Lead Response': '#F59E0B',
  'Website Form': '#8B5CF6',
  'website_form': '#8B5CF6',
  'Google Ads': '#10B981',
  'google_ads': '#10B981',
  'google_lead_form': '#10B981',
  'Facebook Ads': '#EC4899',
  'facebook_ads': '#EC4899',
  'facebook_lead_ad': '#EC4899',
  'Missed Call': '#EF4444',
  'missed_call': '#EF4444',
  'Manual': '#6B7280',
  'Unknown': '#9CA3AF',
};

const statusStyles: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  pending: 'bg-blue-100 text-blue-700',
  contacted: 'bg-green-100 text-green-700',
  qualified: 'bg-purple-100 text-purple-700',
  lost: 'bg-red-100 text-red-700',
};

function formatShortDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortId(id: string): string {
  const hash = id.replace(/-/g, '').slice(0, 5);
  return `#${hash}`;
}

/** Build smooth cubic bezier SVG path from points */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const SpeedToLeadPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'count' | 'rate'>('count');
  const [chartRange, setChartRange] = useState<'7' | '30'>('7');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: string } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchLeads = async () => {
    if (!user?.id) {
      setIsLoadingLeads(false);
      return;
    }

    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        showToast({
          title: 'Error',
          message: 'Failed to fetch leads',
          variant: 'error',
          duration: 3000
        });
        setLeads([]);
        return;
      }

      if (data) {
        const mappedLeads: Lead[] = data.map((lead: Record<string, unknown>) => ({
          id: lead.id as string,
          name: (lead.name || lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown') as string,
          phone: (lead.phone || lead.phone_number || '') as string,
          email: (lead.email || '') as string,
          source: (lead.source || lead.acquisition_source || lead.source_type || 'Unknown') as string,
          status: (lead.status || 'pending') as string,
          createdAt: (lead.created_at || lead.createdAt || new Date().toISOString()) as string,
          assignedAgentId: (lead.assigned_agent_id || lead.assignedAgentId || undefined) as string | undefined
        }));
        setLeads(mappedLeads);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      showToast({
        title: 'Error',
        message: 'Failed to fetch leads',
        variant: 'error',
        duration: 3000
      });
      setLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const now = new Date();
    const current7Start = new Date(now);
    current7Start.setDate(now.getDate() - 7);
    const prev7Start = new Date(now);
    prev7Start.setDate(now.getDate() - 14);

    const currentLeads = leads.filter(l => new Date(l.createdAt) >= current7Start);
    const prevLeads = leads.filter(l => {
      const d = new Date(l.createdAt);
      return d >= prev7Start && d < current7Start;
    });

    const totalCurrent = currentLeads.length;
    const totalPrev = prevLeads.length;
    const contactedCurrent = currentLeads.filter(l => l.status === 'contacted').length;
    const contactedPrev = prevLeads.filter(l => l.status === 'contacted').length;
    const rateCurrent = totalCurrent > 0 ? (contactedCurrent / totalCurrent) * 100 : 0;
    const ratePrev = totalPrev > 0 ? (contactedPrev / totalPrev) * 100 : 0;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      totalLeads: leads.length,
      totalLeadsTrend: pctChange(totalCurrent, totalPrev),
      contacted: leads.filter(l => l.status === 'contacted').length,
      contactedTrend: pctChange(contactedCurrent, contactedPrev),
      conversionRate: leads.length > 0
        ? Math.round((leads.filter(l => l.status === 'contacted').length / leads.length) * 100)
        : 0,
      conversionTrend: Math.round(rateCurrent - ratePrev),
    };
  }, [leads]);

  // --- Chart Data ---
  const rangeDays = parseInt(chartRange);
  const chartDays = useMemo(() => {
    return Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (rangeDays - 1 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [rangeDays]);

  const chartData = useMemo(() => {
    return chartDays.map(day => {
      const dayStr = day.toISOString().split('T')[0];
      const dayLeads = leads.filter(l => new Date(l.createdAt).toISOString().split('T')[0] === dayStr);
      const count = dayLeads.length;
      const contacted = dayLeads.filter(l => l.status === 'contacted').length;
      const rate = count > 0 ? Math.round((contacted / count) * 100) : 0;
      return {
        date: day,
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
        rate,
      };
    });
  }, [chartDays, leads]);

  const chartValues = chartData.map(d => chartMode === 'count' ? d.count : d.rate);
  const maxVal = Math.max(1, ...chartValues);

  // SVG chart dimensions
  const chartW = 800;
  const chartH = 280;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const chartPoints = chartData.map((_, i) => ({
    x: padL + (i / Math.max(1, chartData.length - 1)) * plotW,
    y: padT + plotH - (chartValues[i] / maxVal) * plotH,
  }));

  const linePath = smoothPath(chartPoints);
  const areaPath = chartPoints.length >= 2
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${padT + plotH} L ${chartPoints[0].x} ${padT + plotH} Z`
    : '';

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => Math.round((maxVal / (yTicks - 1)) * i));

  const handleChartMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || chartPoints.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartW;
    // Find closest point
    let closest = 0;
    let minDist = Infinity;
    chartPoints.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    const pt = chartPoints[closest];
    const d = chartData[closest];
    setHoveredPoint({
      x: pt.x,
      y: pt.y,
      date: d.label,
      value: chartMode === 'count' ? `${d.count} leads` : `${d.rate}%`,
    });
  }, [chartPoints, chartData, chartMode, chartW]);

  const handleChartMouseLeave = useCallback(() => setHoveredPoint(null), []);

  // --- Source counts with trends ---
  const sourceCounts = useMemo(() => {
    const counts: Record<string, { total: number; trend: number }> = {};
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    leads.forEach(l => {
      const src = l.source || 'Unknown';
      if (!counts[src]) counts[src] = { total: 0, trend: 0 };
      counts[src].total++;
    });

    // Compute trends
    Object.keys(counts).forEach(src => {
      const curr = leads.filter(l => (l.source || 'Unknown') === src && new Date(l.createdAt) >= weekAgo).length;
      const prev = leads.filter(l => {
        const d = new Date(l.createdAt);
        return (l.source || 'Unknown') === src && d >= twoWeeksAgo && d < weekAgo;
      }).length;
      counts[src].trend = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
    });
    return counts;
  }, [leads]);

  // --- Filtered leads for table ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.source.toLowerCase().includes(q);
      }
      return true;
    });
  }, [leads, statusFilter, sourceFilter, searchQuery]);

  const uniqueStatuses = useMemo(() => [...new Set(leads.map(l => l.status))], [leads]);
  const uniqueSources = useMemo(() => [...new Set(leads.map(l => l.source))], [leads]);

  // --- Trend Badge ---
  const TrendBadge = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {Math.abs(value)}{isPositive ? '\u2191' : '\u2193'}
      </span>
    );
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const },
    }),
  };

  return (
    <div className="space-y-6 px-1 md:px-0">

      {/* Section 1: KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Leads', value: kpis.totalLeads, trend: kpis.totalLeadsTrend, subtitle: 'Last 7 Days' },
          { label: 'Contacted', value: kpis.contacted, trend: kpis.contactedTrend, subtitle: 'Last 7 Days' },
          { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, trend: kpis.conversionTrend, subtitle: 'Last 7 Days' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white rounded-lg border border-gray-200 p-5"
          >
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">{card.value}</span>
              <TrendBadge value={card.trend} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{card.subtitle}</p>
          </motion.div>
        ))}
      </div>

      {/* Section 2: Lead Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 p-5"
      >
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lead Performance</h2>
          <div className="flex items-center gap-3">
            {/* Toggle pills */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartMode('count')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  chartMode === 'count' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Lead Count
              </button>
              <button
                onClick={() => setChartMode('rate')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  chartMode === 'rate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Response Rate
              </button>
            </div>
            {/* Range dropdown */}
            <select
              value={chartRange}
              onChange={e => setChartRange(e.target.value as '7' | '30')}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-auto min-w-[500px]"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {yTickValues.map((tick, i) => {
              const y = padT + plotH - (tick / maxVal) * plotH;
              return (
                <g key={i}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#E5E7EB" strokeWidth="1" />
                  <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-gray-400" fontSize="11">
                    {chartMode === 'rate' ? `${tick}%` : tick}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

            {/* Line */}
            {linePath && (
              <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Data points */}
            {chartPoints.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="white" stroke="#2563EB" strokeWidth="2" />
            ))}

            {/* X-axis labels */}
            {chartData.map((d, i) => {
              const x = padL + (i / Math.max(1, chartData.length - 1)) * plotW;
              // Show every label if 7 days, every ~5th if 30 days
              if (rangeDays > 7 && i % 5 !== 0 && i !== chartData.length - 1) return null;
              return (
                <text key={i} x={x} y={chartH - 8} textAnchor="middle" className="fill-gray-400" fontSize="11">
                  {d.label}
                </text>
              );
            })}

            {/* Hover tooltip */}
            {hoveredPoint && (
              <g>
                <line x1={hoveredPoint.x} y1={padT} x2={hoveredPoint.x} y2={padT + plotH} stroke="#2563EB" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" fill="#2563EB" opacity="0.3" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill="#2563EB" />
                <rect
                  x={hoveredPoint.x - 55}
                  y={hoveredPoint.y - 42}
                  width="110"
                  height="32"
                  rx="6"
                  fill="#1F2937"
                  opacity="0.95"
                />
                <text x={hoveredPoint.x} y={hoveredPoint.y - 28} textAnchor="middle" fill="white" fontSize="10">
                  {hoveredPoint.date}
                </text>
                <text x={hoveredPoint.x} y={hoveredPoint.y - 16} textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
                  {hoveredPoint.value}
                </text>
              </g>
            )}
          </svg>
        </div>

        {leads.length === 0 && !isLoadingLeads && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">No lead data yet</p>
          </div>
        )}
      </motion.div>

      {/* Section 3: Lead List Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="bg-white rounded-lg border border-gray-200"
      >
        {/* Table Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Lead List</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            {/* Source filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoadingLeads ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-gray-500 mt-4">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{leads.length === 0 ? 'No leads found' : 'No leads match your filters'}</p>
            {leads.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">Leads will appear here once you start receiving them</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const statusClass = statusStyles[lead.status] || statusStyles.new;
                  const srcColor = sourceColors[lead.source] || '#9CA3AF';
                  const srcData = sourceCounts[lead.source];
                  return (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-400 font-mono">{shortId(lead.id)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass}`}>
                          {lead.status === 'pending' ? 'New' : lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: srcColor }} />
                          <span className="text-sm text-gray-700">{lead.source.replace(/_/g, ' ')}</span>
                          {srcData && (
                            <span className="text-[10px] text-gray-400 font-medium ml-1">
                              {srcData.total}
                              {srcData.trend !== 0 && (
                                <span className={srcData.trend > 0 ? 'text-green-600' : 'text-red-500'}>
                                  {' '}{Math.abs(srcData.trend)}{srcData.trend > 0 ? '\u2191' : '\u2193'}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatShortDate(lead.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SpeedToLeadPage;
