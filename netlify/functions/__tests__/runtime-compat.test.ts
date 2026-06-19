import { describe, expect, it, vi } from 'vitest';

import { withLegacyHandler } from '../_shared/runtime-compat';

describe('withLegacyHandler', () => {
  it('adapts a Request into the legacy Handler event shape', async () => {
    const wrapped = withLegacyHandler(async (event) => ({
      statusCode: 201,
      headers: { 'content-type': 'application/json', 'x-legacy': 'yes' },
      body: JSON.stringify({
        method: event.httpMethod,
        path: event.path,
        rawUrl: event.rawUrl,
        rawQuery: event.rawQuery,
        body: event.body,
        query: event.queryStringParameters,
        authLower: event.headers.authorization,
        authUpper: event.headers.Authorization,
      }),
    }));

    const response = await wrapped(
      new Request('https://boltcall.org/.netlify/functions/example?mode=test&limit=2', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          'x-custom-header': 'speed-to-lead',
        },
        body: JSON.stringify({ ok: true }),
      }),
      { params: {} } as never,
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('x-legacy')).toBe('yes');
    await expect(response.json()).resolves.toEqual({
      method: 'POST',
      path: '/.netlify/functions/example',
      rawUrl: 'https://boltcall.org/.netlify/functions/example?mode=test&limit=2',
      rawQuery: 'mode=test&limit=2',
      body: '{"ok":true}',
      query: {
        limit: '2',
        mode: 'test',
      },
      authLower: 'Bearer test-token',
      authUpper: 'Bearer test-token',
    });
  });

  it('translates a legacy Handler response into a standard Response', async () => {
    const wrapped = withLegacyHandler(
      vi.fn(async () => ({
        statusCode: 202,
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from('hello from legacy', 'utf8').toString('base64'),
        isBase64Encoded: true,
      })),
    );

    const response = await wrapped(
      new Request('https://boltcall.org/.netlify/functions/example', {
        method: 'POST',
        body: 'ignored',
      }),
      { params: {} } as never,
    );

    expect(response.status).toBe(202);
    expect(response.headers.get('content-type')).toBe('text/plain');
    await expect(response.text()).resolves.toBe('hello from legacy');
  });

  it('lets an existing function run through its default export on the modern runtime path', async () => {
    const { default: embedConfig } = await import('../embed-config');

    const response = await embedConfig(
      new Request('https://boltcall.org/.netlify/functions/embed-config', {
        method: 'GET',
      }),
      { params: {} } as never,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'token parameter required',
    });
  });
});
