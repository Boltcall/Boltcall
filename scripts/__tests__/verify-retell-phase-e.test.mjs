import { describe, expect, it } from 'vitest';

import {
  buildRetellCallListParams,
  buildLlmWebsocketCallUrl,
  extractFirstAgentUtterance,
  normalizeRetellCallListResponse,
  normalizeForGreetingMatch,
  verifyPhaseECallEvidence,
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

  it('accepts a successful Retell phone call when the live LLM greeting was verified separately', () => {
    const result = verifyPhaseECallEvidence(
      {
        call_status: 'ended',
        duration_ms: 23000,
        transcript: [
          'User: Hi. I need plumbing service.',
          'User: Do you help with emergency leaks?',
          'User: That helps. Thank you.',
        ].join('\n'),
        call_analysis: {
          call_successful: true,
          call_summary: 'The user asked about emergency leak assistance. The agent confirmed assistance.',
        },
      },
      'Hi, thanks for calling Rapid Rooter QA',
      { llmGreetingVerified: true, llmGreeting: 'Hi, thanks for calling Rapid Rooter QA! How can I help you today?' },
    );

    expect(result).toMatchObject({
      ok: true,
      reason: 'llm_greeting_and_successful_call_matched',
    });
  });

  it('does not accept analysis-only phone evidence when the live LLM greeting was not verified', () => {
    const result = verifyPhaseECallEvidence(
      {
        call_status: 'ended',
        duration_ms: 23000,
        transcript: 'User: Hi. I need plumbing service.',
        call_analysis: {
          call_successful: true,
          call_summary: 'The agent confirmed assistance.',
        },
      },
      'Hi, thanks for calling Rapid Rooter QA',
      { llmGreetingVerified: false },
    );

    expect(result).toMatchObject({ ok: false });
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

  it('adds the call id to the Retell custom LLM websocket path', () => {
    expect(
      buildLlmWebsocketCallUrl(
        'wss://boltcall-retell-llm.example.com/llm-websocket',
        'call_123',
      ),
    ).toBe('wss://boltcall-retell-llm.example.com/llm-websocket/call_123');
  });

  it('handles both bare-array and paginated Retell call list responses', () => {
    const calls = [{ call_id: 'call_1' }];

    expect(normalizeRetellCallListResponse(calls)).toEqual(calls);
    expect(normalizeRetellCallListResponse({ calls })).toEqual(calls);
    expect(normalizeRetellCallListResponse({ items: calls, has_more: false })).toEqual(calls);
  });
});
