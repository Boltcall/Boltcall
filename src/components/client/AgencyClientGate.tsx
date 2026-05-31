/**
 * AgencyClientGate — wraps the /dashboard/client/* route surface so only users
 * with at least one active agency_clients row (status NOT IN
 * ('churned','paused')) can see the client portal.
 *
 * Mirrors the pattern in FounderGate.tsx, but the membership signal is a row
 * in `agency_clients` (`user_id = auth.uid()`), not a JWT claim. RLS on the
 * table will return only this user's row(s); we additionally filter status
 * client-side so a "paused" engagement doesn't auto-grant the portal — that
 * client is intentionally locked out until their account is resumed.
 *
 * Result is cached at module level keyed by user_id so navigating between
 * /client/* pages doesn't refetch.
 *
 * SECURITY:
 *   This is a UX gate, not the security boundary. The real boundary is the
 *   RLS policies on agency_clients / agency_artifacts / agency_events_client_view
 *   and the explicit owns_client(client_id, jwt_sub) check on every server
 *   function. This gate only decides what to render.
 *
 * Test helper:
 *   __resetAgencyClientGateCache() is exported for unit tests so we can
 *   force a re-fetch between scenarios.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type GateState = 'loading' | 'allowed' | 'forbidden' | 'anon';

// Module-level cache so re-renders and route changes don't refetch.
// We cache both positive and negative results — most users hitting /client/*
// will not be agency clients, and we don't want to hammer Supabase on every
// nav.
type CacheEntry = { userId: string; isClient: boolean };
let cache: CacheEntry | null = null;

/** Exposed so tests can reset between scenarios. */
export function __resetAgencyClientGateCache(): void {
  cache = null;
}

const NotAClient: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-6">
    <div className="max-w-md w-full rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
        <svg
          className="h-6 w-6 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">
        Reserved for managed clients
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        This portal is for Bolt System and Missed-Call Recovery clients. If
        you're on the self-serve plan, your dashboard is one click away.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Go to my dashboard
        </Link>
        <Link
          to="/pricing"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          See managed plans
        </Link>
      </div>
    </div>
  </div>
);

interface AgencyClientGateProps {
  children: React.ReactNode;
}

const AgencyClientGate: React.FC<AgencyClientGateProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [state, setState] = useState<GateState>(() => {
    if (user?.id && cache && cache.userId === user.id) {
      return cache.isClient ? 'allowed' : 'forbidden';
    }
    return 'loading';
  });

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (isLoading) return;
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) setState('anon');
        return;
      }

      // Cache hit
      if (cache && cache.userId === user.id) {
        if (!cancelled) setState(cache.isClient ? 'allowed' : 'forbidden');
        return;
      }

      try {
        const { supabase } = await import('../../lib/supabase');
        // RLS will already scope to this user; the .eq('user_id', ...) is
        // belt-and-braces so a mis-policied env still returns the right thing.
        // Filter out churned + paused so those engagements don't grant access.
        const { data, error } = await supabase
          .from('agency_clients')
          .select('id, status')
          .eq('user_id', user.id)
          .not('status', 'in', '("churned","paused")')
          .limit(1);

        if (error) {
          // Defensive: if RLS or the query fails, deny rather than crash.
          if (!cancelled) {
            cache = { userId: user.id, isClient: false };
            setState('forbidden');
          }
          return;
        }

        const isClient = Array.isArray(data) && data.length > 0;
        cache = { userId: user.id, isClient };
        if (!cancelled) setState(isClient ? 'allowed' : 'forbidden');
      } catch {
        if (!cancelled) {
          // Don't poison the cache on transient network errors — let next
          // mount retry.
          setState('forbidden');
        }
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
        Loading your portal…
      </div>
    );
  }

  if (state === 'anon' || state === 'forbidden') {
    return <NotAClient />;
  }

  return <>{children}</>;
};

/**
 * Lightweight hook variant of the gate's membership check. Used by sidebar
 * sections that need to know "is this user a client?" without rendering a
 * full gate. Shares the same module-level cache as AgencyClientGate, so the
 * two never produce a double-fetch.
 *
 * Returns null while loading so callers can render nothing on the first paint.
 */
export function useIsAgencyClient(): boolean | null {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isClient, setIsClient] = useState<boolean | null>(() => {
    if (user?.id && cache && cache.userId === user.id) {
      return cache.isClient;
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;

    if (isLoading) return;
    if (!isAuthenticated || !user?.id) {
      setIsClient(false);
      return;
    }
    if (cache && cache.userId === user.id) {
      setIsClient(cache.isClient);
      return;
    }

    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('agency_clients')
          .select('id, status')
          .eq('user_id', user.id)
          .not('status', 'in', '("churned","paused")')
          .limit(1);

        if (error) {
          if (!cancelled) {
            cache = { userId: user.id, isClient: false };
            setIsClient(false);
          }
          return;
        }

        const flag = Array.isArray(data) && data.length > 0;
        cache = { userId: user.id, isClient: flag };
        if (!cancelled) setIsClient(flag);
      } catch {
        if (!cancelled) setIsClient(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.id]);

  return isClient;
}

export default AgencyClientGate;
