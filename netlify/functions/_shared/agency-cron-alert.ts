/**
 * agency-cron-alert — Shared failure-alert wrapper for all Agency OS scheduled functions.
 *
 * Usage:
 *   import { wrapCronWithAlert } from './_shared/agency-cron-alert';
 *
 *   const inner: Handler = async (event, context) => { ... };
 *   export const handler = wrapCronWithAlert('agency-cron-my-function', inner);
 *
 * What the wrapper does on any uncaught throw:
 *   1. Emits an `adapter_error` event to agency_events (severity='critical') so
 *      the AIOS dashboard and Atlas morning briefing see the failure.
 *   2. Sends a Telegram alert via the existing notifyError helper (direct
 *      Telegram Bot API call — same channel used by all Netlify functions).
 *   3. Re-throws the original error so Netlify marks the scheduled invocation
 *      as failed (visible in function logs + Netlify status page).
 *
 * Side-effect failures (event emit, Telegram) are swallowed individually so
 * they never mask the original error.
 */

import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions';

import { emitAgencyEvent } from './emit-agency-event';
import { notifyError } from './notify';

/**
 * Wrap a scheduled Netlify handler with Telegram failure alerting.
 *
 * @param handlerName - The file-stem of the function (e.g. 'agency-cron-monday-creative').
 *                      Used in the Telegram message and as the agent_name in the event.
 * @param handler     - The original async handler to protect.
 * @returns            A new Handler that delegates to the original and alerts on throw.
 */
export function wrapCronWithAlert(handlerName: string, handler: Handler): Handler {
  return async (event: HandlerEvent, context: HandlerContext) => {
    try {
      return await handler(event, context);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // 1. Emit adapter_error event to the agency event bus (best-effort).
      try {
        await emitAgencyEvent({
          client_id: '',
          agent_name: handlerName,
          type: 'adapter_error',
          severity: 'critical',
          payload: {
            adapter: handlerName,
            operation: 'scheduled_invocation',
            error_message: errorMessage.slice(0, 500),
            retryable: false,
          },
          why_explanation: `Scheduled function ${handlerName} threw an uncaught error and failed its entire invocation.`,
        });
      } catch (emitErr) {
        console.error(`[agency-cron-alert] failed to emit adapter_error for ${handlerName}:`, emitErr);
      }

      // 2. Send Telegram alert via the existing notifyError helper (best-effort).
      try {
        await notifyError(
          `Scheduled function FAILED: ${handlerName}`,
          err,
          { function: handlerName, trigger: 'scheduled_cron' },
        );
      } catch (telegramErr) {
        console.error(`[agency-cron-alert] failed to send Telegram alert for ${handlerName}:`, telegramErr);
      }

      // 3. Re-throw so Netlify marks the invocation as failed.
      throw err;
    }
  };
}
