import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { randomUUID, createHash } from 'crypto';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Server-side allowlist of API-key permissions. Adding new capabilities
 * requires an explicit addition here — otherwise the client cannot mint a
 * key with a permission the server doesn't understand, which used to be
 * possible because the previous version accepted any string[] the caller
 * sent.
 */
const ALLOWED_PERMISSIONS = new Set<string>([
  'read:agents',
  'write:agents',
  'read:calls',
  'read:kb',
  'write:kb',
  'read:workspace',
  'write:workspace',
  'read:leads',
  'write:leads',
  'read:webhooks',
  'write:webhooks',
]);

/**
 * Resolve which tenant ("workspace_id" in this subsystem is the raw owning
 * account's user id, not workspaces.id — see teamStore.ts) an api_keys action
 * targets, and confirm the caller has owner/admin authority there. Defaults to
 * the caller's own id, which is the only path the app wires up today, so a
 * solo owner is unaffected; this guards the case where a workspaceId is ever
 * supplied for someone else's tenant so a mere 'member' can't mint or revoke
 * that workspace's API keys.
 */
async function resolveAuthorizedWorkspaceId(requestedWorkspaceId: unknown, callerId: string): Promise<string | null> {
  const workspaceId = typeof requestedWorkspaceId === 'string' && requestedWorkspaceId ? requestedWorkspaceId : callerId;
  if (workspaceId === callerId) return workspaceId;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', callerId)
    .eq('status', 'active')
    .maybeSingle();

  if (membership && (membership.role === 'owner' || membership.role === 'admin')) return workspaceId;
  return null;
}

function sanitizePermissions(input: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (input == null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false, error: 'permissions must be an array' };
  const cleaned: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') return { ok: false, error: 'permissions must be strings' };
    const trimmed = raw.trim();
    if (!ALLOWED_PERMISSIONS.has(trimmed)) {
      return { ok: false, error: `unknown permission "${trimmed}"` };
    }
    cleaned.push(trimmed);
  }
  return { ok: true, value: Array.from(new Set(cleaned)) };
}

const handler: Handler = async (event) => {
  const cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string | undefined>), {
    methods: 'POST, DELETE',
  }).headers;

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
        const { name, permissions, expiresAt, workspaceId: requestedWorkspaceId } = body;
        if (!name) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'name required' }) };
        }

        const workspaceId = await resolveAuthorizedWorkspaceId(requestedWorkspaceId, user.id);
        if (!workspaceId) {
          return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Only workspace owners and admins can create API keys' }) };
        }

        const sanitized = sanitizePermissions(permissions);
        if (!sanitized.ok) {
          return {
            statusCode: 400,
            headers: cors,
            body: JSON.stringify({ error: sanitized.error }),
          };
        }

        const rawKey = `bc_${randomUUID().replace(/-/g, '')}`;
        const keyPrefix = rawKey.substring(0, 11);
        const keyHash = hashKey(rawKey);

        const { error } = await supabase.from('api_keys').insert({
          workspace_id: workspaceId,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          permissions: sanitized.value,
          status: 'active',
          expires_at: expiresAt || null,
          created_by: user.id,
          rate_limit: 60,
        });

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          workspace_id: workspaceId,
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
        const { keyId, workspaceId: requestedWorkspaceId } = body;
        if (!keyId) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'keyId required' }) };
        }

        // Resolve which tenant this key actually belongs to (falling back to the
        // caller's own id, matching legacy behavior) before checking authority —
        // a bare workspaceId from the body can't be used to target someone else's key.
        const { data: keyRow } = await supabase.from('api_keys').select('workspace_id').eq('id', keyId).maybeSingle();
        const targetWorkspaceId = keyRow?.workspace_id || requestedWorkspaceId || user.id;
        const workspaceId = await resolveAuthorizedWorkspaceId(targetWorkspaceId, user.id);
        if (!workspaceId) {
          return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Only workspace owners and admins can revoke API keys' }) };
        }

        const { error } = await supabase
          .from('api_keys')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .eq('id', keyId)
          .eq('workspace_id', workspaceId);

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          workspace_id: workspaceId,
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
