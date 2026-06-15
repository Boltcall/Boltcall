import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import { checkHelpSourcesResolve } from './support-source-checks.mjs';

const DEFAULT_SITE_URL = 'https://boltcall.org';

export const HELP_TOPIC_CASES = [
  {
    id: 'billing_paypal',
    question: 'Where do I manage PayPal billing, invoices, and plan subscription details?',
    expectedSourceUrl: 'https://boltcall.mintlify.app/account/plans',
  },
  {
    id: 'lead_webhooks',
    question: 'How do I send Facebook Lead Ads or Google lead form leads into Boltcall?',
    expectedSourceUrl: 'https://boltcall.mintlify.app/integrations/webhooks',
  },
  {
    id: 'knowledge_base',
    question: 'Where do I upload business FAQs and answers so Boltcall knows what to say?',
    expectedSourceUrl: 'https://boltcall.mintlify.app/dashboard/knowledge-base',
  },
  {
    id: 'calendar_booking',
    question: 'How do I connect Calendly or Cal.com for appointment booking?',
    expectedSourceUrl: 'https://boltcall.mintlify.app/integrations/calendar',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getRuntimeConfig(env = process.env) {
  const siteUrl = env.SITE_URL || DEFAULT_SITE_URL;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      ok: false,
      error: {
        status: 'missing_env',
        required: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'VITE_SUPABASE_ANON_KEY'],
      },
    };
  }

  return { ok: true, siteUrl, supabaseUrl, serviceKey, anonKey };
}

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

function newPhoneNumber() {
  return `+1${Math.floor(2_000_000_000 + Math.random() * 7_000_000_000)}`;
}

async function createTopicWorkspace({ admin, suffix, email, password }) {
  const ids = {
    userId: null,
    workspaceId: null,
    profileId: null,
    agentId: null,
    phoneId: null,
    leadId: null,
    messageId: null,
  };

  const created = await must(
    'create test user',
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Boltcall Topic Coverage Test' },
    }),
  );
  ids.userId = created.user.id;
  await new Promise((resolve) => setTimeout(resolve, 750));

  const workspace = await must(
    'insert workspace',
    admin
      .from('workspaces')
      .insert({
        user_id: ids.userId,
        name: 'Live Topic Coverage Test',
        slug: `live-topic-coverage-${suffix}`.slice(0, 60),
        v2_enabled: true,
      })
      .select('id')
      .single(),
  );
  ids.workspaceId = workspace.id;

  const profile = await must(
    'insert business profile',
    admin
      .from('business_profiles')
      .insert({
        user_id: ids.userId,
        workspace_id: ids.workspaceId,
        business_name: 'Live Topic Coverage Test',
        main_category: 'HVAC',
        owner_name: 'QA Owner',
        website_url: 'https://example.com',
        country: 'US',
        service_areas: ['Austin'],
        opening_hours: {},
        languages: ['en'],
        user_preferences: {},
        description: 'Temporary multi-topic support-agent verification profile',
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
        name: 'Live Topic Coverage AI',
        agent_type: 'speed_to_lead',
        status: 'active',
        language: 'en',
        retell_agent_id: 'retell-topic-live-test',
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
        phone_number: newPhoneNumber(),
        phone_type: 'main',
        country_code: 'US',
        country: 'US',
        status: 'active',
        assigned_agent_id: ids.agentId,
        assigned_agent_name: 'Live Topic Coverage AI',
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
        phone: newPhoneNumber(),
        status: 'new',
      })
      .select('id')
      .single(),
  );
  ids.leadId = lead.id;

  return ids;
}

async function cleanupWorkspace(admin, ids) {
  if (ids.messageId) {
    await safe('delete scheduled message', admin.from('scheduled_messages').delete().eq('id', ids.messageId));
  }
  if (ids.phoneId) {
    await safe('delete phone number', admin.from('phone_numbers').delete().eq('id', ids.phoneId));
  }
  if (ids.agentId) await safe('delete agent', admin.from('agents').delete().eq('id', ids.agentId));
  if (ids.leadId) await safe('delete lead', admin.from('leads').delete().eq('id', ids.leadId));
  if (ids.profileId) await safe('delete business profile', admin.from('business_profiles').delete().eq('id', ids.profileId));
  if (ids.workspaceId) await safe('delete workspace', admin.from('workspaces').delete().eq('id', ids.workspaceId));
  if (ids.userId) {
    const { error } = await admin.auth.admin.deleteUser(ids.userId);
    if (error && !/not found/i.test(error.message)) {
      console.warn(JSON.stringify({ cleanupWarning: `delete auth user: ${error.message}` }));
    }
  }
}

async function askHelpTopic({ siteUrl, token, topic }) {
  const response = await fetch(`${siteUrl}/.netlify/functions/saas-v2-help-ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      question: topic.question,
      context: { current_page: '/v2/help', recent_action: `topic coverage ${topic.id}` },
    }),
  });
  const text = await response.text();
  const json = JSON.parse(text);
  if (!response.ok) throw new Error(`${topic.id} live endpoint ${response.status}: ${text.slice(0, 500)}`);
  return json;
}

export async function validateTopicAnswer(topic, answer, opts) {
  assert(String(answer?.answer || '').trim().length > 30, `${topic.id} answer was too short`);
  if (answer?.support?.escalated) {
    throw new Error(`${topic.id} unexpectedly escalated support ticket ${answer.support.ticket_id || ''}`.trim());
  }

  const sourceResults = await opts.checkHelpSourcesResolve(answer.sources || [], {
    siteUrl: opts.siteUrl,
  });
  const matchedSourceUrls = sourceResults
    .map((source) => source.url)
    .filter((url) => url === topic.expectedSourceUrl);
  assert(
    matchedSourceUrls.length > 0,
    `${topic.id} expected source ${topic.expectedSourceUrl} but got ${sourceResults.map((source) => source.url).join(', ')}`,
  );

  return {
    id: topic.id,
    status: 'passed',
    answerPreview: String(answer.answer || '').slice(0, 500),
    sourceTitles: (answer.sources || []).map((source) => source.title),
    sourceResults,
    matchedSourceUrls,
    supportEscalated: Boolean(answer?.support?.escalated),
  };
}

export function summarizeTopicResults(results) {
  return {
    status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
    check: 'support_agent_topic_coverage_live',
    topicsChecked: results.length,
    topicsPassed: results.filter((result) => result.status === 'passed').length,
    topics: results.map((result) => ({
      id: result.id,
      status: result.status,
      answerPreview: String(result.answerPreview || '').slice(0, 120),
      sourceTitles: result.sourceTitles,
      sourceResults: result.sourceResults,
    })),
  };
}

async function runLiveTopicSmoke(env = process.env) {
  const config = getRuntimeConfig(env);
  if (!config.ok) return config.error;

  const admin = createClient(config.supabaseUrl, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(config.supabaseUrl, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const email = `support-topic-test-${suffix}@boltcall.test`;
  const password = `Bc!${crypto.randomBytes(18).toString('base64url')}9`;
  let ids = {};

  try {
    ids = await createTopicWorkspace({ admin, suffix, email, password });
    const session = await must('sign in test user', anon.auth.signInWithPassword({ email, password }));
    const token = session.session?.access_token;
    if (!token) throw new Error('sign in returned no access token');

    const topicResults = [];
    for (const topic of HELP_TOPIC_CASES) {
      const answer = await askHelpTopic({ siteUrl: config.siteUrl, token, topic });
      topicResults.push(
        await validateTopicAnswer(topic, answer, {
          siteUrl: config.siteUrl,
          checkHelpSourcesResolve,
        }),
      );
    }

    return {
      siteUrl: config.siteUrl,
      ...summarizeTopicResults(topicResults),
    };
  } finally {
    await cleanupWorkspace(admin, ids);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runLiveTopicSmoke()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'passed') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: 'failed',
        check: 'support_agent_topic_coverage_live',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exitCode = 1;
    });
}
