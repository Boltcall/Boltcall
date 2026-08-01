import { supabase } from './supabase';

const MAX_CRASH_REPORTS_PER_SESSION = 5; // ponytail: cap so a crash loop can't spam the alert channel
const MAX_HANDLED_REPORTS_PER_SESSION = 15;
let crashReportCount = 0;
let handledReportCount = 0;

async function sendReport(body: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    await fetch('/.netlify/functions/client-error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        url: window.location.href,
        userId: user?.id,
        userEmail: user?.email,
      }),
      keepalive: true,
    });
  } catch {
    // never let error reporting itself throw
  }
}

async function reportClientError(message: string, stack: string | undefined, context: string) {
  if (crashReportCount >= MAX_CRASH_REPORTS_PER_SESSION) return;
  crashReportCount++;
  await sendReport({ message, stack, context, severity: 'crash' });
}

/**
 * Report a caught (handled) error to the owner alert channel.
 * Use alongside a user-facing toast — this is the "notify Noam" half.
 */
export function reportHandledError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  if (handledReportCount >= MAX_HANDLED_REPORTS_PER_SESSION) return;
  handledReportCount++;
  const err = error instanceof Error ? error : new Error(String(error));
  void sendReport({
    message: err.message,
    stack: err.stack,
    context,
    severity: 'handled',
    metadata,
  });
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
