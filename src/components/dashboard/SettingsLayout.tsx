import React, { Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsLayoutProps {
  children?: React.ReactNode;
}

const categories = [
  {
    id: 'account',
    label: 'Account & Settings',
    sidebar: [
      { id: 'general', label: 'General', route: '/dashboard/settings/general' },
      { id: 'services', label: 'Services & Pricing', route: '/dashboard/settings/services' },
      { id: 'workspace', label: 'Workspace', route: '/dashboard/settings/workspace' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Usage',
    sidebar: [
      { id: 'plan-billing', label: 'Billing', route: '/dashboard/settings/plan-billing' },
      { id: 'usage', label: 'Usage', route: '/dashboard/settings/usage' },
    ],
  },
  {
    id: 'team',
    label: 'Team & Security',
    sidebar: [
      { id: 'members', label: 'Team Members', route: '/dashboard/settings/members' },
      { id: 'roles', label: 'Roles & Permissions', route: '/dashboard/settings/roles' },
      { id: 'activity-log', label: 'Activity Log', route: '/dashboard/settings/activity-log' },
      { id: 'api-keys', label: 'API Keys', route: '/dashboard/settings/api-keys' },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    sidebar: [
      { id: 'preferences', label: 'Appearance & Region', route: '/dashboard/settings/preferences' },
      { id: 'notifications', label: 'Notifications', route: '/dashboard/settings/notifications' },
    ],
  },
];

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const location = useLocation();

  const activeCategory = categories.find((cat) =>
    cat.sidebar.some(
      (item) =>
        location.pathname === item.route ||
        location.pathname.startsWith(item.route + '/')
    )
  ) || categories[0];

  return (
    <div className="flex flex-col">
      {/* Page Header */}
      <div className="bg-white/60 dark:bg-[#0e0e11]/60 backdrop-blur-md border-b border-gray-200/70 dark:border-[#1e1e24]/70 flex-shrink-0 px-4 md:px-6 pt-5 pb-0">
        {/* Top Tabs — category-level navigation */}
        <nav className="flex gap-6 -mb-px overflow-x-auto scrollbar-hide">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategory.id;
              const defaultRoute = cat.sidebar[0].route;

              return (
                <Link
                  key={cat.id}
                  to={defaultRoute}
                  className={`relative py-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-out ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  {cat.label}
                  {isActive && (
                    <motion.span
                      layoutId="settings-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
      </div>

      {/* Mobile sidebar — horizontal pill strip */}
      <div className="md:hidden bg-white/60 dark:bg-[#0e0e11]/60 backdrop-blur-md border-b border-gray-200/70 dark:border-[#1e1e24]/70 px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {activeCategory.sidebar.map((item) => {
            const isActive =
              location.pathname === item.route ||
              location.pathname.startsWith(item.route + '/');

            return (
              <Link
                key={item.id}
                to={item.route}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#17171b] dark:text-gray-300 dark:hover:bg-[#1e1e24]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Body — sidebar + content */}
      <div className="flex">
        {/* Left Sidebar — desktop only */}
        <div className="hidden md:block w-56 bg-white/40 dark:bg-[#0e0e11]/40 border-r border-gray-200/70 dark:border-[#1e1e24]/70 flex-shrink-0">
          <nav className="py-5 px-4 space-y-1">
            {activeCategory.sidebar.map((item) => {
              const isActive =
                location.pathname === item.route ||
                location.pathname.startsWith(item.route + '/');

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className={`relative block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-out ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#17171b] dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="settings-side-indicator"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-600 dark:bg-blue-400 rounded-r"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-50 dark:bg-[#0a0a0c] min-h-[60vh]">
          <div className="p-4 md:p-12 max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={null}>
                  {children || <Outlet />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
