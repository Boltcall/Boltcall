/**
 * Validate a Boltcall API key (bc_...) against the api_keys table.
 * Returns the workspace_id (user ID) if valid, null otherwise.
 *
 * The bc_ key is hashed with SHA-256 and matched against key_hash in api_keys.
 * This means the raw key is never stored — only shown once at creation time.
 */

import { createHash } from 'crypto';
import { getServiceSupabase } from './token-utils';

export interface ApiKeyValidation {
  valid: boolean;
  userId: string | null;
  keyName: string | null;
  permissions: string[];
  error?: string;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Extract API key from request — checks Authorization header first, then query params.
 * Zapier sends auth fields as query params by default, but also supports headers.
 */
export function extractApiKey(
  headers: Record<string, string | undefined>,
  queryParams: Record<string, string | undefined> | null
): string | null {
  // 1. Authorization: Bearer bc_...
  const auth = headers.authorization || headers.Authorization;
  if (auth) {
    const token = auth.replace(/^Bearer\s+/i, '');
    if (token.startsWith('bc_')) return token;
  }

  // 2. Query param: ?api_key=bc_...
  if (queryParams?.api_key && queryParams.api_key.startsWith('bc_')) {
    return queryParams.api_key;
  }

  return null;
}

/**
 * Validate a bc_ API key. Returns userId (workspace_id) and key metadata if valid.
 */
export async function validateApiKey(rawKey: string): Promise<ApiKeyValidation> {
  if (!rawKey || !rawKey.startsWith('bc_')) {
    return { valid: false, userId: null, keyName: null, permissions: [], error: 'Invalid API key format' };
  }

  const keyHash = hashKey(rawKey);
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('api_keys')
    .select('workspace_id, name, permissions, status, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return { valid: false, userId: null, keyName: null, permissions: [], error: 'API key not found' };
  }

  if (data.status !== 'active') {
    return { valid: false, userId: null, keyName: null, permissions: [], error: 'API key has been revoked' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, userId: null, keyName: null, permissions: [], error: 'API key has expired' };
  }

  // Resolve the actual auth.users.id via business_profiles. For most users
  // workspace_id === user_id and this returns the same value. For workspaces
  // where they diverge (migrations, agency clients), returning workspace_id
  // would make every leads.user_id FK insert fail — hence the lookup.
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('user_id')
    .eq('workspace_id', data.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    valid: true,
    userId: profile?.user_id || data.workspace_id,
    keyName: data.name,
    permissions: data.permissions || [],
  };
}

/**
 * Convenience: extract + validate in one call. Returns userId or null.
 * Use this at the top of any handler to optionally authenticate via API key.
 * If no bc_ key is present, returns null (caller should fall back to other auth).
 */
export async function authenticateApiKey(
  headers: Record<string, string | undefined>,
  queryParams: Record<string, string | undefined> | null
): Promise<{ userId: string | null; error?: string; hasKey: boolean }> {
  const rawKey = extractApiKey(headers, queryParams);
  if (!rawKey) return { userId: null, hasKey: false };

  const result = await validateApiKey(rawKey);
  return {
    userId: result.userId,
    error: result.valid ? undefined : result.error,
    hasKey: true,
  };
}
