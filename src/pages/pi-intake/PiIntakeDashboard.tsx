import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Inbox, MessageSquare, Settings, Plug, Pause, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';

type Draft={name:string;website:string;phone:string;practiceAreas:string[];locations:string[];questions:string[];handoffEmail?:string;timezone?:string;approved:boolean};
type Conversation={id:string;name:string|null;phone:string|null;status:string;is_demo:boolean;created_at:string;messages:{role:string;text:string}[]};
type Snapshot={firm:null|{id:string;draft:Draft;approved_at:string|null;sms_verified_at:string|null;handoff_verified_at:string|null;sending_number:string|null;paused:boolean;connection_requested_at:string|null};conversations:Conversation[];used:number;allowance:number;liveEnabled?:boolean;summaries?:Record<string,{question:string;answer:string}[]>};
const endpoint='/.netlify/functions/pi-intake';
const primary='rounded-xl border-0 bg-blue-600 text-white shadow-none hover:bg-blue-700 hover:translate-x-0 hover:translate-y-0';
const secondary='rounded-xl border border-gray-200 bg-white text-gray-900 shadow-none hover:translate-x-0 hover:translate-y-0';

// This free product has its own setup. Do not route new users through the paid voice-agent setup gate.
export default function PiIntakeDashboard(){
  const {isLoading,isAuthenticated,user}=useAuth();
  const location=useLocation();
  if(isLoading) return <main className="p-12" role="status">Loading your private workspace…</main>;
  if(!isAuthenticated) return <Navigate to={`/signup?redirect=${encodeURIComponent(location.pathname+location.search)}`} replace/>;
  return <Workspace key={user?.id}/>;
}

function Workspace(){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [draft,setDraft]=useState<Draft|null>(null);
  const [website,setWebsite]=useState(()=>new URLSearchParams(window.location.search).get('website')||'');
  const [tab,setTab]=useState<'inbox'|'agent'|'setup'>('agent');
  const [selected,setSelected]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [eraseConfirmed,setEraseConfirmed]=useState(false);
  async function request(body?:Record<string,unknown>){
    const response=await authedFetch(endpoint,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'Could not load your workspace');
    return result;
  }
  async function refresh(){
    const next=await request() as Snapshot;
    setSnapshot(next);setDraft(next.firm?.draft||null);setConfirmed(false);
    return next;
  }
  useEffect(()=>{let cancelled=false;request().then(next=>{if(!cancelled){setSnapshot(next);setDraft(next.firm?.draft||null);if(next.firm)setTab('inbox');}}).catch(err=>{if(!cancelled)setError(err.message);});return()=>{cancelled=true;};},[]);
  useEffect(()=>{
    document.title='PI Intake Dashboard | Boltcall';
    const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.appendChild(robots);
    return()=>robots.remove();
  },[]);
  async function act(body:Record<string,unknown>){
    setBusy(true);setError('');setNotice('');
    try{const result=await request(body);await refresh();return result;}catch(err){setError(err instanceof Error?err.message:'Please try again');return null;}finally{setBusy(false);}
  }
  async function build(event:React.FormEvent){event.preventDefault();const result=await act({action:'build',website:website||draft?.website});if(result){setTab('agent');setNotice('Your draft is ready. Confirm the facts and test it before requesting a connection.');}}
  async function demo(){const result=await act({action:'demo'});if(result){setSelected(result.conversation.id);setTab('inbox');}}
  function download(){if(!draft)return;const url=URL.createObjectURL(new Blob([JSON.stringify({firm:draft,limits:{conversationsPerMonth:10,messagesPerThread:24,threadHours:72},safeguards:['No legal advice or case evaluation','No representation or booking confirmation','STOP opt-out','HUMAN takeover','Staff reviews every completed intake']},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pi-intake-agent-blueprint.json';a.click();URL.revokeObjectURL(url);}
  const firm=snapshot?.firm;
  const conversation=snapshot?.conversations.find(c=>c.id===selected);
  const live=!!snapshot?.liveEnabled && !!firm?.approved_at && !!firm?.sms_verified_at && !!firm?.handoff_verified_at && !firm?.paused;
  const edit=(key:keyof Draft,value:string|string[])=>{if(draft){setDraft({...draft,[key]:value});setConfirmed(false);}};
  return <main className="min-h-screen bg-white text-gray-900" dir="ltr">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 lg:px-10"><Link to="/tools/pi-sms-intake-agent" className="flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4"/> boltcall / PI intake</Link><span className="rounded-full border border-gray-200 px-3 py-1 text-xs">{live?'Live intake':'Test workspace · live SMS not active'}</span></header>
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs uppercase tracking-[.2em] text-gray-500">Your intake workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{firm?.draft.name||'Build your firm’s intake agent'}</h1><p className="mt-2 text-sm text-gray-600">A faster first response. A human decides what happens next.</p></div><div className="flex gap-2"><Button className={secondary} disabled={busy} onClick={()=>{setBusy(true);setError('');refresh().catch(err=>setError(err.message)).finally(()=>setBusy(false));}} aria-label="Refresh inbox"><RefreshCw/></Button>{firm?<Button className={secondary} disabled={busy} onClick={()=>act({action:'pause'})}><Pause/>Pause automation</Button>:null}</div></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">{[[`${snapshot?.used||0} / ${snapshot?.allowance||10}`,'Free conversations this month'],[String(snapshot?.conversations.filter(c=>!c.is_demo&&c.status==='needs_attention').length||0),'Inquiries needing staff'],[firm?.approved_at?'Approved':'Draft','Firm approval']].map(([value,label])=><div key={label} className="rounded-xl border border-gray-200 p-5"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>)}</div>
      <nav aria-label="Intake dashboard" className="mt-8 flex gap-2 border-b border-gray-200 pb-4">{([['inbox',Inbox,'Inbox'],['agent',Settings,'Agent'],['setup',Plug,'Setup & usage']] as const).map(([key,Icon,label])=><Button key={key} className={secondary} aria-pressed={tab===key} onClick={()=>setTab(key)}><Icon/>{label}</Button>)}</nav>
      {error?<p role="alert" className="mt-5 rounded-xl border border-red-200 p-4 text-sm text-red-700">{error}</p>:null}
      {notice?<p role="status" className="mt-5 rounded-xl border border-gray-200 p-4 text-sm">{notice}</p>:null}
      {!snapshot&&!error?<p className="py-12" role="status">Loading your agent and inbox…</p>:null}
      {tab==='agent'?<section className="mt-8 max-w-3xl">
        <form onSubmit={build} className="flex flex-col gap-5"><Input label="Firm website" type="url" required value={website||draft?.website||''} onChange={e=>setWebsite(e.target.value)}/><Button className={primary} disabled={busy} type="submit">{busy?'Working…':firm?'Rebuild draft from website':'Build my agent'}</Button><p className="text-xs text-gray-500">Rebuilding pauses the agent and clears approval. Website content is a draft source, not a legal qualification policy.</p></form>
        {draft?<div className="mt-10 space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Review your agent</h2><Button className={secondary} onClick={download}><Download/>Download blueprint</Button></div>
          <Input label="Firm name" value={draft.name} onChange={e=>edit('name',e.target.value)}/>
          <Input label="Practice areas (comma-separated)" value={draft.practiceAreas.join(', ')} onChange={e=>edit('practiceAreas',e.target.value.split(',').map(s=>s.trim()))}/>
          <Input label="Locations (comma-separated)" value={draft.locations.join(', ')} onChange={e=>edit('locations',e.target.value.split(',').map(s=>s.trim()))}/>
          <Input label="Firm phone (reference only)" value={draft.phone} onChange={e=>edit('phone',e.target.value)}/>
          <Input label="Staff handoff email" type="email" value={draft.handoffEmail||''} onChange={e=>edit('handoffEmail',e.target.value)}/>
          <Input label="Firm timezone (IANA name)" value={draft.timezone||'America/New_York'} onChange={e=>edit('timezone',e.target.value)}/>
          <p className="text-xs text-gray-500">Pilot SMS sends only from 9am to 8pm in this timezone. Outside that window, inquiries go to staff. Confirm any stricter local requirements during setup.</p>
          <div><h3 className="font-semibold">Intake questions</h3><p className="mt-1 text-xs text-gray-500">One question per line. Collect minimal information; staff runs conflicts and reviews eligibility.</p><textarea aria-label="Intake questions" rows={7} value={draft.questions.join('\n')} onChange={e=>edit('questions',e.target.value.split('\n'))} className="mt-3 w-full rounded-xl border border-gray-300 p-4 text-sm focus:ring-2 focus:ring-blue-600"/></div>
          <p className="text-sm leading-relaxed text-gray-600">The assistant identifies itself, does not give legal advice or confirm representation, honors STOP, and flags requests for a human. No appointments are automatically booked.</p>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>I have reviewed the firm facts, intake questions, and handoff contact. I understand that live texting needs a separate consent and sending-number review.</label>
          <div className="flex flex-wrap gap-3"><Button className={secondary} disabled={busy} onClick={()=>act({action:'save',draft:{...draft,practiceAreas:draft.practiceAreas.filter(Boolean),locations:draft.locations.filter(Boolean)}})}>Save draft</Button><Button className={primary} disabled={busy||!confirmed} onClick={async()=>{const result=await act({action:'approve',draft:{...draft,practiceAreas:draft.practiceAreas.filter(Boolean),locations:draft.locations.filter(Boolean)},confirmed});if(result)setNotice('Agent approved. Request a form connection in Setup & usage.');}}>Approve agent</Button><Button className={secondary} disabled={busy} onClick={demo}><MessageSquare/>Test saved agent</Button></div>
        </div>:null}
      </section>:null}
      {tab==='inbox'?<section className="mt-8"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Conversations</h2><Button className={primary} disabled={busy||!firm} onClick={demo}>Start test conversation</Button></div><p className="mb-5 text-xs text-gray-500">Demo conversations do not consume your monthly allowance. Refresh to load new replies.</p>
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]"><div className="space-y-2">{snapshot?.conversations.length?snapshot.conversations.map(c=><button key={c.id} onClick={()=>{setSelected(c.id);setEraseConfirmed(false);}} className={`w-full rounded-xl border p-4 text-left focus-visible:ring-2 focus-visible:ring-blue-600 ${selected===c.id?'border-gray-900':'border-gray-200'}`}><p className="text-sm font-semibold">{c.name||'Content erased'}</p><p className="mt-1 text-xs text-gray-500">{c.is_demo?'Demo':'Website inquiry'} · {c.status.replaceAll('_',' ')}</p><p className="mt-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</p></button>):<div className="rounded-xl border border-dashed border-gray-300 p-7 text-sm text-gray-500">Your inbox is empty. Test your agent, then request a website form connection.</div>}</div>
        {conversation?<div className="rounded-xl border border-gray-200 p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{conversation.name||'Erased inquiry'}</h3><p className="text-xs text-gray-500">{conversation.phone||'Browser demo · no SMS sent'}</p></div><Button className={secondary} disabled={busy||['human','opted_out'].includes(conversation.status)} onClick={()=>act({action:'takeover',conversationId:conversation.id})}>Take over / stop agent</Button></div>
          <div className="my-6 max-h-[480px] space-y-3 overflow-y-auto" aria-live="polite">{conversation.messages.map((m,i)=><div key={i} className={`max-w-xl rounded-xl border border-gray-200 p-4 text-sm leading-relaxed ${m.role==='user'?'ml-auto':''}`}><p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">{m.role==='user'?'Prospective client':'Intake assistant'}</p>{m.text}</div>)}</div>
          {conversation.is_demo&&conversation.status==='active'?<form onSubmit={async e=>{e.preventDefault();const result=await act({action:'reply',conversationId:conversation.id,message});if(result)setMessage('');}} className="flex gap-3"><input aria-label="Demo reply" required maxLength={600} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Reply as a prospective client…" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm"/><Button type="submit" disabled={busy} className={primary}>Send</Button></form>:<p className="text-sm text-gray-600">{conversation.status==='human'?'Automation stopped. Contact this inquiry through your approved staff channel.':conversation.status==='opted_out'?'This contact opted out. Do not send further texts.':'Staff review is required. No booking or representation is confirmed.'}</p>}
          <div className="mt-7 border-t border-gray-100 pt-5"><h3 className="font-semibold">Intake handoff summary</h3>{snapshot?.summaries?.[conversation.id]?.length?<dl className="mt-3 space-y-4">{snapshot.summaries[conversation.id].map((item,i)=><div key={i}><dt className="text-xs text-gray-500">{item.question}</dt><dd className="mt-1 text-sm">{item.answer}</dd></div>)}</dl>:<p className="mt-2 text-sm text-gray-500">No intake answers yet.</p>}<p className="mt-4 text-xs text-gray-500">Next action: staff reviews conflicts, unanswered questions, and follow-up availability.</p></div>
          <div className="mt-6 border-t border-gray-100 pt-4"><label className="flex gap-2 text-xs text-gray-500"><input type="checkbox" checked={eraseConfirmed} onChange={e=>setEraseConfirmed(e.target.checked)}/>Permanently erase this thread’s contact details and messages. Usage history remains.</label><Button className="mt-3" variant="ghost" disabled={busy||!eraseConfirmed} onClick={async()=>{await act({action:'delete_conversation',conversationId:conversation.id});setEraseConfirmed(false);}}>Erase conversation content</Button></div>
        </div>:<p className="rounded-xl border border-gray-200 p-8 text-sm text-gray-500">Select a conversation to see its messages and intake summary.</p>}</div>
      </section>:null}
      {tab==='setup'?<section className="mt-8 max-w-3xl space-y-8"><div><h2 className="text-xl font-semibold">Connect one website form</h2><p className="mt-3 text-sm leading-relaxed text-gray-600">For the pilot, we help connect your existing form through a server-to-server integration. Keep your original form notifications enabled. Never put an integration secret in your public website code.</p></div><ol className="list-decimal space-y-4 pl-5 text-sm"><li>Build, test, and approve the agent.</li><li>Review your form’s SMS consent language and intake boundaries.</li><li>Verify the firm and a dedicated SMS-capable sending number.</li><li>Connect your form and verify reply routing, STOP, and staff handoff.</li><li>Activate only after the full test succeeds.</li></ol><Button className={primary} disabled={busy||!firm?.approved_at} onClick={async()=>{const result=await act({action:'request_connection'});if(result)setNotice('Connection request recorded. Contact Boltcall to arrange the pilot setup; SMS is still inactive.');}}>{firm?.connection_requested_at?'Connection requested':'Request hands-on connection help'}</Button><p className="text-sm"><a className="underline" href="mailto:noamj@boltcall.org?subject=PI%20intake%20pilot%20connection">Email Boltcall about your connection</a></p><div className="rounded-xl border border-gray-200 p-6"><h3 className="font-semibold">Your free allowance</h3><p className="mt-3 text-sm leading-relaxed text-gray-600">10 new intake threads per calendar month (UTC). Each thread lasts up to 72 hours with up to 24 messages total. Browser demos are separate. New inquiries beyond the allowance go to staff; active threads can finish within their limits. Deleting content does not reset usage.</p><p className="mt-3 text-sm text-gray-600">Need more volume? <Link to="/book-a-call" className="underline">Discuss a paid plan</Link>. Your inbox and blueprint remain accessible.</p></div><p className="text-xs leading-relaxed text-gray-500">Pilot retention is manual: erase contact details and messages from the inbox when no longer needed. Agree on a retention policy and access controls before using real prospective-client data. Handoff email delivery must be verified during connection setup.</p></section>:null}
    </div>
  </main>;
}
