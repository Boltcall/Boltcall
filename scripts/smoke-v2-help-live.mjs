import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { checkHelpSourcesResolve } from './support-source-checks.mjs';

const siteUrl = process.env.SITE_URL || 'https://boltcall.org';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error(
    JSON.stringify(
      {
        status: 'missing_env',
        required: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'VITE_SUPABASE_ANON_KEY'],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const email = `support-live-test-${suffix}@boltcall.test`;
const password = `Bc!${crypto.randomBytes(18).toString('base64url')}9`;
const testPhone = `+1${Math.floor(2_000_000_000 + Math.random() * 7_000_000_000)}`;
const leadPhone = `+1${Math.floor(2_000_000_000 + Math.random() * 7_000_000_000)}`;
const ids = {
  userId: null,
  workspaceId: null,
  profileId: null,
  agentId: null,
  phoneId: null,
  leadId: null,
  messageId: null,
};
let cleanedOnce = false;

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function safe(label, promise) {
  try {
    const { error } = await promise;
    if (error) console.warn(JSON.stringify({ cleanupWarning: `${label}: ${error.message}` }));
  } catch (err) {
    console.warn(JSON.stringify({ cleanupWarning: `${label}: ${err.message}` }));
  }
}

async function cleanup() {
  if (cleanedOnce) return;
  cleanedOnce = true;

  if (ids.messageId) {
    await safe('delete scheduled message', admin.from('scheduled_messages').delete().eq('id', ids.messageId));
  }
  if (ids.phoneId) {
    await safe('delete phone number', admin.from('phone_numbers').delete().eq('id', ids.phoneId));
  }
  if (ids.agentId) await safe('delete agent', admin.from('agents').delete().eq('id', ids.agentId));
  if (ids.leadId) await safe('delete lead', admin.from('leads').delete().eq('id', ids.leadId));
  if (ids.profileId) {
    await safe('delete business profile', admin.from('business_profiles').delete().eq('id', ids.profileId));
  }
  if (ids.workspaceId) {
    await safe('delete workspace', admin.from('workspaces').delete().eq('id', ids.workspaceId));
  }
  if (ids.userId) {
    const { error } = await admin.auth.admin.deleteUser(ids.userId);
    if (error && !/not found/i.test(error.message)) {
      console.warn(JSON.stringify({ cleanupWarning: `delete auth user: ${error.message}` }));
    }
  }
}

async function ensureWorkspace(userId) {
  const { data: existing, error } = await admin
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`workspace lookup: ${error.message}`);

  if (existing?.id) {
    await must(
      'update workspace',
      admin.from('workspaces').update({ name: 'Live Support Test HVAC', v2_enabled: true }).eq('id', existing.id),
    );
    return existing;
  }

  return must(
    'insert workspace',
    admin
      .from('workspaces')
      .insert({
        user_id: userId,
        name: 'Live Support Test HVAC',
        slug: `live-support-test-${suffix}`.slice(0, 60),
        v2_enabled: true,
      })
      .select('id')
      .single(),
  );
}

async function seedWorkspace() {
  const created = await must(
    'create test user',
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Boltcall Support Live Test' },
    }),
  );
  ids.userId = created.user.id;
  await new Promise((resolve) => setTimeout(resolve, 750));

  const workspace = await ensureWorkspace(ids.userId);
  ids.workspaceId = workspace.id;

  const profile = await must(
    'insert business profile',
    admin
      .from('business_profiles')
      .insert({
        user_id: ids.userId,
        workspace_id: ids.workspaceId,
        business_name: 'Live Support Test HVAC',
        main_category: 'HVAC',
        owner_name: 'QA Owner',
        website_url: 'https://example.com',
        country: 'US',
        service_areas: ['Austin'],
        opening_hours: {},
        languages: ['en'],
        user_preferences: {},
        description: 'Temporary support-agent live verification profile',
      })
      .select('id')
      .single(),
  );
  ids.profileId = profile.id;

  const agent = await must(
    'insert agent',
    admin
      .from('agents')
      .insert({
        user_id: ids.userId,
        workspace_id: ids.workspaceId,
        business_profile_id: ids.profileId,
        name: 'Live Speed-to-Lead Agent',
        agent_type: 'speed_to_lead',
        status: 'active',
        language: 'en',
        retell_agent_id: 'retell-live-test',
      })
      .select('id')
      .single(),
  );
  ids.agentId = agent.id;

  const phone = await must(
    'insert phone number',
    admin
      .from('phone_numbers')
      .insert({
        user_id: ids.userId,
        workspace_id: ids.workspaceId,
        business_profile_id: ids.profileId,
        phone_number: testPhone,
        phone_type: 'main',
        country_code: 'US',
        country: 'US',
        status: 'active',
        assigned_agent_id: ids.agentId,
        assigned_agent_name: 'Live Speed-to-Lead Agent',
      })
      .select('id')
      .single(),
  );
  ids.phoneId = phone.id;

  const lead = await must(
    'insert lead',
    admin
      .from('leads')
      .insert({
        user_id: ids.userId,
        source: 'google_lead_form',
        first_name: 'Pat',
        last_name: 'Customer',
        phone: leadPhone,
        status: 'new',
      })
      .select('id')
      .single(),
  );
  ids.leadId = lead.id;

  const message = await must(
    'insert scheduled message',
    admin
      .from('scheduled_messages')
      .insert({
        user_id: ids.userId,
        type: 'followup',
        channel: 'sms',
        recipient_phone: leadPhone,
        message_body: 'Live support test follow up',
        scheduled_for: new Date(Date.now() + 3_600_000).toISOString(),
        status: 'scheduled',
      })
      .select('id')
      .single(),
  );
  ids.messageId = message.id;
}

async function runLiveHelpCheck() {
  const session = await must('sign in test user', anon.auth.signInWithPassword({ email, password }));
  const token = session.session?.access_token;
  if (!token) throw new Error('sign in returned no access token');

  const response = await fetch(`${siteUrl}/.netlify/functions/saas-v2-help-ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      question: `Why are calls failing for my phone number ${testPhone}? Check my workspace diagnostics and tell me what looks configured.`,
      context: { current_page: '/v2/help', recent_action: 'live production verification' },
    }),
  });
  const text = await response.text();
  const json = JSON.parse(text);
  if (!response.ok) throw new Error(`live endpoint ${response.status}: ${text.slice(0, 500)}`);
  if (!json.support?.ticket_id) {
    throw new Error(`live endpoint returned no support.ticket_id: ${text.slice(0, 500)}`);
  }
  const sourceResults = await checkHelpSourcesResolve(json.sources || [], { siteUrl });

  return {
    httpStatus: response.status,
    answerPreview: String(json.answer || '').slice(0, 500),
    sourceTitles: (json.sources || []).map((source) => source.title),
    sourceResults,
    suggestedFollowups: json.suggested_followups || [],
    support: json.support,
  };
}

try {
  await seedWorkspace();
  const result = await runLiveHelpCheck();
  console.log(JSON.stringify({ status: 'passed', siteUrl, ...result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ status: 'failed', error: err.message }, null, 2));
  process.exitCode = 1;
} finally {
  await cleanup();
  console.log(JSON.stringify({ cleanup: 'done', testUserDeleted: Boolean(ids.userId) }));
}
