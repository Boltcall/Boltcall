import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const requireAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/require-auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => ({ from: fromMock }),
}));

function post(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

// Chain that captures the last call for `.select().eq().eq().like()` etc.
function makeFetchChain(rows: Array<{ category: string; content: string }>) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    like: vi.fn(async () => ({ data: rows, error: null })),
  };
  return chain;
}

const insertMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
function makeSaveChain() {
  const del: any = {
    eq: vi.fn(() => del),
  };
  // final eq resolves the delete
  del.eq = vi.fn().mockImplementation(function (this: any) {
    return del;
  });
  // Simpler: track calls via top-level mock.
  const chain: any = {
    delete: () => {
      deleteMock();
      const d: any = { eq: vi.fn(() => d) };
      // resolve the deferred chain on the 3rd eq (user_id, tier, category)
      let calls = 0;
      d.eq = vi.fn(() => {
        calls++;
        if (calls >= 3) return Promise.resolve({ error: null });
        return d;
      });
      return d;
    },
    insert: (row: any) => {
      insertMock(row);
      return Promise.resolve({ error: null });
    },
  };
  return chain;
}

describe('tenant-onboarding-interview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ ok: true, userId: 'tenant-1' });
  });

  it('rejects unknown action', async () => {
    const { testHandler } = await import('../tenant-onboarding-interview');
    fromMock.mockImplementation(() => makeFetchChain([]));
    const res = await testHandler(post({ action: 'delete_everything' }), {} as any);
    expect(res.statusCode).toBe(400);
  });

  it('rejects save with unknown answer key', async () => {
    const { testHandler } = await import('../tenant-onboarding-interview');
    fromMock.mockImplementation(() => makeSaveChain());
    const res = await testHandler(post({ action: 'save', answers: { evil_key: 'x' } }), {} as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/unknown answer key/);
  });

  it('fetch returns questions + parsed answers + complete flag', async () => {
    const { testHandler, INTERVIEW_QUESTIONS } = await import('../tenant-onboarding-interview');
    fromMock.mockImplementation(() => makeFetchChain([
      { category: 'onboarding_interview:business_type', content: 'Med spa' },
      { category: 'onboarding_interview:icp', content: 'Women 30-55 in Miami' },
    ]));
    const res = await testHandler(post({ action: 'fetch' }), {} as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.answers.business_type).toBe('Med spa');
    expect(body.answers.icp).toContain('Miami');
    expect(body.complete).toBe(false);
    expect(body.questions.length).toBe(INTERVIEW_QUESTIONS.length);
  });

  it('rejects non-POST', async () => {
    const { testHandler } = await import('../tenant-onboarding-interview');
    const res = await testHandler({ httpMethod: 'GET', headers: {} } as any, {} as any);
    expect(res.statusCode).toBe(405);
  });

  it('CORS preflight', async () => {
    const { testHandler } = await import('../tenant-onboarding-interview');
    const res = await testHandler({ httpMethod: 'OPTIONS', headers: {} } as any, {} as any);
    expect(res.statusCode).toBe(200);
  });
});
