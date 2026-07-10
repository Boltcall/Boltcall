import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Standard content card (P2 chunking: pages show ≤3 sections expanded).
type Props = {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
};

const SectionCard: React.FC<Props> = ({ title, collapsible = false, defaultCollapsed = false, children, className = '' }) => {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  return (
    <section className={`rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-6 ${className}`}>
      {title && (
        collapsible ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </button>
        ) : (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        )
      )}
      {!collapsed && <div className="space-y-3">{children}</div>}
    </section>
  );
};

export default SectionCard;
