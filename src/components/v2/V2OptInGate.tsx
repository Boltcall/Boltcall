/**
 * V2OptInGate — wraps every V2 route so only workspaces with workspaces.v2_enabled = true
 * see the V2 UI.
 *
 * If the flag is false (or missing), the gate renders a single Card with a one-click
 * "Enable V2 (opt-in)" button that POSTs /api/saas-v2-toggle { enabled: true } and
 * reloads the page on success.
 *
 * Module-level cache keyed by user_id so navigating between V2 routes doesn't refetch
 * the flag on every page change. Mirrors the FounderGate / AgencyClientGate pattern.
 *
 * SECURITY:
 *   This is a UX gate. The real boundary is the server-side check in
 *   netlify/functions/saas-v2-toggle.ts (owner_id check) + the per-page server
 *   functions that gate writes. The gate only decides what to render.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card-shadcn';
import { Button } from '../ui/button-shadcn';

type GateState = 'loading' | 'enabled' | 'disabled' | 'anon';

// Module-level cache so route changes within /v2/* don't refetch the flag.
type CacheEntry = { userId: string; v2Enabled: boolean };
let cache: CacheEntry | null = null;

/** Exposed so tests can reset between scenarios. */
export function __resetV2OptInGateCache(): void {
  cache = null;
}

interface V2OptInGateProps {
  children: React.ReactNode;
}

const V2OptInGate: React.FC<V2OptInGateProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [state, setState] = useState<GateState>(() => {
    if (user?.id && cache && cache.userId === user.id) {
      return cache.v2Enabled ? 'enabled' : 'disabled';
    }
    return 'loading';
  });
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (isLoading) return;
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) setState('anon');
        return;
      }

      // Cache hit — skip the round-trip.
      if (cache && cache.userId === user.id) {
        if (!cancelled) setState(cache.v2Enabled ? 'enabled' : 'disabled');
        return;
      }

      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('workspaces')
          .select('v2_enabled')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          // Defensive: if the query fails (e.g. RLS misconfig), assume disabled.
          if (!cancelled) {
            cache = { userId: user.id, v2Enabled: false };
            setState('disabled');
          }
          return;
        }

        const flag = Boolean((data as { v2_enabled?: boolean } | null)?.v2_enabled);
        cache = { userId: user.id, v2Enabled: flag };
        if (!cancelled) setState(flag ? 'enabled' : 'disabled');
      } catch {
        if (!cancelled) {
          // Don't poison the cache on transient errors — let the next mount retry.
          setState('disabled');
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user?.id]);

  const handleEnable = async () => {
    setEnabling(true);
    setEnableError(null);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (!res.ok) {
        throw new Error(`Failed to enable V2 (${res.status})`);
      }
      // Invalidate the cache and hard-reload so V2 boots fresh.
      cache = null;
      window.location.reload();
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : 'Unknown error');
      setEnabling(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (state === 'anon') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to be signed in to use the new dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === 'disabled') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>V2 isn&apos;t enabled for this workspace yet</CardTitle>
            <CardDescription>
              The new AI-native dashboard is opt-in while it&apos;s in early access.
              You can switch back to V1 anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button onClick={handleEnable} disabled={enabling}>
              {enabling ? 'Enabling V2…' : 'Enable V2 (opt-in)'}
            </Button>
            {enableError && (
              <p className="text-xs text-red-600">{enableError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default V2OptInGate;
