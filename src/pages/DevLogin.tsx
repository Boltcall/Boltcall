/**
 * DevLogin — password-gated auto-login for testing dashboard changes without
 * signup/onboarding/signin. Available in prod (behind a gate password) so
 * changes can be tested against the real deployed environment.
 *
 * Security note: gate password + login creds are compiled into the JS bundle.
 * This is obscurity, not security. Use only with a throwaway test account
 * that has no sensitive data.
 *
 * Envs (build-time, prefixed VITE_):
 *   VITE_DEV_LOGIN_GATE      — password the visitor must type
 *   VITE_DEV_EMAIL           — test account email
 *   VITE_DEV_PASSWORD        — test account password
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GATE = import.meta.env.VITE_DEV_LOGIN_GATE as string | undefined;
const EMAIL = import.meta.env.VITE_DEV_EMAIL as string | undefined;
const PASSWORD = import.meta.env.VITE_DEV_PASSWORD as string | undefined;
const STORAGE_KEY = 'boltcall_dev_login_unlocked';

const DevLogin = () => {
  const { login, isAuthenticated } = useAuth();
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!unlocked || isAuthenticated || loggingIn) return;
    if (!EMAIL || !PASSWORD) {
      setError('Server missing VITE_DEV_EMAIL or VITE_DEV_PASSWORD build-time env vars.');
      return;
    }
    setLoggingIn(true);
    login({ email: EMAIL, password: PASSWORD }).catch((e) => {
      setError(`Login failed: ${e?.message ?? 'unknown error'}.`);
      setLoggingIn(false);
    });
  }, [unlocked, isAuthenticated, loggingIn, login]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submitGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!GATE) { setError('Server missing VITE_DEV_LOGIN_GATE build-time env var.'); return; }
    if (input === GATE) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
      setUnlocked(true);
    } else {
      setError('Wrong password.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-4 text-center">
        <p className="text-xs uppercase tracking-widest text-white/40">dev-login</p>
        {unlocked ? (
          <p className="text-lg">
            {error ?? 'Signing in as dev test user…'}
          </p>
        ) : (
          <form onSubmit={submitGate} className="space-y-3">
            <p className="text-sm text-white/70">Enter gate password to continue.</p>
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
              placeholder="password"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white/90"
            >
              Unlock
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DevLogin;
