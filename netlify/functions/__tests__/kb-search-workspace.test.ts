import { describe, expect, it, vi } from 'vitest';

const inserts = vi.hoisted(() => [] as any[]);

vi.mock('../_shared/azure-ai', () => ({ generateEmbedding: vi.fn() }));
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));
vi.mock('../_shared/require-auth', () => ({
  requireAuth: vi.fn(async () => ({ ok: true, userId: 'user-a', source: 'jwt' })),
}));

function chain(table: string) {
  const c: any = {};
  for (const k of ['select', 'eq', 'limit']) c[k] = vi.fn(() => c);
  c.maybeSingle = vi.fn(async () =>
    table === 'business_profiles' ? { data: { id: 'bp-1', workspace_id: 'ws-1' }, error: null } : { data: null, error: null });
  c.insert = vi.fn((row: any) => { inserts.push(row); return c; });
  c.single = vi.fn(async () => ({ data: { id: 'kb-1' }, error: null }));
  return c;
}

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => ({ from: (t: string) => chain(t) }),
}));

describe('kb-search add_batch', () => {
  it('stamps the caller workspace_id on every KB row', async () => {
    const { testHandler } = await import('../kb-search');
    const res = await testHandler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer t' },
      body: JSON.stringify({
        action: 'add_batch',
        entries: [{ title: 'Hours', content: 'Mon-Fri 9-5', tier: 'prompt' }],
      }),
      queryStringParameters: null,
    } as any, {} as any);

    expect(res.statusCode).toBe(200);
    expect(inserts[0]).toMatchObject({ user_id: 'user-a', business_profile_id: 'bp-1', workspace_id: 'ws-1' });
  });
});
