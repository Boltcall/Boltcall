// Retell AI API integration — proxied through Netlify functions for security

import { FUNCTIONS_BASE } from './api';
import { authedFetch } from './authedFetch';

export interface RetellKnowledgeBaseText {
  text: string;
  title: string;
}

export interface RetellKnowledgeBaseResponse {
  knowledge_base_id: string;
  success: boolean;
  message?: string;
}

export interface RetellAgentResponse {
  agent_id: string;
  success: boolean;
  message?: string;
}

interface CreateKnowledgeBaseData {
  businessName: string;
  websiteUrl?: string;
  mainCategory: string;
  country: string;
  serviceAreas: string[];
  openingHours: any;
  languages: string[];
  businessPhone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  services?: Array<{
    name: string;
    duration: number;
    price: number;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  policies?: {
    cancellation: string;
    reschedule: string;
    deposit: string;
  };
  // Call flow config for professional prompt generation
  callFlow?: {
    greetingText?: string;
    tone?: 'friendly_concise' | 'formal' | 'playful' | 'calm';
    purposeDetection?: Record<string, boolean>;
    qualifyingQuestions?: string[];
    transferRules?: {
      whenToTransfer?: string;
      whenToBook?: string;
      whenToVoicemail?: string;
    };
    fallbackLine?: string;
    complianceDisclosure?: { enabled?: boolean; text?: string };
    pronunciationGuide?: string;
  };
  // Agent type for prompt generation
  agentType?: 'inbound' | 'outbound_speed_to_lead' | 'outbound_reactivation' | 'outbound_reminder' | 'outbound_review';
  agentName?: string;
  transferNumber?: string;
}

// Build knowledge base texts from business data
// Uses XML document format for optimal retrieval and natural phrasing
function buildKnowledgeBaseTexts(data: CreateKnowledgeBaseData): RetellKnowledgeBaseText[] {
  const texts: RetellKnowledgeBaseText[] = [];
  let docIndex = 1;

  // Business info as Q&A document
  const hoursText = Object.entries(data.openingHours).map(([day, hours]: [string, any]) => {
    if (hours.closed) return `${day}: Closed`;
    return `${day}: ${hours.open} - ${hours.close}`;
  }).join(', ');

  texts.push({
    title: 'Business Information',
    text: `<document index="${docIndex}" title="Business Information" category="business_info">
Q: What is this business and where is it located?
A: ${data.businessName} is a ${data.mainCategory} business serving ${data.serviceAreas.join(', ')}. We support ${data.languages.join(', ')}.${data.websiteUrl ? ` Visit ${data.websiteUrl} for more information.` : ''}${data.addressLine1 ? ` Located at ${data.addressLine1}${data.city ? `, ${data.city}` : ''}${data.state ? `, ${data.state}` : ''}.` : ''}
</document>`,
  });
  docIndex++;

  // Opening hours as Q&A
  texts.push({
    title: 'Opening Hours',
    text: `<document index="${docIndex}" title="Opening Hours" category="business_info">
Q: What are the business hours?
A: Our hours are: ${hoursText}. If you're calling outside these hours, I can help you book during our next available time.
</document>`,
  });
  docIndex++;

  // Each service as its own Q&A document
  if (data.services?.length) {
    for (const s of data.services) {
      texts.push({
        title: `Service: ${s.name}`,
        text: `<document index="${docIndex}" title="${s.name}" category="services">
Q: How much does ${s.name} cost and how long does it take?
A: ${s.name} takes ${s.duration} minutes and costs $${s.price}.
</document>`,
      });
      docIndex++;
    }
  }

  // Each FAQ as its own document
  if (data.faqs?.length) {
    for (const faq of data.faqs) {
      texts.push({
        title: `FAQ: ${faq.question}`,
        text: `<document index="${docIndex}" title="${faq.question}" category="faq">
Q: ${faq.question}
A: ${faq.answer}
</document>`,
      });
      docIndex++;
    }
  }

  // Policies as a single document
  if (data.policies) {
    const policyParts: string[] = [];
    if (data.policies.cancellation) policyParts.push(`Cancellation: ${data.policies.cancellation}`);
    if (data.policies.reschedule) policyParts.push(`Reschedule: ${data.policies.reschedule}`);
    if (data.policies.deposit) policyParts.push(`Deposit: ${data.policies.deposit}`);
    if (policyParts.length) {
      texts.push({
        title: 'Business Policies',
        text: `<document index="${docIndex}" title="Business Policies" category="policies">
Q: What are the business policies?
A: ${policyParts.join('. ')}.
</document>`,
      });
    }
  }

  return texts;
}

// Create knowledge base via Netlify function
export const createRetellKnowledgeBase = async (data: CreateKnowledgeBaseData): Promise<RetellKnowledgeBaseResponse> => {
  const knowledgeBaseTexts = buildKnowledgeBaseTexts(data);

  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_kb',
      knowledge_base_name: `${data.businessName} Knowledge Base`,
      knowledge_base_texts: knowledgeBaseTexts,
      knowledge_base_urls: data.websiteUrl ? [data.websiteUrl] : [],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    knowledge_base_id: result.knowledge_base_id,
    success: true,
    message: 'Knowledge base created successfully',
  };
};

// Create agent via Netlify function
export const createRetellAgent = async (data: {
  businessName: string;
  knowledgeBaseId: string;
  mainCategory: string;
  languages: string[];
  voiceId?: string;
}): Promise<RetellAgentResponse> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_agent',
      agent_name: `${data.businessName} AI Assistant`,
      voice_id: data.voiceId || '11labs-Grace',
      language: data.languages.includes('en') ? 'en-US' : data.languages[0] || 'en-US',
      knowledge_base_ids: [data.knowledgeBaseId],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    agent_id: result.agent_id,
    success: true,
    message: 'Agent created successfully',
  };
};

// Create both KB + agent in one call — uses professional prompt generator
export const createRetellAgentAndKnowledgeBase = async (data: CreateKnowledgeBaseData & { voiceId?: string }): Promise<{
  knowledge_base_id: string;
  agent_id: string;
  success: boolean;
  message?: string;
  prompt_used?: string;
}> => {
  const knowledgeBaseTexts = buildKnowledgeBaseTexts(data);

  // Build prompt_config for the professional prompt generator
  const promptConfig = {
    agentType: data.agentType || 'inbound',
    agentName: data.agentName,
    businessProfile: {
      businessName: data.businessName,
      mainCategory: data.mainCategory,
      country: data.country,
      serviceAreas: data.serviceAreas,
      openingHours: data.openingHours,
      languages: Array.isArray(data.languages) ? data.languages.join(', ') : data.languages,
      websiteUrl: data.websiteUrl,
      businessPhone: data.businessPhone,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
    },
    callFlow: data.callFlow,
    knowledgeBase: {
      services: data.services,
      faqs: data.faqs,
      policies: data.policies,
    },
    transferNumber: data.transferNumber,
  };

  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_full',
      business_name: data.businessName,
      website_url: data.websiteUrl,
      country: data.country,
      voice_id: data.voiceId || '11labs-Grace',
      language: (Array.isArray(data.languages) ? data.languages : [data.languages]).includes('en') ? 'en-US' : (Array.isArray(data.languages) ? data.languages[0] : data.languages) || 'en-US',
      knowledge_base_texts: knowledgeBaseTexts,
      prompt_config: promptConfig,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    knowledge_base_id: result.knowledge_base_id,
    agent_id: result.agent_id,
    success: true,
    message: 'Knowledge base and agent created successfully',
    prompt_used: result.prompt_used,
  };
};

// Generate a professional voice agent prompt
export const generateAgentPrompt = async (config: {
  agentType?: 'inbound' | 'outbound_speed_to_lead' | 'outbound_reactivation' | 'outbound_reminder' | 'outbound_review';
  agentName?: string;
  businessProfile: {
    businessName: string;
    mainCategory: string;
    country: string;
    serviceAreas?: string[];
    openingHours?: any;
    languages?: string;
    websiteUrl?: string;
    businessPhone?: string;
    city?: string;
    state?: string;
  };
  callFlow?: any;
  knowledgeBase?: any;
  transferNumber?: string;
}): Promise<{ prompt: string; beginMessage: string; industry: string }> => {
  const response = await fetch(`${FUNCTIONS_BASE}/generate-agent-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentType: config.agentType || 'inbound',
      ...config,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }

  return response.json();
};

// List all agents
export const listRetellAgents = async (): Promise<any[]> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`);
  if (!response.ok) {
    throw new Error(`Failed to list agents: ${response.status}`);
  }
  return response.json();
};

// Get single agent
export const getRetellAgentDetails = async (agentId: string): Promise<any> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents?agent_id=${agentId}`);
  if (!response.ok) {
    throw new Error(`Failed to get agent: ${response.status}`);
  }
  return response.json();
};

// Update agent
export const updateRetellAgent = async (agentId: string, updates: Record<string, any>): Promise<any> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, ...updates }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }
  return response.json();
};

// Delete agent
export const deleteRetellAgent = async (agentId: string): Promise<void> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents?agent_id=${agentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete agent: ${response.status}`);
  }
};

// Interface for call history data
export interface RetellCall {
  call_id: string;
  agent_id: string;
  agent_name: string;
  call_status: string;
  call_type: string;
  direction?: string;
  start_timestamp: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  recording_url?: string;
  disconnection_reason?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    [key: string]: any;
  };
  metadata?: any;
}

export interface RetellCallsResponse {
  calls: RetellCall[];
  pagination_key?: string;
  total_count?: number;
}

// Get call history via Netlify function
export const getRetellCallHistory = async (params: {
  agentIds?: string[];
  limit?: number;
  paginationKey?: string;
  startDate?: Date;
  endDate?: Date;
  callStatus?: string[];
  direction?: string[];
}): Promise<RetellCallsResponse> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_ids: params.agentIds,
      limit: params.limit || 50,
      pagination_key: params.paginationKey,
      start_date: params.startDate?.toISOString(),
      end_date: params.endDate?.toISOString(),
      call_status: params.callStatus,
      direction: params.direction,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }

  const result = await response.json();
  const calls = Array.isArray(result) ? result : result.calls || [];
  return {
    calls,
    pagination_key: result.pagination_key,
    total_count: calls.length,
  };
};

// Get single call details via Netlify function
export const getRetellCallDetails = async (callId: string): Promise<RetellCall> => {
  const response = await authedFetch(`${FUNCTIONS_BASE}/retell-calls?call_id=${callId}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Failed: ${response.status}`);
  }
  return response.json();
};
