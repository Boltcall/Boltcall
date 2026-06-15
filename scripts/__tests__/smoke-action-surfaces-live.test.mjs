import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  ACTION_SURFACES,
  buildCleanupChecks,
  buildSupabaseStorageSession,
  getRuntimeConfig,
  getSupabaseAuthStorageKey,
  summarizeActionSurfaceResults,
} from '../smoke-action-surfaces-live.mjs';

describe('smoke-action-surfaces-live helpers', () => {
  it('targets the unresolved production action surfaces without external clicks', () => {
    assert.deepEqual(
      ACTION_SURFACES.map((surface) => surface.id),
      ['facebook_page_connection', 'paypal_live_test_payment'],
    );
    assert.deepEqual(
      ACTION_SURFACES.map((surface) => surface.path),
      ['/dashboard/ad-instant-response', '/dashboard/settings/plan-billing'],
    );
  });

  it('derives the Supabase auth localStorage key from the project URL', () => {
    assert.equal(
      getSupabaseAuthStorageKey('https://hbwogktdajorojljkjwg.supabase.co'),
      'sb-hbwogktdajorojljkjwg-auth-token',
    );
  });

  it('builds the persisted Supabase session shape used by supabase-js in the browser', () => {
    const session = buildSupabaseStorageSession({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: 123,
      user: { id: 'user-1', app_metadata: { role: 'founder' } },
    });

    assert.deepEqual(session, {
      access_token: 'access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: 123,
      refresh_token: 'refresh-token',
      user: { id: 'user-1', app_metadata: { role: 'founder' } },
    });
  });

  it('reports missing live env as a non-throwing missing_env result', () => {
    assert.deepEqual(getRuntimeConfig({}), {
      ok: false,
      error: {
        status: 'missing_env',
        check: 'action_surfaces_live',
        required: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'VITE_SUPABASE_ANON_KEY'],
      },
    });
  });

  it('normalizes configured live env', () => {
    assert.deepEqual(
      getRuntimeConfig({
        SITE_URL: 'https://boltcall.org/',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_KEY: 'service',
        VITE_SUPABASE_ANON_KEY: 'anon',
      }),
      {
        ok: true,
        siteUrl: 'https://boltcall.org',
        supabaseUrl: 'https://example.supabase.co',
        serviceKey: 'service',
        anonKey: 'anon',
      },
    );
  });

  it('summarizes action surface results without pretending external actions are complete', () => {
    assert.deepEqual(
      summarizeActionSurfaceResults([
        { id: 'facebook_page_connection', status: 'passed', path: '/dashboard/ad-instant-response' },
        { id: 'paypal_live_test_payment', status: 'passed', path: '/dashboard/settings/plan-billing' },
      ]),
      {
        status: 'passed',
        check: 'action_surfaces_live',
        surfacesChecked: 2,
        surfacesPassed: 2,
        surfaces: [
          { id: 'facebook_page_connection', status: 'passed', path: '/dashboard/ad-instant-response' },
          { id: 'paypal_live_test_payment', status: 'passed', path: '/dashboard/settings/plan-billing' },
        ],
      },
    );
  });

  it('builds cleanup checks for all temporary database rows', () => {
    assert.deepEqual(
      buildCleanupChecks({
        subscriptionId: 'sub-1',
        profileId: 'profile-1',
        workspaceId: 'workspace-1',
      }),
      [
        { table: 'subscriptions', column: 'id', value: 'sub-1' },
        { table: 'business_profiles', column: 'id', value: 'profile-1' },
        { table: 'workspaces', column: 'id', value: 'workspace-1' },
      ],
    );
  });
});
