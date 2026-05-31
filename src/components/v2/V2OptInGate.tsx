import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/**
 * V2OptInGate — gates children behind the workspace's `v2_enabled` flag.
 *
 * Until the user opts in (via /v2 toggle on the home page), renders an
 * opt-in card instead of the V2 page content. This is a stub that will
 * be expanded by the V2 shell agent — kept minimal so other V2 pages can
 * render standalone in this branch.
 */
interface V2OptInGateProps {
  children: React.ReactNode;
}

const V2OptInGate: React.FC<V2OptInGateProps> = ({ children }) => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setEnabled(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('id, v2_enabled')
          .eq('owner_id', user.id)
          .maybeSingle();
        // Default to enabled when v2_enabled column doesn't exist yet (dev) —
        // safer than blocking V2 development while migrations are pending.
        setEnabled(data ? Boolean((data as { v2_enabled?: boolean }).v2_enabled ?? true) : true);
      } catch {
        setEnabled(true);
      }
    })();
  }, [user?.id]);

  if (enabled === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 max-w-xl mx-auto text-center">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Boltcall V2 is off for this workspace
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          Flip the V2 toggle on the home page to preview the new analytics-first
          dashboard. You can switch back to V1 anytime.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default V2OptInGate;
