/**
 * DevLogin — dev-only auto-login for testing dashboard changes without
 * signup/onboarding/signin. Reads VITE_DEV_EMAIL + VITE_DEV_PASSWORD from
 * .env.local, logs into that seeded test account, redirects to /dashboard.
 *
 * ponytail: gated on import.meta.env.DEV in AppRoutes so the route is
 * literally absent from the prod bundle. No prod-side kill switch needed.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DevLogin = () => {
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (isAuthenticated || tried) return;
    const email = import.meta.env.VITE_DEV_EMAIL as string | undefined;
    const password = import.meta.env.VITE_DEV_PASSWORD as string | undefined;
    if (!email || !password) {
      setError('Set VITE_DEV_EMAIL and VITE_DEV_PASSWORD in .env.local, then restart `npm run dev`.');
      setTried(true);
      return;
    }
    setTried(true);
    login({ email, password }).catch((e) => {
      setError(`Login failed: ${e?.message ?? 'unknown error'}. Sign up ${email} once through /signup + complete onboarding, then retry.`);
    });
  }, [isAuthenticated, tried, login]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-3">
        <p className="text-sm text-white/60">dev-login</p>
        <p className="text-lg">
          {error ?? 'Signing in as dev test user…'}
        </p>
      </div>
    </div>
  );
};

export default DevLogin;
