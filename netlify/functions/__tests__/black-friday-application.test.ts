import type { Context, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  getServiceSupabase: vi.fn(),
  consumePublicRateLimit: vi.fn(),
}));

vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock('../_shared/public-rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_shared/public-rate-limit')>()),
  consumePublicRateLimit: mocks.consumePublicRateLimit,
}));

import { testHandler as handler } from '../black-friday-application';

const application = {
  submissionId: '9fea5723-e8ed-45a0-8b46-c0313d51ea88',
  name: 'Sam Rivera',
  companyName: 'Rivera Plumbing',
  email: 'SAM@EXAMPLE.COM',
  website: '',
};

function post(body: unknown) {
  const event = {
    httpMethod: 'POST',
    headers: { origin: 'https://boltcall.org', 'x-nf-client-connection-ip': '192.0.2.23' },
    body: JSON.stringify(body),
  } as HandlerEvent;
  return handler(event, {} as Context, () => {}) as Promise<HandlerResponse>;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.getServiceSupabase.mockReturnValue({ from: () => ({ upsert: mocks.upsert }) });
  mocks.consumePublicRateLimit.mockResolvedValue({ allowed: true });
});

it('accepts an applicant without a website and saves their contact details under the Black Friday campaign', async () => {
  const result = await post(application);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body ?? '')).toEqual({ ok: true });
  expect(mocks.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      id: expect.any(Number),
      name: 'Sam Rivera',
      company_name: 'Rivera Plumbing',
      email: 'sam@example.com',
      url: null,
      source: 'black_friday_2026',
    }),
    { onConflict: 'id', ignoreDuplicates: true },
  );
});

it('keeps the same storage key when a submission is retried', async () => {
  await post(application);
  const retry = await post({ ...application, email: 'sam@example.com' });

  expect(retry.statusCode).toBe(200);
  const first = mocks.upsert.mock.calls[0][0];
  const second = mocks.upsert.mock.calls[1][0];
  expect(Number.isSafeInteger(first.id) && first.id < 0).toBe(true);
  expect(second.id).toBe(first.id);
});

it('normalizes a domain entered without a scheme', async () => {
  expect((await post({ ...application, website: 'example.com' })).statusCode).toBe(200);
  expect(mocks.upsert.mock.calls[0][0].url).toBe('https://example.com/');
});

it.each([
  null,
  { ...application, email: 'invalid' },
  { ...application, website: 'ftp://example.com' },
  { ...application, fax: 'bot' },
])('rejects invalid input without saving it', async (invalid) => {
  expect((await post(invalid)).statusCode).toBe(400);
  expect(mocks.upsert).not.toHaveBeenCalled();
});

it('returns a retry interval to rate-limited applicants', async () => {
  mocks.consumePublicRateLimit.mockResolvedValue({ allowed: false, statusCode: 429, retryAfterSeconds: 60 });

  const result = await post(application);

  expect(result.statusCode).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
  expect(mocks.upsert).not.toHaveBeenCalled();
});

it('returns a retryable error when it cannot save an application', async () => {
  mocks.upsert.mockResolvedValue({ error: { code: 'XX000' } });

  const result = await post(application);

  expect(result.statusCode).toBe(503);
  expect(JSON.parse(result.body ?? '')).toEqual({
    error: 'We couldn’t save your application. Please try again.',
  });
});
