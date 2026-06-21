import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import V2SetupChat from '../../components/v2/V2SetupChat';
import { Component as BgGradient } from '../../components/ui/bg-gredient';

const V2SetupPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showPrompting, setShowPrompting] = useState(false);

  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription('Set up Boltcall with an AI-guided onboarding flow.');
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    setShowPrompting(false);
    const welcomeTimer = window.setTimeout(() => setShowPrompting(true), 2300);

    return () => window.clearTimeout(welcomeTimer);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signup?redirect=%2Fsetup" replace />;
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white">
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
      <BgGradient
        gradientFrom="#f8fbff"
        gradientTo="#2f6bff"
        gradientSize="125% 125%"
        gradientPosition="50% 10%"
        gradientStop="40%"
      />
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {!showPrompting ? (
          <h1
            className="text-center text-5xl font-black uppercase tracking-[0.11em] text-zinc-950 sm:text-7xl lg:text-8xl"
            style={{ animation: 'boltcallSetupWelcome 2300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            Welcome to Boltcall
          </h1>
        ) : (
          <section
            aria-label="Boltcall setup assistant"
            className="w-full max-w-3xl"
            style={{ animation: 'boltcallSetupPromptIn 800ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            <V2SetupChat />
          </section>
        )}
      </main>
    </div>
  );
};

export default V2SetupPage;
