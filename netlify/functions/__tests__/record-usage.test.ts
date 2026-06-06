import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockRpc = vi.fn();
const mockSupabase = {
  rpc: mockRpc,
};

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
  getServiceSupabase: () => mockSupabase,
}));

vi.mock('../_shared/user-auth', () => ({
  requireInternalOrMatchingUser: vi.fn(async (_event, userId, headers) => (
    userId
      ? { ok: true, user: null, userId }
      : {
          ok: false,
          response: {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId is required' }),
          },
        }
  )),
}));

import { handler } from '../record-usage';

function makeEvent(overrides: any = {}) {
  const { body, ...rest } = overrides;
  return {
    httpMethod: rest.httpMethod || 'POST',
    headers: rest.headers || {},
    queryStringParameters: rest.queryStringParameters || null,
    body: body !== undefined ? JSON.stringify(body) : null,
    ...rest,
  } as any;
}

describe('record-usage function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for OPTIONS (CORS preflight)', async () => {
    const res = await handler(makeEvent({ httpMethod: 'OPTIONS' }), {} as any);
    expect(res!.statusCode).toBe(200);
  });

  it('returns 405 for non-POST methods', async () => {
    const res = await handler(makeEvent({ httpMethod: 'GET' }), {} as any);
    expect(res!.statusCode).toBe(405);
  });

  it('returns 400 if user_id missing', async () => {
    const res = await handler(makeEvent({ body: { resource_type: 'sms_sent' } }), {} as any);
    expect(res!.statusCode).toBe(400);
    expect(JSON.parse(res!.body!)).toHaveProperty('error', 'user_id is required');
  });

  it('returns 400 for invalid resource_type', async () => {
    const res = await handler(
      makeEvent({ body: { user_id: 'u1', resource_type: 'fake_resource' } }),
      {} as any
    );
    expect(res!.statusCode).toBe(400);
    expect(JSON.parse(res!.body!).error).toContain('resource_type must be one of');
  });

  it('returns 200 on successful usage recording', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, log_id: 'log-1' }, error: null });

    const res = await handler(
      makeEvent({ body: { user_id: 'u1', resource_type: 'sms_sent', amount: 1 } }),
      {} as any
    );
    expect(res!.statusCode).toBe(200);
    const body = JSON.parse(res!.body!);
    expect(body.success).toBe(true);
    expect(body.resource_type).toBe('sms_sent');
  });

  it('returns 429 when usage limit reached', async () => {
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'Usage limit reached' },
      error: null,
    });

    const res = await handler(
      makeEvent({ body: { user_id: 'u1', resource_type: 'sms_sent', amount: 1 } }),
      {} as any
    );
    expect(res!.statusCode).toBe(429);
    expect(JSON.parse(res!.body!).limit_reached).toBe(true);
  });

  it('returns 500 on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB down' } });

    const res = await handler(
      makeEvent({ body: { user_id: 'u1', resource_type: 'ai_voice_minutes' } }),
      {} as any
    );
    expect(res!.statusCode).toBe(500);
  });

  it('passes correct params to RPC', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, log_id: 'x' }, error: null });

    await handler(
      makeEvent({
        body: {
          user_id: 'user-123',
          resource_type: 'ai_chat_messages',
          amount: 5,
          metadata: { source: 'widget' },
        },
      }),
      {} as any
    );

    expect(mockRpc).toHaveBeenCalledWith('record_usage', {
      p_user_id: 'user-123',
      p_resource_type: 'ai_chat_messages',
      p_amount: 5,
      p_metadata: { source: 'widget' },
    });
  });

  it('defaults amount to 1', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, log_id: 'x' }, error: null });

    await handler(
      makeEvent({ body: { user_id: 'u1', resource_type: 'sms_sent' } }),
      {} as any
    );

    expect(mockRpc).toHaveBeenCalledWith('record_usage', expect.objectContaining({
      p_amount: 1,
    }));
  });
});
