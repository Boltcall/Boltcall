import { describe, expect, it } from 'vitest';

import {
  resolvePayPalConfig,
  summarizePayPalReadiness,
} from '../verify-paypal-api-readiness.mjs';

describe('verify-paypal-api-readiness helpers', () => {
  it('resolves live credentials by default', () => {
    expect(
      resolvePayPalConfig({
        PAYPAL_CLIENT_ID: 'live-client',
        PAYPAL_CLIENT_SECRET: 'live-secret',
        PAYPAL_SANDBOX_CLIENT_ID: 'sandbox-client',
        PAYPAL_SANDBOX_CLIENT_SECRET: 'sandbox-secret',
      }),
    ).toEqual({
      mode: 'live',
      apiBase: 'https://api-m.paypal.com',
      clientId: 'live-client',
      clientSecret: 'live-secret',
    });
  });

  it('resolves sandbox credentials when PAYPAL_MODE=sandbox', () => {
    expect(
      resolvePayPalConfig({
        PAYPAL_MODE: 'sandbox',
        PAYPAL_CLIENT_ID: 'live-client',
        PAYPAL_CLIENT_SECRET: 'live-secret',
        PAYPAL_SANDBOX_CLIENT_ID: 'sandbox-client',
        PAYPAL_SANDBOX_CLIENT_SECRET: 'sandbox-secret',
      }),
    ).toEqual({
      mode: 'sandbox',
      apiBase: 'https://api-m.sandbox.paypal.com',
      clientId: 'sandbox-client',
      clientSecret: 'sandbox-secret',
    });
  });

  it('summarizes readiness without exposing credentials or access tokens', () => {
    expect(
      summarizePayPalReadiness(
        {
          mode: 'live',
          apiBase: 'https://api-m.paypal.com',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
        {
          access_token: 'token-secret',
          token_type: 'Bearer',
          expires_in: 32000,
        },
      ),
    ).toEqual({
      status: 'passed',
      check: 'paypal_api_readiness',
      mode: 'live',
      apiBase: 'https://api-m.paypal.com',
      hasClientId: true,
      hasClientSecret: true,
      tokenType: 'Bearer',
      expiresInSeconds: 32000,
    });
  });
});
