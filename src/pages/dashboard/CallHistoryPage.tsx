import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CallHistorySkeleton } from '../../components/ui/loading-skeleton';
import ModalShell from '../../components/ui/modal-shell';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Play,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Shield,
  Info
} from 'lucide-react';

import { getRetellCallHistory, type RetellCall } from '../../lib/retell';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import OverviewMetricCard from '../../components/dashboard/OverviewMetricCard';

const CallHistoryPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [calls, setCalls] = useState<RetellCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [selectedCall, setSelectedCall] = useState<RetellCall | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch user's agents from Supabase
  const fetchUserAgents = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('user_id', user.id)
        .not('retell_agent_id', 'is', null);

      if (error) throw error;

      const agentIds = agents?.map(agent => agent.retell_agent_id).filter(Boolean) || [];
      return agentIds;
    } catch (error) {
      console.error('Error fetching user agents:', error);
      return [];
    }
  }, [user?.id]);

  // Fetch call history from Retell AI
  const fetchCallHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const agentIds = await fetchUserAgents();
      
      if (!agentIds || agentIds.length === 0) {
        setCalls([]);
        setLoading(false);
        return;
      }

      const params: any = {
        agentIds,
        limit: 100
      };

      // Add filters
      if (statusFilter !== 'all') {
        params.callStatus = [statusFilter];
      }

      if (directionFilter !== 'all') {
        params.direction = [directionFilter];
      }

      if (dateRange.start) {
        params.startDate = new Date(dateRange.start);
      }

      if (dateRange.end) {
        params.endDate = new Date(dateRange.end);
      }

      const response = await getRetellCallHistory(params);
      setCalls(response.calls);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setError('Failed to fetch call history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start, directionFilter, fetchUserAgents, statusFilter]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user?.id) {
      setCalls([]);
      setLoading(false);
      setError(null);
      return;
    }

    void fetchCallHistory();
  }, [fetchCallHistory, isAuthLoading, user?.id]);

  // Filter calls based on search term
  const filteredCalls = calls.filter(call => 
    call.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ended': return 'text-green-600 bg-green-100';
      case 'registered': return 'text-blue-600 bg-blue-100';
      case 'not_connected': return 'text-red-600 bg-red-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ended': return <CheckCircle className="w-4 h-4" />;
      case 'not_connected': return <XCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Get sentiment color
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get call quality level based on analysis
  const getCallQuality = (call: RetellCall): 'excellent' | 'good' | 'poor' | 'unknown' => {
    if (!call.call_analysis) return 'unknown';
    const sentiment = call.call_analysis.user_sentiment?.toLowerCase();
    const successful = call.call_analysis.call_successful;
    if (successful && sentiment === 'positive') return 'excellent';
    if (successful && sentiment !== 'negative') return 'good';
    if (!successful || sentiment === 'negative') return 'poor';
    return 'unknown';
  };

  // Quality dot color for table
  const getQualityDotColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  // Quality label
  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      default: return 'No data';
    }
  };

  // Standard call_analysis keys (everything else is custom)
  const STANDARD_ANALYSIS_KEYS = ['call_summary', 'user_sentiment', 'call_successful'];

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OverviewMetricCard
          label="Total Calls"
          value={filteredCalls.length}
          period="Call overview"
          badge="Live"
          badgeTone="neutral"
          icon={Phone}
          accentColor="#2563eb"
          chartData={[]}
          caption="All calls in the current filtered view"
        />

        <OverviewMetricCard
          label="Successful"
          value={filteredCalls.filter(call => call.call_status === 'ended').length}
          period="Call overview"
          badge="Completed"
          badgeTone="positive"
          icon={CheckCircle}
          chartData={[]}
          accentColor="#059669"
          caption="Calls that reached a completed state"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          >
            <option value="all" className="text-black">All Status</option>
            <option value="ended" className="text-black">Ended</option>
            <option value="registered" className="text-black">Registered</option>
            <option value="not_connected" className="text-black">Not Connected</option>
            <option value="error" className="text-black">Error</option>
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          >
            <option value="all" className="text-black">All Directions</option>
            <option value="inbound" className="text-black">Inbound</option>
            <option value="outbound" className="text-black">Outbound</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* End Date */}
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <CallHistorySkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <span className="ml-3 text-red-600">{error}</span>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Phone className="w-8 h-8 text-gray-400" />
            <span className="ml-3 text-gray-600">No calls found</span>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredCalls.map((call) => (
                <motion.div
                  key={call.call_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {call.direction === 'inbound' ? (
                          <PhoneIncoming className="w-4 h-4 text-green-600" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {call.call_id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(call.start_timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {call.recording_url && (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Play className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.call_status)}`}>
                      {getStatusIcon(call.call_status)}
                      {call.call_status}
                    </span>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(call.duration_ms)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCalls.map((call) => (
                    <motion.tr
                      key={call.call_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {call.direction === 'inbound' ? (
                              <PhoneIncoming className="w-4 h-4 text-green-600" />
                            ) : (
                              <PhoneOutgoing className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {call.call_id.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(call.start_timestamp)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{call.agent_name}</p>
                        <p className="text-xs text-gray-500">{call.call_type}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.call_status)}`}>
                          {getStatusIcon(call.call_status)}
                          {call.call_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(call.duration_ms)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.call_analysis?.user_sentiment ? (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(call.call_analysis.user_sentiment)}`}>
                            {call.call_analysis.user_sentiment}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="group relative flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${getQualityDotColor(getCallQuality(call))}`} />
                          <span className="text-xs text-gray-500">{getQualityLabel(getCallQuality(call))}</span>
                          {call.call_analysis?.call_summary && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64">
                              <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                                <p className="line-clamp-3">{call.call_analysis.call_summary}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {call.recording_url && (
                            <a
                              href={call.recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900"
                            >
                              <Play className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Call Details Modal */}
      <ModalShell
        open={showDetailsModal && !!selectedCall}
        onClose={() => setShowDetailsModal(false)}
        title="Call Details"
        maxWidth="max-w-4xl"
      >
        {selectedCall && (
          <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Call Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Call Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Call ID:</span>
                    <span className="font-mono">{selectedCall.call_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agent:</span>
                    <span>{selectedCall.agent_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedCall.call_status)}`}>
                      {selectedCall.call_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(selectedCall.duration_ms)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Time:</span>
                    <span>{formatDate(selectedCall.start_timestamp)}</span>
                  </div>
                  {selectedCall.end_timestamp && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Time:</span>
                      <span>{formatDate(selectedCall.end_timestamp)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Analysis */}
              {selectedCall.call_analysis && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Call Analysis</h4>
                  <div className="space-y-3 text-sm">
                    {/* Sentiment Badge */}
                    {selectedCall.call_analysis.user_sentiment && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sentiment:</span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getSentimentColor(selectedCall.call_analysis.user_sentiment)}`}>
                          {selectedCall.call_analysis.user_sentiment === 'Positive' && <CheckCircle className="w-3 h-3" />}
                          {selectedCall.call_analysis.user_sentiment === 'Negative' && <XCircle className="w-3 h-3" />}
                          {selectedCall.call_analysis.user_sentiment === 'Neutral' && <AlertCircle className="w-3 h-3" />}
                          {selectedCall.call_analysis.user_sentiment}
                        </span>
                      </div>
                    )}

                    {/* Successful Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Successful:</span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedCall.call_analysis.call_successful
                          ? 'text-green-700 bg-green-100'
                          : 'text-red-700 bg-red-100'
                      }`}>
                        {selectedCall.call_analysis.call_successful ? (
                          <><CheckCircle className="w-3 h-3" /> Pass</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Fail</>
                        )}
                      </span>
                    </div>

                    {/* Call Quality Score */}
                    {(() => {
                      const quality = getCallQuality(selectedCall);
                      const scoreMap = { excellent: 95, good: 70, poor: 30, unknown: 0 };
                      const score = scoreMap[quality];
                      const colorMap = { excellent: 'text-green-600', good: 'text-yellow-600', poor: 'text-red-600', unknown: 'text-gray-400' };
                      const bgMap = { excellent: 'bg-green-500', good: 'bg-yellow-500', poor: 'bg-red-500', unknown: 'bg-gray-300' };
                      return (
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5" />
                              Call Quality Score
                            </span>
                            <span className={`text-sm font-bold ${colorMap[quality]}`}>
                              {quality !== 'unknown' ? `${score}/100` : 'N/A'}
                            </span>
                          </div>
                          {quality !== 'unknown' && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${bgMap[quality]} transition-all duration-500`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Post-Call Analysis Summary */}
            {selectedCall.call_analysis?.call_summary && (
              <div className="mt-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">AI Call Summary</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedCall.call_analysis.call_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Custom Analysis Fields */}
            {selectedCall.call_analysis && (() => {
              const customKeys = Object.keys(selectedCall.call_analysis).filter(
                key => !STANDARD_ANALYSIS_KEYS.includes(key) && selectedCall.call_analysis![key] != null
              );
              if (customKeys.length === 0) return null;
              return (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Additional Analysis</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customKeys.map(key => {
                      const value = selectedCall.call_analysis![key];
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-sm text-gray-900">
                            {typeof value === 'boolean' ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                value ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                              }`}>
                                {value ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {value ? 'Yes' : 'No'}
                              </span>
                            ) : typeof value === 'object' ? (
                              JSON.stringify(value, null, 2)
                            ) : (
                              String(value)
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Transcript */}
            {selectedCall.transcript && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Transcript</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedCall.transcript}
                  </pre>
                </div>
              </div>
            )}

            {/* Recording */}
            {selectedCall.recording_url && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Recording</h4>
                <audio controls className="w-full">
                  <source src={selectedCall.recording_url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default CallHistoryPage;
