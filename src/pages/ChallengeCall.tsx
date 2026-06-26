import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Clock, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

type CallStep = 'idle' | 'connecting' | 'active' | 'ended' | 'submitting' | 'wrong' | 'locked';

const CHALLENGE_DURATION = 60; // seconds
const LOCKED_CHALLENGE_CODES = new Set([
  'challenge_email_already_used',
  'challenge_ip_already_used',
]);

const ChallengeCall: React.FC = () => {
  const navigate = useNavigate();

  // Restore participant info from the entry form
  const name = sessionStorage.getItem('challenge_name') || '';
  const email = sessionStorage.getItem('challenge_email') || '';

  const [step, setStep] = useState<CallStep>('idle');
  const [timer, setTimer] = useState(CHALLENGE_DURATION);
  const [word, setWord] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [callError, setCallError] = useState('');

  const retellClientRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect back if someone lands here without going through the entry form
  useEffect(() => {
    if (!name || !email) {
      navigate('/challenge', { replace: true });
    }
  }, [name, email, navigate]);

  // Countdown timer — starts when call goes active
  useEffect(() => {
    if (step === 'active') {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            endCall();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const endCall = useCallback(() => {
    if (retellClientRef.current) {
      try { retellClientRef.current.stopCall(); } catch { /* already ended */ }
      retellClientRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStep('ended');
  }, []);

  const startCall = async () => {
    setCallError('');
    setStep('connecting');

    try {
      const res = await fetch('/.netlify/functions/challenge-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = err?.error || 'Could not start the call.';
        if (LOCKED_CHALLENGE_CODES.has(err?.code)) {
          setCallError(message);
          setStep('locked');
          return;
        }
        throw new Error(message);
      }

      const { access_token, challenge_token } = await res.json();
      sessionStorage.setItem('challenge_token', challenge_token);

      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      retellClientRef.current = client;

      client.on('call_started', () => {
        setStep('active');
        setTimer(CHALLENGE_DURATION);
      });

      client.on('call_ended', () => {
        if (timerRef.current) clearInterval(timerRef.current);
        retellClientRef.current = null;
        setStep('ended');
      });

      client.on('error', (error: any) => {
        console.error('Retell error:', error);
        retellClientRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        setCallError('The challenge call could not continue.');
        setStep('idle');
      });

      await client.startCall({ accessToken: access_token });
    } catch (err: any) {
      console.error('Start call error:', err);
      retellClientRef.current = null;
      setCallError(err.message || 'Could not start the call.');
      setStep('idle');
    }
  };

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) {
      setSubmitError('Enter the word you extracted from the AI.');
      return;
    }
    setSubmitError('');
    setStep('submitting');

    try {
      const res = await fetch('/.netlify/functions/challenge-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.trim(),
          name,
          email,
          challenge_token: sessionStorage.getItem('challenge_token') || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong while checking your answer.');
      }

      if (data.winner) {
        // Save for the winner page
        sessionStorage.setItem('challenge_winner_word', word.trim());
        if (data.claim_token) {
          sessionStorage.setItem('challenge_claim_token', data.claim_token);
        }
        navigate('/challenge/winner');
      } else {
        setStep('wrong');
      }
    } catch {
      setSubmitError('Something went wrong while checking your answer.');
      setStep('ended');
    }
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerPercent = (timer / CHALLENGE_DURATION) * 100;
  const circumference = 2 * Math.PI * 54; // r=54

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main className="py-16 lg:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-3">
              {name ? `Good luck, ${name}!` : 'The Challenge'}
            </h1>
            <p className="text-gray-600">
              You have 60 seconds. Start the call, talk to Aria, and try to get her to reveal the secret word.
            </p>
          </motion.div>

          {/* Main challenge card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
          >
            <div className="bg-gray-900 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${step === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-white text-sm font-medium">
                  {step === 'idle' && 'Ready'}
                  {step === 'connecting' && 'Connecting...'}
                  {step === 'active' && 'LIVE — Call in progress'}
                  {(step === 'ended' || step === 'submitting' || step === 'wrong' || step === 'locked') && 'Call ended'}
                </span>
              </div>
              {step === 'active' && (
                <span className="text-white/60 text-xs font-mono">{formatTimer(timer)} remaining</span>
              )}
            </div>

            <div className="p-8 md:p-12">
              <AnimatePresence mode="wait">

                {/* IDLE — start button */}
                {step === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-28 h-28 bg-blue-50 border-2 border-blue-200 rounded-full grid place-items-center mb-8">
                      <Mic className="w-12 h-12 text-blue-600" />
                    </div>

                    <h2 className="text-xl font-bold text-[#0B1220] mb-2">Ready when you are</h2>
                    <p className="text-gray-500 text-sm mb-8 max-w-sm">
                      Allow microphone access when prompted. The 60-second countdown starts as soon as Aria picks up.
                    </p>

                    {callError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {callError}
                      </div>
                    )}

                    <button
                      onClick={startCall}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
                    >
                      Start the Challenge
                      <Mic className="w-5 h-5" />
                    </button>

                    <p className="text-xs text-gray-400 mt-4">No phone needed — runs in your browser</p>
                  </motion.div>
                )}

                {/* CONNECTING */}
                {step === 'connecting' && (
                  <motion.div
                    key="connecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-28 h-28 bg-blue-50 border-2 border-blue-200 rounded-full grid place-items-center mb-8 animate-pulse">
                      <Mic className="w-12 h-12 text-blue-600" />
                    </div>
                    <p className="text-gray-600 font-medium">Connecting to Aria...</p>
                    <p className="text-gray-400 text-sm mt-2">Allow microphone access if prompted</p>
                  </motion.div>
                )}

                {/* ACTIVE — countdown ring */}
                {step === 'active' && (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    {/* Countdown ring */}
                    <div className="relative w-36 h-36 mb-8">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="54"
                          fill="none"
                          stroke={timer <= 10 ? '#ef4444' : '#2563eb'}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference * (1 - timerPercent / 100)}
                          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-mono font-bold ${timer <= 10 ? 'text-red-500' : 'text-[#0B1220]'}`}>
                          {formatTimer(timer)}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">remaining</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-semibold text-green-600">Talking to Aria</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-8">
                      {timer > 30 ? 'Give it your best shot...' : timer > 10 ? 'Keep pushing...' : 'Last few seconds!'}
                    </p>

                    <button
                      onClick={endCall}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors"
                    >
                      <MicOff className="w-4 h-4" />
                      End Call Early
                    </button>
                  </motion.div>
                )}

                {/* ENDED — word submission form */}
                {(step === 'ended' || step === 'submitting') && (
                  <motion.div
                    key="ended"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-bold text-[#0B1220]">Time is up — what is the word?</h2>
                    </div>
                    <p className="text-gray-500 text-sm mb-8">
                      Enter the secret word you extracted from Aria. One shot — make it count.
                    </p>

                    <form onSubmit={handleWordSubmit} className="space-y-4">
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        placeholder="Type the secret word..."
                        autoFocus
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 focus:border-blue-500 rounded-lg text-[#0B1220] font-mono text-lg tracking-widest uppercase focus:outline-none transition-colors"
                      />

                      {submitError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {submitError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={step === 'submitting'}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0px_0px_#000] disabled:translate-x-0 disabled:translate-y-0"
                      >
                        {step === 'submitting' ? 'Checking...' : 'Submit My Answer'}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* WRONG — not the right word */}
                {step === 'wrong' && (
                  <motion.div
                    key="wrong"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-gray-100 border-2 border-gray-200 rounded-full grid place-items-center mb-6">
                      <Shield className="w-10 h-10 text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0B1220] mb-2">AI Held Strong</h2>
                    <p className="text-gray-600 mb-2">That was not the secret word. The AI defense rate is over 95%.</p>
                    <p className="text-gray-500 text-sm mb-8">You only get one challenge attempt per email and IP.</p>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 w-full text-left">
                      <p className="text-[#0B1220] font-semibold text-sm">Imagine this protecting your business calls.</p>
                      <p className="text-gray-500 text-sm mt-1">Same AI. Your business name. Set up in 5 minutes. Free to try.</p>
                    </div>

                    <a
                      href="/free-website"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                    >
                      Get the AI for my business instead
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </motion.div>
                )}

                {step === 'locked' && (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-gray-100 border-2 border-gray-200 rounded-full grid place-items-center mb-6">
                      <Shield className="w-10 h-10 text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0B1220] mb-2">Challenge Already Used</h2>
                    <p className="text-gray-600 mb-2">{callError || 'This challenge attempt has already been used.'}</p>
                    <p className="text-gray-500 text-sm mb-8">Each email and IP gets one shot.</p>

                    <a
                      href="/free-website"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                    >
                      Get the AI for my business instead
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>

          {/* Back link */}
          <p className="text-center mt-8">
            <a href="/challenge" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              Back to challenge info
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChallengeCall;
