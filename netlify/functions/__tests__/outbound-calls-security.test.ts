import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPhoneCallMock = vi.hoisted(() => vi.fn());
const campaignInsertMock = vi.hoisted(() => vi.fn());
const campaignSingleMock = vi.hoisted(() => vi.fn());
const getUserAgentIdsMock = vi.hoisted(() => vi.fn());
const getUserPhoneNumbersMock = vi.hoisted(() => vi.fn());

const campaignChain = vi.hoisted(() => {
  const chain: any = {
    insert: campaignInsertMock,
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: campaignSingleMock,
  };
  campaignInsertMock.mockReturnValue(chain);
  return chain;
});

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(() => campaignChain),
}));

vi.mock('retell-sdk', () => ({
  default: vi.fn(function RetellMock(this: any) {
    this.call = {
      createPhoneCall: createPhoneCallMock,
    };
  }),
}));

vi.mock('../_shared/token-utils', () => ({
  deductTokens: vi.fn(),
  getServiceSupabase: () => supabaseMock,
  TOKEN_COSTS: { outbound_call: 25 },
}));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

vi.mock('../_shared/user-auth', () => ({
  requireMatchingUser: vi.fn(async (_event, _requestedUserId, _headers) => ({
    ok: true,
    userId: 'user-a',
  })),
}));

vi.mock('../_shared/require-auth', () => ({
  getUserAgentIds: getUserAgentIdsMock,
  getUserPhoneNumbers: getUserPhoneNumbersMock,
}));

function makePost(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

describe('outbound-calls tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    getUserAgentIdsMock.mockResolvedValue(['agent-owned']);
    getUserPhoneNumbersMock.mockResolvedValue(['+15551234567']);
    campaignSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it('rejects campaign creation with an agent outside the authenticated user tenant', async () => {
    const { handler } = await import('../outbound-calls');

    const res = await handler(
      makePost({
        action: 'create_campaign',
        userId: 'user-a',
        name: 'Borrowed agent',
        agentId: 'agent-victim',
        fromNumber: '+15551234567',
        leads: [{ phone: '+15557654321' }],
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/agentId/i);
    expect(campaignInsertMock).not.toHaveBeenCalled();
    expect(createPhoneCallMock).not.toHaveBeenCalled();
  });

  it('rejects campaign creation with a phone number outside the authenticated user tenant', async () => {
    const { handler } = await import('../outbound-calls');

    const res = await handler(
      makePost({
        action: 'create_campaign',
        userId: 'user-a',
        name: 'Borrowed number',
        agentId: 'agent-owned',
        fromNumber: '+15550000000',
        leads: [{ phone: '+15557654321' }],
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/fromNumber/i);
    expect(campaignInsertMock).not.toHaveBeenCalled();
    expect(createPhoneCallMock).not.toHaveBeenCalled();
  });

  it('revalidates stored campaign agent and phone ownership before starting calls', async () => {
    campaignSingleMock.mockResolvedValue({
      data: {
        id: 'campaign-a',
        user_id: 'user-a',
        agent_id: 'agent-victim',
        from_number: '+15551234567',
        calls_made: 0,
      },
      error: null,
    });
    const { handler } = await import('../outbound-calls');

    const res = await handler(
      makePost({
        action: 'start_campaign',
        userId: 'user-a',
        campaignId: 'campaign-a',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/agentId/i);
    expect(createPhoneCallMock).not.toHaveBeenCalled();
  });
});
