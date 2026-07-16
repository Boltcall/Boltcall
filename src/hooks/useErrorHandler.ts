import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { reportHandledError } from '../lib/errorReporting';

interface HandleErrorOptions {
  /** Toast title. Default: "Something went wrong" */
  title?: string;
  /** Friendly toast body. Default: generic retry message. */
  message?: string;
  /** Set false to skip the toast (background/non-blocking failures). */
  toast?: boolean;
  /** Extra context sent to the owner alert channel. */
  metadata?: Record<string, unknown>;
}

/**
 * Standard error handler for caught errors in pages/components:
 * logs to console, shows a professional error toast, and reports
 * the error to the owner alert channel (Telegram).
 *
 * Usage:
 *   const handleError = useErrorHandler();
 *   ... catch (err) { handleError('leads: fetch', err, { message: 'Could not load your leads.' }); }
 */
export function useErrorHandler() {
  const { showToast } = useToast();

  return useCallback(
    (context: string, error: unknown, opts?: HandleErrorOptions) => {
      console.error(`[${context}]`, error);
      if (opts?.toast !== false) {
        showToast({
          variant: 'error',
          title: opts?.title ?? 'Something went wrong',
          message:
            opts?.message ??
            'Please try again in a moment. Our team has been notified.',
        });
      }
      reportHandledError(context, error, opts?.metadata);
    },
    [showToast]
  );
}
