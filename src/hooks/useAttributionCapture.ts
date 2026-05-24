import { useEffect } from 'react';

// Captures the campaign_lead_uid that's injected into every outbound URL by
// cold-email:create-campaign Phase 9. The URL shape is:
//   https://boltcall.org/<path>?ref=<uid>
// On first mount, if ?ref= is present we:
//   1. Store it in sessionStorage for downstream form submissions to attach
//   2. POST a one-time visit event to /.netlify/functions/silent-touch-attribution
// Re-mounts (route changes) re-read sessionStorage but never re-POST.

const STORAGE_KEY = 'boltcall_attribution_uid';
const FIRED_KEY = 'boltcall_attribution_fired';
const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;

export function useAttributionCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('ref');

    if (refFromUrl && UID_RE.test(refFromUrl)) {
      // New uid arriving on this page load — store it (overwrites any prior)
      try { sessionStorage.setItem(STORAGE_KEY, refFromUrl); } catch {}
    }

    // Fire only once per session, regardless of how many routes the user visits
    let fired = false;
    try { fired = sessionStorage.getItem(FIRED_KEY) === '1'; } catch {}
    if (fired) return;

    const uid = refFromUrl && UID_RE.test(refFromUrl)
      ? refFromUrl
      : (() => { try { return sessionStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; } })();

    if (!uid || !UID_RE.test(uid)) return;

    try { sessionStorage.setItem(FIRED_KEY, '1'); } catch {}

    fetch('/.netlify/functions/silent-touch-attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        path: window.location.pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {
      // Never break the page on attribution failure
    });
  }, []);
}

// Helper for forms to attach the stored uid as a hidden field
export function getStoredAttributionUid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && UID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}
