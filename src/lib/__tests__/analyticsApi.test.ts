/**
 * analyticsApi — real per-workspace call/lead stats for Growth > Analytics.
 * Covers the missed/handled branching (F131/F126 sibling fix: no more
 * admin-only dashboard-stats aggregate, no more fake zeros).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChainMock(resolvedData: any = [], resolvedError: any = null, resolvedCount: number | null = null) {
  const resolved = Promise.resolve({ data: resolvedData, error: resolvedError, count: resolvedCount });
  const chain: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (prop === 'finally') return resolved.finally.bind(resolved);
      return (..._args: any[]) => chain;
    },
  });
  return chain;
}

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: mockSupabase }));

const mockGetRetellCallHistory = vi.hoisted(() => vi.fn());
vi.mock('../retell', () => ({ getRetellCallHistory: mockGetRetellCallHistory }));

import { fetchUserCallStats, fetchUserLeadsCount } from '../analyticsApi';

const RANGE = { start: '2026-09-01', end: '2026-09-24' };

describe('fetchUserCallStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros without calling Retell when the workspace has no agents', async () => {
    mockSupabase.from.mockReturnValue(createChainMock([]));

    const result = await fetchUserCallStats('user_1', RANGE);

    expect(result).toEqual({ callsTotal: 0, callsHandled: 0, callsMissed: 0, successRate: 0, avgDurationSeconds: 0, activeAgents: 0 });
    expect(mockGetRetellCallHistory).not.toHaveBeenCalled();
  });

  it('buckets ended/short calls and not_connected/error calls as missed, long ended calls as handled', async () => {
    mockSupabase.from.mockReturnValue(createChainMock([{ retell_agent_id: 'agent_1' }]));
    mockGetRetellCallHistory.mockResolvedValue({
      calls: [
        { call_status: 'ended', duration_ms: 20000 },  // handled, 20s
        { call_status: 'ended', duration_ms: 5000 },   // missed (< 15s threshold)
        { call_status: 'not_connected' },              // missed
        { call_status: 'error' },                      // missed
      ],
    });

    const result = await fetchUserCallStats('user_1', RANGE);

    expect(result.callsTotal).toBe(4);
    expect(result.callsHandled).toBe(1);
    expect(result.callsMissed).toBe(3);
    expect(result.successRate).toBe(25); // 1/4
    expect(result.avgDurationSeconds).toBe(13); // (20000+5000)/2/1000 = 12.5 -> rounds to 13
    expect(result.activeAgents).toBe(1);
    expect(mockGetRetellCallHistory).toHaveBeenCalledWith(expect.objectContaining({ agentIds: ['agent_1'] }));
  });
});

describe('fetchUserLeadsCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the real count', async () => {
    mockSupabase.from.mockReturnValue(createChainMock(null, null, 7));
    expect(await fetchUserLeadsCount('user_1', RANGE)).toBe(7);
  });

  it('falls back to 0 when count is null', async () => {
    mockSupabase.from.mockReturnValue(createChainMock(null, null, null));
    expect(await fetchUserLeadsCount('user_1', RANGE)).toBe(0);
  });
});
