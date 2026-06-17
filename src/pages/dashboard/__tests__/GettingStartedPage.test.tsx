import { describe, it, expect } from 'vitest';

import { resolveCompletedStepIds, type CompletionSignals } from '../GettingStartedPage';

describe('resolveCompletedStepIds', () => {
  it('marks each activation step complete when its real product signal exists', () => {
    const signals: CompletionSignals = {
      hasKnowledgeBase: true,
      hasPhoneNumber: true,
      hasInboundAgent: true,
      hasSpeedToLeadAgent: true,
      hasLeadTracking: true,
      hasCompletedAgentTest: true,
      hasCalendarConnection: true,
      hasAdLeadConnection: true,
      hasSubmittedFeedback: true,
    };

    expect([...resolveCompletedStepIds(signals)].sort()).toEqual([
      'ad_followup',
      'after_hours',
      'feedback',
      'knowledge_base',
      'manual_booking',
      'missed_calls',
      'no_system',
      'slow_response',
      'test_agent',
    ]);
  });

  it('does not mark test_agent complete just because leads exist', () => {
    const signals: CompletionSignals = {
      hasKnowledgeBase: false,
      hasPhoneNumber: false,
      hasInboundAgent: false,
      hasSpeedToLeadAgent: false,
      hasLeadTracking: true,
      hasCompletedAgentTest: false,
      hasCalendarConnection: false,
      hasAdLeadConnection: false,
      hasSubmittedFeedback: false,
    };

    const completed = resolveCompletedStepIds(signals);

    expect(completed.has('no_system')).toBe(true);
    expect(completed.has('test_agent')).toBe(false);
  });
});
