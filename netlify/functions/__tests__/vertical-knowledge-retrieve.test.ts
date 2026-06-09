import { describe, expect, it, vi } from 'vitest';

import {
  formatVerticalContextForPrompt,
  normalizeVerticalSlug,
  retrieveVerticalPackContext,
} from '../_shared/vertical-knowledge/retrieve';

vi.mock('../_shared/azure-ai', () => ({
  generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

describe('vertical-knowledge retrieve helper', () => {
  it('normalizes supported vertical aliases to canonical pack slugs', () => {
    expect(normalizeVerticalSlug('law')).toBe('law_firm');
    expect(normalizeVerticalSlug('Attorney')).toBe('law_firm');
    expect(normalizeVerticalSlug('medspa')).toBe('med_spa');
    expect(normalizeVerticalSlug('Medical Spa')).toBe('med_spa');
    expect(normalizeVerticalSlug('solar panel installer')).toBe('solar');
    expect(normalizeVerticalSlug('plumbing')).toBeNull();
  });

  it('falls back to approved rows when vector retrieval returns no chunks', async () => {
    const rows = [
      {
        id: 'row-1',
        pack_slug: 'solar',
        kind: 'guardrail',
        section: 'No guaranteed savings',
        content: { agent_rule: 'Do not promise guaranteed savings.' },
        source_title: 'FTC solar guidance',
        jurisdiction: 'us_national',
      },
    ];

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
      in: vi.fn(() => chain),
    };
    const supabase: any = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn(() => chain),
    };

    const result = await retrieveVerticalPackContext({
      vertical: 'solar',
      queryText: 'solar intake',
      kinds: ['guardrail'],
      supabase,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('retrieve_vertical_knowledge', {
      p_pack_slug: 'solar',
      p_query_embedding: JSON.stringify([0.1, 0.2, 0.3]),
      p_k: 12,
      p_kinds: ['guardrail'],
    });
    expect(result).toEqual([
      {
        scope: 'vertical',
        pack_slug: 'solar',
        knowledge_id: 'row-1',
        kind: 'guardrail',
        section: 'No guaranteed savings',
        content: { agent_rule: 'Do not promise guaranteed savings.' },
        source_title: 'FTC solar guidance',
        jurisdiction: 'us_national',
        score: 1,
      },
    ]);
  });

  it('formats chunks as an approved guardrails block for agent prompts', () => {
    const block = formatVerticalContextForPrompt([
      {
        scope: 'vertical',
        pack_slug: 'law_firm',
        knowledge_id: 'row-2',
        kind: 'disallowed_claim',
        section: 'No legal advice',
        content: { agent_rule: 'Collect facts and hand off.' },
        source_title: 'ABA Model Rules',
        jurisdiction: 'us_national',
        score: 0.9,
      },
    ]);

    expect(block).toContain('# Approved Vertical Guardrails');
    expect(block).toContain('Do not browse the web during live calls');
    expect(block).toContain('No legal advice');
    expect(block).toContain('Collect facts and hand off.');
  });
});
