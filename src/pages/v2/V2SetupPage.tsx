/**
 * V2 Conversational Setup Wizard — full-screen page.
 *
 * Mounts V2SetupChat centered on a clean, minimal layout. Has its own header
 * (Boltcall logo + permanent "Skip to classic setup" escape hatch) — NOT
 * wrapped in DashboardLayoutV2 because:
 *   (a) the wizard is single-purpose and benefits from undivided focus;
 *   (b) DashboardLayoutV2 doesn't yet exist in this branch;
 *   (c) V1's Setup.tsx uses a full-screen layout for the same reason — keep
 *       parity for new signups.
 *
 * NOT wrapped in V2OptInGate either — a brand-new user must be able to reach
 * the wizard before the V2 flag is flipped. The finalize endpoint is where
 * V2 actually goes live for the workspace.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import V2SetupChat from '../../components/v2/V2SetupChat';
import { updateMetaDescription } from '../../lib/utils';

const V2SetupPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Set Up Your AI Receptionist — Boltcall';
    updateMetaDescription(
      'Configure your AI receptionist in a quick conversation. No forms, no setup screens — just chat your way to a live agent in 15 minutes.',
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2">
            <img
              src="/boltcall_full_logo.png"
              alt="Boltcall"
              className="h-8 w-auto"
              width={120}
              height={32}
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Persistent escape hatch — always available, no matter what */}
          <Link
            to="/setup"
            className="text-xs font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Skip to V1 setup →
          </Link>
        </div>
      </header>

      {/* ── Main chat surface ────────────────────────────────────────────── */}
      <main className="flex flex-1 items-stretch justify-center px-4 py-8 md:py-12">
        <V2SetupChat />
      </main>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <footer className="pb-6 pt-2 text-center text-[11px] text-zinc-400">
        Setup data is saved as you go — close this tab and pick up where you left off.
      </footer>
    </div>
  );
};

export default V2SetupPage;
