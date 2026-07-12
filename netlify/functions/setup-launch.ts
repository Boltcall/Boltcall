import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Supabase service credentials not configured' }),
    };
  }

  // Verify the caller's JWT — never trust user_id from the request body.
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { workspaceId } = body;

    if (!workspaceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'workspaceId is required' }),
      };
    }

    // Confirm the authenticated user owns or is an active owner/admin of this workspace.
    const { data: workspace, error: wsLookupError } = await supabase
      .from('workspaces')
      .select('id, user_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsLookupError || !workspace) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace not found' }) };
    }

    let authorized = workspace.user_id === authUser.id;
    if (!authorized) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role, status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .maybeSingle();
      authorized = !!membership && (membership.role === 'owner' || membership.role === 'admin');
    }

    if (!authorized) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized for this workspace' }) };
    }

    const now = new Date().toISOString();

    // Mark workspace setup as complete.
    const { error: wsError } = await supabase
      .from('workspaces')
      .update({
        setup_completed: true,
        setup_completed_at: now,
        updated_at: now,
      })
      .eq('id', workspaceId);

    if (wsError) {
      console.error('Workspace update error:', wsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to mark workspace setup complete', details: wsError.message }),
      };
    }

    const { error: featuresError } = await supabase
      .from('business_features')
      .upsert(
        {
          user_id: authUser.id,
          workspace_id: workspaceId,
          voice_agent_enabled: true,
          speed_to_lead_enabled: true,
          updated_at: now,
        },
        {
          onConflict: 'user_id',
        },
      );

    if (featuresError) {
      console.error('Business features activation error:', featuresError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to activate dashboard features',
          details: featuresError.message,
        }),
      };
    }

    // Flip the workspace into the V2 AI-native dashboard. Separate best-effort
    // update: environments that haven't run the v2_opt_in migration must not
    // fail the whole launch over a missing column.
    const { error: v2Error } = await supabase
      .from('workspaces')
      .update({ v2_enabled: true, updated_at: now })
      .eq('id', workspaceId);

    if (v2Error) {
      console.error('V2 enable on launch failed (non-fatal):', v2Error);
    }

    // Touch business_profiles for the authenticated user. Non-fatal if it fails —
    // workspace.setup_completed is the canonical signal the dashboard reads.
    const { error: bpError } = await supabase
      .from('business_profiles')
      .update({ updated_at: now })
      .eq('user_id', authUser.id);

    if (bpError) {
      console.error('Business profile update error:', bpError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Setup completed successfully',
      }),
    };
  } catch (error) {
    console.error('setup-launch error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Setup launch failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
