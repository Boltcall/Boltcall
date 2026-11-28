const retryKey = 'boltcall:sms-preview-import-retry';
const chunkLoadFailure = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function recoverSmsPreviewImport(error: unknown): Promise<never> {
  if (!(error instanceof Error) || !chunkLoadFailure.test(error.message) || !window.navigator.onLine) {
    throw error;
  }

  try {
    const now = Date.now();
    const lastReload = Number(window.sessionStorage.getItem(retryKey));
    if (now - lastReload < 30_000) throw error;
    window.sessionStorage.setItem(retryKey, String(now));
    window.location.reload();
  } catch {
    throw error;
  }

  // Keep the route suspended while the new document loads.
  return new Promise((_, reject) => window.setTimeout(() => reject(error), 5_000));
}
