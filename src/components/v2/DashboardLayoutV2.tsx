/**
 * DashboardLayoutV2 — the V2 shell that all 12 V2 pages compose into.
 *
 * Differences from V1 (DashboardLayout.tsx):
 *   1. Persistent "Ask Boltcall AI" strip in the topbar — single-line input
 *      that expands on focus. This is the V2-defining feature.
 *   2. Calmer density: more whitespace, narrative-first slot above any chart.
 *   3. Always-on "Back to V1" link in the topbar (escape hatch). Also a
 *      redundant escape hatch lives in SidebarV2 footer — by design.
 *   4. Brand-new SidebarV2 with v2/* routes and intent-grouped nav.
 *
 * V1 invariant: this file is brand new. It never imports from V1's
 * DashboardLayout or Sidebar.
 */
import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import SidebarV2 from './SidebarV2';

const DashboardLayoutV2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [askExpanded, setAskExpanded] = useState(false);
  const [askValue, setAskValue] = useState('');
  const [backToV1Pending, setBackToV1Pending] = useState(false);

  const handleBackToV1 = async () => {
    if (backToV1Pending) return;
    setBackToV1Pending(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      // Even if the server returns an error, fall back to V1 — the user asked
      // to leave V2; trapping them here would be worse than a stale flag.
      if (!res.ok) {
        console.warn(`[V2] saas-v2-toggle returned ${res.status} on back-to-v1`);
      }
      navigate('/dashboard');
    } catch (err) {
      console.warn('[V2] back-to-v1 failed', err);
      navigate('/dashboard');
    } finally {
      setBackToV1Pending(false);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askValue.trim()) return;
    // Strategist wiring lands in a later Week 2 PR — for now navigate to the
    // V2 home/strategist surface with the question in state so the page can
    // pick it up.
    navigate('/v2', { state: { strategistPrompt: askValue.trim() } });
    setAskValue('');
    setAskExpanded(false);
  };

  return (
    <div className="h-screen flex bg-zinc-50">
      <SidebarV2
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onBackToV1={handleBackToV1}
        backToV1Pending={backToV1Pending}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar — persistent Ask Boltcall AI strip + escape hatch */}
        <header className="flex-shrink-0 border-b border-border bg-white">
          <div className="flex items-center gap-3 h-14 px-3 md:px-6">
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-zinc-600 hover:text-text-main hover:bg-zinc-100"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ask Boltcall AI strip — single line that expands on focus.
                The V2 user identity: an AI strategist always one keystroke away. */}
            <form
              onSubmit={handleAskSubmit}
              className={`flex-1 max-w-3xl mx-auto transition-all duration-200 ${
                askExpanded ? 'scale-[1.01]' : ''
              }`}
            >
              <div
                className={`flex items-center gap-2 rounded-full border bg-zinc-50 px-4 transition-all ${
                  askExpanded
                    ? 'border-brand-blue ring-2 ring-brand-blue/15 bg-white py-2.5'
                    : 'border-border py-1.5 hover:border-zinc-300'
                }`}
              >
                <Sparkles
                  className={`flex-shrink-0 transition-colors ${
                    askExpanded ? 'text-brand-blue w-4 h-4' : 'text-zinc-400 w-3.5 h-3.5'
                  }`}
                />
                <input
                  type="text"
                  value={askValue}
                  onChange={(e) => setAskValue(e.target.value)}
                  onFocus={() => setAskExpanded(true)}
                  onBlur={() => setAskExpanded(false)}
                  placeholder="Ask Boltcall AI strategist anything…"
                  className="flex-1 bg-transparent text-sm text-text-main placeholder:text-zinc-400 focus:outline-none"
                  aria-label="Ask Boltcall AI strategist"
                />
                {askExpanded && askValue.trim() && (
                  <button
                    type="submit"
                    className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 px-2"
                  >
                    Ask
                  </button>
                )}
              </div>
            </form>

            {/* Right side: Back-to-V1 escape hatch + user marker */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleBackToV1}
                disabled={backToV1Pending}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-text-main hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Switch back to the classic dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {backToV1Pending ? 'Switching…' : 'Back to V1'}
              </button>
              <div
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-semibold"
                title={user?.name || user?.email || 'User'}
              >
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content — calmer density, generous whitespace.
            Each V2 page is expected to lead with a narrative slot above any
            chart slot; this container only provides the breathing room. */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayoutV2;
