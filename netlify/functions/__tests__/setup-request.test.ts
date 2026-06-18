import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

vi.mock('../_shared/notify', () => ({
  notifyInfo: vi.fn(),
}));

function makeEvent(body: Record<string, unknown>, headers: Record<string, string> = { origin: 'https://boltcall.org' }) {
  return {
    httpMethod: 'POST',
    headers,
    body: JSON.stringify(body),
    path: '/.netlify/functions/setup-request',
  } as any;
}

describe('setup-request', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.URL = 'https://boltcall.org';
    process.env.SETUP_REQUEST_FULFILLMENT_WEBHOOK_URL = 'https://automation.example/setup';
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';

    mocks.single.mockResolvedValue({
      data: { id: 'setup-1', offer_slug: 'after-hours-lead-rescue' },
      error: null,
    });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.getServiceSupabase.mockReturnValue({
      from: vi.fn(() => ({ insert: mocks.insert, update: mocks.update })),
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => 'ok' });
  });

  it('creates a setup request and hands it off to fulfillment automation', async () => {
    const { testHandler: handler } = await import('../setup-request');

    const res = await handler(
      makeEvent({
        offerSlug: 'after-hours-lead-rescue',
        pagePath: '/after-hours-lead-rescue',
        smsConsent: true,
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

    expect(res.statusCode).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      offer_slug: 'after-hours-lead-rescue',
      business_name: 'Blue Star HVAC',
      contact_email: 'jordan@example.com',
      automation_status: 'queued',
    }));
    expect(global.fetch).toHaveBeenCalledWith(
      'https://automation.example/setup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-secret': 'test-internal-secret',
        }),
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      automation_status: 'sent',
      automation_error: null,
    }));
  });

  it('automatically hands off to the internal fulfillment webhook when no external webhook is configured', async () => {
    delete process.env.SETUP_REQUEST_FULFILLMENT_WEBHOOK_URL;
    delete process.env.LEAD_MAGNET_SETUP_WEBHOOK_URL;
    const { testHandler: handler } = await import('../setup-request');

    const res = await handler(
      makeEvent({
        offerSlug: 'automatic-reviews-agent',
        pagePath: '/automatic-reviews-agent',
        smsConsent: true,
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

    expect(res.statusCode).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      fulfillment_webhook_configured: true,
    }));
    expect(global.fetch).toHaveBeenCalledWith(
      'https://boltcall.org/.netlify/functions/setup-request-fulfillment',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-secret': 'test-internal-secret',
        }),
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      automation_status: 'sent',
      automation_error: null,
    }));
  });

  it('keeps the saved request and alerts internally when the automation webhook fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => 'bad gateway' });
    const { notifyInfo } = await import('../_shared/notify');
    const { testHandler: handler } = await import('../setup-request');

    const res = await handler(
      makeEvent({
        offerSlug: 'reminders-agent',
        pagePath: '/reminders-agent',
        smsConsent: true,
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

    expect(res.statusCode).toBe(201);
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Fulfillment handoff failed'));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      automation_status: 'failed',
      automation_error: expect.stringContaining('Fulfillment webhook failed'),
    }));
  });
});
