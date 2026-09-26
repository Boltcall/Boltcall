import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.hoisted(() => vi.fn());
const membershipMaybeSingleMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const activityLogInsertMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'workspace_members') {
        const chain: any = {};
        chain.eq = () => chain;
        chain.maybeSingle = membershipMaybeSingleMock;
        return { select: () => chain };
      }
      if (table === 'api_keys') {
        return { insert: insertMock };
      }
      if (table === 'activity_logs') {
        return { insert: activityLogInsertMock };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

function makeEvent(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: JSON.stringify(body),
  } as any;
}

describe('team-api-keys — server-side owner/admin role check', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'caller-1', email: 'caller@test.com' } }, error: null });
  });

  it('lets a caller create a key scoped to their own id (default, unchanged behavior)', async () => {
    const { testHandler: handler } = await import('../team-api-keys');
    const res = await handler(makeEvent({ name: 'My Key' }), {} as any);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'caller-1' }));
    expect(membershipMaybeSingleMock).not.toHaveBeenCalled(); // same-id path skips the DB round trip
  });

  it('rejects creating a key for another workspace when the caller has no owner/admin membership there', async () => {
    membershipMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { testHandler: handler } = await import('../team-api-keys');
    const res = await handler(makeEvent({ name: 'My Key', workspaceId: 'other-workspace' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(403);
    expect(body.error).toMatch(/owners and admins/i);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('allows creating a key for another workspace when the caller is an active owner/admin member there', async () => {
    membershipMaybeSingleMock.mockResolvedValue({ data: { role: 'admin', status: 'active' }, error: null });
    const { testHandler: handler } = await import('../team-api-keys');
    const res = await handler(makeEvent({ name: 'My Key', workspaceId: 'other-workspace' }), {} as any);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'other-workspace' }));
  });
});
