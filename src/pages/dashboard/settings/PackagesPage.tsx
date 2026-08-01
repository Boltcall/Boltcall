import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Star, MessageSquare, Loader2, AlertCircle, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { PremiumToggle } from '../../../components/ui/bouncy-toggle';

type FeatureKey = 'reminders' | 'reputation_manager' | 'chatbot';

interface PackageDef {
  key: FeatureKey;
  name: string;
  tagline: string;
  description: string;
  price: string;
  priceNote: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  iconBg: string;
  borderActive: string;
  shadowActive: string;
  badgeText?: string;
  badgeBg: string;
  features: string[];
  configLink: string;
}

const PACKAGES: PackageDef[] = [
  {
    key: 'reminders',
    name: 'Appointment Reminders',
    tagline: 'Reduce no-shows automatically',
    description: 'Send timely SMS and email reminders so clients show up — without you lifting a finger.',
    price: '$29',
    priceNote: '/ month',
    icon: Clock,
    accentColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    borderActive: 'border-emerald-400',
    shadowActive: 'shadow-emerald-100',
    badgeText: 'Popular',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    features: [
      'Automated SMS reminders before appointments',
      'Email reminders with custom timing',
      'Customizable reminder templates',
      'Two-way confirmation replies',
      'No-show reduction analytics',
    ],
    configLink: '/dashboard/reminders',
  },
  {
    key: 'reputation_manager',
    name: 'Reputation Manager',
    tagline: 'Grow your 5-star reviews on autopilot',
    description: 'Automatically request Google reviews at the right moment — when your clients are happiest.',
    price: '$29',
    priceNote: '/ month',
    icon: Star,
    accentColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    borderActive: 'border-amber-400',
    shadowActive: 'shadow-amber-100',
    badgeBg: '',
    features: [
      'Auto-request Google reviews after service',
      'Smart timing — send when satisfaction is highest',
      'Customizable review request messages',
      'Track review count over time',
      'Negative feedback filter',
    ],
    configLink: '/dashboard/reputation',
  },
  {
    key: 'chatbot',
    name: 'Website Chatbot',
    tagline: 'Turn website visitors into booked clients',
    description: 'An AI chat bubble on your site that answers questions and books appointments 24/7.',
    price: '$39',
    priceNote: '/ month',
    icon: MessageSquare,
    accentColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    borderActive: 'border-violet-400',
    shadowActive: 'shadow-violet-100',
    badgeText: 'New',
    badgeBg: 'bg-violet-100 text-violet-700',
    features: [
      'AI chat bubble on your website',
      'Answers FAQs and books appointments',
      'Customizable appearance & brand colors',
      'Captures visitor contact info',
      'Works 24/7 without you',
    ],
    configLink: '/dashboard/chat-widget',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const PackagesPage: React.FC = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('business_features')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (fetchError || !data) {
          setError('Failed to load package settings.');
          setLoading(false);
          return;
        }
        setFeatures({
          reminders: data.reminders_enabled ?? false,
          reputation_manager: data.reputation_manager_enabled ?? false,
          chatbot: data.chatbot_enabled ?? false,
        });
      } catch {
        setError('Failed to load packages. Please try again.');
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleFeature = async (key: FeatureKey) => {
    if (!user) return;
    const newValue = !features[key];
    setToggling(key);
    try {
      const { error: updateError } = await supabase
        .from('business_features')
        .update({ [`${key}_enabled`]: newValue, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (updateError) {
        setError(`Failed to toggle ${key.replace(/_/g, ' ')}.`);
        setTimeout(() => setError(null), 4000);
        setToggling(null);
        return;
      }
      setFeatures((prev) => ({ ...prev, [key]: newValue }));
    } catch {
      setError('Something went wrong. Please try again.');
      setTimeout(() => setError(null), 4000);
    }
    setToggling(null);
  };

  const activeCount = Object.values(features).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Add-on Packages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
            Extend your Boltcall workspace with powerful add-ons. Each package integrates seamlessly — enable what fits your business, skip what doesn't.
          </p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-full px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            {activeCount} package{activeCount > 1 ? 's' : ''} active
          </div>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 text-sm transition-colors duration-200 ease-out"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Package cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {PACKAGES.map((pkg, i) => {
          const Icon = pkg.icon;
          const enabled = features[pkg.key] ?? false;
          const isToggling = toggling === pkg.key;

          return (
            <motion.div
              key={pkg.key}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`
                relative flex flex-col bg-white dark:bg-[#111114] rounded-2xl border transition-all duration-200 ease-out overflow-hidden
                ${enabled
                  ? `border-2 ${pkg.borderActive} shadow-lg ${pkg.shadowActive} dark:shadow-black/40`
                  : 'border border-gray-200 dark:border-[#1e1e24] hover:border-gray-300 dark:hover:border-[#2a2a30] hover:shadow-md dark:hover:shadow-black/30 shadow-sm'
                }
              `}
            >
              {/* Active ribbon */}
              {enabled && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
              )}

              {/* Card body */}
              <div className="p-6 flex-1 flex flex-col gap-5">

                {/* Icon + badge row */}
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${pkg.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${pkg.accentColor}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {pkg.badgeText && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pkg.badgeBg}`}>
                        {pkg.badgeText}
                      </span>
                    )}
                    {enabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Name + tagline */}
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">{pkg.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{pkg.description}</p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{pkg.price}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">{pkg.priceNote}</span>
                </div>

                {/* Feature list */}
                <ul className="space-y-2.5 flex-1">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" strokeWidth={3} />
                      </div>
                      <span className="text-[13px] text-gray-600 dark:text-gray-400 leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#17171b] bg-gray-50/60 dark:bg-[#17171b]/60 flex items-center justify-between gap-3">
                <Link
                  to={pkg.configLink}
                  className={`
                    inline-flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 ease-out group
                    ${enabled ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
                  `}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Configure
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out" />
                </Link>

                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {isToggling ? (
                    <div className="w-12 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                    </div>
                  ) : (
                    <PremiumToggle checked={enabled} onChange={() => toggleFeature(pkg.key)} />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
        Add-ons are billed separately on top of your base plan. Changes take effect immediately.
      </p>
    </div>
  );
};

export default PackagesPage;
