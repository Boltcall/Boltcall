import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { requireAuth } from './_shared/require-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Tenant Onboarding Interview — Cody Schneider agent playbook applied to
 * Boltcall (video gy9hUWJvYMQ, 2026-04-14). Every Retell agent has to be
 * grounded in the tenant's own business context or the prompt becomes a
 * generic "AI receptionist" script — which is exactly the failure mode
 * Cody's first hour picked apart.
 *
 * Six founder-answered questions get stored as tier=prompt knowledge_base
 * rows under category `onboarding_interview:<key>`. The existing
 * agent-context.ts loader already injects tier=prompt rows into every
 * Retell system prompt on every call — no new plumbing needed.
 *
 * Actions:
 *   - fetch: return the six answers as an ordered map
 *   - save: upsert (or delete when empty) the six rows
 */

const INTERVIEW_QUESTIONS = [
  { key: 'business_type', question: 'What kind of business is this? (e.g. Roofing contractor, family law practice, plumbing service, med spa)' },
  { key: 'icp', question: 'Who is the ideal customer? Describe them in one paragraph (age, urgency, budget, decision maker).' },
  { key: 'offer_summary', question: 'What is your primary offer, in one sentence, as a customer would understand it?' },
  { key: 'top_objections', question: 'What are the top three objections customers raise before booking, and how do you handle each one?' },
  { key: 'booking_rules', question: 'What are the rules for booking? (Hours you take appointments, minimum notice, what qualifies as an emergency, who to route where.)' },
  { key: 'hours_of_operation', question: 'What are your operating hours? Include emergency/after-hours policy.' },
] as const;

type InterviewKey = typeof INTERVIEW_QUESTIONS[number]['key'];

const KEYS = new Set<string>(INTERVIEW_QUESTIONS.map(q => q.key));
const CATEGORY_PREFIX = 'onboarding_interview:';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function ok(body: unknown) {
  return { statusCode: 200, headers, body: JSON.stringify(body) };
}
function bad(msg: string, statusCode = 400) {
  return { statusCode, headers, body: JSON.stringify({ error: msg }) };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return bad('Method not allowed', 405);

  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  let body: { action?: string; answers?: Record<string, string> };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return bad('Invalid JSON body');
  }

  const supabase = getSupabase();

  if (body.action === 'fetch') {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('category, content')
      .eq('user_id', userId)
      .eq('tier', 'prompt')
      .like('category', `${CATEGORY_PREFIX}%`);
    if (error) return bad(`fetch failed: ${error.message}`, 500);
    const answers: Record<string, string> = {};
    for (const row of data || []) {
      const key = String(row.category).slice(CATEGORY_PREFIX.length);
      if (KEYS.has(key)) answers[key] = row.content || '';
    }
    return ok({
      questions: INTERVIEW_QUESTIONS,
      answers,
      complete: INTERVIEW_QUESTIONS.every(q => (answers[q.key] || '').trim().length > 0),
    });
  }

  if (body.action === 'save') {
    const incoming = body.answers || {};
    for (const key of Object.keys(incoming)) {
      if (!KEYS.has(key)) return bad(`unknown answer key: ${key}`);
    }

    const results: Record<string, 'saved' | 'cleared' | 'skipped'> = {};
    for (const q of INTERVIEW_QUESTIONS) {
      const raw = incoming[q.key];
      if (raw === undefined) { results[q.key] = 'skipped'; continue; }
      const answer = String(raw).trim();
      const category = `${CATEGORY_PREFIX}${q.key}`;

      if (answer.length === 0) {
        const { error } = await supabase
          .from('knowledge_base')
          .delete()
          .eq('user_id', userId)
          .eq('tier', 'prompt')
          .eq('category', category);
        if (error) return bad(`clear ${q.key} failed: ${error.message}`, 500);
        results[q.key] = 'cleared';
        continue;
      }

      // Upsert: delete existing, insert fresh. Using unique-cat-per-user is
      // safer than upsert because there's no schema constraint enforcing it.
      const { error: delErr } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('user_id', userId)
        .eq('tier', 'prompt')
        .eq('category', category);
      if (delErr) return bad(`replace ${q.key} failed: ${delErr.message}`, 500);

      const { error: insErr } = await supabase.from('knowledge_base').insert({
        user_id: userId,
        tier: 'prompt',
        category,
        title: q.question,
        content: answer,
        status: 'active',
      });
      if (insErr) return bad(`insert ${q.key} failed: ${insErr.message}`, 500);
      results[q.key] = 'saved';
    }

    return ok({ ok: true, results });
  }

  return bad(`unknown action: ${body.action}`);
};

export const testHandler = handler;
export default withLegacyHandler(handler);
export { INTERVIEW_QUESTIONS, KEYS as INTERVIEW_KEYS, CATEGORY_PREFIX };
