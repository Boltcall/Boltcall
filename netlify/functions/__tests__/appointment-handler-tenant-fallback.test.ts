import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';

// F86/F105: appointment-handler must not guess a tenant via the
// business_features "first cal_connected=true row" fallback when
// find_user_by_email errors or returns null — that misattributes a
// booking's PII to an unrelated workspace.
const rpcMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: rpcMock,
    from: fromMock,
  })),
}));

function makeCalcomEvent(secret: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', payload });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json', 'x-cal-signature-256': signature },
    body,
    queryStringParameters: null,
  } as any;
}

describe('appointment-handler cross-tenant fallback removal', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CALCOM_WEBHOOK_SECRET = 'test-calcom-secret';
    delete process.env.TELEGRAM_BOT_TOKEN;
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    });
  });

  it('returns 404 and never queries business_features when find_user_by_email errors (RPC missing in prod)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'function find_user_by_email does not exist' } });

    const { testHandler: handler } = await import('../appointment-handler');
    const res = await handler(
      makeCalcomEvent('test-calcom-secret', { organizer: { email: 'reception@lawfirm-a.com' } }),
      {} as any,
    );

    expect(res.statusCode).toBe(404);
    expect(rpcMock).toHaveBeenCalledWith('find_user_by_email', { lookup_email: 'reception@lawfirm-a.com' });
    expect(fromMock).not.toHaveBeenCalledWith('business_features');
  });

  it('returns 404 and never queries business_features when find_user_by_email resolves no match', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const { testHandler: handler } = await import('../appointment-handler');
    const res = await handler(
      makeCalcomEvent('test-calcom-secret', { organizer: { email: 'unknown@example.com' } }),
      {} as any,
    );

    expect(res.statusCode).toBe(404);
    expect(fromMock).not.toHaveBeenCalledWith('business_features');
  });
});
