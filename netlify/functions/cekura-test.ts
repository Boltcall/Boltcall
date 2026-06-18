import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { hasSharedSecret } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

const CEKURA_API_BASE = 'https://api.cekura.ai/test_framework/v1';

// Fetch Retell agent details to get the LLM ID (needed by Cekura as chat_assistant_id)
async function getRetellAgentLlmId(agentId: string): Promise<string | null> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Retell({ apiKey });
    const agent = await client.agent.retrieve(agentId);
    const engine = agent.response_engine as any;
    return engine?.llm_id || null;
  } catch {
    return null;
  }
}

async function cekuraRequest(path: string, method: string, body?: any) {
  const apiKey = process.env.CEKURA_API_KEY;
  if (!apiKey) {
    throw new Error('Cekura API key not configured');
  }

  const response = await fetch(`${CEKURA_API_BASE}${path}`, {
    method,
    headers: {
      'X-CEKURA-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data) || `Cekura API error: ${response.status}`);
  }
  return data;
}

// Default test scenarios for a new voice agent
function buildDefaultEvaluators(agentName: string, businessName: string) {
  return [
    {
      name: `${agentName} — Greeting Test`,
      instructions: `You are a first-time caller. Call the business and wait for the agent to greet you. Say "Hello, I'd like to know more about your services." Then listen to the response.`,
      expected_outcome_prompt: `The agent should greet the caller professionally, identify itself as an AI assistant for ${businessName}, and offer to help. The greeting should be clear and natural-sounding.`,
    },
    {
      name: `${agentName} — Business Hours Inquiry`,
      instructions: `Call and ask "What are your business hours?" Wait for the response. Then ask "Are you open on weekends?"`,
      expected_outcome_prompt: `The agent should provide accurate business hours information from its knowledge base. If weekend hours differ, it should mention that. The response should be concise and helpful.`,
    },
    {
      name: `${agentName} — Service Inquiry`,
      instructions: `Call and say "Hi, I'm interested in your services. Can you tell me what you offer and how much it costs?" Wait for the full response.`,
      expected_outcome_prompt: `The agent should list available services with pricing if available in its knowledge base. It should sound knowledgeable and offer to help schedule or provide more details.`,
    },
    {
      name: `${agentName} — Appointment Booking`,
      instructions: `Call and say "I'd like to schedule an appointment for next week." When asked for details, provide a name "John Smith" and say "Any time Tuesday afternoon works for me."`,
      expected_outcome_prompt: `The agent should attempt to schedule an appointment, ask for necessary details (name, preferred time, service needed), and confirm or transfer to booking. Should not hang up abruptly.`,
    },
    {
      name: `${agentName} — Edge Case: Unclear Request`,
      instructions: `Call and mumble something unclear like "Uh... yeah so I was wondering... like... do you guys do that thing... you know?" Be vague and see how the agent handles it.`,
      expected_outcome_prompt: `The agent should handle the unclear request gracefully. It should ask clarifying questions rather than guessing or hanging up. It should remain patient and professional.`,
    },
  ];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!hasSharedSecret(event)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Internal authorization required' }),
    };
  }

  try {
    // GET — check test result status
    if (event.httpMethod === 'GET') {
      const resultId = event.queryStringParameters?.result_id;
      if (!resultId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'result_id required' }) };
      }

      const result = await cekuraRequest(`/results/${resultId}/`, 'GET');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: result.id,
          status: result.status,
          success_rate: result.success_rate,
          total_runs: result.total_runs_count,
          completed_runs: result.completed_runs_count,
          success_runs: result.success_runs_count,
          failed_runs: result.failed_runs_count,
          total_duration: result.total_duration,
          overall_evaluation: result.overall_evaluation,
          failed_reasons: result.failed_reasons,
          runs: result.runs,
        }),
      };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // Register a Retell agent in Cekura for testing
    if (action === 'register_agent') {
      const { retell_agent_id, agent_name, phone_number, language, description, inbound } = body;

      if (!retell_agent_id || !agent_name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'retell_agent_id and agent_name required' }) };
      }

      // Check if agent already exists in Cekura
      const existingAgents = await cekuraRequest('/aiagents/', 'GET');
      const existing = existingAgents.results?.find(
        (a: any) => a.assistant_id === retell_agent_id
      );

      if (existing) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            cekura_agent_id: existing.id,
            already_existed: true,
          }),
        };
      }

      const retellApiKey = process.env.RETELL_API_KEY;
      // Fetch the LLM ID from Retell — Cekura requires it as chat_assistant_id
      const llmId = body.llm_id || await getRetellAgentLlmId(retell_agent_id);

      const cekuraAgent = await cekuraRequest('/aiagents/', 'POST', {
        agent_name,
        assistant_id: retell_agent_id,
        ...(llmId ? { chat_assistant_id: llmId } : {}),
        contact_number: phone_number || '+10000000000', // Placeholder if no number yet
        inbound: inbound !== false, // Default to inbound
        language: language || 'en',
        description: description || `AI receptionist for ${agent_name}`,
        assistant_provider: 'retell',
        transcript_provider: 'retell',
        retell_api_key: retellApiKey,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          cekura_agent_id: cekuraAgent.id,
        }),
      };
    }

    // Create default test scenarios (evaluators) for an agent
    if (action === 'create_evaluators') {
      const { cekura_agent_id, agent_name, business_name, personality_id } = body;

      if (!cekura_agent_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'cekura_agent_id required' }) };
      }

      const scenarios = buildDefaultEvaluators(
        agent_name || 'AI Agent',
        business_name || 'the business'
      );

      const created: Array<{ id: string; name: string }> = [];
      for (const scenario of scenarios) {
        try {
          const evaluator = await cekuraRequest('/scenarios/', 'POST', {
            agent: cekura_agent_id,
            name: scenario.name,
            instructions: scenario.instructions,
            expected_outcome_prompt: scenario.expected_outcome_prompt,
            ...(personality_id ? { personality: personality_id } : {}),
          });
          created.push({ id: evaluator.id, name: evaluator.name });
        } catch (err) {
          console.error(`Failed to create evaluator "${scenario.name}":`, err);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          evaluators_created: created.length,
          evaluators: created,
        }),
      };
    }

    // Run all test scenarios for an agent
    if (action === 'run_tests') {
      const { cekura_agent_id, scenario_ids, name } = body;

      if (!cekura_agent_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'cekura_agent_id required' }) };
      }

      const runPayload: any = {
        agent_id: cekura_agent_id,
        scenarios: scenario_ids || 'all',
        frequency: 1,
        name: name || `Auto-test ${new Date().toISOString()}`,
      };

      const result = await cekuraRequest('/scenarios/run_scenarios/', 'POST', runPayload);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          result_id: result.id,
          status: result.status,
          total_runs: result.runs?.length || 0,
          runs: result.runs?.map((r: any) => ({
            id: r.id,
            status: r.status,
            scenario_name: r.scenario_name,
          })),
        }),
      };
    }

    // Full pipeline: register agent → create evaluators → run tests
    if (action === 'full_test') {
      const { retell_agent_id, agent_name, business_name, phone_number, language } = body;

      if (!retell_agent_id || !agent_name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'retell_agent_id and agent_name required' }) };
      }

      // Step 1: Register agent in Cekura
      const retellApiKey = process.env.RETELL_API_KEY;
      let cekuraAgentId: number;

      // Fetch the LLM ID from Retell — Cekura requires it as chat_assistant_id
      const llmId = body.llm_id || await getRetellAgentLlmId(retell_agent_id);

      const existingAgents = await cekuraRequest('/aiagents/', 'GET');
      const existing = existingAgents.results?.find(
        (a: any) => a.assistant_id === retell_agent_id
      );

      if (existing) {
        cekuraAgentId = existing.id;
      } else {
        const cekuraAgent = await cekuraRequest('/aiagents/', 'POST', {
          agent_name,
          assistant_id: retell_agent_id,
          ...(llmId ? { chat_assistant_id: llmId } : {}),
          contact_number: phone_number || '+10000000000',
          inbound: true,
          language: language || 'en',
          description: `AI receptionist for ${business_name || agent_name}`,
          assistant_provider: 'retell',
          transcript_provider: 'retell',
          retell_api_key: retellApiKey,
        });
        cekuraAgentId = cekuraAgent.id;
      }

      // Step 2: Create evaluators
      const scenarios = buildDefaultEvaluators(agent_name, business_name || agent_name);
      const evaluatorIds: number[] = [];

      for (const scenario of scenarios) {
        try {
          const evaluator = await cekuraRequest('/scenarios/', 'POST', {
            agent: cekuraAgentId,
            name: scenario.name,
            instructions: scenario.instructions,
            expected_outcome_prompt: scenario.expected_outcome_prompt,
          });
          evaluatorIds.push(evaluator.id);
        } catch (err) {
          console.error(`Failed to create evaluator "${scenario.name}":`, err);
        }
      }

      if (evaluatorIds.length === 0) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create any test scenarios' }),
        };
      }

      // Step 3: Run the tests
      const testResult = await cekuraRequest('/scenarios/run_scenarios/', 'POST', {
        agent_id: cekuraAgentId,
        scenarios: evaluatorIds,
        frequency: 1,
        name: `Post-creation test — ${agent_name}`,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          cekura_agent_id: cekuraAgentId,
          evaluators_created: evaluatorIds.length,
          result_id: testResult.id,
          status: testResult.status,
          total_runs: testResult.runs?.length || 0,
          runs: testResult.runs?.map((r: any) => ({
            id: r.id,
            status: r.status,
            scenario_name: r.scenario_name,
          })),
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action. Use: register_agent, create_evaluators, run_tests, or full_test',
      }),
    };
  } catch (error) {
    console.error('cekura-test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Cekura test operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export default withLegacyHandler(handler);
