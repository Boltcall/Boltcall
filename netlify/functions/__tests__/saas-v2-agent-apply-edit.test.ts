/**
 * saas-v2-agent-apply-edit — security + behavior tests.
 *
 * Covers: method/auth/body validation, origin defense, the happy path
 * (Retell LLM PATCH before the agents mirror update), idempotent re-apply,
 * and Retell-failure rollback semantics (no DB write on 502).
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Handler, HandlerEvent } from '@netlify/functions';

// ─── Env before module import (module reads RETELL_API_KEY at load) ─────────
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RETELL_API_KEY = 'test-retell-key';

// ── Mutable rows the tests reach into ────────────────────────────────────────
const workspaceRow = { current: { id: 'ws_1', user_id: 'user_1' } as Record<string, unknown> | null };
const agentRow = {
  current: {
    id: 'agent_1',
    system_prompt: 'You are the receptionist for Test Plumbing.',
    retell_agent_id: 'retell_agent_1',
    api_keys: null,
  } as Record<string, unknown> | null,
};
const agentUpdates: Array<Record<string, unknown>> = [];
const emittedEvents: Array<Record<string, unknown>> = [];

function makeSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === 'good-token'
          ? { data: { user: { id: 'user_1' } }, error: null }
          : { data: { user: null }, error: { message: 'bad token' } },
      ),
    },
    from: vi.fn((table: string) => {
      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: workspaceRow.current, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'agents') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: agentRow.current, error: null }),
                }),
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => {
                agentUpdates.push(patch);
                if (agentRow.current) Object.assign(agentRow.current, patch);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
      };
    }),
  };
}

const supabaseMock = { current: makeSupabaseMock() };

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => supabaseMock.current,
}));

vi.mock('../_shared/emit-agency-event', () => ({
  emitAgencyEvent: vi.fn(async (evt: Record<string, unknown>) => {
    emittedEvents.push(evt);
  }),
}));

// ── Retell fetch mock ────────────────────────────────────────────────────────
const retellCalls: Array<{ url: string; init?: RequestInit }> = [];
const retellFailure = { current: false };

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      retellCalls.push({ url, init });
      if (retellFailure.current) {
        return new Response('retell down', { status: 500 });
      }
      if (url.includes('/get-agent/')) {
        return new Response(
          JSON.stringify({ response_engine: { type: 'retell-llm', llm_id: 'llm_1' } }),
          { status: 200 },
        );
      }
      if (url.includes('/update-retell-llm/')) {
        return new Response(JSON.stringify({ llm_id: 'llm_1' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }),
  );
});

let handler: Handler;
beforeAll(async () => {
  const mod = await import('../saas-v2-agent-apply-edit');
  handler = mod.testHandler;
});

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer good-token' },
    body: JSON.stringify({ title: 'Ask for callback number', body: 'When the caller cannot talk now, ask for the best callback number and time.' }),
    ...overrides,
  } as HandlerEvent;
}

beforeEach(() => {
  workspaceRow.current = { id: 'ws_1', user_id: 'user_1' };
  agentRow.current = {
    id: 'agent_1',
    system_prompt: 'You are the receptionist for Test Plumbing.',
    retell_agent_id: 'retell_agent_1',
    api_keys: null,
  };
  agentUpdates.length = 0;
  emittedEvents.length = 0;
  retellCalls.length = 0;
  retellFailure.current = false;
});

describe('saas-v2-agent-apply-edit', () => {
  it('returns 405 on non-POST', async () => {
    const res = await handler(makeEvent({ httpMethod: 'GET' }), {} as never, () => {});
    expect(res?.statusCode).toBe(405);
  });

  it('returns 401 without a bearer token', async () => {
    const res = await handler(makeEvent({ headers: {} }), {} as never, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await handler(
      makeEvent({ headers: { authorization: 'Bearer bad-token' } }),
      {} as never,
      () => {},
    );
    expect(res?.statusCode).toBe(401);
  });

  it('returns 403 for a disallowed browser origin', async () => {
    const res = await handler(
      makeEvent({ headers: { authorization: 'Bearer good-token', origin: 'https://evil.example.com' } }),
      {} as never,
      () => {},
    );
    expect(res?.statusCode).toBe(403);
  });

  it('returns 400 when title or body is missing', async () => {
    const res = await handler(
      makeEvent({ body: JSON.stringify({ title: 'no body' }) }),
      {} as never,
      () => {},
    );
    expect(res?.statusCode).toBe(400);
  });

  it('returns 409 cold_start when no prompt is configured', async () => {
    agentRow.current = { id: 'agent_1', system_prompt: '', retell_agent_id: null, api_keys: null };
    const res = await handler(makeEvent(), {} as never, () => {});
    expect(res?.statusCode).toBe(409);
    expect(JSON.parse(res?.body || '{}').code).toBe('cold_start');
  });

  it('applies the edit: Retell LLM patched, mirror updated, event emitted', async () => {
    const res = await handler(makeEvent(), {} as never, () => {});
    expect(res?.statusCode).toBe(200);
    const body = JSON.parse(res?.body || '{}');
    expect(body.success).toBe(true);
    expect(body.synced_to_retell).toBe(true);

    // Retell: get-agent then update-retell-llm with the appended section.
    const patchCall = retellCalls.find((c) => c.url.includes('/update-retell-llm/llm_1'));
    expect(patchCall).toBeTruthy();
    const patched = JSON.parse(String(patchCall?.init?.body || '{}'));
    expect(patched.general_prompt).toContain('You are the receptionist for Test Plumbing.');
    expect(patched.general_prompt).toContain('## OWNER EDIT');
    expect(patched.general_prompt).toContain('Ask for callback number');

    // DB mirror updated with the same prompt.
    expect(agentUpdates).toHaveLength(1);
    expect(agentUpdates[0].system_prompt).toBe(patched.general_prompt);
    expect(agentUpdates[0].system_prompt_synced_at).toBeTruthy();

    // Telemetry emitted.
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].type).toBe('saas_v2_agent_edit_applied');
  });

  it('is idempotent: re-applying an already-present edit is a no-op', async () => {
    agentRow.current = {
      id: 'agent_1',
      system_prompt:
        'You are the receptionist.\n\n## OWNER EDIT (2026-07-12) — Ask for callback number\nWhen the caller cannot talk now, ask for the best callback number and time.',
      retell_agent_id: 'retell_agent_1',
      api_keys: null,
    };
    const res = await handler(makeEvent(), {} as never, () => {});
    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res?.body || '{}').already_applied).toBe(true);
    expect(retellCalls).toHaveLength(0);
    expect(agentUpdates).toHaveLength(0);
  });

  it('returns 502 and writes nothing when Retell is down', async () => {
    retellFailure.current = true;
    const res = await handler(makeEvent(), {} as never, () => {});
    expect(res?.statusCode).toBe(502);
    expect(agentUpdates).toHaveLength(0);
    expect(emittedEvents).toHaveLength(0);
  });

  it('falls back to mirror-only update when the agent has no Retell id', async () => {
    agentRow.current = {
      id: 'agent_1',
      system_prompt: 'You are the receptionist for Test Plumbing.',
      retell_agent_id: null,
      api_keys: null,
    };
    const res = await handler(makeEvent(), {} as never, () => {});
    expect(res?.statusCode).toBe(200);
    const body = JSON.parse(res?.body || '{}');
    expect(body.success).toBe(true);
    expect(body.synced_to_retell).toBe(false);
    expect(retellCalls).toHaveLength(0);
    expect(agentUpdates).toHaveLength(1);
  });
});
