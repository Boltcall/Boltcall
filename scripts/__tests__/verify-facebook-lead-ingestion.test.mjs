import { describe, expect, it } from 'vitest';

import {
  buildFacebookLeadIngestionActionRequired,
  buildFacebookLeadSummary,
  parseVerifyFacebookLeadArgs,
  verifyFacebookLeadRow,
} from '../verify-facebook-lead-ingestion.mjs';

describe('verify-facebook-lead-ingestion helpers', () => {
  it('accepts a founder Meta Lead Ads row with the canonical source and contact data', () => {
    expect(
      verifyFacebookLeadRow(
        {
          id: 'lead-1',
          user_id: 'founder-1',
          source: 'facebook_lead_ad',
          email: 'maya@example.com',
          phone: '+15551112222',
          raw_data: { leadgen_id: 'leadgen-1', page_id: 'page-1' },
        },
        { founderUserId: 'founder-1', leadgenId: 'leadgen-1', pageId: 'page-1' },
      ),
    ).toEqual({ ok: true, reason: 'matched' });
  });

  it('rejects wrong source, founder, leadgen id, page id, or missing contact data', () => {
    const base = {
      id: 'lead-1',
      user_id: 'founder-1',
      source: 'facebook_lead_ad',
      email: 'maya@example.com',
      phone: '+15551112222',
      raw_data: { leadgen_id: 'leadgen-1', page_id: 'page-1' },
    };

    expect(verifyFacebookLeadRow({ ...base, source: 'facebook_ads' }, { founderUserId: 'founder-1' }))
      .toEqual({ ok: false, reason: 'wrong_source' });
    expect(verifyFacebookLeadRow({ ...base, user_id: 'other' }, { founderUserId: 'founder-1' }))
      .toEqual({ ok: false, reason: 'wrong_founder' });
    expect(verifyFacebookLeadRow(base, { founderUserId: 'founder-1', leadgenId: 'other' }))
      .toEqual({ ok: false, reason: 'wrong_leadgen_id' });
    expect(verifyFacebookLeadRow(base, { founderUserId: 'founder-1', pageId: 'other' }))
      .toEqual({ ok: false, reason: 'wrong_page' });
    expect(verifyFacebookLeadRow({ ...base, email: null, phone: null }, { founderUserId: 'founder-1' }))
      .toEqual({ ok: false, reason: 'missing_contact' });
  });

  it('builds a sanitized lead summary without exposing raw contact details', () => {
    expect(
      buildFacebookLeadSummary({
        id: 'lead-1',
        user_id: 'founder-1',
        source: 'facebook_lead_ad',
        status: 'pending',
        email: 'maya@example.com',
        phone: '+15551112222',
        raw_data: { leadgen_id: 'leadgen-1', page_id: 'page-1' },
        created_at: '2026-06-15T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'lead-1',
      userId: 'founder-1',
      source: 'facebook_lead_ad',
      status: 'pending',
      leadgenId: 'leadgen-1',
      pageId: 'page-1',
      hasEmail: true,
      hasPhone: true,
      createdAt: '2026-06-15T12:00:00.000Z',
    });
  });

  it('parses optional founder, leadgen, page, and lookback flags', () => {
    expect(
      parseVerifyFacebookLeadArgs([
        '--founder-user-id',
        'founder-1',
        '--leadgen-id',
        'leadgen-1',
        '--page-id',
        'page-1',
        '--lookback-hours',
        '24',
      ]),
    ).toEqual({
      founderUserId: 'founder-1',
      leadgenId: 'leadgen-1',
      pageId: 'page-1',
      lookbackHours: 24,
    });
  });

  it('describes the exact manual action required when no Facebook lead is found', () => {
    expect(
      buildFacebookLeadIngestionActionRequired({
        founderUserId: 'founder-1',
        pageId: 'page-1',
        lookbackHours: 168,
      }),
    ).toEqual({
      prerequisite: 'facebook_page_connection',
      dashboardUrl: 'https://boltcall.org/dashboard/ad-instant-response',
      verifyCommand: 'node scripts/verify-facebook-lead-ingestion.mjs --page-id page-1 --lookback-hours 168',
      founderUserId: 'founder-1',
      pageId: 'page-1',
    });
  });
});
