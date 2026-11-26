import { describe, expect, it } from 'vitest';
import { parseCosts, summarize } from '../free-tool-cpl.mjs';

describe('free-tool-cpl summarize', () => {
  const rows = [
    { channel: 'ai_audit', outcome: 'forwarded' },
    { channel: 'ai_audit', outcome: 'forwarded' },
    { channel: 'ai_audit', outcome: 'forward_failed' },
    { channel: 'seo_aeo_audit', outcome: 'forwarded' },
  ];

  it('counts leads, started reports and failures per tool, busiest first', () => {
    const out = summarize(rows);
    expect(out.map((r) => [r.tool, r.leads, r.forwarded, r.failed])).toEqual([
      ['ai_audit', 3, 2, 1],
      ['seo_aeo_audit', 1, 1, 0],
    ]);
  });

  it('charges only started reports and spreads cost over every lead', () => {
    const [ai] = summarize(rows, { ai_audit: 0.18 });
    expect(ai.total_cost).toBeCloseTo(0.36);
    expect(ai.cost_per_lead).toBeCloseTo(0.12);
  });

  it('leaves cost unknown instead of guessing', () => {
    const seo = summarize(rows, { ai_audit: 0.18 }).find((r) => r.tool === 'seo_aeo_audit');
    expect(seo).toMatchObject({ cost_per_run: null, total_cost: null, cost_per_lead: null });
  });
});

describe('parseCosts', () => {
  it('reads repeated --cost tool=usd pairs and drops invalid ones', () => {
    expect(parseCosts(['--days', '7', '--cost', 'ai_audit=0.18', '--cost', 'bad=abc', '--cost', 'x=-1', '--cost', 'seo_aeo_audit=0'])).toEqual({
      ai_audit: 0.18,
      seo_aeo_audit: 0,
    });
  });
});
