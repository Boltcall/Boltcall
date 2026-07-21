import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://puszjwovldwgitfpsnfm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1c3pqd292bGR3Z2l0ZnBzbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzI3NzUsImV4cCI6MjEwMDIwODc3NX0.S5bHgXWWdcnB_S9_mUFF2HPbl84dPks9_LBvWAFIQeQ';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
);

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

    if (error) {
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=error`);
    }

    if (!code) {
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=missing_code`);
    }

    // 1) Exchange code for short-lived user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?client_id=${process.env.FB_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(`${appUrl}/api/auth/facebook/callback`)}` +
        `&client_secret=${process.env.FB_APP_SECRET}` +
        `&code=${code}`
    );
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData);
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=token_fail`);
    }

    const userAccessToken = tokenData.access_token as string;

    // 2) Get list of Pages the user manages (and their page access tokens)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) {
      console.error('Pages fetch failed:', pagesData);
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=pages_fail`);
    }

    // pagesData.data is an array: [{id, name, access_token, ...}]
    // Let the user choose pages in your UI, OR auto-connect the first one for a quick POC.
    const firstPage = pagesData.data?.[0];
    if (!firstPage) {
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=no_pages`);
    }

    const pageId = firstPage.id;
    const pageAccessToken = firstPage.access_token;

    // 3) Store tokens per workspace (encrypt at rest in production)
    // Assume you know the workspace/user from session cookie/JWT
    const workspaceId = "YOUR_WORKSPACE_ID"; // replace with real lookup from session/auth
    await supabase.from("facebook_page_connections").upsert({
      workspace_id: workspaceId,
      page_id: pageId,
      page_name: firstPage.name,
      page_access_token: pageAccessToken,
    }, { onConflict: "workspace_id,page_id" });

    // 4) Subscribe the Page to your app's webhooks (leadgen)
    const subRes = await fetch(
      `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps` +
        `?subscribed_fields=leadgen&access_token=${pageAccessToken}`,
      { method: "POST" }
    );
    const subData = await subRes.json();
    if (!subRes.ok) {
      console.error("Subscribe error:", subData);
      return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=subscribe_fail`);
    }

    // Done — redirect back to your Instant Lead Reply page
    return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=success`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/dashboard/instant-lead-reply?fb=error`);
  }
}
