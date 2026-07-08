import { Handler } from '@netlify/functions';
import { notifyError } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

const MAX_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 1000;

/**
 * Frontend crash reporting — receives window.onerror / unhandledrejection /
 * React ErrorBoundary catches and forwards them to the existing Telegram
 * error-alert pipe (notifyError). No new external monitoring account needed.
 */
const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '' };
  }

  try {
    const { message, stack, context, url } = JSON.parse(event.body || '{}');
    if (!message || typeof message !== 'string') {
      return { statusCode: 400, body: '' };
    }

    await notifyError(
      `frontend: ${typeof context === 'string' ? context : 'unknown'}`,
      new Error(String(message).slice(0, MAX_MESSAGE_LEN)),
      {
        url: typeof url === 'string' ? url.slice(0, 300) : undefined,
        stack: typeof stack === 'string' ? stack.slice(0, MAX_STACK_LEN) : undefined,
      }
    );
  } catch (err) {
    console.error('[client-error-report] failed to process report:', err);
  }

  return { statusCode: 204, body: '' };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
