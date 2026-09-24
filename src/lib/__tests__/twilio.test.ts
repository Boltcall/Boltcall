/**
 * SMS & Phone Numbers (Twilio) — feature tests.
 * Tests: send SMS, bulk SMS, history, AI responder, approve/reject drafts,
 *        sequences, phone number CRUD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({ FUNCTIONS_BASE: 'http://localhost:8888/.netlify/functions' }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  sendSms,
  sendBulkSms,
  getSmsHistory,
  generateSmsAiReply,
  approveSmsAiDraft,
  rejectSmsAiDraft,
  listPhoneNumbers,
  searchAvailableNumbers,
  purchasePhoneNumber,
  configurePhoneNumber,
  releasePhoneNumber,
} from '../twilio';

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}
function failJson(status: number, body: Record<string, unknown>) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) });
}

// ─── SMS Sending ────────────────────────────────────────────────────────────

describe('SMS — Send', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sendSms calls twilio-sms with send action', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, message_sid: 'SM123', to: '+1234' }));

    const result = await sendSms('+1234567890', 'Hello!');
    expect(result.success).toBe(true);
    expect(result.message_sid).toBe('SM123');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('send');
    expect(body.to).toBe('+1234567890');
    expect(body.message).toBe('Hello!');
  });

  it('sendSms passes optional from number', async () => {
    mockFetch.mockReturnValue(okJson({ success: true }));
    await sendSms('+1234567890', 'Hi', '+1987654321');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toBe('+1987654321');
  });

  it('sendSms throws on failure', async () => {
    mockFetch.mockReturnValue(failJson(400, { error: 'Invalid number' }));
    await expect(sendSms('+bad', 'Hi')).rejects.toThrow('Invalid number');
  });

  it('sendBulkSms sends multiple messages', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, sent: 2, failed: 0, results: [] }));

    const result = await sendBulkSms([
      { to: '+111', message: 'Hi 1' },
      { to: '+222', message: 'Hi 2' },
    ]);

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('send_bulk');
    expect(body.messages).toHaveLength(2);
  });

  it('getSmsHistory fetches message list', async () => {
    mockFetch.mockReturnValue(okJson({
      messages: [{ sid: 'SM1', body: 'Test', status: 'delivered' }],
      total: 1,
    }));

    const result = await getSmsHistory({ limit: 10 });
    expect(result.messages).toHaveLength(1);
    expect(result.total).toBe(1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('list');
  });
});

// ─── SMS AI Responder ───────────────────────────────────────────────────────

describe('SMS — AI Responder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generateSmsAiReply calls sms-ai-responder', async () => {
    mockFetch.mockReturnValue(okJson({
      success: true,
      reply: 'Thanks for reaching out!',
      qualification: { intent: 'booking', score: 85 },
    }));

    const result = await generateSmsAiReply('msg_1', 'user_1');
    expect(result.success).toBe(true);
    expect(result.reply).toContain('reaching out');
    expect(result.qualification?.intent).toBe('booking');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messageId).toBe('msg_1');
    expect(body.action).toBe('generate');
  });

  it('generateSmsAiReply supports regenerate action', async () => {
    mockFetch.mockReturnValue(okJson({ success: true }));
    await generateSmsAiReply('msg_1', 'user_1', 'regenerate');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('regenerate');
  });

  it('approveSmsAiDraft sends approve action', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, sid: 'SM_sent' }));

    const result = await approveSmsAiDraft('msg_1', 'user_1');
    expect(result.success).toBe(true);
    expect(result.sid).toBe('SM_sent');
  });

  it('rejectSmsAiDraft sends reject action', async () => {
    mockFetch.mockReturnValue(okJson({ success: true }));

    const result = await rejectSmsAiDraft('msg_1', 'user_1');
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('reject');
  });
});

// ─── Phone Numbers ──────────────────────────────────────────────────────────

describe('Phone Numbers — CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listPhoneNumbers returns owned numbers', async () => {
    mockFetch.mockReturnValue(okJson([
      { sid: 'PN1', phone_number: '+11234567890', friendly_name: 'Main Line' },
    ]));

    const numbers = await listPhoneNumbers();
    expect(numbers).toHaveLength(1);
    expect(numbers[0].phone_number).toBe('+11234567890');
  });

  it('searchAvailableNumbers searches with params', async () => {
    mockFetch.mockReturnValue(okJson([
      { phone_number: '+15551234567', friendly_name: '(555) 123-4567' },
    ]));

    const numbers = await searchAvailableNumbers({
      country: 'US',
      type: 'Local',
      area_code: '555',
    });

    expect(numbers).toHaveLength(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=available');
    expect(url).toContain('country=US');
    expect(url).toContain('area_code=555');
  });

  it('purchasePhoneNumber buys a number', async () => {
    mockFetch.mockReturnValue(okJson({
      success: true,
      sid: 'PN_new',
      phone_number: '+15551234567',
      friendly_name: 'New Number',
    }));

    const result = await purchasePhoneNumber('+15551234567');
    expect(result.success).toBe(true);
    expect(result.phone_number).toBe('+15551234567');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('purchase');
  });

  it('configurePhoneNumber updates voice/SMS URLs', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, phone_number: '+15551234567' }));

    const result = await configurePhoneNumber('PN1', {
      voice_url: 'https://example.com/voice',
      sms_url: 'https://example.com/sms',
    });

    expect(result.success).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('configure');
    expect(body.sid).toBe('PN1');
  });

  it('releasePhoneNumber deletes a number', async () => {
    mockFetch.mockReturnValue(okJson({ success: true }));

    const result = await releasePhoneNumber('PN1');
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe('release');
    expect(body.sid).toBe('PN1');
  });

  it('releasePhoneNumber throws on failure', async () => {
    mockFetch.mockReturnValue(failJson(400, { error: 'Number in use' }));
    await expect(releasePhoneNumber('PN_active')).rejects.toThrow('Number in use');
  });
});
