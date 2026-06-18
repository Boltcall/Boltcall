import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-support-tickets — founder-only support inbox API.
 *
 * GET lists recent support escalations created by the V2 help assistant.
 * PATCH updates a ticket's workflow status so support can mark ownership and
 * close the loop. Customers never call this endpoint directly.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';

const VALID_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);
const DEFAULT_STATUSES = ['open', 'in_progress'];

interface FounderAuth {
  userId: string;
  email: string | null;
}

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function requireFounder(event: Parameters<Handler>[0], supa: any): Promise<FounderAuth | null> {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'founder') return null;

  return { userId: data.user.id, email: data.user.email ?? null };
}

function parseStatuses(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_STATUSES;
  const statuses = raw
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean)
    .filter((status) => VALID_STATUSES.has(status));
  return statuses.length > 0 ? statuses : DEFAULT_STATUSES;
}

function ticketSelect() {
  return [
    'id',
    'workspace_id',
    'workspace_name',
    'user_id',
    'user_email',
    'status',
    'priority',
    'source',
    'current_page',
    'recent_action',
    'question',
    'answer_preview',
    'diagnostics_snapshot',
    'metadata',
    'assigned_to',
    'resolved_at',
    'created_at',
    'updated_at',
  ].join(', ');
}

interface SupportTicketSummary {
  total: number;
  urgent: number;
  high: number;
  normal: number;
}

function counts(tickets: Array<Record<string, unknown>>): SupportTicketSummary {
  return tickets.reduce(
    (acc: SupportTicketSummary, ticket) => {
      acc.total += 1;
      const priority = String(ticket.priority || 'normal');
      if (priority === 'urgent') acc.urgent += 1;
      else if (priority === 'high') acc.high += 1;
      else acc.normal += 1;
      return acc;
    },
    { total: 0, urgent: 0, high: 0, normal: 0 },
  );
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(getRequestOrigin(event.headers as Record<string, string>), {
    methods: 'GET, PATCH',
  });
  const cors = {
    ...v2cors.headers,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return json(cors, 403, { error: 'Origin not allowed' });
  }
  if (!['GET', 'PATCH'].includes(event.httpMethod)) {
    return json(cors, 405, { error: 'Method not allowed' });
  }

  const supa = getServiceSupabase();
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const founder = await requireFounder(event, supa);
  if (!founder) {
    return json(cors, authHeader ? 403 : 401, {
      error: authHeader ? 'Founder only' : 'Authentication required',
    });
  }

  if (event.httpMethod === 'GET') {
    const statuses = parseStatuses(event.queryStringParameters?.status);
    const limit = Math.max(
      1,
      Math.min(100, Number(event.queryStringParameters?.limit || '50') || 50),
    );
    const { data, error } = await supa
      .from('saas_v2_support_tickets')
      .select(ticketSelect())
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`[saas-v2-support-tickets] list failed err=${error.message}`);
      return json(cors, 500, { error: 'Failed to load support tickets' });
    }

    const tickets: Array<Record<string, unknown>> = Array.isArray(data)
      ? (data as unknown as Array<Record<string, unknown>>)
      : [];
    return json(cors, 200, { tickets, counts: counts(tickets), statuses });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return json(cors, 400, { error: 'Invalid JSON body' });
  }

  const ticketId = typeof body.ticket_id === 'string' ? body.ticket_id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const assignedTo = typeof body.assigned_to === 'string' ? body.assigned_to.trim() : '';

  if (!ticketId) return json(cors, 400, { error: 'Body must include ticket_id' });
  if (status && !VALID_STATUSES.has(status)) return json(cors, 400, { error: 'Invalid status' });
  if (!status && !assignedTo) {
    return json(cors, 400, { error: 'Body must include status or assigned_to' });
  }

  const patch: Record<string, unknown> = {};
  if (status) {
    patch.status = status;
    patch.resolved_at = status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;
  }
  if (assignedTo) patch.assigned_to = assignedTo;

  const { data, error } = await supa
    .from('saas_v2_support_tickets')
    .update(patch)
    .eq('id', ticketId)
    .select(ticketSelect())
    .single();

  if (error) {
    console.warn(
      `[saas-v2-support-tickets] update failed founder=${founder.userId} ticket=${ticketId} err=${error.message}`,
    );
    return json(cors, 500, { error: 'Failed to update support ticket' });
  }

  return json(cors, 200, { ticket: data });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
