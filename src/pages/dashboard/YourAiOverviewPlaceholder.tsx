import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const YourAiOverviewPlaceholder: React.FC = () => (
  <div className="p-6 md:p-10">
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Your AI overview
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Live status, house rules, and recent decisions land here in the next update.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/dashboard/your-ai/personality"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Open personality
        </Link>
        <Link
          to="/dashboard/your-ai/knowledge"
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a30] text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-colors"
        >
          Knowledge
        </Link>
      </div>
    </div>
  </div>
);

export default YourAiOverviewPlaceholder;
