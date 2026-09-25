import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseMock = vi.hoisted(() => vi.fn(() => ({})));
const verifyFacebookSignatureMock = vi.hoisted(() => vi.fn(() => 'valid'));
const verifyTwilioSignatureMock = vi.hoisted(() => vi.fn(() => 'valid'));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
  getServiceSupabase: getSupabaseMock,
}));

vi.mock('../_shared/verify-signatures', () => ({
  verifyFacebookSignature: verifyFacebookSignatureMock,
  verifyTwilioSignature: verifyTwilioSignatureMock,
}));

function makeFacebookLeadgenEvent() {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      object: 'page',
      entry: [
        {
          changes: [
            {
              field: 'leadgen',
              value: { leadgen_id: 'lead-123', page_id: 'page-123' },
            },
          ],
        },
      ],
    }),
    queryStringParameters: null,
    path: '/.netlify/functions/lead-webhook',
  } as any;
}

function makeTwilioSmsEvent() {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      From: '+15551234567',
      To: '+15557654321',
      Body: 'hello',
      MessageSid: 'SM123',
    }).toString(),
    queryStringParameters: null,
  } as any;
}

describe('webhook signature fail-closed behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    verifyFacebookSignatureMock.mockReturnValue('valid');
    verifyTwilioSignatureMock.mockReturnValue('valid');
  });

  it('rejects unsigned Facebook leadgen webhooks before touching Supabase', async () => {
    verifyFacebookSignatureMock.mockReturnValue('missing');

    const { testHandler: handler } = await import('../lead-webhook');
    const res = await handler(makeFacebookLeadgenEvent(), {} as any);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toMatch(/signature required/i);
    expect(getSupabaseMock).not.toHaveBeenCalled();
  });

  it('rejects unsigned Twilio inbound SMS webhooks when the Twilio auth token is configured', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'test-twilio-secret');
    verifyTwilioSignatureMock.mockReturnValue('missing');

    const { testHandler: handler } = await import('../twilio-inbound-sms');
    const res = await handler(makeTwilioSmsEvent(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('<Response/>');
  });

  it('rejects unauthenticated ACS inbound-SMS webhooks when no secret is configured, regardless of NODE_ENV (F79/F103)', async () => {
    // No ACS_EVENTGRID_SECRET/AZURE_EVENTGRID_WEBHOOK_SECRET, no NETLIFY_DEV, and NODE_ENV
    // left unset/undefined: this is the real Netlify Lambda case (prod-detect.ts documents
    // that NODE_ENV is NOT reliably 'production' there). Must still fail closed. Explicitly
    // unstub NODE_ENV rather than setting it, so a regression back to the old
    // `NODE_ENV !== 'production'` check (fail-open when unset) would actually fail this test.
    vi.stubEnv('NODE_ENV', undefined);

    const { testHandler: handler } = await import('../acs-inbound-sms');
    const res = await handler(
      {
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify([
          {
            eventType: 'Microsoft.Communication.SMSReceived',
            data: { from: '+15551234567', to: '+15557654321', message: 'stop' },
          },
        ]),
        queryStringParameters: null,
      } as any,
      {} as any
    );

    expect(res.statusCode).toBe(403);
  });
});
