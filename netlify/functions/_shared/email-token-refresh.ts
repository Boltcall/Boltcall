import { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from './public-config';

/**
 * Email account type matching the email_accounts table.
 */
export interface EmailAccount {
  id: string;
  user_id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  sync_cursor: string | null;
  last_synced_at: string | null;
  is_active: boolean;
  settings: {
    auto_send: boolean;
    response_tone: 'professional' | 'friendly' | 'casual';
    excluded_senders: string[];
    daily_cap: number;
  };
}

/**
 * Get a valid access token for an email account.
 * Refreshes the token if expired or expiring within 5 minutes.
 * Updates the database row with the new token.
 */
export async function getValidAccessToken(
  account: EmailAccount,
  supabase: SupabaseClient
): Promise<string> {
  const now = Date.now();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const fiveMinutes = 5 * 60 * 1000;

  // Token is still valid
  if (expiresAt > now + fiveMinutes) {
    return account.access_token;
  }

  // No refresh token — can't refresh
  if (!account.refresh_token) {
    throw new Error(`No refresh token for ${account.provider} account ${account.email_address}. User needs to reconnect.`);
  }

  // Refresh the token based on provider
  if (account.provider === 'gmail') {
    return refreshGmailToken(account, supabase);
  } else {
    return refreshOutlookToken(account, supabase);
  }
}

async function refreshGmailToken(account: EmailAccount, supabase: SupabaseClient): Promise<string> {
  const clientId = publicEnv('GOOGLE_CLIENT_ID');
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth credentials');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token!,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Gmail token refresh failed:', data);
    // Mark account as inactive if refresh fails (token revoked)
    if (data.error === 'invalid_grant') {
      await supabase
        .from('email_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', account.id);
    }
    throw new Error(`Gmail token refresh failed: ${data.error || res.status}`);
  }

  const newAccessToken = data.access_token as string;
  const expiresIn = data.expires_in as number;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update the database
  await supabase
    .from('email_accounts')
    .update({
      access_token: newAccessToken,
      token_expires_at: newExpiresAt,
      // Gmail may return a new refresh_token (rare, but handle it)
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  return newAccessToken;
}

async function refreshOutlookToken(account: EmailAccount, supabase: SupabaseClient): Promise<string> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Microsoft OAuth credentials');

  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token!,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Outlook token refresh failed:', data);
    if (data.error === 'invalid_grant') {
      await supabase
        .from('email_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', account.id);
    }
    throw new Error(`Outlook token refresh failed: ${data.error || res.status}`);
  }

  const newAccessToken = data.access_token as string;
  const expiresIn = data.expires_in as number;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Outlook always returns a new refresh_token
  await supabase
    .from('email_accounts')
    .update({
      access_token: newAccessToken,
      refresh_token: data.refresh_token || account.refresh_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  return newAccessToken;
}

/**
 * Domains/patterns to auto-skip (newsletters, noreply, etc.)
 */
export const SKIP_SENDER_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^notifications?@/i,
  /^newsletter@/i,
  /^marketing@/i,
  /^support@.*\.(google|microsoft|apple|facebook|meta|twitter|linkedin)\./i,
  /@.*\.noreply\./i,
];

/**
 * Check if an email sender should be skipped (newsletter, noreply, etc.)
 */
export function shouldSkipSender(email: string, excludedSenders: string[]): boolean {
  const lower = email.toLowerCase();

  // Check user's excluded senders list
  if (excludedSenders.some(excluded => lower.includes(excluded.toLowerCase()))) {
    return true;
  }

  // Check built-in skip patterns
  return SKIP_SENDER_PATTERNS.some(pattern => pattern.test(lower));
}
