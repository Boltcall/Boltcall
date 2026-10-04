import type { Handler } from '@netlify/functions';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getServiceSupabase } from './_shared/token-utils';
import { getHeader } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';
import { appendPiReply } from './_shared/pi-intake-service';

const eventInput=z.object({eventType:z.string(),id:z.string().min(1).max(200),data:z.object({
  from:z.string().regex(/^\+[1-9]\d{7,14}$/),to:z.string().regex(/^\+[1-9]\d{7,14}$/),
  message:z.string().trim().min(1).max(600),messageId:z.string().max(200).optional(),
})});

export const testHandler:Handler=async(event)=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const json=(statusCode:number,body:unknown)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});
  if((event.body?.length||0)>12000) return json(413,{error:'Request too large'});
  const expected=process.env.PI_INTAKE_EVENTGRID_SECRET||'';
  const provided=getHeader(event,'x-pi-webhook-secret')||'';
  if(!expected || Buffer.byteLength(provided)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(expected),Buffer.from(provided))) return json(403,{error:'Forbidden'});
  try {
    const raw=JSON.parse(event.body||'[]');
    const events=Array.isArray(raw)?raw:[raw];
    if(events.length>10) return json(400,{error:'Event batch too large'});
    const validation=events.find(e=>e.eventType==='Microsoft.EventGrid.SubscriptionValidationEvent');
    if(validation) return json(200,{validationResponse:z.string().max(200).parse(validation.data?.validationCode)});
    const db=getServiceSupabase();
    for(const item of events){
      if(item.eventType!=='Microsoft.Communication.SMSReceived') continue;
      const incoming=eventInput.parse(item);
      const {data:firm,error}=await db.from('pi_intake_firms').select('*').eq('sending_number',incoming.data.to).maybeSingle();
      if(error) return json(503,{error:'Firm lookup unavailable'});
      if(!firm) continue;
      const {data:conversation,error:threadError}=await db.from('pi_intake_conversations').select('*').eq('firm_id',firm.id).eq('phone',incoming.data.from).eq('is_demo',false).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(threadError) return json(503,{error:'Conversation lookup unavailable'});
      if(!conversation) {
        // STOP is honored even when there is no retained conversation.
        if(/^(stop|unsubscribe|cancel|end|quit|stopall)\s*[.!]?$/i.test(incoming.data.message)) {
          const {error:stopError}=await db.from('sms_optouts').upsert({phone:incoming.data.from,user_id:firm.user_id});
          if(stopError) return json(503,{error:'Opt-out storage unavailable'});
        }
        continue;
      }
      if(!conversation.consent || conversation.consent.accepted!==true) {
        const {error:handoffError}=await db.from('pi_intake_conversations').update({status:'needs_attention'}).eq('id',conversation.id).eq('firm_id',firm.id).eq('status','active');
        if(handoffError) return json(503,{error:'Consent handoff unavailable'});
      }
      const result=await appendPiReply(db,firm,conversation,incoming.data.message,incoming.data.messageId||incoming.id);
      if(result.conflict) return json(503,{error:'Concurrent conversation change. Retry event.'});
    }
    return json(200,{ok:true});
  }catch(error){
    return error instanceof z.ZodError || error instanceof SyntaxError ? json(400,{error:'Invalid event'}) : json(503,{error:'Could not process reply. Retry event.'});
  }
};
export default withLegacyHandler(testHandler);
