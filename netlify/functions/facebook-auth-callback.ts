import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { verifyOAuthState } from './_shared/oauth-state';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Facebook OAuth — Step 2: Exchange the authorization code for tokens, store page connection.
 *
 * Facebook redirects here after user authorizes. This function:
 *   1. Exchanges the code for a user access token
 *   2. Fetches the user's Facebook Pages
 *   3. Stores page_id + access_token in Supabase `facebook_page_connections`
 *   4. Subscribes the page to leadgen webhooks
 *   5. Redirects the user back to the dashboard
 *
 * Environment variables:
 *   - FB_APP_ID — Facebook App ID
 *   - FB_APP_SECRET — Facebook App Secret (server-side only!)
 *   - SUPABASE_URL (or VITE_SUPABASE_URL) — Supabase project URL
 *   - SUPABASE_SERVICE_KEY — Supabase service-role key
 *   - URL or DEPLOY_URL — Netlify site URL (auto-set by Netlify)
 *
 * Query parameters (from Facebook redirect):
 *   - code — authorization code
 *   - state — CSRF token (optional verification)
 *   - error — present if user denied access
 *
 * Additional query parameter (set by frontend before redirect):
 *   - user_id — the Supabase auth user ID to associate with the page connection
 */

const FACEBOOK_RETURN_PATH = '/dashboard/ad-instant-response';

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
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=error`);
  }

  const code = params.code;
  if (!code) {
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=missing_code`);
  }

  const state = verifyOAuthState(params.state, 'facebook');
  const userId = state?.userId;
  if (!userId) {
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=missing_user`);
  }

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    console.error('Missing FB_APP_ID or FB_APP_SECRET');
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=config_error`);
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
  const redirectUri = encodeURIComponent(`${baseUrl}/.netlify/functions/facebook-auth-callback`);

  try {
    // Step 1: Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&redirect_uri=${redirectUri}` +
        `&client_secret=${appSecret}` +
        `&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData);
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=token_fail`);
    }

    const userAccessToken = tokenData.access_token as string;

    // Step 2: Get the user's Pages (with page access tokens)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok) {
      console.error('Pages fetch failed:', pagesData);
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=pages_fail`);
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=no_pages`);
    }

    const supabase = getServiceSupabase();
    const { data: workspace, error: workspaceErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (workspaceErr) {
      console.error('Failed to resolve workspace for Facebook connection:', workspaceErr);
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=workspace_error`);
    }

    const workspaceId = workspace?.id ?? null;

    // Step 3: Store each page connection and subscribe to leadgen.
    // Report success only when at least one Page is both stored and subscribed.
    const storedPages: string[] = [];
    const connectedPages: string[] = [];

    for (const page of pages) {
      const pageId = page.id;
      const pageAccessToken = page.access_token;

      // Upsert into facebook_page_connections
      const { error: upsertErr } = await supabase
        .from('facebook_page_connections')
        .upsert(
          {
            user_id: userId,
            workspace_id: workspaceId,
            page_id: pageId,
            page_name: page.name,
            access_token: pageAccessToken,
            status: 'connected',
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'page_id' }
        );

      if (upsertErr) {
        console.error(`Failed to store page ${pageId}:`, upsertErr);
        continue;
      }
      storedPages.push(page.name);

      // Step 4: Subscribe the page to leadgen webhooks
      const subRes = await fetch(
        `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps` +
          `?subscribed_fields=leadgen&access_token=${pageAccessToken}`,
        { method: 'POST' }
      );
      const subData = await subRes.json();

      if (!subRes.ok) {
        console.error(`Subscribe failed for page ${pageId}:`, subData);
      } else {
        connectedPages.push(page.name);
      }
    }

    if (storedPages.length === 0) {
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=store_fail`);
    }

    if (connectedPages.length === 0) {
      return redirect(`${FACEBOOK_RETURN_PATH}?fb=subscribe_fail`);
    }

    const pagesParam = encodeURIComponent(connectedPages.join(','));
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=success&pages=${pagesParam}`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return redirect(`${FACEBOOK_RETURN_PATH}?fb=error`);
  }
};

export default withLegacyHandler(handler);
