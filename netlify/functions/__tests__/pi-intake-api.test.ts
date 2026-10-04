import { beforeEach, describe, expect, it, vi } from 'vitest';
const db=vi.hoisted(()=>({auth:{getUser:vi.fn()},from:vi.fn(),rpc:vi.fn()}));
vi.mock('../_shared/token-utils',()=>({getServiceSupabase:()=>db}));
const event=(body:unknown,authorization='Bearer test-customer-token')=>({httpMethod:'POST',headers:{authorization},body:JSON.stringify(body),queryStringParameters:null} as any);
const firm={id:'11111111-1111-4111-8111-111111111111',user_id:'owner-a',website:'https://example.com',draft:{name:'Example Law',practiceAreas:[],locations:[],phone:'',questions:['Who is involved?','What happened?','When and where?']},paused:true,approved_at:null,sms_verified_at:null,handoff_verified_at:null};

function query(data:unknown){const q:any={then:(resolve:any)=>Promise.resolve({data,error:null}).then(resolve)};for(const method of ['select','eq','order','limit','gte','update','upsert'])q[method]=vi.fn(()=>q);q.maybeSingle=vi.fn(async()=>({data,error:null}));return q;}

describe('PI intake customer boundary',()=>{
  beforeEach(()=>{vi.clearAllMocks();db.auth.getUser.mockResolvedValue({data:{user:{id:'owner-a'}},error:null});db.from.mockImplementation(()=>query(firm));});
  it('rejects unauthenticated requests before reading firm data',async()=>{
    const {testHandler}=await import('../pi-intake');const result=await testHandler(event({action:'demo'},''),{} as any);
    expect(result?.statusCode).toBe(401);expect(db.from).not.toHaveBeenCalled();
  });
  it('cannot approve without a handoff contact and explicit confirmation',async()=>{
    const {testHandler}=await import('../pi-intake');const result=await testHandler(event({action:'approve',draft:firm.draft,confirmed:true}),{} as any);
    expect(result?.statusCode).toBe(400);
  });
  it('cannot look up another firm’s conversation',async()=>{
    const threadQuery=query(null);db.from.mockImplementation(table=>table==='pi_intake_firms'?query(firm):threadQuery);
    const {testHandler}=await import('../pi-intake');const result=await testHandler(event({action:'takeover',conversationId:'22222222-2222-4222-8222-222222222222'}),{} as any);
    expect(result?.statusCode).toBe(404);expect(threadQuery.eq).toHaveBeenCalledWith('firm_id',firm.id);
  });
  it('rejects malformed request JSON without treating it as a server failure',async()=>{
    const {testHandler}=await import('../pi-intake');const result=await testHandler({...event({}),body:'{'},{} as any);
    expect(result?.statusCode).toBe(400);
  });
  it('rejects arbitrary origins even with a valid customer token',async()=>{
    const {testHandler}=await import('../pi-intake');const result=await testHandler({...event({action:'demo'}),headers:{origin:'https://evil.example',authorization:'Bearer test-customer-token'}},{} as any);
    expect(result?.statusCode).toBe(403);
  });
  it('does not expose integration credential hashes in the dashboard',async()=>{
    db.from.mockImplementation(table=>table==='pi_intake_firms'?query({...firm,integration_key_hash:'test-hash'}):query([]));
    const {testHandler}=await import('../pi-intake');const result=await testHandler({...event({}),httpMethod:'GET'},{} as any);
    expect(result?.statusCode).toBe(200);expect(JSON.parse(result!.body as string).firm.integration_key_hash).toBeUndefined();
  });
});
