import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getSupabase() {
  // challenge_attempts is service-role-only by design (no anon/authenticated
  // grants), so the anon-key fallback would be a silent failure.
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Generate weekly code from week number + secret salt
// Changes every Monday at 00:00 UTC
function getCurrentCode(): string {
  const override = process.env.BREAK_MY_AI_CODE;
  if (override) return override.toUpperCase();

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const salt = process.env.BREAK_MY_AI_SALT || 'boltcall-unbreakable';
  // Simple deterministic code: take characters from hashed combo
  const combo = `${salt}-${now.getFullYear()}-W${weekNum}`;
  let hash = 0;
  for (let i = 0; i < combo.length; i++) {
    hash = ((hash << 5) - hash + combo.charCodeAt(i)) | 0;
  }
  const words = ['BOLT', 'CALL', 'SPEED', 'LEAD', 'RUSH', 'SNAP', 'BLITZ', 'FLASH', 'SONIC', 'RAPID'];
  const w1 = words[Math.abs(hash) % words.length];
  const w2 = words[Math.abs(hash >> 8) % words.length];
  const num = Math.abs(hash % 900) + 100;
  return `${w1}${w2}${num}`;
}

// Get current week identifier for grouping
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

// Ensure the challenge_attempts table exists
async function ensureTable(supabase: ReturnType<typeof createClient>) {
  // Try a simple select — if it fails, table doesn't exist
  const { error } = await supabase.from('challenge_attempts').select('id').limit(1);
  if (false && error && error.code === '42P01') {
    // Table doesn't exist — create it via raw SQL
    const { error: createError } = await supabase.rpc('table_create_disabled', {
      sql: `
        CREATE TABLE IF NOT EXISTS challenge_attempts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          code_submitted TEXT NOT NULL,
          is_correct BOOLEAN NOT NULL DEFAULT false,
          week TEXT NOT NULL,
          call_duration_seconds INTEGER,
          technique_used TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_challenge_week ON challenge_attempts(week);
        CREATE INDEX IF NOT EXISTS idx_challenge_correct ON challenge_attempts(is_correct);
      `,
    });
    // If RPC doesn't exist, table needs to be created manually via Supabase dashboard
    if (createError) {
      console.warn('Could not auto-create table. Create challenge_attempts table manually.', createError);
    }
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database not configured' }),
    };
  }

  const path = event.path.replace('/.netlify/functions/break-my-ai', '').replace(/^\//, '');

  // ── POST /submit — Verify a code submission ─────────────────────────────
  if (event.httpMethod === 'POST' && (path === 'submit' || path === '' || path === '/')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, email, code, callDuration, technique } = body;

      if (!name || !code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name and code are required' }),
        };
      }

      const currentCode = getCurrentCode();
      const isCorrect = code.toUpperCase().trim() === currentCode;
      const week = getCurrentWeek();

      // Log the attempt
      await supabase.from('challenge_attempts').insert({
        name: name.trim(),
        email: email?.trim() || null,
        code_submitted: code.toUpperCase().trim(),
        is_correct: isCorrect,
        week,
        call_duration_seconds: callDuration || null,
        technique_used: technique?.trim() || null,
      });

      if (isCorrect) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'You cracked the code! Our team will contact you within 24 hours.',
            winner: true,
          }),
        };
      }

      // Count this person's attempts this week
      const { count } = await supabase
        .from('challenge_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('week', week)
        .ilike('name', name.trim());

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          winner: false,
          message: "Not the right code. Our AI held strong.",
          attempts: count || 1,
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process submission' }),
      };
    }
  }

  // ── GET /leaderboard — Top challengers this week ────────────────────────
  if (event.httpMethod === 'GET' && path === 'leaderboard') {
    const week = getCurrentWeek();

    // Get all attempts this week, grouped stats
    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('name, is_correct, created_at')
      .eq('week', week)
      .order('created_at', { ascending: false })
      .limit(200);

    // Aggregate by name
    const players = new Map<string, { attempts: number; won: boolean; lastAttempt: string }>();
    for (const a of attempts || []) {
      const existing = players.get(a.name) || { attempts: 0, won: false, lastAttempt: a.created_at };
      existing.attempts++;
      if (a.is_correct) existing.won = true;
      players.set(a.name, existing);
    }

    // Sort: winners first, then by most attempts
    const leaderboard = Array.from(players.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        if (a.won !== b.won) return a.won ? -1 : 1;
        return b.attempts - a.attempts;
      })
      .slice(0, 20);

    // Overall stats
    const totalAttempts = attempts?.length || 0;
    const totalWins = attempts?.filter(a => a.is_correct).length || 0;
    const uniquePlayers = players.size;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        week,
        leaderboard,
        stats: {
          totalAttempts,
          totalWins,
          uniquePlayers,
          winRate: totalAttempts > 0 ? ((totalWins / totalAttempts) * 100).toFixed(1) : '0',
        },
      }),
    };
  }

  // ── GET /stats — Aggregate stats (all time) ─────────────────────────────
  if (event.httpMethod === 'GET' && path === 'stats') {
    const { count: totalAttempts } = await supabase
      .from('challenge_attempts')
      .select('*', { count: 'exact', head: true });

    const { count: totalWins } = await supabase
      .from('challenge_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('is_correct', true);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalAttempts: totalAttempts || 0,
        totalWins: totalWins || 0,
        winRate: (totalAttempts || 0) > 0
          ? (((totalWins || 0) / (totalAttempts || 0)) * 100).toFixed(1)
          : '0',
        aiDefenseRate: (totalAttempts || 0) > 0
          ? ((1 - (totalWins || 0) / (totalAttempts || 0)) * 100).toFixed(1)
          : '100',
      }),
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' }),
  };
};

export { handler };
