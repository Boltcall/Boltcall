import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { avgJobValueFor } from '../data/industryDefaults';

export type FeatureSuggestion = {
  id: string;
  title: string;
  description: string;
  link: string;
};

export type TriggerInputs = {
  missedCalls7d: number;
  bookedJobs: number;
  smsOn: boolean;
  remindersOn: boolean;
  reputationOn: boolean;
  avgJobValue: number;
  agentName: string;
};

// Progressive disclosure (P16): at most ONE suggestion (P3), each backed by a
// real trigger from store data. Every $ figure is a labeled industry estimate.
// ponytail: website-chat trigger from the plan is dropped — no chat-volume
// data source exists in the store yet; add when chatStats is actually fed.
export function pickFeatureSuggestion(inputs: TriggerInputs): FeatureSuggestion | null {
  const { missedCalls7d, bookedJobs, smsOn, remindersOn, reputationOn, avgJobValue, agentName } = inputs;

  if (missedCalls7d >= 3 && !smsOn) {
    const est = missedCalls7d * avgJobValue;
    return {
      id: 'sms_textback',
      title: `You missed ${missedCalls7d} calls this week (~$${est.toLocaleString()} est.)`,
      description: `Turn on text-back — ${agentName} texts every missed caller before they call a competitor. Estimate based on your industry's average job value.`,
      link: '/dashboard/sms',
    };
  }

  if (bookedJobs >= 1 && !remindersOn) {
    return {
      id: 'reminders',
      title: 'Cut no-shows automatically',
      description: `${agentName} can remind every booked customer before their appointment.`,
      link: '/dashboard/growth/reminders',
    };
  }

  if (bookedJobs >= 10 && !reputationOn) {
    return {
      id: 'reputation',
      title: 'Turn happy customers into reviews',
      description: `${agentName} asks satisfied customers for a Google review after the job.`,
      link: '/dashboard/growth/reputation',
    };
  }

  return null;
}

export function useFeatureTriggers(agentName: string): FeatureSuggestion | null {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<FeatureSuggestion | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    Promise.all([
      supabase
        .from('callbacks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('conversation_wins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('outcome_type', 'booked'),
      supabase
        .from('business_features')
        .select('sms_enabled, reminders_enabled, reputation_manager_enabled')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('business_profiles')
        .select('main_category')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([missedRes, bookedRes, featuresRes, profileRes]) => {
      if (cancelled) return;
      const features = featuresRes.data;
      setSuggestion(pickFeatureSuggestion({
        missedCalls7d: missedRes.count ?? 0,
        bookedJobs: bookedRes.count ?? 0,
        smsOn: features?.sms_enabled ?? false,
        remindersOn: features?.reminders_enabled ?? false,
        reputationOn: features?.reputation_manager_enabled ?? false,
        avgJobValue: avgJobValueFor(profileRes.data?.main_category),
        agentName,
      }));
    });

    return () => { cancelled = true; };
  }, [user?.id, agentName]);

  return suggestion;
}
