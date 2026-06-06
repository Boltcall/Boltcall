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
    queryStringParameters: (overrides.queryStringParameters as Record<string, string>) || null,
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

describe('acs-numbers hardening', () => {
  it('rejects unauthenticated phone-number administration requests', async () => {
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../acs-numbers');

    const res = await handler(
      makeEvent({
        httpMethod: 'GET',
        queryStringParameters: { action: 'available' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('rejects disallowed browser origins before phone-provider access', async () => {
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../acs-numbers');

    const res = await handler(
      makeEvent({
        httpMethod: 'GET',
        headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
        queryStringParameters: { action: 'available' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example');
  });
});

describe('public cost endpoint hardening', () => {
  it('does not create challenge Retell agents when the admin token is missing', async () => {
    delete process.env.ADMIN_API_TOKEN;
    process.env.RETELL_API_KEY = 'test-retell-key';
    const { handler } = await import('../create-challenge-agent');

    const res = await handler(
      makeEvent({ body: {} }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/admin api token/i);
  });

  it('rejects public Cekura provider bridge calls without the internal secret', async () => {
    delete process.env.INTERNAL_API_SECRET;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
    const { handler } = await import('../cekura-test');

    const res = await handler(
      makeEvent({
        body: { action: 'full_test', retell_agent_id: 'agent-victim', agent_name: 'Victim' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toMatch(/internal/i);
  });

  it('rejects unauthenticated Cekura phone verification provider calls', async () => {
    process.env.CEKURA_API_KEY = 'test-cekura-key';
    const { handler } = await import('../cekura-verify');

    const res = await handler(
      makeEvent({
        body: { action: 'validate', phone_number: '+15551234567' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toMatch(/authentication/i);
  });

  it('rejects unauthenticated Retell voice provider listing calls', async () => {
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../retell-voices');

    const res = await handler(
      makeEvent({ httpMethod: 'GET' }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(401);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('rejects cross-site PageSpeed proxy calls before using the API key', async () => {
    delete process.env.PAGESPEED_API_KEY;
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../pagespeed');

    const res = await handler(
      makeEvent({
        headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
        body: { url: 'https://example.com' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example');
  });

  it('rejects non-http PageSpeed URLs before calling the provider', async () => {
    process.env.PAGESPEED_API_KEY = 'test-pagespeed-key';
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../pagespeed');

    const res = await handler(
      makeEvent({ body: { url: 'file:///etc/passwd' } }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/http/i);
  });

  it('rejects cross-site Brevo subscribe calls before using Brevo credentials', async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_LIST_ID;
    process.env.URL = 'https://boltcall.org';
    const { handler } = await import('../brevo-subscribe');

    const res = await handler(
      makeEvent({
        headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
        body: { email: 'lead@example.com' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example');
  });
});

describe('break-my-ai legacy endpoint hardening', () => {
  it('does not accept the old public fallback code when no challenge secret is configured', async () => {
    delete process.env.BREAK_MY_AI_CODE;
    delete process.env.BREAK_MY_AI_SALT;
    delete process.env.CHALLENGE_SECRET_WORD;
    process.env.URL = 'https://boltcall.org';

    const { handler } = await import('../break-my-ai');
    const res = await handler(
      makeEvent({
        path: '/.netlify/functions/break-my-ai/submit',
        body: { name: 'Noam', email: 'noam@example.com', code: 'boltcall' },
      }) as any,
      {} as any,
    );

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toMatch(/not configured/i);
  });
});
