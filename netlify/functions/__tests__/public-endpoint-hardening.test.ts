import { beforeEach, describe, expect, it } from 'vitest';
import { signJsonToken, verifyJsonToken } from '../_shared/signed-token';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    httpMethod: (overrides.httpMethod as string) || 'POST',
    headers: (overrides.headers as Record<string, string>) || {
      origin: 'https://boltcall.org',
      'content-type': 'application/json',
    },
    body: typeof overrides.body === 'string' ? overrides.body : JSON.stringify(overrides.body || {}),
    queryStringParameters: null,
    path: (overrides.path as string) || '/.netlify/functions/test',
  } as unknown;
}

describe('signed-token helper', () => {
  it('verifies untampered tokens and rejects tampered tokens', () => {
    const secret = 'test-secret-long-enough-for-hmac';
    const token = signJsonToken({ email: 'lead@example.com' }, secret, 60);

    expect(verifyJsonToken<{ email: string }>(token, secret)?.email).toBe('lead@example.com');
    expect(verifyJsonToken(`${token.slice(0, -1)}x`, secret)).toBeNull();
  });
});

describe('challenge-submit hardening', () => {
  beforeEach(() => {
    process.env.URL = 'https://boltcall.org';
    process.env.CHALLENGE_SECRET_WORD = 'swordfish';
    process.env.CHALLENGE_CLAIM_SECRET = 'test-claim-secret-long-enough';
  });

  it('does not fall back to a public default challenge word', async () => {
    delete process.env.CHALLENGE_SECRET_WORD;
    const { handler } = await import('../challenge-submit');

    const res = await handler(
      makeEvent({ body: { word: 'boltcall', name: 'Noam', email: 'noam@example.com' } }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(503);
  });

  it('returns a signed claim token only for the configured winner word', async () => {
    const { handler } = await import('../challenge-submit');

    const res = await handler(
      makeEvent({ body: { word: 'swordfish', name: 'Noam', email: 'noam@example.com' } }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.winner).toBe(true);
    expect(body.claim_token).toEqual(expect.any(String));

    const claim = verifyJsonToken<{ email: string; challenge: string }>(
      body.claim_token,
      process.env.CHALLENGE_CLAIM_SECRET!,
    );
    expect(claim?.email).toBe('noam@example.com');
    expect(claim?.challenge).toBe('break-our-ai');
  });

  it('rejects disallowed browser origins', async () => {
    const { handler } = await import('../challenge-submit');

    const res = await handler(
      makeEvent({
        headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
        body: { word: 'swordfish', name: 'Noam', email: 'noam@example.com' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example');
  });
});

describe('chatkit-session hardening', () => {
  it('is disabled unless CHATKIT_PUBLIC_ENABLED is explicitly true', async () => {
    delete process.env.CHATKIT_PUBLIC_ENABLED;
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../chatkit-session');

    const res = await handler(
      makeEvent({ body: { deviceId: 'device_123456789' } }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/disabled/i);
  });
});
