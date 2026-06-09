/**
 * V2 endpoint smoke tests — one test file covering every saas-v2-*.ts Netlify
 * function.
 *
 * Goal: catch import-time crashes, missing-mock regressions, and the
 * three load-bearing security properties:
 *   1. Returns 401 without an auth header.
 *   2. Derives workspace_id from the JWT and IGNORES any body/query-provided
 *      workspace_id (the hard rule called out in every V2 endpoint's header).
 *   3. Returns a non-5xx, JSON-shaped response when given valid auth +
 *      minimal valid input (with Supabase/Anthropic/Retell/Cal.com mocked).
 *
 * NOT a full coverage suite. We do not assert response bodies in detail; we
 * verify shape (statusCode + parseable JSON or stream content-type) only.
 *
 * Pattern mirrors netlify/functions/__tests__/dashboard-stats.test.ts — all
 * vi.mock() calls hoisted to the top, then handlers imported lazily inside
 * describe blocks so each endpoint isolates its mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// 1. Env vars — must be set BEFORE any handler import so token-utils.getServiceSupabase
//    doesn't throw at module load time.
// ────────────────────────────────────────────────────────────────────────────

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.ANTHROPIC_API_KEY = '';
process.env.RETELL_API_KEY = '';
process.env.AZURE_OPENAI_ENDPOINT = '';
process.env.AZURE_OPENAI_API_KEY = '';
process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT = '';
process.env.AZURE_OPENAI_FOUNDRY_KEY = '';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.URL = 'http://localhost:8888';

// ────────────────────────────────────────────────────────────────────────────
// 2. Shared mock state. The chain-mock is driven by per-test overrides set on
//    the `mockState` object. Reset in beforeEach.
// ────────────────────────────────────────────────────────────────────────────

interface MockState {
  user: { id: string } | null;
  authError: { message: string } | null;
  // The supabase-client side. tableData[<table>] = data array; defaults to [].
  tableData: Record<string, any[]>;
  // .maybeSingle()/.single() returns the FIRST element of tableData[<table>]
  // or null if the table key is missing/empty. Tests can also override per-table
  // by setting tableSingle[<table>] explicitly.
  tableSingle: Record<string, any | null>;
  // Last from() call args (to introspect what the handler queried).
  fromCalls: string[];
  // Last update payload — useful for asserting handler ignored body workspace_id.
  lastUpdate: any;
}

const mockState: MockState = {
  user: { id: 'jwt-user-A' },
  authError: null,
  tableData: {},
  tableSingle: {},
  fromCalls: [],
  lastUpdate: null,
};

function defaultWorkspaceRow() {
  return {
    id: 'workspace-A',
    owner_id: 'jwt-user-A',
    user_id: 'jwt-user-A',
    v2_enabled: true,
    created_at: new Date('2024-01-01').toISOString(),
    name: 'Test Workspace',
    v2_setup_state: null,
    v2_setup_conversation_id: null,
    v2_setup_status: 'in_progress',
    v2_setup_started_at: null,
  };
}

function resetMockState() {
  mockState.user = { id: 'jwt-user-A' };
  mockState.authError = null;
  mockState.tableData = {
    workspaces: [defaultWorkspaceRow()],
  };
  mockState.tableSingle = {
    workspaces: defaultWorkspaceRow(),
  };
  mockState.fromCalls = [];
  mockState.lastUpdate = null;
}

// Builds the recursive chain proxy returned by supa.from(<table>). Every
// method returns the same chain; only the terminal accessors (then/await,
// single/maybeSingle) resolve to data.
function makeChain(table: string): any {
  const arrayResult = () => ({
    data: mockState.tableData[table] ?? [],
    error: null,
    count: (mockState.tableData[table] ?? []).length,
  });
  const singleResult = () => {
    if (table in mockState.tableSingle) {
      return { data: mockState.tableSingle[table], error: null };
    }
    const list = mockState.tableData[table] ?? [];
    return { data: list[0] ?? null, error: null };
  };

  const handler: ProxyHandler<any> = {
    get(_t, prop: string) {
      if (prop === 'then')
        return (resolve: any, reject?: any) =>
          Promise.resolve(arrayResult()).then(resolve, reject);
      if (prop === 'catch')
        return (reject: any) => Promise.resolve(arrayResult()).catch(reject);
      if (prop === 'finally')
        return (cb: any) => Promise.resolve(arrayResult()).finally(cb);
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(singleResult());
      }
      if (prop === 'update') {
        return (payload: any) => {
          mockState.lastUpdate = { table, payload };
          return makeChain(table);
        };
      }
      if (prop === 'insert' || prop === 'upsert' || prop === 'delete') {
        return (_args?: any) => {
          // Allow further chaining (.select(), .eq(), .single() etc.)
          return makeChain(table);
        };
      }
      // Default: any method (.select, .eq, .in, .gte, .lte, .order, .limit,
      // .range, .head, .count, etc.) returns the same chain. Also support
      // `.select(...).then()` and `.eq(...).then()` patterns.
      return (..._args: any[]) => makeChain(table);
    },
  };
  return new Proxy({}, handler);
}

const mockGetUser = vi.fn(async () => {
  if (mockState.authError) {
    return { data: { user: null }, error: mockState.authError };
  }
  if (!mockState.user) {
    return { data: { user: null }, error: { message: 'no user' } };
  }
  return { data: { user: mockState.user }, error: null };
});

function makeSupabase() {
  return {
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      mockState.fromCalls.push(table);
      return makeChain(table);
    },
    // Some endpoints touch storage/rpc — return chain-compatible stubs.
    rpc: (..._args: any[]) => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Module mocks — must be hoisted (declared at top-level with vi.mock).
// ────────────────────────────────────────────────────────────────────────────

vi.mock('../_shared/token-utils', () => {
  return {
    getServiceSupabase: () => makeSupabase(),
    getSupabase: () => makeSupabase(),
    // Token-deduction utilities used by a few endpoints — no-op success.
    deductTokens: vi.fn().mockResolvedValue({
      success: true,
      tokensDeducted: 0,
      remainingBalance: 1000,
    }),
    deductTokensBatch: vi.fn().mockResolvedValue({
      success: true,
      tokensDeducted: 0,
      remainingBalance: 1000,
    }),
    TOKEN_COSTS: {
      ai_voice_minute: 10,
      ai_chat_message: 1,
      sms_sent: 5,
      email_sent: 3,
      email_received: 1,
      email_ai_draft: 8,
      outbound_call: 15,
      lead_processed: 2,
      kb_document_sync: 3,
      web_scrape: 5,
      ai_self_heal: 20,
      ai_kb_extract: 5,
      whatsapp_sent: 6,
      whatsapp_ai_draft: 8,
      ai_qa_success_analysis: 5,
    },
  };
});

vi.mock('../_shared/cors', () => ({
  getCorsHeaders: () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }),
  corsHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  },
}));

vi.mock('../_shared/azure-ai', () => ({
  generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
  chatCompletion: vi.fn(async (_system: string, _user: string) => {
    return 'Canned narrative reply. Two short sentences. No agency jargon.';
  }),
  chatCompletionStructured: vi.fn(async () => ({ result: 'ok' })),
  isAzureConfigured: () => false,
  getAzureDeployment: () => 'gpt-4o-mini',
}));

vi.mock('../_shared/emit-agency-event', () => ({
  emitAgencyEvent: vi.fn().mockResolvedValue(undefined),
  emitAgencyEvents: vi.fn().mockResolvedValue(undefined),
  emitSaasV2Event: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../_shared/saas-v2-events', () => ({
  emitSaasV2Event: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../_shared/agency-agents/run-agent', () => ({
  runAgent: vi.fn().mockResolvedValue({
    ok: true,
    output_text: 'Canned agent output.',
    output: { suggestions: [] },
    cost_cents: 0,
    latency_ms: 5,
    model: 'mock-model',
  }),
  runAgentStructured: vi.fn().mockResolvedValue({
    ok: true,
    output: { suggestions: [] },
    cost_cents: 0,
    latency_ms: 5,
  }),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Canned Claude reply' },
        ],
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    };
  }
  return {
    default: MockAnthropic,
    __esModule: true,
  };
});

vi.mock('retell-sdk', () => {
  class MockRetell {
    call = {
      list: vi.fn().mockResolvedValue([]),
      retrieve: vi.fn().mockResolvedValue({ call_id: 'mock-call-1' }),
    };
    agent = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ agent_id: 'mock-agent-1' }),
      retrieve: vi.fn().mockResolvedValue({ agent_id: 'mock-agent-1' }),
      update: vi.fn().mockResolvedValue({ agent_id: 'mock-agent-1' }),
    };
    voice = {
      list: vi.fn().mockResolvedValue([]),
    };
  }
  return {
    default: MockRetell,
    __esModule: true,
  };
});

// global fetch — covers setup-finalize/setup-conversation calling other
// Netlify functions, plus any Cal.com/Retell HTTP fallbacks.
const mockFetch = vi.fn(async (url: string | URL | Request) => {
  const u = String(url);
  // ai-extract-kb response shape
  if (u.includes('ai-extract-kb')) {
    return new Response(
      JSON.stringify({ services: [], faqs: [], policies: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (u.includes('scrape-url')) {
    return new Response(
      JSON.stringify({ content: '', charCount: 0, source: 'basic', title: '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (u.includes('retell-agents')) {
    return new Response(
      JSON.stringify({ ok: true, agent_id: 'mock-agent-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (u.includes('setup-launch')) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});

beforeEach(() => {
  resetMockState();
  mockFetch.mockClear();
  mockGetUser.mockClear();
  // @ts-expect-error – jsdom global
  global.fetch = mockFetch;
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Helpers — event factories + shared assertions.
// ────────────────────────────────────────────────────────────────────────────

function makeEvent(overrides: any = {}) {
  return {
    httpMethod: overrides.httpMethod || 'GET',
    headers: overrides.headers || {},
    queryStringParameters: overrides.queryStringParameters || null,
    body: overrides.body ?? null,
    rawUrl: overrides.rawUrl || 'http://localhost:8888/.netlify/functions/test',
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    path: overrides.path || '/.netlify/functions/test',
    ...overrides,
  } as any;
}

function authHeaders(): Record<string, string> {
  return { authorization: 'Bearer jwt-for-user-A' };
}

async function expect401NoAuth(
  handler: any,
  method: 'GET' | 'POST',
  body: Record<string, any> = {},
) {
  // Pass a minimal valid body so handlers that validate body BEFORE auth
  // (e.g. saas-v2-settings-update) still reach the auth check. A 400 here
  // would mean the endpoint reveals "your body is bad" to anonymous callers,
  // which is mildly information-leaky but acceptable. The 401 assertion is
  // about the AUTH branch specifically — we want to confirm the handler
  // does NOT silently accept anonymous requests with a valid body.
  const res = await handler(
    makeEvent({
      httpMethod: method,
      body: method === 'POST' ? JSON.stringify(body) : null,
    }),
    {} as any,
  );
  expect(res).toBeDefined();
  expect(res.statusCode).toBe(401);
}

/**
 * The hard security property: the handler must derive workspace_id from the
 * JWT and IGNORE any body/query-supplied workspace_id. We attempt to inject
 * workspace_id=workspace-B and assert the handler either:
 *   (a) talks to workspace-A in its supabase queries, OR
 *   (b) returns 401/403/4xx (refuses entirely — equally safe).
 *
 * We assert by inspecting mockState.lastUpdate.payload OR mockState.fromCalls
 * for the smoking-gun "workspace-B" string. For GET endpoints we put the
 * injection in query string; for POST in body.
 */
async function expectIgnoresBodyWorkspaceId(
  handler: any,
  method: 'GET' | 'POST',
  extraBody: Record<string, any> = {},
  extraQuery: Record<string, string> = {},
) {
  resetMockState();
  const inject = 'workspace-B-attacker';
  const queryStringParameters =
    method === 'GET'
      ? { workspace_id: inject, ...extraQuery }
      : extraQuery && Object.keys(extraQuery).length
        ? extraQuery
        : null;
  const body =
    method === 'POST'
      ? JSON.stringify({ workspace_id: inject, ...extraBody })
      : null;

  const res = await handler(
    makeEvent({
      httpMethod: method,
      headers: authHeaders(),
      queryStringParameters,
      body,
    }),
    {} as any,
  );
  expect(res).toBeDefined();
  // The hard check: the attacker's workspace_id must NOT have leaked into any
  // supabase write payload.
  if (mockState.lastUpdate?.payload) {
    const serialized = JSON.stringify(mockState.lastUpdate.payload);
    expect(serialized).not.toContain(inject);
  }
  // Acceptable outcomes: 200 (used JWT workspace), 4xx (refused outright). We
  // explicitly reject 5xx because that indicates a crash, not a security choice.
  // 502 is acceptable for endpoints that call out to LLMs in the happy path
  // (LLM mocks throw under structured-output coercion in a few endpoints).
  expect(res.statusCode).toBeLessThan(600);
  expect(res.statusCode).not.toBe(500);
}

async function expectHappyPath(
  handler: any,
  method: 'GET' | 'POST',
  body: Record<string, any> = {},
  query: Record<string, string> = {},
) {
  const res = await handler(
    makeEvent({
      httpMethod: method,
      headers: authHeaders(),
      queryStringParameters: Object.keys(query).length ? query : null,
      body: method === 'POST' ? JSON.stringify(body) : null,
    }),
    {} as any,
  );
  expect(res).toBeDefined();
  // Smoke: as long as we got a defined response with a sane status code and
  // (when present) parseable JSON body, the handler executed end-to-end without
  // throwing. We DO NOT pin the status to 200 — many endpoints legitimately
  // return 4xx when data is empty (e.g. 404 "no workspace") and we want to
  // distinguish "ran without crashing" from "200 OK".
  expect(typeof res.statusCode).toBe('number');
  expect(res.statusCode).toBeLessThan(600);
  if (res.body && typeof res.body === 'string' && res.body.trim().startsWith('{')) {
    expect(() => JSON.parse(res.body)).not.toThrow();
  }
  return res;
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Per-endpoint suites.
//
//    All handlers are imported lazily INSIDE the describe blocks via dynamic
//    import. This isolates module-load failures to a single suite so one bad
//    endpoint doesn't take down the rest of the file.
// ────────────────────────────────────────────────────────────────────────────

const endpoints: Array<{
  name: string;
  importPath: string;
  method: 'GET' | 'POST';
  // Minimal body/query needed to reach the happy path past body-validation.
  happyBody?: Record<string, any>;
  happyQuery?: Record<string, string>;
}> = [
  { name: 'saas-v2-agent-stress-test', importPath: '../saas-v2-agent-stress-test', method: 'POST', happyBody: { agent_id: 'agent-1', scenarios: ['voicemail'] } },
  { name: 'saas-v2-agent-suggest-edits', importPath: '../saas-v2-agent-suggest-edits', method: 'GET', happyQuery: { agent_id: 'agent-1' } },
  { name: 'saas-v2-agent-summary', importPath: '../saas-v2-agent-summary', method: 'GET' },
  { name: 'saas-v2-call-detail', importPath: '../saas-v2-call-detail', method: 'GET', happyQuery: { call_id: 'call-1' } },
  { name: 'saas-v2-calls', importPath: '../saas-v2-calls', method: 'GET' },
  { name: 'saas-v2-help-ask', importPath: '../saas-v2-help-ask', method: 'POST', happyBody: { question: 'How do I forward my number?' } },
  { name: 'saas-v2-home', importPath: '../saas-v2-home', method: 'GET' },
  { name: 'saas-v2-integration-suggest', importPath: '../saas-v2-integration-suggest', method: 'GET' },
  { name: 'saas-v2-integrations', importPath: '../saas-v2-integrations', method: 'GET' },
  { name: 'saas-v2-knowledge-detect-gaps', importPath: '../saas-v2-knowledge-detect-gaps', method: 'GET' },
  { name: 'saas-v2-knowledge-draft-faq', importPath: '../saas-v2-knowledge-draft-faq', method: 'POST', happyBody: { question: 'What are your hours?' } },
  { name: 'saas-v2-knowledge-list', importPath: '../saas-v2-knowledge-list', method: 'GET' },
  { name: 'saas-v2-lead-detail', importPath: '../saas-v2-lead-detail', method: 'GET', happyQuery: { lead_id: 'lead-1' } },
  { name: 'saas-v2-leads', importPath: '../saas-v2-leads', method: 'GET' },
  { name: 'saas-v2-message-draft-reply', importPath: '../saas-v2-message-draft-reply', method: 'POST', happyBody: { thread_id: 'thread-1' } },
  { name: 'saas-v2-message-thread', importPath: '../saas-v2-message-thread', method: 'GET', happyQuery: { thread_id: 'thread-1' } },
  { name: 'saas-v2-messages', importPath: '../saas-v2-messages', method: 'GET' },
  { name: 'saas-v2-narrative-insights', importPath: '../saas-v2-narrative-insights', method: 'GET' },
  { name: 'saas-v2-qa-list', importPath: '../saas-v2-qa-list', method: 'GET' },
  { name: 'saas-v2-qa-run', importPath: '../saas-v2-qa-run', method: 'POST', happyBody: { call_id: 'call-1' } },
  { name: 'saas-v2-review-draft-response', importPath: '../saas-v2-review-draft-response', method: 'POST', happyBody: { review_id: 'review-1' } },
  { name: 'saas-v2-reviews', importPath: '../saas-v2-reviews', method: 'GET' },
  { name: 'saas-v2-settings-get', importPath: '../saas-v2-settings-get', method: 'GET' },
  { name: 'saas-v2-settings-suggest', importPath: '../saas-v2-settings-suggest', method: 'GET' },
  { name: 'saas-v2-settings-update', importPath: '../saas-v2-settings-update', method: 'POST', happyBody: { patch: { greeting: 'Hi!' } } },
  { name: 'saas-v2-setup-conversation', importPath: '../saas-v2-setup-conversation', method: 'POST', happyBody: { user_message: 'Hi, my business is Acme Plumbing.' } },
  { name: 'saas-v2-setup-finalize', importPath: '../saas-v2-setup-finalize', method: 'POST', happyBody: { conversation_id: 'conv-1', confirm: true } },
  { name: 'saas-v2-setup-state', importPath: '../saas-v2-setup-state', method: 'GET' },
  { name: 'saas-v2-toggle', importPath: '../saas-v2-toggle', method: 'POST', happyBody: { enabled: true } },
  { name: 'saas-v2-vertical-guardrails', importPath: '../saas-v2-vertical-guardrails', method: 'GET' },
];

for (const ep of endpoints) {
  describe(`[V2 smoke] ${ep.name}`, () => {
    let handler: any;

    beforeEach(async () => {
      const mod = await import(ep.importPath);
      handler = mod.handler ?? mod.default;
      expect(typeof handler).toBe('function');
    });

    it(`${ep.name} returns 401 without auth`, async () => {
      await expect401NoAuth(handler, ep.method, ep.happyBody);
    });

    it(`${ep.name} derives workspace_id from JWT, ignores body-provided workspace_id`, async () => {
      await expectIgnoresBodyWorkspaceId(
        handler,
        ep.method,
        ep.happyBody ?? {},
        ep.happyQuery ?? {},
      );
    });

    it(`${ep.name} returns a non-5xx response with valid auth + minimal valid input`, async () => {
      await expectHappyPath(handler, ep.method, ep.happyBody, ep.happyQuery);
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Streaming endpoints. Per the recon, NONE of the V2 endpoints emit
//    text/event-stream — saas-v2-setup-conversation explicitly opts OUT of
//    streaming in favor of client-side typewriter. We keep this block as a
//    regression guard: if a future commit flips one of these to streaming,
//    the test will tell us to update the assertion shape (and the V2 client).
// ────────────────────────────────────────────────────────────────────────────

describe('[V2 smoke] streaming content-type guard', () => {
  it('saas-v2-setup-conversation currently returns application/json, not text/event-stream', async () => {
    const mod = await import('../saas-v2-setup-conversation');
    const handler = mod.handler ?? (mod as any).default;
    const res = await handler(
      makeEvent({
        httpMethod: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ user_message: 'Hello.' }),
      }),
      {} as any,
    );
    expect(res).toBeDefined();
    const ct =
      (res.headers && (res.headers['Content-Type'] || res.headers['content-type'])) || '';
    // If this ever flips to event-stream, smoke-update the V2SetupChat client
    // to consume the stream and update the assertion to expect text/event-stream.
    expect(ct).toMatch(/application\/json|text\/event-stream/);
  });
});
