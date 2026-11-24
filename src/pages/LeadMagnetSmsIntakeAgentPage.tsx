import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Download, LockKeyhole, MessageSquare, RotateCcw, Send } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import {
  buildSmsIntakeConfig, createSmsIntakeAgent, sampleSmsSettings, smsGoalLabels,
  type SmsHandoff, type SmsIntakeGoal, type SmsIntakeSettings,
} from '@/lib/smsIntakeDemo';
import { updateMetaDescription } from '@/lib/utils';

const steps = ['Business', 'Agent goal', 'Workflow', 'Delivery'] as const;

const fieldClass = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20';
const primaryClass = 'min-h-11 rounded-xl border-0 bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 focus-visible:ring-blue-600';
const secondaryClass = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-600';

const goalOptions: { id: SmsIntakeGoal; description: string }[] = [
  { id: 'qualify', description: 'Ask what they need help with and collect a callback window.' },
  { id: 'callback', description: 'Collect a name and callback window for your team.' },
];

function ConversationPreview() {
  return (
    <div className="max-w-md rounded-2xl border border-slate-200 bg-slate-50/75 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700">
          <MessageSquare className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Alder Intake Law</p>
          <p className="text-xs text-slate-600">Sample conversation</p>
        </div>
      </div>
      <div className="space-y-2.5 text-sm leading-relaxed">
        <p className="ml-5 w-fit justify-self-end rounded-2xl rounded-br-sm border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800">
          Hi, I need someone to review an employment agreement.
        </p>
        <p className="mr-5 w-fit rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 text-slate-800">
          Thanks for texting Alder Intake Law. I’m the automated intake assistant. What’s your first name?
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2.5 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">
        <Check className="size-4 shrink-0 text-slate-700" aria-hidden="true" />
        Your team gets the inquiry and a callback window.
      </div>
    </div>
  );
}

function HandoffSummary({ handoff }: { handoff: SmsHandoff }) {
  const rows = [
    ['Recipient', handoff.recipient],
    ['Reason', handoff.reason],
    ['First name', handoff.firstName],
    ['Inquiry', handoff.topic],
    ['Callback window', handoff.callbackWindow],
    ['SMS opt-out', handoff.optedOut ? 'Yes' : 'No'],
  ] as const;

  return (
    <section aria-labelledby="sms-handoff-title" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 id="sms-handoff-title" className="text-sm font-semibold text-slate-950">Simulated staff handoff</h3>
      <dl className="mt-2 grid grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs leading-relaxed sm:text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-medium text-slate-700">{label}</dt>
            <dd className="break-words text-slate-800">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type SmsMessage = { speaker: 'Prospect' | 'Agent'; text: string };

function SmsSimulator({ settings, onEdit }: { settings: SmsIntakeSettings; onEdit: () => void }) {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [engine, setEngine] = useState(() => createSmsIntakeAgent(settings));
  const messageId = useRef(0);
  const composer = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const configured = buildSmsIntakeConfig(settings);
  const handoff = engine.handoff();

  useEffect(() => { composer.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages]);

  function sendTexts(texts: string[]) {
    const next: SmsMessage[] = [];
    for (const text of texts) {
      next.push({ speaker: 'Prospect', text });
      const reply = engine.receive(++messageId.current, text);
      if (reply) next.push({ speaker: 'Agent', text: reply });
    }
    setMessages(previous => [...previous, ...next]);
    setDraft('');
    composer.current?.focus({ preventScroll: true });
  }

  function tryExample() {
    const texts = ['Hi, I’d like to speak with your firm.', 'Sam'];
    if (settings.goal === 'qualify') texts.push('I’d like someone to review an agreement.');
    texts.push('Tuesday after 2');
    sendTexts(texts);
  }

  function reset() {
    setEngine(createSmsIntakeAgent(settings));
    messageId.current = 0;
    setMessages([]);
    setDraft('');
    composer.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">SMS simulator</h2>
          <p className="mt-1 break-words text-sm text-slate-600">{settings.business}</p>
        </div>
        <span role="status" className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {engine.status()}
        </span>
      </div>
      <div ref={transcript} role="log" aria-label="Simulated SMS conversation" tabIndex={0}
        className="mt-4 flex min-h-32 max-h-64 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 focus-visible:outline-blue-600">
        {!messages.length && <p className="my-auto text-sm text-slate-600">Enter a sample text to start, or run the example below.</p>}
        {messages.map(({ speaker, text }, index) => (
          <div key={index} className={'max-w-[90%] rounded-xl px-3 py-2 [overflow-wrap:anywhere] '
            + (speaker === 'Prospect' ? 'self-end bg-slate-200' : 'self-start border border-slate-200 bg-white')}>
            <p className="text-[11px] font-medium text-slate-600">{speaker}</p>
            <p className="text-sm leading-relaxed text-slate-900">{text}</p>
          </div>
        ))}
      </div>
      <form className="mt-3 flex items-end gap-2" onSubmit={event => {
        event.preventDefault();
        if (draft.trim()) sendTexts([draft.trim()]);
      }}>
        <label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
          Incoming text
          <input ref={composer} className={fieldClass} value={draft} onChange={event => setDraft(event.target.value)}
            required maxLength={320} autoComplete="off" placeholder="Hi, I have a question." />
        </label>
        <Button type="submit" variant="noShadow" aria-label="Send test text" className={primaryClass + ' h-12'}>
          <Send aria-hidden="true" className="size-4" />
        </Button>
      </form>
      {handoff && <HandoffSummary handoff={handoff} />}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {messages.length ? (
          <Button type="button" variant="neutral" className={secondaryClass} onClick={reset}><RotateCcw aria-hidden="true" /> Reset</Button>
        ) : (
          <Button type="button" variant="neutral" className={secondaryClass} onClick={tryExample}>Run sample conversation</Button>
        )}
        <Button type="button" variant="neutral" className={secondaryClass} onClick={onEdit}>Edit setup</Button>
        <Button asChild variant="neutral" className={secondaryClass}>
          <a download="sms-intake-agent.json" href={'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(configured, null, 2))}>
            <Download aria-hidden="true" /> Download config
          </a>
        </Button>
      </div>
    </>
  );
}

export default function LeadMagnetSmsIntakeAgentPage() {
  const [settings, setSettings] = useState<SmsIntakeSettings>({ ...sampleSmsSettings, business: '', services: '', team: '' });
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusNextStep = useRef(false);
  const [sampleConsent, setSampleConsent] = useState(false);

  useEffect(() => {
    document.title = 'Free SMS Intake Agent Demo for Law Firms | Boltcall';
    updateMetaDescription('Set up and test a personalized SMS intake workflow for your law firm. Try sample conversations, staff handoff and opt-out in your browser.');
  }, []);

  useEffect(() => {
    if (!ready && focusNextStep.current) {
      focusNextStep.current = false;
      stepHeading.current?.focus();
    }
  }, [step, ready]);

  function setField<K extends keyof SmsIntakeSettings>(name: K, value: SmsIntakeSettings[K]) {
    setSettings(previous => ({ ...previous, [name]: value }));
  }

  function goToStep(next: number) {
    focusNextStep.current = true;
    setStep(next);
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      goToStep(step + 1);
      return;
    }
    setReady(true);
  }

  const demoSettings = {
    ...settings,
    business: settings.business.trim(),
    website: settings.website.trim(),
    services: settings.goal === 'qualify' ? settings.services.trim() : '',
    team: settings.team.trim(),
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950">
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 pb-12 pt-[6.75rem] sm:px-8 sm:pt-28 lg:pb-16 lg:pt-32">
        <Link to="/lead-magnet" className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-blue-600 sm:mb-7">
          <ArrowLeft className="size-4" aria-hidden="true" /> Free tools
        </Link>
        <div className="grid items-start gap-y-7 lg:grid-cols-[1fr_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-5">
          <div>
            <p className="mb-2.5 text-sm font-semibold text-slate-600">Free demo for law firms</p>
            <h1 className="max-w-lg text-[clamp(2rem,5.5vw,3.8rem)] font-semibold leading-[1.07] tracking-[-0.055em] text-slate-950">
              Build an SMS intake agent for your firm
            </h1>
            <p className="mt-3.5 max-w-md text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
              Choose what your agent should ask, try an inbound text, and see the handoff your team would receive.
            </p>
          </div>

          <section aria-label={ready ? 'Your SMS agent demo' : 'Set up your SMS agent'}
            className="min-w-0 rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_15px_55px_-30px_rgba(15,23,42,0.28)] sm:p-6 lg:row-span-2">
            {ready ? <SmsSimulator settings={demoSettings} onEdit={() => { goToStep(0); setReady(false); }} /> : (
              <form onSubmit={advance} aria-labelledby="sms-step-title">
                <ol aria-label="Setup steps" className="mb-5 grid grid-cols-4 gap-1.5 sm:gap-2.5">
                  {steps.map((label, index) => (
                    <li key={label} aria-current={index === step ? 'step' : undefined}
                      className={'min-w-0 border-t-[3px] pt-2 text-[0.675rem] font-medium sm:text-xs '
                        + (index <= step ? 'border-blue-600 text-slate-950' : 'border-slate-200 text-slate-600')}>
                      {label}
                    </li>
                  ))}
                </ol>

                <h2 id="sms-step-title" ref={stepHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold tracking-tight text-slate-950 focus:outline-none">
                  {['Tell us about your firm', 'Choose an agent goal', 'Set up your handoff', 'Review and launch'][step]}
                </h2>
                {step === 0 && (
                  <div className="mt-4 space-y-3.5">
                    <label className="block text-sm font-medium text-slate-800">
                      Firm name
                      <input className={fieldClass} required pattern=".*\S.*" maxLength={100} value={settings.business}
                        onChange={event => setField('business', event.target.value)} placeholder="Your law firm" autoComplete="organization" />
                    </label>
                    <label className="block text-sm font-medium text-slate-800">
                      Public website <span className="font-normal text-slate-600">(optional)</span>
                      <input className={fieldClass} type="url" pattern="https?://.+" maxLength={250} value={settings.website}
                        onChange={event => setField('website', event.target.value)} placeholder="https://yourfirm.com" autoComplete="url" />
                    </label>
                  </div>
                )}
                {step === 1 && (
                  <fieldset className="mt-4 space-y-2.5">
                    <legend className="sr-only">Agent goal</legend>
                    {goalOptions.map(({ id, description }) => (
                      <label key={id} className={'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 '
                        + (settings.goal === id ? 'border-blue-600 bg-slate-50' : 'border-slate-200 hover:border-slate-400')}>
                        <input type="radio" name="sms-goal" value={id} checked={settings.goal === id} onChange={() => setField('goal', id)}
                          className="mt-0.5 size-4 shrink-0 accent-blue-600 focus-visible:outline-blue-600" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{smsGoalLabels[id]}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-600 sm:text-sm">{description}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {step === 2 && (
                  <div className="mt-4 space-y-3.5">
                    {settings.goal === 'qualify' && (
                      <label className="block text-sm font-medium text-slate-800">
                        What types of matters do you handle?
                        <input className={fieldClass} required pattern=".*\S.*" maxLength={160} value={settings.services}
                          onChange={event => setField('services', event.target.value)} placeholder="Employment and small-business matters" />
                      </label>
                    )}
                    <label className="block text-sm font-medium text-slate-800">
                      Which team receives handoffs?
                      <input className={fieldClass} required pattern=".*\S.*" maxLength={80} value={settings.team}
                        onChange={event => setField('team', event.target.value)} placeholder="Intake team" />
                    </label>
                  </div>
                )}
                {step === 3 && (
                  <div className="mt-4 space-y-3.5">
                    <dl className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)] gap-x-2 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
                      <dt className="text-slate-600">Firm</dt><dd className="break-words font-medium">{settings.business}</dd>
                      <dt className="text-slate-600">Goal</dt><dd className="font-medium">{smsGoalLabels[settings.goal]}</dd>
                      <dt className="text-slate-600">Handoff</dt><dd className="break-words font-medium">{settings.team}</dd>
                    </dl>
                    <label className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                      <input type="checkbox" required checked={sampleConsent} onChange={event => setSampleConsent(event.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-blue-600 focus-visible:outline-blue-600" />
                      I’ll use sample prospect details in the simulator.
                    </label>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {step === 0 ? (
                    <Button type="button" variant="neutral" className={secondaryClass} onClick={() => setSettings({ ...sampleSmsSettings })}>Use sample firm</Button>
                  ) : (
                    <Button type="button" variant="neutral" className={secondaryClass} onClick={() => goToStep(step - 1)}>
                      <ArrowLeft aria-hidden="true" /> Back
                    </Button>
                  )}
                  <Button type="submit" variant="noShadow" className={primaryClass + ' ml-auto'}>
                    {step === 3 ? 'Build demo agent' : 'Next'} <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              </form>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Settings and test texts stay in this browser. Replies and handoffs are simulated.
            </p>
          </section>
          <ConversationPreview />
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 sm:mt-12">
          <p className="text-sm text-slate-700">What could a faster first response be worth to your firm?</p>
          <Link to="/ai-revenue-calculator" className="inline-flex min-h-10 items-center gap-1.5 rounded text-sm font-semibold text-slate-800 underline-offset-4 hover:underline focus-visible:outline-blue-600">
            See your revenue potential <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}