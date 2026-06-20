import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updateMetaDescription } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import V2SetupChat from '../../components/v2/V2SetupChat';
import { Component as BgGradient } from '../../components/ui/bg-gredient';

const V2SetupPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription('Set up Boltcall with an AI-guided onboarding flow.');
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm font-medium text-zinc-500">
        Loading setup...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signup?redirect=%2Fsetup" replace />;
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white">
      <BgGradient
        gradientFrom="#ffffff"
        gradientTo="#f2ecff"
        gradientSize="125% 125%"
        gradientPosition="50% 10%"
        gradientStop="40%"
      />
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-2">
          <img
            src="/boltcall_full_logo.png"
            alt="Boltcall"
            className="h-11 w-auto"
            width={160}
            height={52}
            loading="eager"
            decoding="async"
          />
          <div className="hidden rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm sm:block">
            AI-guided setup
          </div>
        </header>

        <section className="mt-8 flex flex-1 justify-center">
          <div className="w-full max-w-3xl rounded-[32px] border border-zinc-200 bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <V2SetupChat />
          </div>
        </section>
      </main>
    </div>
  );
};

export default V2SetupPage;
