import { beforeEach, describe, expect, it, vi } from 'vitest';

const agentRetrieveMock = vi.hoisted(() => vi.fn());
const callListMock = vi.hoisted(() => vi.fn());
const phoneNumberRetrieveMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('retell-sdk', () => ({
  default: vi.fn(function RetellMock(this: any) {
    this.agent = { retrieve: agentRetrieveMock };
    this.call = { list: callListMock };
    this.phoneNumber = { retrieve: phoneNumberRetrieveMock };
  }),
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

function event(headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: '{}',
    queryStringParameters: null,
  } as any;
}

function createThenable<T>(value: T) {
  return {
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
}

function queryChain(finalValue?: unknown, maybeSingleValue?: unknown) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => maybeSingleValue),
    then: createThenable(finalValue).then,
  };
  return query;
}

function supabaseMock(args: {
  agentRow?: Record<string, unknown> | null;
  phoneRows?: Array<Record<string, unknown>>;
  agentError?: { message: string } | null;
  phoneError?: { message: string } | null;
} = {}) {
  const agentQuery = queryChain(undefined, {
    data: args.agentRow ?? {
      id: 'agent-row-id',
      user_id: 'user-id',
      workspace_id: null,
      name: 'Rapid Rooter QA AI Receptionist',
      agent_type: 'inbound',
      status: 'active',
      retell_agent_id: 'agent_35968112e79b86e897ef99bccc',
    },
    error: args.agentError ?? null,
  });
  const phoneQuery = queryChain({
    data: args.phoneRows ?? [{
      id: 'phone-id',
      status: 'active',
      is_active: true,
      phone_number: '+13613044585',
    }],
    error: args.phoneError ?? null,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === 'agents') return agentQuery;
      if (table === 'phone_numbers') return phoneQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('retell-readiness', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('RETELL_API_KEY', 'retell-api-secret');
    vi.stubEnv('RETELL_PHASE_E_AGENT_ID', '');
    vi.stubEnv('RETELL_PHASE_E_EXPECTED_AGENT_NAME', '');
    agentRetrieveMock.mockResolvedValue({
      agent_id: 'agent_35968112e79b86e897ef99bccc',
      agent_name: 'Rapid Rooter QA AI Receptionist',
      response_engine: { type: 'custom-llm' },
      is_published: true,
    });
    callListMock.mockResolvedValue({ calls: [] });
    phoneNumberRetrieveMock.mockResolvedValue({
      phone_number: '+13613044585',
      inbound_agents: [{
        agent_id: 'agent_35968112e79b86e897ef99bccc',
        weight: 1,
      }],
    });
    getServiceSupabaseMock.mockReturnValue(supabaseMock());
  });

  it('requires the internal secret before touching Retell or Supabase', async () => {
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(agentRetrieveMock).not.toHaveBeenCalled();
    expect(callListMock).not.toHaveBeenCalled();
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
  });

  it('fails closed when the Retell API key is missing', async () => {
    vi.stubEnv('RETELL_API_KEY', '');
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(500);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'retell_api_readiness',
      hasApiKey: false,
    });
    expect(agentRetrieveMock).not.toHaveBeenCalled();
  });

  it('passes only when Retell and Boltcall runtime wiring are both ready', async () => {
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual({
      status: 'passed',
      check: 'retell_api_readiness',
      hasApiKey: true,
      agentId: 'agent_35968112e79b86e897ef99bccc',
      retellAgentFound: true,
      retellAgentNameMatches: true,
      retellResponseEngineType: 'custom-llm',
      retellAgentPublished: true,
      callListReachable: true,
      latestCallCountChecked: 0,
      boltcallAgentFound: true,
      boltcallAgentActive: true,
      boltcallAgentType: 'inbound',
      hasActiveBoltcallPhoneNumber: true,
      activeBoltcallPhoneNumberCount: 1,
      retellInboundPhoneNumberBoundToAgent: true,
      retellInboundPhoneNumbersChecked: ['+13613044585'],
    });
    expect(JSON.stringify(body)).not.toContain('retell-api-secret');
  });

  it('does not pass when Boltcall has no active phone number for the Retell agent owner', async () => {
    getServiceSupabaseMock.mockReturnValue(supabaseMock({ phoneRows: [] }));
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(424);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'retell_api_readiness',
      hasActiveBoltcallPhoneNumber: false,
      activeBoltcallPhoneNumberCount: 0,
    });
  });

  it('does not pass when no active Retell phone number is bound inbound to the agent', async () => {
    phoneNumberRetrieveMock.mockResolvedValue({
      phone_number: '+13613044585',
      inbound_agents: [{
        agent_id: 'agent_different',
        weight: 1,
      }],
    });
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(424);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'retell_api_readiness',
      retellInboundPhoneNumberBoundToAgent: false,
      retellInboundPhoneNumbersChecked: ['+13613044585'],
    });
    expect(body.failedChecks).toContain('retell_inbound_phone_number_not_bound');
  });

  it('does not pass when the Retell agent is not published', async () => {
    agentRetrieveMock.mockResolvedValue({
      agent_id: 'agent_35968112e79b86e897ef99bccc',
      agent_name: 'Rapid Rooter QA AI Receptionist',
      response_engine: { type: 'custom-llm' },
      is_published: false,
    });
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(424);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'retell_api_readiness',
      retellAgentPublished: false,
      failedChecks: ['retell_agent_unpublished'],
    });
  });

  it('returns a sanitized failure when Retell rejects the API request', async () => {
    agentRetrieveMock.mockRejectedValue(new Error('Retell auth failed: 401 invalid_api_key'));
    const { testHandler: handler } = await import('../retell-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(502);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'retell_api_readiness',
      hasApiKey: true,
      error: 'Retell auth failed: 401 invalid_api_key',
    });
    expect(JSON.stringify(body)).not.toContain('retell-api-secret');
  });
});
