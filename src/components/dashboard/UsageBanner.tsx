import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useTokens } from '../../contexts/TokenContext';
import { getResourceConfig, isStructuralLimitResource } from '../../lib/plan-limits';
import type { ResourceType } from '../../lib/plan-limits';

interface UsageBannerProps {
  className?: string;
}

const UsageBanner: React.FC<UsageBannerProps> = ({ className = '' }) => {
  const { getAllResourceUsages, planTier } = useUsageTracking();
  const { monthlyAllocation, tokensUsed } = useTokens();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  const structuralWarnings = getAllResourceUsages().filter(
    (r) =>
      isStructuralLimitResource(r.resource) &&
      (r.isAtLimit || r.isApproaching) &&
      !dismissed.has(r.resource)
  );

  const tokenPercentage = monthlyAllocation > 0
    ? Math.min((tokensUsed / monthlyAllocation) * 100, 100)
    : 0;
  const sharedPoolAtLimit = monthlyAllocation > 0 && tokenPercentage >= 100 && !dismissed.has('shared_pool');
  const sharedPoolApproaching = monthlyAllocation > 0 && tokenPercentage >= 80 && tokenPercentage < 100 && !dismissed.has('shared_pool');

  if (planTier === 'enterprise' || (!sharedPoolAtLimit && !sharedPoolApproaching && structuralWarnings.length === 0)) {
    return null;
  }

  const atLimit = structuralWarnings.filter((w) => w.isAtLimit);
  const approaching = structuralWarnings.filter((w) => w.isApproaching && !w.isAtLimit);

  const dismiss = (resource: ResourceType) => {
    setDismissed((prev) => new Set([...prev, resource]));
  };

  return (
    <AnimatePresence>
      <div className={`space-y-2 ${className}`}>
        {sharedPoolAtLimit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Shared credits exhausted
                </p>
                <p className="text-xs text-red-600">
                  Phone, SMS, website chat, and the rest all pull from the same pool. You&apos;ve used {tokensUsed.toLocaleString()} of {monthlyAllocation.toLocaleString()} credits.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/settings/plan-billing"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Upgrade <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, 'shared_pool']))}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {sharedPoolApproaching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Shared credits running low
                </p>
                <p className="text-xs text-amber-600">
                  {Math.round(tokenPercentage)}% used. Phone, SMS, and website usage all draw from this same credit pool.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/settings/usage"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-lg hover:bg-amber-200 transition-colors"
              >
                View Usage <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, 'shared_pool']))}
                className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {atLimit.map((w) => {
          const config = getResourceConfig(w.resource);
          return (
            <motion.div
              key={w.resource}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {config.label} limit reached
                  </p>
                  <p className="text-xs text-red-600">
                    You&apos;ve used {w.current.toLocaleString()} of {w.limit.toLocaleString()} {config.unit}. Upgrade to continue.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard/settings/plan-billing"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Upgrade <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => dismiss(w.resource)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {approaching.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Approaching {approaching.length > 1 ? 'multiple limits' : `${getResourceConfig(approaching[0].resource).label} limit`}
                </p>
                <p className="text-xs text-amber-600">
                  {approaching.map((a) => {
                    const cfg = getResourceConfig(a.resource);
                    return `${cfg.label}: ${Math.round(a.percentage)}%`;
                  }).join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/settings/usage"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-lg hover:bg-amber-200 transition-colors"
              >
                View Usage <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => approaching.forEach((a) => dismiss(a.resource))}
                className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default UsageBanner;
