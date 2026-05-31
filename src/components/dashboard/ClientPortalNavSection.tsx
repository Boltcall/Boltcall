/**
 * ClientPortalNavSection — sidebar section that surfaces the client portal
 * navigation, but ONLY for users with an active agency_clients row
 * (status NOT IN ('churned','paused')).
 *
 * The section is structurally invisible for everyone else — non-clients
 * (founders, self-serve dashboard users, anonymous) never see this nav at
 * all. This is the "founder is invisible" design principle expressed at the
 * nav layer: the agency framing doesn't leak into the client surface.
 *
 * Conditional sub-items:
 *   • Welcome   — hidden once intake_done_at is set (it's first-visit-only).
 *   • Ads       — only for SKUs whose ID starts with "bolt-system" (Bolt
 *                 System includes ads; Missed-Call Recovery does not).
 *   • Circle    — only after Day 14 since signed_up_at (cohort matching needs
 *                 2 weeks of data per the design spec).
 *   • Approvals — always rendered, but with an unread-dot when pending
 *                 approvals exist (the count is small enough we don't expose
 *                 a numeric badge to keep the surface calm).
 *
 * Label note: the section header is just "Boltcall" — never "Agency", never
 * "Client portal". The founder-invisible-by-default principle (design rule
 * #3) means we don't expose the agency framing to the client at all.
 */
import React, { useEffect, useState } from 'react';
import {
  Home,
  Sparkles,
  Mic,
  Phone,
  BarChart3,
  Megaphone,
  FileText,
  Users,
  CheckSquare,
  Settings as SettingsIcon,
} from 'lucide-react';
import NavItem from './NavItem';
import { useAuth } from '../../contexts/AuthContext';

// Module-level cache so re-renders / sidebar re-mounts don't refetch.
type ClientContext = {
  isClient: boolean;
  sku: string | null;
  intakeDone: boolean;
  signedUpAt: string | null;
  pendingApprovals: number;
};

let cache: { userId: string; ctx: ClientContext } | null = null;

const EMPTY_CTX: ClientContext = {
  isClient: false,
  sku: null,
  intakeDone: false,
  signedUpAt: null,
  pendingApprovals: 0,
};

/** Exposed for tests so scenarios can reset the cache between runs. */
export function __resetClientPortalNavCache(): void {
  cache = null;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diff = Date.now() - then;
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const ClientPortalNavSection: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [ctx, setCtx] = useState<ClientContext | null>(() => {
    if (user?.id && cache && cache.userId === user.id) {
      return cache.ctx;
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setCtx(EMPTY_CTX);
      return;
    }
    if (cache && cache.userId === user.id) {
      setCtx(cache.ctx);
      return;
    }

    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('agency_clients')
          .select('id, sku, status, intake_done_at, signed_up_at')
          .eq('user_id', user.id)
          .not('status', 'in', '("churned","paused")')
          .order('signed_up_at', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          const next = { ...EMPTY_CTX };
          cache = { userId: user.id, ctx: next };
          if (!cancelled) setCtx(next);
          return;
        }

        const row = data[0] as {
          id: string;
          sku: string | null;
          status: string;
          intake_done_at: string | null;
          signed_up_at: string | null;
        };

        // Pending approvals — client-facing artifacts in 'draft' state for
        // this engagement. RLS already scopes to shipped-only on the read
        // path, but for the approval queue we explicitly join on client_id.
        // We tolerate query errors here: nav must render even if the count
        // query fails.
        let pending = 0;
        try {
          const { count } = await supabase
            .from('agency_artifacts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', row.id)
            .eq('status', 'draft');
          pending = count ?? 0;
        } catch {
          pending = 0;
        }

        const next: ClientContext = {
          isClient: true,
          sku: row.sku,
          intakeDone: !!row.intake_done_at,
          signedUpAt: row.signed_up_at,
          pendingApprovals: pending,
        };
        cache = { userId: user.id, ctx: next };
        if (!cancelled) setCtx(next);
      } catch {
        if (!cancelled) setCtx(EMPTY_CTX);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // While we don't know yet, render nothing — the section appearing later is
  // less jarring than flashing a section that disappears.
  if (ctx === null) return null;
  if (!ctx.isClient) return null;

  const showWelcome = !ctx.intakeDone;
  const showAds =
    typeof ctx.sku === 'string' && ctx.sku.toLowerCase().startsWith('bolt-system');
  const showCircle = daysSince(ctx.signedUpAt) >= 14;
  const showApprovalsBadge = ctx.pendingApprovals > 0;

  return (
    <div className="space-y-1 pt-4 mt-4 border-t border-zinc-200">
      {/* Label is "Boltcall" — never "Agency" / "Client portal". The agency
          framing is invisible to clients by design (design principle #3). */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Boltcall
      </h2>
      <NavItem to="/dashboard/client" label="Home" icon={<Home />} />
      {showWelcome && (
        <NavItem
          to="/dashboard/client/welcome"
          label="Welcome"
          icon={<Sparkles />}
        />
      )}
      <NavItem to="/dashboard/client/agent" label="Agent" icon={<Mic />} />
      <NavItem to="/dashboard/client/calls" label="Calls" icon={<Phone />} />
      <NavItem
        to="/dashboard/client/insights"
        label="Insights"
        icon={<BarChart3 />}
      />
      {showAds && (
        <NavItem to="/dashboard/client/ads" label="Ads" icon={<Megaphone />} />
      )}
      <NavItem
        to="/dashboard/client/reports"
        label="Reports"
        icon={<FileText />}
      />
      {showCircle && (
        <NavItem
          to="/dashboard/client/circle"
          label="Circle"
          icon={<Users />}
        />
      )}
      <div className="relative">
        <NavItem
          to="/dashboard/client/approvals"
          label="Approvals"
          icon={<CheckSquare />}
        />
        {showApprovalsBadge && (
          <span
            aria-label={`${ctx.pendingApprovals} pending`}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-amber-500"
          />
        )}
      </div>
      <NavItem
        to="/dashboard/client/settings"
        label="Settings"
        icon={<SettingsIcon />}
      />
    </div>
  );
};

export default ClientPortalNavSection;
