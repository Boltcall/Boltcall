import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { requireAuth, getUserAgentIds } from './_shared/require-auth';
import {
  buildRetellAgentFilter,
  buildRetellEnumInFilter,
  buildRetellStartTimestampFilter,
  normalizeRetellCallList,
} from './_shared/retell-call-list';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ── Auth gate — required, never optional ──
  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;

  const userAgentIds = await getUserAgentIds(auth.userId);
  // If the user has no Retell agents at all, return an empty list rather than
  // leaking the org-wide call history. Same pattern for single-call retrieve.
  if (userAgentIds.length === 0) {
    if (event.httpMethod === 'GET' || event.httpMethod === 'POST') {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Retell API key not configured' }),
    };
  }

  const client = new Retell({ apiKey });
  const ownedSet = new Set(userAgentIds);

  try {
    // GET /retell-calls?call_id=xxx — get single call details (only if owned)
    if (event.httpMethod === 'GET') {
      const callId = event.queryStringParameters?.call_id;
      if (callId) {
        const call = await client.call.retrieve(callId);
        if (!ownedSet.has((call as any).agent_id)) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(call) };
      }

      // GET /retell-calls — list calls scoped to user's agents
      const calls = await client.call.list({
        filter_criteria: { agent: buildRetellAgentFilter(userAgentIds) },
        sort_order: 'descending',
        limit: 50,
      } as unknown as Parameters<typeof client.call.list>[0]);
      return { statusCode: 200, headers, body: JSON.stringify(normalizeRetellCallList(calls)) };
    }

    // POST /retell-calls — list calls with filters
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // If caller passes explicit agent_ids, intersect with owned set —
      // never let a request widen scope beyond the user's agents.
      let scopedAgentIds: string[] = userAgentIds;
      if (body.agent_ids?.length) {
        scopedAgentIds = body.agent_ids.filter((id: string) => ownedSet.has(id));
        if (scopedAgentIds.length === 0) {
          return { statusCode: 200, headers, body: JSON.stringify([]) };
        }
      }

      const filterCriteria: Record<string, any> = {
        agent: buildRetellAgentFilter(scopedAgentIds),
      };
      const callStatusFilter = buildRetellEnumInFilter(body.call_status);
      if (callStatusFilter) filterCriteria.call_status = callStatusFilter;
      const directionFilter = buildRetellEnumInFilter(body.direction);
      if (directionFilter) filterCriteria.direction = directionFilter;
      if (body.start_date || body.end_date) {
        filterCriteria.start_timestamp = buildRetellStartTimestampFilter({
          lower: body.start_date ? new Date(body.start_date).getTime() : undefined,
          upper: body.end_date ? new Date(body.end_date).getTime() : undefined,
        });
      }

      const calls = await client.call.list({
        filter_criteria: filterCriteria,
        sort_order: body.sort_order || 'descending',
        limit: body.limit || 50,
        pagination_key: body.pagination_key,
      });

      return { statusCode: 200, headers, body: JSON.stringify(normalizeRetellCallList(calls)) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('retell-calls error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch calls',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export default withLegacyHandler(handler);
