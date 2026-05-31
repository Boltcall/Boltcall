import { describe, it, expect } from 'vitest';
import {
  TOKEN_PLANS,
  TOKEN_COSTS,
  TOKEN_REWARDS,
  tokensToMinutes,
  tokensToMessages,
  tokensToSms,
  tokensToEmailResponses,
} from '../tokens';

describe('TOKEN_PLANS', () => {
  it('has correct monthly tokens for each plan', () => {
    expect(TOKEN_PLANS.starter.monthlyTokens).toBe(1000);
    expect(TOKEN_PLANS.pro.monthlyTokens).toBe(3000);
    expect(TOKEN_PLANS.ultimate.monthlyTokens).toBe(10000);
  });

  it('has correct prices', () => {
    // Canonical Boltcall plan prices (per CLAUDE.md memory).
    expect(TOKEN_PLANS.starter.price).toBe(549);
    expect(TOKEN_PLANS.pro.price).toBe(897);
    expect(TOKEN_PLANS.ultimate.price).toBe(4997);
  });
});

describe('TOKEN_COSTS', () => {
  it('has expected cost values', () => {
    expect(TOKEN_COSTS.ai_voice_minute).toBe(10);
    expect(TOKEN_COSTS.ai_chat_message).toBe(1);
    expect(TOKEN_COSTS.sms_sent).toBe(5);
    expect(TOKEN_COSTS.email_received).toBe(1);
    expect(TOKEN_COSTS.email_ai_draft).toBe(8);
    expect(TOKEN_COSTS.email_sent).toBe(3);
  });
});

describe('TOKEN_REWARDS', () => {
  it('has expected reward values', () => {
    expect(TOKEN_REWARDS.setup_ai_agent.tokens).toBe(100);
    expect(TOKEN_REWARDS.complete_business_profile.tokens).toBe(50);
    expect(TOKEN_REWARDS.connect_phone_number.tokens).toBe(50);
  });

  it('each reward has a label', () => {
    for (const reward of Object.values(TOKEN_REWARDS)) {
      expect(reward.label).toBeTruthy();
    }
  });
});

describe('tokensToMinutes', () => {
  it('converts tokens to voice minutes', () => {
    expect(tokensToMinutes(100)).toBe(10); // 100 / 10 = 10
    expect(tokensToMinutes(1000)).toBe(100);
    expect(tokensToMinutes(0)).toBe(0);
  });

  it('floors partial minutes', () => {
    expect(tokensToMinutes(15)).toBe(1); // 15 / 10 = 1.5 → 1
    expect(tokensToMinutes(9)).toBe(0);
  });
});

describe('tokensToMessages', () => {
  it('converts tokens to chat messages', () => {
    expect(tokensToMessages(100)).toBe(100); // 1:1 ratio
    expect(tokensToMessages(1)).toBe(1);
    expect(tokensToMessages(0)).toBe(0);
  });
});

describe('tokensToSms', () => {
  it('converts tokens to SMS count', () => {
    expect(tokensToSms(100)).toBe(20); // 100 / 5 = 20
    expect(tokensToSms(50)).toBe(10);
    expect(tokensToSms(0)).toBe(0);
  });

  it('floors partial SMS', () => {
    expect(tokensToSms(7)).toBe(1); // 7 / 5 = 1.4 → 1
    expect(tokensToSms(4)).toBe(0);
  });
});

describe('tokensToEmailResponses', () => {
  it('converts tokens to email response count', () => {
    // email_received(1) + email_ai_draft(8) + email_sent(3) = 12 tokens per email
    expect(tokensToEmailResponses(120)).toBe(10);
    expect(tokensToEmailResponses(12)).toBe(1);
    expect(tokensToEmailResponses(0)).toBe(0);
  });

  it('floors partial email responses', () => {
    expect(tokensToEmailResponses(15)).toBe(1); // 15 / 12 = 1.25 → 1
    expect(tokensToEmailResponses(11)).toBe(0);
  });
});
