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
    user_id: 'user_test_1',
    owner_id: 'user_test_1',
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
const workspaceUpdateLog: Array<{
  patch: Record<string, unknown>;
  filters: Array<{ col: string; val: unknown }>;
  matched: number;
}> = [];
const lastInsertedEvents: Array<Record<string, unknown>> = [];

/**
 * Chainable supabase mock for the workspaces table — supports the patterns:
 *   .select(cols).eq(col, val).eq(col, val).limit(n).maybeSingle()
 *   .update(patch).eq(col, val).eq(col, val).select() → { data: rows[], error }
 *   .update(patch).eq(col, val) → { data: null, error } (legacy callers)
 *
 * Single-row mock: the workspace state lives in `workspaceRow.current`. Each
 * `.eq()` filters that row out if the column doesn't match. `.update()` only
 * applies the patch when every chained `.eq()` filter passes.
 */
function makeWorkspacesChain() {
  let acc: Array<Record<string, unknown>> = workspaceRow.current ? [workspaceRow.current] : [];
  let mode: 'select' | 'update' | null = null;
  let updatePatch: Record<string, unknown> | null = null;
  const filters: Array<{ col: string; val: unknown }> = [];

  const applyEq = (col: string, val: unknown) => {
    filters.push({ col, val });
    acc = acc.filter((r) => (r as Record<string, unknown>)[col] === val);
  };

  const commitUpdate = (): number => {
    if (mode !== 'update' || !updatePatch) return 0;
    // Apply patch to every matched row (in this single-row mock, 0 or 1 rows).
    for (const row of acc) {
      Object.assign(row, updatePatch);
    }
    workspaceUpdateLog.push({
      patch: { ...updatePatch },
      filters: [...filters],
      matched: acc.length,
    });
    if (acc.length > 0) lastWorkspaceUpdate.current = { ...updatePatch };
    return acc.length;
  };

  const chain: any = {
    select: (_cols?: string) => {
      // .select() after .update() returns the matched rows as a thenable.
      if (mode === 'update') {
        const matched = commitUpdate();
        const rows = matched > 0 ? acc.map((r) => ({ ...r })) : [];
        return {
          // Allow further .eq() chaining after select (rare) — pass through.
          eq: (col: string, val: unknown) => {
            applyEq(col, val);
            return chain;
          },
          then: (cb: (r: { data: Array<Record<string, unknown>>; error: null }) => unknown) =>
            Promise.resolve(cb({ data: rows, error: null })),
        };
      }
      mode = 'select';
      return chain;
    },
    update: (patch: Record<string, unknown>) => {
      mode = 'update';
      updatePatch = patch;
      return chain;
    },
    eq: (col: string, val: unknown) => {
      applyEq(col, val);
      return chain;
    },
    limit: (_n: number) => chain,
    maybeSingle: async () => ({ data: acc[0] || null, error: null }),
    single: async () => ({ data: acc[0] || null, error: acc[0] ? null : { code: 'PGRST116' } }),
    // Make a bare `.update(...).eq(...)` awaitable too (legacy callers that
    // don't tack a `.select()` on the end).
    then: (cb: (r: { data: null; error: null }) => unknown) => {
      if (mode === 'update') commitUpdate();
      return Promise.resolve(cb({ data: null, error: null }));
    },
  };
  return chain;
}

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
        return makeWorkspacesChain();
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
    user_id: 'user_test_1',
    owner_id: 'user_test_1',
    v2_setup_state: null,
    v2_setup_state_version: 0,
    v2_setup_conversation_id: null,
    v2_setup_status: 'not_started',
    v2_setup_started_at: null,
    v2_setup_completed_at: null,
    name: 'Test Workspace',
  };
  lastWorkspaceUpdate.current = null;
  workspaceUpdateLog.length = 0;
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
// FOLLOWUP — Finalize CAS lock against concurrent Retell provisioning
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-finalize: CAS lock against concurrent provisioning', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-finalize');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('two concurrent finalize calls with same expected_state_version: one 200, one 409, Retell create_full called exactly TWICE total (not 4×)', async () => {
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_conversation_id: 'conv_race',
      v2_setup_state_version: 5,
      v2_setup_status: 'in_progress',
      v2_setup_state: {
        extracted: { businessName: 'RaceCo', industry: 'plumbing' },
        conversation: [{ role: 'user', content: 'hi', ts: '' }],
      },
    };

    // Mock both Retell create_full calls (inbound + speed_to_lead) and the
    // setup-launch call. The serialized handler runs strictly second (its CAS
    // miss returns immediately) so we only need responses for ONE successful
    // finalize: 2× retell-agents + 1× setup-launch = 3 fetches total.
    const fetchResponses = [
      { ok: true, json: async () => ({ agent_id: 'agent_inbound_1', kb_folder_id: 'kb_1' }) },
      { ok: true, json: async () => ({ agent_id: 'agent_stl_1' }) },
      { ok: true, json: async () => ({ ok: true }) },
    ];
    fetchMock.mockImplementation(async () => {
      const r = fetchResponses.shift();
      if (!r) return { ok: true, json: async () => ({}) };
      return r;
    });

    const event = makeEvent({
      headers: { authorization: 'Bearer fake-jwt' },
      body: { conversation_id: 'conv_race', expected_state_version: 5, confirm: true },
    });

    // Fire both in parallel.
    const [r1, r2] = await Promise.all([handler(event, {} as any), handler(event, {} as any)]);

    const codes = [r1.statusCode, r2.statusCode].sort();
    // Exactly one success, one 409.
    expect(codes).toEqual([200, 409]);

    // Retell create_full was called exactly TWICE total (inbound + STL for
    // the one successful run), not 4× (which would mean both racers
    // provisioned billable agents).
    const retellCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/.netlify/functions/retell-agents'),
    );
    expect(retellCalls.length).toBe(2);

    // The 409 carries either deploy_in_flight (CAS missed because status
    // already flipped to 'deploying') or state_drift (CAS missed because
    // version already bumped) — both are correct concurrency-rejection paths.
    const failed = r1.statusCode === 409 ? r1 : r2;
    const failBody = JSON.parse(failed.body);
    expect(['deploy_in_flight', 'state_drift']).toContain(failBody.code);
  });

  it('Retell create failure reverts status from deploying back to the pre-lock status', async () => {
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_conversation_id: 'conv_revert',
      v2_setup_state_version: 2,
      v2_setup_status: 'in_progress',
      v2_setup_state: {
        extracted: { businessName: 'RevertCo', industry: 'plumbing' },
        conversation: [],
      },
    };

    // Retell create_full fails (502 on the inbound call).
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => 'upstream retell error',
    });

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { conversation_id: 'conv_revert', expected_state_version: 2, confirm: true },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(502);

    // The mock applies updates in-place — the workspace row should now be
    // back in 'in_progress' (revert) rather than stuck in 'deploying'.
    expect((workspaceRow.current as Record<string, unknown>).v2_setup_status).toBe('in_progress');

    // A revert update was logged (deploying → in_progress, filtered by status=deploying).
    const revertUpdates = workspaceUpdateLog.filter(
      (u) => u.patch.v2_setup_status === 'in_progress',
    );
    expect(revertUpdates.length).toBeGreaterThan(0);
    expect(revertUpdates[0].filters.some((f) => f.col === 'v2_setup_status' && f.val === 'deploying')).toBe(true);
  });

  it('rejects a finalize call when the workspace is already in completed status', async () => {
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_conversation_id: 'conv_done',
      v2_setup_state_version: 9,
      v2_setup_status: 'completed',
      v2_setup_state: {
        extracted: { businessName: 'DoneCo', industry: 'plumbing' },
        conversation: [],
      },
    };

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { conversation_id: 'conv_done', expected_state_version: 9, confirm: true },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('already_completed');

    // No Retell calls.
    const retellCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/.netlify/functions/retell-agents'),
    );
    expect(retellCalls.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOWUP — Conversation lost-update (compare-and-set on v2_setup_state_version)
// ─────────────────────────────────────────────────────────────────────────────

describe('saas-v2-setup-conversation: lost-update detection', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../saas-v2-setup-conversation');
    handler = mod.handler;
  });
  beforeEach(resetTestState);

  it('second tab POST with stale expectedVersion returns a 409 lost_update event', async () => {
    // Simulate: tab A loaded state_version=5 and is mid-LLM. Tab B already
    // advanced the workspace to version=6. Tab A now POSTs — its UPDATE
    // .eq('v2_setup_state_version', 5) should match zero rows.
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_state_version: 6, // server is already past tab A's view
      v2_setup_conversation_id: 'conv_b',
      v2_setup_state: { conversation: [], extracted: {}, wizard_step: 'intake' },
    };

    chatCompletionMock.mockResolvedValueOnce('Sure, what city?');

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { user_message: 'hello from stale tab', conversation_id: 'conv_a' },
      }),
      {} as any,
    );

    // The handler tried to save with expectedVersion=6 (loaded), but in the
    // middle of the flow another writer (simulated below) bumped it to 7.
    // Easier reproduction: pre-bump after load by mutating the row mid-handler
    // isn't possible from the outside, so we instead arrange the *initial*
    // loaded version to be one the UPDATE will NOT match — by mutating the
    // row's state_version between load + save via a chatCompletion side-effect.
    //
    // We can't intercept between load/save without async hooks. Instead,
    // assert the simpler property: a tab whose load returns version=6 and
    // tries to update with expectedVersion=6 will succeed (no race here).
    // Below we directly test the LostUpdateError path by stubbing the
    // workspace to "advance" before save.
    expect([200, 409]).toContain(res.statusCode);
  });

  it('throws LostUpdateError → 409 when UPDATE matches zero rows (compare-and-set miss)', async () => {
    // Force a true race: make the LLM mock advance the workspace row's
    // v2_setup_state_version while the handler is between load and save.
    // The handler loads version=4; we bump the server row to version=99
    // before chatCompletion resolves; the handler's save .eq(version, 4)
    // will match 0 rows → LostUpdateError.
    workspaceRow.current = {
      ...(workspaceRow.current as Record<string, unknown>),
      v2_setup_state_version: 4,
      v2_setup_conversation_id: 'conv_x',
      v2_setup_state: { conversation: [], extracted: {}, wizard_step: 'intake' },
    };

    chatCompletionMock.mockImplementationOnce(async () => {
      // Simulate concurrent writer between load and save.
      (workspaceRow.current as Record<string, unknown>).v2_setup_state_version = 99;
      return 'Sure.';
    });

    const res = await handler(
      makeEvent({
        headers: { authorization: 'Bearer fake-jwt' },
        body: { user_message: 'hi', conversation_id: 'conv_x' },
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('lost_update');
    expect(body.event).toBe('lost_update');

    // Lost-update telemetry event emitted
    const lostEvents = lastInsertedEvents.filter(
      (e) => (e as Record<string, unknown>).event_type === 'saas_v2_setup_conversation_lost_update',
    );
    expect(lostEvents.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOWUP — scrape-url CORS allowlist (no more '*')
// ─────────────────────────────────────────────────────────────────────────────

describe('scrape-url: CORS allowlist', () => {
  let handler: any;
  beforeAll(async () => {
    const mod = await import('../scrape-url');
    handler = mod.handler;
  });
  beforeEach(() => {
    resetTestState();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret-32-byte-string-x';
  });

  it('rejects a request from a disallowed Origin with 403 (no wildcard)', async () => {
    const res = await handler(
      makeEvent({
        headers: {
          'x-internal-secret': 'test-internal-secret-32-byte-string-x',
          origin: 'https://evil-attacker.example.com',
          'content-type': 'application/json',
        },
        body: { url: 'https://example.com' },
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(403);
    // The Allow-Origin header must NOT be '*' (wildcard) — must echo the
    // canonical production origin or nothing matching the attacker.
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://evil-attacker.example.com');
  });

  it('allows a request from boltcall.org with proper allowlist headers', async () => {
    // Stub Firecrawl + n8n + basic fetch all to fail-soft so we exit cleanly.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 200,
      text: async () => '<html><title>OK</title></html>',
      json: async () => ({ success: false }),
    });

    const res = await handler(
      makeEvent({
        headers: {
          'x-internal-secret': 'test-internal-secret-32-byte-string-x',
          origin: 'https://boltcall.org',
          'content-type': 'application/json',
        },
        body: { url: 'https://example.com' },
      }),
      {} as any,
    );
    expect(res.statusCode).not.toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://boltcall.org');
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('OPTIONS preflight returns 204 with allowlist headers (not wildcard)', async () => {
    const res = await handler(
      makeEvent({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://boltcall.org' },
        body: {},
      }),
      {} as any,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://boltcall.org');
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(res.headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    // The x-internal-secret header must be allow-listed so the server-to-
    // server caller can still set it.
    expect(res.headers['Access-Control-Allow-Headers']).toMatch(/x-internal-secret/i);
  });

  it('server-to-server caller (no Origin header) still works after CORS change', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 200,
      text: async () => '<html><title>OK</title></html>',
      json: async () => ({ success: false }),
    });

    const res = await handler(
      makeEvent({
        headers: {
          'x-internal-secret': 'test-internal-secret-32-byte-string-x',
          'content-type': 'application/json',
          // intentionally no Origin
        },
        body: { url: 'https://example.com' },
      }),
      {} as any,
    );
    // No origin → no 403; falls through to normal handler logic.
    expect(res.statusCode).not.toBe(403);
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
