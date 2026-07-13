import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Bump this when Terms of Service change materially. Users whose
 * user_metadata.tos_accepted_version doesn't match are re-prompted by
 * TosAcceptanceGate on their next authenticated session.
 */
export const TOS_VERSION = '2026-07';

export const hasAcceptedCurrentTos = (
  meta: Record<string, unknown> | undefined
): boolean => meta?.tos_accepted_version === TOS_VERSION;

/**
 * Evidence row in activity_logs (server captures IP) via the existing
 * team-activity-logs function. Returns true when the row was written.
 */
async function writeAuditRow(session: Session, source: string): Promise<boolean> {
  try {
    const res = await fetch('/.netlify/functions/team-activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'tos_accepted',
        details: `Accepted Terms of Service ${TOS_VERSION} (${source})`,
        metadata: { tos_version: TOS_VERSION, source, user_agent: navigator.userAgent },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * User clicked "I agree" while a session exists (re-accept gate, OAuth first
 * login). Stamps user_metadata and writes the audit row. If the audit row
 * fails, tos_logged_version stays unset so ensureTosAuditRow retries later —
 * the metadata stamp alone already records acceptance server-side.
 */
export async function recordTosAcceptance(source: 'login_gate' | 'oauth'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const logged = await writeAuditRow(session, source);
  await supabase.auth.updateUser({
    data: {
      tos_accepted_version: TOS_VERSION,
      tos_accepted_at: new Date().toISOString(),
      ...(logged ? { tos_logged_version: TOS_VERSION } : {}),
    },
  });
}

let auditBackfillInFlight = false;

/**
 * Email signups stamp acceptance metadata before a session exists (see
 * signup() in auth.ts), so no IP-bearing audit row was written yet. On the
 * first authenticated session, backfill exactly one audit row.
 */
export async function ensureTosAuditRow(): Promise<void> {
  if (auditBackfillInFlight) return;
  auditBackfillInFlight = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const meta = session?.user?.user_metadata;
    if (!session || meta?.tos_accepted_version !== TOS_VERSION) return;
    if (meta?.tos_logged_version === TOS_VERSION) return;
    const logged = await writeAuditRow(session, 'signup_backfill');
    if (logged) {
      await supabase.auth.updateUser({ data: { tos_logged_version: TOS_VERSION } });
    }
  } finally {
    auditBackfillInFlight = false;
  }
}
