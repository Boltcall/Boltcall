import { describe, expect, it } from 'vitest';

import {
  buildFacebookPageConnectionActionRequired,
  buildFacebookConnectionSummary,
  parseVerifyFacebookArgs,
  verifyFacebookConnectionRow,
} from '../verify-facebook-page-connection.mjs';

describe('verify-facebook-page-connection helpers', () => {
  it('accepts a founder Page connection with a stored Page access token', () => {
    expect(
      verifyFacebookConnectionRow(
        {
          id: 'conn-1',
          user_id: 'founder-1',
          workspace_id: 'workspace-1',
          page_id: 'page-1',
          page_name: 'Rapid Rooter QA',
          access_token: 'page-token',
          created_at: '2026-06-15T12:00:00.000Z',
        },
        { founderUserId: 'founder-1', pageId: 'page-1' },
      ),
    ).toEqual({ ok: true, reason: 'matched' });
  });

  it('rejects missing token, wrong founder, and wrong page', () => {
    const base = {
      id: 'conn-1',
      user_id: 'founder-1',
      workspace_id: 'workspace-1',
      page_id: 'page-1',
      access_token: 'page-token',
    };

    expect(verifyFacebookConnectionRow({ ...base, access_token: null }, { founderUserId: 'founder-1' }))
      .toEqual({ ok: false, reason: 'missing_access_token' });
    expect(verifyFacebookConnectionRow({ ...base, user_id: 'other-user' }, { founderUserId: 'founder-1' }))
      .toEqual({ ok: false, reason: 'wrong_founder' });
    expect(verifyFacebookConnectionRow(base, { founderUserId: 'founder-1', pageId: 'other-page' }))
      .toEqual({ ok: false, reason: 'wrong_page' });
  });

  it('builds a sanitized connection summary without exposing the token', () => {
    expect(
      buildFacebookConnectionSummary({
        id: 'conn-1',
        user_id: 'founder-1',
        workspace_id: 'workspace-1',
        page_id: 'page-1',
        page_name: 'Rapid Rooter QA',
        access_token: 'page-token',
        created_at: '2026-06-15T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'conn-1',
      pageId: 'page-1',
      pageName: 'Rapid Rooter QA',
      userId: 'founder-1',
      workspaceId: 'workspace-1',
      hasAccessToken: true,
      createdAt: '2026-06-15T12:00:00.000Z',
    });
  });

  it('parses optional founder and page flags', () => {
    expect(
      parseVerifyFacebookArgs([
        '--founder-user-id',
        'founder-1',
        '--page-id',
        'page-1',
      ]),
    ).toEqual({
      founderUserId: 'founder-1',
      pageId: 'page-1',
    });
  });

  it('describes the exact manual action required when no Page is connected', () => {
    expect(buildFacebookPageConnectionActionRequired({ founderUserId: 'founder-1' }))
      .toEqual({
        dashboardUrl: 'https://boltcall.org/dashboard/ad-instant-response',
        verifyCommand: 'node scripts/verify-facebook-page-connection.mjs',
        founderUserId: 'founder-1',
      });
  });
});
