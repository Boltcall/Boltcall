import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SetupCompletionPopup from '../../components/SetupCompletionPopup';
import TodayGlanceCard from '../../components/dashboard/TodayGlanceCard';
import WinFeed from '../../components/dashboard/WinFeed';
import WhileYouWereGone from '../../components/dashboard/WhileYouWereGone';
import ConversationWinsCard from '../../components/dashboard/ConversationWinsCard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { AgentWorkflowBlock, type AgentCustomization } from '../../components/ui/agent-workflow-block';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [agentCustomizations, setAgentCustomizations] = useState<AgentCustomization[]>([]);

  const fetchLiveData = useDashboardStore((s) => s.fetchLiveData);
  const fetchError = useDashboardStore((s) => s.fetchError);
  const dashboardLoading = useDashboardStore((s) => s.loading);
  const hasFetchedLiveData = useRef(false);
  const { user } = useAuth();
  const { planLevel } = useSubscription();

  // Fetch live stats for TodayGlanceCard — guarded by ref to prevent duplicate fires
  useEffect(() => {
    if (hasFetchedLiveData.current) return;
    hasFetchedLiveData.current = true;
    fetchLiveData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('agents')
      .select('agent_type, name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) {
          const customizations: AgentCustomization[] = data.map((a: any) => ({
            direction: a.agent_type === 'speed_to_lead' ? 'outbound' : 'inbound',
            avatar: null,
            color: null,
            title: a.name,
          }));
          setAgentCustomizations(customizations);
        }
      });
  }, [user?.id]);

  // Check if setup was just completed — show the "Almost Done!" agent config modal
  useEffect(() => {
    const setupCompleted = searchParams.get('setupCompleted');
    if (setupCompleted === 'true') {
      setShowCompletionPopup(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Scroll to relevant section when filter param is present
  useEffect(() => {
    const activeFilter = searchParams.get('filter');
    if (!activeFilter) return;
    const el = document.getElementById(`section-${activeFilter}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [searchParams]);

  return (
    <div className="space-y-4 px-1 md:px-0">
      <SetupCompletionPopup
        isOpen={showCompletionPopup}
        onClose={() => setShowCompletionPopup(false)}
      />

      {/* Live-data failure — distinct from "no data yet" so an outage isn't hidden */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Couldn't load your latest activity. {fetchError}</span>
          <button
            onClick={() => fetchLiveData()}
            disabled={dashboardLoading}
            className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {dashboardLoading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* While You Were Gone — shows if user was away 30+ min */}
      <WhileYouWereGone />

      {/* Today's Status — Trigger + Action */}
      <TodayGlanceCard />

      {/* Conversation Outcomes — wins, win rate, self-heals today */}
      <ConversationWinsCard />

      {/* Agent Architecture — workflow diagram */}
      <AgentWorkflowBlock agents={agentCustomizations} planLevel={planLevel} />

      {/* Recent Activity — Variable Reward */}
      <WinFeed />
    </div>
  );
};

export default DashboardPage;
