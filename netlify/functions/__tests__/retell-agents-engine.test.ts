import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  llmCreate: vi.fn(),
  agentCreate: vi.fn(),
  agentRetrieve: vi.fn(),
  agentUpdate: vi.fn(),
  inserts: [] as Array<{ table: string; row: any }>,
  rows: {} as Record<string, any>,
}));

vi.mock('retell-sdk', () => ({
  default: vi.fn(function RetellMock(this: any) {
    this.agent = { create: m.agentCreate, retrieve: m.agentRetrieve, update: m.agentUpdate, delete: vi.fn() };
    this.llm = { create: m.llmCreate, delete: vi.fn() };
  }),
}));

vi.mock('../_shared/require-auth', () => ({
  requireAuth: vi.fn(async () => ({ ok: true, userId: 'user-a', source: 'jwt' })),
  getUserAgentIds: vi.fn(async () => []),
  userOwnsAgent: vi.fn(async () => false),
}));

vi.mock('../_shared/setup-workspace', () => ({
  findWorkspaceForUser: vi.fn(async () => ({ id: 'ws-1' })),
}));

// Every query-builder call returns the chain; terminals resolve per table.
function chain(table: string) {
  const result = () => ({ data: m.rows[table] ?? null, error: null });
  const c: any = {};
  for (const k of ['select', 'eq', 'limit', 'order', 'is', 'not', 'update', 'delete']) c[k] = vi.fn(() => c);
  c.insert = vi.fn((row: any) => { m.inserts.push({ table, row }); return c; });
  c.maybeSingle = vi.fn(async () => result());
  c.single = vi.fn(async () => (table === 'agents' ? { data: { id: 'db-agent-1' }, error: null } : result()));
  c.then = (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
  return c;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (t: string) => chain(t),
    rpc: vi.fn(async () => ({ data: true, error: null })),
    auth: { getUser: vi.fn() },
  })),
}));

function post(body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer t', 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

const createFullBody = {
  action: 'create_full',
  business_name: 'Harper Law',
  general_prompt: 'You answer for Harper Law.',
  transfer_number: '+15125550142',
};

describe('retell-agents engine + tenancy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    m.inserts.length = 0;
    m.rows = {};
    process.env.RETELL_API_KEY = 'k';
    process.env.SUPABASE_URL = 'https://sb.example';
    process.env.SUPABASE_SERVICE_KEY = 's';
    process.env.INTERNAL_API_SECRET = 'internal-secret';
    process.env.RETELL_LLM_WEBSOCKET_URL = 'wss://dead-bridge.example/llm-websocket';
    delete process.env.RETELL_CUSTOM_LLM_ENABLED;
    m.llmCreate.mockResolvedValue({ llm_id: 'llm-1' });
    m.agentCreate.mockResolvedValue({ agent_id: 'agent-1', voice_id: '11labs-Grace' });
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as any;
  });

  it('create_full defaults to retell-llm with tools even when the websocket URL is set, and stamps workspace_id', async () => {
    const { testHandler } = await import('../retell-agents');
    const res = await testHandler(post(createFullBody), {} as any);

    expect(res.statusCode).toBe(200);
    const llmConfig = m.llmCreate.mock.calls[0][0];
    const toolNames = llmConfig.general_tools.map((t: any) => t.name);
    expect(toolNames).toEqual(expect.arrayContaining(['transfer_call', 'end_call', 'lookup_caller', 'search_knowledge_base', 'book_appointment']));
    expect(m.agentCreate.mock.calls[0][0]).toMatchObject({
      response_engine: { type: 'retell-llm', llm_id: 'llm-1' },
      max_call_duration_ms: 1_200_000,
      ambient_sound: null,
      opt_in_signed_url: true,
    });
    const agentInsert = m.inserts.find((i) => i.table === 'agents')!.row;
    expect(agentInsert).toMatchObject({ workspace_id: 'ws-1', transfer_phone_number: '+15125550142' });
  });

  it('uses the custom-LLM bridge only when RETELL_CUSTOM_LLM_ENABLED=true', async () => {
    process.env.RETELL_CUSTOM_LLM_ENABLED = 'true';
    const { testHandler } = await import('../retell-agents');
    await testHandler(post(createFullBody), {} as any);

    expect(m.llmCreate).not.toHaveBeenCalled();
    expect(m.agentCreate.mock.calls[0][0].response_engine).toEqual({
      type: 'custom-llm',
      llm_websocket_url: 'wss://dead-bridge.example/llm-websocket',
    });
  });

  it('normalizes free-text countries and always discloses in the legacy prompt', async () => {
    const { normalizeCountryCode, buildAgentPrompt } = await import('../retell-agents');
    for (const raw of ['United States', 'USA', 'U.S.', ' us ', '', undefined, 'ישראל']) {
      expect(normalizeCountryCode(raw)).toBe('us');
    }
    expect(normalizeCountryCode('GB')).toBe('gb');
    expect(normalizeCountryCode('Canada')).toBe('ca');
    expect(buildAgentPrompt('Harper Law')).toMatch(/may be recorded.*AI assistant/);
  });

  it('migrate_engine rejects callers without the internal secret', async () => {
    const { testHandler } = await import('../retell-agents');
    const res = await testHandler(post({ action: 'migrate_engine', agent_id: 'agent-9' }), {} as any);
    expect(res.statusCode).toBe(401);
  });

  it('migrate_engine dry_run plans a retell-llm config from the stored prompt without calling Retell', async () => {
    m.rows.agents = {
      id: 'db-9',
      system_prompt: 'Stored law prompt',
      begin_message: 'Hi, thanks for calling Harper Law!',
      transfer_phone_number: '+15125550142',
      business_profiles: { business_name: 'Harper Law' },
    };
    const { testHandler } = await import('../retell-agents');
    const res = await testHandler(
      post({ action: 'migrate_engine', agent_id: 'agent-9', dry_run: true }, { 'x-internal-secret': 'internal-secret' }),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.llm_config.general_prompt).toBe('Stored law prompt');
    expect(body.llm_config.begin_message).toMatch(/may be recorded.*AI assistant.*Harper Law/);
    expect(body.llm_config.general_tools.map((t: any) => t.name)).toContain('transfer_call');
    expect(body.agent_update).toMatchObject({ ambient_sound: null, max_call_duration_ms: 1_200_000, opt_in_signed_url: true });
    // Same post-call fields create_full gets; retell-webhook alerts on `urgent`.
    expect(body.agent_update.post_call_analysis_data.map((f: any) => `${f.name}:${f.type}`)).toEqual([
      'urgent:boolean', 'urgency_reason:string', 'caller_name:string', 'caller_email:string', 'practice_area:string', 'adverse_parties:string',
    ]);
    expect(m.agentRetrieve).not.toHaveBeenCalled();
    expect(m.llmCreate).not.toHaveBeenCalled();
    expect(m.agentUpdate).not.toHaveBeenCalled();
  });
});
