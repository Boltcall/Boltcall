// Shared by the SMS and WhatsApp responders. `now` is injectable for tests.
export function isWithinBusinessHours(settings: any, now: Date = new Date()): boolean {
  if (!settings?.business_hours_only) return true;
  try {
    const tz = settings.business_timezone || 'UTC';
    const localeStr = now.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    const [hh, mm] = localeStr.split(':').map((n) => parseInt(n, 10));
    const nowMinutes = (hh % 24) * 60 + mm; // some ICU builds print midnight as 24:00
    const [sH, sM] = (settings.business_hours_start || '09:00').split(':').map((n: string) => parseInt(n, 10));
    const [eH, eM] = (settings.business_hours_end || '18:00').split(':').map((n: string) => parseInt(n, 10));
    return nowMinutes >= sH * 60 + sM && nowMinutes < eH * 60 + eM;
  } catch {
    return true;
  }
}
