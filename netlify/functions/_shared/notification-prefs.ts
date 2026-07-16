/**
 * Client-facing notification preference gate.
 *
 * `notification_preferences` (per-user row, upserted from
 * src/pages/dashboard/settings/NotificationPage.tsx) has one boolean column
 * per event type. Before sending a client an email/SMS tied to one of these
 * events, check the toggle here — otherwise the settings UI is a lie.
 *
 * Does NOT gate owner alerts (notifyError/Telegram) — those aren't client
 * preferences and must never go dark on a client's toggle.
 */
import { getServiceSupabase } from './token-utils';

export type NotificationEventType =
  | 'newLead'
  | 'appointmentBooked'
  | 'missedCall'
  | 'systemAlerts'
  | 'weeklyDigest';

const EVENT_COLUMN: Record<NotificationEventType, string> = {
  newLead: 'new_lead',
  appointmentBooked: 'appointment_booked',
  missedCall: 'missed_calls',
  systemAlerts: 'system_maintenance',
  weeklyDigest: 'weekly_digest',
};

/**
 * True if the client should receive this notification. Defaults to true
 * when no preferences row exists yet, or on any query error — never let a
 * transient DB hiccup silently swallow a real notification.
 */
export async function shouldNotifyUser(userId: string, eventType: NotificationEventType): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const column = EVENT_COLUMN[eventType];
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[notification-prefs] Query failed, defaulting to notify:', error);
      return true;
    }
    if (!data) return true;

    const value = (data as unknown as Record<string, boolean | null>)[column];
    return value ?? true;
  } catch (err) {
    console.error('[notification-prefs] Unexpected error, defaulting to notify:', err);
    return true;
  }
}
