import { describe, expect, it, vi } from 'vitest';

import { syncRetellKnowledgeBases } from '../_shared/retell-knowledge-sync';

type Row = Record<string, any>;

function makeSupabaseMock(initial: Record<string, Row[]>) {
  const db = Object.fromEntries(
    Object.entries(initial).map(([table, rows]) => [table, rows.map((row) => ({ ...row }))]),
  ) as Record<string, Row[]>;

  function query(table: string) {
    const filters: Array<[string, any]> = [];
    let limitCount: number | null = null;

    const apply = () => {
      const rows = db[table] ?? [];
      const filtered = rows.filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      );
      return limitCount === null ? filtered : filtered.slice(0, limitCount);
    };

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((column: string, value: any) => {
        filters.push([column, value]);
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn((count: number) => {
        limitCount = count;
        return chain;
      }),
      maybeSingle: vi.fn(async () => ({ data: apply()[0] ?? null, error: null })),
      single: vi.fn(async () => ({ data: apply()[0] ?? null, error: null })),
      insert: vi.fn((row: Row) => {
        const inserted = { id: `binding-${(db[table] ?? []).length + 1}`, ...row };
        db[table] = [...(db[table] ?? []), inserted];
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: inserted, error: null })),
          })),
        };
      }),
      then: (resolve: any, reject: any) =>
        Promise.resolve({ data: apply(), error: null }).then(resolve, reject),
    };

    return chain;
  }

  return {
    db,
    supabase: { from: vi.fn((table: string) => query(table)) },
  };
}

describe('retell knowledge sync', () => {
  it('creates Retell KBs only from approved active sourced vertical knowledge plus client KB facts', async () => {
    const { supabase } = makeSupabaseMock({
      vertical_packs: [{ slug: 'law_firm', version: 1, status: 'approved' }],
      vertical_knowledge: [
        {
          id: 'valid-guardrail',
          pack_slug: 'law_firm',
          pack_version: 1,
          status: 'approved',
          kind: 'guardrail',
          section: 'No legal advice',
          content: { agent_rule: 'Collect facts and hand off.' },
          source_url: 'https://www.americanbar.org/example',
          source_title: 'ABA Model Rule 7.2',
          source_type: 'bar_rule',
          jurisdiction: 'us_national',
          confidence: 'high',
          expires_at: null,
        },
        {
          id: 'draft-row',
          pack_slug: 'law_firm',
          pack_version: 1,
          status: 'draft',
          kind: 'guardrail',
          section: 'Draft',
          content: { agent_rule: 'draft should not sync' },
          source_url: 'https://example.com/draft',
          source_title: 'Draft source',
          source_type: 'official',
          jurisdiction: 'us_national',
          confidence: 'low',
          expires_at: null,
        },
        {
          id: 'expired-row',
          pack_slug: 'law_firm',
          pack_version: 1,
          status: 'approved',
          kind: 'faq',
          section: 'Expired',
          content: { answer: 'expired should not sync' },
          source_url: 'https://example.com/expired',
          source_title: 'Expired source',
          source_type: 'official',
          jurisdiction: 'us_national',
          confidence: 'medium',
          expires_at: '2000-01-01T00:00:00.000Z',
        },
        {
          id: 'sourceless-row',
          pack_slug: 'law_firm',
          pack_version: 1,
          status: 'approved',
          kind: 'faq',
          section: 'Sourceless',
          content: { answer: 'sourceless should not sync' },
          source_url: null,
          source_title: null,
          source_type: 'official',
          jurisdiction: 'us_national',
          confidence: 'low',
          expires_at: null,
        },
      ],
      agency_knowledge: [
        {
          id: 'client-hours',
          client_id: 'client-1',
          kind: 'hours',
          version: 1,
          content: { text: 'Open weekdays 9 to 5.' },
        },
      ],
      retell_knowledge_bindings: [],
    });

    const create = vi
      .fn()
      .mockResolvedValueOnce({ knowledge_base_id: 'kb-vertical', status: 'complete' })
      .mockResolvedValueOnce({ knowledge_base_id: 'kb-client', status: 'complete' });

    const result = await syncRetellKnowledgeBases({
      supabase: supabase as any,
      retell: { knowledgeBase: { create } },
      clientId: 'client-1',
      vertical: 'law',
      clientKnowledgeBase: { faq: { title: 'Pricing', text: 'Consult fee varies by matter.' } },
    });

    expect(result.map((binding) => binding.retell_knowledge_base_id)).toEqual([
      'kb-vertical',
      'kb-client',
    ]);
    expect(create).toHaveBeenCalledTimes(2);

    const verticalTexts = create.mock.calls[0][0].knowledge_base_texts;
    expect(create.mock.calls[0][0]).toMatchObject({
      knowledge_base_name: 'BC vertical law_firm v1',
      enable_auto_refresh: false,
      max_chunk_size: 1400,
      min_chunk_size: 250,
    });
    expect(verticalTexts).toHaveLength(1);
    expect(verticalTexts[0].text).toContain('Collect facts and hand off.');
    expect(verticalTexts[0].text).not.toContain('draft should not sync');
    expect(verticalTexts[0].text).not.toContain('expired should not sync');
    expect(verticalTexts[0].text).not.toContain('sourceless should not sync');

    const clientTexts = create.mock.calls[1][0].knowledge_base_texts;
    expect(clientTexts.map((item: { text: string }) => item.text).join('\n')).toContain(
      'Consult fee varies by matter.',
    );
    expect(clientTexts.map((item: { text: string }) => item.text).join('\n')).toContain(
      'Open weekdays 9 to 5.',
    );
  });

  it('reuses existing binding rows for an unchanged content hash', async () => {
    const data = makeSupabaseMock({
      vertical_packs: [{ slug: 'solar', version: 1, status: 'approved' }],
      vertical_knowledge: [
        {
          id: 'valid-solar',
          pack_slug: 'solar',
          pack_version: 1,
          status: 'approved',
          kind: 'disallowed_claim',
          section: 'No free solar',
          content: { agent_rule: 'Do not call solar free.' },
          source_url: 'https://consumer.ftc.gov/example',
          source_title: 'FTC solar guidance',
          source_type: 'regulator',
          jurisdiction: 'us_national',
          confidence: 'high',
          expires_at: null,
        },
      ],
      agency_knowledge: [],
      retell_knowledge_bindings: [],
    });

    const create = vi.fn().mockResolvedValue({ knowledge_base_id: 'kb-solar', status: 'complete' });
    const args = {
      supabase: data.supabase as any,
      retell: { knowledgeBase: { create } },
      clientId: 'client-2',
      vertical: 'solar',
      clientKnowledgeBase: null,
    };

    const first = await syncRetellKnowledgeBases(args);
    const second = await syncRetellKnowledgeBases(args);

    expect(first).toEqual(second);
    expect(create).toHaveBeenCalledTimes(1);
    expect(second[0].retell_knowledge_base_id).toBe('kb-solar');
  });
});
