import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, PhoneForwarded, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useRetellVoices } from '../../hooks/useRetellVoices';
import { VoicePicker } from '../../components/ui/voice-picker';
import { PopButton } from '../../components/ui/pop-button';
import TalkToAgentModal from '../../components/TalkToAgentModal';
import { updateRetellAgent } from '../../lib/retell';
import { authedFetch } from '../../lib/authedFetch';
import { AgentAvatar } from '../../components/ui/AgentAvatar';
import { InlineRename } from '../../components/ui/InlineRename';
import { EmojiColorPicker } from '../../components/ui/EmojiColorPicker';

interface AgentData {
  id: string;
  name: string;
  status: string;
  greeting?: string;
  begin_message?: string;
  voice_id: string;
  transfer_phone_number: string;
  system_prompt: string;
  retell_agent_id: string;
  direction: string;
  language: string;
  total_calls: number;
  created_at: string;
  updated_at: string;
  avatar?: string | null;
  color?: string | null;
}

interface CallLog {
  id: string;
  caller_number: string;
  duration: number;
  outcome: string;
  created_at: string;
}

const AgentDetailPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { voices: retellVoices } = useRetellVoices();

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTalkModal, setShowTalkModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [greeting, setGreeting] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  // KB Folders state
  const [agentFolders, setAgentFolders] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [allFolders, setAllFolders] = useState<Array<{ id: string; name: string; is_default: boolean }>>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);

  const FUNC_BASE = import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';

  const fetchAgentFolders = useCallback(async () => {
    if (!agentId) return;
    setFoldersLoading(true);
    try {
      const res = await authedFetch(`${FUNC_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_agent_folders', agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgentFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Error fetching agent folders:', err);
    } finally {
      setFoldersLoading(false);
    }
  }, [agentId, FUNC_BASE]);

  const fetchAllFolders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authedFetch(`${FUNC_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_folders', userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllFolders((data.folders || []).map((f: any) => ({ id: f.id, name: f.name, is_default: f.is_default })));
      }
    } catch (err) {
      console.error('Error fetching all folders:', err);
    }
  }, [user?.id, FUNC_BASE]);

  // Load agent data
  useEffect(() => {
    const fetchAgent = async () => {
      if (!user?.id || !agentId) return;

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          showToast({ title: 'Error', message: 'Agent not found', variant: 'error', duration: 3000 });
          navigate('/dashboard/agents');
          return;
        }

        setAgent(data);
        setName(data.name || '');
        setStatus(data.status || 'active');
        // begin_message is the actual greeting column on agents — data.greeting
        // is undefined and would silently blank the field, so a save without
        // an edit would overwrite the stored value with empty.
        setGreeting(data.begin_message || data.greeting || '');
        setVoiceId(data.voice_id || '');
        setTransferPhone(data.transfer_phone_number || '');
        setAvatar(data.avatar ?? null);
        setColor(data.color ?? null);
      } catch {
        navigate('/dashboard/agents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [user?.id, agentId]);

  // Load KB folders
  useEffect(() => {
    fetchAgentFolders();
    fetchAllFolders();
  }, [fetchAgentFolders, fetchAllFolders]);

  // Load recent calls
  useEffect(() => {
    const fetchCalls = async () => {
      if (!agentId) return;

      const { data, error } = await supabase
        .from('call_logs')
        .select('id, caller_number, duration, outcome, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        // call_logs table may not exist yet — show empty state, don't throw
        console.warn('call_logs unavailable (AgentDetailPage):', error.message);
        return;
      }
      if (data) setRecentCalls(data);
    };

    fetchCalls();
  }, [agentId]);

  // Keep document title in sync with agent name; restore on unmount
  useEffect(() => {
    if (!agent) return;
    document.title = `${agent.name} | Boltcall`;
    return () => {
      document.title = 'Boltcall';
    };
  }, [agent?.name]);

  // Track changes
  useEffect(() => {
    if (!agent) return;
    const changed =
      name !== (agent.name || '') ||
      status !== (agent.status || 'active') ||
      greeting !== (agent.begin_message || agent.greeting || '') ||
      voiceId !== (agent.voice_id || '') ||
      transferPhone !== (agent.transfer_phone_number || '') ||
      avatar !== (agent.avatar ?? null) ||
      color !== (agent.color ?? null);
    setHasChanges(changed);
  }, [name, status, greeting, voiceId, transferPhone, avatar, color, agent]);

  const handleSave = async () => {
    if (!agent || !user?.id) return;
    setIsSaving(true);

    try {
      // Only write columns that actually exist on the agents table. greeting
      // is stored as begin_message. transfer_phone_number / avatar / color
      // have no columns yet — they're UI-only state until a follow-up migration
      // adds them, otherwise this whole UPDATE 400s and nothing saves.
      const { data: updated, error } = await supabase
        .from('agents')
        .update({
          name,
          status,
          begin_message: greeting,
          voice_id: voiceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!updated) {
        throw new Error('No rows updated — agent not found or permission denied');
      }

      // Sync with Retell if connected
      if (agent.retell_agent_id) {
        try {
          await updateRetellAgent(agent.retell_agent_id, {
            agent_name: name,
            voice_id: voiceId || undefined,
          });
        } catch {
          // Non-critical — Retell sync can fail silently
        }
      }

      // Update local state from the confirmed DB response
      setAgent(updated as AgentData);
      setHasChanges(false);
      showToast({ title: 'Saved', message: 'Agent settings updated', variant: 'success', duration: 2000 });
    } catch (err) {
      console.error('Save failed:', err);
      showToast({ title: 'Error', message: 'Failed to save changes', variant: 'error', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="max-w-2xl mx-auto px-1 md:px-0 space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/agents')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <EmojiColorPicker
          avatar={avatar}
          color={color}
          onSave={(a, c) => { setAvatar(a); setColor(c); }}
          align="start"
          trigger={
            <button type="button" title="Customize avatar & color">
              <AgentAvatar size="md" avatar={avatar} color={color} name={name || agent.name} />
            </button>
          }
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            <InlineRename
              value={name}
              onSave={(newName) => setName(newName)}
              className="text-gray-900 dark:text-white"
              inputClassName="text-gray-900 dark:text-white text-xl font-bold"
            />
          </h1>
          <p className="text-sm text-gray-500">
            {agent.direction === 'outbound' ? 'Outbound' : 'Inbound'} agent
            {' · '}Created {new Date(agent.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Status Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Status</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {status === 'active' ? 'Agent is live and answering calls' : 'Agent is paused — calls will go to voicemail'}
            </p>
          </div>
          <button
            onClick={() => setStatus(status === 'active' ? 'inactive' : 'active')}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              status === 'active' ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                status === 'active' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* Agent Name */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Agent Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="My AI Receptionist"
        />
      </motion.div>

      {/* Greeting Message */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Greeting</label>
        <p className="text-xs text-gray-500 mb-2">What your agent says when it picks up the phone</p>
        <textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Hi! Thank you for calling. How can I help you today?"
        />
      </motion.div>

      {/* Voice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Voice</label>
        <p className="text-xs text-gray-500 mb-2">How your agent sounds to callers</p>
        <VoicePicker
          voices={retellVoices}
          value={voiceId}
          onValueChange={setVoiceId}
          placeholder="Choose a voice..."
        />
      </motion.div>

      {/* Transfer Number */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <PhoneForwarded className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-semibold text-gray-900 dark:text-white">Transfer Number</label>
        </div>
        <p className="text-xs text-gray-500 mb-2">When a caller asks for a real person, forward to this number</p>
        <input
          type="tel"
          value={transferPhone}
          onChange={(e) => setTransferPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="+1 (555) 123-4567"
        />
      </motion.div>

      {/* Knowledge Base Folders */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Knowledge Base Folders</h3>
            <p className="text-xs text-gray-500 mt-0.5">Which folders does this agent have access to?</p>
          </div>
        </div>
        {agentFolders.length === 0 && !foldersLoading ? (
          <p className="text-sm text-gray-400 py-2">No folders linked. Agent has no KB access.</p>
        ) : foldersLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Loading folders...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {allFolders.map((folder) => {
              const isLinked = agentFolders.some(af => af.id === folder.id);
              return (
                <label
                  key={folder.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    isLinked
                      ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={async () => {
                      const FUNC = import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';
                      if (isLinked) {
                        await authedFetch(`${FUNC}/kb-search`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'unlink_agent_folder', agentId: agent.id, kbFolderId: folder.id }),
                        });
                      } else {
                        await authedFetch(`${FUNC}/kb-search`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'link_agent_folder', agentId: agent.id, kbFolderId: folder.id }),
                        });
                      }
                      fetchAgentFolders();
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white flex-1">{folder.name}</span>
                  {folder.is_default && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Test Agent */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Test Your Agent</h3>
            <p className="text-xs text-gray-500 mt-0.5">Have a live conversation with your AI agent</p>
          </div>
          <PopButton
            color="blue"
            size="sm"
            onClick={() => setShowTalkModal(true)}
            className="gap-2"
          >
            <Phone className="w-4 h-4" />
            Talk to Agent
          </PopButton>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Calls</h3>
        {recentCalls.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No calls yet — test your agent to see activity here</p>
        ) : (
          <div className="space-y-2">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {call.caller_number || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    call.outcome === 'booked' ? 'bg-green-100 text-green-700' :
                    call.outcome === 'transferred' ? 'bg-blue-100 text-blue-700' :
                    call.outcome === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {call.outcome || 'completed'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(call.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Save Bar — sticky at bottom when changes exist */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 shadow-lg flex items-center justify-between"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">You have unsaved changes</p>
          <div className="flex gap-2">
            <PopButton
              onClick={() => {
                setName(agent.name || '');
                setStatus(agent.status || 'active');
                setGreeting(agent.begin_message || agent.greeting || '');
                setVoiceId(agent.voice_id || '');
                setTransferPhone(agent.transfer_phone_number || '');
              }}
            >
              Discard
            </PopButton>
            <PopButton color="blue" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </PopButton>
          </div>
        </motion.div>
      )}

      {/* Talk to Agent Modal */}
      <TalkToAgentModal
        open={showTalkModal}
        onClose={() => setShowTalkModal(false)}
        agentId={agent.retell_agent_id || agent.id}
        agentName={agent.name}
      />
    </div>
  );
};

export default AgentDetailPage;
