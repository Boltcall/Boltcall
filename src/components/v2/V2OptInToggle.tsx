/**
 * V2OptInToggle — small toggle component intended for placement on the V1
 * Settings page (or anywhere the user might choose to opt in/out of V2).
 *
 * This component is NEW and is NOT mounted by default — V1 stays untouched
 * per the V2 invariant. A separate prep PR (or the user manually editing
 * Settings) is what would import it.
 *
 * Behavior:
 *   - On mount, queries the workspace's current v2_enabled flag.
 *   - On flip → calls POST /api/saas-v2-toggle with { enabled: <new value> }.
 *   - If switching ON: navigates to /v2/.
 *   - If switching OFF: stays in place (the caller is already in V1).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

interface V2OptInToggleProps {
  className?: string;
}

const V2OptInToggle: React.FC<V2OptInToggleProps> = ({ className }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load the current flag on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) {
          setChecked(false);
          setLoading(false);
        }
        return;
      }
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase
          .from('workspaces')
          .select('v2_enabled')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (!cancelled) {
          setChecked(Boolean((data as { v2_enabled?: boolean } | null)?.v2_enabled));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setChecked(false);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleToggle = async () => {
    if (saving || loading) return;
    const next = !checked;
    setSaving(true);
    setError(null);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update V2 setting (${res.status})`);
      }
      setChecked(next);
      if (next) {
        navigate('/v2/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-white p-4">
        <div className="min-w-0">
          <label
            htmlFor="v2-opt-in-toggle"
            className="text-sm font-semibold text-text-main"
          >
            Try the new AI-native dashboard (V2)
          </label>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            V2 redesigns every page with AI-native features — Ask Boltcall AI
            strategist in your topbar, narrative analytics, AI-curated knowledge
            base, AI review responses. You can switch back to V1 anytime from
            V2&apos;s topbar.
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Inline switch — no external dep, uses tokens so it lands clean in V1. */}
        <button
          id="v2-opt-in-toggle"
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            checked ? 'bg-brand-blue' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default V2OptInToggle;
