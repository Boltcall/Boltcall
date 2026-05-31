/**
 * ClientGate — wraps /client/* routes so only users with at least one
 * active `agency_clients` row (status NOT IN churned/paused) can access
 * them.
 *
 * Defense-in-depth: the netlify functions (agency-client-calls,
 * agency-client-call-detail, agency-client-insights) re-check ownership
 * server-side from auth.uid(). This gate is a UX optimization — without
 * it, non-agency users would see a noisy "no client" error inside the
 * dashboard shell. With it, they see a friendly explainer card.
 *
 * Cached at module scope so navigating /client/calls → /client/insights
 * doesn't refetch.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type GateState = 'loading' | 'allowed' | 'not_client' | 'anon';

let cachedMembership: { userId: string; hasClient: boolean } | null = null;

const NotClient: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-6">
    <div className="max-w-md w-full rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-zinc-100">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Client portal access</h2>
      <p className="mt-2 text-sm text-zinc-600">
        This area is for accounts on our managed agency service. If you're
        expecting to see it here, our team will get this sorted — drop us
        a note at <a className="text-brand-blue underline" href="mailto:hi@boltcall.org">hi@boltcall.org</a>.
      </p>
    </div>
  </div>
);

interface ClientGateProps {
  children: React.ReactNode;
}

const ClientGate: React.FC<ClientGateProps> = ({ children }) => {
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
      if (cachedMembership && cachedMembership.userId === user.id) {
        if (!cancelled) {
          setState(cachedMembership.hasClient ? 'allowed' : 'not_client');
        }
        return;
      }
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('agency_clients')
          .select('id')
          .eq('user_id', user.id)
          .not('status', 'in', '("churned","paused")')
          .limit(1);
        if (cancelled) return;
        if (error) {
          setState('not_client');
          return;
        }
        const hasClient = (data?.length ?? 0) > 0;
        cachedMembership = { userId: user.id, hasClient };
        setState(hasClient ? 'allowed' : 'not_client');
      } catch {
        if (!cancelled) setState('not_client');
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.id]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading your client portal…
      </div>
    );
  }
  if (state === 'anon' || state === 'not_client') {
    return <NotClient />;
  }
  return <>{children}</>;
};

export default ClientGate;
