import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * daily-lead-summary
 *
 * Scheduled at 07:00 UTC daily (~10 AM Israel / early morning US).
 * Sends each active user a lead summary email for the past 24 hours.
 *
 * Sends via Brevo (same pattern as send-email.ts) — no new infra needed.
 * Only sends if the user had at least 1 call OR 1 pending callback in the last 24h.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const BREVO_API_BASE = 'https://api.brevo.com/v3';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!);
}

interface UserSummary {
  userId: string;
  email: string;
  businessName: string;
  callsHandled: number;
  pending: number;
  completed: number;
}

async function getUserSummaries(): Promise<UserSummary[]> {
  const supabase = getServiceClient();

  // List all auth users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 500 });
  if (usersError || !usersData?.users?.length) return [];

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const summaries: UserSummary[] = [];

  // Batch: fetch callbacks for all users created/updated in the last 24h
  const { data: callbacks } = await supabase
    .from('callbacks')
    .select('user_id, status')
    .gte('created_at', yesterday);

  // Group callbacks by user_id
  const callbacksByUser: Record<string, { completed: number; pending: number }> = {};
  for (const cb of callbacks || []) {
    if (!callbacksByUser[cb.user_id]) callbacksByUser[cb.user_id] = { completed: 0, pending: 0 };
    if (cb.status === 'completed') callbacksByUser[cb.user_id].completed++;
    if (cb.status === 'pending' || cb.status === 'scheduled') callbacksByUser[cb.user_id].pending++;
  }

  // Fetch business names in one query
  const userIds = usersData.users.map((u) => u.id);
  const { data: profiles } = await supabase
    .from('business_profiles')
    .select('user_id, business_name')
    .in('user_id', userIds);

  const profileByUser: Record<string, string> = {};
  for (const p of profiles || []) profileByUser[p.user_id] = p.business_name || '';

  for (const user of usersData.users) {
    if (!user.email) continue;
    const stats = callbacksByUser[user.id];
    if (!stats) continue; // No activity in last 24h — skip

    summaries.push({
      userId: user.id,
      email: user.email,
      businessName: profileByUser[user.id] || 'your business',
      callsHandled: stats.completed,
      pending: stats.pending,
      completed: stats.completed,
    });
  }

  return summaries;
}

function buildEmailHtml(summary: UserSummary): string {
  const appUrl = 'https://boltcall.org/dashboard';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr><td style="background:#1d4ed8;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Boltcall</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your agent's last 24 hours</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Here's what happened at ${summary.businessName} while you were busy.</p>

          <!-- Stats row -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center" style="padding:16px;background:#eff6ff;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;">${summary.callsHandled}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Handled</p>
              </td>
              <td width="16"></td>
              <td align="center" style="padding:16px;background:#fefce8;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#ca8a04;">${summary.pending}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Pending</p>
              </td>
              <td width="16"></td>
              <td align="center" style="padding:16px;background:#f0fdf4;border-radius:8px;width:33%;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${summary.completed}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Booked</p>
              </td>
            </tr>
          </table>

          ${summary.pending > 0 ? `<p style="margin:0 0 24px;font-size:14px;color:#374151;background:#fefce8;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;">
            <strong>${summary.pending} lead${summary.pending !== 1 ? 's' : ''} still waiting</strong> — log in to see who needs a follow-up.
          </p>` : ''}

          <a href="${appUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
            Open Dashboard →
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're getting this because you have an active Boltcall account. © 2025 Boltcall</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBrevoEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@boltcall.org';
  const fromName = process.env.BREVO_FROM_NAME || 'Boltcall';

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Brevo error ${response.status}: ${data.message || 'unknown'}`);
  }
}

export const handler: Handler = async (event) => {
  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, body: JSON.stringify({ error: authz.message }) };
  }

  try {
    const summaries = await getUserSummaries();

    if (!summaries.length) {
      console.log('[daily-lead-summary] No users with activity in last 24h — nothing to send.');
      return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
    }

    let sent = 0;
    let failed = 0;

    for (const summary of summaries) {
      const subject = summary.pending > 0
        ? `${summary.callsHandled} handled, ${summary.pending} still waiting — your Boltcall summary`
        : `Your agent handled ${summary.callsHandled} lead${summary.callsHandled !== 1 ? 's' : ''} — Boltcall summary`;

      try {
        await sendBrevoEmail(summary.email, subject, buildEmailHtml(summary));
        sent++;
        console.log(`[daily-lead-summary] Sent to ${summary.email}`);
      } catch (err) {
        failed++;
        console.error(`[daily-lead-summary] Failed for ${summary.email}:`, err);
      }
    }

    console.log(`[daily-lead-summary] Done. Sent: ${sent}, Failed: ${failed}`);
    return { statusCode: 200, body: JSON.stringify({ sent, failed }) };
  } catch (err) {
    console.error('[daily-lead-summary] Fatal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};

export default withLegacyHandler(handler);
