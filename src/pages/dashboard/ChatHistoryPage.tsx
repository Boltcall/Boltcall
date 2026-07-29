import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatHistorySkeleton } from '../../components/ui/loading-skeleton';
import { 
  MessageSquare, 
  Clock, 
  User,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { getRetellCallHistory, type RetellCall } from '../../lib/retell';
import { supabase } from '../../lib/supabase';
import { useErrorHandler } from '../../hooks/useErrorHandler';

const ChatHistoryPage: React.FC = () => {
  const handleError = useErrorHandler();
  const [chats, setChats] = useState<RetellCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [selectedChat, setSelectedChat] = useState<RetellCall | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch user's agents from Supabase
  const fetchUserAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agents, error } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('user_id', user.id)
        .not('retell_agent_id', 'is', null);

      if (error) throw error;

      const agentIds = agents?.map(agent => agent.retell_agent_id).filter(Boolean) || [];
      return agentIds;
    } catch (error) {
      handleError('chat-history: fetch user agents', error, { toast: false });
      return [];
    }
  };

  // Fetch chat history from Retell AI (web calls and chat interactions)
  const fetchChatHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const agentIds = await fetchUserAgents();
      
      if (!agentIds || agentIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const params: any = {
        agentIds,
        limit: 100,
        // Filter for web calls and chat-like interactions
        callStatus: statusFilter !== 'all' ? [statusFilter] : undefined
      };

      if (dateRange.start) {
        params.startDate = new Date(dateRange.start);
      }

      if (dateRange.end) {
        params.endDate = new Date(dateRange.end);
      }

      const response = await getRetellCallHistory(params);
      
      // Filter for web calls and chat-like interactions
      const chatCalls = response.calls.filter(call => 
        call.call_type === 'web_call' || 
        call.transcript?.includes('chat') ||
        call.call_type === 'chat'
      );
      
      setChats(chatCalls);
    } catch (error) {
      handleError('chat-history: fetch chat history', error, { toast: false });
      setError('Failed to fetch chat history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [statusFilter, dateRange]);

  // Filter chats based on search term
  const filteredChats = chats.filter(chat => 
    chat.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Parse transcript into chat messages
  const parseTranscript = (transcript: string) => {
    if (!transcript) return [];
    
    const lines = transcript.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const [role, ...messageParts] = line.split(': ');
      return {
        role: role.toLowerCase(),
        message: messageParts.join(': ')
      };
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-[#1e1e24] dark:bg-[#17171b] dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-[#1e1e24] dark:bg-[#17171b] dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent text-black"
          >
            <option value="all" className="text-black">All Status</option>
            <option value="ended" className="text-black">Ended</option>
            <option value="registered" className="text-black">Active</option>
            <option value="not_connected" className="text-black">Not Connected</option>
            <option value="error" className="text-black">Error</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-[#1e1e24] dark:bg-[#17171b] dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />

          {/* End Date */}
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-[#1e1e24] dark:bg-[#17171b] dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded-md">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Total Chats</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{filteredChats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-green-50 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {filteredChats.filter(chat => chat.call_status === 'ended').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-yellow-50 rounded-md">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Avg Duration</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDuration(
                  filteredChats.reduce((acc, chat) => acc + (chat.duration_ms || 0), 0) /
                  filteredChats.filter(chat => chat.duration_ms).length
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-50 rounded-md">
              <User className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Positive</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {filteredChats.filter(chat => chat.call_analysis?.user_sentiment === 'Positive').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chats Table */}
      <div className="bg-white dark:bg-[#111114] rounded-lg shadow-sm border dark:border-[#1e1e24] overflow-hidden">
        {loading ? (
          <ChatHistorySkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <span className="ml-3 text-red-600">{error}</span>
            </div>
            <button
              onClick={fetchChatHistory}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blueDark transition-colors duration-200 ease-out text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <MessageSquare className="w-8 h-8 text-gray-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">No chats found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#17171b]">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Chat Details
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#111114] divide-y divide-gray-100 dark:divide-[#1e1e24]">
                {filteredChats.map((chat) => (
                  <motion.tr
                    key={chat.call_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 rounded-md">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {chat.call_id.slice(0, 8)}...
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatDate(chat.start_timestamp)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{chat.agent_name}</p>
                      <p className="text-[11px] text-gray-400">{chat.call_type}</p>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(chat.call_status)}`}>
                        {getStatusIcon(chat.call_status)}
                        {chat.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100">
                      {formatDuration(chat.duration_ms)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100">
                      {chat.transcript ? parseTranscript(chat.transcript).length : 0}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {chat.call_analysis?.user_sentiment ? (
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-medium ${getSentimentColor(chat.call_analysis.user_sentiment)}`}>
                          {chat.call_analysis.user_sentiment}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedChat(chat);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors duration-200 ease-out"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedChat && (
        <motion.div
          className="fixed -inset-[200px] bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="bg-white dark:bg-[#111114] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b dark:border-[#1e1e24]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200 ease-out"
              >
                ×
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Chat Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Chat Information</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Chat ID:</span>
                      <span className="font-mono">{selectedChat.call_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Agent:</span>
                      <span>{selectedChat.agent_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedChat.call_status)}`}>
                        {selectedChat.call_status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span>{formatDuration(selectedChat.duration_ms)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Start Time:</span>
                      <span>{formatDate(selectedChat.start_timestamp)}</span>
                    </div>
                    {selectedChat.end_timestamp && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">End Time:</span>
                        <span>{formatDate(selectedChat.end_timestamp)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Analysis */}
                {selectedChat.call_analysis && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Chat Analysis</h4>
                    <div className="space-y-1.5 text-xs">
                      {selectedChat.call_analysis.user_sentiment && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Sentiment:</span>
                          <span className={`px-2 py-1 rounded text-xs ${getSentimentColor(selectedChat.call_analysis.user_sentiment)}`}>
                            {selectedChat.call_analysis.user_sentiment}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Successful:</span>
                        <span className="dark:text-gray-200">{selectedChat.call_analysis.call_successful ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedChat.call_analysis.call_summary && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Summary:</span>
                          <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedChat.call_analysis.call_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              {selectedChat.transcript && (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-2">Chat Messages</h4>
                  <div className="bg-gray-50 dark:bg-[#17171b] rounded-lg p-3 max-h-72 overflow-y-auto">
                    <div className="space-y-3">
                      {parseTranscript(selectedChat.transcript).map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-[#111114] text-gray-900 dark:text-gray-100 border dark:border-[#1e1e24]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {message.role === 'user' ? (
                                <User className="w-3 h-3" />
                              ) : (
                                <MessageSquare className="w-3 h-3" />
                              )}
                              <span className="text-xs font-medium capitalize">
                                {message.role}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatHistoryPage;
