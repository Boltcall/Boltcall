import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Retell SDK
vi.mock('retell-sdk', () => {
  return {
    default: class MockRetell {
      call = {
        list: vi.fn().mockResolvedValue([]),
      };
      agent = {
        list: vi.fn().mockResolvedValue([]),
      };
    },
  };
});

// Mock token-utils
const mockGetUser = vi.fn();
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
          })),
        })),
      })),
      count: 'exact',
      head: true,
    })),
  })),
};

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
}));

// Set env
process.env.RETELL_API_KEY = '';
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';

import { handler } from '../dashboard-stats';

function makeEvent(overrides: any = {}) {
  return {
    httpMethod: overrides.httpMethod || 'GET',
    headers: overrides.headers || {},
    queryStringParameters: overrides.queryStringParameters || null,
    body: null,
    ...overrides,
  } as any;
}

describe('dashboard-stats function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for OPTIONS', async () => {
    const res = await handler(makeEvent({ httpMethod: 'OPTIONS' }), {} as any);
    expect(res!.statusCode).toBe(200);
  });

  it('returns 405 for POST', async () => {
    const res = await handler(makeEvent({ httpMethod: 'POST' }), {} as any);
    expect(res!.statusCode).toBe(405);
  });

  it('returns 401 if no auth header', async () => {
    const res = await handler(makeEvent(), {} as any);
    expect(res!.statusCode).toBe(401);
    expect(JSON.parse(res!.body!).error).toBe('Authentication required');
  });

  it('returns 401 if token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } });

    const res = await handler(
      makeEvent({ headers: { authorization: 'Bearer bad-token' } }),
      {} as any
    );
    expect(res!.statusCode).toBe(401);
    expect(JSON.parse(res!.body!).error).toBe('Invalid or expired token');
  });

  it('returns dashboard stats on valid auth', async () => {
    // Endpoint is gated behind ADMIN_EMAILS (defaults to noamyakoby6@gmail.com).
    // Provide an admin email on the mocked user so the request passes the gate.
    process.env.ADMIN_EMAILS = 'admin@test.com';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });

    // Mock Supabase from() chain to return valid data
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
            }),
          }),
          in: vi.fn().mockResolvedValue({ count: 0 }),
        }),
        count: 'exact',
        head: true,
      }),
    }));

    const res = await handler(
      makeEvent({ headers: { authorization: 'Bearer valid-token' } }),
      {} as any
    );

    expect(res!.statusCode).toBe(200);
    const body = JSON.parse(res!.body!);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('summary');
    expect(body.summary).toHaveProperty('ai_calls_today');
    expect(body.summary).toHaveProperty('total_leads');
  });
});
