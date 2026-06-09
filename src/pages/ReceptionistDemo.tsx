import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import { updateMetaDescription } from '../lib/utils';

type DemoStatus = 'loading' | 'error' | 'ready' | 'connecting' | 'active' | 'ended';

const FUNCTIONS_BASE = '/.netlify/functions';
const BOOK_CALL_URL = 'https://cal.com/noam/boltcall';

const ReceptionistDemo: React.FC = () => {
  const [searchParams] = useSearchParams();
  const demoId = searchParams.get('id');

  const [status, setStatus] = useState<DemoStatus>('loading');
  const [businessName, setBusinessName] = useState('');
  const [errorMessage, setErrorMessage] = useState('This demo link may have expired or is invalid.');
  const retellClientRef = useRef<any>(null);

  useEffect(() => {
    document.title = 'Your AI Receptionist Demo — Boltcall';
    updateMetaDescription('Experience a live AI receptionist demo built specifically for your business.');
  }, []);

  useEffect(() => {
    if (!demoId) {
      setErrorMessage('This demo link is missing an id.');
      setStatus('error');
      return;
    }

    fetch(`${FUNCTIONS_BASE}/demo-web-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo_id: demoId, mode: 'preview' }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Demo not found');
        return res.json();
      })
      .then((data) => {
        setBusinessName(data.business_name);
        if (data.already_started) {
          setErrorMessage('This demo call has already been started.');
          setStatus('error');
          return;
        }
        setStatus('ready');
      })
      .catch(() => {
        setErrorMessage('This demo link may have expired or is invalid.');
        setStatus('error');
      });
  }, [demoId]);

  const startCall = async () => {
    if (!demoId) return;
    setStatus('connecting');

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/demo-web-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo_id: demoId, mode: 'start' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not start this demo call.');
      }

      const data = await res.json();
      if (data.business_name) setBusinessName(data.business_name);

      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();

      client.on('call_started', () => setStatus('active'));
      client.on('call_ended', () => {
        setStatus('ended');
        retellClientRef.current = null;
      });
      client.on('error', () => {
        setStatus('ready');
        retellClientRef.current = null;
      });

      retellClientRef.current = client;
      await client.startCall({ accessToken: data.access_token });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not start this demo call.');
      setStatus('error');
    }
  };

  const endCall = () => {
    retellClientRef.current?.stopCall();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Setting up your demo...</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md"
            >
              <p className="text-2xl font-semibold text-gray-900 mb-3">Demo not found</p>
              <p className="text-gray-500 mb-6">{errorMessage}</p>
              <a
                href="https://boltcall.org"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Visit Boltcall <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}

          {status === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-lg"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-9 h-9 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Your AI receptionist is ready
                {businessName && (
                  <span className="block text-blue-600 mt-1">{businessName}</span>
                )}
              </h1>
              <p className="text-gray-500 text-lg mb-8">
                Click below to hear your AI receptionist answer a call — qualified, booked, done.
              </p>
              <button
                onClick={startCall}
                className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
              >
                <Phone className="w-5 h-5" />
                Start Demo Call
              </button>
              <p className="text-sm text-gray-400 mt-4">~60 seconds · no signup required</p>
            </motion.div>
          )}

          {status === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping" />
                <div className="relative w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-xl font-semibold text-gray-900">Connecting...</p>
            </motion.div>
          )}

          {status === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping" />
                <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                  <Phone className="w-10 h-10 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">Call in progress</p>
              <p className="text-gray-500 mb-8">Your AI receptionist is live</p>
              <button
                onClick={endCall}
                className="inline-flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 active:scale-95 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md"
            >
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                That's Boltcall.
              </h2>
              <p className="text-gray-500 text-lg mb-2">
                Every inbound lead answered in seconds.
              </p>
              {businessName && (
                <p className="text-gray-500 mb-8">
                  Want this live for <strong>{businessName}</strong>? Takes 24 hours to set up.
                </p>
              )}
              <a
                href={BOOK_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
              >
                Book a 15-min call <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-sm text-gray-400 mt-3">No commitment. See pricing on the call.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ReceptionistDemo;
