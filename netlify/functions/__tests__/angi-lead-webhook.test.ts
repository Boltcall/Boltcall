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

import { testHandler as handler } from '../angi-lead-webhook';

function makeEvent(body: Record<string, any>, headers: Record<string, string> = { authorization: 'Bearer bc_test' }) {
  return {
    httpMethod: 'POST',
    headers,
    queryStringParameters: null,
    body: JSON.stringify(body),
  } as any;
}

describe('angi-lead-webhook', () => {
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

  it('captures an Angi lead with normalized contact fields and idempotency metadata', async () => {
    const res = await handler(makeEvent({
      leadId: 'angi-123',
      firstName: 'Jane',
      lastName: 'Homeowner',
      email: 'jane@example.com',
      phoneNumber: '+15551234567',
      projectType: 'Roof repair',
      zipCode: '78701',
      city: 'Austin',
      state: 'TX',
      message: 'Need help this week',
    }), {} as any);

    expect(res.statusCode).toBe(201);
    expect(mocks.handleInboundLead).toHaveBeenCalledWith(
      {
        body: expect.objectContaining({
          user_id: 'user-1',
          source: 'angi',
          external_id: 'angi-123',
          idempotency_key: 'angi:angi-123',
          first_name: 'Jane',
          last_name: 'Homeowner',
          email: 'jane@example.com',
          phone: '+15551234567',
          notes: expect.stringContaining('Roof repair'),
          raw_source: expect.objectContaining({ leadId: 'angi-123' }),
        }),
        source: 'angi',
      },
      expect.any(Object),
    );
  });

  it('rejects requests without a valid Boltcall API key', async () => {
    mocks.authenticateApiKey.mockResolvedValue({ hasKey: false, userId: null });

    const res = await handler(makeEvent({ email: 'jane@example.com' }, {}), {} as any);

    expect(res.statusCode).toBe(401);
    expect(mocks.handleInboundLead).not.toHaveBeenCalled();
  });
});
