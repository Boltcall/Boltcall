import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStore } from '../../stores/dashboardStore';
import SectionCard from '../../components/dashboard/page/SectionCard';

dayjs.extend(relativeTime);

type AgentRow = {
  id: string;
  name: string;
  status: string | null;
  created_at: string;
  retell_agent_id: string | null;
};

type KnowsCounts = { services: number; faqs: number; policies: number; other: number };

type Decision = { id: string; summary: string; created_at: string };

// Endowment centerpiece (P8): the agent is *theirs* — named, renameable,
// pausable, with a visible account of what it knows and what it did.
const YourAiOverview: React.FC = () => {
  const { user } = useAuth();
  const { liveStats } = useDashboardStore();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [knows, setKnows] = useState<KnowsCounts>({ services: 0, faqs: 0, policies: 0, other: 0 });
  const [decisions, setDecisions] = useState<Decision[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    Promise.all([
      supabase
        .from('agents')
        .select('id, name, status, created_at, retell_agent_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1),
      supabase
        .from('knowledge_base')
        .select('content_type')
        .eq('user_id', user.id),
      supabase
        .from('conversation_wins')
        .select('id, summary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([agentRes, kbRes, winsRes]) => {
      if (cancelled) return;
      setAgent((agentRes.data?.[0] as AgentRow) ?? null);
      const rows = (kbRes.data ?? []) as { content_type: string | null }[];
      setKnows({
        services: rows.filter((r) => r.content_type === 'product_info').length,
        faqs: rows.filter((r) => r.content_type === 'faq').length,
        policies: rows.filter((r) => r.content_type === 'policy').length,
        other: rows.filter((r) => !['product_info', 'faq', 'policy'].includes(r.content_type ?? '')).length,
      });
      setDecisions(((winsRes.data ?? []) as Decision[]).filter((d) => d.summary));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]);

  const isLive = !agent?.status || agent.status === 'active';
  const answeredToday = liveStats?.retell?.successful_calls_today ?? 0;

  // Same persistence path as AgentDetailPage (direct agents update).
  // ponytail: Retell name sync skipped here — Personality tab does full sync.
  const saveName = async () => {
    const newName = nameDraft.trim();
    setEditingName(false);
    if (!agent || !user?.id || !newName || newName === agent.name) return;
    const prev = agent;
    setAgent({ ...agent, name: newName });
    const { error } = await supabase
      .from('agents')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
      .eq('user_id', user.id);
    if (error) setAgent(prev);
  };

  const togglePause = async () => {
    if (!agent || !user?.id) return;
    const nextStatus = isLive ? 'inactive' : 'active';
    const prev = agent;
    setAgent({ ...agent, status: nextStatus });
    const { error } = await supabase
      .from('agents')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
      .eq('user_id', user.id);
    if (error) setAgent(prev);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-[#1a1a1f] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">You haven't built your AI yet</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Five minutes of setup and it answers every call for you.
        </p>
        <Link
          to="/voice-agent-setup"
          className="inline-block px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          Build your AI
        </Link>
      </div>
    );
  }

  const knowsParts = [
    knows.services > 0 && `${knows.services} service${knows.services !== 1 ? 's' : ''}`,
    knows.faqs > 0 && `${knows.faqs} FAQ${knows.faqs !== 1 ? 's' : ''}`,
    knows.policies > 0 && `${knows.policies} polic${knows.policies !== 1 ? 'ies' : 'y'}`,
    knows.other > 0 && `${knows.other} other document${knows.other !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      {/* Identity card — rename is free endowment (P8); Pause always visible (P21) */}
      <SectionCard>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-xl font-bold bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-gray-100 w-48"
              />
            ) : (
              <button
                onClick={() => { setNameDraft(agent.name); setEditingName(true); }}
                className="group flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100"
                title="Rename"
              >
                {agent.name}
                <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            )}
            <p className="text-sm mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className={isLive ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                {isLive
                  ? `${agent.name} is live${answeredToday > 0 ? ` — answered ${answeredToday} call${answeredToday !== 1 ? 's' : ''} today` : ''}`
                  : `${agent.name} is paused — calls go to voicemail`}
              </span>
            </p>
          </div>
          <button
            onClick={togglePause}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              isLive
                ? 'border-gray-300 dark:border-[#2a2a30] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'
                : 'bg-green-600 hover:bg-green-700 border-transparent text-white'
            }`}
          >
            {isLive ? `Pause ${agent.name}` : `Resume ${agent.name}`}
          </button>
        </div>
      </SectionCard>

      {/* What it knows — IKEA reinvestment loop (P7) */}
      <SectionCard title={`What ${agent.name} knows`}>
        {knowsParts.length > 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{knowsParts.join(' · ')}</p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nothing yet — {agent.name} answers better the more you teach.
          </p>
        )}
        <Link
          to="/dashboard/your-ai/knowledge"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <BookOpen className="w-4 h-4" />
          Teach {agent.name} more →
        </Link>
      </SectionCard>

      {/* Recent decisions — transparency (P21). Outcome-reason isn't derivable
          from current data; showing the summary + link to the full call log. */}
      <SectionCard title={`What ${agent.name} did recently`}>
        {decisions.length > 0 ? (
          <ul className="space-y-2">
            {decisions.map((d) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 truncate">{d.summary}</span>
                <span className="ml-auto text-xs text-gray-400 flex-shrink-0 tabular-nums">
                  {dayjs(d.created_at).fromNow()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {agent.name}'s wins will appear here after the first calls come in.
          </p>
        )}
        <Link
          to="/dashboard/conversations/calls"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          See every call →
        </Link>
      </SectionCard>
    </div>
  );
};

export default YourAiOverview;
