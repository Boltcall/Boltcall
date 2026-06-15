import crypto from 'crypto';
import type { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';

import { getServiceSupabase } from './_shared/token-utils';
import { buildRetellAgentFilter, normalizeRetellCallList } from './_shared/retell-call-list';

const DEFAULT_AGENT_ID = 'agent_35968112e79b86e897ef99bccc';
const DEFAULT_EXPECTED_AGENT_NAME = 'Rapid Rooter QA AI Receptionist';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://boltcall.org',
  'Access-Control-Allow-Headers': 'Content-Type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function requireInternalSecret(event: Parameters<Handler>[0]) {
  const expected = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
  if (!expected) return { ok: false, statusCode: 500, error: 'Internal secret is not configured' };

  const provided =
    event.headers['x-internal-secret'] ||
    event.headers['X-Internal-Secret'] ||
    '';
  if (!provided || !safeEqual(String(provided), expected)) {
    return { ok: false, statusCode: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

async function fetchBoltcallAgentEvidence(agentId: string) {
  const supabase = getServiceSupabase();
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id,user_id,workspace_id,name,agent_type,status,retell_agent_id')
    .eq('retell_agent_id', agentId)
    .limit(1)
    .maybeSingle();

  if (agentError) throw new Error(`agents query failed: ${agentError.message}`);

  let activePhoneCount = 0;
  if (agent?.user_id) {
    const { data: phoneRows, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('id,status,is_active,phone_number')
      .eq('user_id', agent.user_id)
      .eq('status', 'active')
      .limit(10);

    if (phoneError) throw new Error(`phone_numbers query failed: ${phoneError.message}`);
    activePhoneCount = Array.isArray(phoneRows)
      ? phoneRows.filter((row: Record<string, unknown>) => row.is_active !== false).length
      : 0;
  }

  return { agent, activePhoneCount };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireInternalSecret(event);
  if (!auth.ok) return json(auth.statusCode || 403, { error: auth.error || 'Forbidden' });

  const apiKey = process.env.RETELL_API_KEY || '';
  if (!apiKey) {
    return json(500, {
      status: 'failed',
      check: 'retell_api_readiness',
      hasApiKey: false,
      error: 'RETELL_API_KEY is not configured',
    });
  }

  const agentId = process.env.RETELL_PHASE_E_AGENT_ID || DEFAULT_AGENT_ID;
  const expectedAgentName = process.env.RETELL_PHASE_E_EXPECTED_AGENT_NAME || DEFAULT_EXPECTED_AGENT_NAME;

  try {
    const client = new Retell({ apiKey });
    const retellAgent = await client.agent.retrieve(agentId);
    const listResponse = await client.call.list({
      filter_criteria: {
        agent: buildRetellAgentFilter(agentId),
      },
      sort_order: 'descending',
      limit: 1,
    });
    const recentCalls = normalizeRetellCallList(listResponse);
    const { agent: boltcallAgent, activePhoneCount } = await fetchBoltcallAgentEvidence(agentId);

    const evidence = {
      hasApiKey: true,
      agentId,
      retellAgentFound: Boolean(retellAgent?.agent_id),
      retellAgentNameMatches: retellAgent?.agent_name === expectedAgentName,
      retellResponseEngineType: retellAgent?.response_engine?.type || null,
      retellAgentPublished: retellAgent?.is_published ?? null,
      callListReachable: Array.isArray(recentCalls),
      latestCallCountChecked: recentCalls.length,
      boltcallAgentFound: Boolean(boltcallAgent?.id),
      boltcallAgentActive: boltcallAgent?.status === 'active',
      boltcallAgentType: boltcallAgent?.agent_type || null,
      hasActiveBoltcallPhoneNumber: activePhoneCount > 0,
      activeBoltcallPhoneNumberCount: activePhoneCount,
    };
    const failedChecks = [
      !evidence.retellAgentFound && 'retell_agent_missing',
      !evidence.retellAgentNameMatches && 'retell_agent_name_mismatch',
      !evidence.callListReachable && 'retell_call_list_unreachable',
      !evidence.boltcallAgentFound && 'boltcall_agent_missing',
      !evidence.boltcallAgentActive && 'boltcall_agent_inactive',
      !evidence.hasActiveBoltcallPhoneNumber && 'boltcall_active_phone_number_missing',
    ].filter(Boolean);

    if (failedChecks.length > 0) {
      return json(424, {
        status: 'failed',
        check: 'retell_api_readiness',
        ...evidence,
        failedChecks,
      });
    }

    return json(200, {
      status: 'passed',
      check: 'retell_api_readiness',
      ...evidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Retell readiness error';
    return json(502, {
      status: 'failed',
      check: 'retell_api_readiness',
      hasApiKey: true,
      agentId,
      error: message,
    });
  }
};
