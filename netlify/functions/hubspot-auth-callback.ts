import { Handler } from '@netlify/functions';
import { getAppSecret } from './_shared/app-secrets';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';
import { withLegacyHandler } from './_shared/runtime-compat';

function redirect(path: string) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  return {
    statusCode: 302,
    headers: { Location: `${baseUrl}${path}` },
    body: '',
  };
}

const DEFAULT_HUBSPOT_CLIENT_ID = '46c5edfe-64a1-4b6b-8f0d-e83faeca8124';

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
    console.error('HubSpot OAuth denied:', params.error);
    return redirect('/dashboard/integrations?hubspot=error');
  }

  const code = params.code;
  if (!code) {
    return redirect('/dashboard/integrations?hubspot=missing_code');
  }

  const state = verifyOAuthState(params.state, 'hubspot');
  const userId = state?.userId || null;
  if (!userId) {
    return redirect('/dashboard/integrations?hubspot=missing_user');
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID || DEFAULT_HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || await getAppSecret('hubspot_client_secret');
  if (!clientId || !clientSecret) {
    console.error('Missing HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET');
    return redirect('/dashboard/integrations?hubspot=config_error');
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/hubspot-auth-callback`;

  try {
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
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
      console.error('HubSpot token exchange failed:', tokenData);
      return redirect('/dashboard/integrations?hubspot=token_fail');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = Number(tokenData.expires_in || 1800);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    let accountInfo: Record<string, unknown> = {};
    try {
      const infoRes = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
      );
      if (infoRes.ok) {
        accountInfo = await infoRes.json();
      }
    } catch {
      // Helpful for display, but not required to store the connection.
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
      .eq('provider', 'hubspot')
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
          provider: 'hubspot',
          is_connected: true,
          api_key: refreshToken || null,
          config,
        });
    }

    return redirect('/dashboard/integrations?hubspot=success');
  } catch (error) {
    console.error('HubSpot OAuth callback error:', error);
    return redirect('/dashboard/integrations?hubspot=error');
  }
};

export default withLegacyHandler(handler);
