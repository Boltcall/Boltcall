import { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { withLegacyHandler } from './_shared/runtime-compat';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `${now.getUTCFullYear()}-W${weekNum}`;
}

function getCurrentCode(): string | null {
  const override = process.env.BREAK_MY_AI_CODE || process.env.CHALLENGE_SECRET_WORD;
  if (override?.trim()) return override.toUpperCase().trim();

  const salt = process.env.BREAK_MY_AI_SALT;
  if (!salt || salt.length < 24) return null;

  const now = new Date();
  const week = getCurrentWeek();
  const combo = `${salt}-${week}`;
  let hash = 0;
  for (let i = 0; i < combo.length; i += 1) {
    hash = ((hash << 5) - hash + combo.charCodeAt(i)) | 0;
  }
  const words = ['BOLT', 'CALL', 'SPEED', 'LEAD', 'RUSH', 'SNAP', 'BLITZ', 'FLASH', 'SONIC', 'RAPID'];
  const w1 = words[Math.abs(hash) % words.length];
  const w2 = words[Math.abs(hash >> 8) % words.length];
  const num = Math.abs(hash % 900) + 100;
  return `${w1}${w2}${num}`;
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET, POST' },
  );
  const headers = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (getRequestOrigin(event.headers as Record<string, string>) && !v2cors.allowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  const path = event.path.replace('/.netlify/functions/break-my-ai', '').replace(/^\//, '');

  if (event.httpMethod === 'POST' && (path === 'submit' || path === '' || path === '/')) {
    const currentCode = getCurrentCode();
    if (!currentCode) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Challenge is not configured' }) };
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 254).toLowerCase();
    const code = clean(body.code, 80).toUpperCase();
    const technique = clean(body.technique, 500);
    const callDuration = Number(body.callDuration || 0);

    if (!name || !code || (email && !EMAIL_RE.test(email))) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'valid name and code are required' }) };
    }

    const supabase = getServiceSupabase();
    const rateLimit = await consumePublicRateLimit(supabase, {
      bucket: 'break_my_ai_submit',
      key: hashRateLimitKey([getClientIp(event.headers as Record<string, string>), email || name]),
      maxAttempts: 10,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rateLimit.allowed) {
      return {
        statusCode: rateLimit.statusCode,
        headers: {
          ...headers,
          ...(rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : {}),
        },
        body: JSON.stringify({
          error: rateLimit.statusCode === 429 ? 'Attempt limit reached for today' : 'Rate limit unavailable',
        }),
      };
    }

    const week = getCurrentWeek();
    const isCorrect = code === currentCode;
    const { error: insertError } = await supabase.from('challenge_attempts').insert({
      name,
      email: email || null,
      code_submitted: code,
      is_correct: isCorrect,
      week,
      call_duration_seconds: Number.isFinite(callDuration) && callDuration > 0 ? Math.round(callDuration) : null,
      technique_used: technique || null,
    });

    if (insertError) {
      console.error('[break-my-ai] insert failed:', insertError.message);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not record attempt' }) };
    }

    if (isCorrect) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          winner: true,
          message: 'You cracked the code! Our team will contact you within 24 hours.',
        }),
      };
    }

    const { count } = await supabase
      .from('challenge_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('week', week)
      .ilike('name', name);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        winner: false,
        message: 'Not the right code. Our AI held strong.',
        attempts: count || 1,
      }),
    };
  }

  if (event.httpMethod === 'GET' && path === 'leaderboard') {
    const supabase = getServiceSupabase();
    const week = getCurrentWeek();
    const { data: attempts, error } = await supabase
      .from('challenge_attempts')
      .select('name, is_correct, created_at')
      .eq('week', week)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not load leaderboard' }) };
    }

    const players = new Map<string, { attempts: number; won: boolean; lastAttempt: string }>();
    for (const attempt of attempts || []) {
      const existing = players.get(attempt.name) || { attempts: 0, won: false, lastAttempt: attempt.created_at };
      existing.attempts += 1;
      if (attempt.is_correct) existing.won = true;
      players.set(attempt.name, existing);
    }

    const leaderboard = Array.from(players.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        if (a.won !== b.won) return a.won ? -1 : 1;
        return b.attempts - a.attempts;
      })
      .slice(0, 20);

    const totalAttempts = attempts?.length || 0;
    const totalWins = attempts?.filter((a) => a.is_correct).length || 0;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        week,
        leaderboard,
        stats: {
          totalAttempts,
          totalWins,
          uniquePlayers: players.size,
          winRate: totalAttempts > 0 ? ((totalWins / totalAttempts) * 100).toFixed(1) : '0',
        },
      }),
    };
  }

  if (event.httpMethod === 'GET' && path === 'stats') {
    const supabase = getServiceSupabase();
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
        winRate: (totalAttempts || 0) > 0 ? (((totalWins || 0) / (totalAttempts || 0)) * 100).toFixed(1) : '0',
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

export const testHandler = handler;
export default withLegacyHandler(handler);
