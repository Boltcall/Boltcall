import { describe, expect, it } from 'vitest';
import { withLegacyHandler } from '../_shared/runtime-compat';

const handler = async () => ({
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: '{}',
});

function call(fn: ReturnType<typeof withLegacyHandler>, origin: string) {
  return fn(new Request('https://boltcall.org/.netlify/functions/x', { headers: { origin } }), {} as any);
}

describe('withLegacyHandler strictCors', () => {
  it('echoes an allowlisted origin', async () => {
    const res = await call(withLegacyHandler(handler, { strictCors: true }), 'https://boltcall.org');
    expect(res.headers.get('access-control-allow-origin')).toBe('https://boltcall.org');
    expect(res.headers.get('vary')).toBe('Origin');
  });

  it('never returns * to a foreign origin', async () => {
    const res = await call(withLegacyHandler(handler, { strictCors: true }), 'https://evil.example');
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*');
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
  });

  it('leaves public endpoints on * by default', async () => {
    const res = await call(withLegacyHandler(handler), 'https://evil.example');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
