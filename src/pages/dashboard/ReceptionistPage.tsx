import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import {
  Phone, PhoneCall, Calendar,
  Settings, Volume2, BookOpen, ArrowRight, BarChart3,
  Headphones, AlertCircle, X, Mic, Brain, Hash,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PopButton } from '../../components/ui/pop-button';
import { StatusBadge } from '../../components/ui/status-badge';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  voice_id?: string;
  created_at?: string;
  agent_type?: string;
  type?: string;
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  inbound: 'Inbound Receptionist',
  outbound: 'Outbound Caller',
  speed_to_lead: 'Speed-to-Lead Follow-Up',
  outbound_speed_to_lead: 'Speed-to-Lead Follow-Up',
  reactivation: 'Lead Reactivation',
  outbound_reactivation: 'Lead Reactivation',
  reminder: 'Appointment Reminder',
  outbound_reminder: 'Appointment Reminder',
  review: 'Review Request',
  outbound_review: 'Review Request',
};

function getAgentTypeLabel(agentType?: string): string {
  if (!agentType) return 'AI Agent';
  return AGENT_TYPE_LABELS[agentType] || 'AI Agent';
}

const SETUP_STEPS = [
  {
    icon: Brain,
    title: 'Business Details',
    description: 'Tell your AI about your business — name, services, hours, and FAQs so it can answer calls accurately.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: Mic,
    title: 'Choose a Voice',
    description: 'Pick from a library of natural-sounding voices. Preview each one before you decide.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: Hash,
    title: 'Assign a Phone Number',
    description: 'Get a local or toll-free number, or forward your existing line to the AI receptionist.',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: Calendar,
    title: 'Connect Calendar',
    description: 'Link Cal.com or Google Calendar so the AI can check availability and book appointments live.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
];

const AIReceptionistDashboardPage: React.FC = () => {
  const { user } = useAuth();
  useTranslation();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id, name, status, voice_id, created_at, agent_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (agentData) {
          setAgents(agentData);
          // Derive enabled state from actual agent presence — the
          // business_features.voice_agent_enabled column is never written by
          // the wizard, so it sat false forever and made the page show
          // "Inactive" even when fully provisioned agents existed.
          setIsEnabled(agentData.some((a) => a.status === 'active'));
        }
      } catch (err) {
        console.error('Failed to load receptionist data:', err);
      }
      setIsLoading(false);
    })();
  }, [user]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* No Agent — Setup CTA */}
      {agents.length === 0 && (
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Set Up Your AI Receptionist
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Create an AI agent to start answering calls automatically. Choose a voice, connect your knowledge base, and assign a phone number.
          </p>
          <PopButton color="blue" onClick={() => setShowSetupModal(true)}>
            <span className="flex items-center gap-2">
              Start Setup
              <ArrowRight className="w-4 h-4" />
            </span>
          </PopButton>
        </div>
      )}

      {agents.length > 0 && (
        <>
          {/* Status + Configure */}
          <div className="flex items-center justify-between">
            <StatusBadge status={isEnabled ? 'active' : 'inactive'} />
            <Link
              to="/dashboard/agents"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Configure
            </Link>
          </div>

          {/* Agent List */}
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Your AI Receptionists</h3>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-[#1e1e24] text-xs font-medium text-gray-600 dark:text-gray-400">
                {agents.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#1e1e24]">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  to={`/dashboard/agents/${agent.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#0e0e11] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{agent.name}</p>
                    <p className="text-xs text-gray-500">{getAgentTypeLabel(agent.agent_type)}</p>
                    {(agent.created_at || agent.voice_id) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {agent.created_at && (
                          <span>Created {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                        {agent.created_at && agent.voice_id && <span> · </span>}
                        {agent.voice_id && <span>Voice ID: {agent.voice_id.slice(0, 8)}...</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${agent.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {agent.status === 'active' ? 'active' : 'inactive'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#1e1e24]">
              {[
                { label: 'Test Your Receptionist', description: 'Make a test call to hear your AI in action', icon: PhoneCall, link: '/dashboard/agents?tab=agent-tests', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'View Call History', description: 'See all calls your receptionist has handled', icon: BarChart3, link: '/dashboard/calls', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
                { label: 'Update Knowledge Base', description: 'Add or edit the information your AI knows', icon: BookOpen, link: '/dashboard/knowledge-base', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                { label: 'Change Voice', description: 'Pick a different voice for your receptionist', icon: Volume2, link: '/dashboard/voice-library', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Manage Phone Numbers', description: 'View and configure your phone numbers', icon: Phone, link: '/dashboard/phone', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.link}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#0e0e11] transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {!isEnabled && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Receptionist is inactive</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Your AI receptionist is configured but not enabled. Turn it on from the dashboard to start answering calls.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSetupModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#111114] rounded-2xl border border-gray-200 dark:border-[#1e1e24] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#1e1e24]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Receptionist Setup</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Here's what we'll configure</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSetupModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {SETUP_STEPS.map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0`}>
                        <step.icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">Step {i + 1}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{step.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1e1e24] flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">Takes about 5 minutes</p>
                  <Link
                    to="/dashboard/agents"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                    onClick={() => setShowSetupModal(false)}
                  >
                    Let's Go
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIReceptionistDashboardPage;
