import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Download, Loader2, ChevronLeft, ChevronRight,
  LogIn, LogOut, Settings, Bot, Phone, Plug, UserPlus, UserMinus,
  CreditCard, Key, BookOpen, Building2, Shield, Clock,
} from 'lucide-react';
import { PopButton } from '../../../components/ui/pop-button';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTeamStore } from '../../../stores/teamStore';
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTION_COLORS,
  type ActivityAction,
  type ActivityLogFilter,
} from '../../../types/team';

// ─── Action Icon Map ─────────────────────────────────────────────────────

const ACTION_ICONS: Partial<Record<ActivityAction, React.ReactNode>> = {
  login: <LogIn className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  config_change: <Settings className="w-4 h-4" />,
  agent_created: <Bot className="w-4 h-4" />,
  agent_modified: <Bot className="w-4 h-4" />,
  agent_deleted: <Bot className="w-4 h-4" />,
  number_purchased: <Phone className="w-4 h-4" />,
  number_released: <Phone className="w-4 h-4" />,
  integration_connected: <Plug className="w-4 h-4" />,
  integration_disconnected: <Plug className="w-4 h-4" />,
  member_invited: <UserPlus className="w-4 h-4" />,
  member_removed: <UserMinus className="w-4 h-4" />,
  member_suspended: <UserMinus className="w-4 h-4" />,
  member_role_changed: <Shield className="w-4 h-4" />,
  plan_changed: <CreditCard className="w-4 h-4" />,
  api_key_created: <Key className="w-4 h-4" />,
  api_key_revoked: <Key className="w-4 h-4" />,
  knowledge_base_updated: <BookOpen className="w-4 h-4" />,
  workspace_updated: <Building2 className="w-4 h-4" />,
  role_created: <Shield className="w-4 h-4" />,
  role_modified: <Shield className="w-4 h-4" />,
  role_deleted: <Shield className="w-4 h-4" />,
};

const ALL_ACTIONS = Object.keys(ACTIVITY_ACTION_LABELS) as ActivityAction[];
const PAGE_SIZE = 50;

// ─── Component ───────────────────────────────────────────────────────────

const ActivityLogPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    activityLogs, activityLogsLoading, activityLogsError, activityLogsTotalCount,
    fetchActivityLogs, members, fetchMembers,
  } = useTeamStore();

  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [_filter, setFilter] = useState<ActivityLogFilter>({});

  // Filter form state
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = useCallback(() => {
    if (!user?.id) return;

    const activeFilter: ActivityLogFilter = {};
    if (filterUser) activeFilter.userId = filterUser;
    if (filterAction) activeFilter.action = filterAction as ActivityAction;
    if (filterDateFrom) activeFilter.dateFrom = filterDateFrom;
    if (filterDateTo) activeFilter.dateTo = filterDateTo;
    if (searchQuery) activeFilter.search = searchQuery;

    setFilter(activeFilter);
    fetchActivityLogs(user.id, activeFilter, page, PAGE_SIZE);
  }, [user?.id, filterUser, filterAction, filterDateFrom, filterDateTo, searchQuery, page, fetchActivityLogs]);

  useEffect(() => {
    if (user?.id) fetchMembers(user.id);
  }, [user?.id, fetchMembers]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(activityLogsTotalCount / PAGE_SIZE);

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleExportCSV = () => {
    if (activityLogs.length === 0) {
      showToast({ message: 'No logs to export', variant: 'warning' });
      return;
    }

    const header = 'Timestamp,User,Email,Action,Details,IP Address\n';
    const rows = activityLogs.map((log) =>
      [
        log.created_at,
        `"${log.user_name || ''}"`,
        log.user_email,
        log.action,
        `"${log.details.replace(/"/g, '""')}"`,
        log.ip_address || '',
      ].join(',')
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({ message: 'Activity log exported', variant: 'success' });
  };

  const clearFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setPage(0);
  };

  const hasActiveFilters = !!(filterUser || filterAction || filterDateFrom || filterDateTo || searchQuery);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track all actions across your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <PopButton onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </PopButton>
          <PopButton
            color={showFilters ? 'blue' : undefined}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" /> Filters
            {hasActiveFilters && (
              <span className="ml-1.5 w-2 h-2 bg-blue-400 rounded-full inline-block" />
            )}
          </PopButton>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          placeholder="Search activity logs..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* ─── Filters Panel ──────────────────────────────────────── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
              <select
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All users</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user_id || m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All actions</option>
                {ALL_ACTIONS.map((a) => (
                  <option key={a} value={a}>{ACTIVITY_ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Clear all filters
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Activity List ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {activityLogsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : activityLogsError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-sm text-red-600">Couldn't load activity. {activityLogsError}</p>
            <button
              onClick={loadLogs}
              className="mt-3 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="w-10 h-10 mb-3" />
            <p className="text-sm">No activity logged yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activityLogs.map((log, i) => {
              const colorCls = ACTIVITY_ACTION_COLORS[log.action as ActivityAction] || 'text-gray-600 bg-gray-50';
              const icon = ACTION_ICONS[log.action as ActivityAction] || <Settings className="w-4 h-4" />;
              const label = ACTIVITY_ACTION_LABELS[log.action as ActivityAction] || log.action;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colorCls}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {log.user_name || log.user_email?.split('@')[0] || 'System'}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorCls}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{log.details}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{formatTimestamp(log.created_at)}</span>
                      {log.ip_address && (
                        <span className="text-xs text-gray-400">IP: {log.ip_address}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-5 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs sm:text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, activityLogsTotalCount)} of {activityLogsTotalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;
