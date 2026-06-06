/**
 * Fire user webhooks for a given trigger event.
 * Non-blocking (fire-and-forget) — logs errors but never throws.
 *
 * Usage:
 *   import { fireWebhooks } from './_shared/fire-webhooks';
 *   fireWebhooks(userId, 'new_lead', { id, name, email, ... });
 */

const BASE_URL = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';

export function fireWebhooks(
  userId: string,
  triggerEvent: string,
  payload: Record<string, any>
): void {
  fetch(`${BASE_URL}/.netlify/functions/webhook-manager`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
        ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
        : {}),
    },
    body: JSON.stringify({ action: 'fire', userId, triggerEvent, payload }),
  }).catch(err => {
    console.error(`[fire-webhooks] Failed to fire ${triggerEvent} webhooks (non-blocking):`, err);
  });
}
