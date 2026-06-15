import { describe, expect, it } from 'vitest';

import {
  buildRetellCallListParams,
  extractFirstAgentUtterance,
  normalizeRetellCallListResponse,
  normalizeForGreetingMatch,
  verifyGreeting,
} from '../verify-retell-phase-e.mjs';

describe('verify-retell-phase-e helpers', () => {
  it('extracts the first agent utterance from Retell transcript_object turns', () => {
    const utterance = extractFirstAgentUtterance({
      transcript_object: [
        { role: 'agent', content: 'Hi, thanks for calling Rapid Rooter QA. How can I help?' },
        { role: 'user', content: 'I have a leak.' },
      ],
    });

    expect(utterance).toBe('Hi, thanks for calling Rapid Rooter QA. How can I help?');
  });

  it('extracts the first agent utterance from a flattened transcript string', () => {
    const utterance = extractFirstAgentUtterance({
      transcript: [
        'agent: Hi, thanks for calling Rapid Rooter QA. How can I help?',
        'user: I need plumbing help.',
      ].join('\n'),
    });

    expect(utterance).toBe('Hi, thanks for calling Rapid Rooter QA. How can I help?');
  });

  it('passes only when the first agent utterance starts with the expected business greeting', () => {
    const expected = 'Hi, thanks for calling Rapid Rooter QA';

    expect(
      verifyGreeting(
        { transcript: 'agent: Hi, thanks for calling Rapid Rooter QA. How can I help?' },
        expected,
      ),
    ).toMatchObject({ ok: true });

    expect(
      verifyGreeting(
        { transcript: 'agent: Hi, thanks for calling. How can I help?' },
        expected,
      ),
    ).toMatchObject({ ok: false, reason: 'greeting_mismatch' });
  });

  it('normalizes punctuation and case without losing word order', () => {
    expect(normalizeForGreetingMatch('Hi, thanks for calling Rapid Rooter QA!')).toBe(
      'hi thanks for calling rapid rooter qa',
    );
  });

  it('uses the Retell v5 typed filter schema for call list filters', () => {
    expect(buildRetellCallListParams({ agentId: 'agent_123', sinceMs: 1710000000000, limit: 10 }))
      .toEqual({
        filter_criteria: {
          agent: [{ agent_id: 'agent_123' }],
          start_timestamp: { op: 'ge', type: 'number', value: 1710000000000 },
        },
        sort_order: 'descending',
        limit: 10,
      });
  });

  it('handles both bare-array and paginated Retell call list responses', () => {
    const calls = [{ call_id: 'call_1' }];

    expect(normalizeRetellCallListResponse(calls)).toEqual(calls);
    expect(normalizeRetellCallListResponse({ calls })).toEqual(calls);
  });
});
