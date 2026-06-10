import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelectChain: any = {
  select: vi.fn(() => mockSelectChain),
  eq: vi.fn(() => mockSelectChain),
  then: vi.fn(),
};
const mockSupabase = { from: vi.fn(() => mockSelectChain) };
const mockHandleInboundLead = vi.fn();

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => mockSupabase,
}));

vi.mock('../_shared/lead-response-service', () => ({
  handleInboundLead: (...args: any[]) => mockHandleInboundLead(...args),
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: vi.fn(),
}));

vi.mock('retell-sdk', () => ({
  default: vi.fn(),
}));

import { handler } from '../hubspot-workflow-action';

const rawUrl = 'https://boltcall.org/.netlify/functions/hubspot-workflow-action';

function sign(body: string, timestamp: string) {
  return crypto
    .createHmac('sha256', process.env.HUBSPOT_CLIENT_SECRET || '')
    .update(`POST${rawUrl}${body}${timestamp}`)
    .digest('base64');
}

function makeEvent(payload: Record<string, any>, headers: Record<string, string> = {}) {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  return {
    httpMethod: 'POST',
    rawUrl,
    path: '/.netlify/functions/hubspot-workflow-action',
    body,
    headers: {
      'x-hubspot-request-timestamp': timestamp,
      'x-hubspot-signature-v3': sign(body, timestamp),
      ...headers,
    },
  } as any;
}

describe('hubspot-workflow-action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUBSPOT_CLIENT_SECRET = 'hubspot-secret';
    process.env.RETELL_API_KEY = '';
    mockSelectChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            user_id: 'user-1',
            config: { account: { hub_id: 12345 } },
          },
        ],
        error: null,
      }),
    );
    mockHandleInboundLead.mockResolvedValue({
      status: 'captured',
      lead_id: 'lead-1',
      first_touch_status: 'started',
      retell_call_started: true,
      events_emitted: [],
      warnings: [],
      lead: { id: 'lead-1' },
    });
  });

  it('captures the enrolled HubSpot contact as a Boltcall lead', async () => {
    const res = await handler(
      makeEvent({
        callbackId: 'cb-1',
        origin: { portalId: 12345 },
        context: { workflowId: 99 },
        object: {
          objectId: 777,
          objectType: 'CONTACT',
          properties: {
            email: 'lead@example.com',
            phone: '+19723308408',
            firstname: 'Jane',
            lastname: 'Lead',
          },
        },
        inputFields: { leadSource: 'Quote request' },
      }),
      {} as any,
    );

    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res!.body).outputFields).toMatchObject({
      hs_execution_state: 'SUCCESS',
      boltcall_status: 'captured',
      boltcall_lead_id: 'lead-1',
      first_touch_status: 'started',
    });
    expect(mockHandleInboundLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'hubspot_workflow',
        body: expect.objectContaining({
          user_id: 'user-1',
          email: 'lead@example.com',
          phone: '+19723308408',
          first_name: 'Jane',
          last_name: 'Lead',
          external_id: 'hubspot-contact:12345:777',
        }),
      }),
      expect.objectContaining({ supabase: mockSupabase }),
    );
  });

  it('rejects unsigned HubSpot workflow requests', async () => {
    const res = await handler(
      makeEvent({ origin: { portalId: 12345 } }, { 'x-hubspot-signature-v3': 'bad' }),
      {} as any,
    );

    expect(res?.statusCode).toBe(401);
    expect(mockHandleInboundLead).not.toHaveBeenCalled();
  });

  it('lets HubSpot continue when the portal has no matching Boltcall integration', async () => {
    mockSelectChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));

    const res = await handler(makeEvent({ origin: { portalId: 99999 }, object: { properties: {} } }), {} as any);

    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res!.body).outputFields).toMatchObject({
      hs_execution_state: 'FAIL_CONTINUE',
      boltcall_status: 'integration_not_found',
    });
  });
});
