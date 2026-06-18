import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_shared/cors';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  // Validate auth
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    switch (event.httpMethod) {
      case 'POST': {
        // Create custom role
        const { name, slug, description, color, permissionIds } = body;
        if (!name || !slug) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'name and slug required' }) };
        }

        const { data: role, error } = await supabase
          .from('roles')
          .insert({
            workspace_id: user.id,
            name,
            slug,
            description: description || '',
            color: color || 'blue',
            icon: 'Shield',
            is_system: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Assign permissions
        if (role && permissionIds?.length > 0) {
          const rows = permissionIds.map((pid: string) => ({ role_id: role.id, permission_id: pid }));
          await supabase.from('role_permissions').insert(rows);
        }

        // Log
        await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          action: 'role_created',
          details: `Created role "${name}" with ${permissionIds?.length || 0} permissions`,
          ip_address: event.headers['x-forwarded-for'] || null,
        });

        return { statusCode: 200, headers: cors, body: JSON.stringify({ role }) };
      }

      case 'PUT': {
        // Update role
        const { roleId, updates, permissionIds } = body;
        if (!roleId) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'roleId required' }) };
        }

        // Prevent editing system roles
        const { data: existingRole } = await supabase
          .from('roles')
          .select('is_system')
          .eq('id', roleId)
          .single();

        if (existingRole?.is_system) {
          return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Cannot edit system roles' }) };
        }

        if (updates) {
          await supabase.from('roles').update(updates).eq('id', roleId);
        }

        if (permissionIds !== undefined) {
          await supabase.from('role_permissions').delete().eq('role_id', roleId);
          if (permissionIds.length > 0) {
            const rows = permissionIds.map((pid: string) => ({ role_id: roleId, permission_id: pid }));
            await supabase.from('role_permissions').insert(rows);
          }
        }

        await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          action: 'role_modified',
          details: `Updated role ${roleId}`,
          ip_address: event.headers['x-forwarded-for'] || null,
        });

        return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
      }

      case 'DELETE': {
        const { roleId } = body;
        if (!roleId) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'roleId required' }) };
        }

        await supabase.from('role_permissions').delete().eq('role_id', roleId);
        await supabase.from('roles').delete().eq('id', roleId).eq('is_system', false);

        await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          action: 'role_deleted',
          details: `Deleted role ${roleId}`,
          ip_address: event.headers['x-forwarded-for'] || null,
        });

        return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};

export default withLegacyHandler(handler);
