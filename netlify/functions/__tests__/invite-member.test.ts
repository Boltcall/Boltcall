import { beforeEach, describe, expect, it, vi } from 'vitest';

const workspaceMaybeSingleMock = vi.hoisted(() => vi.fn());
const memberSingleMock = vi.hoisted(() => vi.fn());
const membershipMaybeSingleMock = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })));
const memberInsertMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getUserMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: workspaceMaybeSingleMock }),
          }),
        };
      }
      if (table === 'workspace_members') {
        // Two call shapes share this table: the existing-invite lookup
        // (.eq().single()) and the role/status membership check
        // (.eq().eq().eq().maybeSingle()) — the chain supports both.
        const chain: any = {};
        chain.eq = () => chain;
        chain.single = memberSingleMock;
        chain.maybeSingle = membershipMaybeSingleMock;
        return {
          select: () => chain,
          insert: memberInsertMock,
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));

function makeEvent(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: JSON.stringify(body),
  } as any;
}

describe('invite-member F109 — owner check reads workspaces.user_id', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getUserMock.mockResolvedValue({ data: { user: { id: 'owner-1', email: 'owner@test.com' } }, error: null });
    memberSingleMock.mockResolvedValue({ data: null, error: { message: 'no rows' } }); // no existing invite
  });

  it('lets the real workspace owner (workspaces.user_id) invite a member', async () => {
    // Confirms isOwnerOrAdmin resolves via the real `user_id` column — this used
    // to select a nonexistent `owner_id` and always evaluate false (F109).
    workspaceMaybeSingleMock.mockResolvedValue({ data: { user_id: 'owner-1' }, error: null });

    const { testHandler: handler } = await import('../invite-member');
    const res = await handler(makeEvent({ action: 'invite', email: 'new@member.com', workspaceId: 'ws-1' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(memberInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: 'ws-1', email: 'new@member.com', invited_by: 'owner-1' }),
    );
  });

  it('still rejects a caller who is neither the workspace owner nor an active member', async () => {
    workspaceMaybeSingleMock.mockResolvedValue({ data: { user_id: 'someone-else' }, error: null });

    const { testHandler: handler } = await import('../invite-member');
    const res = await handler(makeEvent({ action: 'invite', email: 'new@member.com', workspaceId: 'ws-1' }), {} as any);

    expect(res.statusCode).toBe(403);
    expect(memberInsertMock).not.toHaveBeenCalled();
  });
});
