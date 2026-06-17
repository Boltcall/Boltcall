import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, PhoneMissed, Zap, Moon, Calendar, Inbox, BookOpen, FlaskConical, MessageSquare, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupStore } from '../../stores/setupStore';

export interface CompletionSignals {
  hasKnowledgeBase: boolean;
  hasPhoneNumber: boolean;
  hasInboundAgent: boolean;
  hasSpeedToLeadAgent: boolean;
  hasLeadTracking: boolean;
  hasCompletedAgentTest: boolean;
  hasCalendarConnection: boolean;
  hasAdLeadConnection: boolean;
  hasSubmittedFeedback: boolean;
}

type Step = {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: LucideIcon;
  completed: boolean;
  timeEstimate?: string;
  credits: number;
};

// Personalized tasks driven by survey.painPoints answered during setup
const PAIN_POINT_TASKS: Record<string, Omit<Step, 'completed'>> = {
  missed_calls: {
    id: 'missed_calls',
    title: 'Set up Missed-Call Recovery',
    description: 'Auto-text every missed call within seconds',
    link: '/dashboard/missed-calls',
    icon: PhoneMissed,
    timeEstimate: 'About 2 min',
    credits: 4,
  },
  ad_followup: {
    id: 'ad_followup',
    title: 'Connect Your Ad Lead Sources',
    description: 'Reply to Facebook & Google ad leads instantly',
    link: '/dashboard/instant-lead-response',
    icon: Zap,
    timeEstimate: 'About 3 min',
    credits: 5,
  },
  after_hours: {
    id: 'after_hours',
    title: 'Enable 24/7 AI Receptionist',
    description: 'Pick up every call after hours and on weekends',
    link: '/dashboard/ai-receptionist',
    icon: Moon,
    timeEstimate: 'About 2 min',
    credits: 4,
  },
  slow_response: {
    id: 'slow_response',
    title: 'Configure Speed-to-Lead',
    description: 'Respond to every new lead in under 60 seconds',
    link: '/dashboard/leads',
    icon: Zap,
    timeEstimate: 'About 2 min',
    credits: 3,
  },
  manual_booking: {
    id: 'manual_booking',
    title: 'Connect Your Calendar',
    description: 'Let leads book themselves via Cal.com',
    link: '/dashboard/calcom',
    icon: Calendar,
    timeEstimate: 'About 2 min',
    credits: 4,
  },
  no_system: {
    id: 'no_system',
    title: 'Set Up Lead Tracking',
    description: 'Track every lead in one centralized inbox',
    link: '/dashboard/leads',
    icon: Inbox,
    timeEstimate: 'About 1 min',
    credits: 3,
  },
};

// Always-shown core tasks (regardless of survey answers)
const CORE_TASKS: Omit<Step, 'completed'>[] = [
  { id: 'knowledge_base', title: 'Setup Knowledge Base', description: 'Add your business information', link: '/dashboard/knowledge-base', icon: BookOpen, timeEstimate: 'About 1 min', credits: 5 },
  { id: 'test_agent', title: 'Test Your Agent', description: 'Test and verify your setup', link: '/dashboard/agents?tab=tests', icon: FlaskConical, timeEstimate: 'About 1 min', credits: 3 },
  { id: 'feedback', title: 'Give Feedback', description: 'Share your experience with us', link: '/dashboard/feedback', icon: MessageSquare, timeEstimate: 'About 1 min', credits: 2 },
];

const INBOUND_AGENT_TYPES = new Set(['inbound', 'ai_receptionist', 'voice_agent']);
const SPEED_TO_LEAD_AGENT_TYPES = new Set(['speed_to_lead', 'outbound_speed_to_lead', 'follow_up']);

function isActiveAgent(agent: { status?: string | null }) {
  return !agent.status || agent.status === 'active';
}

export function resolveCompletedStepIds(signals: CompletionSignals): Set<string> {
  const completed = new Set<string>();

  if (signals.hasKnowledgeBase) completed.add('knowledge_base');
  if (signals.hasPhoneNumber) completed.add('missed_calls');
  if (signals.hasInboundAgent) completed.add('after_hours');
  if (signals.hasSpeedToLeadAgent) completed.add('slow_response');
  if (signals.hasLeadTracking) completed.add('no_system');
  if (signals.hasCompletedAgentTest) completed.add('test_agent');
  if (signals.hasCalendarConnection) completed.add('manual_booking');
  if (signals.hasAdLeadConnection) completed.add('ad_followup');
  if (signals.hasSubmittedFeedback) completed.add('feedback');

  return completed;
}

async function fetchCompletionSignals(userId: string): Promise<CompletionSignals> {
  const [
    kbRes,
    leadRes,
    phoneRes,
    agentRes,
    featureRes,
    integrationRes,
    facebookRes,
    agentTestRes,
  ] = await Promise.all([
    supabase
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('agents')
      .select('agent_type, status, retell_agent_id')
      .eq('user_id', userId),
    supabase
      .from('business_features')
      .select('reminders_config, google_lead_form_key')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_integrations')
      .select('provider')
      .eq('user_id', userId),
    supabase
      .from('facebook_page_connections')
      .select('id', { count: 'exact', head: true })
      .or(`workspace_id.eq.${userId},user_id.eq.${userId}`),
    supabase
      .from('agent_test_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed'),
  ]);

  const agents = Array.isArray(agentRes.data) ? agentRes.data : [];
  const remindersConfig = (featureRes.data?.reminders_config ?? {}) as Record<string, unknown>;
  const providers = new Set(
    Array.isArray(integrationRes.data)
      ? integrationRes.data
          .map((row: { provider?: string | null }) => row.provider)
          .filter((provider): provider is string => typeof provider === 'string')
      : [],
  );

  return {
    hasKnowledgeBase: (kbRes.count ?? 0) > 0,
    hasPhoneNumber: (phoneRes.count ?? 0) > 0,
    hasInboundAgent: agents.some((agent: { agent_type?: string | null; status?: string | null }) =>
      isActiveAgent(agent) && INBOUND_AGENT_TYPES.has(agent.agent_type ?? ''),
    ),
    hasSpeedToLeadAgent: agents.some((agent: { agent_type?: string | null; status?: string | null }) =>
      isActiveAgent(agent) && SPEED_TO_LEAD_AGENT_TYPES.has(agent.agent_type ?? ''),
    ),
    hasLeadTracking: (leadRes.count ?? 0) > 0,
    hasCompletedAgentTest: (agentTestRes.count ?? 0) > 0,
    hasCalendarConnection:
      remindersConfig.cal_connected === true ||
      providers.has('calcom') ||
      providers.has('google_calendar'),
    hasAdLeadConnection:
      (facebookRes.count ?? 0) > 0 ||
      (typeof featureRes.data?.google_lead_form_key === 'string' &&
        featureRes.data.google_lead_form_key.trim().length > 0),
    hasSubmittedFeedback:
      typeof window !== 'undefined' &&
      window.localStorage.getItem(`boltcall_feedback_submitted:${userId}`) === 'true',
  };
}

const GettingStartedPage: React.FC = () => {
  const { user } = useAuth();
  const painPoints = useSetupStore((s) => s.survey.painPoints);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const STEPS = useMemo<Step[]>(() => {
    // Personalized tasks first, in the order the user picked them
    const personalized = painPoints
      .map((p) => PAIN_POINT_TASKS[p])
      .filter(Boolean)
      .map((task) => ({ ...task, completed: completedIds.has(task.id) }));

    const core = CORE_TASKS.map((task) => ({ ...task, completed: completedIds.has(task.id) }));

    // Fall back to all features if survey was skipped
    if (personalized.length === 0) {
      const allFeatures = Object.values(PAIN_POINT_TASKS).map((task) => ({
        ...task,
        completed: completedIds.has(task.id),
      }));
      return [...allFeatures, ...core];
    }

    return [...personalized, ...core];
  }, [painPoints, completedIds]);

  const completedCount = STEPS.filter(s => s.completed).length;
  const progressPct = STEPS.length > 0 ? Math.round((completedCount / STEPS.length) * 100) : 0;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const detect = async () => {
      try {
        const signals = await fetchCompletionSignals(user.id);
        if (!cancelled) {
          setCompletedIds(resolveCompletedStepIds(signals));
        }
      } catch (error) {
        console.error('Failed to detect getting-started progress:', error);
      }
    };

    void detect();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
        <div className="bg-gray-50 dark:bg-[#0e0e11] border-b border-gray-200 dark:border-[#1e1e24] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Getting Started</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {painPoints.length > 0
                ? 'Personalized for what you told us matters most'
                : 'Complete these steps to go live'}
            </p>
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {completedCount} of {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-[#1e1e24]">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-4">
          <div className="space-y-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.id}
                  to={step.link}
                  className="flex items-center gap-3 bg-gray-50 dark:bg-[#0e0e11] rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] transition-colors border border-gray-200 dark:border-[#1e1e24]"
                >
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-[#2a2a32]" />
                    )}
                  </div>

                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${step.completed ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                        {step.title}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {step.credits} credits
                      </span>
                    </div>
                    {!step.completed && (
                      <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                    )}
                  </div>

                  {!step.completed && step.timeEstimate && (
                    <span className="flex-shrink-0 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {step.timeEstimate}
                    </span>
                  )}

                  <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedPage;
