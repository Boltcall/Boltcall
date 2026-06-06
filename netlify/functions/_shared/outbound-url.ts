import dns from 'dns/promises';
import net from 'net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 0) ||
      (a >= 224)
    );
  }

  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized === '::'
  );
}

export async function validateOutboundHttpsUrl(rawUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Webhook URL must use https' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Webhook URL cannot include credentials' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local')) {
    return { ok: false, error: 'Webhook URL host is not allowed' };
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    return { ok: false, error: 'Webhook URL cannot target private network addresses' };
  }

  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      return { ok: false, error: 'Webhook URL resolves to a private network address' };
    }
  } catch {
    return { ok: false, error: 'Webhook URL host could not be resolved' };
  }

  return { ok: true };
}
