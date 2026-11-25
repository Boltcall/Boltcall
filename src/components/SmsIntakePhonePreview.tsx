import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, MessageCircle, RotateCcw, Signal, Wifi } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; text: string };
const maxTurns = 8;
const maxMessageLength = 500;
const phoneClock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const bubble = 'relative max-w-[88%] rounded-[1.15rem] px-3.5 py-2.5 text-[0.925rem] leading-snug [overflow-wrap:anywhere] after:pointer-events-none after:absolute after:bottom-0 after:h-2.5 after:w-2 after:bg-inherit';
const received = ' self-start rounded-bl-md bg-[#e9e9eb] text-slate-950 after:-left-1 after:[clip-path:polygon(0_100%,100%_18%,100%_100%)]';
const sent = ' self-end rounded-br-md bg-[#197a47] text-white after:-right-1 after:[clip-path:polygon(100%_100%,0_18%,0_100%)]';
const exampleMessage = 'I need help reviewing a commercial lease.';
const unavailableMessage = 'The AI couldn’t reply. Try sending your message again.';
const limitMessage = 'The preview has reached its message limit. Try again later.';

export default function SmsIntakePhonePreview({ firmName }: { firmName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const complete = messages.length >= maxTurns * 2;

  useEffect(() => () => {
    pending.current?.abort();
    pending.current = null;
  }, []);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, waiting]);

  async function send(value: string) {
    const text = value.trim();
    if (!text || complete || pending.current) return;

    const controller = new AbortController();
    pending.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    const next: Message[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setDraft('');
    setError('');
    input.current?.focus({ preventScroll: true });
    setWaiting(true);

    let failureMessage = unavailableMessage;
    try {
      const response = await fetch('/.netlify/functions/sms-intake-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmName, messages: next }),
        signal: controller.signal,
      });
      const data: { reply?: string } | null = await response.json().catch(() => null);
      if (pending.current !== controller) return;
      if (!response.ok || typeof data?.reply !== 'string' || !data.reply.trim()) {
        if (response.status === 429) failureMessage = limitMessage;
        throw new Error(failureMessage);
      }
      setMessages([...next, { role: 'assistant', text: data.reply }]);
    } catch {
      if (pending.current !== controller) return;
      setMessages(messages);
      setDraft(text);
      setError(failureMessage);
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) {
        pending.current = null;
        setWaiting(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function restart() {
    setMessages([]);
    setDraft('');
    setError('');
    input.current?.focus({ preventScroll: true });
  }

  return (
    <div className="relative isolate mx-auto w-full max-w-[29rem] px-2 py-2 [perspective:1150px] sm:px-6 sm:py-6 lg:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[6%] top-[4%] bg-[radial-gradient(ellipse_at_52%_42%,#dbeafe_0%,#eff6ff_41%,#fff0_73%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[4%] left-[20%] right-[6%] h-16 rotate-[-7deg] rounded-full bg-slate-900/25 blur-2xl sm:h-20" />
      <div
        role="region"
        aria-label="SMS conversation preview"
        className="relative mx-auto w-full max-w-[19rem] rounded-[2.7rem] border border-slate-700 bg-[linear-gradient(145deg,#a1adbe_0%,#455266_14%,#101722_43%,#202b3b_76%,#68798e_100%)] p-[7px] sm:max-w-[22rem]
          [box-shadow:inset_0_1px_2px_#f8fafcbb,inset_-1px_-2px_2px_#0009,0_24px_38px_-19px_#0f172a88]
          [transform-style:preserve-3d] [transform:rotateX(2deg)_rotateY(-4deg)_rotateZ(1.5deg)]
          sm:[transform:rotateX(5deg)_rotateY(-11deg)_rotateZ(3deg)] lg:[transform:rotateX(9deg)_rotateY(-19deg)_rotateZ(5deg)]
          before:pointer-events-none before:absolute before:-inset-px before:rounded-[2.65rem] before:border before:border-slate-700 before:bg-[linear-gradient(155deg,#283447,#101827_38%,#344257)] before:[transform:translateZ(-17px)]
          after:pointer-events-none after:absolute after:inset-y-10 after:right-0 after:w-[17px] after:origin-right after:rounded-l-md after:bg-[linear-gradient(90deg,#132030,#536379_44%,#283649)] after:[transform:rotateY(-90deg)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -left-[3px] top-[23%] grid gap-2 [transform:translateZ(-5px)]">
          <span className="h-6 w-[3px] rounded-l-sm bg-gradient-to-r from-slate-400 to-slate-800" />
          <span className="h-6 w-[3px] rounded-l-sm bg-gradient-to-r from-slate-400 to-slate-800" />
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute -right-[4px] top-[27%] h-12 w-[5px] rounded-r-md border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-400 [transform:translateZ(-5px)]" />
        <div className="relative flex h-[min(36.5rem,68svh)] min-h-[25rem] flex-col overflow-hidden rounded-[2.2rem] bg-white ring-1 ring-slate-950 [font-family:system-ui,sans-serif] [transform:translateZ(1px)] sm:h-[min(43rem,74svh)] sm:min-h-[30rem]">
          <div aria-hidden="true" className="relative flex h-11 shrink-0 items-center justify-between px-5 pt-1 text-slate-950">
            <span className="text-[0.82rem] font-semibold tabular-nums">{phoneClock.format(new Date())}</span>
            <div className="absolute left-1/2 top-2.5 flex h-5 w-[5.1rem] -translate-x-1/2 items-center justify-end rounded-full bg-[#080a0d] pr-2 shadow-[inset_0_1px_3px_#ffffff20]">
              <span className="size-1.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#6885c1_0%,#263755_34%,#0b1425_74%)]" />
            </div>
            <div className="flex items-center gap-[3px]">
              <Signal className="size-3" strokeWidth={2.4} />
              <Wifi className="size-3" strokeWidth={2.4} />
              <span className="relative block h-[9px] w-[16px] rounded-[2px] border border-slate-700 p-px after:absolute after:left-full after:top-[2px] after:h-[3px] after:w-[2px] after:rounded-r-sm after:bg-slate-700">
                <span className="block h-full w-[85%] rounded-[1px] bg-slate-950" />
              </span>
            </div>
          </div>
          <header className="relative flex shrink-0 flex-col items-center border-b border-slate-200 px-12 pb-2.5 pt-1 text-center">
            <span className="mb-1 grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
              <MessageCircle className="size-4" aria-hidden="true" />
            </span>
            <p className="max-w-full truncate text-sm font-semibold leading-tight text-slate-950">{firmName}</p>
            <p className="mt-0.5 text-[0.7rem] leading-tight text-slate-600">AI intake assistant</p>
            {messages.length > 0 && (
              <button type="button" disabled={waiting} onClick={restart}
                className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-blue-600 disabled:opacity-40"
                aria-label="Start a new conversation" title="Start a new conversation">
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            )}
          </header>

          <div ref={log} role="log" aria-label="SMS messages" tabIndex={0}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-white p-3.5 [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600">
            <p className={bubble + received}>
              Hi, welcome to {firmName}’s intake preview. What can I help you with today?
            </p>
            {messages.map(({ role, text }, index) => (
              <p key={index} className={bubble + (role === 'user' ? sent : received)}>
                <span className="sr-only">{role === 'user' ? 'You: ' : 'Assistant: '}</span>
                {text}
              </p>
            ))}
            {waiting && <p role="status" className="px-1.5 text-xs text-slate-600">Assistant is typing…</p>}
            {!messages.length && !error && (
              <button type="button" onClick={() => void send(exampleMessage)}
                className="mt-1 self-start rounded-full border border-blue-200 bg-white px-3 py-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-blue-600">
                {exampleMessage}
              </button>
            )}
          </div>

          <form className="shrink-0 bg-white px-3 pb-1.5 pt-2" onSubmit={submit}>
            {error && <p role="alert" className="mb-2 px-1 text-xs leading-relaxed text-red-700">{error}</p>}
            {complete ? (
              <button type="button" onClick={restart}
                className="min-h-11 w-full rounded-full border border-slate-300 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-blue-600">
                Start a new conversation
              </button>
            ) : (
              <div className="relative">
                <label htmlFor="sms-preview-message" className="sr-only">Your message</label>
                <input ref={input} id="sms-preview-message" value={draft} onChange={event => setDraft(event.currentTarget.value)}
                  className="min-h-11 w-full rounded-[1.4rem] border border-slate-300 pl-3.5 pr-11 text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  maxLength={maxMessageLength} autoComplete="off" placeholder="Text message" readOnly={waiting} />
                <button type="submit" aria-label="Send message" disabled={waiting || !draft.trim()}
                  className="group absolute inset-y-0 right-0 grid w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-default">
                  <span className="grid size-7 place-items-center rounded-full bg-[#197a47] text-white group-hover:bg-[#14633a] group-disabled:bg-slate-300 group-disabled:text-slate-600">
                    <ArrowUp className="size-[1.05rem]" strokeWidth={2.75} aria-hidden="true" />
                  </span>
                </button>
              </div>
            )}
          </form>
          <div aria-hidden="true" className="flex shrink-0 justify-center bg-white pb-2.5 pt-1">
            <div className="h-1 w-[6.4rem] rounded-full bg-slate-950" />
          </div>
        </div>
      </div>
    </div>
  );
}