import { beforeEach, describe, expect, it, vi } from 'vitest';

const createWebCall = vi.hoisted(() => vi.fn());
let session: Record<string, any>;
vi.mock('retell-sdk', () => ({ default: class { call = { createWebCall }; } }));
vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => ({ from: () => {
    let patch: Record<string, any> | undefined;
    const filters: Record<string, any> = {};
    const result = () => {
      const matches = Object.entries(filters).every(([k, v]) => session[k] === v);
      if (!matches) return { data: null, error: null };
      if (patch) Object.assign(session, patch);
      return { data: { ...session }, error: null };
    };
    const query: any = {
      select: () => query,
      update: (value: Record<string, any>) => { patch = value; return query; },
      insert: (value: Record<string, any>) => { patch = value; return query; },
      eq: (key: string, value: any) => { filters[key] = value; return query; },
      is: (key: string, value: any) => { filters[key] = value; return query; },
      single: async () => result(),
      then: (resolve: any) => Promise.resolve(result()).then(resolve),
    };
    return query;
  } }),
}));
import { testHandler as handler } from '../demo-web-call';
import { testHandler as createSession } from '../demo-session-create';
const invoke = (mode = 'start') => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ demo_id: session.id, mode }) } as any, {} as any, vi.fn());

describe('personalized demo reservation', () => {
  beforeEach(() => {
    session = { id: '11111111-1111-4111-8111-111111111111', business_name: 'Test Intake Law', niche: 'family law', web_call_started_at: null, web_call_count: 0 };
    vi.stubEnv('RETELL_API_KEY', 'test-only-key');
    vi.stubEnv('RETELL_DEMO_AGENT_ID', 'test-only-agent');
    createWebCall.mockReset().mockResolvedValue({ call_id: 'test-call', access_token: 'test-token' });
  });

  it('allows retry after an explicit provider rejection', async () => {
    createWebCall.mockRejectedValueOnce(Object.assign(new Error('provider rejected request'), { status: 429 }));
    expect((await invoke())?.statusCode).toBe(500);
    expect((await invoke())?.statusCode).toBe(200);
    expect(createWebCall).toHaveBeenCalledTimes(2);
  });

  it('traces synthetic intake through saved session, preview, and provider call reservation', async () => {
    vi.stubEnv('DEMO_SESSION_CREATE_SECRET', 'test-create-secret');
    const created = await createSession({ httpMethod: 'POST', headers: { 'x-demo-session-secret': 'test-create-secret' }, body: JSON.stringify({ business_name: 'Test Intake Law', niche: 'family law', location: 'Austin, Texas', services: 'custody consultation' }) } as any, {} as any, vi.fn());
    expect(created?.statusCode).toBe(200);
    expect(JSON.parse(created?.body || '{}').id).toBe(session.id);
    expect(session.services).toBe('custody consultation');
    const preview = await invoke('preview');
    expect(JSON.parse(preview?.body || '{}')).toEqual({ business_name: 'Test Intake Law', already_started: false });
    expect(createWebCall).not.toHaveBeenCalled();
    const started = await invoke();
    expect(JSON.parse(started?.body || '{}').call_id).toBe('test-call');
    expect(createWebCall).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ demo_id: session.id }) }));
    expect(session.web_call_count).toBe(1);
  });

  it('creates only one provider call for concurrent starts', async () => {
    const responses = await Promise.all([invoke(), invoke()]);
    expect(responses.map(r => r?.statusCode).sort()).toEqual([200, 409]);
    expect(createWebCall).toHaveBeenCalledTimes(1);
  });

  it('keeps an uncertain provider failure reserved to avoid a second billable call', async () => {
    createWebCall.mockRejectedValueOnce(new Error('connection lost'));
    expect((await invoke())?.statusCode).toBe(500);
    expect((await invoke())?.statusCode).toBe(409);
    expect(createWebCall).toHaveBeenCalledTimes(1);
  });
});
