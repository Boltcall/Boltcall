import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import V2SetupChat from '../../components/v2/V2SetupChat';
import { SiriWave } from '../../components/ui/siri-wave';

const V2SetupPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showPrompting, setShowPrompting] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);

  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription('Set up Boltcall with an AI-guided onboarding flow.');
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    setShowPrompting(false);
    setAssistantSpeaking(false);
    const welcomeTimer = window.setTimeout(() => setShowPrompting(true), 2300);

    return () => window.clearTimeout(welcomeTimer);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signup?redirect=%2Fsetup" replace />;
  }

  return (
    <div className="dark relative isolate h-screen h-dvh overflow-hidden bg-[#050507] text-white">
      <style>
        {`
          @keyframes boltcallSetupWelcome {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.96);
              filter: blur(14px);
              letter-spacing: 0.18em;
            }
            42% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
              letter-spacing: 0.11em;
            }
            78% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
            100% {
              opacity: 0;
              transform: translateY(-10px) scale(0.985);
              filter: blur(8px);
            }
          }

          @keyframes boltcallSetupPromptIn {
            0% {
              opacity: 0;
              transform: translateY(18px);
              filter: blur(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }
        `}
      </style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.16) 0%, rgba(73,34,229,0.22) 26%, rgba(8,8,14,0.96) 62%, #050507 100%)',
        }}
      />
      <SiriWave
        aria-hidden
        variant="wave"
        speaking={assistantSpeaking}
        size={520}
        renderScale={0.7}
        className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-transparent opacity-75 mix-blend-screen [mask-image:radial-gradient(circle,black_0%,black_48%,transparent_76%)] sm:top-8"
      />
      <main className="mx-auto flex h-full min-h-0 max-w-5xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        {!showPrompting ? (
          <h1
            className="relative z-10 text-center text-3xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl lg:text-6xl"
            style={{ animation: 'boltcallSetupWelcome 2300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            Welcome to Boltcall
          </h1>
        ) : (
          <section
            aria-label="Boltcall setup assistant"
            className="relative z-10 w-full max-w-3xl"
            style={{ animation: 'boltcallSetupPromptIn 800ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            <V2SetupChat onSpeakingChange={setAssistantSpeaking} />
          </section>
        )}
      </main>
    </div>
  );
};

export default V2SetupPage;
