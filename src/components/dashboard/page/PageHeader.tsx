import React from 'react';

// One primary action per page (P3 Von Restorff, P23 Fitts: consistent top-right).
// The layout topbar already shows the page name; use this only when a page
// needs a subtitle or an action row below it.
type Props = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode; // exactly ONE primary action
};

const PageHeader: React.FC<Props> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="min-w-0">
      {title && <h2 className="text-[28px] leading-tight font-bold text-gray-900 dark:text-gray-100">{title}</h2>}
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export default PageHeader;
