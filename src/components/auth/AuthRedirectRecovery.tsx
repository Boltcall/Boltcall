import { useEffect } from 'react';
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

  useEffect(() => {
    if (isLoading) return;

    const pendingRedirect = readPendingAuthRedirect();
    if (!pendingRedirect) return;

    if (isMatchingRedirect(location.pathname, pendingRedirect)) {
      clearPendingAuthRedirect();
      return;
    }

    if (!isAuthenticated) return;

    const hasAuthHash =
      typeof window !== 'undefined' && window.location.hash.length > 1;
    const canRecoverHere =
      RECOVERABLE_PATHS.has(location.pathname) || hasAuthHash;

    if (!canRecoverHere) return;

    clearPendingAuthRedirect();
    navigate(pendingRedirect, { replace: true });
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  return null;
};

export default AuthRedirectRecovery;
