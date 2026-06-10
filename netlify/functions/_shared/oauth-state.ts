import crypto from 'crypto';

const MAX_STATE_AGE_MS = 15 * 60 * 1000;

export type OAuthProvider = 'gmail' | 'outlook' | 'google_calendar' | 'facebook' | 'hubspot' | 'pipedrive';

export type OAuthStatePayload = {
  provider: OAuthProvider;
  userId: string;
  nonce: string;
  iat: number;
};

function getSecret(): string {
  const secret =
    process.env.OAUTH_STATE_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';

  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET, INTERNAL_API_SECRET, or SUPABASE_SERVICE_KEY is required');
  }

  return secret;
}

function sign(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createOAuthState(provider: OAuthProvider, userId: string): string {
  const payload: OAuthStatePayload = {
    provider,
    userId,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyOAuthState(state: string | undefined, expectedProvider: OAuthProvider): OAuthStatePayload | null {
  if (!state) return null;

  const [encodedPayload, providedSig] = state.split('.');
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = sign(encodedPayload);
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.provider !== expectedProvider || !payload.userId || !payload.nonce || !payload.iat) {
    return null;
  }

  if (Date.now() - payload.iat > MAX_STATE_AGE_MS) {
    return null;
  }

  return payload;
}
