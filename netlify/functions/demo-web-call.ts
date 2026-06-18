import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getServiceSupabase } from './_shared/token-utils';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { withLegacyHandler } from './_shared/runtime-compat';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const retellApiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_DEMO_AGENT_ID;

  if (!retellApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RETELL_API_KEY not configured' }) };
  }
  if (!agentId) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RETELL_DEMO_AGENT_ID not configured — create the demo agent in Retell first' }) };
  }
  let demo_id: string;
  let mode: 'preview' | 'start';
  try {
    const body = JSON.parse(event.body || '{}');
    demo_id = body.demo_id;
    mode = body.mode === 'preview' ? 'preview' : 'start';
    if (!demo_id || !UUID_RE.test(demo_id)) throw new Error('invalid demo_id');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'valid demo_id required in request body' }) };
  }

  const supabase = getServiceSupabase();

  const { data: session, error: fetchError } = await supabase
    .from('demo_sessions')
    .select('id, business_name, niche, services, location, prospect_name, web_call_started_at, web_call_count')
    .eq('id', demo_id)
    .single();

  if (fetchError || !session) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Demo session not found' }) };
  }

  if (mode === 'preview') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        business_name: session.business_name,
        already_started: !!session.web_call_started_at,
      }),
    };
  }

  if (session.web_call_started_at || (session.web_call_count || 0) >= 1) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'This demo call has already been started' }),
    };
  }

  const now = new Date().toISOString();
  const { data: reserved, error: reserveError } = await supabase
    .from('demo_sessions')
    .update({
      clicked_at: now,
      web_call_started_at: now,
      web_call_count: (session.web_call_count || 0) + 1,
    })
    .eq('id', demo_id)
    .is('web_call_started_at', null)
    .select('id')
    .single();

  if (reserveError || !reserved) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'This demo call has already been started' }),
    };
  }

  const client = new Retell({ apiKey: retellApiKey });

  try {
    const webCall = await (client.call as any).createWebCall({
      agent_id: agentId,
      retell_llm_dynamic_variables: {
        business_name: session.business_name,
        niche: session.niche || 'local service business',
        location: session.location || '',
        services_list: session.services || 'our services',
      },
      metadata: {
        demo_id,
        prospect_name: session.prospect_name || '',
        source: 'facebook-dm-demo',
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: webCall.access_token,
        call_id: webCall.call_id,
        business_name: session.business_name,
      }),
    };
  } catch (err: any) {
    console.error('Failed to create demo web call:', err);
    await supabase
      .from('demo_sessions')
      .update({ web_call_started_at: null })
      .eq('id', demo_id);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Failed to create call' }),
    };
  }
};

export { handler };

export default withLegacyHandler(handler);
