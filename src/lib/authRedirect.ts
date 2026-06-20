const PENDING_AUTH_REDIRECT_KEY = 'boltcall_pending_auth_redirect';

export function normalizeAuthRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export function savePendingAuthRedirect(path: string | null | undefined) {
  const normalized = normalizeAuthRedirectPath(path);
  if (!normalized) return;
  localStorage.setItem(PENDING_AUTH_REDIRECT_KEY, normalized);
}

export function readPendingAuthRedirect() {
  return normalizeAuthRedirectPath(localStorage.getItem(PENDING_AUTH_REDIRECT_KEY));
}

export function clearPendingAuthRedirect() {
  localStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
}

export function consumePendingAuthRedirect() {
  const redirect = readPendingAuthRedirect();
  clearPendingAuthRedirect();
  return redirect;
}
