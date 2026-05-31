/**
 * FounderGate — wraps Agency OS routes so only users with
 * app_metadata.role === 'founder' (set in their Supabase JWT) can access them.
 *
 * The User object in AuthContext is a lightweight projection that strips
 * app_metadata, so this component reads the role directly from the live
 * Supabase session. Cached in module-level state so re-renders don't refetch.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type GateState = 'loading' | 'allowed' | 'forbidden' | 'anon';

// Module-level cache so navigating between agency routes doesn't refetch.
let cachedRole: { userId: string; role: string | null } | null = null;

const Forbidden: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-6">
    <div className="max-w-md w-full rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
        <svg
          className="h-6 w-6 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m0 0v.01M12 11v.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Founder access only</h2>
      <p className="mt-2 text-sm text-zinc-600">
        This area of the dashboard is reserved for Boltcall founders. If you believe
        this is a mistake, contact support.
      </p>
    </div>
  </div>
);

interface FounderGateProps {
  children: React.ReactNode;
}

const FounderGate: React.FC<FounderGateProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (isLoading) return;
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) setState('anon');
        return;
      }

      // Hit the cache first
      if (cachedRole && cachedRole.userId === user.id) {
        if (!cancelled) {
          setState(cachedRole.role === 'founder' ? 'allowed' : 'forbidden');
        }
        return;
      }

      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          if (!cancelled) setState('forbidden');
          return;
        }
        const role =
          (data.user.app_metadata as { role?: string } | undefined)?.role ?? null;
        cachedRole = { userId: user.id, role };
        if (!cancelled) {
          setState(role === 'founder' ? 'allowed' : 'forbidden');
        }
      } catch {
        if (!cancelled) setState('forbidden');
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.id]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Checking founder access…
      </div>
    );
  }

  if (state === 'anon' || state === 'forbidden') {
    return <Forbidden />;
  }

  return <>{children}</>;
};

export default FounderGate;
