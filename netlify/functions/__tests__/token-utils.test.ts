import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'token_balances') {
      return {
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
        update: () => {
          const cas: any = { eq: () => cas, select: mockUpdate };
          return cas;
        },
      };
    }
    if (table === 'token_transactions') {
      return { insert: mockInsert };
    }
    return {};
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

import { deductTokens, deductTokensBatch, TOKEN_COSTS } from '../_shared/token-utils';

describe('TOKEN_COSTS', () => {
  it('has expected cost values', () => {
    expect(TOKEN_COSTS.ai_voice_minute).toBe(10);
    expect(TOKEN_COSTS.sms_sent).toBe(5);
    expect(TOKEN_COSTS.ai_chat_message).toBe(1);
    expect(TOKEN_COSTS.email_ai_draft).toBe(8);
    expect(TOKEN_COSTS.outbound_call).toBe(15);
  });
});

describe('deductTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deducts from bonus first, then balance', async () => {
    mockSelect.mockResolvedValue({
      data: { balance: 100, bonus_balance: 20, tokens_used_this_period: 0 },
      error: null,
    });
    mockUpdate.mockResolvedValue({ data: [{ user_id: 'user-1' }], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await deductTokens('user-1', 15, 'sms_sent', 'SMS test', {}, mockSupabase as any);

    expect(result.success).toBe(true);
    expect(result.tokensDeducted).toBe(15);
    // bonus: 20 - 15 = 5, balance: 100 - 0 = 100, remaining = 105
    expect(result.remainingBalance).toBe(105);
  });

  it('returns error when insufficient balance', async () => {
    mockSelect.mockResolvedValue({
      data: { balance: 3, bonus_balance: 0, tokens_used_this_period: 0 },
      error: null,
    });

    const result = await deductTokens('user-1', 10, 'ai_voice_minute', 'Call', {}, mockSupabase as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient token balance');
    expect(result.tokensDeducted).toBe(0);
  });

  it('returns error when no balance found', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await deductTokens('user-1', 5, 'sms_sent', 'SMS', {}, mockSupabase as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('re-reads and retries when a concurrent debit changed the balance (CAS miss)', async () => {
    mockSelect
      .mockResolvedValueOnce({ data: { balance: 10, bonus_balance: 0, tokens_used_this_period: 0 }, error: null })
      .mockResolvedValueOnce({ data: { balance: 5, bonus_balance: 0, tokens_used_this_period: 5 }, error: null })
      .mockResolvedValueOnce({ data: { balance: 0, bonus_balance: 0, tokens_used_this_period: 10 }, error: null });
    mockUpdate
      .mockResolvedValueOnce({ data: [], error: null }) // lost the race
      .mockResolvedValueOnce({ data: [{ user_id: 'user-1' }], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await deductTokens('user-1', 5, 'sms_sent', 'SMS', {}, mockSupabase as any);
    expect(result.success).toBe(true);
    expect(result.remainingBalance).toBe(0); // computed from the re-read (5), not the stale 10
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    // Next concurrent caller sees the drained balance and is refused.
    const second = await deductTokens('user-1', 5, 'sms_sent', 'SMS', {}, mockSupabase as any);
    expect(second.success).toBe(false);
    expect(second.error).toBe('Insufficient token balance');
  });

  it('returns error when update fails', async () => {
    mockSelect.mockResolvedValue({
      data: { balance: 100, bonus_balance: 0, tokens_used_this_period: 0 },
      error: null,
    });
    mockUpdate.mockResolvedValue({ error: { message: 'update failed' } });

    const result = await deductTokens('user-1', 5, 'sms_sent', 'SMS', {}, mockSupabase as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('update failed');
  });
});

describe('deductTokensBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success for empty items', async () => {
    const result = await deductTokensBatch('user-1', [], mockSupabase as any);
    expect(result.success).toBe(true);
    expect(result.tokensDeducted).toBe(0);
  });

  it('deducts total cost from balance', async () => {
    mockSelect.mockResolvedValue({
      data: { balance: 100, bonus_balance: 0, tokens_used_this_period: 0 },
      error: null,
    });
    mockUpdate.mockResolvedValue({ data: [{ user_id: 'user-1' }], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await deductTokensBatch(
      'user-1',
      [
        { cost: 5, category: 'sms_sent', description: 'SMS 1' },
        { cost: 10, category: 'ai_voice_minute', description: 'Call' },
      ],
      mockSupabase as any
    );

    expect(result.success).toBe(true);
    expect(result.tokensDeducted).toBe(15);
    expect(result.remainingBalance).toBe(85);
  });

  it('returns error when batch exceeds balance', async () => {
    mockSelect.mockResolvedValue({
      data: { balance: 5, bonus_balance: 0, tokens_used_this_period: 0 },
      error: null,
    });

    const result = await deductTokensBatch(
      'user-1',
      [
        { cost: 5, category: 'sms_sent', description: 'SMS' },
        { cost: 10, category: 'ai_voice_minute', description: 'Call' },
      ],
      mockSupabase as any
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient');
  });
});
