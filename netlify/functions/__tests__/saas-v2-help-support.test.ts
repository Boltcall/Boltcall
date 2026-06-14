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

function chain(result: unknown) {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    limit: vi.fn(() => q),
    order: vi.fn(() => q),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return q;
}

function makeSupabase(overrides: Record<string, unknown> = {}) {
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
  };
  const tableResults = { ...defaults, ...overrides };

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-1', email: 'owner@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      return chain(tableResults[table] || { data: null, error: null });
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

  it('alerts internal support when the customer asks for urgent human help', async () => {
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
    expect(mocks.notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Support escalation'));
    expect(mocks.notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Blue Star HVAC'));
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
