import { Handler } from '@netlify/functions';
import { requireAuth, getUserAgentIds } from './_shared/require-auth';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  const supabase = getSupabase();
  const userAgentIds = await getUserAgentIds(userId);
  const ownedSet = new Set(userAgentIds);

  try {
    // GET /qa-rubrics?agent_id=xxx — list rubrics for an agent
    if (event.httpMethod === 'GET') {
      const agentId = event.queryStringParameters?.agent_id;
      if (!agentId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agent_id is required' }) };
      }
      if (!ownedSet.has(agentId)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Agent not found' }) };
      }
      const { data, error } = await supabase
        .from('qa_rubrics')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action } = body;

      // create
      if (action === 'create') {
        const { agentId, name, description, criteria } = body;
        if (!agentId || !name) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId and name are required' }) };
        }
        if (!ownedSet.has(agentId)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Agent not found' }) };
        }
        const { data, error } = await supabase
          .from('qa_rubrics')
          .insert({ user_id: userId, agent_id: agentId, name, description: description || null, criteria: criteria || [] })
          .select()
          .single();
        if (error) throw error;
        return { statusCode: 201, headers, body: JSON.stringify(data) };
      }

      // update
      if (action === 'update') {
        const { rubricId, name, description, criteria, is_active } = body;
        if (!rubricId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'rubricId is required' }) };
        }
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (criteria !== undefined) updates.criteria = criteria;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabase
          .from('qa_rubrics')
          .update(updates)
          .eq('id', rubricId)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Rubric not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      // delete
      if (action === 'delete') {
        const { rubricId } = body;
        if (!rubricId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'rubricId is required' }) };
        }
        const { error } = await supabase
          .from('qa_rubrics')
          .delete()
          .eq('id', rubricId)
          .eq('user_id', userId);
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: create, update, delete' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('[qa-rubrics] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
