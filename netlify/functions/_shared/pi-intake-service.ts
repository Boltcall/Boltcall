import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAcsSms } from './acs-sdk';
import { alertOwner } from './notify';
import { MAX_MESSAGES, nextIntakeReply, type FirmDraft, type IntakeMessage } from './pi-intake';

export const hashIntegrationKey = (value: string) => createHash('sha256').update(value).digest('hex');
export const isPiLiveEnabled = () => process.env.PI_INTAKE_LIVE_ENABLED === 'true';
export function isPiSendingHour(timezone: string, now=new Date()) {
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'numeric',hourCycle:'h23'}).format(now));
  return hour>=9 && hour<20;
}
export type PiFirm = { id: string; user_id: string; draft: FirmDraft; paused: boolean; approved_at: string | null; sms_verified_at: string | null; handoff_verified_at: string | null; sending_number: string | null };
export type PiConversation = { id: string; firm_id: string; phone: string | null; name: string | null; messages: IntakeMessage[]; is_demo: boolean; status: string; created_at: string; expires_at: string; consent: { accepted?: boolean } | null };

export function canSendPiSms(firm: PiFirm, conversation: PiConversation, now = new Date()) {
  return isPiLiveEnabled() && !firm.paused && !!firm.approved_at && !!firm.sms_verified_at && !!firm.handoff_verified_at &&
    !!firm.sending_number && !!conversation.phone && !conversation.is_demo &&
    conversation.consent?.accepted === true && conversation.status === 'active' &&
    new Date(conversation.expires_at) > now && conversation.messages.length <= MAX_MESSAGES &&
    isPiSendingHour(firm.draft.timezone,now);
}

export async function notifyPiStaff(db: SupabaseClient, firm: PiFirm) {
  // No injury details or phone numbers in email: staff opens the private inbox.
  return alertOwner(db,firm.user_id,'PI intake: an inquiry needs your team',[
    'A prospective-client inquiry needs review. Open your private intake inbox:',
    'https://boltcall.org/pi-intake',
    'No appointment or attorney-client relationship has been confirmed.',
  ],{urgent:true});
}

export async function deliverPiMessage(db: SupabaseClient, firm: PiFirm, conversation: PiConversation) {
  if (!canSendPiSms(firm, conversation)) {
    const {error}=await db.from('pi_intake_conversations').update({status:'needs_attention'}).eq('id',conversation.id).eq('firm_id',firm.id).eq('status','active');
    if(error) throw new Error('Staff handoff could not be saved');
    return { sent: false };
  }
  const {data:current,error:currentError}=await db.from('pi_intake_conversations').select('status').eq('id',conversation.id).eq('firm_id',firm.id).maybeSingle();
  if(currentError) throw new Error('Takeover check unavailable');
  if(!current || !['active','needs_attention'].includes(current.status)) return {sent:false};
  const { data: optout, error: optoutError } = await db.from('sms_optouts').select('phone').eq('phone', conversation.phone!).maybeSingle();
  if (optoutError) throw new Error('Opt-out check unavailable');
  if (optout) return { sent: false };
  const message = conversation.messages.at(-1)?.text;
  if (!message) return { sent: false };
  const result = await sendAcsSms(firm.sending_number!, conversation.phone!, message);
  if (!result.success) {
    const { error } = await db.from('pi_intake_conversations').update({ status: 'needs_attention' }).eq('id', conversation.id).eq('firm_id', firm.id).eq('status', 'active');
    if (error) throw new Error('SMS failure handoff could not be saved');
    return { sent: false, failed: true };
  }
  return { sent: true };
}

export async function appendPiReply(db: SupabaseClient, firm: PiFirm, conversation: PiConversation, message: string, eventId?: string) {
  const reply = nextIntakeReply(firm.draft, conversation.messages, message);
  const isStop = reply.status === 'opted_out';
  const atLimit=conversation.messages.length >= MAX_MESSAGES - 2;
  const blocked = conversation.status !== 'active' || new Date(conversation.expires_at) <= new Date() || atLimit ||
    (!conversation.is_demo && (!isPiLiveEnabled() || firm.paused || !firm.approved_at || !firm.sms_verified_at || !firm.handoff_verified_at || conversation.consent?.accepted!==true));
  const status = isStop ? 'opted_out' : blocked ? (['human','opted_out'].includes(conversation.status) ? conversation.status : 'needs_attention') : reply.status;
  const messages: IntakeMessage[] = [...conversation.messages, { role: 'user', text: message,
    field: conversation.messages.filter(m => m.role === 'assistant').at(-1)?.text }];
  if (!blocked && reply.text) messages.push({ role: 'assistant', text: reply.text });
  // Retain a bounded transcript. Late replies are routed to the firm's original notifications.
  if(atLimit && !isStop){
    const {data,error}=await db.rpc('pi_intake_turn',{
      p_firm:firm.id,p_conversation:conversation.id,p_expected:conversation.messages,
      p_messages:conversation.messages,p_status:status,p_event:eventId||null,
    });
    if(error) throw new Error('Message-limit handoff could not be saved');
    if(!conversation.is_demo && !data.duplicate) await notifyPiStaff(db,firm);
    return {...data,limited:true};
  }
  const { data, error } = await db.rpc('pi_intake_turn', {
    p_firm: firm.id, p_conversation: conversation.id, p_expected: conversation.messages,
    p_messages: messages, p_status: status, p_event: eventId || null,
  });
  if (error) throw new Error('Conversation update failed');
  if (isStop && conversation.phone) {
    const { error: stopError } = await db.from('sms_optouts').upsert({ phone: conversation.phone, user_id: firm.user_id });
    if (stopError) throw new Error('Opt-out could not be saved');
  }
  if(data.duplicate || data.conflict) return data;
  if (data.conversation && !conversation.is_demo && !blocked && !isStop) {
    // Escalation text can be sent once, then automation is stopped.
    const delivery=await deliverPiMessage(db, firm, { ...data.conversation, status: 'active' });
    if(!delivery.sent) await notifyPiStaff(db,firm);
  }
  if(data.conversation && !conversation.is_demo && status==='needs_attention') await notifyPiStaff(db,firm);
  return data;
}
