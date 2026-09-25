import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Supabase Auth "Send Email Hook": Supabase calls this instead of its built-in
// mailer (2 emails/h, team-only), and we send through Brevo's API.
// ponytail: no SMTP key needed; the hook secret is derived from INTERNAL_API_SECRET
// because the function env is at AWS Lambda's 4KB cap. Supabase side holds
// `v1,whsec_<hookSecretBase64()>` (set via management API, see launch runbook).

const TOLERANCE_S = 5 * 60;

export function hookSecretBase64(): string {
  const base = process.env.INTERNAL_API_SECRET || '';
  if (!base) return '';
  return createHash('sha256').update(`supabase-send-email-hook:${base}`).digest('base64');
}

// Standard Webhooks: base64(HMAC-SHA256(secret, `${id}.${ts}.${body}`)), header "v1,<sig> v1,<sig2>".
export function verifyStandardWebhook(body: string, headers: Headers, secretB64: string, nowS = Date.now() / 1000): boolean {
  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sigHeader = headers.get('webhook-signature');
  if (!secretB64 || !id || !ts || !sigHeader) return false;
  if (Math.abs(nowS - Number(ts)) > TOLERANCE_S) return false;
  const expected = createHmac('sha256', Buffer.from(secretB64, 'base64')).update(`${id}.${ts}.${body}`).digest();
  return sigHeader.split(' ').some((part) => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

interface EmailData {
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  site_url?: string;
  email_action_type: string;
}

interface OutgoingEmail { to: string; subject: string; lines: string[]; link?: string }

const SUBJECTS: Record<string, string> = {
  signup: 'Confirm your Boltcall account',
  recovery: 'Reset your Boltcall password',
  magiclink: 'Your Boltcall sign-in link',
  email: 'Your Boltcall sign-in link',
  invite: "You've been invited to Boltcall",
  email_change: 'Confirm your new Boltcall email',
  reauthentication: 'Your Boltcall verification code',
};

const INTROS: Record<string, string> = {
  signup: 'Thanks for signing up. Confirm your email to finish creating your account.',
  recovery: 'We got a request to reset your password. Use the button below to choose a new one.',
  magiclink: 'Use the button below to sign in.',
  email: 'Use the button below to sign in.',
  invite: 'You have been invited to a Boltcall workspace. Accept the invite to set up your account.',
  email_change: 'Confirm this email change for your Boltcall account.',
};

export function buildEmails(user: { email: string; new_email?: string }, d: EmailData, supabaseUrl: string): OutgoingEmail[] {
  const type = d.email_action_type;
  const link = (hash: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}` +
    `&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url || 'https://boltcall.org')}`;
  const ignore = "If you didn't request this, you can ignore this email.";

  if (type === 'reauthentication') {
    return [{ to: user.email, subject: SUBJECTS.reauthentication, lines: [`Your verification code is ${d.token}.`, ignore] }];
  }
  if (type === 'email_change') {
    // Supabase reverses these for backward compat: token_hash_new -> CURRENT email, token_hash -> NEW email.
    const out: OutgoingEmail[] = [];
    if (user.email && d.token_hash_new) {
      out.push({ to: user.email, subject: SUBJECTS.email_change, lines: [INTROS.email_change, ignore], link: link(d.token_hash_new) });
    }
    const newTo = user.new_email || (!d.token_hash_new ? user.email : '');
    if (newTo && d.token_hash) {
      out.push({ to: newTo, subject: SUBJECTS.email_change, lines: [INTROS.email_change, ignore], link: link(d.token_hash) });
    }
    return out;
  }
  if (SUBJECTS[type] && d.token_hash) {
    return [{ to: user.email, subject: SUBJECTS[type], lines: [INTROS[type], ignore], link: link(d.token_hash) }];
  }
  // *_notification types (password changed, identity linked, ...): plain security notice.
  const what = type.replace(/_notification$/, '').replace(/_/g, ' ');
  return [{ to: user.email, subject: 'Boltcall security notice', lines: [`Your Boltcall account had a change: ${what}.`, "If this wasn't you, reply to this email right away."] }];
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function sendViaBrevo(email: OutgoingEmail): Promise<void> {
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:520px">` +
    email.lines.map((l) => `<p>${esc(l)}</p>`).join('') +
    (email.link
      ? `<p><a href="${esc(email.link)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${esc(email.subject)}</a></p>` +
        `<p style="font-size:12px;color:#555">Or paste this link into your browser:<br>${esc(email.link)}</p>`
      : '') +
    `</div>`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY || '', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_FROM_NAME || 'Boltcall', email: process.env.BREVO_FROM_EMAIL || 'noamj@boltcall.org' },
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: html,
      textContent: [...email.lines, email.link || ''].join('\n\n'),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}`);
}

function hookError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return hookError(405, 'Method not allowed');
  const body = await request.text();
  if (!verifyStandardWebhook(body, request.headers, hookSecretBase64())) {
    return hookError(401, 'Invalid signature');
  }
  try {
    const { user, email_data } = JSON.parse(body);
    const emails = buildEmails(user, email_data, process.env.SUPABASE_URL || '');
    for (const email of emails) await sendViaBrevo(email);
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[auth-send-email] failed:', err);
    return hookError(500, 'Could not send email');
  }
};
