import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { notifyError } from './_shared/notify';
import { randomUUID } from 'crypto';
import { withLegacyHandler } from './_shared/runtime-compat';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';
const BREVO_API_BASE = 'https://api.brevo.com/v3';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify authentication
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const supabase = getServiceClient();
  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const authUserId = authUser.id;

  // Confirm the authenticated user has owner|admin authority on a given workspace.
  // Either via workspaces.owner_id (solo owner) or via workspace_members.role.
  async function isOwnerOrAdmin(workspaceId: string): Promise<boolean> {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    if (ws && ws.owner_id === authUserId) return true;

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role, status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', authUserId)
      .eq('status', 'active')
      .maybeSingle();
    return !!membership && (membership.role === 'owner' || membership.role === 'admin');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'invite';

    // ─── INVITE MEMBER ───────────────────────────────────────────
    if (action === 'invite') {
      const { email, role, workspaceId, businessName } = body;

      if (!email || !workspaceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'email and workspaceId are required' }) };
      }

      // Authorization: caller must be owner|admin of the target workspace.
      if (!(await isOwnerOrAdmin(workspaceId))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only owners and admins can invite members' }) };
      }

      // invitedBy is always the authenticated user — never trust a body-supplied id.
      const invitedBy = authUser.id;

      // Check if already invited
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .single();

      if (existing && existing.status === 'active') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'This person is already a team member' }) };
      }

      const inviteToken = randomUUID();

      if (existing) {
        // Re-invite
        await supabase
          .from('workspace_members')
          .update({
            invite_token: inviteToken,
            role: role || 'member',
            status: 'pending',
            invited_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // New invite
        await supabase.from('workspace_members').insert({
          workspace_id: workspaceId,
          email,
          role: role || 'member',
          status: 'pending',
          invited_by: invitedBy,
          invite_token: inviteToken,
        });
      }

      // Send invite email via Brevo
      const brevoApiKey = process.env.BREVO_API_KEY;
      if (brevoApiKey) {
        const inviteUrl = `https://boltcall.org/invite?token=${inviteToken}`;
        await fetch(`${BREVO_API_BASE}/smtp/email`, {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Boltcall', email: process.env.BREVO_FROM_EMAIL || 'noreply@boltcall.org' },
            to: [{ email }],
            subject: `You've been invited to ${businessName || 'a Boltcall workspace'}`,
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2563EB;">You're invited!</h2>
                <p>You've been invited to join <strong>${businessName || 'a workspace'}</strong> on Boltcall as a <strong>${role || 'member'}</strong>.</p>
                <a href="${inviteUrl}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Accept Invitation</a>
                <p style="color: #6B7280; font-size: 14px;">If you don't recognize this invitation, you can safely ignore this email.</p>
              </div>
            `,
          }),
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, inviteToken }) };
    }

    // ─── ACCEPT INVITE ───────────────────────────────────────────
    if (action === 'accept') {
      const { inviteToken } = body;

      if (!inviteToken) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'inviteToken is required' }) };
      }

      const { data: member, error: findError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (findError || !member) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invalid or expired invitation' }) };
      }

      // Bind the invite to the authenticated user — body-supplied userId is ignored.
      // Optionally also verify the invite was for this user's email.
      if (member.email && authUser.email && member.email.toLowerCase() !== authUser.email.toLowerCase()) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'This invitation was sent to a different email' }) };
      }

      await supabase
        .from('workspace_members')
        .update({
          user_id: authUser.id,
          status: 'active',
          accepted_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq('id', member.id);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, workspaceId: member.workspace_id }) };
    }

    // ─── REMOVE MEMBER ───────────────────────────────────────────
    if (action === 'remove') {
      const { memberId, workspaceId } = body;

      if (!memberId || !workspaceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'memberId and workspaceId are required' }) };
      }

      // Authorization derives from the authenticated JWT, not from a body field.
      if (!(await isOwnerOrAdmin(workspaceId))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only owners and admins can remove members' }) };
      }

      await supabase
        .from('workspace_members')
        .update({ status: 'removed' })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── LIST MEMBERS ────────────────────────────────────────────
    if (action === 'list') {
      const { workspaceId } = body;

      if (!workspaceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspaceId is required' }) };
      }

      // Caller must at least be a member of the workspace to see its roster.
      const { data: ws } = await supabase
        .from('workspaces')
        .select('user_id')
        .eq('id', workspaceId)
        .maybeSingle();
      const isOwner = ws?.user_id === authUser.id;
      let allowed = isOwner;
      if (!allowed) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .maybeSingle();
        allowed = !!membership;
      }
      if (!allowed) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not a member of this workspace' }) };
      }

      const { data: members } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'removed')
        .order('invited_at', { ascending: true });

      return { statusCode: 200, headers, body: JSON.stringify({ members: members || [] }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  } catch (err: any) {
    console.error('[invite-member] Error:', err);
    await notifyError('invite-member: Unhandled exception', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Member management failed' }) };
  }
};

export default withLegacyHandler(handler);
