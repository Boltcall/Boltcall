/**
 * V2 conversational setup wizard — resume endpoint.
 *
 * GET ?conversation_id=... → { conversation, extracted, wizard_step, conversation_id }
 *
 * Returns the persisted state so the client can rehydrate after a page refresh
 * or device switch. workspace_id is derived from the JWT; conversation_id from
 * the query string is used to confirm we're loading the right session (defense
 * in depth — even though one user has one workspace, this avoids cross-tab
 * race conditions where two tabs spawn two conversation IDs).
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';

interface WizardStatePayload {
  conversation: Array<{ role: string; content: string; ts: string }>;
  extracted: Record<string, unknown>;
  wizard_step: string;
}

export const handler: Handler = async (event) => {
  const cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string>), { methods: 'GET' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Defense-in-depth: if Origin header was set but didn't match the allowlist,
  // refuse. Same-origin requests (from boltcall.org pages) typically include
  // an Origin; tools like curl don't. We only block when Origin is present
  // and unrecognized — otherwise legitimate server-to-server callers still work.
  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  if (requestOrigin && !cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing bearer token' }) };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const userId = userResult.user.id;

  // Resolve workspace via user_id then owner_id (compat with both schemas).
  let { data: ws } = await supa
    .from('workspaces')
    .select('id, v2_setup_state, v2_setup_state_version, v2_setup_conversation_id, v2_setup_status, v2_setup_started_at, v2_setup_completed_at')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (!ws) {
    const r = await supa
      .from('workspaces')
      .select('id, v2_setup_state, v2_setup_state_version, v2_setup_conversation_id, v2_setup_status, v2_setup_started_at, v2_setup_completed_at')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    ws = r.data || null;
  }

  if (!ws) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No workspace found' }),
    };
  }

  const queryConvoId = event.queryStringParameters?.conversation_id;
  const state = (ws.v2_setup_state || null) as WizardStatePayload | null;

  // If the client asked for a specific conversation_id and we have a different one,
  // treat as a fresh session (state=null). Otherwise return what we have.
  if (queryConvoId && ws.v2_setup_conversation_id && queryConvoId !== ws.v2_setup_conversation_id) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversation_id: null,
        conversation: [],
        extracted: {},
        wizard_step: 'intake',
        status: 'not_started',
        state_version: 0,
        message: 'Requested conversation_id does not match the active session.',
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      conversation_id: ws.v2_setup_conversation_id || null,
      conversation: state?.conversation || [],
      extracted: state?.extracted || {},
      wizard_step: state?.wizard_step || 'intake',
      status: ws.v2_setup_status || 'not_started',
      state_version: (ws.v2_setup_state_version as number | null) ?? 0,
      started_at: ws.v2_setup_started_at || null,
      completed_at: ws.v2_setup_completed_at || null,
    }),
  };
};
