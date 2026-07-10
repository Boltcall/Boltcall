import React from 'react';
import { NavLink } from 'react-router-dom';

export type DashboardTab = {
  to: string;
  label: string;
  icon?: React.ReactNode;
};

type Props = {
  tabs: DashboardTab[];
  className?: string;
};

const DashboardTabBar: React.FC<Props> = ({ tabs, className = '' }) => (
  <div
    role="tablist"
    className={`flex items-center gap-1 border-b border-gray-200 dark:border-[#1e1e24] px-3 md:px-6 overflow-x-auto ${className}`}
  >
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        role="tab"
        end
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
            isActive
              ? 'border-blue-600 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`
        }
      >
        {tab.icon}
        <span>{tab.label}</span>
      </NavLink>
    ))}
  </div>
);

export default DashboardTabBar;
