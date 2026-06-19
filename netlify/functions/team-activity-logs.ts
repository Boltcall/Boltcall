import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_shared/cors';
import { withLegacyHandler } from './_shared/runtime-compat';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const handler: Handler = async (event) => {
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
    switch (event.httpMethod) {
      case 'GET': {
        // Fetch activity logs with filters
        const params = event.queryStringParameters || {};
        const page = parseInt(params.page || '0');
        const limit = parseInt(params.limit || '50');
        const { userId, action, dateFrom, dateTo, search } = params;

        let query = supabase
          .from('activity_logs')
          .select('*', { count: 'exact' })
          .eq('workspace_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * limit, (page + 1) * limit - 1);

        if (userId) query = query.eq('user_id', userId);
        if (action) query = query.eq('action', action);
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);
        if (search) query = query.ilike('details', `%${search}%`);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ logs: data || [], total: count || 0, page, limit }),
        };
      }

      case 'POST': {
        // Log an activity event
        const body = JSON.parse(event.body || '{}');
        const { action, details, metadata } = body;

        if (!action || !details) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'action and details required' }) };
        }

        const { error } = await supabase.from('activity_logs').insert({
          workspace_id: user.id,
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.name || null,
          action,
          details,
          metadata: metadata || null,
          ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'] || null,
        });

        if (error) throw error;

        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ success: true }),
        };
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

export const testHandler = handler;
export default withLegacyHandler(handler);
