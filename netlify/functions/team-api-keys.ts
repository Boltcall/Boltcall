import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_shared/cors';
import { randomUUID, createHash } from 'crypto';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

const handler: Handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  // Validate auth
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    switch (event.httpMethod) {
      case 'POST': {
        // Create API key
        const { name, permissions, expiresAt } = body;
        if (!name) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'name required' }) };
        }

        const rawKey = `bc_${randomUUID().replace(/-/g, '')}`;
        const keyPrefix = rawKey.substring(0, 11);
        const keyHash = hashKey(rawKey);

        const { error } = await supabase.from('api_keys').insert({
          workspace_id: user.id,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          permissions: permissions || [],
          status: 'active',
          expires_at: expiresAt || null,
          created_by: user.id,
          rate_limit: 60,
        });

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          action: 'api_key_created',
          details: `Created API key "${name}"`,
          ip_address: event.headers['x-forwarded-for'] || null,
        });

        // Return full key only once
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ key: rawKey, prefix: keyPrefix }),
        };
      }

      case 'DELETE': {
        // Revoke API key
        const { keyId } = body;
        if (!keyId) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'keyId required' }) };
        }

        const { error } = await supabase
          .from('api_keys')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .eq('id', keyId)
          .eq('workspace_id', user.id);

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          action: 'api_key_revoked',
          details: `Revoked API key ${keyId}`,
          ip_address: event.headers['x-forwarded-for'] || null,
        });

        return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
