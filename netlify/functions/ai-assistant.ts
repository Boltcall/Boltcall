import { Handler } from '@netlify/functions';
import OpenAI, { AzureOpenAI } from 'openai';
import Retell from 'retell-sdk';
import { deductTokens, getSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { chatCompletion, getAzureDeployment } from './_shared/azure-ai';
import { requireMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getOpenAIClient(): OpenAI {
  // Foundry resource (preferred) — gpt-5.x family
  if (process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT && process.env.AZURE_OPENAI_FOUNDRY_KEY) {
    return new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_FOUNDRY_KEY,
      apiVersion: process.env.AZURE_OPENAI_FOUNDRY_API_VERSION || '2025-04-01-preview',
    });
  }
  // Legacy resource — gpt-4o family
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    return new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
    });
  }
  throw new Error(
    'No Azure OpenAI configured. Set AZURE_OPENAI_FOUNDRY_ENDPOINT + AZURE_OPENAI_FOUNDRY_KEY (preferred) or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY.',
  );
}

function getRetell() {
  const apiKey = process.env.RETELL_API_KEY || '';
  return new Retell({ apiKey });
}

// ── Tool definitions (OpenAI format) ──
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_agent_greeting',
      description: 'Update the AI agent greeting message (the first thing it says when answering a call)',
      parameters: {
        type: 'object',
        properties: {
          greeting: { type: 'string', description: 'The new greeting message the agent should say' },
        },
        required: ['greeting'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_agent_prompt',
      description: 'Update the AI agent system prompt (the instructions that control how it behaves on calls). Use this when the user wants to change the agent personality, tone, behavior, or what it talks about.',
      parameters: {
        type: 'object',
        properties: {
          instructions: { type: 'string', description: 'What the user wants the agent to do differently. This will be used to modify the existing prompt.' },
        },
        required: ['instructions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'regenerate_agent_prompt',
      description: 'Regenerate the entire agent prompt from scratch using the business profile data. Use when the user wants a fresh prompt or says the current one is broken.',
      parameters: {
        type: 'object',
        properties: {
          tone: { type: 'string', enum: ['friendly_concise', 'formal', 'playful', 'calm'], description: 'Optional tone override for the regenerated prompt' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_faq',
      description: 'Add a new FAQ entry to the knowledge base so the AI agent can answer this question',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question callers might ask' },
          answer: { type: 'string', description: 'The answer the AI should give' },
        },
        required: ['question', 'answer'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_service',
      description: 'Add a new service to the business knowledge base',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Service name' },
          duration: { type: 'number', description: 'Duration in minutes' },
          price: { type: 'number', description: 'Price in dollars' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_business_hours',
      description: 'Update business opening hours for one or more days',
      parameters: {
        type: 'object',
        properties: {
          hours: {
            type: 'object',
            description: 'Object with day names as keys. Each value has open, close (HH:MM format), and closed (boolean). Example: {"monday": {"open": "09:00", "close": "17:00", "closed": false}}',
          },
        },
        required: ['hours'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_details',
      description: 'Get the current agent configuration including prompt, greeting, voice, and status. Use this when the user asks what their agent currently does or to diagnose issues.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_call_stats',
      description: 'Get recent call statistics: total calls, average duration, successful call rate',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to look back (default 7)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_voice',
      description: 'Change the AI agent voice. You can use friendly names like "Adrian", "Dorothy", "Charlie" or full IDs like "11labs-Adrian".',
      parameters: {
        type: 'object',
        properties: {
          voice_id: { type: 'string', description: 'The voice name or ID (e.g. "Adrian", "Dorothy", "Charlie", or "11labs-Adrian")' },
        },
        required: ['voice_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_agent',
      description: 'Enable or disable the AI agent. When disabled, the agent will not answer calls.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'true to enable the agent, false to disable it' },
        },
        required: ['enabled'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transfer_number',
      description: 'Set or update the phone number that calls get transferred to (e.g. your personal phone or front desk).',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string', description: 'The phone number to transfer calls to (e.g. "+1234567890")' },
        },
        required: ['phone_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_test_call_link',
      description: 'Generate a web call link so the user can test their AI agent directly in the browser. No parameters needed.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_feature',
      description: 'Enable or disable a dashboard feature/service. Features: speed_to_lead, reminders, reputation_manager (Google reviews), missed_call_textback, chatbot, instant_lead_response.',
      parameters: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature key: speed_to_lead, reminders, reputation_manager, missed_call_textback, chatbot, instant_lead_response' },
          enabled: { type: 'boolean', description: 'true to enable, false to disable' },
        },
        required: ['feature', 'enabled'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_leads',
      description: 'Search and retrieve leads data. Use when the user asks about their leads, how many leads they have, recent leads, leads by source, etc.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: new, pending, contacted, qualified, lost. Leave empty for all.' },
          source: { type: 'string', description: 'Filter by source: ai_receptionist, speed_to_lead, website_form, google_ads, facebook_ads, missed_call, manual. Leave empty for all.' },
          days: { type: 'number', description: 'Only show leads from the last N days. Default: 30' },
          limit: { type: 'number', description: 'Max results to return. Default: 10' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_appointments',
      description: 'Retrieve appointment data. Use when the user asks about bookings, upcoming appointments, past appointments, or appointment counts.',
      parameters: {
        type: 'object',
        properties: {
          upcoming: { type: 'boolean', description: 'true = only future appointments, false = past appointments. Default: true' },
          days: { type: 'number', description: 'Look ahead/back this many days. Default: 7' },
          limit: { type: 'number', description: 'Max results. Default: 10' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_metrics',
      description: 'Get business performance metrics from the dashboard. Use when the user asks about performance, conversion rates, trends, revenue, or "how is my business doing".',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to analyze. Default: 7' },
        },
      },
    },
  },
];

// ── Fetch user's business context ──
const LANG_TO_LOCALE: Record<string, string> = { en: 'en-US', he: 'he-IL', es: 'es-ES' };

async function getBusinessContext(userId: string) {
  const supabase = getSupabase();
  const context: any = { userId };

  try {
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (profile) context.profile = profile;

    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    if (agents?.length) context.agents = agents;

    // Derive locale from agent language or business country
    const agentLang = agents?.[0]?.language;
    const country = profile?.country?.toLowerCase();
    context.locale = agentLang
      ? (LANG_TO_LOCALE[agentLang] || 'en-US')
      : country === 'il' ? 'he-IL' : 'en-US';

    const { data: phones } = await supabase
      .from('phone_numbers')
      .select('phone_number, status, label')
      .eq('user_id', userId)
      .limit(5);
    if (phones?.length) context.phones = phones;

    const { data: kb } = await supabase
      .from('knowledge_base')
      .select('services, faqs, policies')
      .eq('user_id', userId)
      .single();
    if (kb) context.knowledgeBase = kb;
  } catch (e) {
    console.error('Error fetching context:', e);
  }

  return context;
}

function contextToString(ctx: any): string {
  const parts: string[] = [];
  if (ctx.profile) {
    parts.push(`Business: ${ctx.profile.business_name} | Industry: ${ctx.profile.main_category} | Country: ${ctx.profile.country}`);
    if (ctx.profile.website_url) parts.push(`Website: ${ctx.profile.website_url}`);
  }
  if (ctx.agents?.length) {
    parts.push(`Agents: ${ctx.agents.map((a: any) => `${a.name} [${a.agent_type}, ${a.status}] (retell_id: ${a.retell_agent_id || 'none'})`).join('; ')}`);
  }
  if (ctx.phones?.length) {
    parts.push(`Phones: ${ctx.phones.map((p: any) => `${p.phone_number} (${p.status})`).join(', ')}`);
  }
  return parts.join('\n');
}

// ── Tool execution (unchanged from original) ──
async function executeTool(name: string, args: any, ctx: any): Promise<{ result: string; actionTaken?: string }> {
  const supabase = getSupabase();
  const retell = getRetell();
  const agent = ctx.agents?.[0];

  switch (name) {
    case 'update_agent_greeting': {
      if (!agent?.retell_agent_id) return { result: 'No agent found. Please complete setup first.' };
      const retellAgent = await retell.agent.retrieve(agent.retell_agent_id);
      const llmId = (retellAgent as any).response_engine?.llm_id;
      if (!llmId) return { result: 'Could not find agent LLM configuration.' };
      await retell.llm.update(llmId, { begin_message: args.greeting } as any);
      await supabase.from('agents').update({ greeting: args.greeting }).eq('id', agent.id);
      return {
        result: `Greeting updated to: "${args.greeting}"`,
        actionTaken: `Changed agent greeting to: "${args.greeting}"`,
      };
    }

    case 'update_agent_prompt': {
      if (!agent?.retell_agent_id) return { result: 'No agent found. Please complete setup first.' };
      const retellAgent = await retell.agent.retrieve(agent.retell_agent_id);
      const llmId = (retellAgent as any).response_engine?.llm_id;
      if (!llmId) return { result: 'Could not find agent LLM configuration.' };
      const llm = await retell.llm.retrieve(llmId);
      const currentPrompt = (llm as any).general_prompt || '';

      const newPrompt = await chatCompletion(
        'You are a prompt editor. Output ONLY the modified prompt. Keep the overall structure intact. Apply the requested changes precisely. Do not add commentary.',
        `Current prompt:\n\n${currentPrompt}\n\n---\nUser wants to change: ${args.instructions}\n\nOutput the modified prompt:`,
        { maxTokens: 3000, heavy: true }
      ) || currentPrompt;
      await retell.llm.update(llmId, { general_prompt: newPrompt } as any);
      await supabase.from('agents').update({ system_prompt: newPrompt }).eq('id', agent.id);

      return {
        result: `Prompt updated based on your instructions: "${args.instructions}"`,
        actionTaken: `Modified agent prompt: ${args.instructions}`,
      };
    }

    case 'regenerate_agent_prompt': {
      if (!agent?.retell_agent_id) return { result: 'No agent found. Please complete setup first.' };
      if (!ctx.profile) return { result: 'No business profile found.' };
      const retellAgent = await retell.agent.retrieve(agent.retell_agent_id);
      const llmId = (retellAgent as any).response_engine?.llm_id;
      if (!llmId) return { result: 'Could not find agent LLM configuration.' };

      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
      const promptConfig = {
        agentType: agent.agent_type || 'inbound',
        businessProfile: {
          businessName: ctx.profile.business_name,
          mainCategory: ctx.profile.main_category,
          country: ctx.profile.country,
          serviceAreas: ctx.profile.service_areas || [],
          openingHours: ctx.profile.opening_hours || {},
          languages: (ctx.profile.languages || ['en']).join(', '),
          websiteUrl: ctx.profile.website_url,
          businessPhone: ctx.profile.business_phone,
          city: ctx.profile.city,
          state: ctx.profile.state,
        },
        callFlow: args.tone ? { tone: args.tone } : undefined,
        knowledgeBase: ctx.knowledgeBase || undefined,
      };

      const response = await fetch(`${baseUrl}/.netlify/functions/generate-agent-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptConfig),
      });

      if (!response.ok) return { result: 'Prompt regeneration failed. Please try again.' };
      const generated = await response.json();
      const llmUpdate: any = { general_prompt: generated.prompt };
      if (generated.beginMessage) llmUpdate.begin_message = generated.beginMessage;
      await retell.llm.update(llmId, llmUpdate);
      await supabase.from('agents').update({
        system_prompt: generated.prompt,
        greeting: generated.beginMessage || agent.greeting,
      }).eq('id', agent.id);

      return {
        result: `Prompt regenerated from scratch${args.tone ? ` with ${args.tone} tone` : ''}. Your agent now has a fresh, professional prompt.`,
        actionTaken: `Regenerated full agent prompt${args.tone ? ` (tone: ${args.tone})` : ''}`,
      };
    }

    case 'add_faq': {
      if (!ctx.profile) return { result: 'No business profile found.' };
      const { data: kb } = await supabase.from('knowledge_base').select('faqs').eq('user_id', ctx.userId).single();
      const existingFaqs = kb?.faqs || [];
      const updatedFaqs = [...existingFaqs, { question: args.question, answer: args.answer }];
      await supabase.from('knowledge_base').upsert({ user_id: ctx.userId, faqs: updatedFaqs }, { onConflict: 'user_id' });
      return { result: `Added FAQ:\nQ: ${args.question}\nA: ${args.answer}`, actionTaken: `Added FAQ: "${args.question}"` };
    }

    case 'add_service': {
      const { data: kb } = await supabase.from('knowledge_base').select('services').eq('user_id', ctx.userId).single();
      const existingServices = kb?.services || [];
      const newService = { name: args.name, duration: args.duration || 30, price: args.price || 0 };
      await supabase.from('knowledge_base').upsert({ user_id: ctx.userId, services: [...existingServices, newService] }, { onConflict: 'user_id' });
      return { result: `Added service: ${args.name}${args.duration ? ` (${args.duration} min)` : ''}${args.price ? ` - $${args.price}` : ''}`, actionTaken: `Added service: "${args.name}"` };
    }

    case 'update_business_hours': {
      if (!ctx.profile) return { result: 'No business profile found.' };
      const updatedHours = { ...(ctx.profile.opening_hours || {}), ...args.hours };
      await supabase.from('business_profiles').update({ opening_hours: updatedHours }).eq('user_id', ctx.userId);
      const changedDays = Object.keys(args.hours).join(', ');
      return { result: `Business hours updated for: ${changedDays}`, actionTaken: `Updated hours for ${changedDays}` };
    }

    case 'get_agent_details': {
      if (!agent) return { result: 'No agent found. Please complete setup first.' };
      let retellDetails: any = null;
      if (agent.retell_agent_id) {
        try { retellDetails = await retell.agent.retrieve(agent.retell_agent_id); } catch { /* ignore */ }
      }
      const details = [
        `Name: ${agent.name}`,
        `Type: ${agent.agent_type || 'inbound'}`,
        `Status: ${agent.status || 'unknown'}`,
        `Voice: ${retellDetails?.voice_id || agent.voice_id || '11labs-Adrian'}`,
        `Greeting: ${agent.greeting || 'Default greeting'}`,
      ];
      if (agent.system_prompt) details.push(`Prompt preview: ${agent.system_prompt.substring(0, 200)}...`);
      return { result: details.join('\n') };
    }

    case 'get_call_stats': {
      if (!agent?.retell_agent_id) return { result: 'No agent found.' };
      const days = args.days || 7;
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      try {
        const calls = await retell.call.list({ filter_criteria: { agent_id: [agent.retell_agent_id], after_start_timestamp: since } });
        const callList = Array.isArray(calls) ? calls : [];
        const total = callList.length;
        const successful = callList.filter((c: any) => c.call_analysis?.call_successful).length;
        const avgDuration = total > 0 ? Math.round(callList.reduce((sum: number, c: any) => sum + ((c.end_timestamp || 0) - (c.start_timestamp || 0)), 0) / total / 1000) : 0;
        return { result: `Last ${days} days:\n• Total calls: ${total}\n• Successful: ${successful} (${total > 0 ? Math.round(successful / total * 100) : 0}%)\n• Avg duration: ${avgDuration}s` };
      } catch { return { result: 'Could not fetch call stats. Your agent may not have received calls yet.' }; }
    }

    case 'change_voice': {
      if (!agent?.retell_agent_id) return { result: 'No agent found. Please complete setup first.' };
      const voiceMap: Record<string, string> = { adrian: '11labs-Adrian', dorothy: '11labs-Dorothy', charlie: '11labs-Charlie', matilda: '11labs-Matilda', chris: '11labs-Chris', jessica: '11labs-Jessica', eric: '11labs-Eric', laura: '11labs-Laura', brian: '11labs-Brian', sarah: '11labs-Sarah' };
      const resolvedVoice = voiceMap[args.voice_id.trim().toLowerCase()] || args.voice_id.trim();
      await retell.agent.update(agent.retell_agent_id, { voice_id: resolvedVoice });
      await supabase.from('agents').update({ voice_id: resolvedVoice }).eq('id', agent.id);
      return { result: `Voice changed to "${resolvedVoice}". Your agent will now use this voice on all calls.`, actionTaken: `Changed agent voice to ${resolvedVoice}` };
    }

    case 'toggle_agent': {
      if (!agent) return { result: 'No agent found. Please complete setup first.' };
      const enabled = !!args.enabled;
      await supabase.from('agents').update({ is_active: enabled, status: enabled ? 'active' : 'inactive' }).eq('id', agent.id);
      return { result: `Agent has been ${enabled ? 'enabled' : 'disabled'}. ${enabled ? 'It will now answer incoming calls.' : 'It will no longer answer calls until re-enabled.'}`, actionTaken: `${enabled ? 'Enabled' : 'Disabled'} the agent` };
    }

    case 'update_transfer_number': {
      if (!agent) return { result: 'No agent found. Please complete setup first.' };
      const phone = args.phone_number.trim();
      await supabase.from('agents').update({ transfer_number: phone }).eq('id', agent.id);

      // Also update the Retell LLM's transfer_call tool with the new number
      if (agent.retell_agent_id) {
        try {
          const retellAgent = await retell.agent.retrieve(agent.retell_agent_id);
          const llmId = (retellAgent as any).response_engine?.llm_id;
          if (llmId) {
            const llm = await retell.llm.retrieve(llmId);
            const existingTools: any[] = (llm as any).general_tools || [];

            // Find and update the transfer_call tool, or add it if missing
            const transferToolIndex = existingTools.findIndex((t: any) => t.type === 'transfer_call');
            const transferTool = {
              type: 'transfer_call',
              name: 'transfer_call',
              description: 'Transfer the call to a human agent or the business owner. Use when the caller explicitly asks to speak to a person, or for urgent matters you cannot handle.',
              transfer_destination: {
                type: 'predefined',
                number: phone,
              },
              transfer_option: {
                type: 'warm_transfer',
                show_transferee_as_caller: true,
              },
            };

            if (transferToolIndex >= 0) {
              existingTools[transferToolIndex] = transferTool;
            } else {
              existingTools.unshift(transferTool);
            }

            await retell.llm.update(llmId, { general_tools: existingTools } as any);
          }
        } catch (retellErr) {
          console.error('Failed to update Retell transfer tool (non-blocking):', retellErr);
          // Non-fatal — the Supabase update already succeeded
        }
      }

      return { result: `Transfer number updated to ${phone}. Calls will now be transferred to this number when requested.`, actionTaken: `Updated transfer number to ${phone}` };
    }

    case 'get_test_call_link': {
      if (!agent?.retell_agent_id) return { result: 'No agent found. Please complete setup first.' };
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
      try {
        const webCallResponse = await fetch(`${baseUrl}/.netlify/functions/retell-agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_web_call', agent_id: agent.retell_agent_id }),
        });
        if (!webCallResponse.ok) return { result: 'Failed to create test call. Please try again.' };
        const webCallData = await webCallResponse.json();
        return { result: `Test call ready! Access Token: ${webCallData.access_token}\n\nUse the "Test Call" button in your dashboard to try it.`, actionTaken: 'Generated test call link' };
      } catch { return { result: 'Could not generate test call. Please try again or use the Test Call button in your dashboard.' }; }
    }

    case 'toggle_feature': {
      const featureKey = args.feature;
      const enabled = !!args.enabled;

      // Map feature keys to business_features columns
      const featureColumnMap: Record<string, string> = {
        speed_to_lead: 'speed_to_lead_enabled',
        reminders: 'reminders_enabled',
        reputation_manager: 'reputation_manager_enabled',
        missed_call_textback: 'missed_call_textback_enabled',
        chatbot: 'chatbot_enabled',
        instant_lead_response: 'instant_lead_response_enabled',
      };

      const column = featureColumnMap[featureKey];
      if (!column) return { result: `Unknown feature: ${featureKey}. Available: ${Object.keys(featureColumnMap).join(', ')}` };

      const { error: updateErr } = await supabase
        .from('business_features')
        .update({ [column]: enabled })
        .eq('user_id', ctx.userId);

      if (updateErr) return { result: `Failed to update: ${updateErr.message}` };

      const friendlyNames: Record<string, string> = {
        speed_to_lead: 'Speed to Lead',
        reminders: 'Appointment Reminders',
        reputation_manager: 'Google Review Automation',
        missed_call_textback: 'Missed Call Text-Back',
        chatbot: 'Website Chatbot',
        instant_lead_response: 'Instant Lead Response',
      };

      return {
        result: `${friendlyNames[featureKey] || featureKey} has been ${enabled ? 'enabled' : 'disabled'}.`,
        actionTaken: `${enabled ? 'Enabled' : 'Disabled'} ${friendlyNames[featureKey] || featureKey}`,
      };
    }

    case 'query_leads': {
      const days = args.days || 30;
      const limit = Math.min(args.limit || 10, 25);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('leads')
        .select('first_name, last_name, phone, email, source, status, created_at')
        .eq('user_id', ctx.userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (args.status) query = query.eq('status', args.status);
      if (args.source) query = query.eq('source', args.source);

      const { data: leads, error: leadErr } = await query;
      if (leadErr) return { result: `Failed to query leads: ${leadErr.message}` };
      if (!leads?.length) return { result: `No leads found in the last ${days} days${args.status ? ` with status "${args.status}"` : ''}${args.source ? ` from "${args.source}"` : ''}.` };

      // Also get total count
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.userId)
        .gte('created_at', since);

      const locale = ctx.locale || 'en-US';
      const lines = leads.map((l: any) => {
        const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Unknown';
        const date = new Date(l.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        return `• ${name} | ${l.phone || l.email || 'no contact'} | ${l.source} | ${l.status} | ${date}`;
      });

      return { result: `${count || leads.length} total leads (last ${days} days)${args.status ? `, status: ${args.status}` : ''}${args.source ? `, source: ${args.source}` : ''}:\n\n${lines.join('\n')}` };
    }

    case 'query_appointments': {
      const upcoming = args.upcoming !== false;
      const days = args.days || 7;
      const limit = Math.min(args.limit || 10, 25);
      const now = new Date().toISOString();

      let query = supabase
        .from('appointments')
        .select('client_name, client_phone, service_name, starts_at, status')
        .eq('user_id', ctx.userId)
        .limit(limit);

      if (upcoming) {
        const futureLimit = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('starts_at', now).lte('starts_at', futureLimit).order('starts_at', { ascending: true });
      } else {
        const pastLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.lte('starts_at', now).gte('starts_at', pastLimit).order('starts_at', { ascending: false });
      }

      const { data: appts, error: apptErr } = await query;
      if (apptErr) return { result: `Failed to query appointments: ${apptErr.message}` };
      if (!appts?.length) return { result: `No ${upcoming ? 'upcoming' : 'past'} appointments in the next ${days} days.` };

      const apptLocale = ctx.locale || 'en-US';
      const lines = appts.map((a: any) => {
        const date = new Date(a.starts_at).toLocaleDateString(apptLocale, { weekday: 'short', month: 'short', day: 'numeric' });
        const time = new Date(a.starts_at).toLocaleTimeString(apptLocale, { hour: 'numeric', minute: '2-digit', hour12: apptLocale !== 'he-IL' });
        return `• ${date} ${time} — ${a.client_name || 'Unknown'} (${a.service_name || 'General'}) [${a.status}]`;
      });

      return { result: `${upcoming ? 'Upcoming' : 'Past'} appointments (${days} days):\n\n${lines.join('\n')}` };
    }

    case 'get_dashboard_metrics': {
      const days = args.days || 7;

      const { data: metrics, error: metricsErr } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(days);

      if (metricsErr || !metrics?.length) {
        // Fallback to direct counts
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const [leadsRes, apptsRes, callbacksRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).gte('created_at', since),
          supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).gte('created_at', since),
          supabase.from('callbacks').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).gte('created_at', since),
        ]);

        return {
          result: `Last ${days} days (direct counts):\n• Leads: ${leadsRes.count || 0}\n• Appointments: ${apptsRes.count || 0}\n• Callbacks: ${callbacksRes.count || 0}\n\nNote: Detailed daily metrics are not available yet. The daily collector needs to run to populate trends.`,
        };
      }

      // Aggregate metrics
      const totals = {
        calls: 0, leads: 0, bookings: 0, sms_sent: 0,
      };
      for (const m of metrics) {
        totals.calls += m.calls || 0;
        totals.leads += m.leads || 0;
        totals.bookings += m.bookings || 0;
        totals.sms_sent += m.sms_sent || 0;
      }

      const avgSuccessRate = metrics.reduce((sum: number, m: any) => sum + (m.success_rate || 0), 0) / metrics.length;

      return {
        result: `Last ${days} days performance:\n• Total calls: ${totals.calls}\n• Total leads: ${totals.leads}\n• Bookings: ${totals.bookings}\n• SMS sent: ${totals.sms_sent}\n• Avg success rate: ${Math.round(avgSuccessRate)}%\n\nDaily avg: ${Math.round(totals.calls / days)} calls, ${Math.round(totals.leads / days)} leads, ${Math.round(totals.bookings / days)} bookings`,
      };
    }

    default:
      return { result: `Unknown action: ${name}` };
  }
}

// ── System prompt ──
const SYSTEM_PROMPT = `You are Bolt, the Boltcall AI assistant. You live inside the dashboard and can both ANSWER questions and TAKE ACTIONS on the user's behalf.

You have tools to:
**Agent Management:**
- Update the agent's greeting, prompt/behavior, or regenerate the entire prompt
- Change the agent's voice (Adrian, Dorothy, Charlie, etc.)
- Enable or disable the agent
- Update the call transfer phone number
- Generate a test call link

**Knowledge Base:**
- Add FAQs and services
- Update business hours

**Feature Control:**
- Enable or disable dashboard features: Speed to Lead, Appointment Reminders, Google Review Automation, Missed Call Text-Back, Website Chatbot, Instant Lead Response

**Data & Analytics:**
- Query leads (filter by status, source, date range)
- Query appointments (upcoming or past)
- Get dashboard metrics (calls, leads, bookings, success rate, trends)

ONBOARDING GUIDE — use this when a user says they are new or asks what to do first:
Boltcall is an AI phone receptionist platform. Here is the recommended setup order:
1. Complete your business profile — go to Settings → General and fill in your business name, industry, hours, and location.
2. Connect a phone number — go to Settings → Phone Numbers and purchase or port a number. This is the number callers will dial.
3. Set up your AI Agent — go to the Agent page or let me create one for you right now. The agent answers calls, books appointments, and handles FAQs.
4. Add your services and FAQs — go to Settings → Knowledge Base so your agent knows what to say.
5. Test your agent — once set up, I can generate a browser-based test call link so you can hear it in action.
6. Enable features — turn on Speed to Lead, Missed Call Text-Back, or Appointment Reminders from the Features page as needed.

PHONE NUMBER GUIDE — use this when a user asks how to connect a phone number:
Phone numbers in Boltcall are managed under Settings → Phone Numbers. You can:
- Purchase a new local or toll-free number directly from the dashboard (powered by Twilio).
- Port your existing business number to Boltcall (contact support for porting).
- Once a number is active, assign it to your AI Agent so calls to that number are answered by the agent.
- You can also set a transfer number so the agent can forward calls to a human when needed.

AGENT CREATION GUIDE — use this when a user asks you to create an AI Agent for them:
If the user already has a business profile, use the regenerate_agent_prompt tool to generate a professional agent prompt from their business data. Confirm what you're about to do before executing. If they have no profile yet, tell them to complete Settings → General first so you have the info needed to build a great agent.

AGENT EDITING GUIDE — use this when a user asks you to edit their AI Agent:
First use get_agent_details to show them what the agent currently does. Then ask what they want to change — greeting, tone, behavior, FAQs, voice, transfer number. Use the appropriate tools to make those changes one by one.

IMPORTANT RULES:
- When the user asks you to DO something, USE THE TOOLS. Don't just tell them how — do it for them.
- When the user asks about data (leads, appointments, metrics), USE the query tools to give real numbers.
- After executing an action, confirm what you did in a short, clear message.
- If you need clarification before acting, ask first.
- Be concise — 2-3 sentences max for most responses.
- If the user asks something you can't do with your tools, explain what they need to do manually and where in the dashboard.
- You can call multiple tools in sequence if needed.

CONFIRMATION REQUIRED — for these high-impact actions, do NOT execute immediately. Instead, explain what will happen and ask "Are you sure?" first. Only execute after the user confirms:
- Enabling or disabling features (toggle_feature) — tell them which feature and what the impact is
- Disabling/enabling the agent (toggle_agent) — warn that calls will/won't be answered
- Regenerating the entire agent prompt (regenerate_agent_prompt) — warn the current prompt will be replaced
- Major prompt changes (update_agent_prompt) that fundamentally change agent behavior

For small actions like adding a FAQ, changing greeting text, querying data, or checking stats — just do it immediately, no confirmation needed.`;

// ── Main handler ──
const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages, userId } = JSON.parse(event.body || '{}');
    if (!messages?.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Messages required' }) };
    }
    const auth = await requireMatchingUser(event, userId, headers);
    if (!auth.ok) return auth.response;

    const openai = getOpenAIClient();
    const deployment = getAzureDeployment(false);

    // Fetch user context
    let ctx: any = await getBusinessContext(auth.userId);

    const contextStr = contextToString(ctx);
    const systemContent = contextStr
      ? `${SYSTEM_PROMPT}\n\n--- User's Business Context ---\n${contextStr}`
      : SYSTEM_PROMPT;

    // Build messages array (system + history)
    const currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.slice(-20).map((m: any) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content as string,
      })),
    ];

    // First call — may include tool calls
    let response = await openai.chat.completions.create({
      model: deployment,
      max_tokens: 1000,
      messages: currentMessages,
      tools,
    });

    const actionsTaken: string[] = [];

    // Process tool calls (up to 3 rounds to handle chained actions)
    let rounds = 0;
    while (response.choices[0]?.finish_reason === 'tool_calls' && rounds < 3) {
      rounds++;

      const assistantMsg = response.choices[0].message;
      const toolCalls = assistantMsg.tool_calls || [];

      // Append the assistant message (contains tool_calls) to history
      currentMessages.push(assistantMsg as OpenAI.Chat.ChatCompletionMessageParam);

      for (const tc of toolCalls) {
        const toolArgs = JSON.parse(tc.function.arguments || '{}');
        console.log(`Executing tool: ${tc.function.name}`, toolArgs);
        try {
          const { result, actionTaken } = await executeTool(tc.function.name, toolArgs, ctx);
          if (actionTaken) actionsTaken.push(actionTaken);
          currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        } catch (toolErr) {
          console.error(`Tool execution failed: ${tc.function.name}`, toolErr);
          await notifyError('ai-assistant: Tool execution failed', toolErr, {
            toolName: tc.function.name, userId, input: JSON.stringify(toolArgs).slice(0, 200),
          });
          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: `Error executing ${tc.function.name}: ${toolErr instanceof Error ? toolErr.message : 'Unknown error'}`,
          });
        }
      }

      // Follow-up call with tool results
      response = await openai.chat.completions.create({
        model: deployment,
        max_tokens: 1000,
        messages: currentMessages,
        tools,
      });
    }

    const reply = response.choices[0]?.message?.content || 'Done!';

    // Deduct 1 token for the AI chat message
    if (userId) {
      try {
        await deductTokens(
          auth.userId,
          TOKEN_COSTS.ai_chat_message,
          'ai_chat_message',
          `AI assistant message (${actionsTaken.length} actions)`,
          { actions_taken: actionsTaken }
        );
      } catch (tokenErr) {
        console.error('Token deduction failed (non-blocking):', tokenErr);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        actions: actionsTaken.length > 0 ? actionsTaken : undefined,
      }),
    };
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    await notifyError('ai-assistant: Unhandled exception', error, {
      errorType: error?.constructor?.name || 'Unknown',
      statusCode: error?.status || 'none',
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'The AI assistant encountered an error. Please try again.',
        reply: 'Sorry, I ran into a problem processing your request. Please try again in a moment.',
      }),
    };
  }
};

export { handler };
