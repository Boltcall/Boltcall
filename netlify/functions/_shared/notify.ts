/**
 * Telegram notification helpers for critical error alerting.
 * Used across all Netlify functions to notify the owner when something goes wrong.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Chat id is not a secret (useless without the bot token); default kept in code
// to stay under the AWS Lambda 4KB env limit.
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1617285176';
const NOTIFY_TIMEOUT_MS = 2500;

async function sendTelegramMessage(body: Record<string, unknown>): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send a Telegram notification for critical errors.
 * Non-blocking — will not throw even if Telegram is unreachable.
 */
export async function notifyError(
  context: string,
  error: any,
  metadata?: Record<string, any>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error
    ? error.stack?.split('\n').slice(0, 3).join('\n')
    : '';

  let text = `🚨 *Boltcall Error*\n\n`;
  text += `📍 *Context:* ${escapeMarkdown(context)}\n`;
  text += `❌ *Error:* ${escapeMarkdown(errorMessage)}\n`;

  if (metadata) {
    text += `📋 *Details:*\n`;
    for (const [key, value] of Object.entries(metadata)) {
      const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
      text += `  • ${escapeMarkdown(key)}: ${escapeMarkdown(display)}\n`;
    }
  }

  if (stack) {
    text += `\n\`\`\`\n${stack}\n\`\`\``;
  }

  try {
    await sendTelegramMessage({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Failed to send Telegram error notification:', e);
  }
}

/**
 * Send a success/info notification to Telegram.
 * Non-blocking — will not throw even if Telegram is unreachable.
 */
export async function notifyInfo(message: string): Promise<void> {
  try {
    await sendTelegramMessage({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (e) {
    console.error('Failed to send Telegram info notification:', e);
  }
}

/**
 * Real-time email alert to the BUSINESS OWNER (the Telegram helpers above only
 * reach Boltcall's own chat). Honors the classic Settings > Notifications row
 * (new_lead / email toggles, notification_email); with no row it defaults ON
 * to the account email. Never throws; returns whether an email went out.
 * ponytail: email only — SMS alerts need a notification_phone the settings page never collects.
 */
export async function alertOwner(
  supabase: { from(table: string): any; auth?: any },
  userId: string,
  subject: string,
  lines: string[],
  opts: { urgent?: boolean } = {},
): Promise<boolean> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn('[notify] alertOwner skipped: BREVO_API_KEY not set');
      return false;
    }
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('new_lead, email_notifications, notification_email')
      .eq('user_id', userId)
      .maybeSingle();
    // Urgent (e.g. caller in custody) ignores the new-lead toggle; a global email opt-out still wins.
    if (prefs && ((!opts.urgent && prefs.new_lead === false) || prefs.email_notifications === false)) return false;

    let to: string | null = prefs?.notification_email || null;
    if (!to) {
      const { data } = await supabase.auth.admin.getUserById(userId);
      to = data?.user?.email || null;
    }
    if (!to) {
      console.warn(`[notify] alertOwner skipped: no email for user ${userId}`);
      return false;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_FROM_NAME || 'Boltcall', email: process.env.BREVO_FROM_EMAIL || 'noamj@boltcall.org' },
        to: [{ email: to }],
        subject,
        htmlContent: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
        textContent: lines.join('\n'),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[notify] alertOwner Brevo error ${res.status} for user ${userId}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notify] alertOwner failed:', err);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Escape special Markdown characters to prevent Telegram parse errors.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
