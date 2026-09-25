import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

// ponytail: this page's tabs (funnel/roi/live/heatmap) all read tables that
// don't exist yet (call_logs, daily_metrics, callbacks columns) — every one
// 404s/400s for every real customer. Replaced with an honest empty state
// until analyticsApi.ts points at real tables. Real numbers today live at
// Growth -> Analytics (fetchUserCallStats/fetchUserLeadsCount).
const DeepAnalyticsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-14 h-14 mb-4 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-xl font-semibold text-text-main dark:text-white mb-2">
        Detailed analytics are coming soon
      </h1>
      <p className="text-sm text-text-muted max-w-md mb-6">
        See Growth → Analytics for your call and lead numbers.
      </p>
      <Link
        to="/dashboard/growth/analytics"
        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
      >
        Go to Growth → Analytics
      </Link>
    </div>
  );
};

export default DeepAnalyticsPage;
