/**
 * V2OptInGate — wraps every V2 route so only workspaces with workspaces.v2_enabled = true
 * see the V2 UI. The mirror gate (ClassicDashboardGate) keeps V2 workspaces
 * out of /dashboard/* — together they guarantee a workspace lives on exactly
 * one surface, never both.
 *
 * New setups get v2_enabled flipped automatically by setup-launch, so this
 * gate's opt-in card is only ever seen by pre-existing V1 workspaces. The
 * one-click enable POSTs /api/saas-v2-toggle { enabled: true } and reloads.
 *
 * Surface state (with its module-level cache) lives in v2Surface.ts and is
 * shared with ClassicDashboardGate so both gates always agree.
 *
 * SECURITY:
 *   This is a UX gate. The real boundary is the server-side check in
 *   netlify/functions/saas-v2-toggle.ts (owner_id check) + the per-page server
 *   functions that gate writes. The gate only decides what to render.
 */
import React, { useState } from 'react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card-shadcn';
import { Button } from '../ui/button-shadcn';
import { useV2SurfaceState, resetV2SurfaceCache } from './v2Surface';

/** Exposed so tests can reset between scenarios. */
export function __resetV2OptInGateCache(): void {
  resetV2SurfaceCache();
}

interface V2OptInGateProps {
  children: React.ReactNode;
}

const V2OptInGate: React.FC<V2OptInGateProps> = ({ children }) => {
  const state = useV2SurfaceState();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);

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
      resetV2SurfaceCache();
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
              Your workspace is on the classic dashboard. Switch to the new
              AI-native dashboard here — you can switch back anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button onClick={handleEnable} disabled={enabling}>
              {enabling ? 'Enabling V2…' : 'Enable V2'}
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
