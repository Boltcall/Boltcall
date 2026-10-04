import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Optional local validation dependency; never installed into the app/runtime.
if(!process.env.PI_PROOF_PGLITE) throw new Error('Set PI_PROOF_PGLITE to a local @electric-sql/pglite dist/index.js');
const {PGlite}=await import(pathToFileURL(process.env.PI_PROOF_PGLITE).href);
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key);create table public.sms_optouts(phone text primary key);`);
await db.exec(await readFile(new URL('../supabase/migrations/20261003120000_pi_intake.sql',import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);
const create=async user=>(await db.query(`insert into pi_intake_firms(user_id,website,draft,paused,approved_at,sms_verified_at,handoff_verified_at)
  values($1,'https://example.com','{}',false,now(),now(),now()) returning id`,[user])).rows[0].id;
const firm=await create(owner), second=await create(other);
const start=async(source,firmId=firm,demo=false)=>(await db.query('select pi_intake_start($1,$2,$3,$4,$5,$6,$7) as result',[
  firmId,source,demo?null:'+12025550101','Test',demo?null:JSON.stringify({accepted:true}),JSON.stringify([{role:'assistant',text:'Hello'}]),demo,
])).rows[0].result;
const first=await start('source-000');
assert.equal(first.conversation.status,'active');
assert.equal((await start('source-000')).duplicate,true);
await start('demo-000',firm,true);
const results=await Promise.all(Array.from({length:11},(_,i)=>start(`source-${i+1}`)));
assert.equal(results.filter(r=>!r.limited).length,9);
assert.equal(results.filter(r=>r.limited).length,2);
assert.ok(results.filter(r=>r.limited).every(r=>r.conversation.status==='needs_attention'));
assert.equal((await start('other-firm-000',second)).limited,false);
const usage=await db.query('select count(*)::int as count from pi_intake_conversations where firm_id=$1 and quota_reserved',[firm]);
assert.equal(usage.rows[0].count,10);
const before=first.conversation.messages;
const messages=[...before,{role:'user',text:'Alex'}];
const turn=async(expected,status='active',event='event-1',firmId=firm)=>(await db.query('select pi_intake_turn($1,$2,$3,$4,$5,$6) as result',[
  firmId,first.conversation.id,JSON.stringify(expected),JSON.stringify(messages),status,event,
])).rows[0].result;
assert.ok((await turn(before)).conversation);
assert.equal((await turn(before)).duplicate,true);
assert.equal((await turn(before,'active','event-2')).conflict,true);
await db.query('update pi_intake_conversations set status=$1 where id=$2',['human',first.conversation.id]);
assert.equal((await turn(messages,'active','event-3')).conflict,true);
assert.equal((await turn(messages,'human','event-4')).conversation.status,'human');
await assert.rejects(()=>turn(messages,'human','event-5',second),/Conversation not found/);
await db.query('update pi_intake_conversations set phone=null,name=null,messages=\'[]\',consent=null where id=$1',[first.conversation.id]);
assert.equal((await start('source-after-erase')).limited,true);
await db.query('insert into sms_optouts(phone) values($1)',['+12025550101']);
assert.equal((await start('source-optedout',second)).opted_out,true);
await db.exec('set role authenticated');
await assert.rejects(()=>db.query('select * from pi_intake_firms'),/permission denied/);
await assert.rejects(()=>db.query('select pi_intake_start($1,$2,$3,$4,$5,$6,$7)',[firm,'unauthorized',null,'Test',null,'[]',true]),/permission denied/);
await db.close();
console.log('PASS: migration, quota, overflow retention, duplicates, firm isolation, takeover CAS, opt-out, erasure receipts, browser-role denial');
