import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertOwnerMock = vi.hoisted(() => vi.fn(async () => true));
const notifyErrorMock = vi.hoisted(() => vi.fn(async () => {}));
const notifyInfoMock = vi.hoisted(() => vi.fn(async () => {}));
const getSupabaseMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn(async () => ({ allowed: true })));

vi.mock('../_shared/notify', () => ({ alertOwner: alertOwnerMock, notifyError: notifyErrorMock, notifyInfo: notifyInfoMock }));
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: getSupabaseMock }));
vi.mock('../_shared/public-rate-limit', () => ({
  consumePublicRateLimit: rateLimitMock,
  getClientIp: () => '1.2.3.4',
  hashRateLimitKey: (p: string[]) => p.join('|'),
}));

type Insert = { table: string; row: Record<string, unknown> };

function fakeSupabase(inserts: Insert[], opts: { leadError?: unknown } = {}) {
  return {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          const error = table === 'website_leads' ? opts.leadError ?? null : null;
          const result = { data: error ? null : { id: 42 }, error };
          return { select: () => ({ maybeSingle: async () => result }), then: (r: any) => Promise.resolve({ error }).then(r) };
        },
      };
    },
  };
}

const post = (body: unknown, origin = 'https://boltcall.org') =>
  ({ httpMethod: 'POST', headers: { origin }, body: typeof body === 'string' ? body : JSON.stringify(body) }) as any;

describe('free-tool-lead', () => {
  let inserts: Insert[];
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    inserts = [];
    getSupabaseMock.mockReturnValue(fakeSupabase(inserts));
    fetchMock.mockReset().mockResolvedValue({ status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('saves the lead, forwards the form to the tool webhook and logs the run', async () => {
    const { testHandler } = await import('../free-tool-lead');
    const form = { business_name: 'Acme Roofing', email: 'Owner@Acme.com ', phone: '5125550100', website_url: 'acme.com', industry: 'roofing' };
    const res: any = await testHandler(post({ tool: 'ai_audit', form }), {} as any, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, forwarded: true });
    expect(inserts[0]).toEqual({
      table: 'website_leads',
      row: { email: 'owner@acme.com', name: null, company_name: 'Acme Roofing', url: 'acme.com', phone: '5125550100', industry: 'roofing', source: 'ai_audit' },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/ai-audit');
    expect(JSON.parse(init.body)).toEqual(form);
    expect(inserts[1]).toMatchObject({
      table: 'aios_event_log',
      row: { loop_name: 'free_tools', event_type: 'tool_lead', channel: 'ai_audit', outcome: 'forwarded', subject_id: '42' },
    });
    expect(alertOwnerMock).not.toHaveBeenCalled();
  });

  it('still answers ok when n8n is down, and emails Noam the lead to fulfil by hand', async () => {
    fetchMock.mockResolvedValue({ status: 404 });
    const { testHandler } = await import('../free-tool-lead');
    const res: any = await testHandler(post({ tool: 'seo_aeo_audit', form: { url: 'https://x.com', email: 'a@b.co' } }), {} as any, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, forwarded: false });
    expect(inserts.find((i) => i.table === 'aios_event_log')?.row).toMatchObject({ outcome: 'forward_failed', payload: { n8n_status: 404 } });
    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
    const [, founder, subject, lines] = alertOwnerMock.mock.calls[0] as any[];
    expect(founder).toBe('a836439d-7ca3-44ed-8064-f759c1ea391e');
    expect(subject).toMatch(/^Free tool lead needs a manual report/);
    expect(lines).toEqual(expect.arrayContaining(['Email: a@b.co', 'Website: https://x.com']));
  });

  it('treats a network error like a failed forward', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    const { testHandler } = await import('../free-tool-lead');
    const res: any = await testHandler(post({ tool: 'business_audit', form: { url: 'x.com', email: 'a@b.co' } }), {} as any, vi.fn());
    expect(JSON.parse(res.body)).toEqual({ ok: true, forwarded: false });
    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
  });

  it('forwards even when the lead save fails, and only errors if both fail', async () => {
    getSupabaseMock.mockReturnValue(fakeSupabase(inserts, { leadError: { message: 'db down' } }));
    const { testHandler } = await import('../free-tool-lead');
    const ok: any = await testHandler(post({ tool: 'niche_tool', form: { email: 'a@b.co' } }), {} as any, vi.fn());
    expect(ok.statusCode).toBe(200);
    expect(notifyErrorMock).toHaveBeenCalledWith('free-tool-lead: lead save failed', 'db down', expect.any(Object));

    fetchMock.mockResolvedValue({ status: 500 });
    const bad: any = await testHandler(post({ tool: 'niche_tool', form: { email: 'a@b.co' } }), {} as any, vi.fn());
    expect(bad.statusCode).toBe(500);
  });

  it.each([
    ['unknown tool', { tool: 'evil', form: { email: 'a@b.co' } }, 400],
    ['a URL instead of a tool', { tool: 'https://attacker.example/hook', form: { email: 'a@b.co' } }, 400],
    ['bad email', { tool: 'ai_audit', form: { email: 'nope' } }, 400],
    ['missing form', { tool: 'ai_audit' }, 400],
    ['array body', [], 400],
    ['broken JSON', '{', 400],
  ])('rejects %s without saving or forwarding', async (_l, body, status) => {
    const { testHandler } = await import('../free-tool-lead');
    const res: any = await testHandler(post(body), {} as any, vi.fn());
    expect(res.statusCode).toBe(status);
    expect(inserts).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversize bodies and foreign origins', async () => {
    const { testHandler } = await import('../free-tool-lead');
    const big: any = await testHandler(post({ tool: 'ai_audit', form: { email: 'a@b.co', x: 'y'.repeat(25_000) } }), {} as any, vi.fn());
    expect(big.statusCode).toBe(413);
    const foreign: any = await testHandler(post({ tool: 'ai_audit', form: { email: 'a@b.co' } }, 'https://evil.example'), {} as any, vi.fn());
    expect(foreign.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honors the rate limit', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, statusCode: 429, retryAfterSeconds: 60 } as any);
    const { testHandler } = await import('../free-tool-lead');
    const res: any = await testHandler(post({ tool: 'ai_audit', form: { email: 'a@b.co' } }), {} as any, vi.fn());
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('60');
    expect(inserts).toHaveLength(0);
  });
});
