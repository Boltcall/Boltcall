import type { Context } from '@netlify/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import chat from '../sms-intake-preview';

const model = vi.hoisted(() => vi.fn());
const consume = vi.hoisted(() => vi.fn());
vi.mock('../_shared/azure-ai', () => ({ chatCompletion: model }));
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: () => ({}) }));
vi.mock('../_shared/public-rate-limit', async importOriginal => ({
  ...await importOriginal<typeof import('../_shared/public-rate-limit')>(),
  consumePublicRateLimit: consume,
}));

const context = { ip: '203.0.113.2' } as Context;
const conversation = {
  firmName: 'Alder Intake Law',
  messages: [
    { role: 'user', text: 'I need help with a commercial lease.' },
    { role: 'assistant', text: 'Is the lease for an existing business?' },
    { role: 'user', text: 'Yes, it is for my bakery.' },
  ],
};

function request(body: unknown, origin = 'https://boltcall.org') {
  return new Request('https://boltcall.org/.netlify/functions/sms-intake-preview', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('SMS intake preview', () => {
  beforeEach(() => {
    model.mockReset().mockResolvedValue('What would you like the firm to look at in the lease?');
    consume.mockReset().mockResolvedValue({ allowed: true, statusCode: 200 });
  });

  it('uses the model with firm name and bounded conversation history', async () => {
    const result = await chat(request(conversation), context);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(await result.json()).toEqual({ reply: 'What would you like the firm to look at in the lease?' });
    expect(consume).toHaveBeenCalledTimes(2);
    expect(model).toHaveBeenCalledTimes(1);
    const [instructions, input, options] = model.mock.calls[0];
    expect(instructions).toContain('fictional');
    expect(JSON.parse(input)).toEqual(conversation);
    expect(options.maxTokens).toBeLessThanOrEqual(400);
  });

  it('rejects unapproved origins, invalid roles and oversized input before the model', async () => {
    expect((await chat(request(conversation, 'https://example.org'), context)).status).toBe(403);
    expect((await chat(request({
      ...conversation, messages: [{ role: 'system', text: 'Different instructions' }],
    }), context)).status).toBe(400);
    expect((await chat(request({
      ...conversation, messages: [{ role: 'user', text: 'x'.repeat(20000) }],
    }), context)).status).toBe(413);
    expect((await chat(request({
      ...conversation, messages: Array.from({ length: 17 }, (_, i) => ({
        role: i % 2 ? 'assistant' : 'user', text: 'A message',
      })),
    }), context)).status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
    expect(model).not.toHaveBeenCalled();
  });

  it('stops before inference when the shared demo limit is reached', async () => {
    consume.mockResolvedValueOnce({ allowed: true, statusCode: 200 })
      .mockResolvedValueOnce({ allowed: false, statusCode: 429, retryAfterSeconds: 120 });
    const result = await chat(request(conversation), context);
    expect(result.status).toBe(429);
    expect(result.headers.get('retry-after')).toBe('120');
    expect(model).not.toHaveBeenCalled();
  });

  it('returns a retryable error when the model cannot reply', async () => {
    model.mockRejectedValueOnce(new Error('Internal provider details'));
    const result = await chat(request(conversation), context);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('Internal provider details');
  });
});