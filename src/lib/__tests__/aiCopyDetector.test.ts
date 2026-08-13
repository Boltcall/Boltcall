import { describe, test, expect } from 'vitest';
import { scoreText, isLikelyAiTemplated, AI_TEMPLATED_THRESHOLD } from '../aiCopyDetector';

const HUMAN_MESSY = `hey - quick one. saw your post about hvac lead response times, we've been dealing w/ the same issue.
we tried callrail plus a weekend answering service. helped some, still lost like 2-3 jobs a week from after-hours calls.
does your thing actually book the appt or just pick up? matters bc our techs won't chase leads that aren't confirmed on the calendar.
also what happens if the caller wants a quote right now, we can't give quotes without seeing the unit.`;

const AI_TEMPLATED = `Honestly, when it comes to speed-to-lead solutions in today's competitive market, there are several factors worth considering. I wanted to reach out because your recent post caught my attention — it truly resonated with my own experience running a growing business.

It's not just about answering calls faster; it's about creating a seamless customer experience — one that builds trust, drives engagement, and ultimately delivers results. At the end of the day, moving forward requires the right combination of technology, strategy, and human touch.

I hope this message finds you well and that we can connect soon to explore potential synergies. From the bottom of my heart, thank you so much for your time and consideration. It's worth noting that our approach — thoughtful, measured, and deliberate — has helped clients achieve remarkable outcomes.

Looking forward to your response — sounds interesting. I'm interested to hear more, please tell me more about your pricing and let's schedule a demo.`;

describe('aiCopyDetector', () => {
  test('templated AI copy scores above threshold', () => {
    const r = scoreText(AI_TEMPLATED);
    expect(r.aiScore).toBeGreaterThanOrEqual(AI_TEMPLATED_THRESHOLD);
    expect(isLikelyAiTemplated(AI_TEMPLATED)).toBe(true);
  });

  test('human messy copy scores below threshold', () => {
    const r = scoreText(HUMAN_MESSY);
    expect(r.aiScore).toBeLessThan(AI_TEMPLATED_THRESHOLD);
    expect(isLikelyAiTemplated(HUMAN_MESSY)).toBe(false);
  });

  test('short text returns zero without throwing', () => {
    const r = scoreText('Thanks!');
    expect(r.aiScore).toBe(0);
    expect(r.reason).toBe('too_short');
  });

  test('null / undefined / empty return zero', () => {
    for (const v of [null, undefined, '']) {
      expect(scoreText(v).aiScore).toBe(0);
    }
  });

  test('signals include all five keys when text long enough', () => {
    const r = scoreText(AI_TEMPLATED);
    expect(Object.keys(r.signals).sort()).toEqual(
      ['contrastPattern', 'emDashDensity', 'paragraphUniformity', 'ruleOfThree', 'tellPhrases']
    );
  });

  test('AI_TEMPLATED_THRESHOLD exported and reasonable', () => {
    expect(AI_TEMPLATED_THRESHOLD).toBeGreaterThan(0.3);
    expect(AI_TEMPLATED_THRESHOLD).toBeLessThan(0.9);
  });
});
