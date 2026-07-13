import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  TOS_VERSION,
  hasAcceptedCurrentTos,
  recordTosAcceptance,
  ensureTosAuditRow,
} from '../../lib/tosAcceptance';

/**
 * Blocking clickwrap gate — the fallback for whoever doesn't accept inline.
 * The primary acceptance path is now the checkbox in the /setup onboarding
 * wizard (V2SetupChat), so this is suppressed there to avoid double-prompting;
 * it still fires for legacy accounts, anyone who leaves /setup before
 * checking the box, and everyone after a future ToS version bump.
 */
export default function TosAcceptanceGate() {
  const location = useLocation();
  const [needsAccept, setNeedsAccept] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const suppressedRoute = location.pathname.startsWith('/setup');

  useEffect(() => {
    const evaluate = (session: Session | null) => {
      if (!session) {
        setNeedsAccept(false);
        return;
      }
      if (hasAcceptedCurrentTos(session.user.user_metadata)) {
        setNeedsAccept(false);
        void ensureTosAuditRow();
      } else {
        setNeedsAccept(true);
      }
    };
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => evaluate(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!needsAccept || suppressedRoute) return null;

  const handleAccept = async () => {
    setSaving(true);
    try {
      await recordTosAcceptance('login_gate');
      setNeedsAccept(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Terms of Service</h2>
        <p className="text-sm text-gray-600 mb-4">
          To continue using Boltcall, please review and accept our current terms
          (version {TOS_VERSION}).
        </p>
        <label className="flex items-start gap-2 text-sm text-gray-700 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span>
            I agree to the{' '}
            <a href="/terms-of-service" target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Privacy Policy
            </a>
          </span>
        </label>
        <button
          type="button"
          onClick={handleAccept}
          disabled={!checked || saving}
          className="w-full py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Accept and continue'}
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Decline and sign out
        </button>
      </div>
    </div>
  );
}
