/**
 * Clio region hosts, shared by the OAuth start/callback functions and integration-sync.
 *
 * Clio runs four independent data regions. A token issued in one region is not
 * valid against another, so the region is stored alongside every credential.
 *
 * Docs: https://docs.developers.clio.com/api-docs/clio-manage/authorization/
 */

export type ClioRegion = 'us' | 'eu' | 'ca' | 'au';

/** Clio Manage (API v4) + OAuth endpoints. */
const MANAGE_HOSTS: Record<ClioRegion, string> = {
  us: 'app.clio.com',
  eu: 'eu.app.clio.com',
  ca: 'ca.app.clio.com',
  au: 'au.app.clio.com',
};

/** Clio Grow Lead Inbox. Token-authenticated, no OAuth app required. */
const GROW_HOSTS: Record<ClioRegion, string> = {
  us: 'grow.clio.com',
  eu: 'eu.grow.clio.com',
  ca: 'ca.grow.clio.com',
  au: 'au.grow.clio.com',
};

export function normalizeRegion(region: unknown): ClioRegion {
  const value = String(region || '').toLowerCase();
  return value === 'eu' || value === 'ca' || value === 'au' ? value : 'us';
}

export function clioManageBase(region: unknown): string {
  return `https://${MANAGE_HOSTS[normalizeRegion(region)]}`;
}

export function clioGrowLeadInboxUrl(region: unknown): string {
  return `https://${GROW_HOSTS[normalizeRegion(region)]}/inbox_leads`;
}

/**
 * OAuth app credentials for a region.
 *
 * Clio issues a separate developer application per region, so each region needs
 * its own client id/secret. Region-suffixed vars win; the unsuffixed pair is the
 * US app and the fallback.
 */
export function clioOAuthCredentials(region: unknown): { clientId: string; clientSecret: string } {
  const suffix = normalizeRegion(region).toUpperCase();
  return {
    clientId: process.env[`CLIO_CLIENT_ID_${suffix}`] || process.env.CLIO_CLIENT_ID || '',
    clientSecret: process.env[`CLIO_CLIENT_SECRET_${suffix}`] || process.env.CLIO_CLIENT_SECRET || '',
  };
}
