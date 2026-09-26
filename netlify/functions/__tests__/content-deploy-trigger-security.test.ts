import { beforeEach, describe, expect, it, vi } from 'vitest';

// F106: content-deploy-trigger has no auth path and, unauthenticated, forces
// a real production Netlify build. It must require the same authorizeRunner
// gate (Netlify schedule invocation, or x-cron-secret / founder JWT) as
// every sibling scheduled runner before touching GitHub/Netlify APIs.

describe('content-deploy-trigger auth gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_KEY;
    process.env.NETLIFY_AUTH_TOKEN = 'test-netlify-token';
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects a plain unauthenticated request before calling GitHub/Netlify APIs', async () => {
    const trigger = (await import('../content-deploy-trigger')).default;

    const res = await trigger(new Request('https://boltcall.org/.netlify/functions/content-deploy-trigger'));

    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('allows Netlify scheduled invocations (x-netlify-event-source: schedule) through the auth gate', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      text: async () => '',
    });

    const trigger = (await import('../content-deploy-trigger')).default;
    const req = new Request('https://boltcall.org/.netlify/functions/content-deploy-trigger', {
      headers: { 'x-netlify-event-source': 'schedule' },
    });
    const res = await trigger(req);

    // Passes the auth gate and proceeds to the real logic (which then calls
    // fetch for the GitHub sha + Netlify deploys lookup).
    expect(res.status).not.toBe(401);
    expect(fetch).toHaveBeenCalled();
  });
});
