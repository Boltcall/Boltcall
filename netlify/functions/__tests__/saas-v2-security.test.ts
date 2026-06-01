/**
 * V2 setup wizard — security smoke tests covering all 4 fixes:
 *   1. CORS restriction — rejects disallowed origins
 *   2. Secret redaction — strips sk_live_... before persist
 *   3. INTERNAL_API_SECRET fail-closed — scrape tool returns error when unset
 *   4. Finalize version pinning — 409 on state_version mismatch
 *
 * The handlers are intentionally exercised with their full env wiring; only
 * Supabase + the LLM (chatCompletion) are mocked. Network fetches to other
 * Netlify functions (scrape-url, retell-agents, setup-launch) are also mocked
 * via global.fetch so we can assert on outgoing payloads.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ─── Set env before any module imports so module-load reads find them ────────
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.URL = 'https://boltcall.org';

// ── Supabase mock — driven via per-test handles ──────────────────────────────
type Row = Record<string, unknown> | null;

const workspaceRow = {
  // mutable handle the tests reach into
  current: {
    id: 'ws_test_1',
    v2_setup_state: null as Row,
    v2_setup_state_version: 0,
    v2_setup_conversation_id: null as string | null,
    v2_setup_status: 'not_started',
    v2_setup_started_at: null,
    v2_setup_completed_at: null,
    name: 'Test Workspace',
  } as Record<string, unknown>,
};

const lastWorkspaceUpdate = { current: null as Record<string, unknown> | null };
const lastInsertedEvents: Array<Record<string, unknown>> = [];

function makeSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(async (_token: string) => ({
        data: { user: { id: 'user_test_1' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'workspaces') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: unknown) => ({
              limit: (_n: number) => ({
                maybeSingle: async () => ({ data: workspaceRow.current, error: null }),
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => {
            lastWorkspaceUpdate.current = patch;
            return {
              eq: async (_col: string, _val: unknown) => ({ data: null, error: null }),
            };
          },
        };
      }
      if (table === 'aios_event_log') {
        return {
          insert: async (row: Record<string, unknown>) => {
            lastInsertedEvents.push(row);
            return { data: null, error: null };
          },
        };
      }
      if (table === 'business_profiles' || table === 'locations') {
        return {
          select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'bp_1' }, error: null }) }) }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        insert: async () => ({ data: null, error: null }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
      };
    }),
  };
}

const supabaseMock = { current: makeSupabaseMock() };

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseMock.current,
}));

// ── chatCompletion mock — returns whatever the test queued ───────────────────
const chatCompletionMock = vi.fn(async () => 'Got it. What city are you in?');
vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: (...args: unknown[]) => chatCompletionMock(...(args as [])),
}));

// ── fetch mock — used for scrape-url, retell-agents, setup-launch ────────────
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    httpMethod: (overrides.httpMethod as string) || 'POST',
    headers: (overrides.headers as Record<string, string>) || {
      authorization: 'Bearer fake-jwt-token',
      'content-type': 'application/json',
    },
    body: typeof overrides.body === 'string' ? overrides.body : JSON.stringify(overrides.body || {}),
    queryStringParameters: (overrides.queryStringParameters as Record<string, string>) || null,
  } as unknown;
}

function resetTestState() {
  workspaceRow.current = {
    id: 'ws_test_1',
    v2_setup_state: null,
    v2_setup_state_version: 0,
    v2_setup_conversation_id: null,
    v2_setup_status: 'not_started',
    v2_setup_started_at: null,
    v2_setup_completed_at: null,
    name: 'Test Workspace',
  };
  lastWorkspaceUpdate.current = null;
  lastInsertedEvents.length = 0;
  supabaseMock.current = makeSupabaseMock();
  fetchMock.mockReset();
  chatCompletionMock.mockReset();
  chatCompletionMock.mockResolvedValue('Got it. What city are you in?');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1 — CORS restriction
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-conversation: CORS restriction (Fix 1)', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-conversation');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('rejects a request from a disallowed Origin with 403', async () => {
    const res = await handler(
      makeEvent({
        headers: {
          authorization: 'Bearer fake-jwt',
          origin: 'https://evil-attacker.example.com',
        },
        body: { user_message: 'hi' },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(403);
    // Allow-Origin must NOT be the attacker's origin
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://evil-attacker.example.com');
    // Must include Vary: Origin
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('allows a request from boltcall.org', async () => {
    chatCompletionMock.mockResolvedValueOnce('Hello!');
    const res = await handler(
      makeEvent({
        headers: {
          authorization: 'Bearer fake-jwt',
          origin: 'https://boltcall.org',
        },
        body: { user_message: 'hi' },
      }),
      {} as any,
    );
    // 200 (or some allowed status) — the key is it's NOT 403
    expect(res.statusCode).not.toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://boltcall.org');
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('OPTIONS preflight still returns 204 with CORS headers', async () => {
    const res = await handler(
      makeEvent({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://boltcall.org' },
        body: {},
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — Secret redaction
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-conversation: secret redaction (Fix 2)', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-conversation');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('redacts sk_live_... from user_message before persisting to v2_setup_state', async () => {
    chatCompletionMock.mockResolvedValueOnce('Thanks — never share keys in chat though!');
    const secret = 'sk_live_abcdef1234567890ABCDEF12345';
    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: {
          user_message: `My Stripe key is ${secret} for testing`,
        },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(200);

    // Inspect the .update() patch — the persisted JSONB must NOT contain the secret
    const patch = lastWorkspaceUpdate.current;
    expect(patch).toBeTruthy();
    const jsonStr = JSON.stringify(patch);
    expect(jsonStr).not.toContain(secret);
    expect(jsonStr).toContain('[REDACTED]');

    // And a redaction event was emitted
    const redactionEvents = lastInsertedEvents.filter(
      (e) => (e as Record<string, unknown>).event_type === 'saas_v2_setup_secret_redacted',
    );
    expect(redactionEvents.length).toBeGreaterThan(0);
    // ...and the event payload does NOT carry the secret either
    const eventStr = JSON.stringify(redactionEvents[0]);
    expect(eventStr).not.toContain(secret);
    expect(eventStr).toContain('stripe_live_secret');
  });

  it('redacts assistant message containing an echoed secret', async () => {
    const secret = 'EAA1234567890abcdefghijKLMNOP';
    chatCompletionMock.mockResolvedValueOnce(`Just to confirm: ${secret} ?`);
    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { user_message: 'hello' },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Response sent back to the client must also be redacted
    expect(body.assistant_message).not.toContain(secret);
    expect(body.assistant_message).toContain('[REDACTED]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — INTERNAL_API_SECRET fail-closed (callScrapeUrl)
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-conversation: scan_website fails closed without INTERNAL_API_SECRET (Fix 3)', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-conversation');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('emits scan_failed: Configuration error — website scan disabled when env unset', async () => {
    // Make sure it's unset for this test
    const prior = process.env.INTERNAL_API_SECRET;
    delete process.env.INTERNAL_API_SECRET;

    // LLM emits a scan_website tool call on its first turn
    chatCompletionMock.mockResolvedValueOnce(
      'Let me check your site.\n\n```tool\n{"name": "scan_website", "args": {"url": "https://example.com"}}\n```',
    );

    try {
      const res = await handler(
        makeEvent({
          headers: { authorization: 'Bearer fake-jwt' },
          body: { user_message: 'my site is https://example.com' },
        }),
        {} as any,
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.tool).toBeTruthy();
      expect(body.tool.summary).toMatch(/Configuration error/);
      // The fail-closed path must NOT have called scrape-url at all
      const calledScrape = fetchMock.mock.calls.some((c) =>
        String(c[0]).includes('/.netlify/functions/scrape-url'),
      );
      expect(calledScrape).toBe(false);
    } finally {
      if (prior !== undefined) process.env.INTERNAL_API_SECRET = prior;
    }
  });

  it('does call scrape-url when INTERNAL_API_SECRET is set, with the header', async () => {
    process.env.INTERNAL_API_SECRET = 'test-internal-secret-32-byte-string-x';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: 'site content',
        charCount: 12,
        source: 'firecrawl',
        title: 'Example',
      }),
    });
    // ai-extract-kb call (best-effort, returns empty)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ services: [], faqs: [], policies: null }),
    });
    chatCompletionMock.mockResolvedValueOnce(
      'Scanning now.\n\n```tool\n{"name": "scan_website", "args": {"url": "https://example.com"}}\n```',
    );

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { user_message: 'my site is https://example.com' },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(200);

    const scrapeCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/.netlify/functions/scrape-url'),
    );
    expect(scrapeCalls.length).toBe(1);
    const init = scrapeCalls[0][1] as RequestInit;
    const headersObj = init.headers as Record<string, string>;
    expect(headersObj['x-internal-secret']).toBe('test-internal-secret-32-byte-string-x');

    delete process.env.INTERNAL_API_SECRET;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4 — Finalize version pinning
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-finalize: state_version pinning (Fix 4)', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-finalize');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('returns 409 when expected_state_version mismatches current state_version', async () => {
    // Server's current state_version is 7; client thinks it's 5 (stale review).
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_conversation_id: 'conv_abc',
      v2_setup_state_version: 7,
      v2_setup_state: { extracted: { businessName: 'Acme', industry: 'plumbing' } },
    };

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: {
          conversation_id: 'conv_abc',
          expected_state_version: 5,
          confirm: true,
        },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('state_drift');
    // Mismatch event was emitted
    const mismatchEvents = lastInsertedEvents.filter(
      (e) => (e as Record<string, unknown>).event_type === 'saas_v2_setup_finalize_version_mismatch',
    );
    expect(mismatchEvents.length).toBeGreaterThan(0);
  });

  it('returns 409 when conversation_id drifted', async () => {
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_conversation_id: 'conv_NEW',
      v2_setup_state_version: 3,
      v2_setup_state: { extracted: { businessName: 'Acme', industry: 'plumbing' } },
    };

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: {
          conversation_id: 'conv_OLD',
          expected_state_version: 3,
          confirm: true,
        },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(409);
  });

  it('rejects request with missing expected_state_version', async () => {
    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { conversation_id: 'conv_abc', confirm: true },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonus — redact-secrets unit coverage (paranoia about value leakage in events)
// ─────────────────────────────────────────────────────────────────────────────

describe('_shared/redact-secrets', () => {
  it('redacts known patterns and returns the matched pattern names (never the value)', async () => {
    const { redactSecrets } = await import('../_shared/redact-secrets');
    const { redacted, hits } = redactSecrets('my key is sk_live_abcdef1234567890ABCDEF12345');
    expect(redacted).not.toContain('sk_live_abcdef');
    expect(redacted).toContain('[REDACTED]');
    expect(hits).toContain('stripe_live_secret');
  });

  it('returns empty hits for benign input', async () => {
    const { redactSecrets } = await import('../_shared/redact-secrets');
    const { redacted, hits } = redactSecrets('I run a plumbing business in Atlanta.');
    expect(redacted).toBe('I run a plumbing business in Atlanta.');
    expect(hits).toEqual([]);
  });
});
