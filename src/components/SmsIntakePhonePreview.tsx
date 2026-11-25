import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, MessageCircle, RotateCcw } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; text: string };
const maxTurns = 8;
const maxMessageLength = 500;
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
    <div role="region" aria-label="SMS conversation preview" className="mx-auto w-full max-w-[25rem] rounded-[2.6rem] border border-slate-700 bg-slate-950 p-2 shadow-[0_22px_60px_-24px_rgba(15,23,42,0.55)]">
      <div className="flex h-[min(37rem,77svh)] min-h-[28rem] flex-col overflow-hidden rounded-[2.1rem] bg-white">
        <div aria-hidden="true" className="flex shrink-0 justify-center pb-2 pt-3">
          <div className="h-[0.45rem] w-16 rounded-full bg-slate-900" />
        </div>
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 pb-3 pt-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
            <MessageCircle className="size-[1.125rem]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-950">{firmName}</p>
            <p className="text-xs text-slate-600">AI intake assistant</p>
          </div>
          {messages.length > 0 && (
            <button type="button" disabled={waiting} onClick={restart}
              className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-blue-600 disabled:opacity-40"
              aria-label="Start a new conversation" title="Start a new conversation">
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          )}
        </header>

        <div ref={log} role="log" aria-label="SMS messages" tabIndex={0}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[#f6f8fb] p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600">
          <p className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 [overflow-wrap:anywhere]">
            Hi, welcome to {firmName}’s intake preview. What can I help you with today?
          </p>
          {messages.map(({ role, text }, index) => (
            <p key={index} className={'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] '
              + (role === 'user' ? 'self-end rounded-br-md bg-blue-600 text-white' : 'self-start rounded-bl-md border border-slate-200 bg-white text-slate-900')}>
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

        <form className="shrink-0 border-t border-slate-200 bg-white p-3" onSubmit={submit}>
          {error && <p role="alert" className="mb-2 px-1 text-xs leading-relaxed text-red-700">{error}</p>}
          {complete ? (
            <button type="button" onClick={restart}
              className="min-h-11 w-full rounded-full border border-slate-300 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-blue-600">
              Start a new conversation
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="sms-preview-message" className="sr-only">Your message</label>
              <input ref={input} id="sms-preview-message" value={draft} onChange={event => setDraft(event.currentTarget.value)}
                className="min-h-11 min-w-0 flex-1 rounded-full border border-slate-300 px-3.5 text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                maxLength={maxMessageLength} autoComplete="off" placeholder="Type a message" readOnly={waiting} />
              <button type="submit" aria-label="Send message" disabled={waiting || !draft.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:bg-blue-300">
                <ArrowUp className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </form>
        <div aria-hidden="true" className="flex shrink-0 justify-center bg-white pb-2 pt-0.5">
          <div className="h-1 w-20 rounded-full bg-slate-900" />
        </div>
      </div>
    </div>
  );
}