import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  clearPendingAuthRedirect,
  readPendingAuthRedirect,
} from '../../lib/authRedirect';

const RECOVERABLE_PATHS = new Set(['/', '/login', '/signup', '/auth/callback']);
// Routes that own the recovery hash themselves. They must NOT be recovered
// away from even when a stale pendingAuthRedirect and an auth hash coexist,
// or the recovery token gets consumed before the page can process it.
const RECOVERY_EXCLUDED_PATHS = new Set(['/reset-password']);

function isMatchingRedirect(currentPath: string, pendingRedirect: string) {
  return (
    currentPath === pendingRedirect ||
    currentPath.startsWith(`${pendingRedirect}/`)
  );
}

const AuthRedirectRecovery = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingRedirect = readPendingAuthRedirect();
  const hasAuthHash =
    typeof window !== 'undefined' && window.location.hash.length > 1;
  const canRecoverHere =
    !RECOVERY_EXCLUDED_PATHS.has(location.pathname) &&
    (RECOVERABLE_PATHS.has(location.pathname) || hasAuthHash);
  // Same reasoning as AppRoutes' isRecoveringAuthRedirect: isLoading alone
  // fires on every plain login/signup submit on this same page, not just on
  // a real cross-mount recovery. Gate it on an actual auth-hash landing.
  const shouldBlockWhileRecovering =
    !!pendingRedirect &&
    canRecoverHere &&
    !isMatchingRedirect(location.pathname, pendingRedirect) &&
    (isAuthenticated || (isLoading && hasAuthHash));

  useLayoutEffect(() => {
    if (isLoading) return;
    if (!pendingRedirect) return;

    if (isMatchingRedirect(location.pathname, pendingRedirect)) {
      clearPendingAuthRedirect();
      return;
    }

    if (!isAuthenticated || !shouldBlockWhileRecovering) return;

    clearPendingAuthRedirect();
    navigate(pendingRedirect, { replace: true });
  }, [isLoading, location.pathname, navigate, pendingRedirect, shouldBlockWhileRecovering]);

  return null;
};

export default AuthRedirectRecovery;
