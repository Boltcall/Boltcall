import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateApiKey: vi.fn(),
  handleInboundLead: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock('../_shared/validate-api-key', () => ({
  authenticateApiKey: mocks.authenticateApiKey,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: mocks.getSupabase,
}));

vi.mock('../_shared/lead-response-service', () => ({
  handleInboundLead: mocks.handleInboundLead,
}));

vi.mock('retell-sdk', () => ({
  default: vi.fn(),
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: vi.fn(),
}));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

import { handler } from '../callrail-lead-webhook';

function makeEvent(body: Record<string, any>, headers: Record<string, string> = { authorization: 'Bearer bc_test' }) {
  return {
    httpMethod: 'POST',
    headers,
    queryStringParameters: null,
    body: JSON.stringify(body),
  } as any;
}

describe('callrail-lead-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateApiKey.mockResolvedValue({ hasKey: true, userId: 'user-1' });
    mocks.getSupabase.mockReturnValue({ from: vi.fn() });
    mocks.handleInboundLead.mockResolvedValue({
      status: 'captured',
      lead_id: 'lead-1',
      first_touch_status: 'started',
      retell_call_started: true,
      events_emitted: ['lead_captured'],
      warnings: [],
      lead: { id: 'lead-1' },
    });
  });

  it('captures a CallRail call lead with normalized caller and attribution details', async () => {
    const res = await handler(makeEvent({
      id: 'cal-123',
      customer_name: 'Jane Homeowner',
      customer_phone_number: '+15551234567',
      customer_city: 'Austin',
      customer_state: 'TX',
      tracking_number: '+15125550100',
      source_name: 'Google Local Services Ads',
      campaign: 'Emergency HVAC',
      keywords: 'ac repair near me',
      landing_page_url: 'https://boltcall.org/hvac',
      note: 'Needs a same-day appointment',
    }), {} as any);

    expect(res.statusCode).toBe(201);
    expect(mocks.handleInboundLead).toHaveBeenCalledWith(
      {
        body: expect.objectContaining({
          user_id: 'user-1',
          source: 'callrail',
          external_id: 'cal-123',
          idempotency_key: 'callrail:cal-123',
          name: 'Jane Homeowner',
          phone: '+15551234567',
          notes: expect.stringContaining('Google Local Services Ads'),
          raw_source: expect.objectContaining({ id: 'cal-123' }),
        }),
        source: 'callrail',
      },
      expect.any(Object),
    );
  });

  it('captures a CallRail form lead when only email is present', async () => {
    const res = await handler(makeEvent({
      form_submission_id: 'form-789',
      name: 'Pat Prospect',
      email: 'pat@example.com',
      form_name: 'Book a demo',
      referring_url: 'https://boltcall.org/pricing',
      message: 'Interested in instant lead response',
    }), {} as any);

    expect(res.statusCode).toBe(201);
    expect(mocks.handleInboundLead).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          external_id: 'form-789',
          idempotency_key: 'callrail:form-789',
          name: 'Pat Prospect',
          email: 'pat@example.com',
          notes: expect.stringContaining('Book a demo'),
        }),
      }),
      expect.any(Object),
    );
  });

  it('rejects requests without a valid Boltcall API key', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ hasKey: false, userId: null });

    const res = await handler(makeEvent({ customer_phone_number: '+15551234567' }, {}), {} as any);

    expect(res.statusCode).toBe(401);
    expect(mocks.handleInboundLead).not.toHaveBeenCalled();
  });
});
