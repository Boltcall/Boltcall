import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AgentsSkeleton } from '../../components/ui/loading-skeleton';
import { Users, Sparkles, FileText, Wrench, Stethoscope, Home, Briefcase, ShoppingCart, Heart, Scissors, MessageCircle, RefreshCw, Shield, Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import ModalShell from '../../components/ui/modal-shell';
import { AgentAvatar } from '../../components/ui/AgentAvatar';
import { InlineRename } from '../../components/ui/InlineRename';
import { EmojiColorPicker } from '../../components/ui/EmojiColorPicker';

import { VoicePicker } from '../../components/ui/voice-picker';
import { useRetellVoices } from '../../hooks/useRetellVoices';
import CardTable from '../../components/ui/CardTable';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { generateAgentPrompt, updateRetellAgent } from '../../lib/retell';
import { authedFetch } from '../../lib/authedFetch';
import AgentTestsPage from './AgentTestsPage';
import { PopButton } from '../../components/ui/pop-button';
import TalkToAgentModal from '../../components/TalkToAgentModal';

interface Agent {
  id: string;
  name: string;
  status: string;
  callsToday: number;
  avgResponseTime: string;
  successRate: string;
  lastActive: string;
  agent_type?: string;
  description?: string;
  created_at?: string;
  retell_agent_id?: string;
  avatar?: string | null;
  color?: string | null;
}

interface CreateAgentForm {
  name: string;
  voice: string;
  knowledgeBase: string;
  kbFolderIds: string[];
  phoneNumber: string;
  humanTransferPhone: string;
  direction: 'inbound' | 'outbound';
  language: string;
  agentType: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

interface KbFolderOption {
  id: string;
  name: string;
  is_default: boolean;
  doc_count: number;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  assigned_agent_name?: string;
}

const AGENT_TYPES = [
  {
    value: 'inbound',
    label: 'Inbound Receptionist',
    description: 'Answers incoming calls — booking, FAQs, transfers',
    icon: 'PhoneIncoming',
  },
  {
    value: 'outbound_speed_to_lead',
    label: 'Speed to Lead',
    description: 'Calls new leads within minutes of form submission',
    icon: 'PhoneOutgoing',
  },
  {
    value: 'outbound_reactivation',
    label: 'Reactivation',
    description: 'Re-engages past leads or dormant customers',
    icon: 'PhoneOutgoing',
  },
  {
    value: 'outbound_reminder',
    label: 'Appointment Reminder',
    description: 'Confirms upcoming appointments',
    icon: 'PhoneOutgoing',
  },
  {
    value: 'outbound_review',
    label: 'Review Request',
    description: 'Asks satisfied customers for a Google review',
    icon: 'PhoneOutgoing',
  },
];

interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  voice: string;
  greeting: string;
  sampleQuestions: string[];
  color: string;
  direction: 'inbound' | 'outbound';
}

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();
  const [activeTab, setActiveTab] = useState<'agents' | 'tests'>(() => {
    const tab = searchParams.get('tab');
    return tab === 'tests' || tab === 'agent-tests' ? 'tests' : 'agents';
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showTestChatModal, setShowTestChatModal] = useState(false);
  const [showAgentDetailsModal, setShowAgentDetailsModal] = useState(false);
  const [selectedAgentForTest, setSelectedAgentForTest] = useState<Agent | null>(null);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [_userKnowledgeBases, setUserKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [kbFolders, setKbFolders] = useState<KbFolderOption[]>([]);
  const [userPhoneNumbers, setUserPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [regeneratingAgentId, setRegeneratingAgentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [talkToAgent, setTalkToAgent] = useState<Agent | null>(null);
  const { voices: retellVoices } = useRetellVoices();
  const [createForm, setCreateForm] = useState<CreateAgentForm>({
    name: '',
    voice: '',
    knowledgeBase: '',
    kbFolderIds: [],
    phoneNumber: '',
    humanTransferPhone: '',
    direction: 'inbound',
    language: '',
    agentType: 'inbound'
  });

  // Industry-specific agent templates
  const industryTemplates: IndustryTemplate[] = [
    {
      id: 'hvac',
      name: 'HVAC Service Agent',
      industry: 'HVAC',
      icon: <Wrench className="w-8 h-8" />,
      description: 'Professional HVAC service agent for heating, cooling, and maintenance appointments',
      features: ['Emergency service scheduling', 'Maintenance reminders', 'Service quotes', 'Warranty information'],
      voice: 'Professional Male',
      greeting: 'Hello! Thank you for calling our HVAC services. How can I help you today?',
      sampleQuestions: [
        'What type of HVAC service do you need?',
        'Is this an emergency repair?',
        'Would you like to schedule a maintenance appointment?',
        'Do you need a service quote?'
      ],
      color: 'bg-blue-500',
      direction: 'inbound'
    },
    {
      id: 'dentist',
      name: 'Dental Practice Agent',
      industry: 'Dental',
      icon: <Stethoscope className="w-8 h-8" />,
      description: 'Friendly dental practice agent for appointment scheduling and patient care',
      features: ['Appointment scheduling', 'Insurance verification', 'Treatment reminders', 'Emergency care'],
      voice: 'Friendly Female',
      greeting: 'Welcome to our dental practice! I\'m here to help you with your dental care needs.',
      sampleQuestions: [
        'What type of dental appointment do you need?',
        'Do you have dental insurance?',
        'Are you experiencing any dental pain?',
        'Would you like to schedule a cleaning?'
      ],
      color: 'bg-green-500',
      direction: 'inbound'
    },
    {
      id: 'real-estate',
      name: 'Real Estate Agent',
      industry: 'Real Estate',
      icon: <Home className="w-8 h-8" />,
      description: 'Real estate agent for property inquiries and appointment scheduling',
      features: ['Property inquiries', 'Showing appointments', 'Market information', 'Buyer consultations'],
      voice: 'Professional Female',
      greeting: 'Hello! Thank you for your interest in our real estate services. How can I assist you?',
      sampleQuestions: [
        'Are you looking to buy or sell?',
        'What type of property are you interested in?',
        'What is your budget range?',
        'Would you like to schedule a showing?'
      ],
      color: 'bg-purple-500',
      direction: 'inbound'
    },
    {
      id: 'legal',
      name: 'Legal Services Agent',
      industry: 'Legal',
      icon: <Briefcase className="w-8 h-8" />,
      description: 'Legal services agent for consultation scheduling and case inquiries',
      features: ['Consultation scheduling', 'Case inquiries', 'Document services', 'Legal advice'],
      voice: 'Professional Male',
      greeting: 'Thank you for contacting our law firm. How can we assist you with your legal needs?',
      sampleQuestions: [
        'What type of legal service do you need?',
        'Is this a new case or existing matter?',
        'Do you need a consultation?',
        'Are there any urgent deadlines?'
      ],
      color: 'bg-gray-700',
      direction: 'inbound'
    },
    {
      id: 'retail',
      name: 'Retail Agent',
      industry: 'Retail',
      icon: <ShoppingCart className="w-8 h-8" />,
      description: 'Retail agent for customer service and product inquiries',
      features: ['Product inquiries', 'Order tracking', 'Returns processing', 'Customer support'],
      voice: 'Friendly Female',
      greeting: 'Hello! Welcome to our store. How can I help you find what you\'re looking for?',
      sampleQuestions: [
        'What product are you looking for?',
        'Do you need help with sizing?',
        'Would you like to check product availability?',
        'Do you have any questions about our return policy?'
      ],
      color: 'bg-pink-500',
      direction: 'inbound'
    },
    {
      id: 'healthcare',
      name: 'Healthcare Agent',
      industry: 'Healthcare',
      icon: <Heart className="w-8 h-8" />,
      description: 'Healthcare agent for appointment scheduling and patient services',
      features: ['Appointment scheduling', 'Insurance verification', 'Prescription refills', 'Test results'],
      voice: 'Professional Female',
      greeting: 'Hello! Thank you for calling our healthcare clinic. How can we help you today?',
      sampleQuestions: [
        'What type of appointment do you need?',
        'Are you a new or returning patient?',
        'Do you have insurance?',
        'Is this an urgent medical concern?'
      ],
      color: 'bg-teal-500',
      direction: 'inbound'
    },
    {
      id: 'beauty',
      name: 'Beauty Salon Agent',
      industry: 'Beauty',
      icon: <Scissors className="w-8 h-8" />,
      description: 'Beauty salon agent for appointment scheduling and service inquiries',
      features: ['Service booking', 'Stylist preferences', 'Package deals', 'Special events'],
      voice: 'Friendly Female',
      greeting: 'Welcome to our beauty salon! I\'m here to help you book your next appointment.',
      sampleQuestions: [
        'What service would you like to book?',
        'Do you have a preferred stylist?',
        'What date and time work for you?',
        'Are you celebrating a special occasion?'
      ],
      color: 'bg-rose-500',
      direction: 'inbound'
    }
  ];

  const handleInputChange = (field: keyof CreateAgentForm, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAgent = async () => {
    if (!user?.id) return;
    if (!createForm.name.trim()) {
      showToast({ title: 'Validation Error', message: 'Agent name is required.', variant: 'error', duration: 3000 });
      return;
    }

    setIsCreating(true);
    try {
      const FUNC_BASE = import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';
      const res = await authedFetch(`${FUNC_BASE}/retell-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_agent',
          agent_name: createForm.name.trim(),
          user_id: user.id,
          voice_id: createForm.voice || undefined,
          language: createForm.language || 'en',
          agent_type: createForm.agentType,
          transfer_number: createForm.humanTransferPhone || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Agent creation failed');
      }

      // Save to Supabase agents table so it appears in the list
      const { error: dbErr } = await supabase.from('agents').insert({
        user_id: user.id,
        name: createForm.name.trim(),
        agent_type: 'ai_receptionist',
        status: 'active',
        voice_id: createForm.voice || null,
        language: createForm.language || 'en',
        direction: createForm.direction,
        retell_agent_id: data.agent_id,
      });

      if (dbErr) {
        console.error('[AgentsPage] Supabase insert after create_agent failed:', dbErr);
      }

      // Link selected KB folders to the new agent row (best-effort)
      if (createForm.kbFolderIds.length > 0 && data.agent_id) {
        try {
          const { data: agentRow } = await supabase
            .from('agents')
            .select('id')
            .eq('retell_agent_id', data.agent_id)
            .eq('user_id', user.id)
            .single();

          if (agentRow?.id) {
            const links = createForm.kbFolderIds.map((folderId) => ({
              agent_id: agentRow.id,
              kb_folder_id: folderId,
            }));
            await supabase.from('agent_kb_folders').insert(links);
          }
        } catch (linkErr) {
          console.warn('[AgentsPage] KB folder link failed (non-blocking):', linkErr);
        }
      }

      // Reload the agents list from Supabase
      const { data: agentsData, error: fetchErr } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!fetchErr && agentsData) {
        setAgents(agentsData.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status || 'active',
          callsToday: agent.total_calls || 0,
          avgResponseTime: agent.average_call_duration
            ? `${Math.floor(agent.average_call_duration / 60)}m ${agent.average_call_duration % 60}s`
            : '0m 0s',
          successRate: agent.conversion_rate ? `${agent.conversion_rate}%` : '0%',
          lastActive: agent.updated_at
            ? new Date(agent.updated_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          agent_type: agent.agent_type,
          description: agent.description,
          created_at: agent.created_at,
          retell_agent_id: agent.retell_agent_id,
        })));
      }

      showToast({ title: 'Agent Created', message: `"${createForm.name.trim()}" is ready.`, variant: 'success', duration: 4000 });

      // Reset form and close modal
      setCreateForm({
        name: '',
        voice: '',
        knowledgeBase: '',
        kbFolderIds: [],
        phoneNumber: '',
        humanTransferPhone: '',
        direction: 'inbound',
        language: '',
        agentType: 'inbound',
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error('[AgentsPage] handleCreateAgent failed:', err);
      showToast({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to create agent. Please try again.',
        variant: 'error',
        duration: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = async (template: IndustryTemplate) => {
    if (!user?.id) return;

    try {
      // Create system prompt from template
      const systemPrompt = `You are ${template.name}. ${template.description}

${template.greeting}

Key guidelines:
- Be ${template.voice.includes('Friendly') ? 'friendly and warm' : 'professional and courteous'}
- Provide accurate information based on our knowledge base
- If you don't know something, offer to connect them with a team member
- Always maintain a positive tone
- Focus on being helpful and solving customer problems

Sample questions you might receive:
${template.sampleQuestions.map(q => `- ${q}`).join('\n')}`;

      // Create agent in Supabase
      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description,
          agent_type: 'ai_receptionist',
          status: 'active',
          voice_id: template.voice,
          language: 'en',
          conversation_style: template.voice.includes('Friendly') ? 'friendly' : 'professional',
          personality: template.voice,
          system_prompt: systemPrompt,
          greeting: template.greeting,
          direction: template.direction
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agent:', error);
        showToast({ title: 'Error', message: 'Failed to create agent. Please try again.', variant: 'error', duration: 4000 });
        return;
      }

      // Link agent to default KB folder(s)
      try {
        const defaultFolder = kbFolders.find(f => f.is_default);
        if (defaultFolder && newAgent?.id) {
          await supabase.from('agent_kb_folders').insert({
            agent_id: newAgent.id,
            kb_folder_id: defaultFolder.id,
          });
        }
      } catch (linkErr) {
        console.warn('Could not link KB folder:', linkErr);
      }

      // Fetch the created agent with all details
      const { data: agentData, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', newAgent.id)
        .single();

      if (fetchError) {
        console.error('Error fetching agent:', fetchError);
        showToast({ title: 'Error', message: 'Agent created but failed to load details.', variant: 'warning', duration: 3000 });
        return;
      }

      // Set agent details and show modal
      setSelectedAgentDetails({
        id: agentData.id,
        name: agentData.name || template.name,
        status: agentData.status || 'active',
        callsToday: 0,
        avgResponseTime: 'N/A',
        successRate: '0%',
        lastActive: 'Just now',
        agent_type: agentData.agent_type,
        description: agentData.description,
        created_at: agentData.created_at,
        // Add template data for display
        ...agentData,
        templateGreeting: template.greeting,
        templateSampleQuestions: template.sampleQuestions,
        templateSystemPrompt: systemPrompt
      } as any);

      // Refresh agents list
      const fetchAgents = async () => {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAgents(data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status || 'inactive',
            callsToday: agent.total_calls || 0,
            avgResponseTime: agent.average_call_duration ? `${agent.average_call_duration}s` : 'N/A',
            successRate: agent.conversion_rate ? `${agent.conversion_rate}%` : '0%',
            lastActive: agent.updated_at ? new Date(agent.updated_at).toLocaleDateString() : 'N/A',
            agent_type: agent.agent_type,
            description: agent.description,
            created_at: agent.created_at
          })));
        }
      };
      await fetchAgents();

      setShowTemplatesModal(false);
      setShowAgentDetailsModal(true);

      // Claim bonus token reward for setting up an AI agent
      const rewardResult = await claimReward('setup_ai_agent');
      if (rewardResult?.success && !rewardResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+100 tokens earned for setting up your AI agent', variant: 'success', duration: 4000 });
      }
    } catch (error) {
      console.error('Error creating agent from template:', error);
      showToast({ title: 'Error', message: 'Failed to create agent from template. Please try again.', variant: 'error', duration: 4000 });
    }
  };

  const handleTestChat = (agent: Agent) => {
    setSelectedAgentForTest(agent);
    setShowTestChatModal(true);
  };

  const handleRegeneratePrompt = async (agent: Agent) => {
    if (!user?.id) return;
    setRegeneratingAgentId(agent.id);

    try {
      // Fetch the agent's business profile from Supabase
      const { data: bp } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!bp) {
        alert('No business profile found. Please complete setup first.');
        setRegeneratingAgentId(null);
        return;
      }

      // Generate a fresh professional prompt
      const result = await generateAgentPrompt({
        agentType: (agent as any).direction === 'outbound' ? 'outbound_speed_to_lead' : 'inbound',
        agentName: agent.name,
        businessProfile: {
          businessName: bp.business_name,
          mainCategory: bp.main_category || '',
          country: bp.country || '',
          serviceAreas: bp.service_areas || [],
          openingHours: bp.opening_hours,
          languages: Array.isArray(bp.languages) ? bp.languages.join(', ') : bp.languages || 'en',
          websiteUrl: bp.website_url,
          businessPhone: bp.phone,
          city: bp.city,
          state: bp.state,
        },
      });

      // Update the agent's system_prompt in Supabase
      await supabase
        .from('agents')
        .update({
          system_prompt: result.prompt,
          greeting: result.beginMessage,
        })
        .eq('id', agent.id);

      // If agent has a retell_agent_id, update it in Retell too
      const { data: agentRow } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('id', agent.id)
        .single();

      if (agentRow?.retell_agent_id) {
        try {
          await updateRetellAgent(agentRow.retell_agent_id, {
            agent_name: agent.name,
          });
        } catch (retellErr) {
          console.warn('Could not update Retell agent:', retellErr);
        }
      }

      showToast({ title: 'Success', message: `Prompt regenerated (${result.prompt.length} chars, ${result.industry} template)`, variant: 'success', duration: 4000 });
    } catch (err) {
      console.error('Prompt regeneration failed:', err);
      showToast({ title: 'Error', message: `Failed to regenerate prompt: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: 'error', duration: 5000 });
    } finally {
      setRegeneratingAgentId(null);
    }
  };

  // Inline rename handler
  const handleRenameAgent = async (agentId: string, newName: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, name: newName } : a));
    try {
      await supabase.from('agents').update({ name: newName }).eq('id', agentId);
      const agent = agents.find(a => a.id === agentId);
      if (agent?.retell_agent_id) {
        try { await updateRetellAgent(agent.retell_agent_id, { agent_name: newName }); } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to rename agent:', err);
      showToast({ title: 'Error', message: 'Could not rename agent', variant: 'error', duration: 3000 });
    }
  };

  // Avatar + color save handler
  const handleSaveAgentCustomization = async (agentId: string, avatar: string | null, color: string | null) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, avatar, color } : a));
    try {
      await supabase.from('agents').update({ avatar, color }).eq('id', agentId);
    } catch (err) {
      console.error('Failed to save agent customization:', err);
      showToast({ title: 'Error', message: 'Could not save customization', variant: 'error', duration: 3000 });
    }
  };

  // Fetch agents from Supabase
  useEffect(() => {
    const fetchAgents = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching agents:', error);
          return;
        }

        // Transform Supabase data to Agent interface
        const transformedAgents: Agent[] = (data || []).map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status || 'active',
          callsToday: agent.total_calls || 0,
          avgResponseTime: agent.average_call_duration 
            ? `${Math.floor(agent.average_call_duration / 60)}m ${agent.average_call_duration % 60}s`
            : '0m 0s',
          successRate: agent.conversion_rate 
            ? `${agent.conversion_rate}%`
            : '0%',
          lastActive: agent.updated_at 
            ? new Date(agent.updated_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          agent_type: agent.agent_type,
          description: agent.description,
          created_at: agent.created_at,
          retell_agent_id: agent.retell_agent_id,
          avatar: agent.avatar ?? null,
          color: agent.color ?? null,
        }));

        setAgents(transformedAgents);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [user?.id]);

  // Fetch user's knowledge bases
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('id, title')
          .eq('user_id', user.id)
          .order('title');

        if (error) {
          console.error('Error fetching knowledge bases:', error);
          return;
        }

        setUserKnowledgeBases((data || []).map(kb => ({
          id: kb.id,
          name: kb.title
        })));
      } catch (error) {
        console.error('Error fetching knowledge bases:', error);
      }
    };

    fetchKnowledgeBases();

    // Also fetch KB folders
    const fetchKbFolders = async () => {
      if (!user?.id) return;
      try {
        const FUNC_BASE = import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';
        const res = await authedFetch(`${FUNC_BASE}/kb-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list_folders', userId: user.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setKbFolders((data.folders || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            is_default: f.is_default,
            doc_count: f.doc_count || 0,
          })));
          return;
        }
      } catch (_) {
        // fall through to Supabase fallback
      }
      // Supabase direct fallback
      const { data: folders } = await supabase
        .from('kb_folders')
        .select('id, name, is_default')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setKbFolders((folders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        is_default: f.is_default ?? false,
        doc_count: 0,
      })));
    };
    fetchKbFolders();
  }, [user?.id]);

  // Fetch user's phone numbers
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('phone_numbers')
          .select('id, phone_number, assigned_agent_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching phone numbers:', error);
          return;
        }

        setUserPhoneNumbers(data || []);
      } catch (error) {
        console.error('Error fetching phone numbers:', error);
      }
    };

    fetchPhoneNumbers();
  }, [user?.id]);

  if (isLoading) {
    return <AgentsSkeleton />;
  }

  return (
    <div className="space-y-5 px-1 md:px-0">

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {[
          { id: 'agents' as const, label: 'My Agents', icon: <Users className="w-4 h-4" /> },
          { id: 'tests' as const, label: 'Agent Tests', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-200 relative ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="agent-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'tests' ? (
        <motion.div key="tests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <AgentTestsPage />
        </motion.div>
      ) : agents.length === 0 ? (
        /* No agents - Show create options */
        <div>
          <div className="max-w-3xl mx-auto text-center mb-8 mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New Agent</h2>
            <p className="text-base text-gray-500 dark:text-gray-400">Choose how you want to get started</p>
          </div>

          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-5">
            {/* Start from Scratch */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="group bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-7 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-[#1a1a1f] rounded-xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-200 ease-out">
                  <Sparkles className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-200 ease-out" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Start from Scratch</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Build your AI Agent from the ground up with full customization</p>
            </button>

            {/* Browse Templates */}
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="group bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-7 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-[#1a1a1f] rounded-xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-200 ease-out">
                  <FileText className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-200 ease-out" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Browse Templates</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get started quickly with industry-specific templates</p>
            </button>
          </div>
        </div>
      ) : (
        /* Has agents - Show table */
        <div className="overflow-x-auto">
          <CardTable
            className="min-w-[580px]"
            columns={[
              { key: 'name', label: 'Agent' },
              { key: 'status', label: 'Status' },
              { key: 'successRate', label: 'Success Rate' },
              { key: 'lastActive', label: 'Last Active' },
              { key: 'actions', label: '', width: '100px' }
            ]}
            data={agents}
            renderRow={(agent) => (
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
              >
                {/* Agent */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <EmojiColorPicker
                    avatar={agent.avatar}
                    color={agent.color}
                    onSave={(avatar, color) => handleSaveAgentCustomization(agent.id, avatar, color)}
                    align="start"
                    trigger={
                      <button type="button" title="Customize avatar & color">
                        <AgentAvatar size="md" avatar={agent.avatar} color={agent.color} name={agent.name} />
                      </button>
                    }
                  />
                  <InlineRename
                    value={agent.name}
                    onSave={(newName) => handleRenameAgent(agent.id, newName)}
                    className="font-medium text-gray-900"
                    inputClassName="font-medium text-gray-900 text-sm"
                  />
                </div>

                {/* Status */}
                <div className="flex-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      agent.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    {agent.status}
                  </span>
                </div>

                {/* Success Rate */}
                <div className="flex-1 text-sm text-gray-900">{agent.successRate}</div>

                {/* Last Active */}
                <div className="flex-1 text-sm text-gray-500">{agent.lastActive}</div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-[100px] flex-none justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setTalkToAgent(agent)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Talk to Agent"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTestChat(agent)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Test Chat"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRegeneratePrompt(agent); }}
                    disabled={regeneratingAgentId === agent.id}
                    className="text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                    title="Regenerate Prompt"
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingAgentId === agent.id ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}
            emptyStateText="No agents found. Create your first AI agent to get started."
            searchPlaceholder="Search agents..."
            onAddNew={() => setShowCreateModal(true)}
            addNewText="Add Agent"
          />
        </div>
      )}

      {/* Create Agent Modal */}
      <ModalShell
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Agent"
        maxWidth="max-w-lg"
        footer={
          <>
            <PopButton
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </PopButton>
            <PopButton color="blue"
              onClick={handleCreateAgent}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </PopButton>
          </>
        }
      >
        <div className="space-y-4">
          {/* Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
            <p className="text-blue-700 text-xs">
              <strong>Note:</strong> You can change any of these settings later after creating the agent.
            </p>
          </div>

          {/* Agent Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Agent Type *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {AGENT_TYPES.map((type) => {
                const Icon = type.value === 'inbound' ? PhoneIncoming : PhoneOutgoing;
                return (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                      createForm.agentType === type.value
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="agentType"
                      value={type.value}
                      checked={createForm.agentType === type.value}
                      onChange={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          agentType: type.value,
                          direction: type.value === 'inbound' ? 'inbound' : 'outbound'
                        }));
                      }}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-zinc-900">{type.label}</span>
                        <p className="text-xs text-zinc-500">{type.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Agent Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter agent name"
            />
          </div>

          {/* Voice Choice */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Voice *
            </label>
            <VoicePicker
              voices={retellVoices}
              value={createForm.voice}
              onValueChange={(voiceId) => handleInputChange('voice', voiceId)}
              placeholder="Choose a voice..."
            />
          </div>

          {/* KB Folders */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Knowledge Base Folders
            </label>
            {kbFolders.length === 0 ? (
              <p className="text-sm text-zinc-500">No KB folders yet. Create one in the Knowledge Base page.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-200 rounded-lg p-2">
                {kbFolders.map((folder) => (
                  <label key={folder.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.kbFolderIds.includes(folder.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...createForm.kbFolderIds, folder.id]
                          : createForm.kbFolderIds.filter(id => id !== folder.id);
                        setCreateForm(prev => ({ ...prev, kbFolderIds: ids }));
                      }}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-900 flex-1">{folder.name}</span>
                    <span className="text-xs text-zinc-400">{folder.doc_count} docs</span>
                    {folder.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-sm text-blue-600 mt-2">
              <a
                href="/dashboard/knowledge-base"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-800 underline"
              >
                Manage knowledge base folders
              </a>
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Phone Number *
            </label>
            <select
              value={createForm.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900"
            >
              <option value="" className="text-zinc-900">Select phone number</option>
              {userPhoneNumbers.map((phone) => (
                <option key={phone.id} value={phone.phone_number} className="text-zinc-900">
                  {phone.phone_number} {phone.assigned_agent_name && `(${phone.assigned_agent_name})`}
                </option>
              ))}
            </select>
          </div>

          {/* Human Transfer Phone */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Human Transfer Phone
            </label>
            <input
              type="tel"
              value={createForm.humanTransferPhone}
              onChange={(e) => handleInputChange('humanTransferPhone', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 (555) 987-6543"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Language *
            </label>
            <select
              value={createForm.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900"
            >
              <option value="" className="text-zinc-900">Select language</option>
              <option value="en" className="text-zinc-900">English</option>
              <option value="es" className="text-zinc-900">Spanish</option>
              <option value="fr" className="text-zinc-900">French</option>
              <option value="de" className="text-zinc-900">German</option>
              <option value="it" className="text-zinc-900">Italian</option>
              <option value="pt" className="text-zinc-900">Portuguese</option>
              <option value="zh" className="text-zinc-900">Chinese</option>
              <option value="ja" className="text-zinc-900">Japanese</option>
              <option value="ko" className="text-zinc-900">Korean</option>
            </select>
          </div>
        </div>
      </ModalShell>

      {/* Templates Modal */}
      <ModalShell
        open={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        title="Industry Templates"
        maxWidth="max-w-3xl"
        footer={
          <PopButton
            onClick={() => setShowTemplatesModal(false)}
          >
            Cancel
          </PopButton>
        }
      >
        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {industryTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-[#1e1e24] rounded-lg p-4 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group bg-white dark:bg-[#111114] relative"
              onClick={() => handleTemplateSelect(template)}
            >
              {/* Inbound/Outbound Badge - Top Left */}
              <span className={`absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                template.direction === 'inbound'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {template.direction === 'inbound' ? 'Inbound' : 'Outbound'}
              </span>

              {/* Template Header */}
              <div className="flex items-center gap-3 mb-2.5 mt-4">
                <div className={`w-9 h-9 ${template.color} rounded-lg flex items-center justify-center text-white shadow-sm [&_svg]:w-5 [&_svg]:h-5`}>
                  {template.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors duration-200 ease-out text-sm leading-tight flex-1">
                  {template.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 line-clamp-2 leading-relaxed">{template.description}</p>

              {/* Use Template Button */}
              <PopButton color="blue" size="sm" className="w-full">
                Use Template
              </PopButton>
            </div>
          ))}
        </div>
      </ModalShell>

      {/* Test Chat Modal */}
      <ModalShell
        open={showTestChatModal && !!selectedAgentForTest}
        onClose={() => {
          setShowTestChatModal(false);
          setSelectedAgentForTest(null);
        }}
        title={`Test Chat - ${selectedAgentForTest?.name || ''}`}
        maxWidth="max-w-md"
        footer={
          <PopButton
            onClick={() => {
              setShowTestChatModal(false);
              setSelectedAgentForTest(null);
            }}
          >
            Close
          </PopButton>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm mb-2">
              <strong>How it works:</strong>
            </p>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Enter your phone number below</li>
              <li>• Click "Call Me" to receive a call</li>
              <li>• Test your AI agent in real-time</li>
            </ul>
          </div>

          {/* Retell Chat Widget Container */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div id="retell-voice-widget" className="min-h-[200px] flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Test your AI agent with a phone callback</p>
                <div className="space-y-3">
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="phone-input"
                  />
                  <PopButton color="blue"
                    onClick={() => selectedAgentForTest && initializeRetellWidget(selectedAgentForTest.retell_agent_id || selectedAgentForTest.id)}
                    className="w-full"
                  >
                    Call Me Now
                  </PopButton>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            This will initiate a phone call to test your AI agent. Standard call rates may apply.
          </div>
        </div>
      </ModalShell>

      {/* Talk to Agent Modal */}
      <TalkToAgentModal
        open={!!talkToAgent}
        onClose={() => setTalkToAgent(null)}
        agentId={(talkToAgent as any)?.retell_agent_id || talkToAgent?.id || ''}
        agentName={talkToAgent?.name}
      />

      {/* Agent Details Modal - Shows after template selection */}
      <ModalShell
        open={showAgentDetailsModal && !!selectedAgentDetails}
        onClose={() => {
          setShowAgentDetailsModal(false);
          setSelectedAgentDetails(null);
        }}
        title={selectedAgentDetails?.name || ''}
        description="Agent created successfully"
        maxWidth="max-w-4xl"
        footer={
          <>
            <PopButton
              onClick={() => {
                setShowAgentDetailsModal(false);
                setSelectedAgentDetails(null);
              }}
            >
              Close
            </PopButton>
            <PopButton color="blue"
              onClick={() => {
                // Navigate to edit or configure the agent
                setShowAgentDetailsModal(false);
                // You can add navigation here if needed
              }}
            >
              Configure Agent
            </PopButton>
          </>
        }
      >
        {selectedAgentDetails && (
          <div className="space-y-6">
            {/* Agent Status */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                selectedAgentDetails.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedAgentDetails.status}
              </span>
              <span className="text-sm text-gray-500">
                Created {selectedAgentDetails.created_at ? new Date(selectedAgentDetails.created_at).toLocaleDateString() : 'Just now'}
              </span>
            </div>

            {/* Voice Settings */}
            <div className="bg-gray-50 rounded-xl p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Voice ID</label>
                  <p className="text-gray-900 mt-1">{(selectedAgentDetails as any).voice_id || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Personality</label>
                  <p className="text-gray-900 mt-1">{(selectedAgentDetails as any).personality || 'Professional'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Conversation Style</label>
                  <p className="text-gray-900 mt-1 capitalize">{(selectedAgentDetails as any).conversation_style || 'Professional'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Language</label>
                  <p className="text-gray-900 mt-1">{(selectedAgentDetails as any).language || 'English'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Direction</label>
                  <p className="text-gray-900 mt-1 capitalize">{(selectedAgentDetails as any).direction || 'Inbound'}</p>
                </div>
              </div>
            </div>

            {/* Greeting */}
            {(selectedAgentDetails as any).templateGreeting && (
              <div className="bg-blue-50 rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Greeting</h3>
                <p className="text-gray-700 leading-relaxed">{(selectedAgentDetails as any).templateGreeting}</p>
              </div>
            )}

            {/* System Prompt */}
            {(selectedAgentDetails as any).templateSystemPrompt && (
              <div className="bg-gray-50 rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">System Prompt</h3>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200 overflow-x-auto">
                  <pre className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {(selectedAgentDetails as any).templateSystemPrompt}
                  </pre>
                </div>
              </div>
            )}

            {/* Sample Questions */}
            {(selectedAgentDetails as any).templateSampleQuestions && (
              <div className="bg-green-50 rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Sample Questions</h3>
                <ul className="space-y-2">
                  {((selectedAgentDetails as any).templateSampleQuestions || []).map((question: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            {selectedAgentDetails.description && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed">{selectedAgentDetails.description}</p>
              </div>
            )}
          </div>
        )}
      </ModalShell>

    </div>
  );
};

// Function to initialize Retell widget
const initializeRetellWidget = (agentId: string) => {
  const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
  const phoneNumber = phoneInput?.value;

  if (!phoneNumber) {
    alert('Please enter your phone number');
    return;
  }

  // Load Retell script if not already loaded
  if (!document.querySelector('script[src="https://cdn.retellai.com/chat-widget.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.retellai.com/chat-widget.js';
    script.onload = () => {
      initWidget(agentId, phoneNumber);
    };
    document.head.appendChild(script);
  } else {
    initWidget(agentId, phoneNumber);
  }
};

// Initialize the widget
const initWidget = (agentId: string, phoneNumber: string) => {
  const container = document.getElementById('retell-voice-widget');
  if (container && (window as any).RetellChatWidget) {
    // Clear existing content
    container.innerHTML = '<div id="retell-voice"></div>';
    
    // Initialize Retell widget
    (window as any).RetellChatWidget.init({
      publicKey: import.meta.env.VITE_RETELL_PUBLIC_KEY || '',
      agentId: agentId,
      mode: "callback",
      mount: document.getElementById("retell-voice"),
      phoneNumber: phoneNumber // Pre-fill the phone number
    });
  }
};

export default AgentsPage;
