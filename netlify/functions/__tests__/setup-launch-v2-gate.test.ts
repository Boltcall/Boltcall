import { beforeEach, describe, expect, it, vi } from 'vitest';

const updates = vi.hoisted(() => [] as Array<{ table: string; patch: any }>);

function chain(table: string) {
  const c: any = {};
  for (const k of ['select', 'eq', 'limit']) c[k] = vi.fn(() => c);
  c.maybeSingle = vi.fn(async () => {
    if (table === 'workspaces') return { data: { id: 'ws-1', user_id: 'user-a', name: 'My Workspace' }, error: null };
    if (table === 'business_profiles') return { data: { business_name: 'Harper & Cole Law PLLC' }, error: null };
    return { data: null, error: null };
  });
  c.update = vi.fn((patch: any) => { updates.push({ table, patch }); return c; });
  c.upsert = vi.fn(() => c);
  c.then = (res: any, rej: any) => Promise.resolve({ data: null, error: null }).then(res, rej);
  return c;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })) },
    from: (t: string) => chain(t),
  })),
}));

const launch = () => ({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer t' },
  body: JSON.stringify({ workspaceId: 'ws-1' }),
} as any);

describe('setup-launch', () => {
  beforeEach(() => {
    vi.resetModules();
    updates.length = 0;
    process.env.SUPABASE_URL = 'https://sb.example';
    process.env.SUPABASE_SERVICE_KEY = 's';
    delete process.env.V2_DEFAULT_ON;
  });

  it('keeps new firms on classic and renames the default workspace to the business name', async () => {
    const { testHandler } = await import('../setup-launch');
    const res = await testHandler(launch(), {} as any);

    expect(res.statusCode).toBe(200);
    const wsPatches = updates.filter((u) => u.table === 'workspaces').map((u) => u.patch);
    expect(wsPatches.some((p) => 'v2_enabled' in p)).toBe(false);
    expect(wsPatches[0]).toMatchObject({ name: 'Harper & Cole Law PLLC', setup_completed: true });
  });

  it('flips v2_enabled only when V2_DEFAULT_ON=true', async () => {
    process.env.V2_DEFAULT_ON = 'true';
    const { testHandler } = await import('../setup-launch');
    await testHandler(launch(), {} as any);

    expect(updates.some((u) => u.table === 'workspaces' && u.patch.v2_enabled === true)).toBe(true);
  });
});
