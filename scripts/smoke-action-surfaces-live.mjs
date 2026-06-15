import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SITE_URL = 'https://boltcall.org';

export const ACTION_SURFACES = [
  {
    id: 'facebook_page_connection',
    path: '/dashboard/ad-instant-response',
    requiredTexts: ['Ad Instant Response', 'Connect Your Facebook Page'],
    buttonPattern: /Connect Facebook|Reconnect Facebook/i,
  },
  {
    id: 'paypal_live_test_payment',
    path: '/dashboard/settings/plan-billing',
    requiredTexts: ['Live PayPal test payment'],
    buttonPattern: /Pay \$2 test/i,
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeSiteUrl(siteUrl) {
  return String(siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export function getSupabaseAuthStorageKey(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split('.')[0];
  assert(projectRef, `Could not derive Supabase project ref from ${supabaseUrl}`);
  return `sb-${projectRef}-auth-token`;
}

export function buildSupabaseStorageSession(session) {
  assert(session?.access_token, 'Supabase session missing access_token');
  assert(session?.refresh_token, 'Supabase session missing refresh_token');
  assert(session?.user?.id, 'Supabase session missing user id');

  return {
    access_token: session.access_token,
    token_type: session.token_type || 'bearer',
    expires_in: session.expires_in || 3600,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
    refresh_token: session.refresh_token,
    user: session.user,
  };
}

export function getRuntimeConfig(env = process.env) {
  const siteUrl = normalizeSiteUrl(env.SITE_URL || DEFAULT_SITE_URL);
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      ok: false,
      error: {
        status: 'missing_env',
        check: 'action_surfaces_live',
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
  } catch (error) {
    console.warn(JSON.stringify({ cleanupWarning: `${label}: ${error.message}` }));
  }
}

async function createActionSurfaceUser({ admin, suffix, email, password }) {
  const ids = {
    userId: null,
    workspaceId: null,
    profileId: null,
    subscriptionId: null,
  };

  const created = await must(
    'create action surface test user',
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'founder' },
      user_metadata: {
        name: 'Boltcall Action Surface Test',
        company: 'Action Surface Test',
      },
    }),
  );
  ids.userId = created.user.id;

  await must(
    'stamp founder role on action surface user',
    admin.auth.admin.updateUserById(ids.userId, {
      app_metadata: { role: 'founder' },
    }),
  );

  const workspace = await must(
    'insert action surface workspace',
    admin
      .from('workspaces')
      .insert({
        user_id: ids.userId,
        name: 'Action Surface Live Smoke',
        slug: `live-action-surface-${suffix}`.slice(0, 60),
        v2_enabled: true,
      })
      .select('id')
      .single(),
  );
  ids.workspaceId = workspace.id;

  const profile = await must(
    'insert action surface business profile',
    admin
      .from('business_profiles')
      .insert({
        user_id: ids.userId,
        workspace_id: ids.workspaceId,
        business_name: 'Action Surface Live Smoke',
        main_category: 'HVAC',
        owner_name: 'QA Owner',
        website_url: 'https://example.com',
        country: 'US',
        service_areas: ['Austin'],
        opening_hours: {},
        languages: ['en'],
        user_preferences: {},
        description: 'Temporary production UI action-surface verification profile',
      })
      .select('id')
      .single(),
  );
  ids.profileId = profile.id;

  const subscription = await must(
    'insert action surface subscription',
    admin
      .from('subscriptions')
      .insert({
        user_id: ids.userId,
        plan_level: 'pro',
        billing_interval: 'monthly',
        status: 'active',
        payment_provider: 'paypal',
        paypal_subscription_id: `I-ACTION-SURFACE-${suffix}`.slice(0, 64),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single(),
  );
  ids.subscriptionId = subscription.id;

  return ids;
}

export function buildCleanupChecks(ids = {}) {
  const checks = [];
  for (const check of [
    { key: 'subscriptionId', table: 'subscriptions', column: 'id' },
    { key: 'profileId', table: 'business_profiles', column: 'id' },
    { key: 'workspaceId', table: 'workspaces', column: 'id' },
  ]) {
    if (ids[check.key]) {
      checks.push({ table: check.table, column: check.column, value: ids[check.key] });
    }
  }
  return checks;
}

async function verifyCleanup(admin, ids = {}) {
  const results = [];
  for (const check of buildCleanupChecks(ids)) {
    const { count, error } = await admin
      .from(check.table)
      .select('id', { count: 'exact', head: true })
      .eq(check.column, check.value);
    results.push({
      ...check,
      status: error ? 'error' : Number(count || 0) === 0 ? 'passed' : 'remaining',
      count: error ? null : Number(count || 0),
      error: error?.message,
    });
  }

  return {
    status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
    check: 'action_surface_cleanup',
    checks: results,
  };
}

async function verifyAuthUserDeleted(admin, userId) {
  if (!userId) {
    return {
      status: 'skipped',
      check: 'action_surface_auth_user_cleanup',
    };
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error && /not found|no user/i.test(error.message)) {
    return {
      status: 'passed',
      check: 'action_surface_auth_user_cleanup',
      userId,
    };
  }

  return {
    status: data?.user ? 'failed' : 'passed',
    check: 'action_surface_auth_user_cleanup',
    userId,
    error: error?.message,
  };
}

async function cleanupActionSurfaceUser(admin, ids = {}) {
  if (ids.subscriptionId) await safe('delete action surface subscription', admin.from('subscriptions').delete().eq('id', ids.subscriptionId));
  if (ids.profileId) await safe('delete action surface business profile', admin.from('business_profiles').delete().eq('id', ids.profileId));
  if (ids.workspaceId) await safe('delete action surface workspace', admin.from('workspaces').delete().eq('id', ids.workspaceId));
  if (ids.userId) {
    const { error } = await admin.auth.admin.deleteUser(ids.userId);
    if (error && !/not found/i.test(error.message)) {
      console.warn(JSON.stringify({ cleanupWarning: `delete action surface auth user: ${error.message}` }));
    }
  }
  const dbCleanup = await verifyCleanup(admin, ids);
  const authCleanup = await verifyAuthUserDeleted(admin, ids.userId);
  return {
    status: dbCleanup.status === 'passed' && authCleanup.status === 'passed' ? 'passed' : 'failed',
    check: 'action_surface_cleanup',
    dbCleanup,
    authCleanup,
  };
}

async function verifySurface(page, siteUrl, surface) {
  const url = `${siteUrl}${surface.path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  for (const text of surface.requiredTexts) {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  const button = page.getByRole('button', { name: surface.buttonPattern }).first();
  await button.waitFor({ state: 'visible', timeout: 30_000 });

  return {
    id: surface.id,
    status: 'passed',
    path: surface.path,
    buttonText: (await button.innerText()).trim(),
  };
}

async function runBrowserSmoke({ siteUrl, supabaseUrl, session, userId }) {
  const browser = await chromium.launch({
    headless: process.env.ACTION_SURFACES_HEADLESS !== 'false',
  });

  try {
    const context = await browser.newContext();
    const storageKey = getSupabaseAuthStorageKey(supabaseUrl);
    const storageSession = buildSupabaseStorageSession(session);

    await context.addInitScript(
      ({ key, value, setupUserId }) => {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.localStorage.setItem('boltcall_setup_complete', setupUserId);
      },
      { key: storageKey, value: storageSession, setupUserId: userId },
    );

    const page = await context.newPage();
    const results = [];
    for (const surface of ACTION_SURFACES) {
      results.push(await verifySurface(page, siteUrl, surface));
    }
    await context.close();
    return results;
  } finally {
    await browser.close();
  }
}

export function summarizeActionSurfaceResults(results) {
  return {
    status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
    check: 'action_surfaces_live',
    surfacesChecked: results.length,
    surfacesPassed: results.filter((result) => result.status === 'passed').length,
    surfaces: results,
  };
}

export async function runActionSurfaceSmoke(env = process.env) {
  const config = getRuntimeConfig(env);
  if (!config.ok) return config.error;

  const admin = createClient(config.supabaseUrl, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(config.supabaseUrl, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const email = `action-surface-test-${suffix}@boltcall.test`;
  const password = `Bc!${crypto.randomBytes(18).toString('base64url')}9`;
  let ids = {};
  let result = null;
  let testError = null;
  let cleanupResult = null;

  try {
    ids = await createActionSurfaceUser({ admin, suffix, email, password });
    const signedIn = await must('sign in action surface test user', anon.auth.signInWithPassword({ email, password }));
    assert(signedIn.session?.access_token, 'sign in returned no access token');

    const surfaceResults = await runBrowserSmoke({
      siteUrl: config.siteUrl,
      supabaseUrl: config.supabaseUrl,
      session: signedIn.session,
      userId: ids.userId,
    });

    result = {
      siteUrl: config.siteUrl,
      ...summarizeActionSurfaceResults(surfaceResults),
    };
  } catch (error) {
    testError = error;
  } finally {
    cleanupResult = await cleanupActionSurfaceUser(admin, ids);
  }

  const cleanup = {
    cleanupDone: true,
    testUserDeleted: Boolean(ids.userId),
    cleanupVerified: cleanupResult?.status === 'passed',
    cleanupResult,
  };

  if (testError) throw testError;
  if (cleanupResult?.status !== 'passed') {
    throw new Error(`action surface cleanup failed: ${JSON.stringify(cleanupResult)}`);
  }

  return { ...result, ...cleanup };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runActionSurfaceSmoke()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'passed') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: 'failed',
        check: 'action_surfaces_live',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exitCode = 1;
    });
}
