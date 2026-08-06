// Types for Retell AI LLM configurations

export interface RetellLLM {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  industry: string;
  llm_config: RetellLLMConfig;
  voice_id?: string;
  is_active: boolean;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface RetellLLMConfig {
  // Basic LLM configuration
  model: string;
  temperature?: number;
  max_tokens?: number;
  
  // System prompt and instructions
  system_prompt: string;
  instructions?: string;
  
  // Industry-specific settings
  industry_context?: {
    business_type: string;
    services: string[];
    target_audience: string;
    tone: 'professional' | 'friendly' | 'casual' | 'formal';
    language: string;
  };
  
  // Conversation flow
  conversation_flow?: {
    greeting: string;
    qualification_questions: string[];
    closing_statements: string[];
    escalation_triggers: string[];
  };
  
  // Knowledge base references
  knowledge_base?: {
    documents: string[];
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    policies: string[];
  };
  
  // Integration settings
  integrations?: {
    calendar?: boolean;
    crm?: boolean;
    scheduling?: boolean;
    payment?: boolean;
  };
}

// Common industry configurations
export const INDUSTRY_PRESETS: Record<string, Partial<RetellLLMConfig>> = {
  dentist: {
    system_prompt: "You are a professional dental assistant AI that helps schedule appointments and answer dental-related questions. Be friendly, knowledgeable, and focused on oral health.",
    industry_context: {
      business_type: "Dental Practice",
      services: ["Cleanings", "Fillings", "Root Canals", "Crowns", "Bridges", "Implants", "Orthodontics"],
      target_audience: "Patients seeking dental care",
      tone: "professional",
      language: "English"
    },
    conversation_flow: {
      greeting: "Hello! Thank you for calling [Practice Name]. I'm here to help you with your dental needs. How can I assist you today?",
      qualification_questions: [
        "Are you a new or existing patient?",
        "What type of dental service are you looking for?",
        "Do you have any dental insurance?",
        "When would be a good time for your appointment?"
      ],
      closing_statements: [
        "I'll get that appointment scheduled for you right away.",
        "Is there anything else I can help you with today?",
        "We look forward to seeing you at your appointment!"
      ],
      escalation_triggers: ["emergency", "pain", "urgent", "complaint"]
    }
  },
  
  hvac: {
    system_prompt: "You are a professional HVAC technician assistant AI that helps customers with heating, ventilation, and air conditioning needs. Be knowledgeable about HVAC systems and maintenance.",
    industry_context: {
      business_type: "HVAC Services",
      services: ["Heating Repair", "Air Conditioning", "Maintenance", "Installation", "Duct Cleaning", "Indoor Air Quality"],
      target_audience: "Homeowners and businesses with HVAC needs",
      tone: "professional",
      language: "English"
    },
    conversation_flow: {
      greeting: "Hello! Thank you for calling [Company Name]. I'm here to help you with your heating and cooling needs. How can I assist you today?",
      qualification_questions: [
        "What type of HVAC issue are you experiencing?",
        "Is this an emergency or can it wait?",
        "What type of system do you have?",
        "When was the last time your system was serviced?"
      ],
      closing_statements: [
        "I'll schedule a technician to come out and take a look.",
        "Is there anything else I can help you with regarding your HVAC system?",
        "We'll get your comfort restored as quickly as possible!"
      ],
      escalation_triggers: ["emergency", "no heat", "no cooling", "gas leak"]
    }
  },
  
  legal: {
    system_prompt: "You are a professional legal assistant AI that helps potential clients understand legal services and schedule consultations. Be knowledgeable about legal matters while being clear about limitations.",
    industry_context: {
      business_type: "Law Firm",
      services: ["Personal Injury", "Family Law", "Criminal Defense", "Business Law", "Estate Planning", "Real Estate"],
      target_audience: "Individuals and businesses seeking legal representation",
      tone: "professional",
      language: "English"
    },
    conversation_flow: {
      greeting: "Hello! Thank you for calling [Law Firm Name]. I'm here to help you understand our legal services and connect you with the right attorney. How can I assist you today?",
      qualification_questions: [
        "What type of legal matter do you need assistance with?",
        "Is this an urgent matter or can it wait?",
        "Have you consulted with an attorney before?",
        "When would be a good time for a consultation?"
      ],
      closing_statements: [
        "I'll connect you with one of our attorneys for a consultation.",
        "Is there anything else I can help you with today?",
        "We're here to help you with your legal needs."
      ],
      escalation_triggers: ["emergency", "arrest", "lawsuit", "deadline"]
    }
  }
};

// Helper function to create a new Retell LLM configuration
export function createRetellLLM(
  name: string,
  industry: string,
  workspace_id: string,
  user_id: string,
  customConfig?: Partial<RetellLLMConfig>
): Omit<RetellLLM, 'id' | 'created_at' | 'updated_at'> {
  const preset = INDUSTRY_PRESETS[industry] || {};
  
  return {
    user_id,
    workspace_id,
    name,
    industry,
    llm_config: {
      // Matches the model used by netlify/functions/retell-agents.ts when
      // provisioning Retell-managed LLMs — keep the two in sync so this
      // template row does not diverge from what production actually ships.
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
      system_prompt: preset.system_prompt || `You are a professional AI assistant for ${industry} services.`,
      industry_context: preset.industry_context,
      conversation_flow: preset.conversation_flow,
      ...customConfig
    } as RetellLLMConfig,
    is_active: true,
    is_public: false,
    usage_count: 0
  };
}
