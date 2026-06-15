import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  auditSupportKbCoverage,
  extractDocsIndexEvidence,
} from '../audit-support-kb-coverage.mjs';

describe('audit-support-kb-coverage helpers', () => {
  it('extracts the support docs cues and URLs from the help endpoint source', () => {
    const evidence = extractDocsIndexEvidence(`
      const DOCS_INDEX: DocEntry[] = [
        {
          cues: ['phone', 'number', 'call routing'],
          source: {
            title: 'Phone numbers',
            url: \`\${DOCS_BASE}/dashboard/phone-numbers\`,
            snippet: 'Manage connected numbers.',
          },
        },
        {
          cues: ['billing', 'paypal', 'payment'],
          source: {
            title: 'Plans and billing',
            url: \`\${DOCS_BASE}/account/plans\`,
          },
        },
      ];
    `);

    assert.deepEqual(evidence.cues, ['phone', 'number', 'call routing', 'billing', 'paypal', 'payment']);
    assert.deepEqual(evidence.urls, [
      'https://boltcall.mintlify.app/dashboard/phone-numbers',
      'https://boltcall.mintlify.app/account/plans',
    ]);
  });

  it('passes when every required support topic has matching cues', async () => {
    const result = await auditSupportKbCoverage(
      {
        cues: ['phone', 'billing', 'paypal'],
        urls: ['https://boltcall.mintlify.app/dashboard/phone-numbers'],
      },
      {
        requiredTopics: [
          { id: 'phone_routing', cues: ['phone'] },
          { id: 'billing_paypal', cues: ['billing', 'paypal'] },
        ],
        fetchImpl: async () => ({ status: 200 }),
      },
    );

    assert.equal(result.status, 'passed');
    assert.deepEqual(result.missingTopics, []);
    assert.equal(result.sourceResults[0].status, 200);
  });

  it('fails when a critical support topic has no matching cue', async () => {
    const result = await auditSupportKbCoverage(
      {
        cues: ['phone'],
        urls: ['https://boltcall.mintlify.app/dashboard/phone-numbers'],
      },
      {
        requiredTopics: [
          { id: 'phone_routing', cues: ['phone'] },
          { id: 'billing_paypal', cues: ['billing', 'paypal'] },
        ],
        fetchImpl: async () => ({ status: 200 }),
      },
    );

    assert.equal(result.status, 'failed');
    assert.deepEqual(result.missingTopics, ['billing_paypal']);
  });

  it('fails when a configured support doc URL does not resolve', async () => {
    const result = await auditSupportKbCoverage(
      {
        cues: ['phone'],
        urls: ['https://boltcall.mintlify.app/dashboard/phone-numbers'],
      },
      {
        requiredTopics: [{ id: 'phone_routing', cues: ['phone'] }],
        fetchImpl: async () => ({ status: 404 }),
      },
    );

    assert.equal(result.status, 'failed');
    assert.deepEqual(result.brokenSources, [
      {
        url: 'https://boltcall.mintlify.app/dashboard/phone-numbers',
        status: 404,
      },
    ]);
  });
});
