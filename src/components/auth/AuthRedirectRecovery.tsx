import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  clearPendingAuthRedirect,
  readPendingAuthRedirect,
} from '../../lib/authRedirect';

const RECOVERABLE_PATHS = new Set(['/', '/login', '/signup', '/auth/callback']);

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
    RECOVERABLE_PATHS.has(location.pathname) || hasAuthHash;
  const shouldBlockWhileRecovering =
    !!pendingRedirect &&
    canRecoverHere &&
    !isMatchingRedirect(location.pathname, pendingRedirect) &&
    (isLoading || isAuthenticated);

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

  if (!shouldBlockWhileRecovering) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050507] px-4 text-center text-sm font-medium text-white/75">
      Continuing setup...
    </div>
  );
};

export default AuthRedirectRecovery;
