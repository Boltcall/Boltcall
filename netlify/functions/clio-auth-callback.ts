import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';
import { withLegacyHandler } from './_shared/runtime-compat';
import { clioManageBase, clioOAuthCredentials, normalizeRegion } from './_shared/clio';

/**
 * Clio Manage OAuth callback.
 *
 * Clio returns a `code` valid for 10 minutes. The access token lasts 30 days and
 * the refresh token does not expire, so the refresh token is the durable
 * credential — stored in `api_key`, matching the Pipedrive/Google pattern.
 *
 * Docs: https://docs.developers.clio.com/api-docs/clio-manage/authorization/
 */

function redirect(path: string) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  return {
    statusCode: 302,
    headers: { Location: `${baseUrl}${path}` },
    body: '',
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};

  if (params.error) {
    console.error('Clio OAuth denied:', params.error);
    return redirect('/dashboard/integrations?clio=error');
  }

  const code = params.code;
  if (!code) {
    return redirect('/dashboard/integrations?clio=missing_code');
  }

  const state = verifyOAuthState(params.state, 'clio');
  const userId = state?.userId || null;
  if (!userId) {
    return redirect('/dashboard/integrations?clio=missing_user');
  }

  const region = normalizeRegion(state?.extra?.region);
  const { clientId, clientSecret } = clioOAuthCredentials(region);
  if (!clientId || !clientSecret) {
    console.error(`Missing Clio OAuth credentials for region ${region}`);
    return redirect('/dashboard/integrations?clio=config_error');
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/clio-auth-callback`;
  const apiBase = clioManageBase(region);

  try {
    const tokenRes = await fetch(`${apiBase}/oauth/token`, {
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
      console.error('Clio token exchange failed:', tokenData);
      return redirect('/dashboard/integrations?clio=token_fail');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    // Clio Manage access tokens last 30 days; fall back to that if expires_in is absent.
    const expiresIn = Number(tokenData.expires_in || 30 * 24 * 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    let account: Record<string, unknown> = {};
    try {
      const whoRes = await fetch(`${apiBase}/api/v4/users/who_am_i?fields=id,name,email`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (whoRes.ok) {
        const whoData = await whoRes.json();
        account = whoData?.data || {};
      }
    } catch {
      // Account lookup is helpful context, not required for the connection to work.
    }

    const supabase = getServiceSupabase();
    const config = {
      region,
      access_token: accessToken,
      token_expires_at: expiresAt,
      account,
    };

    const { data: existing } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'clio')
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
          provider: 'clio',
          is_connected: true,
          api_key: refreshToken || null,
          config,
        });
    }

    return redirect('/dashboard/integrations?clio=success');
  } catch (error) {
    console.error('Clio OAuth callback error:', error);
    return redirect('/dashboard/integrations?clio=error');
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
