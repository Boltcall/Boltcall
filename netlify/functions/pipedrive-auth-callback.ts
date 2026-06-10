import { Handler } from '@netlify/functions';
import { getAppSecret } from './_shared/app-secrets';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';

/**
 * Pipedrive OAuth callback for the public Marketplace app.
 *
 * Pipedrive Developer Hub callback URL:
 *   https://boltcall.org/.netlify/functions/pipedrive-auth-callback
 *
 * Required environment variables:
 *   - PIPEDRIVE_CLIENT_ID
 *   - PIPEDRIVE_CLIENT_SECRET
 *   - SUPABASE_URL or VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *   - URL or DEPLOY_URL
 *
 * Notes:
 *   - Pipedrive sends a short-lived `code` here after the user approves install.
 *   - Boltcall should start OAuth with a signed `state` for provider `pipedrive`
 *     so we can associate the installed account with the correct user.
 */

function redirect(path: string) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  return {
    statusCode: 302,
    headers: { Location: `${baseUrl}${path}` },
    body: '',
  };
}

const DEFAULT_PIPEDRIVE_CLIENT_ID = '3d4d09a12afd8493';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};

  if (params.error) {
    console.error('Pipedrive OAuth denied:', params.error);
    return redirect('/dashboard/integrations?pipedrive=error');
  }

  const code = params.code;
  if (!code) {
    return redirect('/dashboard/integrations?pipedrive=missing_code');
  }

  const state = verifyOAuthState(params.state, 'pipedrive');
  const userId = state?.userId || null;
  if (!userId) {
    return redirect('/dashboard/integrations?pipedrive=missing_user');
  }

  const clientId = process.env.PIPEDRIVE_CLIENT_ID || DEFAULT_PIPEDRIVE_CLIENT_ID;
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET || await getAppSecret('pipedrive_client_secret');
  if (!clientId || !clientSecret) {
    console.error('Missing PIPEDRIVE_CLIENT_ID or PIPEDRIVE_CLIENT_SECRET');
    return redirect('/dashboard/integrations?pipedrive=config_error');
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/pipedrive-auth-callback`;

  try {
    const tokenRes = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Pipedrive token exchange failed:', tokenData);
      return redirect('/dashboard/integrations?pipedrive=token_fail');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = Number(tokenData.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    let accountInfo: Record<string, unknown> = {};
    try {
      const userRes = await fetch('https://api.pipedrive.com/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        accountInfo = userData?.data || {};
      }
    } catch {
      // Account lookup is helpful but not required for connection storage.
    }

    const supabase = getServiceSupabase();
    const config = {
      access_token: accessToken,
      token_expires_at: expiresAt,
      account: accountInfo,
      scopes: tokenData.scope || null,
    };

    const { data: existing } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'pipedrive')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_integrations')
        .update({
          is_connected: true,
          api_key: refreshToken || null,
          config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'pipedrive',
          is_connected: true,
          api_key: refreshToken || null,
          config,
        });
    }

    return redirect('/dashboard/integrations?pipedrive=success');
  } catch (error) {
    console.error('Pipedrive OAuth callback error:', error);
    return redirect('/dashboard/integrations?pipedrive=error');
  }
};
