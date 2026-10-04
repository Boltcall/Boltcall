import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFirmDraft, nextIntakeReply, intakeSummary } from '../_shared/pi-intake';
import { canSendPiSms, appendPiReply, isPiSendingHour } from '../_shared/pi-intake-service';
const draft=buildFirmDraft('https://example.com',{name:'Example Law',practiceAreas:[],locations:[],phone:''});
const firm={id:'firm',user_id:'user',draft,paused:false,approved_at:'2026-10-03',sms_verified_at:'2026-10-03',handoff_verified_at:'2026-10-03',sending_number:'+12025550100'};
const conversation={id:'thread',firm_id:'firm',phone:'+12025550101',name:'Test',messages:[{role:'assistant' as const,text:'Greeting'}],is_demo:false,status:'active',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),consent:{accepted:true}};
describe('PI intake safety gates',()=>{
  beforeEach(()=>{vi.stubEnv('PI_INTAKE_LIVE_ENABLED','true');});
  it.each([
    {paused:true},{approved_at:null},{sms_verified_at:null},{handoff_verified_at:null},{sending_number:null},
  ])('requires verified, approved and unpaused firm configuration %j',patch=>{
    expect(canSendPiSms({...firm,...patch},conversation)).toBe(false);
  });
  it.each([{is_demo:true},{consent:null},{status:'human'},{status:'opted_out'},{expires_at:'2020-01-01'},{messages:Array(25).fill({role:'user',text:'x'})}])('blocks unsafe conversation %j',patch=>{
    expect(canSendPiSms(firm,{...conversation,...patch})).toBe(false);
  });
  it('blocks all texting when the deployment switch is off',()=>{vi.stubEnv('PI_INTAKE_LIVE_ENABLED','false');expect(canSendPiSms(firm,conversation)).toBe(false);});
  it('enforces the firm-local sending window',()=>{
    expect(isPiSendingHour('America/New_York',new Date('2026-10-03T14:00:00Z'))).toBe(true);
    expect(isPiSendingHour('America/New_York',new Date('2026-10-03T02:00:00Z'))).toBe(false);
    expect(isPiSendingHour('America/Los_Angeles',new Date('2026-10-03T14:00:00Z'))).toBe(false);
  });
  it('allows an approved thread to finish at the published message boundary during sending hours',()=>{
    expect(canSendPiSms(firm,{...conversation,expires_at:'2026-10-06T14:00:00Z',messages:Array(24).fill({role:'assistant',text:'x'})},new Date('2026-10-03T14:00:00Z'))).toBe(true);
  });
  it('finishes the guided intake with a human handoff, not a booking or eligibility decision',()=>{
    let history=[{role:'assistant' as const,text:nextIntakeReply(draft,[],'Hello').text}];
    let reply:any;
    for(const answer of ['Alex and Jordan','Rear-end collision','Yesterday in Miami','No','Tomorrow morning']){
      reply=nextIntakeReply(draft,history,answer);
      history=[...history,{role:'user' as const,text:answer},{role:'assistant' as const,text:reply.text}];
    }
    expect(reply.status).toBe('needs_attention');expect(reply.text).toContain('No appointment or representation is confirmed');
    expect(intakeSummary(draft,history)).toHaveLength(5);
  });
  it('does not write a global phone opt-out for a browser demo',async()=>{
    const db:any={rpc:vi.fn(async()=>({data:{conversation:{}},error:null})),from:vi.fn()};
    await appendPiReply(db,firm,{...conversation,is_demo:true,phone:null},'STOP');
    expect(db.from).not.toHaveBeenCalled();expect(db.rpc.mock.calls[0][1].p_status).toBe('opted_out');
  });
});
