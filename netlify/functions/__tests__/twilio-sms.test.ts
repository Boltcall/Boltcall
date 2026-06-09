import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOwnedNumbers = ['+15551234567'];
const mockPhoneQuery: any = {
  select: vi.fn(() => mockPhoneQuery),
  eq: vi.fn(() => mockPhoneQuery),
  then: (resolve: any, reject: any) =>
    Promise.resolve({
      data: mockOwnedNumbers.map(phone_number => ({ phone_number })),
      error: null,
    }).then(resolve, reject),
};
const mockSupabase = {
  from: vi.fn(() => mockPhoneQuery),
};

// Mock token-utils
vi.mock('../_shared/token-utils', () => ({
  deductTokens: vi.fn().mockResolvedValue({ success: true }),
  deductTokensBatch: vi.fn().mockResolvedValue({ success: true }),
  getServiceSupabase: () => mockSupabase,
  TOKEN_COSTS: { sms_sent: 5 },
}));

vi.mock('../_shared/user-auth', () => ({
  requireUser: vi.fn(async (_event, _headers) => ({
    ok: true,
    user: { id: 'u1' },
    userId: 'u1',
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set env
process.env.TWILIO_ACCOUNT_SID = 'AC_TEST';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_FROM_NUMBER = '+15551234567';

import { handler } from '../twilio-sms';

function makeEvent(overrides: any = {}) {
  const { body, ...rest } = overrides;
  return {
    httpMethod: rest.httpMethod || 'POST',
    headers: rest.headers || {},
    queryStringParameters: null,
    body: body !== undefined ? JSON.stringify(body) : null,
    ...rest,
  } as any;
}

describe('twilio-sms function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnedNumbers.splice(0, mockOwnedNumbers.length, '+15551234567');
  });

  it('returns 200 for OPTIONS', async () => {
    const res = await handler(makeEvent({ httpMethod: 'OPTIONS' }), {} as any);
    expect(res!.statusCode).toBe(200);
  });

  it('returns 405 for GET', async () => {
    const res = await handler(makeEvent({ httpMethod: 'GET' }), {} as any);
    expect(res!.statusCode).toBe(405);
  });

  describe('action: send', () => {
    it('returns 400 if to or message missing', async () => {
      const res = await handler(makeEvent({ body: { action: 'send', to: '+1555' } }), {} as any);
      expect(res!.statusCode).toBe(400);
    });

    it('sends SMS successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sid: 'SM123',
          status: 'queued',
          to: '+15559876543',
          from: '+15551234567',
        }),
      });

      const res = await handler(
        makeEvent({
          body: {
            action: 'send',
            to: '+15559876543',
            message: 'Test message',
          },
        }),
        {} as any
      );

      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body!);
      expect(body.success).toBe(true);
      expect(body.message_sid).toBe('SM123');
    });
  });

  describe('action: send_bulk', () => {
    it('returns 400 if messages array empty', async () => {
      const res = await handler(makeEvent({ body: { action: 'send_bulk', messages: [] } }), {} as any);
      expect(res!.statusCode).toBe(400);
    });

    it('sends bulk SMS and reports results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sid: 'SM1', status: 'queued', to: '+1111', from: '+15551234567' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sid: 'SM2', status: 'queued', to: '+2222', from: '+15551234567' }),
        });

      const res = await handler(
        makeEvent({
          body: {
            action: 'send_bulk',
            messages: [
              { to: '+1111', message: 'Hello 1' },
              { to: '+2222', message: 'Hello 2' },
            ],
          },
        }),
        {} as any
      );

      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body!);
      expect(body.sent).toBe(2);
      expect(body.failed).toBe(0);
    });
  });

  describe('action: list', () => {
    it('lists message history', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ sid: 'SM1' }], total: 1 }),
      });

      const res = await handler(
        makeEvent({ body: { action: 'list', limit: 10 } }),
        {} as any
      );

      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body!);
      expect(body.messages).toHaveLength(1);
    });
  });

  it('returns 400 for unknown action', async () => {
    const res = await handler(makeEvent({ body: { action: 'delete' } }), {} as any);
    expect(res!.statusCode).toBe(400);
  });

  it('returns 500 on unexpected error', async () => {
    const res = await handler(makeEvent({ body: null }), {} as any);
    // body is null → JSON.parse throws
    expect(res!.statusCode).toBe(500);
  });
});
