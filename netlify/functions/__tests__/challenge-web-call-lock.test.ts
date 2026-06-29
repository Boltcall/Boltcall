import { beforeEach, describe, expect, it, vi } from 'vitest';

const retellCreateWebCall = vi.fn();

vi.mock('retell-sdk', () => ({
  default: class MockRetell {
    call = {
      createWebCall: retellCreateWebCall,
    };
  },
}));

type RateLimitRow = {
  id: string;
  bucket: string;
  key: string;
  attempts: number;
  window_start: string;
  updated_at: string;
};

const rateLimits = new Map<string, RateLimitRow>();
let nextId = 1;

function rateLimitMapKey(bucket: string, key: string) {
  return `${bucket}::${key}`;
}

function makeSupabase() {
  return {
    from(table: string) {
      if (table !== 'public_rate_limits') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select() {
          const filters: Record<string, string> = {};
          return {
            eq(field: string, value: string) {
              filters[field] = value;
              return this;
            },
            async maybeSingle() {
              const row = rateLimits.get(rateLimitMapKey(filters.bucket, filters.key));
              return { data: row ?? null, error: null };
            },
          };
        },
        async upsert(payload: Omit<RateLimitRow, 'id'>) {
          const mapKey = rateLimitMapKey(payload.bucket, payload.key);
          const existing = rateLimits.get(mapKey);
          rateLimits.set(mapKey, {
            id: existing?.id || `rl_${nextId++}`,
            ...payload,
          });
          return { error: null };
        },
        update(payload: Partial<RateLimitRow>) {
          return {
            async eq(field: string, value: string) {
              if (field !== 'id') {
                throw new Error(`Unexpected eq field: ${field}`);
              }
              const existing = Array.from(rateLimits.values()).find((row) => row.id === value);
              if (!existing) return { error: new Error('Row not found') };
              rateLimits.set(rateLimitMapKey(existing.bucket, existing.key), {
                ...existing,
                ...payload,
              });
              return { error: null };
            },
          };
        },
      };
    },
  };
}

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => makeSupabase(),
}));

import { hashRateLimitKey } from '../_shared/public-rate-limit';
import { testHandler as handler } from '../challenge-web-call';

function makeEvent(body: Record<string, unknown>, ip: string) {
  return {
    httpMethod: 'POST',
    headers: {
      origin: 'https://boltcall.org',
      'content-type': 'application/json',
      'x-nf-client-connection-ip': ip,
    },
    body: JSON.stringify(body),
  } as any;
}

describe('challenge-web-call one-shot locks', () => {
  beforeEach(() => {
    rateLimits.clear();
    nextId = 1;
    retellCreateWebCall.mockReset();
    retellCreateWebCall.mockResolvedValue({
      access_token: 'access-token',
      call_id: 'call-123',
    });
    process.env.RETELL_API_KEY = 'retell-key';
    process.env.CHALLENGE_AGENT_ID = 'agent-123';
    process.env.CHALLENGE_SECRET_WORD = 'swordfish';
    process.env.CHALLENGE_SECRET_CLUE = 'fish';
    process.env.CHALLENGE_SESSION_SECRET = 'test-session-secret-long-enough';
    process.env.URL = 'https://boltcall.org';
  });

  it('allows one attempt, then blocks later attempts by the same IP while recording the repeat count', async () => {
    const first = await handler(
      makeEvent({ name: 'Noam', email: 'noam@example.com' }, '203.0.113.10'),
      {} as any,
    );

    expect(first.statusCode).toBe(200);
    expect(retellCreateWebCall).toHaveBeenCalledTimes(1);

    const second = await handler(
      makeEvent({ name: 'Avi', email: 'avi@example.com' }, '203.0.113.10'),
      {} as any,
    );

    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body).code).toBe('challenge_ip_already_used');
    expect(retellCreateWebCall).toHaveBeenCalledTimes(1);

    const ipRow = rateLimits.get(rateLimitMapKey('challenge_ip_lock', hashRateLimitKey(['203.0.113.10'])));
    const firstEmailRow = rateLimits.get(rateLimitMapKey('challenge_email_lock', hashRateLimitKey(['noam@example.com'])));
    const secondEmailRow = rateLimits.get(rateLimitMapKey('challenge_email_lock', hashRateLimitKey(['avi@example.com'])));

    expect(ipRow?.attempts).toBe(2);
    expect(firstEmailRow?.attempts).toBe(1);
    expect(secondEmailRow?.attempts).toBe(1);
  });

  it('blocks later attempts by the same email from a different IP and records the repeat count', async () => {
    const first = await handler(
      makeEvent({ name: 'Noam', email: 'noam@example.com' }, '203.0.113.10'),
      {} as any,
    );
    expect(first.statusCode).toBe(200);

    const second = await handler(
      makeEvent({ name: 'Noam Again', email: 'noam@example.com' }, '203.0.113.99'),
      {} as any,
    );

    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body).code).toBe('challenge_email_already_used');

    const emailRow = rateLimits.get(rateLimitMapKey('challenge_email_lock', hashRateLimitKey(['noam@example.com'])));
    const firstIpRow = rateLimits.get(rateLimitMapKey('challenge_ip_lock', hashRateLimitKey(['203.0.113.10'])));
    const secondIpRow = rateLimits.get(rateLimitMapKey('challenge_ip_lock', hashRateLimitKey(['203.0.113.99'])));

    expect(emailRow?.attempts).toBe(2);
    expect(firstIpRow?.attempts).toBe(1);
    expect(secondIpRow?.attempts).toBe(1);
  });
});
