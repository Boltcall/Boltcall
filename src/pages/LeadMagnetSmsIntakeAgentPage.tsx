import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
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
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    document.title = 'SMS Intake Business Details | Boltcall';
    updateMetaDescription('Save your law firm’s name and optional website for SMS intake setup. Your details stay in this browser.');
  }, []);

  function updateDetail(field: keyof BusinessDetails, value: string) {
    setDetails(previous => ({ ...previous, [field]: value }));
    setStatus(null);
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = { name: details.name.trim(), website: details.website.trim() };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cleaned));
      setDetails(cleaned);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950">
      <Header />
      <main id="main-content" className="mx-auto max-w-xl px-5 pb-12 pt-[6.75rem] sm:px-8 sm:pt-28 lg:pb-16 lg:pt-32">
        <Link to="/lead-magnet" className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-blue-600">
          <ArrowLeft className="size-4" aria-hidden="true" /> Free tools
        </Link>
        <form onSubmit={saveDetails} aria-labelledby="sms-business-title"
          className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_15px_55px_-30px_rgba(15,23,42,0.28)] sm:p-7">
          <h1 id="sms-business-title" className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">
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
              Save details
            </Button>
            <p role="status" className="text-xs leading-relaxed text-slate-600">
              {status === 'saved' ? 'Details saved in this browser.' : status === 'error'
                ? 'Browser storage is unavailable.' : 'Your details stay in this browser.'}
            </p>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}