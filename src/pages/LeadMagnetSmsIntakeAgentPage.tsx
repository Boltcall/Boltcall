import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import SmsIntakePhonePreview from '@/components/SmsIntakePhonePreview';
import { Button } from '@/components/ui/Button';
import { updateMetaDescription } from '@/lib/utils';

interface BusinessDetails {
  name: string;
  website: string;
}

const storageKey = 'boltcall-sms-intake-business';
const emptyDetails: BusinessDetails = { name: '', website: '' };
const fieldClass = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20';

function loadDetails(): BusinessDetails {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
    if (typeof saved?.name === 'string' && typeof saved?.website === 'string') {
      return { name: saved.name, website: saved.website };
    }
  } catch {
    // The form is still available when site storage is disabled.
  }
  return emptyDetails;
}

export default function LeadMagnetSmsIntakeAgentPage() {
  const [details, setDetails] = useState(loadDetails);
  const [preview, setPreview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);

  useEffect(() => {
    document.title = 'AI SMS Intake Preview for Law Firms | Boltcall';
    updateMetaDescription('Add your firm details and chat with an AI intake assistant in a phone-style SMS preview. Try a fictional inquiry and see how the assistant responds.');
  }, []);

  useEffect(() => {
    if (!focusOnChange.current) return;
    focusOnChange.current = false;
    heading.current?.focus();
  }, [preview]);

  function updateDetail(field: keyof BusinessDetails, value: string) {
    setDetails(previous => ({ ...previous, [field]: value }));
  }

  function openPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = { name: details.name.trim(), website: details.website.trim() };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cleaned));
    } catch {
      // Storage is optional for a preview in this visit.
    }
    setDetails(cleaned);
    focusOnChange.current = true;
    setPreview(true);
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950">
      <Header />
      <main id="main-content" className={'mx-auto px-5 pb-12 pt-[6.75rem] sm:px-8 sm:pt-28 lg:pb-16 lg:pt-32 ' + (preview ? 'max-w-5xl' : 'max-w-xl')}>
        {preview ? (
          <button type="button" onClick={() => { focusOnChange.current = true; setPreview(false); }}
            className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-blue-600">
            <ArrowLeft className="size-4" aria-hidden="true" /> Business details
          </button>
        ) : (
          <Link to="/lead-magnet" className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-blue-600">
            <ArrowLeft className="size-4" aria-hidden="true" /> Free tools
          </Link>
        )}

        {preview ? (
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,25rem)] lg:gap-12">
            <div className="mx-auto w-full max-w-[25rem] lg:mx-0">
              <h1 ref={heading} tabIndex={-1} className="scroll-mt-24 text-3xl font-semibold tracking-tight focus:outline-none sm:text-4xl lg:text-5xl">
                SMS preview
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 sm:text-base">
                Try a fictional inquiry and see how the AI intake assistant replies. Keep real case details out of the chat.
              </p>
            </div>
            <SmsIntakePhonePreview firmName={details.name} />
          </div>
        ) : (
          <form onSubmit={openPreview} aria-labelledby="sms-business-title"
            className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_15px_55px_-30px_rgba(15,23,42,0.28)] sm:p-7">
            <h1 id="sms-business-title" ref={heading} tabIndex={-1} className="scroll-mt-24 text-2xl font-semibold tracking-tight text-slate-950 focus:outline-none sm:text-[1.75rem]">
              Business details
            </h1>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-800">
                Firm name
                <input required pattern=".*\S.*" maxLength={100} value={details.name} autoComplete="organization"
                  onChange={event => updateDetail('name', event.currentTarget.value)} className={fieldClass} placeholder="Your law firm" />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Public website <span className="font-normal text-slate-600">(optional)</span>
                <input type="url" pattern="https?://.+" maxLength={250} value={details.website} autoComplete="url"
                  onChange={event => updateDetail('website', event.currentTarget.value)} className={fieldClass} placeholder="https://yourfirm.com" />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="noShadow" className="min-h-11 rounded-xl border-0 bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 focus-visible:ring-blue-600">
                Open SMS preview <ArrowRight aria-hidden="true" />
              </Button>
              <p className="text-xs leading-relaxed text-slate-600">Your website stays in this browser.</p>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}