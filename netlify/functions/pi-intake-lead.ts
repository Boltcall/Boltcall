import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';
import { getHeader } from './_shared/user-auth';
import { nextIntakeReply } from './_shared/pi-intake';
import { hashIntegrationKey, deliverPiMessage, isPiLiveEnabled, notifyPiStaff } from './_shared/pi-intake-service';
import { consumePublicRateLimit, hashRateLimitKey } from './_shared/public-rate-limit';

const leadInput=z.object({
  sourceId:z.string().trim().min(8).max(120), name:z.string().trim().min(1).max(120),
  phone:z.string().regex(/^\+[1-9]\d{7,14}$/),
  consent:z.object({accepted:z.literal(true),text:z.string().min(20).max(2000),timestamp:z.string().datetime(),sourceUrl:z.string().url().max(2048)}),
});

// Server-to-server form adapter. The integration key must never be embedded in a public page.
export const testHandler:Handler=async(event)=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const json=(statusCode:number,body:unknown)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});
  if((event.body?.length||0)>6000) return json(413,{error:'Request too large'});
  const key=getHeader(event,'authorization')?.replace(/^Bearer /,'') || '';
  if(key.length<32 || key.length>200) return json(401,{error:'Integration credential required'});
  try {
    const db=getServiceSupabase();
    const {data:firm,error}=await db.from('pi_intake_firms').select('*').eq('integration_key_hash',hashIntegrationKey(key)).maybeSingle();
    if(error) return json(503,{error:'Intake storage unavailable'});
    if(!firm) return json(401,{error:'Invalid integration credential'});
    const limit=await consumePublicRateLimit(db,{bucket:'pi-leads',key:hashRateLimitKey([firm.id]),maxAttempts:60,windowSeconds:3600});
    if(!limit.allowed) return json(limit.statusCode,{error:'Lead limit reached. Keep the original inquiry in your form system.'});
    const lead=leadInput.parse(JSON.parse(event.body||'{}'));
    const age=Date.now()-new Date(lead.consent.timestamp).getTime();
    if(age< -60000 || age>86400000) return json(400,{error:'Consent must belong to a fresh form submission'});
    if(new URL(lead.consent.sourceUrl).hostname!==new URL(firm.website).hostname) return json(400,{error:'Consent source must match the approved website'});
    const greeting=nextIntakeReply(firm.draft,[],'Hello');
    const {data,error:startError}=await db.rpc('pi_intake_start',{
      p_firm:firm.id,p_source:lead.sourceId,p_phone:lead.phone,p_name:lead.name,
      p_consent:lead.consent,p_messages:[{role:'assistant',text:greeting.text}],p_demo:false,
    });
    if(startError) return json(503,{error:'Inquiry could not be saved. Retain it and retry using the same sourceId.'});
    if(data.duplicate) return json(200,{ok:true,duplicate:true});
    if(data.opted_out) {const staffNotified=await notifyPiStaff(db,firm);return json(200,{ok:true,routedToStaff:true,staffNotified,optedOut:true});}
    if(data.limited || !isPiLiveEnabled() || !firm.handoff_verified_at || data.conversation.status!=='active') {
      if(data.conversation.status==='active') {
        const {error:handoffError}=await db.from('pi_intake_conversations').update({status:'needs_attention'}).eq('id',data.conversation.id).eq('firm_id',firm.id);
        if(handoffError) return json(503,{error:'Staff handoff could not be saved'});
      }
      const staffNotified=await notifyPiStaff(db,firm);
      return json(200,{ok:true,routedToStaff:true,staffNotified,limited:!!data.limited});
    }
    const result=await deliverPiMessage(db,firm,data.conversation);
    if(!result.sent) await notifyPiStaff(db,firm);
    return json(200,{ok:true,sent:result.sent,routedToStaff:!result.sent});
  }catch(error){
    if(error instanceof z.ZodError || error instanceof SyntaxError) return json(400,{error:'A valid lead and explicit SMS consent record are required'});
    return json(503,{error:'Intake unavailable. Retain the inquiry in your form system.'});
  }
};
export default withLegacyHandler(testHandler);
