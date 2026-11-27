import { beforeEach, expect, it, vi } from 'vitest';

const alertOwner = vi.hoisted(() => vi.fn(async () => true));
const chatCompletion = vi.hoisted(() => vi.fn());
const sendAcsSms = vi.hoisted(() => vi.fn(async () => ({ success: true, messageId: 'sm-1' })));
const db = vi.hoisted(() => ({ settings: null as any }));

// Every query resolves to the row(s) its table holds; writes succeed.
function table(name: string) {
  const rows: Record<string, any> = {
    sms_conversations: { id: 'msg-1', user_id: 'u1', from_number: '+15125550100', to_number: '+15125550199', body: 'My son was arrested an hour ago', thread_id: null, ai_draft_status: null },
    sms_settings: db.settings,
    leads: null,
  };
  const q: any = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'update', 'insert', 'in', 'is']) q[m] = () => q;
  q.single = async () => ({ data: name === 'leads' ? { id: 'lead-1' } : rows[name] ?? null, error: null });
  q.maybeSingle = async () => ({ data: rows[name] ?? null, error: null });
  q.then = (res: any) => Promise.resolve({ data: name === 'sms_conversations' ? [{ direction: 'inbound', body: rows.sms_conversations.body }] : null, error: null }).then(res);
  return q;
}

vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: () => ({ from: table }), deductTokens: vi.fn(), TOKEN_COSTS: { sms_sent: 1 } }));
vi.mock('../_shared/notify', () => ({ alertOwner, notifyError: vi.fn(), notifyInfo: vi.fn() }));
vi.mock('../_shared/azure-ai', () => ({ chatCompletion }));
vi.mock('../_shared/agent-context', () => ({ buildAgentContext: async () => ({}) }));
vi.mock('../_shared/acs-sdk', () => ({ sendAcsSms }));
vi.mock('../_shared/user-auth', () => ({ requireInternalOrMatchingUser: async () => ({ ok: true }) }));
vi.mock('../_shared/chats-sync', () => ({ appendChatMessage: vi.fn() }));
vi.mock('../_shared/setup-workspace', () => ({ ensureWorkspaceForUser: async () => null }));
vi.mock('../_shared/calcom-v2', () => ({ getCalcomEventType: vi.fn(), getCalcomSlots: vi.fn() }));

import { testHandler } from '../sms-ai-responder';
import { isWithinBusinessHours } from '../_shared/business-hours';

const run = () => testHandler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ messageId: 'msg-1', userId: 'u1' }) } as any, {} as any);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ACS_CONNECTION_STRING = 'x';
  chatCompletion.mockResolvedValue(JSON.stringify({
    reply: 'Sorry to hear that. What is his full name and where is he held?',
    qualification: { intent: 'inquiry', score: 90, reason: 'arrest', suggested_action: 'escalate', urgent: true, urgent_reason: 'son in custody' },
  }));
});

it('with no saved settings, auto-sends the reply and emails the owner an urgent alert', async () => {
  db.settings = null;
  const res: any = await run();
  expect(JSON.parse(res.body).draftStatus).toBe('auto_sent');
  expect(sendAcsSms).toHaveBeenCalledWith('+15125550199', '+15125550100', expect.stringContaining('full name'));
  expect(alertOwner).toHaveBeenCalledTimes(1);
  const [, userId, subject, lines, opts] = alertOwner.mock.calls[0] as any[];
  expect(userId).toBe('u1');
  expect(subject).toContain('URGENT text');
  expect(lines.join('\n')).toContain('son in custody');
  expect(opts).toEqual({ urgent: true });
});

it('non-urgent text sends no owner alert', async () => {
  db.settings = null;
  chatCompletion.mockResolvedValue(JSON.stringify({ reply: 'Hi!', qualification: { intent: 'inquiry', score: 40, reason: 'q', suggested_action: 'respond', urgent: false } }));
  await run();
  expect(alertOwner).not.toHaveBeenCalled();
});

it('closed hours: owner out-of-hours text is sent, greeting and closed rule reach the prompt, alert still fires', async () => {
  // 00:00-00:01 window means "closed" at any real time except that one minute.
  db.settings = { auto_reply_enabled: true, response_tone: 'friendly', booking_enabled: false, max_ai_messages_per_conversation: 10,
    business_hours_only: true, business_hours_start: '00:00', business_hours_end: '00:01', business_timezone: 'UTC',
    out_of_hours_message: 'We are closed. We will text you at 9am.', greeting_template: 'Hi, this is Smith Law.' };
  const res: any = await run();
  expect(JSON.parse(res.body).reply).toBe('We are closed. We will text you at 9am.');
  const prompt = chatCompletion.mock.calls[0][0] as string;
  expect(prompt).toContain('Hi, this is Smith Law.');
  expect(prompt).toContain('The office is closed right now');
  expect(alertOwner).toHaveBeenCalledTimes(1);
});

it('business-hours check respects timezone and the hours_only switch', () => {
  const at = new Date('2026-11-27T15:00:00Z'); // 10:00 New York
  const s = { business_hours_only: true, business_hours_start: '09:00', business_hours_end: '17:00', business_timezone: 'America/New_York' };
  expect(isWithinBusinessHours(s, at)).toBe(true);
  expect(isWithinBusinessHours({ ...s, business_timezone: 'Asia/Jerusalem' }, at)).toBe(false); // 17:00 there
  expect(isWithinBusinessHours({ ...s, business_hours_only: false }, at)).toBe(true);
});
