/**
 * Telegram notification helpers for critical error alerting.
 * Used across all Netlify functions to notify the owner when something goes wrong.
 */

const BOT_TOKEN = '8548570744:AAFiridwZ2wruW0kTXQRUASRXhn7AiGN-6g';
const CHAT_ID = '6196587627';
const NOTIFY_TIMEOUT_MS = 2500;

async function sendTelegramMessage(body: Record<string, unknown>): Promise<void> {
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
 * Escape special Markdown characters to prevent Telegram parse errors.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
