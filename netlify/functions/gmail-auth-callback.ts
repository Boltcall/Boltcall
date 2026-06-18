import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Gmail OAuth — Step 2: Exchange the authorization code for tokens.
 *
 * Google redirects here after user authorizes. This function:
 *   1. Decodes the state to get user_id
 *   2. Exchanges the code for access_token + refresh_token
 *   3. Fetches the user's Gmail address
 *   4. Stores tokens in Supabase `email_accounts`
 *   5. Redirects the user back to the Email dashboard page
 *
 * Environment variables:
 *   - GOOGLE_CLIENT_ID — Google OAuth Client ID
 *   - GOOGLE_CLIENT_SECRET — Google OAuth Client Secret
 *   - SUPABASE_URL (or VITE_SUPABASE_URL) — Supabase project URL
 *   - SUPABASE_SERVICE_KEY — Supabase service-role key
 *   - URL or DEPLOY_URL — Netlify site URL
 */

function redirect(path: string) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  return {
    statusCode: 302,
    headers: { Location: `${baseUrl}${path}` },
    body: '',
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters || {};

  // Handle denied access
  if (params.error) {
    console.error('Gmail OAuth denied:', params.error);
    return redirect('/dashboard/email?connect=error');
  }

  const code = params.code;
  if (!code) {
    return redirect('/dashboard/email?connect=missing_code');
  }

  const state = verifyOAuthState(params.state, 'gmail');
  const userId = state?.userId || null;

  if (!userId) {
    return redirect('/dashboard/email?connect=missing_user');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return redirect('/dashboard/email?connect=config_error');
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/gmail-auth-callback`;

  try {
    // Step 1: Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Gmail token exchange failed:', tokenData);
      return redirect('/dashboard/email?connect=token_fail');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = tokenData.expires_in as number;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 2: Get the user's email address
    let emailAddress = '';
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        emailAddress = profileData.email || '';
      }
    } catch {
      console.error('Failed to fetch Gmail profile');
    }

    if (!emailAddress) {
      return redirect('/dashboard/email?connect=no_email');
    }

    // Step 3: Get initial sync cursor (latest historyId)
    let syncCursor: string | null = null;
    try {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        syncCursor = profileData.historyId || null;
      }
    } catch {
      // Will do full sync on first poll
    }

    // Step 4: Upsert into email_accounts
    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .eq('email_address', emailAddress)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('email_accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
          token_expires_at: expiresAt,
          sync_cursor: syncCursor,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('email_accounts')
        .insert({
          user_id: userId,
          provider: 'gmail',
          email_address: emailAddress,
          access_token: accessToken,
          refresh_token: refreshToken || null,
          token_expires_at: expiresAt,
          sync_cursor: syncCursor,
          is_active: true,
          settings: {
            auto_send: false,
            response_tone: 'professional',
            excluded_senders: [],
            daily_cap: 50,
          },
        });
    }

    const encodedEmail = encodeURIComponent(emailAddress);
    return redirect(`/dashboard/email?connect=success&email=${encodedEmail}`);
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return redirect('/dashboard/email?connect=error');
  }
};

export default withLegacyHandler(handler);
