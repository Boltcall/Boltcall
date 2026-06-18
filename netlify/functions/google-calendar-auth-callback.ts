import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Google Calendar OAuth — Step 2: Exchange the authorization code for tokens.
 *
 * Google redirects here after user authorizes. This function:
 *   1. Decodes the state to get user_id
 *   2. Exchanges the code for access_token + refresh_token
 *   3. Fetches the user's email and calendar list
 *   4. Stores tokens in Supabase `user_integrations`
 *   5. Redirects the user back to the dashboard
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
    console.error('Google OAuth denied:', params.error);
    return redirect('/dashboard/integrations?gcal=error');
  }

  const code = params.code;
  if (!code) {
    return redirect('/dashboard/integrations?gcal=missing_code');
  }

  const state = verifyOAuthState(params.state, 'google_calendar');
  const userId = state?.userId || null;
  if (!userId) {
    return redirect('/dashboard/integrations?gcal=missing_user');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return redirect('/dashboard/integrations?gcal=config_error');
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = `${baseUrl}/.netlify/functions/google-calendar-auth-callback`;

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
      console.error('Google token exchange failed:', tokenData);
      return redirect('/dashboard/integrations?gcal=token_fail');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = tokenData.expires_in as number; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 2: Get the user's email
    let userEmail = 'primary';
    try {
      const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        userEmail = meData.email || 'primary';
      }
    } catch {
      // Fallback to 'primary'
    }

    // Step 3: Get the user's calendar list to find primary calendar
    let calendarId = userEmail;
    let calendarName = 'Primary Calendar';
    try {
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        const primary = calData.items?.find((c: any) => c.primary);
        if (primary) {
          calendarId = primary.id;
          calendarName = primary.summary || 'Primary Calendar';
        }
      }
    } catch {
      // Fallback to email
    }

    // Step 4: Store in Supabase
    const supabase = getServiceSupabase();
    const config = {
      calendar_id: calendarId,
      calendar_name: calendarName,
      user_email: userEmail,
      access_token: accessToken,
      token_expires_at: expiresAt,
    };

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_integrations')
        .update({
          is_connected: true,
          api_key: refreshToken || null, // Store refresh_token in api_key field
          config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'google_calendar',
          is_connected: true,
          api_key: refreshToken || null,
          config,
        });
    }

    const encodedName = encodeURIComponent(calendarName);
    return redirect(`/dashboard/integrations?gcal=success&calendar=${encodedName}`);
  } catch (error) {
    console.error('Google Calendar OAuth callback error:', error);
    return redirect('/dashboard/integrations?gcal=error');
  }
};

export default withLegacyHandler(handler);
