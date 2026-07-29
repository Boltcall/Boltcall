import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ChevronRight, CheckCircle2 } from 'lucide-react';
import TodayGlanceCard from '../../components/dashboard/TodayGlanceCard';
import WinFeed from '../../components/dashboard/WinFeed';
import WhileYouWereGone from '../../components/dashboard/WhileYouWereGone';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupProgress } from '../../hooks/useSetupProgress';
import { useFeatureTriggers } from '../../hooks/useFeatureTriggers';
import { resolveMilestones, unseenMilestones, markMilestoneSeen, type Milestone } from '../../utils/milestones';
import { supabase } from '../../lib/supabase';

// Zone A copy — time-aware greeting with a real-data outcome line (P15, P19).
export function buildGreeting(opts: {
  now: Date;
  firstName: string;
  agentName: string;
  businessName: string | null;
  handledSinceYesterday: number;
}): { hello: string; outcome: string } {
  const { now, firstName, agentName, businessName, handledSinceYesterday } = opts;
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const hello = `${timeOfDay}, ${firstName}.`;

  const forBiz = businessName ? ` for ${businessName}` : '';
  const isMonday = now.getDay() === 1;
  const isMonthStart = now.getDate() === 1;

  if (handledSinceYesterday > 0) {
    const base = `${agentName} answered ${handledSinceYesterday} call${handledSinceYesterday !== 1 ? 's' : ''}${forBiz} since yesterday.`;
    if (isMonday) return { hello, outcome: `New week. ${base}` };
    if (isMonthStart) return { hello, outcome: `New month. ${base}` };
    return { hello, outcome: base };
  }

  if (isMonday) return { hello, outcome: `New week. ${agentName} is standing by${forBiz}.` };
  return { hello, outcome: `${agentName} is standing by${forBiz}.` };
}

// Zone B (post-setup) — streak card. Real streak from call data is a later
// upgrade; days-live since signup is honest and computable today (plan §3.1).
function daysLiveSince(createdAt: string | undefined, now: Date): number | null {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(1, Math.floor((now.getTime() - start) / 86_400_000));
}

const SetupRing: React.FC<{ pct: number }> = ({ pct }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const nearGoal = pct >= 80; // P5 goal-gradient: accelerate visual pull near the end
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-gray-200 dark:stroke-[#1e1e24]" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          className={nearGoal ? 'stroke-blue-500' : 'stroke-green-500'}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100">
        {pct}%
      </span>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { liveStats, callbackStats, businessName, setBusinessName, fetchLiveData, fetchError, loading: dashboardLoading } = useDashboardStore();
  const progress = useSetupProgress();
  const [agentName, setAgentName] = useState<string>('Your AI');
  const suggestion = useFeatureTriggers(agentName);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const hasFetchedLiveData = useRef(false);

  // Hydrate businessName from business_profiles so the greeting can weave it in
  // ("Alex is standing by for Acme Plumbing"). Store keeps the value across
  // routes; only fetch when it's missing.
  useEffect(() => {
    if (!user?.id || businessName) return;
    let cancelled = false;
    supabase
      .from('business_profiles')
      .select('business_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.business_name?.trim();
        if (!cancelled && name) setBusinessName(name);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, businessName, setBusinessName]);

  // One-time milestone celebration (P24/P9); booking count is real data
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('conversation_wins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('outcome_type', 'booked')
      .then(({ count }) => {
        const fresh = unseenMilestones(resolveMilestones({ bookingCount: count ?? 0, callCount: 0 }));
        if (fresh.length > 0) setMilestone(fresh[0]);
      });
  }, [user?.id]);

  useEffect(() => {
    if (hasFetchedLiveData.current) return;
    hasFetchedLiveData.current = true;
    fetchLiveData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // First active agent's name personalizes every surface (P8 endowment)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('agents')
      .select('name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        const name = data?.[0]?.name?.trim();
        if (name) setAgentName(name);
      });
  }, [user?.id]);

  const now = new Date();
  const firstName = (user?.name || 'there').split(' ')[0];
  // dashboard-stats (liveStats) is admin-only and returns null for regular
  // clients — falling back to a hardcoded 0 would always claim "no calls"
  // even when the AI has been busy. Fall back to the callback-derived count
  // the store already fetches so the greeting reflects real activity.
  const handled =
    liveStats?.retell?.successful_calls_today ??
    (callbackStats as { completed?: number } | null)?.completed ??
    0;
  // Business name comes from dashboardStore (mirrored from settings/general) —
  // may be empty on very first login until Setup persists it, so keep the
  // fallback in buildGreeting. Trim to avoid rendering a stray comma or space.
  const trimmedBusiness = typeof businessName === 'string' ? businessName.trim() : '';
  const { hello, outcome } = buildGreeting({
    now,
    firstName,
    agentName,
    businessName: trimmedBusiness || null,
    handledSinceYesterday: handled,
  });

  const daysLive = daysLiveSince(user?.createdAt, now);

  // Zone D — exactly ONE primary action on the page (P3):
  // next setup step → feature-trigger suggestion → review calls
  const nextAction = !progress.isComplete && progress.nextStep
    ? { label: progress.nextStep.title, description: progress.nextStep.description, link: progress.nextStep.link }
    : suggestion
      ? { label: suggestion.title, description: suggestion.description, link: suggestion.link }
      : { label: "Review yesterday's calls", description: `See what ${agentName} handled and where leads came from`, link: '/dashboard/conversations/calls' };

  return (
    <div className="space-y-4 px-1 md:px-0 max-w-5xl mx-auto">
      {/* Live-data failure — distinct from "no data yet" so an outage isn't hidden */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Couldn't load your latest activity. {fetchError}</span>
          <button
            onClick={() => fetchLiveData()}
            disabled={dashboardLoading}
            className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors duration-200 ease-out"
          >
            {dashboardLoading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* Zone A — greeting strip */}
      <div className="pt-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{hello}</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">{outcome}</p>
      </div>

      {/* Zone B — setup progress ring until complete, then streak card */}
      {!progress.loading && !progress.isComplete && (
        <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-4 md:p-5">
          <div className="flex items-center gap-4">
            <SetupRing pct={progress.pct} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {progress.completedCount} of {progress.totalCount} steps done
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Finish setup so {agentName} can answer every lead for you.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {progress.steps.filter((s) => !s.completed).slice(0, 3).map((step, i) => (
              <li key={step.id}>
                <Link
                  to={step.link}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    i === 0
                      ? 'border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-gray-900 dark:text-gray-100 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-[#2a2a32] flex-shrink-0" />
                  <span className="flex-1 truncate">{step.title}</span>
                  {step.timeEstimate && i === 0 && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">{step.timeEstimate}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
          {progress.steps.some((s) => s.completed) && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {progress.steps.filter((s) => s.completed).map((s) => s.title).join(' · ')}
            </p>
          )}
        </div>
      )}
      {!progress.loading && progress.isComplete && daysLive !== null && (
        <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-4 md:p-5 flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-500 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {daysLive} day{daysLive !== 1 ? 's' : ''} with {agentName} on duty
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Every day live is another day no lead waits.
            </p>
          </div>
        </div>
      )}

      {/* One-time milestone celebration (P24) */}
      {milestone && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 md:p-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🎉 {milestone.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{milestone.detail}</p>
          </div>
          <button
            onClick={() => { markMilestoneSeen(milestone.id); setMilestone(null); }}
            className="flex-shrink-0 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200 ease-out"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* While You Were Gone — shows if user was away 30+ min */}
      <WhileYouWereGone />

      {/* Zone C — today's numbers + wins feed (real data only, P12/P22) */}
      <TodayGlanceCard />
      <WinFeed />

      {/* Zone D — the ONE next action (P3) */}
      <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-4 md:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{nextAction.label}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{nextAction.description}</p>
        </div>
        <Link
          to={nextAction.link}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors"
        >
          Do it now
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
