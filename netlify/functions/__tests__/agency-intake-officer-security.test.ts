import { beforeEach, describe, expect, it, vi } from 'vitest';

// F101: default (mode=run) entrypoint must require authorizeRunner before
// any billed Retell/Anthropic work runs.
// F102: ?mode=webhook must fail closed when the Retell signature header is
// simply absent, not only when it's actively invalid.
//
// run-agent.ts transitively imports router-classifier.ts, which has a
// pre-existing broken `./events` dynamic import unrelated to this batch —
// stub the module so Vite's static import graph never needs to resolve it.
vi.mock('../_shared/agency-agents/run-agent', () => ({
  callClaude: vi.fn(),
  runAgent: vi.fn(),
}));

function makePost(body: Record<string, unknown>, headers: Record<string, string> = {}, qs: Record<string, string> | null = null) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    queryStringParameters: qs,
  } as any;
}

describe('agency-intake-officer auth gates', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.RETELL_API_KEY;
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects unauthenticated default-mode (run) invocations before any Retell/Anthropic work (F101)', async () => {
    const { testHandler: handler } = await import('../agency-intake-officer');

    const res = await handler(
      makePost({ client_id: 'any-uuid', retell_call_id: 'any-call-id' }),
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  }, 30000);

  it('rejects ?mode=webhook when the x-retell-signature header is absent, even though RETELL_API_KEY is unset (F102)', async () => {
    const { testHandler: handler } = await import('../agency-intake-officer');

    const res = await handler(
      makePost({ event: 'call_ended', call: { call_id: 'any-call-id' } }, {}, { mode: 'webhook' }),
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  }, 30000);
});
