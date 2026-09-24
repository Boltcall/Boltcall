import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateApiKeyMock = vi.hoisted(() => vi.fn());
const requireInternalOrMatchingUserMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/token-utils', () => ({
  deductTokens: vi.fn(),
  TOKEN_COSTS: { email_sent: 1 },
}));

vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));

vi.mock('../_shared/validate-api-key', () => ({
  authenticateApiKey: authenticateApiKeyMock,
}));

vi.mock('../_shared/user-auth', () => ({
  requireInternalOrMatchingUser: requireInternalOrMatchingUserMock,
}));

function makeEvent(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    queryStringParameters: null,
    body: JSON.stringify(body),
  } as any;
}

describe('send-email F121 — From address is never caller-controlled', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('BREVO_API_KEY', 'brevo-test-key');
    vi.stubEnv('BREVO_FROM_EMAIL', 'noreply@boltcall.org');

    authenticateApiKeyMock.mockResolvedValue({ hasKey: false });
    requireInternalOrMatchingUserMock.mockResolvedValue({ ok: true, userId: 'user-1', user: null });

    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ messageId: 'msg-1' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('ignores a caller-supplied fromEmail and always sends from the verified Boltcall sender', async () => {
    const { testHandler: handler } = await import('../send-email');

    const res = await handler(
      makeEvent({
        action: 'send',
        to: 'lead@example.com',
        subject: 'Hi',
        fromEmail: 'attacker@evil.com',
        fromName: 'Totally Legit Bank',
        replyTo: 'reply@example.com',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.sender.email).toBe('noreply@boltcall.org');
    expect(sentBody.sender.name).toBe('Totally Legit Bank'); // display name stays caller-controlled
    expect(sentBody.replyTo).toEqual({ email: 'reply@example.com' });
  });
});
