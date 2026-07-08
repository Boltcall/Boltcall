const MAX_REPORTS_PER_SESSION = 5;
let reportCount = 0;

async function reportClientError(message: string, stack: string | undefined, context: string) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return; // ponytail: cap so a crash loop can't spam the alert channel
  reportCount++;
  try {
    await fetch('/.netlify/functions/client-error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, context, url: window.location.href }),
      keepalive: true,
    });
  } catch {
    // never let error reporting itself throw
  }
}

export function initErrorReporting() {
  window.addEventListener('error', (e) => {
    reportClientError(e.message, e.error?.stack, 'window.onerror');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    reportClientError(
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : undefined,
      'unhandledrejection'
    );
  });
}

export function reportReactError(error: Error) {
  reportClientError(error.message, error.stack, 'react-error-boundary');
}
