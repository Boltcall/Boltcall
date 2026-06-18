import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'token parameter required' }) };
  }

  // Basic token format validation (hex string, 32 chars)
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid token format' }) };
  }

  if (!supabaseKey) {
    console.error('embed-config: Missing SUPABASE_SERVICE_KEY');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('business_features')
      .select('workspace_id, voice_agent_enabled, speed_to_lead_enabled, chatbot_enabled, reminders_enabled, lead_reactivation_enabled, reputation_manager_enabled, voice_agent_config, speed_to_lead_config, chatbot_config, reminders_config, lead_reactivation_config, reputation_manager_config')
      .eq('embed_token', token)
      .single();

    if (error) {
      // PGRST116 = no rows found (invalid token)
      if (error.code === 'PGRST116') {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invalid token' }) };
      }
      console.error('embed-config Supabase error:', error.code, error.message);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Database unavailable. Please try again.' }),
      };
    }

    if (!data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Only return enabled features and their configs
    const config: Record<string, any> = {
      workspace_id: data.workspace_id,
    };

    if (data.chatbot_enabled) {
      config.chatbot = data.chatbot_config || {};
    }
    if (data.speed_to_lead_enabled) {
      config.speed_to_lead = data.speed_to_lead_config || {};
    }
    if (data.reputation_manager_enabled) {
      config.reputation = data.reputation_manager_config || {};
    }

    return { statusCode: 200, headers, body: JSON.stringify(config) };
  } catch (err) {
    console.error('embed-config unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export default withLegacyHandler(handler);
