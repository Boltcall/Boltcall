import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { DASHBOARD_ACCENTS, DEFAULT_APPEARANCE, normalizeAppearance } from '../lib/dashboardAppearance';
import type { Appearance } from '../components/ui/st-appearance-lab';

const DashboardAppearanceContext = createContext<{
  appearance: Appearance; saved: Appearance; loading: boolean; saving: boolean; error: string;
  setAppearance: (a: Appearance) => void; save: () => Promise<boolean>; reset: () => void;
} | null>(null);

export function DashboardAppearanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [saved, setSaved] = useState(DEFAULT_APPEARANCE);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;

  useEffect(() => {
    let cancelled = false;
    setLoadedUserId(null);
    setAppearance(DEFAULT_APPEARANCE);
    setSaved(DEFAULT_APPEARANCE);
    setError('');
    setSaving(false);
    if (!user?.id) return;
    const load = async () => {
      try {
        const result = await supabase.auth.getUser();
        if (result.error || result.data.user?.id !== user.id) throw new Error('Account unavailable');
        let stored: unknown = result.data.user.user_metadata?.boltcall_appearance;
        if (!stored) {
          // Preserve existing clients' theme and color when upgrading the old preferences editor.
          const { data } = await supabase.from('business_profiles').select('user_preferences')
            .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
          const legacy = data?.user_preferences;
          const legacyColor = typeof legacy?.accentColor === 'string' ? legacy.accentColor.toLowerCase() : null;
          stored = {
            accent: DASHBOARD_ACCENTS.find(x => x.color.toLowerCase() === legacyColor)?.id,
            previewMode: legacy?.theme === 'auto'
              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : legacy?.theme,
          };
        }
        if (!cancelled) {
          const next = normalizeAppearance(stored);
          setAppearance(next);
          setSaved(next);
          setLoadedUserId(user.id);
        }
      } catch {
        if (!cancelled) setError('Could not load appearance. Refresh to try again.');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const save = async () => {
    if (!user?.id || loadedUserId !== user.id || saving) return false;
    const accountId = user.id;
    const next = normalizeAppearance(appearance);
    setSaving(true);
    setError('');
    try {
      const session = await supabase.auth.getUser();
      if (session.error || session.data.user?.id !== accountId || currentUserId.current !== accountId) throw new Error('Account changed');
      const { data, error: saveError } = await supabase.auth.updateUser({ data: { boltcall_appearance: next } });
      if (saveError || data.user?.id !== accountId) throw new Error('Save failed');
      if (currentUserId.current !== accountId) return false;
      setSaved(next);
      setAppearance(next);
      return true;
    } catch {
      if (currentUserId.current === accountId) setError('Could not save appearance. Your changes are still here; try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return <DashboardAppearanceContext.Provider value={{
    appearance: loadedUserId === user?.id ? appearance : DEFAULT_APPEARANCE,
    saved, loading: !!user && loadedUserId !== user.id, saving, error,
    setAppearance: a => { setAppearance(normalizeAppearance(a)); setError(''); },
    save, reset: () => setAppearance(saved),
  }}>{children}</DashboardAppearanceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardAppearance() {
  const value = useContext(DashboardAppearanceContext);
  if (!value) throw new Error('DashboardAppearanceProvider is required');
  return value;
}
