import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { requireInternalOrMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type ResourceType =
  | 'ai_voice_minutes'
  | 'ai_chat_messages'
  | 'sms_sent'
  | 'phone_numbers'
  | 'team_members'
  | 'kb_storage_mb';

const VALID_RESOURCES: ResourceType[] = [
  'ai_voice_minutes',
  'ai_chat_messages',
  'sms_sent',
  'phone_numbers',
  'team_members',
  'kb_storage_mb',
];

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, resource_type, amount = 1, metadata = {} } = body;

    if (!user_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id is required' }) };
    }

    const auth = await requireInternalOrMatchingUser(event, user_id, headers);
    if (!auth.ok) return auth.response;

    if (!resource_type || !VALID_RESOURCES.includes(resource_type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `resource_type must be one of: ${VALID_RESOURCES.join(', ')}`,
        }),
      };
    }

    const supabase = getServiceSupabase();

    // Use the record_usage database function which checks limits
    const { data, error } = await supabase.rpc('record_usage', {
      p_user_id: user_id,
      p_resource_type: resource_type,
      p_amount: amount,
      p_metadata: metadata,
    });

    if (error) {
      console.error('record_usage RPC error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to record usage', details: error.message }),
      };
    }

    const result = data as { success: boolean; error?: string; log_id?: string };

    if (!result.success) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: result.error || 'Usage limit reached',
          limit_reached: true,
          resource_type,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        log_id: result.log_id,
        resource_type,
        amount,
      }),
    };
  } catch (error) {
    console.error('record-usage error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export default withLegacyHandler(handler);
