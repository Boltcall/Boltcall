/**
 * ClassicDashboardGate — the V1 side of the surface wall.
 *
 * Wraps the /dashboard/* route tree. Workspaces with v2_enabled = true are
 * redirected to the equivalent V2 page (deep links map to their V2 sibling,
 * everything else lands on /v2), so a V2 workspace can never see V1 chrome —
 * not via the sidebar, a bookmark, a login redirect, or an old email link.
 * V2OptInGate enforces the same wall from the other side.
 *
 * Exempt route surfaces (different products that happen to live under
 * /dashboard, NOT the V1 owner dashboard):
 *   - /dashboard/agency/*  — founder-only Agency OS (FounderGate)
 *   - /dashboard/client/*  — managed-client portal (AgencyClientGate)
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useV2SurfaceState } from './v2Surface';

const EXEMPT_PREFIXES = ['/dashboard/agency', '/dashboard/client'];

// Ordered V1 → V2 deep-link map. First match wins; default is /v2 (home).
const V1_TO_V2_RULES: Array<[RegExp, string]> = [
  [/^\/dashboard\/(analytics|deep-analytics)/, '/v2/analytics'],
  [/^\/dashboard\/(calls|call-history)/, '/v2/calls'],
  [
    /^\/dashboard\/(leads|missed-calls|speed-to-lead|lead-reactivation|instant-lead-reply|instant-lead-response|website-instant-response|ad-instant-response)/,
    '/v2/leads',
  ],
  [
    /^\/dashboard\/(messages|sms|whatsapp|email|chat-history|sms-booking|follow-ups|chat-widget|website-bubble)/,
    '/v2/messages',
  ],
  [
    /^\/dashboard\/(agents|agent-tests|ai-receptionist|voice-library|boltcall-agent)/,
    '/v2/agent',
  ],
  [/^\/dashboard\/knowledge-base/, '/v2/knowledge'],
  [/^\/dashboard\/(integrations|calcom)/, '/v2/integrations'],
  [/^\/dashboard\/reputation/, '/v2/reputation'],
  [/^\/dashboard\/qa/, '/v2/qa'],
  [/^\/dashboard\/settings/, '/v2/settings'],
];

export function mapV1PathToV2(pathname: string): string {
  for (const [pattern, target] of V1_TO_V2_RULES) {
    if (pattern.test(pathname)) return target;
  }
  return '/v2';
}

interface ClassicDashboardGateProps {
  children: React.ReactNode;
}

const ClassicDashboardGate: React.FC<ClassicDashboardGateProps> = ({ children }) => {
  const location = useLocation();
  const state = useV2SurfaceState();

  const exempt = EXEMPT_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );
  if (exempt) return <>{children}</>;

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (state === 'enabled') {
    return <Navigate to={mapV1PathToV2(location.pathname)} replace />;
  }

  // 'disabled' and 'anon' render V1 — ProtectedRoute already handles auth.
  return <>{children}</>;
};

export default ClassicDashboardGate;
