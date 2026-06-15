import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  HELP_TOPIC_CASES,
  summarizeTopicResults,
  validateTopicAnswer,
} from '../smoke-v2-help-topics-live.mjs';

describe('smoke-v2-help-topics-live helpers', () => {
  it('defines customer support topic cases that do not request escalation', () => {
    assert.equal(HELP_TOPIC_CASES.length, 4);
    for (const topic of HELP_TOPIC_CASES) {
      assert.equal(/\b(human|person|support|agent|team|someone|call me|contact me|ticket|escalate)\b/i.test(topic.question), false);
      assert.ok(topic.expectedSourceUrl.startsWith('https://boltcall.mintlify.app/'));
    }
  });

  it('accepts an answer with the expected source URL and no support escalation', async () => {
    const result = await validateTopicAnswer(
      {
        id: 'billing',
        expectedSourceUrl: 'https://boltcall.mintlify.app/account/plans',
      },
      {
        answer: 'Open the plans docs to review billing, invoices, PayPal payment settings, and subscription details.',
        sources: [{ title: 'Plans and billing', url: 'https://boltcall.mintlify.app/account/plans' }],
        support: { escalated: false },
      },
      {
        siteUrl: 'https://boltcall.org',
        checkHelpSourcesResolve: async () => [
          {
            title: 'Plans and billing',
            url: 'https://boltcall.mintlify.app/account/plans',
            status: 200,
          },
        ],
      },
    );

    assert.equal(result.status, 'passed');
    assert.equal(result.supportEscalated, false);
    assert.deepEqual(result.matchedSourceUrls, ['https://boltcall.mintlify.app/account/plans']);
  });

  it('fails when the expected source URL is missing', async () => {
    await assert.rejects(
      () =>
        validateTopicAnswer(
          {
            id: 'billing',
            expectedSourceUrl: 'https://boltcall.mintlify.app/account/plans',
          },
          {
            answer: 'Open the relevant docs to review the setup path and confirm the correct configuration details.',
            sources: [{ title: 'Phone numbers', url: 'https://boltcall.mintlify.app/dashboard/phone-numbers' }],
            support: { escalated: false },
          },
          {
            siteUrl: 'https://boltcall.org',
            checkHelpSourcesResolve: async () => [
              {
                title: 'Phone numbers',
                url: 'https://boltcall.mintlify.app/dashboard/phone-numbers',
                status: 200,
              },
            ],
          },
        ),
      /expected source/,
    );
  });

  it('fails when a non-escalation topic creates a support ticket', async () => {
    await assert.rejects(
      () =>
        validateTopicAnswer(
          {
            id: 'billing',
            expectedSourceUrl: 'https://boltcall.mintlify.app/account/plans',
          },
          {
            answer: 'Open the plans docs to review billing, invoices, PayPal payment settings, and subscription details.',
            sources: [{ title: 'Plans and billing', url: 'https://boltcall.mintlify.app/account/plans' }],
            support: { escalated: true, ticket_id: 'ticket-1' },
          },
          {
            siteUrl: 'https://boltcall.org',
            checkHelpSourcesResolve: async () => [
              {
                title: 'Plans and billing',
                url: 'https://boltcall.mintlify.app/account/plans',
                status: 200,
              },
            ],
          },
        ),
      /unexpectedly escalated/,
    );
  });

  it('summarizes topic checks without leaking full answers', () => {
    assert.deepEqual(
      summarizeTopicResults([
        {
          id: 'billing',
          status: 'passed',
          answerPreview: 'a'.repeat(140),
          sourceTitles: ['Plans and billing'],
          sourceResults: [],
        },
      ]),
      {
        status: 'passed',
        check: 'support_agent_topic_coverage_live',
        topicsChecked: 1,
        topicsPassed: 1,
        topics: [
          {
            id: 'billing',
            status: 'passed',
            answerPreview: 'a'.repeat(120),
            sourceTitles: ['Plans and billing'],
            sourceResults: [],
          },
        ],
      },
    );
  });
});
