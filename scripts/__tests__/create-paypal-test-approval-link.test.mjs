import assert from 'node:assert/strict';
import { describe, it, vi } from 'vitest';

import {
  buildApprovalLinkEndpoint,
  createPayPalTestApprovalLink,
} from '../create-paypal-test-approval-link.mjs';

describe('create-paypal-test-approval-link helpers', () => {
  it('builds the production internal approval-link endpoint', () => {
    assert.equal(
      buildApprovalLinkEndpoint('https://boltcall.org'),
      'https://boltcall.org/.netlify/functions/create-paypal-test-approval-link',
    );
  });

  it('calls the deployed internal endpoint without exposing PayPal credentials locally', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'passed',
        approvalUrl: 'https://www.paypal.com/checkoutnow?token=ORDER-1',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createPayPalTestApprovalLink({
      SITE_URL: 'https://boltcall.org',
      INTERNAL_API_SECRET: 'internal-secret',
    });

    assert.equal(result.status, 'passed');
    assert.equal(fetchMock.mock.calls[0][0], 'https://boltcall.org/.netlify/functions/create-paypal-test-approval-link');
    assert.equal(fetchMock.mock.calls[0][1].headers['x-internal-secret'], 'internal-secret');
  });

  it('fails before calling the network when the internal secret is missing', async () => {
    await assert.rejects(
      () => createPayPalTestApprovalLink({ SITE_URL: 'https://boltcall.org' }, { getEnv: () => '' }),
      /INTERNAL_API_SECRET/,
    );
  });
});
