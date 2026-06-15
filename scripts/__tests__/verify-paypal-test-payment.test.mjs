import { describe, expect, it } from 'vitest';

import {
  buildPayPalPaymentSummary,
  parseVerifyPayPalArgs,
  verifyPayPalPaymentRow,
} from '../verify-paypal-test-payment.mjs';

describe('verify-paypal-test-payment helpers', () => {
  it('accepts a completed $2 USD PayPal test payment row for the expected founder', () => {
    expect(
      verifyPayPalPaymentRow(
        {
          order_id: 'ORDER-1',
          user_id: 'founder-1',
          amount: 2,
          currency: 'USD',
          status: 'completed',
          payer_email: 'buyer@example.com',
          raw_event: {
            purchase_units: [
              {
                payments: {
                  captures: [{ id: 'CAPTURE-1', status: 'COMPLETED' }],
                },
              },
            ],
          },
          created_at: '2026-06-15T12:00:00.000Z',
        },
        { founderUserId: 'founder-1' },
      ),
    ).toMatchObject({ ok: true, captureId: 'CAPTURE-1' });
  });

  it('rejects wrong amount, currency, status, or founder', () => {
    const base = {
      order_id: 'ORDER-1',
      user_id: 'founder-1',
      amount: 2,
      currency: 'USD',
      status: 'completed',
      raw_event: {},
    };

    expect(verifyPayPalPaymentRow({ ...base, amount: 3 }, { founderUserId: 'founder-1' }))
      .toMatchObject({ ok: false, reason: 'wrong_amount' });
    expect(verifyPayPalPaymentRow({ ...base, currency: 'EUR' }, { founderUserId: 'founder-1' }))
      .toMatchObject({ ok: false, reason: 'wrong_currency' });
    expect(verifyPayPalPaymentRow({ ...base, status: 'pending' }, { founderUserId: 'founder-1' }))
      .toMatchObject({ ok: false, reason: 'not_completed' });
    expect(verifyPayPalPaymentRow({ ...base, user_id: 'other' }, { founderUserId: 'founder-1' }))
      .toMatchObject({ ok: false, reason: 'wrong_founder' });
  });

  it('builds a sanitized payment summary', () => {
    const summary = buildPayPalPaymentSummary(
      {
        order_id: 'ORDER-1',
        user_id: 'founder-1',
        amount: '2.00',
        currency: 'USD',
        status: 'completed',
        payer_email: 'buyer@example.com',
        created_at: '2026-06-15T12:00:00.000Z',
        raw_event: {
          payer: { payer_id: 'PAYER-1' },
          purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
        },
      },
      { captureId: 'CAPTURE-1' },
    );

    expect(summary).toEqual({
      orderId: 'ORDER-1',
      captureId: 'CAPTURE-1',
      userId: 'founder-1',
      amount: 2,
      currency: 'USD',
      status: 'completed',
      payerEmail: 'buyer@example.com',
      createdAt: '2026-06-15T12:00:00.000Z',
    });
  });

  it('parses optional order id and founder flags', () => {
    expect(
      parseVerifyPayPalArgs([
        '--order-id',
        'ORDER-1',
        '--founder-user-id',
        'founder-1',
        '--lookback-hours',
        '48',
      ]),
    ).toEqual({
      orderId: 'ORDER-1',
      founderUserId: 'founder-1',
      lookbackHours: 48,
    });
  });
});
