import React, { useState, useEffect } from 'react';
// motion removed — cards are now minimal rows
import { Link } from 'react-router-dom';
import {
  Phone, MessageSquare, Zap,
  Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PremiumToggle } from '../ui/bouncy-toggle';

type FeatureKey =
  | 'voice_agent'
  | 'speed_to_lead'
  | 'chatbot'
  | 'reminders'
  | 'lead_reactivation'
  | 'reputation_manager';

type FeatureCard = {
  key: FeatureKey;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  configLink: string;
  needsEmbed: boolean;
};

// Core services — Speed to Lead + AI Receptionist focus
const CORE_FEATURES: FeatureCard[] = [
  {
    key: 'speed_to_lead',
    name: 'Speed to Lead',
    description: 'Instantly reply to new leads within 60 seconds — SMS, qualify, and book',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    configLink: '/dashboard/speed-to-lead',
    needsEmbed: true,
  },
  {
    key: 'voice_agent',
    name: 'AI Receptionist',
    description: 'Never miss a call — AI picks up, qualifies, and books appointments',
    icon: Phone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    configLink: '/dashboard/ai-receptionist',
    needsEmbed: false,
  },
  {
    key: 'chatbot',
    name: 'Website Chatbot',
    description: 'AI chat bubble on your website that answers questions and books',
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    configLink: '/dashboard/website-bubble',
    needsEmbed: true,
  },
];


// Readiness data collected from DB
interface ReadinessData {
  hasAgent: boolean;
  agentName: string | null;
  agentId: string | null;
  hasPhone: boolean;
  phoneNumber: string | null;
  hasCalcom: boolean;
  businessName: string | null;
  embedToken: string | null;
  googleReviewUrl: string | null;
  remindersConfig: Record<string, any> | null;
  reputationConfig: Record<string, any> | null;
}

const FeatureHub: React.FC = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  // expandedCard removed — cards are now minimal
  const [_readiness, setReadiness] = useState<ReadinessData>({
    hasAgent: false, agentName: null, agentId: null,
    hasPhone: false, phoneNumber: null,
    hasCalcom: false, businessName: null, embedToken: null,
    googleReviewUrl: null, remindersConfig: null, reputationConfig: null,
  });

  // Inline form states
  // Inline setup state removed — configuration now happens on dedicated pages

  // Fetch everything on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Parallel fetch all data we need
        const [featuresRes, agentRes, phoneRes, profileRes] = await Promise.all([
          supabase
            .from('business_features')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('agents')
            .select('id, name, agent_type')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('phone_numbers')
            .select('id, phone_number')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('business_profiles')
            .select('id, business_name')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        // Handle business_features
        let data = featuresRes.data;
        if (featuresRes.error || !data) {
          const { data: newRow, error: insertError } = await supabase
            .from('business_features')
            .insert({ user_id: user.id, workspace_id: user.id })
            .select()
            .single();
          if (insertError) {
            setError('Failed to initialize features. Please refresh.');
            setLoading(false);
            return;
          }
          data = newRow;
        }

        if (data) {
          setFeatures({
            voice_agent: data.voice_agent_enabled ?? false,
            speed_to_lead: data.speed_to_lead_enabled ?? false,
            chatbot: data.chatbot_enabled ?? false,
            reminders: data.reminders_enabled ?? false,
            lead_reactivation: data.lead_reactivation_enabled ?? false,
            reputation_manager: data.reputation_manager_enabled ?? false,
          });

          const repConfig = (data.reputation_manager_config || {}) as Record<string, any>;
          const remConfig = (data.reminders_config || {}) as Record<string, any>;

          setReadiness({
            hasAgent: !!agentRes.data,
            agentName: agentRes.data?.name || null,
            agentId: agentRes.data?.id || null,
            hasPhone: !!phoneRes.data,
            phoneNumber: phoneRes.data?.phone_number || null,
            hasCalcom: !!remConfig.cal_connected,
            businessName: profileRes.data?.business_name || null,
            embedToken: data.embed_token || null,
            googleReviewUrl: repConfig.google_review_url || null,
            remindersConfig: remConfig,
            reputationConfig: repConfig,
          });

          // google review URL stored in readiness
        }
      } catch (err) {
        console.error('FeatureHub load error:', err);
        setError('Failed to load features. Please try again.');
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
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setTimeout(() => setError(null), 4000);
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">Dismiss</button>
        </div>
      )}

      {/* Core Services — Speed to Lead + AI Receptionist */}
      <div className="bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
        <div className="bg-gray-50 dark:bg-[#0e0e11] border-b border-gray-200 dark:border-[#1e1e24] px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Core Services</h2>
          <span className="text-xs text-gray-400 font-medium">
            {CORE_FEATURES.filter(f => features[f.key]).length}/{CORE_FEATURES.length} active
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#1e1e24]">
          {CORE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const enabled = features[feature.key];
            const isToggling = toggling === feature.key;

            return (
              <div
                key={feature.key}
                data-onboarding={`feature-${feature.key}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${feature.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{feature.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  {!enabled && (
                    <Link
                      to={feature.configLink}
                      className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                    >
                      Configure
                    </Link>
                  )}
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <PremiumToggle
                      checked={enabled}
                      onChange={() => toggleFeature(feature.key)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default FeatureHub;
