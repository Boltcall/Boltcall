import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Phone, TrendingDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateMetaDescription } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CAL_BOOKING_URL = 'https://cal.com/boltcall';

interface AuditPayload {
  vertical: string;
  result_label: string;
  result_number: number;
  basis?: string;
}

interface AuditSession {
  id: string;
  business_name: string | null;
  vertical: string;
  audit_payload: AuditPayload;
  booked_at: string | null;
}

const VERTICAL_HEADLINE: Record<string, string> = {
  law: 'Every missed intake call is a client who signs with the firm that answered first.',
  plumber: 'Every after-hours call that hits voicemail is a job your competitor books instead.',
  hvac: 'Every after-hours call that hits voicemail is a job your competitor books instead.',
  roofer: 'Every missed lead is a roof your competitor bids on instead.',
  dentist: 'Every missed booking is a chair sitting empty that should be filled.',
  medspa: 'Every missed rebooking is revenue that just walked out the door.',
};

const AuditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<AuditSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    updateMetaDescription('Your personalized Boltcall speed-to-lead audit.');
  }, []);

  useEffect(() => {
    if (!id) { setStatus('not_found'); return; }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('audit_sessions')
        .select('id, business_name, vertical, audit_payload, booked_at')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setStatus('not_found'); return; }

      setSession(data as AuditSession);
      setBooked(Boolean(data.booked_at));
      setStatus('ready');

      // Mark viewed (best-effort, first view only matters for the metric).
      supabase.from('audit_sessions').update({ viewed_at: new Date().toISOString() }).eq('id', id).then(() => {});
    })();

    return () => { cancelled = true; };
  }, [id]);

  const handleBook = async () => {
    if (id) {
      await supabase.from('audit_sessions').update({ booked_at: new Date().toISOString() }).eq('id', id);
      setBooked(true);
    }
    window.open(CAL_BOOKING_URL, '_blank', 'noopener,noreferrer');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (status === 'not_found' || !session) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold mb-3">This audit link has expired or was not found.</h1>
          <p className="text-white/60">Book a call and we will run a fresh one for you.</p>
          <a href={CAL_BOOKING_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-6 px-6 py-3 rounded-full bg-white text-black font-medium">
            Book a call
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  const { business_name, vertical, audit_payload } = session;
  const headline = VERTICAL_HEADLINE[vertical] || VERTICAL_HEADLINE.plumber;
  const resultValue = audit_payload.result_number.toLocaleString('en-US');
  const isDollar = audit_payload.result_label.toLowerCase().includes('revenue');

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-white/50 text-sm uppercase tracking-wide mb-3">
          {business_name ? `Audit for ${business_name}` : 'Your speed to lead audit'}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-8">{headline}</h1>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 mb-8">
          <div className="flex items-center gap-3 mb-2 text-red-400">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wide">Your estimated result</span>
          </div>
          <p className="text-4xl font-bold">
            {isDollar ? `$${resultValue}` : resultValue}
          </p>
          <p className="text-white/60 mt-1">{audit_payload.result_label}</p>
          <p className="text-white/40 text-xs mt-4">
            Estimate based on typical after-hours call volume for your industry. A live audit gives you the
            exact number for your business.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 mb-10">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wide">How Boltcall fixes it</span>
          </div>
          <p className="text-white/80">
            Boltcall answers every inbound call and message instantly, day or night, and books the job before
            your competitor calls back. Every lead responded to, every opportunity booked.
          </p>
        </div>

        <button
          onClick={handleBook}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium text-lg"
        >
          <Phone className="w-5 h-5" />
          {booked ? 'Call booked -- open scheduler again' : 'Book a free call to fix this'}
        </button>
      </div>
      <Footer />
    </div>
  );
};

export default AuditPage;
