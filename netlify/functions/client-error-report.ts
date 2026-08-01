import { Handler } from '@netlify/functions';
import { notifyError } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

const MAX_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 1000;
const MAX_FIELD_LEN = 200;
const MAX_METADATA_KEYS = 10;

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
    const { message, stack, context, url, userId, userEmail, severity, metadata } = JSON.parse(event.body || '{}');
    if (!message || typeof message !== 'string') {
      return { statusCode: 400, body: '' };
    }

    const severityLabel = severity === 'crash' ? '🚨 frontend crash' : '⚠️ frontend error';
    const contextSuffix = typeof context === 'string' && context ? `: ${context}` : '';

    const sanitizedMetadata: Record<string, string> = {};
    if (metadata && typeof metadata === 'object') {
      for (const [key, value] of Object.entries(metadata).slice(0, MAX_METADATA_KEYS)) {
        if (typeof value === 'string') {
          sanitizedMetadata[key.slice(0, 50)] = value.slice(0, MAX_FIELD_LEN);
        }
      }
    }

    await notifyError(
      `${severityLabel}${contextSuffix}`,
      new Error(String(message).slice(0, MAX_MESSAGE_LEN)),
      {
        userId: typeof userId === 'string' ? userId.slice(0, MAX_FIELD_LEN) : undefined,
        userEmail: typeof userEmail === 'string' ? userEmail.slice(0, MAX_FIELD_LEN) : undefined,
        url: typeof url === 'string' ? url.slice(0, 300) : undefined,
        stack: typeof stack === 'string' ? stack.slice(0, MAX_STACK_LEN) : undefined,
        ...sanitizedMetadata,
      }
    );
  } catch (err) {
    console.error('[client-error-report] failed to process report:', err);
  }

  return { statusCode: 204, body: '' };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
