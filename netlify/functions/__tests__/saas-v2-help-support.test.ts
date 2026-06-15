import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  chatCompletion: vi.fn(),
  generateEmbedding: vi.fn(),
  getServiceSupabase: vi.fn(),
  notifyInfo: vi.fn(),
  emitAgencyEvent: vi.fn(),
}));

vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: mocks.chatCompletion,
  generateEmbedding: mocks.generateEmbedding,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

vi.mock('../_shared/notify', () => ({
  notifyInfo: mocks.notifyInfo,
}));

vi.mock('../_shared/emit-agency-event', () => ({
  emitAgencyEvent: mocks.emitAgencyEvent,
}));

function makeEvent(question: string) {
  return {
    httpMethod: 'POST',
    headers: {
      origin: 'https://boltcall.org',
      authorization: 'Bearer test-jwt',
    },
    body: JSON.stringify({
      question,
      context: { current_page: '/v2/help' },
    }),
  } as any;
}

function chain(result: unknown, onInsert?: (payload: unknown) => void) {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    limit: vi.fn(() => q),
    order: vi.fn(() => q),
    insert: vi.fn((payload: unknown) => {
      onInsert?.(payload);
      return q;
    }),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return q;
}

function makeSupabase(overrides: Record<string, unknown> = {}) {
  const supportTicketInserts: unknown[] = [];
  const defaults: Record<string, unknown> = {
    workspaces: {
      data: {
        id: 'workspace-1',
        name: 'Blue Star HVAC',
        default_language: 'en',
        default_timezone: 'America/New_York',
      },
      error: null,
    },
    agency_clients: { data: null, error: null },
    business_profiles: {
      data: {
        business_name: 'Blue Star HVAC',
        main_category: 'HVAC',
        owner_name: 'Noam',
        website_url: 'https://bluestar.example',
      },
      error: null,
    },
    agents: {
      data: [
        {
          id: 'agent-1',
          name: 'Main Speed-to-Lead Agent',
          status: 'active',
          agent_type: 'speed_to_lead',
          retell_agent_id: 'retell-agent-1',
          updated_at: '2026-06-14T08:00:00Z',
        },
      ],
      error: null,
    },
    phone_numbers: {
      data: [
        {
          phone_number: '+13613044585',
          status: 'active',
          phone_type: 'main',
          assigned_agent_id: 'agent-1',
          created_at: '2026-06-14T08:00:00Z',
        },
      ],
      error: null,
    },
    leads: {
      data: [
        {
          id: 'lead-1',
          name: 'Pat Customer',
          source: 'google_lead_form',
          status: 'new',
          created_at: '2026-06-14T08:30:00Z',
        },
      ],
      error: null,
    },
    scheduled_messages: {
      data: [
        {
          channel: 'sms',
          type: 'followup',
          status: 'scheduled',
          scheduled_for: '2026-06-14T09:00:00Z',
        },
      ],
      error: null,
    },
    facebook_page_connections: { data: [], error: null },
    saas_v2_support_tickets: { data: { id: 'ticket-1' }, error: null },
  };
  const tableResults = { ...defaults, ...overrides };

  return {
    supportTicketInserts,
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-1', email: 'owner@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      return chain(
        tableResults[table] || { data: null, error: null },
        table === 'saas_v2_support_tickets'
          ? (payload) => supportTicketInserts.push(payload)
          : undefined,
      );
    }),
    rpc: vi.fn(async () => ({ data: [], error: null })),
  };
}

describe('saas-v2-help-ask support escalation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.chatCompletion.mockResolvedValue('Check the failed calls doc first. If calls are still failing, support can help you trace the phone routing.');
    mocks.generateEmbedding.mockResolvedValue(null);
    mocks.notifyInfo.mockResolvedValue(undefined);
    mocks.emitAgencyEvent.mockResolvedValue(undefined);
    mocks.getServiceSupabase.mockReturnValue(makeSupabase());
  });

  it('keeps routine help questions self-serve', async () => {
    const { handler } = await import('../saas-v2-help-ask');

    const res = await handler(makeEvent('How do I add a phone number?'), {} as any);
    const body = JSON.parse(res.body || '{}');

    expect(res.statusCode).toBe(200);
    expect(body.support?.escalated).toBe(false);
    expect(mocks.notifyInfo).not.toHaveBeenCalled();
  });

  it('returns current public docs sources for common customer questions', async () => {
    const { handler } = await import('../saas-v2-help-ask');

    const phoneRes = await handler(makeEvent('How do I add a phone number?'), {} as any);
    const phoneBody = JSON.parse(phoneRes.body || '{}');
    expect(phoneBody.sources[0]).toEqual(expect.objectContaining({
      title: 'Phone numbers',
      url: 'https://boltcall.mintlify.app/dashboard/phone-numbers',
    }));

    const billingRes = await handler(makeEvent('How does billing and my plan work?'), {} as any);
    const billingBody = JSON.parse(billingRes.body || '{}');
    expect(billingBody.sources[0]).toEqual(expect.objectContaining({
      title: 'Plans and billing',
      url: 'https://boltcall.mintlify.app/account/plans',
    }));

    const webhookRes = await handler(makeEvent('How do I connect Google Ads lead forms by webhook?'), {} as any);
    const webhookBody = JSON.parse(webhookRes.body || '{}');
    expect(webhookBody.sources[0]).toEqual(expect.objectContaining({
      title: 'Webhooks',
      url: 'https://boltcall.mintlify.app/integrations/webhooks',
    }));
  });

  it('alerts internal support when the customer asks for urgent human help', async () => {
    const supabase = makeSupabase();
    mocks.getServiceSupabase.mockReturnValue(supabase);
    const { handler } = await import('../saas-v2-help-ask');

    const res = await handler(
      makeEvent('Urgent: calls are broken and I need a human to help me now.'),
      {} as any,
    );
    const body = JSON.parse(res.body || '{}');

    expect(res.statusCode).toBe(200);
    expect(body.support).toEqual(expect.objectContaining({
      escalated: true,
      channel: 'internal_support',
    }));
    expect(body.support.message).toContain('support');
    expect(body.support.ticket_id).toBe('ticket-1');
    expect(supabase.supportTicketInserts).toHaveLength(1);
    expect(supabase.supportTicketInserts[0]).toEqual(expect.objectContaining({
      workspace_id: 'workspace-1',
      user_id: 'user-1',
      user_email: 'owner@example.com',
      status: 'open',
      priority: 'urgent',
      source: 'v2_help',
      current_page: '/v2/help',
    }));
    expect(supabase.supportTicketInserts[0]).toEqual(expect.objectContaining({
      question: expect.stringContaining('calls are broken'),
      answer_preview: expect.stringContaining('Check the failed calls doc first'),
      diagnostics_snapshot: expect.stringContaining('Main Speed-to-Lead Agent'),
    }));
    expect(mocks.notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Support escalation'));
    expect(mocks.notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Blue Star HVAC'));
    expect(mocks.notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Ticket: ticket-1'));
  });

  it('adds a live workspace diagnostic snapshot to the support prompt', async () => {
    const { handler } = await import('../saas-v2-help-ask');

    await handler(makeEvent('Why are calls failing for my phone number?'), {} as any);

    const userPrompt = mocks.chatCompletion.mock.calls[0][1] as string;
    expect(userPrompt).toContain('WORKSPACE DIAGNOSTICS:');
    expect(userPrompt).toContain('Business: Blue Star HVAC');
    expect(userPrompt).toContain('Agents: 1');
    expect(userPrompt).toContain('Main Speed-to-Lead Agent');
    expect(userPrompt).toContain('Phone numbers: 1');
    expect(userPrompt).toContain('+13613044585');
    expect(userPrompt).toContain('Recent leads: 1');
    expect(userPrompt).toContain('google_lead_form');
  });
});
