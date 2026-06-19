/**
 * V2 setup wizard.
 *
 * This page stays outside V2OptInGate so brand-new users can reach setup before
 * their workspace is opted into V2. The finalize endpoint is where V2 goes live.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import V2SetupChat from '../../components/v2/V2SetupChat';
import { useAuth } from '../../contexts/AuthContext';
import { updateMetaDescription } from '../../lib/utils';

const V2SetupPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.title = 'Set Up Boltcall';
    updateMetaDescription('Configure Boltcall with a focused setup flow for instant lead response.');
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 items-stretch justify-center px-4 py-8 md:py-12">
        {isLoading ? (
          <div className="flex min-h-[420px] w-full max-w-3xl items-center justify-center rounded-2xl border border-zinc-200 bg-white text-sm font-medium text-zinc-500 shadow-sm">
            Loading setup...
          </div>
        ) : isAuthenticated ? (
          <V2SetupChat />
        ) : (
          <section className="flex min-h-[420px] w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Account required
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 md:text-3xl">
              Sign in before starting V2 setup
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
              The setup saves your answers to your workspace, so it needs an account first.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login?redirect=/setup/classic"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Sign in
              </Link>
              <Link
                to="/signup?redirect=/setup/classic"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                Create account
              </Link>
              <Link
                to="/setup/classic"
                className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Classic setup
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default V2SetupPage;
