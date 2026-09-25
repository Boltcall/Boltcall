import { beforeEach, describe, expect, it, vi } from 'vitest';

// F108: client-error-report is public/unauthenticated and forwards straight
// to notifyError -> Telegram. It must be rate-limited per IP like every
// other public endpoint that triggers a notification.

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
      if (table !== 'public_rate_limits') throw new Error(`Unexpected table: ${table}`);
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
          rateLimits.set(mapKey, { id: existing?.id || `rl_${nextId++}`, ...payload });
          return { error: null };
        },
        update(payload: Partial<RateLimitRow>) {
          return {
            async eq(field: string, value: string) {
              if (field !== 'id') throw new Error(`Unexpected eq field: ${field}`);
              const existing = Array.from(rateLimits.values()).find((row) => row.id === value);
              if (!existing) return { error: new Error('Row not found') };
              rateLimits.set(rateLimitMapKey(existing.bucket, existing.key), { ...existing, ...payload });
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

const notifyErrorMock = vi.hoisted(() => vi.fn());
vi.mock('../_shared/notify', () => ({ notifyError: notifyErrorMock }));

function makeEvent(ip: string) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json', 'x-nf-client-connection-ip': ip },
    body: JSON.stringify({ message: 'boom' }),
  } as any;
}

describe('client-error-report rate limiting', () => {
  beforeEach(() => {
    rateLimits.clear();
    nextId = 1;
    notifyErrorMock.mockClear();
  });

  it('blocks the 21st report from the same IP within an hour', async () => {
    const { testHandler: handler } = await import('../client-error-report');

    for (let i = 0; i < 20; i++) {
      const res = await handler(makeEvent('203.0.113.50'), {} as any);
      expect(res.statusCode).toBe(204);
    }
    expect(notifyErrorMock).toHaveBeenCalledTimes(20);

    const blocked = await handler(makeEvent('203.0.113.50'), {} as any);
    expect(blocked.statusCode).toBe(429);
    expect(notifyErrorMock).toHaveBeenCalledTimes(20);
  });
});
