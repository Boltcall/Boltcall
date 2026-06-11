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

import { handler } from '../housecall-pro-lead-webhook';

function makeEvent(body: Record<string, any>, headers: Record<string, string> = { authorization: 'Bearer bc_test' }) {
  return {
    httpMethod: 'POST',
    headers,
    queryStringParameters: null,
    body: JSON.stringify(body),
  } as any;
}

describe('housecall-pro-lead-webhook', () => {
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

  it('captures a Housecall Pro lead with normalized customer, job, and attribution details', async () => {
    const res = await handler(makeEvent({
      id: 'hcp-lead-123',
      customer: {
        first_name: 'Jane',
        last_name: 'Homeowner',
        email: 'jane@example.com',
        mobile_number: '+15551234567',
        address: { city: 'Austin', state: 'TX', zip: '78701' },
      },
      job: {
        id: 'job-456',
        work_status: 'unscheduled',
        description: 'Emergency HVAC repair',
      },
      lead_source: 'Google Local Services Ads',
      tags: ['emergency', 'hvac'],
    }), {} as any);

    expect(res.statusCode).toBe(201);
    expect(mocks.handleInboundLead).toHaveBeenCalledWith(
      {
        body: expect.objectContaining({
          user_id: 'user-1',
          source: 'housecall_pro',
          external_id: 'hcp-lead-123',
          idempotency_key: 'housecall_pro:hcp-lead-123',
          first_name: 'Jane',
          last_name: 'Homeowner',
          email: 'jane@example.com',
          phone: '+15551234567',
          notes: expect.stringContaining('Emergency HVAC repair'),
          raw_source: expect.objectContaining({ id: 'hcp-lead-123' }),
        }),
        source: 'housecall_pro',
      },
      expect.any(Object),
    );
  });

  it('rejects requests without a valid Boltcall API key', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ hasKey: false, userId: null });

    const res = await handler(makeEvent({ phone: '+15551234567' }, {}), {} as any);

    expect(res.statusCode).toBe(401);
    expect(mocks.handleInboundLead).not.toHaveBeenCalled();
  });
});
