import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, ArrowRight } from 'lucide-react';
import type { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '../../lib/supabase';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';
import { useAuth } from '../../contexts/AuthContext';
import { VoicePoweredOrb } from '../../components/ui/voice-powered-orb';
import { SetupGradientBackground } from '../../components/setup/SetupGradientBackground';

type Phase = 'provisioning' | 'connecting' | 'live' | 'ended' | 'error';

const TalkToAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('provisioning');
  const [agentName, setAgentName] = useState('your agent');
  const [errorMessage, setErrorMessage] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const clientRef = useRef<RetellWebClient | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    document.title = 'Meet your agent — Boltcall';
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (clientRef.current) {
      try { clientRef.current.stopCall(); } catch { /* ignore */ }
      clientRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startCall = useCallback(async () => {
    if (!user?.id) {
      setPhase('error');
      setErrorMessage('You need to be signed in to meet your agent.');
      return;
    }

    setPhase('provisioning');
    setErrorMessage('');

    try {
      // Find the inbound agent for this user — most recent
      const { data: agents, error: agentErr } = await supabase
        .from('agents')
        .select('id, retell_agent_id, name, agent_type, workspace_id, created_at')
        .eq('user_id', user.id)
        .or('agent_type.eq.inbound,agent_type.eq.ai_receptionist')
        .not('retell_agent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (agentErr) throw new Error(agentErr.message);
      const agent = agents?.[0];
      if (!agent?.retell_agent_id) {
        throw new Error('Your agent is still being prepared. Please try again in a moment.');
      }

      if (agent.name) setAgentName(agent.name);

      setPhase('connecting');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser needs microphone support to speak with your agent.');
      }

      // Pre-prompt mic permission — gives a clean error path before SDK call
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error('Microphone access is required to speak with your agent.');
      }

      // Create web call session via Netlify function
      const response = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_web_call', agent_id: agent.retell_agent_id }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'Failed to start the call.');
      }
      const { access_token } = await response.json();
      if (typeof access_token !== 'string' || access_token.length === 0) {
        throw new Error('Retell did not return a web-call access token.');
      }

      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => {
        setPhase('live');
        setIsLive(true);
        startedAtRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setCallSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
      });

      client.on('call_ended', () => {
        cleanup();
        setIsLive(false);
        setPhase('ended');
      });

      client.on('error', (err: unknown) => {
        console.error('Retell call error:', err);
        cleanup();
        setIsLive(false);
        setPhase('error');
        setErrorMessage('Something went wrong during the call.');
      });

      await client.startCall({ accessToken: access_token });
    } catch (err: unknown) {
      console.error('Talk-to-agent start failed:', err);
      cleanup();
      setPhase('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not start the call.');
    }
  }, [user?.id, cleanup]);

  // Auto-start on mount
  useEffect(() => {
    startCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    if (clientRef.current) {
      try { clientRef.current.stopCall(); } catch { /* ignore */ }
    }
    // call_ended handler will fire and transition to 'ended'
  };

  const handleEnterDashboard = () => {
    cleanup();
    navigate('/v2?setupCompleted=true', { replace: true });
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const captionByPhase: Record<Phase, string> = {
    provisioning: 'Waking your agent up...',
    connecting: 'Connecting...',
    live: '',
    ended: 'Nice. Your agent is live and ready.',
    error: errorMessage || 'Something went wrong.',
  };

  return (
    <div className="fixed inset-0 isolate z-[9999] flex flex-col items-center justify-center overflow-hidden bg-white">
      <SetupGradientBackground />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Heading */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase === 'live' ? 'live' : phase === 'ended' ? 'ended' : 'pre'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            {phase === 'live' && (
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Meet {agentName}.
              </h1>
            )}
            {phase !== 'live' && phase !== 'ended' && (
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Your agent is almost ready
              </h1>
            )}
            {phase === 'ended' && (
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                That's your agent.
              </h1>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Orb */}
        <div className="w-[300px] h-[300px]">
          <VoicePoweredOrb
            enableVoiceControl={isLive}
            className="rounded-full overflow-hidden"
          />
        </div>

        {/* Live indicator + timer */}
        <AnimatePresence>
          {phase === 'live' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-600"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Live</span>
              <span className="text-slate-400">·</span>
              <span className="tabular-nums">{formatTime(callSeconds)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Caption for non-live phases */}
        <AnimatePresence>
          {phase !== 'live' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 text-sm text-slate-500 max-w-md"
            >
              {captionByPhase[phase]}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 min-h-[80px]">
          {phase === 'live' && (
            <motion.button
              type="button"
              onClick={handleEnd}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-500 text-white font-semibold shadow-lg shadow-rose-500/30 hover:bg-rose-600 transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              End call
            </motion.button>
          )}

          {phase === 'ended' && (
            <motion.button
              type="button"
              onClick={handleEnterDashboard}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
            >
              Enter dashboard
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={startCall}
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Skip link — always available except in ended state (uses enter dashboard) */}
        {phase !== 'ended' && (
          <motion.button
            type="button"
            onClick={handleEnterDashboard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-sm text-slate-400 hover:text-slate-600 underline-offset-4 hover:underline transition-colors"
          >
            Skip &amp; enter dashboard →
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default TalkToAgentPage;
