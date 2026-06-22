// Webhook service for setup page integrations
// Uses Netlify functions to proxy all API calls (keeps secrets server-side)

import { searchAvailableNumbers, purchasePhoneNumber as purchaseTwilioNumber } from './twilio';
import { FUNCTIONS_BASE } from './api';
import { authedFetch } from './authedFetch';

export interface PhoneNumber {
  phone_number: string;
  friendly_name: string;
  region: string;
  rate_center: string;
}

export interface CekuraTestResult {
  success: boolean;
  result_id?: number;
  cekura_agent_id?: number;
  evaluators_created?: number;
  total_runs?: number;
  error?: string;
}

export interface CreateAgentResponse {
  success: boolean;
  agentId?: string;
  agent_id?: string;
  knowledge_base_id?: string;
  supabase_agent_id?: string;
  kb_folder_id?: string;
  message?: string;
  cekura_test?: CekuraTestResult;
}

export interface PurchaseNumberResponse {
  success: boolean;
  phoneNumber?: string;
  phone_number?: string;
  message?: string;
}

// Create AI agent and knowledge base via Netlify function (Retell SDK)
// Now sends prompt_config for professional prompt generation
export const createAgentAndKnowledgeBase = async (data: {
  businessName: string;
  websiteUrl?: string;
  mainCategory: string;
  country: string;
  serviceAreas: string[];
  openingHours: any;
  languages: string[];
  clientId?: string;
  businessProfileId?: string;
  locationId?: string;
  businessPhone?: string;
  city?: string;
  state?: string;
  // Knowledge base data
  services?: Array<{ name: string; duration: number; price: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  policies?: { cancellation: string; reschedule: string; deposit: string };
  // Call flow config for prompt generation
  callFlow?: {
    greetingText?: string;
    tone?: string;
    purposeDetection?: Record<string, boolean>;
    qualifyingQuestions?: string[];
    transferRules?: { whenToTransfer?: string; whenToBook?: string; whenToVoicemail?: string };
    fallbackLine?: string;
    complianceDisclosure?: { enabled?: boolean; text?: string };
    pronunciationGuide?: string;
  };
  agentType?: string;
  agentName?: string;
  transferNumber?: string;
  voiceId?: string;
  kbFolderId?: string;
}): Promise<CreateAgentResponse> => {
  // Build rich knowledge base texts from business data
  const knowledgeBaseTexts = [
    {
      title: 'Business Information',
      text: `Business: ${data.businessName}\nCategory: ${data.mainCategory}\nCountry: ${data.country}\nService Areas: ${data.serviceAreas.join(', ')}\nLanguages: ${data.languages.join(', ')}${data.businessPhone ? `\nPhone: ${data.businessPhone}` : ''}${data.city ? `\nLocation: ${data.city}${data.state ? `, ${data.state}` : ''}` : ''}\n\nOpening Hours:\n${data.openingHours ? Object.entries(data.openingHours).map(([day, h]: [string, any]) => h.closed ? `${day}: Closed` : `${day}: ${h.open} - ${h.close}`).join('\n') : 'Not specified'}`,
    },
  ];

  if (data.services?.length) {
    knowledgeBaseTexts.push({
      title: 'Services Offered',
      text: data.services.map(s => `- ${s.name}: ${s.duration} minutes, $${s.price}`).join('\n'),
    });
  }

  if (data.faqs?.length) {
    knowledgeBaseTexts.push({
      title: 'Frequently Asked Questions',
      text: data.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'),
    });
  }

  if (data.policies && (data.policies.cancellation || data.policies.reschedule || data.policies.deposit)) {
    knowledgeBaseTexts.push({
      title: 'Business Policies',
      text: `${data.policies.cancellation ? `Cancellation: ${data.policies.cancellation}\n` : ''}${data.policies.reschedule ? `Reschedule: ${data.policies.reschedule}\n` : ''}${data.policies.deposit ? `Deposit: ${data.policies.deposit}` : ''}`,
    });
  }

  // Build prompt_config for professional prompt generation
  const promptConfig = {
    agentType: data.agentType || 'inbound',
    agentName: data.agentName,
    businessProfile: {
      businessName: data.businessName,
      mainCategory: data.mainCategory,
      country: data.country,
      serviceAreas: data.serviceAreas,
      openingHours: data.openingHours,
      languages: data.languages.join(', '),
      websiteUrl: data.websiteUrl,
      businessPhone: data.businessPhone,
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
      language: data.languages.includes('en') ? 'en-US' : data.languages[0] || 'en-US',
      knowledge_base_texts: knowledgeBaseTexts,
      prompt_config: promptConfig,
      // Agent + KB folder params
      user_id: data.clientId,
      business_profile_id: data.businessProfileId,
      agent_type: data.agentType || 'inbound',
      agent_name: data.agentName,
      voice_id: data.voiceId,
      transfer_number: data.transferNumber,
      kb_folder_id: data.kbFolderId || null,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Agent creation failed' }));
    throw new Error(err.details || err.error || `Agent creation failed (${response.status})`);
  }

  const result = await response.json();
  return {
    success: true,
    agentId: result.agent_id,
    agent_id: result.agent_id,
    knowledge_base_id: result.knowledge_base_id,
    supabase_agent_id: result.supabase_agent_id,
    kb_folder_id: result.kb_folder_id,
    message: `Agent created with ${result.prompt_used || 'professional'} prompt`,
    cekura_test: result.cekura_test,
  };
};

// Get available phone numbers — uses Netlify function (Twilio API direct)
export const getAvailablePhoneNumbers = async (country?: string): Promise<PhoneNumber[]> => {
  try {
    const numbers = await searchAvailableNumbers({
      country: country?.toUpperCase() || 'US',
    });

    return numbers.map(n => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      region: n.region,
      rate_center: n.rate_center,
    }));
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    throw error;
  }
};

// Purchase phone number — uses Netlify function (Twilio API direct)
export const purchasePhoneNumber = async (phoneNumber: string): Promise<PurchaseNumberResponse> => {
  try {
    const result = await purchaseTwilioNumber(phoneNumber);
    return {
      success: result.success,
      phoneNumber: result.phone_number,
      phone_number: result.phone_number,
      message: `Successfully purchased ${result.phone_number}`,
    };
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    throw error;
  }
};
