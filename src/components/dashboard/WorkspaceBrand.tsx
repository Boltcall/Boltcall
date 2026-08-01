import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/**
 * Sidebar brand block: shows the workspace's own logo + name (captured during
 * /start onboarding into workspaces.logo_url) with "Boltcall" as the quiet
 * platform byline. Falls back to the plain Boltcall wordmark when the
 * workspace has no logo.
 */
const WorkspaceBrand: React.FC = () => {
  const { user } = useAuth();
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase
      .from('workspaces')
      .select('name, logo_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const ws = data?.[0];
        if (ws?.logo_url) setBrand({ name: ws.name || 'Workspace', logoUrl: ws.logo_url });
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!brand) {
    return <h1 className="text-xl font-bold text-zinc-900">Boltcall</h1>;
  }

  return (
    <div className="flex items-center gap-3">
      <img
        src={brand.logoUrl}
        alt=""
        className="h-9 w-9 rounded-lg border border-zinc-200 object-contain"
        onError={() => setBrand(null)}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-zinc-900">{brand.name}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Powered by Boltcall
        </div>
      </div>
    </div>
  );
};

export default WorkspaceBrand;
