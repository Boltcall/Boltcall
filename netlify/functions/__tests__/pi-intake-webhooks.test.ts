import { beforeEach, describe, expect, it, vi } from 'vitest';
const db=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn(),auth:{admin:{getUserById:vi.fn()}}}));
vi.mock('../_shared/token-utils',()=>({getServiceSupabase:()=>db}));
const event=(body:unknown,headers:Record<string,string>={})=>({httpMethod:'POST',body:JSON.stringify(body),headers,queryStringParameters:null} as any);
function query(data:unknown){const q:any={then:(resolve:any)=>Promise.resolve({data,error:null}).then(resolve)};for(const method of ['select','eq','order','limit','update','upsert'])q[method]=vi.fn(()=>q);q.maybeSingle=vi.fn(async()=>({data,error:null}));return q;}
const firm={id:'firm',user_id:'owner',website:'https://example.com',draft:{name:'Example Law',questions:['What is your name?']},paused:false,approved_at:'approved',sms_verified_at:'verified',handoff_verified_at:'verified',sending_number:'+12025550100'};
const lead={sourceId:'source-001',name:'Test',phone:'+12025550101',consent:{accepted:true,text:'I agree to receive intake texts from Example Law.',timestamp:new Date().toISOString(),sourceUrl:'https://example.com/contact'}};
describe('PI intake form and SMS webhooks',()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('PI_INTAKE_LIVE_ENABLED','false');vi.stubEnv('PI_INTAKE_EVENTGRID_SECRET','test-webhook-secret');vi.stubEnv('BREVO_API_KEY','');db.from.mockImplementation(table=>query(table==='pi_intake_firms'?firm:null));db.rpc.mockResolvedValue({data:{limited:true,conversation:{id:'thread',status:'needs_attention'}},error:null});});
  it('requires a server-side integration credential before reading lead data',async()=>{
    const {testHandler}=await import('../pi-intake-lead');const result=await testHandler(event(lead),{} as any);
    expect(result?.statusCode).toBe(401);expect(db.from).not.toHaveBeenCalled();
  });
  it('rejects missing SMS consent',async()=>{
    const {testHandler}=await import('../pi-intake-lead');const result=await testHandler(event({...lead,consent:undefined},{authorization:`Bearer ${'test'.repeat(10)}`}),{} as any);
    expect(result?.statusCode).toBe(400);expect(db.rpc).not.toHaveBeenCalled();
  });
  it('rejects a consent record from a different website',async()=>{
    const {testHandler}=await import('../pi-intake-lead');const result=await testHandler(event({...lead,consent:{...lead.consent,sourceUrl:'https://evil.example'}},{authorization:`Bearer ${'test'.repeat(10)}`}),{} as any);
    expect(result?.statusCode).toBe(400);
  });
  it('retains over-limit leads for staff without sending SMS',async()=>{
    const {testHandler}=await import('../pi-intake-lead');const result=await testHandler(event(lead,{authorization:`Bearer ${'test'.repeat(10)}`}),{} as any);
    expect(result?.statusCode).toBe(200);expect(JSON.parse(result!.body as string)).toMatchObject({routedToStaff:true,limited:true});
  });
  it('does not send a duplicate lead twice',async()=>{
    db.rpc.mockResolvedValue({data:{duplicate:true},error:null});
    const {testHandler}=await import('../pi-intake-lead');const result=await testHandler(event(lead,{authorization:`Bearer ${'test'.repeat(10)}`}),{} as any);
    expect(JSON.parse(result!.body as string)).toMatchObject({duplicate:true});
  });
  it('fails closed on inbound SMS when the webhook secret is unset',async()=>{
    vi.stubEnv('PI_INTAKE_EVENTGRID_SECRET','');
    const {testHandler}=await import('../pi-intake-inbound');const result=await testHandler(event([]),{} as any);
    expect(result?.statusCode).toBe(403);
  });
  it('requires authentication even for the Event Grid validation handshake',async()=>{
    const {testHandler}=await import('../pi-intake-inbound');const body=[{eventType:'Microsoft.EventGrid.SubscriptionValidationEvent',data:{validationCode:'test-validation'}}];
    expect((await testHandler(event(body),{} as any))?.statusCode).toBe(403);
    const result=await testHandler(event(body,{'x-pi-webhook-secret':'test-webhook-secret'}),{} as any);
    expect(JSON.parse(result!.body as string)).toMatchObject({validationResponse:'test-validation'});
  });
});
