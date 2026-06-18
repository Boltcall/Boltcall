import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_shared/cors';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const handler: Handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
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
    const { emails, role, message } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'emails array is required' }) };
    }

    const success: string[] = [];
    const failed: string[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.toLowerCase().trim();
      if (!email || !email.includes('@')) {
        failed.push(rawEmail);
        continue;
      }

      // Check for duplicate
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('invited_by', user.id)
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        failed.push(email);
        continue;
      }

      const { error } = await supabase.from('workspace_members').insert({
        invited_by: user.id,
        email,
        role: role || 'viewer',
        status: 'invited',
        invited_at: new Date().toISOString(),
      });

      if (error) {
        failed.push(email);
      } else {
        success.push(email);
      }
    }

    // Log activity
    if (success.length > 0) {
      await supabase.from('activity_logs').insert({
        workspace_id: user.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.name || null,
        action: 'member_invited',
        details: `Invited ${success.length} member(s) as ${role}: ${success.join(', ')}`,
        ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'] || null,
      });
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ success, failed }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
