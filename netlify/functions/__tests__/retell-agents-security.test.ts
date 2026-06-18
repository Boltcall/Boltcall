import { beforeEach, describe, expect, it, vi } from 'vitest';

const agentCreateMock = vi.hoisted(() => vi.fn());
const agentListMock = vi.hoisted(() => vi.fn());
const agentRetrieveMock = vi.hoisted(() => vi.fn());
const callCreateWebCallMock = vi.hoisted(() => vi.fn());
const getUserAgentIdsMock = vi.hoisted(() => vi.fn());
const knowledgeBaseAddSourcesMock = vi.hoisted(() => vi.fn());
const knowledgeBaseRetrieveMock = vi.hoisted(() => vi.fn());
const knowledgeBaseDeleteSourceMock = vi.hoisted(() => vi.fn());
const llmRetrieveMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const authGetUserMock = vi.hoisted(() => vi.fn());
const userOwnsAgentMock = vi.hoisted(() => vi.fn());

vi.mock('retell-sdk', () => ({
  default: vi.fn(function RetellMock(this: any) {
    this.agent = {
      create: agentCreateMock,
      retrieve: agentRetrieveMock,
      list: agentListMock,
    };
    this.llm = {
      create: vi.fn(),
      retrieve: llmRetrieveMock,
    };
    this.knowledgeBase = {
      create: vi.fn(),
      retrieve: knowledgeBaseRetrieveMock,
      deleteSource: knowledgeBaseDeleteSourceMock,
      addSources: knowledgeBaseAddSourcesMock,
    };
    this.call = {
      createWebCall: callCreateWebCallMock,
    };
  }),
}));

vi.mock('../_shared/require-auth', () => ({
  requireAuth: vi.fn(async () => ({ ok: true, userId: 'user-a', source: 'jwt' })),
  getUserAgentIds: getUserAgentIdsMock,
  userOwnsAgent: userOwnsAgentMock,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: authGetUserMock,
    },
    from: fromMock,
  })),
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

function setupSupabaseMaybeSingle(result: { data: unknown; error: unknown }) {
  maybeSingleMock.mockResolvedValue(result);
  fromMock.mockImplementation(() => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: maybeSingleMock,
    };
    return chain;
  });
}

describe('retell-agents tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    delete process.env.RETELL_LLM_WEBSOCKET_URL;
    getUserAgentIdsMock.mockResolvedValue([]);
    agentRetrieveMock.mockResolvedValue(null);
    userOwnsAgentMock.mockResolvedValue(false);
    authGetUserMock.mockResolvedValue({
      data: { user: { id: 'user-a', email: 'user@example.com', app_metadata: { role: 'member' } } },
      error: null,
    });
    setupSupabaseMaybeSingle({ data: { id: 'owned-profile' }, error: null });
  });

  it('rejects create_full when body user_id differs from the authenticated user', async () => {
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({ action: 'create_full', user_id: 'user-b', business_name: 'Victim Co' }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/user_id/i);
    expect(agentCreateMock).not.toHaveBeenCalled();
  });

  it('rejects user-supplied llm_id values not owned by the authenticated user', async () => {
    getUserAgentIdsMock.mockResolvedValue(['agent-owned']);
    agentRetrieveMock.mockResolvedValue({ response_engine: { llm_id: 'llm-owned' } });
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({ action: 'create_agent', llm_id: 'llm-victim', agent_name: 'Borrowed LLM' }),
      {} as any,
    );

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toMatch(/llm/i);
    expect(agentCreateMock).not.toHaveBeenCalled();
  });

  it('rejects create_full when referenced business profile is not owned by the user', async () => {
    setupSupabaseMaybeSingle({ data: null, error: null });
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({
        action: 'create_full',
        user_id: 'user-a',
        business_profile_id: 'profile-victim',
        business_name: 'Victim Co',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/business_profile_id/i);
    expect(agentCreateMock).not.toHaveBeenCalled();
  });

  it('rejects create_agent when attaching an unowned Retell knowledge base', async () => {
    getUserAgentIdsMock.mockResolvedValue(['agent-owned']);
    agentRetrieveMock.mockResolvedValue({ response_engine: { llm_id: 'llm-owned' } });
    llmRetrieveMock.mockResolvedValue({ knowledge_base_ids: ['kb-owned'] });
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({
        action: 'create_agent',
        agent_name: 'Borrowed KB',
        knowledge_base_ids: ['kb-victim'],
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/knowledge base/i);
    expect(agentCreateMock).not.toHaveBeenCalled();
  });

  it('rejects create_web_call for agents outside the authenticated user tenant', async () => {
    userOwnsAgentMock.mockResolvedValue(false);
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({ action: 'create_web_call', agent_id: 'agent-victim' }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(callCreateWebCallMock).not.toHaveBeenCalled();
  });

  it('rejects sync_kb for Retell knowledge bases outside the authenticated user tenant', async () => {
    getUserAgentIdsMock.mockResolvedValue(['agent-owned']);
    agentRetrieveMock.mockResolvedValue({ response_engine: { llm_id: 'llm-owned' } });
    llmRetrieveMock.mockResolvedValue({ knowledge_base_ids: ['kb-owned'] });
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({
        action: 'sync_kb',
        knowledge_base_id: 'kb-victim',
        knowledge_base_texts: [{ title: 'Injected', text: 'bad' }],
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(knowledgeBaseRetrieveMock).not.toHaveBeenCalled();
    expect(knowledgeBaseAddSourcesMock).not.toHaveBeenCalled();
  });

  it('requires founder or platform admin authorization for org-wide Azure migration', async () => {
    process.env.RETELL_LLM_WEBSOCKET_URL = 'wss://llm.example/ws';
    setupSupabaseMaybeSingle({ data: null, error: null });
    const { testHandler: handler } = await import('../retell-agents');

    const res = await handler(
      makePost({ action: 'migrate_to_azure' }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/founder|admin/i);
    expect(agentListMock).not.toHaveBeenCalled();
    expect(agentCreateMock).not.toHaveBeenCalled();
  });
});
