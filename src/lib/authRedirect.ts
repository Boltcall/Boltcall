const PENDING_AUTH_REDIRECT_KEY = 'boltcall_pending_auth_redirect';
const PENDING_AUTH_REDIRECT_TTL_MS = 15 * 60 * 1000;

type StoredAuthRedirect =
  | string
  | {
      path?: string;
      savedAt?: number;
    };

export function normalizeAuthRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export function savePendingAuthRedirect(path: string | null | undefined) {
  const normalized = normalizeAuthRedirectPath(path);
  if (!normalized) return;
  localStorage.setItem(
    PENDING_AUTH_REDIRECT_KEY,
    JSON.stringify({ path: normalized, savedAt: Date.now() }),
  );
}

export function readPendingAuthRedirect() {
  const storedValue = localStorage.getItem(PENDING_AUTH_REDIRECT_KEY);
  if (!storedValue) return null;

  let parsed: StoredAuthRedirect = storedValue;
  try {
    parsed = JSON.parse(storedValue) as StoredAuthRedirect;
  } catch {
    parsed = storedValue;
  }

  if (typeof parsed === 'string') {
    return normalizeAuthRedirectPath(parsed);
  }

  if (
    typeof parsed.savedAt === 'number' &&
    Date.now() - parsed.savedAt > PENDING_AUTH_REDIRECT_TTL_MS
  ) {
    clearPendingAuthRedirect();
    return null;
  }

  return normalizeAuthRedirectPath(parsed.path);
}

export function clearPendingAuthRedirect() {
  localStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
}

export function consumePendingAuthRedirect() {
  const redirect = readPendingAuthRedirect();
  clearPendingAuthRedirect();
  return redirect;
}
