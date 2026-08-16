import { beforeEach, describe, expect, it, vi } from 'vitest';

const retellCreatePhoneCall = vi.fn();
const retellListPhoneNumbers = vi.fn();

vi.mock('retell-sdk', () => ({
  default: class MockRetell {
    call = {
      createPhoneCall: retellCreatePhoneCall,
    };
    phoneNumber = {
      list: retellListPhoneNumbers,
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
import { testHandler as handler } from '../homepage-demo-call';

function makeEvent(body: Record<string, unknown>, ip = '203.0.113.10') {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nf-client-connection-ip': ip,
    },
    body: JSON.stringify(body),
  } as any;
}

describe('homepage-demo-call', () => {
  beforeEach(() => {
    rateLimits.clear();
    nextId = 1;
    retellCreatePhoneCall.mockReset();
    retellCreatePhoneCall.mockResolvedValue({ call_id: 'call-123' });
    retellListPhoneNumbers.mockReset();
    retellListPhoneNumbers.mockResolvedValue({ items: [] });
    process.env.RETELL_API_KEY = 'retell-key';
    process.env.RETELL_DEMO_FROM_NUMBER = '+15550001111';
    process.env.RETELL_DEMO_AGENT_MAP = JSON.stringify({
      'law-firm': 'agent-law',
    });
    process.env.RETELL_DEMO_AGENT_ID = 'agent-default';
  });

  it('uses the mapped agent for the selected industry', async () => {
    const response = await handler(
      makeEvent({
        industry: 'law-firm',
        name: 'Noam Yakoby',
        phone: '+15551234567',
      }),
      {} as any,
    );

    expect(response.statusCode).toBe(200);
    expect(retellCreatePhoneCall).toHaveBeenCalledWith(expect.objectContaining({
      from_number: '+15550001111',
      to_number: '+15551234567',
      agent_id: 'agent-law',
      retell_llm_dynamic_variables: expect.objectContaining({
        business_name: 'Harrison & Cole Law',
        niche: 'law firm',
        location: 'Austin, Texas',
      }),
      metadata: expect.objectContaining({
        source: 'homepage_demo',
        industry: 'law-firm',
      }),
    }));
  });

  it('blocks the fourth request for the same phone number inside the rate-limit window', async () => {
    const body = {
      industry: 'law-firm',
      name: 'Noam Yakoby',
      phone: '+15551234567',
    };

    const first = await handler(makeEvent(body, '203.0.113.10'), {} as any);
    const second = await handler(makeEvent(body, '203.0.113.11'), {} as any);
    const third = await handler(makeEvent(body, '203.0.113.12'), {} as any);
    const fourth = await handler(makeEvent(body, '203.0.113.13'), {} as any);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(200);
    expect(fourth.statusCode).toBe(429);
    expect(JSON.parse(fourth.body).code).toBe('demo_phone_rate_limited');
    expect(retellCreatePhoneCall).toHaveBeenCalledTimes(3);

    const phoneRow = rateLimits.get(
      rateLimitMapKey('homepage_demo_phone', hashRateLimitKey(['+15551234567'])),
    );
    expect(phoneRow?.attempts).toBe(3);
  });

  it('uses a Retell demo line when no caller number environment variable is set', async () => {
    delete process.env.RETELL_DEMO_FROM_NUMBER;
    retellListPhoneNumbers.mockResolvedValue({
      items: [
        { phone_number: '+15550002222', phone_number_type: 'retell-twilio', nickname: 'Demo line' },
      ],
    });

    const response = await handler(
      makeEvent({
        industry: 'law-firm',
        name: 'Noam Yakoby',
        phone: '+15551234567',
      }),
      {} as any,
    );

    expect(response.statusCode).toBe(200);
    expect(retellCreatePhoneCall).toHaveBeenCalledWith(expect.objectContaining({
      from_number: '+15550002222',
    }));
  });

  it('rejects an industry outside the law-firm-only demo', async () => {
    const response = await handler(
      makeEvent({
        industry: 'roofers',
        name: 'Noam Yakoby',
        phone: '+15551234567',
      }),
      {} as any,
    );

    expect(response.statusCode).toBe(400);
  });
});
