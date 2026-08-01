import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, Loader2 } from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Input } from '../components/ui/input';
import SiriOrb from '../components/ui/siri-orb';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

const ResponseTimeTest: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    document.title = 'See How Fast Boltcall Answers — Free Response-Time Test | Boltcall';
    updateMetaDescription('Enter your number and email — Boltcall calls you back right now, times how fast it answers, and emails you the result. See instant response in action.');
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestState('loading');
    setMessage('');

    try {
      const response = await fetch('/.netlify/functions/response-time-demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string' ? payload.error : 'Could not start the test call.',
        );
      }

      setRequestState('success');
      setMessage(`Calling ${payload.phone || phone} now — answer to see how fast we respond. We'll email the result to ${email}.`);
    } catch (error) {
      setRequestState('error');
      setMessage(error instanceof Error ? error.message : 'Could not start the test call.');
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <div className="relative z-10 pt-32">
        <Header />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <SiriOrb
                size="120px"
                animationDuration={18}
                colors={{
                  c1: 'oklch(79% 0.12 343)',
                  c2: 'oklch(81% 0.11 236)',
                  c3: 'oklch(73% 0.15 274)',
                }}
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              See how fast Boltcall answers
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Enter your number — we'll call you back right now and email you exactly how many seconds it took.
              The first business to respond usually wins the job. This is what instant looks like.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto space-y-5 bg-[#f6f8fc] border border-[#d8dce7] rounded-2xl p-8"
          >
            <Input
              type="tel"
              label="Your phone number (e.g. +15551234567)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
              disabled={requestState === 'loading'}
              inputClassName="border-[#13233f] pb-1 pt-2 text-[17px] font-normal tracking-[-0.04em] text-[#13233f]"
            />
            <Input
              type="email"
              label="Email — we'll send the result here"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={requestState === 'loading'}
              inputClassName="border-[#13233f] pb-1 pt-2 text-[17px] font-normal tracking-[-0.04em] text-[#13233f]"
            />
            <button
              type="submit"
              disabled={requestState === 'loading'}
              className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#091c46] px-5 text-[15px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {requestState === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calling you now...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Call me now
                </>
              )}
            </button>
            {message ? (
              <p
                className={`text-sm leading-6 text-center ${
                  requestState === 'error' ? 'text-[#b42318]' : 'text-[#51607b]'
                }`}
              >
                {message}
              </p>
            ) : null}
            <p className="text-xs text-gray-400 text-center">
              By submitting, you agree to receive one automated test call and a follow-up email at the number and address you provided.
            </p>
          </motion.form>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default ResponseTimeTest;
