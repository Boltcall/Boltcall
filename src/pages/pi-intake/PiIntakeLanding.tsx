import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquare, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { savePendingAuthRedirect } from '../../lib/authRedirect';
import { updateMetaDescription } from '../../lib/utils';

export default function PiIntakeLanding() {
  const [website,setWebsite]=useState('');
  const navigate=useNavigate();
  useEffect(()=>{document.title='Free PI SMS Intake Agent | Boltcall';updateMetaDescription('Build a customized SMS intake assistant for your personal injury law firm. Test your agent, review intake questions, and request a verified website form connection.');},[]);
  function start(event:React.FormEvent){
    event.preventDefault();
    const target=`/pi-intake?website=${encodeURIComponent(website.trim())}`;
    savePendingAuthRedirect(target);
    navigate(target);
  }
  return <main className="min-h-screen bg-white text-gray-900" dir="ltr">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 border-b border-gray-100">
      <Link to="/" className="text-xl font-bold tracking-tight">boltcall<span className="text-gray-400"> / PI intake</span></Link>
      <Link to="/pi-intake" className="text-sm font-medium underline underline-offset-4">Open your dashboard</Link>
    </header>
    <section className="mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
      <div>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-gray-500">Built for personal injury firms</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Your next inquiry.<br/>A faster first response.</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">Build your firm’s personalized SMS intake assistant from your website. Test it, approve it, and get help connecting your form.</p>
        <p className="mt-5 font-semibold">10 new lead conversations free each month. No card required.</p>
        <form onSubmit={start} className="mt-8 space-y-5">
          <Input id="pi-website" label="Your firm’s website" type="url" required value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourfirm.com" />
          <Button type="submit" className="w-full rounded-xl border-0 bg-blue-600 text-white shadow-none hover:bg-blue-700 hover:translate-x-0 hover:translate-y-0" size="lg">Build my free intake agent <ArrowRight className="h-4 w-4"/></Button>
          <p className="text-xs leading-relaxed text-gray-500">A free account keeps your agent and inbox private. Live SMS requires firm approval, a verified sending number, and an approved form integration.</p>
        </form>
      </div>
      <div className="self-center rounded-2xl border border-gray-200 p-7 sm:p-9">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-5"><MessageSquare className="h-5 w-5"/><div><p className="font-semibold">An intake team’s new starting point</p><p className="text-xs text-gray-500">Illustrative demo · no SMS sent</p></div></div>
        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <p className="rounded-xl border border-gray-200 p-4">Hi, this is the automated intake assistant for your firm. This isn’t legal advice or confirmation of representation. What is your name, and who else was involved?</p>
          <p className="ml-10 rounded-xl border border-gray-200 p-4">Alex. The other driver’s name is Jordan.</p>
          <p className="rounded-xl border border-gray-200 p-4">What type of incident are you contacting the firm about? Please keep it brief and don’t send sensitive documents.</p>
        </div>
        <div className="mt-7 border-t border-gray-100 pt-5"><p className="text-xs uppercase tracking-widest text-gray-500">What your team receives</p><p className="mt-2 font-medium">An organized intake. A clear next action.</p><p className="mt-2 text-sm text-gray-600">The conversation, basic intake details, and unanswered questions—ready for a human to review.</p></div>
      </div>
    </section>
    <section className="mx-auto grid max-w-6xl gap-8 border-t border-gray-100 px-6 py-12 md:grid-cols-3">
      {[[Globe,'Built from your website','Review source-backed firm details and edit the intake questions.'],[MessageSquare,'Test before going live','Run a free guided intake demo without using your monthly lead allowance.'],[ShieldCheck,'Your team stays in control','Legal questions go to staff. Pause automation or take over a conversation.']].map(([Icon,title,text])=>{const Component=Icon as typeof Globe;return <div key={String(title)}><Component className="mb-4 h-5 w-5"/><h2 className="font-semibold">{String(title)}</h2><p className="mt-2 text-sm leading-relaxed text-gray-600">{String(text)}</p></div>;})}
    </section>
    <section className="mx-auto max-w-6xl border-t border-gray-100 px-6 py-12"><h2 className="text-xl font-semibold">Start with a clearer picture of your intake.</h2><Link className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white" to="/ai-revenue-calculator">See your revenue potential</Link></section>
    <footer className="mx-auto flex max-w-6xl flex-wrap gap-5 px-6 py-8 text-xs text-gray-500"><Link to="/privacy-policy">Privacy</Link><Link to="/terms-of-service">Terms</Link><Link to="/law-firm-security">Security</Link><span>Guided intake assistance. Not legal advice.</span></footer>
  </main>;
}
