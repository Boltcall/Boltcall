import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const requireAuthMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/azure-ai', () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

vi.mock('../_shared/require-auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}));

function makePost(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

function makeChain(table: string) {
  const conditions: Record<string, unknown> = {};
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: unknown) => {
      conditions[column] = value;
      return chain;
    }),
    maybeSingle: vi.fn(async () => {
      if (table === 'agents' && conditions.id === 'agent-owned' && conditions.user_id === 'user-a') {
        return { data: { id: 'agent-owned' }, error: null };
      }
      if (table === 'kb_folders' && conditions.id === 'folder-owned' && conditions.user_id === 'user-a') {
        return { data: { id: 'folder-owned' }, error: null };
      }
      return { data: null, error: null };
    }),
    upsert: upsertMock,
  };
  upsertMock.mockResolvedValue({ data: null, error: null });
  return chain;
}

describe('kb-search tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ ok: true, userId: 'user-a', source: 'jwt' });
    fromMock.mockImplementation((table: string) => makeChain(table));
  });

  it('rejects linking a KB folder to an agent outside the authenticated user tenant', async () => {
    const { handler } = await import('../kb-search');

    const res = await handler(
      makePost({
        action: 'link_agent_folder',
        agentId: 'agent-victim',
        kbFolderId: 'folder-owned',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/agent/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('rejects linking an owned agent to a KB folder outside the authenticated user tenant', async () => {
    const { handler } = await import('../kb-search');

    const res = await handler(
      makePost({
        action: 'link_agent_folder',
        agentId: 'agent-owned',
        kbFolderId: 'folder-victim',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/folder/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('rejects folder reads for agents outside the authenticated user tenant', async () => {
    const { handler } = await import('../kb-search');

    const res = await handler(
      makePost({
        action: 'get_agent_folders',
        agentId: 'agent-victim',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/agent/i);
    expect(fromMock).not.toHaveBeenCalledWith('agent_kb_folders');
  });
});
