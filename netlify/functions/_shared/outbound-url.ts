import { lookup } from 'dns/promises';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
]);

function getIpVersion(rawIp: string): 0 | 4 | 6 {
  const ip = rawIp.replace(/^\[|\]$/g, '');
  const parts = ip.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)) {
    return 4;
  }

  return ip.includes(':') ? 6 : 0;
}

function isPrivateIp(rawIp: string): boolean {
  const ip = rawIp.replace(/^\[|\]$/g, '').toLowerCase();

  if (getIpVersion(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 0) ||
      (a >= 224) ||
      ip === '255.255.255.255'
    );
  }

  if (getIpVersion(ip) !== 6) {
    return false;
  }

  return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:') || ip === '::';
}

type UrlValidationOptions = {
  allowHttp?: boolean;
  label?: string;
};

export async function validatePublicHttpUrl(
  rawUrl: string,
  options: UrlValidationOptions = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  const label = options.label || 'URL';
  const allowedProtocols = options.allowHttp ? new Set(['http:', 'https:']) : new Set(['https:']);
  if (!allowedProtocols.has(parsed.protocol)) {
    return {
      ok: false,
      error: options.allowHttp ? `${label} must use http or https` : `${label} must use https`,
    };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: `${label} cannot include credentials` };
  }

  const hostname = parsed.hostname.toLowerCase();
  const lookupHostname = hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local')) {
    return { ok: false, error: `${label} host is not allowed` };
  }

  if (getIpVersion(hostname) && isPrivateIp(hostname)) {
    return { ok: false, error: `${label} cannot target private network addresses` };
  }

  try {
    const records = await lookup(lookupHostname, { all: true, verbatim: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      return { ok: false, error: `${label} resolves to a private network address` };
    }
  } catch {
    return { ok: false, error: `${label} host could not be resolved` };
  }

  return { ok: true };
}

export async function validateOutboundHttpsUrl(rawUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return validatePublicHttpUrl(rawUrl, { label: 'Webhook URL' });
}
