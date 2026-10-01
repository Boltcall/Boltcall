import { describe, expect, it, vi } from 'vitest';

const chatCompletionMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/azure-ai', () => ({ chatCompletion: chatCompletionMock }));
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: getServiceSupabaseMock }));
vi.mock('../_shared/agency-runner-auth', () => ({ authorizeRunner: async () => ({ ok: true }) }));

// Any chain of filters resolves to `result`; inserts are recorded per table.
function chain(result: unknown, onFilter?: (method: string, args: unknown[]) => void, insert?: (row: any) => any): any {
  const c: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'insert' && insert) return insert;
      if (prop === 'then') return (resolve: any) => Promise.resolve(result).then(resolve);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve(result);
      return (...args: unknown[]) => { onFilter?.(prop, args); return c; };
    },
  });
  return c;
}

describe('objection-miner workspace lookup', () => {
  it('resolves the workspace owner and files SaaS suggestions into qa_reviews', async () => {
    const agencyFilters: Array<[string, unknown[]]> = [];
    const inserts: Record<string, any[]> = {};
    const calls = ['c1', 'c2', 'c3'].map((id) => ({
      call_id: id,
      workspace_id: 'ws-1',
      agent_id: 'agent-row-1',
      retell_agent_id: 'retell-1',
      vertical: 'legal',
      transcript: 'user: do I have a case? agent: you have a strong case',
    }));
    const supabase = {
      auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: null } } })) } },
      from: vi.fn((table: string) => {
        const insert = (row: any) => {
          (inserts[table] ||= []).push(row);
          return chain({ data: { id: `${table}-id` }, error: null });
        };
        if (table === 'retell_calls') return chain({ data: calls, error: null });
        if (table === 'retell_call_scores') {
          return chain({ data: calls.map((c) => ({ call_id: c.call_id, dim: 'law_no_legal_advice', notes: 'assessed case strength' })), error: null });
        }
        if (table === 'workspaces') return chain({ data: [{ id: 'ws-1', user_id: 'owner-1' }], error: null });
        if (table === 'agency_clients') return chain({ data: null, error: null }, (m, a) => agencyFilters.push([m, a]));
        if (table === 'agent_self_heal_log') return chain({ data: [], error: null }, undefined, insert);
        return chain({ data: null, error: null }, undefined, insert);
      }),
    };
    getServiceSupabaseMock.mockReturnValue(supabase);
    chatCompletionMock.mockResolvedValue(JSON.stringify([{
      objection_pattern: 'assesses case strength',
      frequency: 3,
      example_quote: 'do I have a case?',
      proposed_prompt_patch: '## Case questions\nSay only the attorney can assess the case.',
      after_summary: 'The agent says only the attorney can assess the case.',
    }]));

    const { testHandler: handler } = await import('../objection-miner');
    const res = await handler({ httpMethod: 'POST', headers: {}, body: '{}' } as any, {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.mined).toBe(1);
    // agency lookup uses the OWNER user id, never the workspace id
    expect(agencyFilters).toContainEqual(['eq', ['user_id', 'owner-1']]);
    expect(inserts.agent_self_heal_log[0]).toMatchObject({
      user_id: 'owner-1',
      agent_id: 'retell-1',
      status: 'pending_approval',
      prompt_fix_applied: expect.stringContaining('Case questions'),
    });
    expect(inserts.qa_reviews[0]).toMatchObject({
      user_id: 'owner-1',
      agent_id: 'retell-1',
      heal_log_id: 'agent_self_heal_log-id',
      status: 'pending',
      call_type: 'failure',
    });
    expect(inserts.agency_artifacts).toBeUndefined();
    expect(supabase.auth.admin.getUserById).toHaveBeenCalledWith('owner-1');
  });
});
