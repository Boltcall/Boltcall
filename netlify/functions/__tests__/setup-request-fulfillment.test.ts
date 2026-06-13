import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_shared/notify', () => ({
  notifyInfo: vi.fn(),
}));

function makeEvent(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: JSON.stringify(body),
    path: '/.netlify/functions/setup-request-fulfillment',
  } as any;
}

describe('setup-request-fulfillment', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    delete process.env.INTERNAL_WEBHOOK_SECRET;
  });

  it('rejects public calls without the internal secret', async () => {
    const { handler } = await import('../setup-request-fulfillment');

    const res = await handler(
      makeEvent({
        request_id: 'setup-1',
        offer_slug: 'after-hours-lead-rescue',
        page_path: '/after-hours-lead-rescue',
        sms_consent: true,
        fields: {
          businessName: 'Blue Star HVAC',
          contactName: 'Jordan Lee',
          email: 'jordan@example.com',
          phone: '+15551234567',
          businessPhone: '+15557654321',
        },
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(401);
  });

  it('accepts a setup request handoff and notifies fulfillment', async () => {
    const { notifyInfo } = await import('../_shared/notify');
    const { handler } = await import('../setup-request-fulfillment');

    const res = await handler(
      makeEvent(
        {
          request_id: 'setup-1',
          offer_slug: 'automatic-reviews-agent',
          page_path: '/automatic-reviews-agent',
          sms_consent: true,
          fields: {
            businessName: 'Blue Star HVAC',
            contactName: 'Jordan Lee',
            email: 'jordan@example.com',
            phone: '+15551234567',
            businessPhone: '+15557654321',
          },
          source: 'boltcall_public_setup_offer',
        },
        { 'x-internal-secret': 'test-internal-secret' },
      ),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, status: 'accepted' });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('automatic-reviews-agent'));
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('setup-1'));
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Run one test message'));
  });
});
