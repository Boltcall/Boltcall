import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ServiceEmptyStateProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  description: string;
  setupLabel?: string;
  setupTo?: string;
  onSetup?: () => void;
}

const ServiceEmptyState: React.FC<ServiceEmptyStateProps> = ({
  icon,
  iconBg = 'bg-blue-50',
  title,
  description,
  setupLabel = 'Set Up Now',
  setupTo,
  onSetup,
}) => {
  const buttonClass = 'inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors';
  const button = setupTo ? (
    <Link to={setupTo} className={buttonClass}>
      {setupLabel}
      <ArrowRight className="w-4 h-4" />
    </Link>
  ) : (
    <button onClick={onSetup} className={buttonClass}>
      {setupLabel}
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className={`w-16 h-16 rounded-2xl ${iconBg} dark:bg-blue-950/40 flex items-center justify-center mb-5`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7">{description}</p>
        {button}
      </div>
    </div>
  );
};

export default ServiceEmptyState;
