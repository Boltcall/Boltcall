/**
 * v2Surface — single source of truth for "which dashboard surface does this
 * workspace live on?".
 *
 * A workspace is either on the V2 AI-native dashboard (workspaces.v2_enabled
 * = true) or on the classic V1 dashboard — never both. Two gates consume this
 * hook to enforce the wall from each side:
 *   - V2OptInGate      → keeps V1 workspaces out of /v2/*
 *   - ClassicDashboardGate → keeps V2 workspaces out of /dashboard/*
 *
 * The module-level cache (keyed by user id) means crossing routes inside one
 * surface never refetches the flag. The two sanctioned surface-switch points
 * (V2OptInGate's enable button, DashboardLayoutV2's "Back to V1") must call
 * resetV2SurfaceCache() / primeV2SurfaceCache() so the other gate sees the
 * flip immediately instead of bouncing the user back.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export type V2SurfaceState = 'loading' | 'enabled' | 'disabled' | 'anon';

type CacheEntry = { userId: string; v2Enabled: boolean };
let cache: CacheEntry | null = null;

/** Drop the cached flag so the next gate mount refetches. */
export function resetV2SurfaceCache(): void {
  cache = null;
}

/** Set the flag locally after a known server-side flip (avoids a refetch flash). */
export function primeV2SurfaceCache(userId: string, v2Enabled: boolean): void {
  cache = { userId, v2Enabled };
}

export function useV2SurfaceState(): V2SurfaceState {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [state, setState] = useState<V2SurfaceState>(() => {
    if (user?.id && cache && cache.userId === user.id) {
      return cache.v2Enabled ? 'enabled' : 'disabled';
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
          // Defensive: if the query fails (e.g. RLS misconfig), assume the
          // classic surface — it exists for every workspace.
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

  return state;
}
