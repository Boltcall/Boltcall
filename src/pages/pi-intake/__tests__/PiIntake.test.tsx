import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PiIntakeLanding from '../PiIntakeLanding';
import PiIntakeDashboard from '../PiIntakeDashboard';
const auth=vi.hoisted(()=>({isLoading:false,isAuthenticated:true}));
vi.mock('../../../contexts/AuthContext',()=>({useAuth:()=>auth}));
// Mock only the browser/network boundary; the dashboard and its actions are real.
vi.mock('../../../lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test-session-token'}}})}}}));
const draft={name:'Example Law',website:'https://example.com',practiceAreas:['Car accidents'],locations:[],phone:'',questions:['Who was involved?','What happened?','When and where?'],approved:false};
const initial={firm:{id:'firm',draft,approved_at:null,sms_verified_at:null,handoff_verified_at:null,paused:true},conversations:[],used:0,allowance:10};
describe('PI intake screens',()=>{
  beforeEach(()=>{auth.isAuthenticated=true;localStorage.clear();vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(initial),{status:200})));});
  afterEach(()=>{cleanup();vi.unstubAllGlobals();});
  it('explains the free offer and requires a website',()=>{
    render(<MemoryRouter><PiIntakeLanding/></MemoryRouter>);
    expect(screen.getByText(/10 new lead conversations free each month/)).toBeInTheDocument();
    expect(screen.getByLabelText('Your firm’s website')).toBeRequired();
    expect(screen.getByRole('button',{name:/Build my free intake agent/})).toBeInTheDocument();
  });
  it('loads the private inbox and opens a demo without claiming live SMS is active',async()=>{
    let state:any=initial;
    vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{
      if(options?.method==='POST'){
        const body=JSON.parse(options.body);
        if(body.action==='demo'){
          const conversation={id:'demo-1',name:'Test inquiry',phone:null,is_demo:true,status:'active',created_at:new Date().toISOString(),messages:[{role:'assistant',text:'Test greeting'}]};
          state={...initial,conversations:[conversation]};
          return new Response(JSON.stringify({conversation}),{status:200});
        }
      }
      return new Response(JSON.stringify(state),{status:200});
    }));
    render(<MemoryRouter><PiIntakeDashboard/></MemoryRouter>);
    await screen.findByRole('heading',{name:'Example Law'});
    fireEvent.click(screen.getByRole('button',{name:'Start test conversation'}));
    await screen.findByText('Test greeting');
    expect(screen.getByText('Test workspace · live SMS not active')).toBeInTheDocument();
    expect(screen.getByLabelText('Demo reply')).toBeInTheDocument();
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });
  it('requires confirmation before agent approval and disables connection requests for a draft',async()=>{
    render(<MemoryRouter><PiIntakeDashboard/></MemoryRouter>);
    await screen.findByRole('heading',{name:'Example Law'});
    fireEvent.click(screen.getByRole('button',{name:'Agent'}));
    expect(screen.getByRole('button',{name:'Approve agent'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Setup & usage'}));
    expect(screen.getByRole('button',{name:'Request hands-on connection help'})).toBeDisabled();
  });
  it('surfaces storage failures rather than displaying invented inbox data',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:'Intake storage unavailable'}),{status:503})));
    render(<MemoryRouter><PiIntakeDashboard/></MemoryRouter>);
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Intake storage unavailable'));
  });
});
