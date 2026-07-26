import { useState, useEffect, useMemo } from 'react';
import { PhoneMissed, Zap, Moon, Calendar, Inbox, BookOpen, FlaskConical, MessageSquare, UserCheck, MailCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSetupStore } from '../stores/setupStore';

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

export type SetupStep = {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: LucideIcon;
  completed: boolean;
  timeEstimate?: string;
  credits: number;
};

// Personalized tasks driven by survey.painPoints answered during setup.
// The /start flow bridges its own pain vocabulary onto these keys via
// PAIN_TO_STORE_KEY (src/lib/setup/painMap.ts) — the raw /start values
// (slow_followup, front_desk) are also accepted here as aliases so a
// direct write never silently drops the personalization.
export const PAIN_POINT_TASKS: Record<string, Omit<SetupStep, 'completed'>> = {
  missed_calls: {
    id: 'missed_calls',
    title: 'Set up Missed-Call Recovery',
    description: 'Auto-text every missed call within seconds',
    link: '/dashboard/conversations/missed',
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

// Aliases for /start's pain vocabulary. Same task template surfaced under
// the raw /start key so a bridge miss doesn't silently drop personalization.
PAIN_POINT_TASKS.slow_followup = PAIN_POINT_TASKS.slow_response;
PAIN_POINT_TASKS.front_desk = PAIN_POINT_TASKS.manual_booking;

// Always-shown core tasks (regardless of survey answers)
export const CORE_TASKS: Omit<SetupStep, 'completed'>[] = [
  { id: 'knowledge_base', title: 'Setup Knowledge Base', description: 'Add your business information', link: '/dashboard/your-ai/knowledge', icon: BookOpen, timeEstimate: 'About 1 min', credits: 5 },
  { id: 'test_agent', title: 'Test Your Agent', description: 'Test and verify your setup', link: '/dashboard/your-ai/test', icon: FlaskConical, timeEstimate: 'About 1 min', credits: 3 },
  { id: 'feedback', title: 'Give Feedback', description: 'Share your experience with us', link: '/dashboard/feedback', icon: MessageSquare, timeEstimate: 'About 1 min', credits: 2 },
];

// Endowed progress (P6): pre-completed steps so a fresh user never sees 0%
export const ENDOWED_TASKS: SetupStep[] = [
  { id: 'account_created', title: 'Account created', description: '', link: '/dashboard', icon: UserCheck, completed: true, credits: 0 },
  { id: 'email_verified', title: 'Email verified', description: '', link: '/dashboard', icon: MailCheck, completed: true, credits: 0 },
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

export async function fetchCompletionSignals(userId: string): Promise<CompletionSignals> {
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

export interface SetupProgress {
  steps: SetupStep[];       // endowed steps first, then personalized + core
  completedCount: number;
  totalCount: number;
  pct: number;              // includes endowed steps — never 0 for a fresh user
  nextStep: SetupStep | null;
  isComplete: boolean;
  loading: boolean;
}

export function useSetupProgress(): SetupProgress {
  const { user } = useAuth();
  const painPoints = useSetupStore((s) => s.survey.painPoints);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchCompletionSignals(user.id)
      .then((signals) => {
        if (!cancelled) setCompletedIds(resolveCompletedStepIds(signals));
      })
      .catch((error) => {
        console.error('Failed to detect setup progress:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return useMemo(() => {
    const personalized = painPoints
      .map((p) => PAIN_POINT_TASKS[p])
      .filter(Boolean)
      .map((task) => ({ ...task, completed: completedIds.has(task.id) }));

    const core = CORE_TASKS.map((task) => ({ ...task, completed: completedIds.has(task.id) }));

    // Fall back to all features if survey was skipped
    const dynamic = personalized.length === 0
      ? [...Object.values(PAIN_POINT_TASKS).map((task) => ({ ...task, completed: completedIds.has(task.id) })), ...core]
      : [...personalized, ...core];

    const steps = [...ENDOWED_TASKS, ...dynamic];
    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const nextStep = steps.find((s) => !s.completed) ?? null;

    return {
      steps,
      completedCount,
      totalCount,
      pct,
      nextStep,
      isComplete: nextStep === null,
      loading,
    };
  }, [painPoints, completedIds, loading]);
}
