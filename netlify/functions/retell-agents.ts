import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAuth, getUserAgentIds, userOwnsAgent } from './_shared/require-auth';

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY not configured');
  }
  return createClient(url, key);
}

function getInternalSecretHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || process.env.CRON_SECRET;
  return secret ? { 'x-internal-secret': secret } : {};
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Legacy fallback prompt — used only when no prompt_config is provided
function buildAgentPrompt(businessName: string, country?: string): string {
  const basePrompt = `You are a friendly, professional AI receptionist for ${businessName}. Help callers with scheduling, answering questions, and providing information about the business. Be concise and helpful.`;
  const needsDisclosure = !country || ['us','ca','gb','uk','au','nz','il','ie','de','fr','es','it','nl','be','at','ch','se','no','dk','fi','pt','pl','cz','gr','ro','hu','bg','hr','sk','si','lt','lv','ee','lu','mt','cy','is','li'].includes(country.toLowerCase());
  if (needsDisclosure) {
    return `IMPORTANT: At the very beginning of every call, you MUST introduce yourself by saying: "Hi, thank you for calling ${businessName}. Just so you know, I'm an AI assistant here to help you." Then proceed naturally with the conversation.\n\n${basePrompt}`;
  }
  return basePrompt;
}

// Generate professional prompt via internal HTTP call to the generate-agent-prompt function
async function generateProfessionalPrompt(promptConfig: any): Promise<{ prompt: string; beginMessage: string }> {
  // Use the co-located Netlify function via internal URL
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const response = await fetch(`${baseUrl}/.netlify/functions/generate-agent-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promptConfig),
  });

  if (!response.ok) {
    console.error('Prompt generation failed, falling back to legacy prompt');
    // Fallback: return a basic prompt so agent creation doesn't fail
    return {
      prompt: buildAgentPrompt(promptConfig.businessProfile?.businessName || 'this business', promptConfig.businessProfile?.country),
      beginMessage: `Hi, thanks for calling ${promptConfig.businessProfile?.businessName || 'us'}! How can I help you today?`,
    };
  }

  const data = await response.json();
  return { prompt: data.prompt, beginMessage: data.beginMessage };
}

// Match voice to user's country — always ElevenLabs
function getDefaultVoiceForCountry(country?: string, gender: 'female' | 'male' = 'female'): string {
  const c = (country || '').toLowerCase();

  if (gender === 'male') {
    if (['gb', 'uk', 'ie'].includes(c)) return '11labs-Anthony';          // British male
    if (['au', 'nz'].includes(c)) return '11labs-Billy';                  // Australian-friendly
    if (['us', 'ca'].includes(c)) return '11labs-Adrian';                 // American male
    if (['il'].includes(c)) return '11labs-Adrian';
    if (['za'].includes(c)) return '11labs-Anthony';                      // British-adjacent
    return '11labs-Adrian'; // Default male
  }

  // Female voices by region
  if (['gb', 'uk', 'ie'].includes(c)) return '11labs-Willa';             // British female
  if (['au', 'nz'].includes(c)) return '11labs-Lily';                    // Australian-friendly
  if (['us', 'ca'].includes(c)) return '11labs-Marissa';                 // American female
  if (['il'].includes(c)) return '11labs-Marissa';
  if (['in', 'pk', 'bd'].includes(c)) return '11labs-Merritt';           // Clear English
  if (['za'].includes(c)) return '11labs-Willa';                         // British-adjacent
  if (['de', 'at', 'ch', 'fr', 'be', 'nl', 'se', 'no', 'dk', 'fi'].includes(c)) return '11labs-Dorothy'; // Neutral British
  if (['es', 'mx', 'ar', 'co', 'cl', 'pe'].includes(c)) return '11labs-Lily'; // Warm tone
  return '11labs-Willa'; // Default female — British
}

// Default agent config — copied from agent_9a4ecdf921de328c9ba0009ff3 (Israel-Outbound)
// Applied to every new agent for consistent call quality
function getDefaultAgentConfig(language?: string) {
  const isHebrew = language?.startsWith('he');
  return {
    enable_backchannel: true,
    backchannel_words: isHebrew ? ['אהה', 'אה-אה'] : ['yeah', 'uh-huh'],
    backchannel_frequency: 0.8,
    ambient_sound: 'coffee-shop',
    response_eagerness: 1,
    interruption_sensitivity: 0.71,
    end_call_after_silence_ms: 30000,
    max_call_duration_ms: 481000,
    begin_message_delay_ms: 1000,
    allow_user_dtmf: true,
    post_call_analysis_model: 'gpt-4o-mini',
  };
}

// Build the response_engine param based on what the caller provides
function buildResponseEngine(body: any) {
  // If caller provides an llm_id, use Retell LLM engine
  if (body.llm_id) {
    return {
      type: 'retell-llm' as const,
      llm_id: body.llm_id,
    };
  }
  // If caller provides a custom LLM websocket URL, use custom LLM engine
  if (body.llm_websocket_url) {
    return {
      type: 'custom-llm' as const,
      llm_websocket_url: body.llm_websocket_url,
    };
  }
  // Default: use Azure custom LLM brain if configured
  const wsUrl = process.env.RETELL_LLM_WEBSOCKET_URL;
  if (wsUrl) {
    return { type: 'custom-llm' as const, llm_websocket_url: wsUrl };
  }
  return null;
}

async function userOwnsLlm(client: Retell, userId: string, llmId: string): Promise<boolean> {
  const ownedAgentIds = await getUserAgentIds(userId);
  const agentsForUser = await Promise.all(
    ownedAgentIds.map((id) => client.agent.retrieve(id).catch(() => null)),
  );
  return agentsForUser.some((agent: any) => agent?.response_engine?.llm_id === llmId);
}

async function userOwnsKnowledgeBase(client: Retell, userId: string, knowledgeBaseId: string): Promise<boolean> {
  const ownedAgentIds = await getUserAgentIds(userId);
  const agentsForUser = await Promise.all(
    ownedAgentIds.map((id) => client.agent.retrieve(id).catch(() => null)),
  );

  for (const agent of agentsForUser) {
    const engine = (agent as any)?.response_engine;
    if (Array.isArray(engine?.knowledge_base_ids) && engine.knowledge_base_ids.includes(knowledgeBaseId)) {
      return true;
    }

    if (engine?.llm_id) {
      const llm = await client.llm.retrieve(engine.llm_id).catch(() => null);
      if (Array.isArray((llm as any)?.knowledge_base_ids) && (llm as any).knowledge_base_ids.includes(knowledgeBaseId)) {
        return true;
      }
    }
  }

  return false;
}

async function userOwnsAllKnowledgeBases(client: Retell, userId: string, knowledgeBaseIds: unknown): Promise<boolean> {
  if (!Array.isArray(knowledgeBaseIds)) return false;
  for (const id of knowledgeBaseIds) {
    if (typeof id !== 'string' || !(await userOwnsKnowledgeBase(client, userId, id))) {
      return false;
    }
  }
  return true;
}

async function isPlatformRetellAdmin(
  event: Parameters<Handler>[0],
  supabase: SupabaseClient,
): Promise<boolean> {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice('Bearer '.length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return false;

  const role = (data.user.app_metadata as { role?: string } | undefined)?.role;
  if (role === 'founder') return true;

  if (data.user.email) {
    const { data: adminRow, error: adminErr } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('email', data.user.email)
      .maybeSingle();
    if (adminErr) throw adminErr;
    return Boolean(adminRow);
  }

  return false;
}

async function validateOwnedSetupReferences(
  supabase: SupabaseClient,
  userId: string,
  body: any,
): Promise<{ ok: true } | { ok: false; statusCode: number; error: string }> {
  if (body.business_profile_id) {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('id', body.business_profile_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        ok: false,
        statusCode: 403,
        error: 'business_profile_id does not belong to the authenticated user',
      };
    }
  }

  if (body.kb_folder_id) {
    const { data, error } = await supabase
      .from('kb_folders')
      .select('id')
      .eq('id', body.kb_folder_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        ok: false,
        statusCode: 403,
        error: 'kb_folder_id does not belong to the authenticated user',
      };
    }
  }

  return { ok: true };
}

// Build general_tools array for LLM creation/update
// Includes: lookup_caller, transfer_call, end_call, check_availability, book_appointment, cancel_appointment, reschedule_appointment, send_sms, search_knowledge_base
function buildGeneralTools(options: {
  transferNumber?: string;
  baseUrl: string;
}): any[] {
  const { transferNumber, baseUrl } = options;
  const toolsWebhookUrl = `${baseUrl}/.netlify/functions/agent-tools`;

  const tools: any[] = [
    // Custom: lookup caller — MUST be first, called at the start of every inbound call
    {
      type: 'custom',
      name: 'lookup_caller',
      description: 'Look up the caller in the customer database using their phone number. IMPORTANT: Call this tool at the very start of every inbound call before greeting the caller, using the caller phone number from the call metadata.',
      speak_after_execution: false,
      speak_during_execution: false,
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          phone_number: { type: 'string', description: 'The caller phone number in E.164 format' },
        },
        required: ['phone_number'],
      },
      timeout_ms: 5000,
    },
    // Built-in: end call
    {
      type: 'end_call',
      name: 'end_call',
      description: 'End the call politely. Use when the conversation is complete and the caller has no more questions.',
    },
    // Custom: check availability
    {
      type: 'custom',
      name: 'check_availability',
      description: 'Check available appointment slots for a specific date. Use when the caller wants to book an appointment and you need to find available times.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'Let me check what times are available for that date.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          date: { type: 'string', description: 'The date to check availability for, in YYYY-MM-DD format' },
        },
        required: ['date'],
      },
      timeout_ms: 15000,
    },
    // Custom: book appointment
    {
      type: 'custom',
      name: 'book_appointment',
      description: 'Book an appointment for the caller. Use after confirming the date, time, and service with the caller. Always confirm the details before booking.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'One moment while I book that appointment for you.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Caller full name' },
          email: { type: 'string', description: 'Caller email address' },
          phone: { type: 'string', description: 'Caller phone number' },
          date: { type: 'string', description: 'Appointment date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Appointment time in HH:MM 24-hour format' },
          service: { type: 'string', description: 'Type of service or reason for visit' },
          notes: { type: 'string', description: 'Any additional notes or special requests' },
        },
        required: ['name', 'date', 'time'],
      },
      timeout_ms: 20000,
    },
    // Custom: cancel appointment
    {
      type: 'custom',
      name: 'cancel_appointment',
      description: 'Cancel an existing appointment for the caller. Use when the caller wants to cancel their upcoming appointment. You need their name, phone number, or email to find the appointment. Always confirm the cancellation before executing.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'Let me cancel that appointment for you.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Caller full name to search for the appointment' },
          phone: { type: 'string', description: 'Caller phone number' },
          email: { type: 'string', description: 'Caller email address' },
          reason: { type: 'string', description: 'Reason for cancellation' },
        },
        required: [],
      },
      timeout_ms: 15000,
    },
    // Custom: reschedule appointment
    {
      type: 'custom',
      name: 'reschedule_appointment',
      description: 'Reschedule an existing appointment to a new date and time. Use when the caller wants to move their appointment. You need their name/phone/email to find it, plus the new date and time. Always check availability first, then confirm before rescheduling.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'Let me reschedule that appointment for you.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Caller full name to search for the appointment' },
          phone: { type: 'string', description: 'Caller phone number' },
          email: { type: 'string', description: 'Caller email address' },
          new_date: { type: 'string', description: 'New appointment date in YYYY-MM-DD format' },
          new_time: { type: 'string', description: 'New appointment time in HH:MM 24-hour format' },
        },
        required: ['new_date', 'new_time'],
      },
      timeout_ms: 20000,
    },
    // Custom: send SMS
    {
      type: 'custom',
      name: 'send_sms',
      description: 'Send a text message to the caller. Use to send appointment confirmations, business address, or follow-up info. Always ask permission before sending.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'Let me send you a text message with that information.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          phone_number: { type: 'string', description: 'Phone number to send SMS to in E.164 format' },
          message: { type: 'string', description: 'The text message content' },
        },
        required: ['phone_number', 'message'],
      },
      timeout_ms: 10000,
    },
    // Custom: search knowledge base — for detailed/technical questions
    {
      type: 'custom',
      name: 'search_knowledge_base',
      description: 'Search the business knowledge base for detailed or technical information. Use when the caller asks a specific question that is NOT covered in your main instructions — such as product details, technical specifications, materials used, detailed procedures, or specialized services. Do NOT use for basic info like hours, services, or pricing.',
      speak_after_execution: true,
      speak_during_execution: true,
      execution_message_description: 'Let me check our records for that information.',
      url: toolsWebhookUrl,
      parameters: {
        type: 'object' as const,
        properties: {
          question: { type: 'string', description: 'The specific question or topic to search for in the knowledge base' },
        },
        required: ['question'],
      },
      timeout_ms: 10000,
    },
  ];

  // Add transfer_call tool only if a transfer number is provided
  if (transferNumber) {
    tools.unshift({
      type: 'transfer_call',
      name: 'transfer_call',
      description: 'Transfer the call to a human agent or the business owner. Use when the caller explicitly asks to speak to a person, or for urgent matters you cannot handle.',
      transfer_destination: {
        type: 'predefined',
        number: transferNumber,
      },
      transfer_option: {
        type: 'warm_transfer',
        show_transferee_as_caller: true,
      },
    });
  }

  return tools;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ── Auth gate — every method requires a valid Supabase JWT or bc_ API key ──
  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Retell API key not configured' }),
    };
  }

  const client = new Retell({ apiKey });

  try {
    // GET /retell-agents — list THIS user's agents only
    // GET /retell-agents?agent_id=xxx — get single agent (only if owned by user)
    if (event.httpMethod === 'GET') {
      const agentId = event.queryStringParameters?.agent_id;
      const llmId = event.queryStringParameters?.llm_id;

      const ownedAgentIds = await getUserAgentIds(userId);

      if (llmId) {
        // Fetching an LLM exposes the system prompt — only allow if the LLM
        // belongs to one of the user's agents.
        const llm = await client.llm.retrieve(llmId);
        const agentsForUser = await Promise.all(
          ownedAgentIds.map((id) => client.agent.retrieve(id).catch(() => null)),
        );
        const ownsLlm = agentsForUser.some(
          (a: any) => a?.response_engine?.llm_id === llmId,
        );
        if (!ownsLlm) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(llm) };
      }
      if (agentId) {
        if (!ownedAgentIds.includes(agentId)) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        }
        const agent = await client.agent.retrieve(agentId);
        return { statusCode: 200, headers, body: JSON.stringify(agent) };
      }
      // List — return only agents owned by this user, not the org-wide list
      const allAgents = await client.agent.list();
      const ownedSet = new Set(ownedAgentIds);
      const filtered = (allAgents || []).filter((a: any) => ownedSet.has(a.agent_id));
      return { statusCode: 200, headers, body: JSON.stringify(filtered) };
    }

    // POST /retell-agents — create agent with knowledge base
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action } = body;
      const requestedUserId = body.user_id == null ? null : String(body.user_id);
      if (requestedUserId && requestedUserId !== userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'user_id does not match authenticated user' }),
        };
      }
      body.user_id = userId;

      if (body.llm_id && !(await userOwnsLlm(client, userId, String(body.llm_id)))) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'LLM not found' }),
        };
      }

      // Create knowledge base
      if (action === 'create_kb') {
        const kb = await client.knowledgeBase.create({
          knowledge_base_name: body.knowledge_base_name,
          knowledge_base_texts: body.knowledge_base_texts,
          knowledge_base_urls: body.knowledge_base_urls || [],
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            knowledge_base_id: kb.knowledge_base_id,
          }),
        };
      }

      // Create agent — auto-creates LLM if no llm_id or llm_websocket_url provided
      if (action === 'create_agent') {
        if (body.knowledge_base_ids && !(await userOwnsAllKnowledgeBases(client, userId, body.knowledge_base_ids))) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Not authorized to attach this knowledge base' }),
          };
        }

        let responseEngine = buildResponseEngine(body);

        const webhookBaseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

        // If no response engine provided, create a Retell LLM first
        if (!responseEngine) {
          const generalTools = buildGeneralTools({
            transferNumber: body.transfer_number || '',
            baseUrl: webhookBaseUrl,
          });

          const llm = await client.llm.create({
            model: 'gpt-4o-mini',
            general_prompt: body.general_prompt || buildAgentPrompt(body.agent_name || 'this business', body.country),
            ...(body.knowledge_base_ids ? { knowledge_base_ids: body.knowledge_base_ids } : {}),
            general_tools: generalTools,
          } as any);
          responseEngine = {
            type: 'retell-llm' as const,
            llm_id: llm.llm_id,
          };
        }

        const agent = await client.agent.create({
          agent_name: body.agent_name,
          voice_id: body.voice_id || getDefaultVoiceForCountry(body.country, body.voice_gender),
          response_engine: responseEngine,
          webhook_url: `${webhookBaseUrl}/.netlify/functions/retell-webhook`,
          ...getDefaultAgentConfig(body.language),
        } as any);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            agent_id: agent.agent_id,
            agent,
          }),
        };
      }

      // Create both KB + Agent in one call
      if (action === 'create_full') {
        const serviceSupabase = getSupabaseAdmin();
        const ownership = await validateOwnedSetupReferences(serviceSupabase, userId, body);
        if (!ownership.ok) {
          return {
            statusCode: ownership.statusCode,
            headers,
            body: JSON.stringify({ error: ownership.error }),
          };
        }

        // Step 0: Scrape website with Firecrawl if URL provided — adds rich content to KB
        if (body.website_url) {
          try {
            const scrapeBaseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
            const scrapeRes = await fetch(`${scrapeBaseUrl}/.netlify/functions/firecrawl-scrape`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getInternalSecretHeaders() },
              body: JSON.stringify({ url: body.website_url }),
            });

            if (scrapeRes.ok) {
              const scraped = await scrapeRes.json();
              const scrapedContent = scraped.markdown || scraped.content || '';

              if (scrapedContent && scrapedContent.length > 100) {
                // Add scraped website content as a KB entry
                if (!body.knowledge_base_texts) body.knowledge_base_texts = [];
                body.knowledge_base_texts.push({
                  title: `Website Content — ${scraped.title || body.website_url}`,
                  text: scrapedContent.substring(0, 30000), // Limit to 30k chars for prompt
                });
                console.log(`[retell-agents] Scraped website via ${scraped.source || 'unknown'}: ${scrapedContent.length} chars`);
              }
            }
          } catch (scrapeErr) {
            console.error('[retell-agents] Website scrape failed (non-blocking):', scrapeErr);
          }
        }

        // Step 1: Store KB in Supabase (NOT Retell — saves $64+/mo)
        // Tier 1 (prompt) entries get injected into the LLM prompt
        // Tier 2 (search) entries are searchable via search_knowledge_base tool
        // Skip if kb_folder_id already provided — KB was created by the primary agent; don't duplicate entries
        let supabaseKbId: string | null = null;
        if (body.knowledge_base_texts?.length && !body.kb_folder_id) {
          try {
            const kbBaseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
            const kbRes = await fetch(`${kbBaseUrl}/.netlify/functions/kb-search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add_batch',
                userId: body.user_id,
                entries: body.knowledge_base_texts.map((text: any) => ({
                  title: typeof text === 'string' ? text.split('\n')[0].slice(0, 100) : text.title || 'Knowledge Entry',
                  content: typeof text === 'string' ? text : text.text || text.content || '',
                  category: 'business_info',
                  tier: 'prompt', // Core business info goes in prompt
                })),
              }),
            });
            if (kbRes.ok) {
              const kbData = await kbRes.json();
              console.log(`[retell-agents] Saved ${kbData.added} KB entries to Supabase`);
            }
          } catch (kbErr) {
            console.error('[retell-agents] KB save to Supabase failed (non-blocking):', kbErr);
          }
        }

        // Step 2: Generate professional prompt (or use legacy fallback)
        let generalPrompt: string;
        let beginMessage: string | undefined;

        if (body.prompt_config) {
          const generated = await generateProfessionalPrompt(body.prompt_config);
          generalPrompt = generated.prompt;
          beginMessage = generated.beginMessage;
        } else if (body.general_prompt) {
          generalPrompt = body.general_prompt;
          beginMessage = body.begin_message;
        } else {
          generalPrompt = buildAgentPrompt(body.business_name, body.country);
        }

        // Inject KB text directly into the prompt (Tier 1 — XML document format)
        if (body.knowledge_base_texts?.length) {
          generalPrompt += '\n\n## Business Knowledge Base\nBelow is your structured knowledge base. Each document contains a question and answer. Use this information to answer accurately, but REPHRASE answers in your own tone and style — never read them verbatim.\n\n<knowledge_base>\n';
          for (const text of body.knowledge_base_texts) {
            const content = typeof text === 'string' ? text : text.text || text.content || '';
            if (content) generalPrompt += `${content}\n`;
          }
          generalPrompt += '</knowledge_base>\n';
        }

        // Step 3: Determine response engine
        let responseEngine;
        const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

        if (body.llm_id) {
          responseEngine = { type: 'retell-llm' as const, llm_id: body.llm_id };
        } else if (body.llm_websocket_url) {
          responseEngine = { type: 'custom-llm' as const, llm_websocket_url: body.llm_websocket_url };
        } else if (process.env.RETELL_LLM_WEBSOCKET_URL) {
          // Azure custom LLM — skip Retell LLM creation; system prompt lives in Supabase agents table
          responseEngine = { type: 'custom-llm' as const, llm_websocket_url: process.env.RETELL_LLM_WEBSOCKET_URL };
        } else {
          // Fallback: Retell-managed LLM (gpt-4o-mini) when no Azure WS configured
          const generalTools = buildGeneralTools({
            transferNumber: body.transfer_number || '',
            baseUrl,
          });

          const llmConfig: any = {
            model: 'gpt-4o-mini',
            general_prompt: generalPrompt,
            general_tools: generalTools,
          };
          if (beginMessage) {
            llmConfig.begin_message = beginMessage;
          }
          const llm = await client.llm.create(llmConfig);
          responseEngine = { type: 'retell-llm' as const, llm_id: llm.llm_id };
        }

        // Step 4: Create agent with the response engine + default config
        const webhookUrl = `${(process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org')}/.netlify/functions/retell-webhook`;
        const agent = await client.agent.create({
          agent_name: `${body.business_name} AI Receptionist`,
          voice_id: body.voice_id || getDefaultVoiceForCountry(body.country, body.voice_gender),
          language: body.language || 'en-US',
          response_engine: responseEngine,
          webhook_url: webhookUrl,
          ...getDefaultAgentConfig(body.language),
        } as any);

        // Step 5: Register agent in Cekura + create test scenarios (don't run yet)
        let cekuraSetup: { success: boolean; cekura_agent_id?: number; evaluators_created?: number; error?: string } = { success: false };
        try {
          const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

          // Step 5a: Register agent in Cekura
          const registerRes = await fetch(`${baseUrl}/.netlify/functions/cekura-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getInternalSecretHeaders() },
            body: JSON.stringify({
              action: 'register_agent',
              retell_agent_id: agent.agent_id,
              agent_name: `${body.business_name} AI Receptionist`,
              phone_number: body.phone_number,
              language: body.language,
            }),
          });

          if (registerRes.ok) {
            const registerData = await registerRes.json();
            const cekuraAgentId = registerData.cekura_agent_id;

            // Step 5b: Create test evaluators (prepared, not run)
            const evalRes = await fetch(`${baseUrl}/.netlify/functions/cekura-test`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getInternalSecretHeaders() },
              body: JSON.stringify({
                action: 'create_evaluators',
                cekura_agent_id: cekuraAgentId,
                agent_name: `${body.business_name} AI Receptionist`,
                business_name: body.business_name,
              }),
            });

            if (evalRes.ok) {
              const evalData = await evalRes.json();
              cekuraSetup = {
                success: true,
                cekura_agent_id: cekuraAgentId,
                evaluators_created: evalData.evaluators_created,
              };
            } else {
              cekuraSetup = { success: true, cekura_agent_id: cekuraAgentId, evaluators_created: 0, error: 'Evaluator creation failed' };
            }
          } else {
            const err = await registerRes.json().catch(() => ({}));
            cekuraSetup = { success: false, error: err.details || err.error || 'Cekura registration failed' };
          }
        } catch (testErr) {
          console.error('Cekura setup failed:', testErr);
          cekuraSetup = { success: false, error: testErr instanceof Error ? testErr.message : 'Cekura setup failed' };
        }

        // Step 6: Save agent to Supabase agents table + create/link KB folder
        let supabaseAgentId: string | null = null;
        let kbFolderId: string | null = body.kb_folder_id || null;

        const sb = serviceSupabase;
        if (body.user_id) {
          try {
            // 6a: Insert agent row into Supabase
            const agentDirection = (body.agent_type || 'inbound').startsWith('outbound') ? 'outbound' : 'inbound';
            const agentName = body.agent_name || `${body.business_name} AI Receptionist`;
            const { data: agentRow, error: agentErr } = await sb
              .from('agents')
              .insert({
                user_id: body.user_id,
                business_profile_id: body.business_profile_id || null,
                name: agentName,
                description: body.agent_type === 'inbound'
                  ? 'Answers incoming calls — booking, FAQs, transfers'
                  : `Outbound agent — ${body.agent_type || 'speed to lead'}`,
                agent_type: body.agent_type || 'inbound',
                status: 'active',
                voice_id: agent.voice_id || body.voice_id || null,
                language: body.language || 'en',
                retell_agent_id: agent.agent_id,
                // Mirror the prompt to Supabase so SMS/email/WhatsApp responders
                // can read the same canonical prompt the voice agent uses.
                system_prompt: generalPrompt || null,
                system_prompt_synced_at: generalPrompt ? new Date().toISOString() : null,
                begin_message: beginMessage || null,
              })
              .select('id')
              .single();

            if (agentErr) {
              console.error('[retell-agents] Supabase agent insert failed:', agentErr);
            } else {
              supabaseAgentId = agentRow.id;
              console.log(`[retell-agents] Saved agent to Supabase: ${supabaseAgentId}`);
            }

            // 6b: Create "Business Profile" KB folder (or reuse if kb_folder_id passed)
            if (!kbFolderId && body.business_profile_id) {
              const { data: folderRow, error: folderErr } = await sb
                .from('kb_folders')
                .insert({
                  business_profile_id: body.business_profile_id,
                  user_id: body.user_id,
                  name: 'Business Profile',
                  description: 'Your core business information, services, FAQs, and policies',
                  icon: 'building',
                  is_default: true,
                })
                .select('id')
                .single();

              if (folderErr) {
                console.error('[retell-agents] KB folder creation failed:', folderErr);
              } else {
                kbFolderId = folderRow.id;
                console.log(`[retell-agents] Created KB folder: ${kbFolderId}`);
              }
            }

            // 6c: Assign KB docs to the folder
            if (kbFolderId) {
              const { error: updateErr } = await sb
                .from('knowledge_base')
                .update({ kb_folder_id: kbFolderId })
                .eq('user_id', body.user_id)
                .is('kb_folder_id', null);

              if (updateErr) {
                console.error('[retell-agents] KB doc folder assignment failed:', updateErr);
              }
            }

            // 6d: Link agent to KB folder
            if (supabaseAgentId && kbFolderId) {
              const { error: linkErr } = await sb
                .from('agent_kb_folders')
                .insert({ agent_id: supabaseAgentId, kb_folder_id: kbFolderId })
                .select();

              if (linkErr) {
                console.error('[retell-agents] Agent-folder link failed:', linkErr);
              }
            }
          } catch (dbErr) {
            console.error('[retell-agents] Supabase operations failed:', dbErr);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            knowledge_base_id: supabaseKbId || null,
            agent_id: agent.agent_id,
            supabase_agent_id: supabaseAgentId,
            kb_folder_id: kbFolderId,
            agent,
            prompt_used: body.prompt_config ? 'professional' : body.general_prompt ? 'custom' : 'legacy',
            cekura_setup: cekuraSetup,
          }),
        };
      }

      // Create a web call for testing the agent in-browser
      if (action === 'create_web_call') {
        if (!body.agent_id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'agent_id required' }) };
        }
        if (!(await userOwnsAgent(userId, body.agent_id))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to create a call for this agent' }) };
        }
        const webCall = await client.call.createWebCall({
          agent_id: body.agent_id,
          metadata: body.metadata || {},
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            call_id: webCall.call_id,
            access_token: webCall.access_token,
          }),
        };
      }

      // Sync knowledge base — replace all text sources in an existing Retell KB
      if (action === 'sync_kb') {
        const { knowledge_base_id, knowledge_base_texts, knowledge_base_urls } = body;
        if (!knowledge_base_id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'knowledge_base_id required' }) };
        }
        if (!(await userOwnsKnowledgeBase(client, userId, knowledge_base_id))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to sync this knowledge base' }) };
        }

        if (!knowledge_base_texts?.length && !knowledge_base_urls?.length) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'No sources to add' }) };
        }

        // Step 1: Delete all existing text sources to avoid duplicates
        const existing = await client.knowledgeBase.retrieve(knowledge_base_id);
        const textSources = (existing.knowledge_base_sources || []).filter(
          (s: any) => s.type === 'text'
        );
        for (const source of textSources) {
          try {
            await client.knowledgeBase.deleteSource(knowledge_base_id, (source as any).source_id);
          } catch (e) {
            console.error(`Failed to delete source ${(source as any).source_id}:`, e);
          }
        }

        // Step 2: Add fresh sources
        const addParams: any = {};
        if (knowledge_base_texts?.length) addParams.knowledge_base_texts = knowledge_base_texts;
        if (knowledge_base_urls?.length) addParams.knowledge_base_urls = knowledge_base_urls;

        const updated = await client.knowledgeBase.addSources(knowledge_base_id, addParams);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            knowledge_base_id: updated.knowledge_base_id,
            sources_deleted: textSources.length,
            sources_added: (knowledge_base_texts?.length || 0) + (knowledge_base_urls?.length || 0),
          }),
        };
      }

      // Migrate all existing agents to use the Azure custom LLM WebSocket brain.
      // Retell does not allow changing response_engine type in-place, so the strategy is:
      // 1. Get current Retell agent config (voice, webhook, etc.)
      // 2. Create a new agent with custom-llm engine and the same config
      // 3. Update Supabase retell_agent_id with the new agent ID
      // 4. Delete the old Retell agent
      if (action === 'migrate_to_azure') {
        const wsUrl = process.env.RETELL_LLM_WEBSOCKET_URL;
        if (!wsUrl) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'RETELL_LLM_WEBSOCKET_URL env var not set' }) };
        }
        const sb = getSupabaseAdmin();
        if (!(await isPlatformRetellAdmin(event, sb))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Founder or platform admin required' }) };
        }
        const { data: agentRows, error: fetchErr } = await sb
          .from('agents')
          .select('id, retell_agent_id')
          .not('retell_agent_id', 'is', null);
        if (fetchErr) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: fetchErr.message }) };
        }
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        const results: Array<{ old_id: string; new_id?: string; status: string }> = [];
        for (const row of (agentRows || [])) {
          try {
            // Get current Retell agent to check engine type and preserve settings
            const existing = await client.agent.retrieve(row.retell_agent_id);
            if ((existing.response_engine as any)?.type === 'custom-llm') {
              skipped++;
              results.push({ old_id: row.retell_agent_id, status: 'already_custom_llm' });
              continue;
            }
            // Create replacement agent with custom-llm, preserving all voice/webhook settings
            const newAgent = await client.agent.create({
              agent_name: existing.agent_name,
              response_engine: { type: 'custom-llm' as const, llm_websocket_url: wsUrl },
              voice_id: existing.voice_id,
              language: existing.language as any,
              webhook_url: existing.webhook_url,
              enable_backchannel: existing.enable_backchannel,
              backchannel_frequency: existing.backchannel_frequency,
              backchannel_words: existing.backchannel_words,
              ambient_sound: existing.ambient_sound as any,
              interruption_sensitivity: existing.interruption_sensitivity,
              begin_message_delay_ms: existing.begin_message_delay_ms,
              max_call_duration_ms: existing.max_call_duration_ms,
              end_call_after_silence_ms: existing.end_call_after_silence_ms,
            } as any);
            // Update Supabase with new agent ID
            await sb.from('agents').update({ retell_agent_id: newAgent.agent_id }).eq('id', row.id);
            // Delete the old agent (no phone number check — callers should verify first)
            await client.agent.delete(row.retell_agent_id);
            updated++;
            results.push({ old_id: row.retell_agent_id, new_id: newAgent.agent_id, status: 'migrated' });
          } catch (e) {
            console.error(`[migrate_to_azure] Failed for ${row.retell_agent_id}:`, e);
            failed++;
            results.push({ old_id: row.retell_agent_id, status: 'failed' });
          }
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, updated, skipped, failed, websocket_url: wsUrl, results }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use: create_kb, create_agent, create_full, create_web_call, sync_kb, or migrate_to_azure' }),
      };
    }

    // PUT /retell-agents — update agent or LLM
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      // Update LLM prompt directly
      if (body.action === 'update_llm' && body.llm_id) {
        const { llm_id, ...llmUpdates } = body;
        delete llmUpdates.action;

        // Verify the LLM belongs to one of the user's agents before mutating.
        const ownedAgentIds = await getUserAgentIds(userId);
        const userAgents = await Promise.all(
          ownedAgentIds.map((id) => client.agent.retrieve(id).catch(() => null)),
        );
        const ownsLlm = userAgents.some(
          (a: any) => a?.response_engine?.llm_id === llm_id,
        );
        if (!ownsLlm) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to modify this LLM' }) };
        }

        const llm = await client.llm.update(llm_id, llmUpdates as any);
        const updatedPrompt = (llm as any).general_prompt as string | undefined;

        // Mirror new prompt to Supabase so text responders match voice. Find
        // the matching agent row by retell_agent_id (must look up via the LLM
        // since the request only has llm_id).
        if (updatedPrompt) {
          try {
            const sb = getSupabaseAdmin();
            if (sb) {
              const allAgents = await client.agent.list();
              const matchingAgent = (allAgents || []).find(
                (a: any) => a.response_engine?.llm_id === llm_id,
              );
              if (matchingAgent?.agent_id) {
                await sb
                  .from('agents')
                  .update({
                    system_prompt: updatedPrompt,
                    system_prompt_synced_at: new Date().toISOString(),
                  })
                  .eq('retell_agent_id', matchingAgent.agent_id);
              }
            }
          } catch (mirrorErr) {
            console.warn('[retell-agents] system_prompt mirror failed:', mirrorErr instanceof Error ? mirrorErr.message : mirrorErr);
          }
        }

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, llm_id: llm.llm_id, prompt_length: updatedPrompt?.length || 0 }) };
      }

      // Update agent
      const { agent_id, ...updates } = body;
      if (!agent_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agent_id required' }) };
      }
      if (!(await userOwnsAgent(userId, agent_id))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to modify this agent' }) };
      }
      const agent = await client.agent.update(agent_id, updates as any);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, agent }) };
    }

    // DELETE /retell-agents?agent_id=xxx
    if (event.httpMethod === 'DELETE') {
      const agentId = event.queryStringParameters?.agent_id;
      if (!agentId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agent_id required' }) };
      }
      if (!(await userOwnsAgent(userId, agentId))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to delete this agent' }) };
      }
      await client.agent.delete(agentId);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('retell-agents error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Retell agent operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
