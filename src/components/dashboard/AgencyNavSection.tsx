/**
 * AgencyNavSection — sidebar section that surfaces Agency OS navigation,
 * but ONLY for users whose Supabase JWT has app_metadata.role === 'founder'.
 *
 * Reads the role from the live Supabase session because the User projection
 * exposed via AuthContext strips app_metadata. Returns null for everyone else,
 * so the section is completely invisible to non-founders.
 */
import React, { useEffect, useState } from 'react';
import { Inbox, Activity, Users, Settings as SettingsIcon } from 'lucide-react';
import NavItem from './NavItem';
import { useAuth } from '../../contexts/AuthContext';

// Module-level cache so re-renders / sidebar re-mounts don't refetch.
let cachedRole: { userId: string; role: string | null } | null = null;

const AgencyNavSection: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isFounder, setIsFounder] = useState<boolean | null>(() => {
    if (user?.id && cachedRole && cachedRole.userId === user.id) {
      return cachedRole.role === 'founder';
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setIsFounder(false);
      return;
    }
    if (cachedRole && cachedRole.userId === user.id) {
      setIsFounder(cachedRole.role === 'founder');
      return;
    }

    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          if (!cancelled) setIsFounder(false);
          return;
        }
        const role =
          (data.user.app_metadata as { role?: string } | undefined)?.role ?? null;
        cachedRole = { userId: user.id, role };
        if (!cancelled) setIsFounder(role === 'founder');
      } catch {
        if (!cancelled) setIsFounder(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  if (!isFounder) return null;

  return (
    <div className="space-y-1 pt-4 mt-4 border-t border-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Agency OS
      </h2>
      <NavItem to="/dashboard/agency/queue" label="Queue" icon={<Inbox />} />
      <NavItem to="/dashboard/agency/health" label="Health" icon={<Activity />} />
      <NavItem to="/dashboard/agency/clients" label="Clients" icon={<Users />} />
      <NavItem
        to="/dashboard/agency/settings"
        label="Settings"
        icon={<SettingsIcon />}
      />
    </div>
  );
};

export default AgencyNavSection;
