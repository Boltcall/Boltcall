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
    maybeSingle: vi.fn(async () => result),
  };
  return q;
}

function makeSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-1', email: 'owner@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workspaces') {
        return chain({
          data: {
            id: 'workspace-1',
            name: 'Blue Star HVAC',
            default_language: 'en',
            default_timezone: 'America/New_York',
          },
          error: null,
        });
      }
      if (table === 'agency_clients') {
        return chain({ data: null, error: null });
      }
      return chain({ data: null, error: null });
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
});
